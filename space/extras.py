"""
Extra product features that don't belong in auth/billing:

- moderation  : blocks unsafe text prompts and unusable images (optional NSFW image model)
- captcha     : Cloudflare Turnstile check for sign-up (only active when TURNSTILE_SECRET is set)
- budget      : rough PKR cost estimate for a design
- shares      : public before/after links
- reminders   : "your Pro plan ends soon" emails
"""
from __future__ import annotations

import json
import logging
import os
import re
import secrets
import threading
import time
import urllib.parse
import urllib.request

import mailer
from auth import AppError

log = logging.getLogger("aeterna.extras")

# ── moderation ────────────────────────────────────────────────────────────────
_BLOCK = re.compile(
    r"\b(nude|naked|nsfw|porn\w*|sex\w*|erotic|fetish|topless|genital\w*|gore|bloody|corpse|dead body|"
    r"suicide|self[- ]harm|terroris\w*|bomb|kill\w*|child abuse|loli\w*|rape\w*)\b", re.I)
MAX_PIXELS = 40_000_000
MIN_SIDE = 64


def moderate_text(text: str) -> str:
    """Returns the cleaned text, or raises AppError when it asks for something we don't allow."""
    text = (text or "").strip()
    if _BLOCK.search(text):
        raise AppError("Your extra instructions contain words we can't use. Please describe the room only.")
    return text[:200]


_nsfw = None


def check_image(img) -> None:
    """Rejects tiny/huge images and, when AETERNA_NSFW=1, images an NSFW classifier flags."""
    w, h = img.size
    if min(w, h) < MIN_SIDE:
        raise AppError("That photo is too small. Please upload a larger picture of the room.")
    if w * h > MAX_PIXELS:
        raise AppError("That photo is too large. Please upload one under 40 megapixels.")
    if os.getenv("AETERNA_NSFW") == "1":
        global _nsfw
        try:
            if _nsfw is None:
                from transformers import pipeline
                _nsfw = pipeline("image-classification", model=os.getenv("AETERNA_NSFW_MODEL", "Falconsai/nsfw_image_detection"))
            top = _nsfw(img.convert("RGB"))[0]
        except Exception:  # noqa: BLE001 — never block users because the checker is unavailable
            log.exception("NSFW check unavailable")
            return
        if top["label"].lower() == "nsfw" and top["score"] > 0.8:
            raise AppError("This photo can't be used. Please upload a picture of a room.")


# ── captcha (Cloudflare Turnstile) ────────────────────────────────────────────
TURNSTILE_SECRET = os.getenv("TURNSTILE_SECRET", "").strip()


def verify_captcha(token: str, ip: str) -> None:
    if not TURNSTILE_SECRET:
        return                                           # not configured → feature off
    if not token:
        raise AppError("Please complete the security check.")
    data = urllib.parse.urlencode({"secret": TURNSTILE_SECRET, "response": token, "remoteip": ip}).encode()
    try:
        req = urllib.request.Request("https://challenges.cloudflare.com/turnstile/v0/siteverify", data=data)
        with urllib.request.urlopen(req, timeout=8) as r:
            ok = json.loads(r.read()).get("success") is True
    except Exception:  # noqa: BLE001
        log.exception("captcha verification failed")
        raise AppError("Could not run the security check. Please try again.")
    if not ok:
        raise AppError("Security check failed. Please try again.")


# ── budget estimate (PKR) ─────────────────────────────────────────────────────
# (item, low, high) at "modern / balanced". Rough Pakistani market prices.
ITEMS = {
    "living room": [("Sofa set (3+2)", 90000, 220000), ("Coffee table", 15000, 45000), ("TV console", 25000, 70000),
                    ("Area rug", 15000, 60000), ("Curtains & blinds", 15000, 50000), ("Lighting", 12000, 50000),
                    ("Wall art & decor", 10000, 40000), ("Indoor plants", 4000, 15000)],
    "bedroom": [("Bed with mattress", 70000, 200000), ("Side tables (pair)", 12000, 35000), ("Wardrobe", 60000, 180000),
                ("Dresser / mirror", 20000, 60000), ("Curtains & blinds", 12000, 40000), ("Bedside lighting", 6000, 25000),
                ("Rug", 10000, 40000), ("Bedding & decor", 10000, 35000)],
    "kitchen": [("Cabinets (modular)", 250000, 700000), ("Countertop (granite/quartz)", 80000, 250000),
                ("Backsplash tiles", 25000, 80000), ("Sink & tap", 20000, 70000), ("Lighting", 10000, 40000),
                ("Bar stools", 15000, 50000), ("Storage & decor", 8000, 30000)],
    "bathroom": [("Vanity & basin", 35000, 120000), ("Mirror & lighting", 12000, 45000), ("Tiles", 50000, 150000),
                 ("Fittings & shower", 30000, 100000), ("Storage", 8000, 30000), ("Accessories", 5000, 20000)],
    "dining room": [("Dining table", 50000, 160000), ("Chairs (set of 6)", 45000, 140000), ("Sideboard", 30000, 90000),
                    ("Pendant lighting", 15000, 60000), ("Rug", 15000, 50000), ("Curtains", 12000, 40000), ("Decor", 8000, 30000)],
    "home office": [("Desk", 25000, 80000), ("Ergonomic chair", 25000, 90000), ("Bookshelf", 20000, 60000),
                    ("Desk lighting", 5000, 20000), ("Rug", 10000, 35000), ("Storage", 10000, 35000), ("Decor & plants", 5000, 20000)],
    "nursery": [("Crib", 30000, 90000), ("Changing dresser", 25000, 70000), ("Rocking chair", 20000, 60000),
                ("Rug", 10000, 35000), ("Curtains", 10000, 30000), ("Lighting", 6000, 20000), ("Decor", 8000, 25000)],
    "studio apartment": [("Sofa bed", 60000, 160000), ("Storage unit", 30000, 90000), ("Dining set (small)", 30000, 90000),
                         ("Desk corner", 15000, 45000), ("Rug", 12000, 40000), ("Lighting", 10000, 40000), ("Curtains & decor", 15000, 50000)],
}
STYLE_MULT = {"minimalist": 0.8, "scandinavian": 1.0, "modern": 1.1, "contemporary": 1.15, "japandi": 1.2,
              "industrial": 1.1, "luxury": 2.2}
DENSITY_MULT = {"minimal": 0.6, "balanced": 1.0, "full": 1.4}


def _round(x: float) -> int:
    return int(round(x / 500.0) * 500)


def budget(room_type: str, style: str, density: str) -> dict:
    items = ITEMS.get(room_type) or ITEMS["living room"]
    m = STYLE_MULT.get(style, 1.1) * DENSITY_MULT.get(density, 1.0)
    rows = [{"name": n, "low": _round(lo * m), "high": _round(hi * m)} for n, lo, hi in items]
    return {"currency": "PKR", "items": rows,
            "total_low": sum(r["low"] for r in rows), "total_high": sum(r["high"] for r in rows),
            "note": "Rough market estimate for new items in Pakistan. Real prices vary by brand, city and quality; "
                    "get quotes before buying. Delivery, labour and renovation work are not included."}


# ── share links ───────────────────────────────────────────────────────────────
MAX_SHARES = 30


def share_create(db, user: dict, item: dict, index: int) -> dict:
    images = item.get("images") or []
    if not 0 <= index < len(images):
        raise AppError("Unknown image.")
    if len(db.list("shares", user["_id"], limit=MAX_SHARES + 1, projection={"created": 1})) >= MAX_SHARES:
        raise AppError("You have reached the limit of shared links. Delete one first.")
    sid = secrets.token_urlsafe(9)
    s = item["settings"]
    db.insert("shares", sid, {
        "owner": user["_id"], "created": time.time(), "image": images[index], "before": item.get("before"),
        "mode": item["mode"], "style": s.get("style"), "room_type": s.get("room_type"), "density": s.get("density"),
        "aspect": item.get("aspect", "4 / 3"), "by": user["name"].split()[0]})
    return {"id": sid}


def share_get(db, sid: str) -> dict:
    s = db.get("shares", sid or "")
    if not s:
        raise AppError("This shared design was removed or the link is wrong.")
    return {k: s.get(k) for k in ("image", "before", "mode", "style", "room_type", "density", "aspect", "by", "created")}


def share_list(db, user: dict) -> dict:
    return {"items": [{"id": s["_id"], "created": s["created"], "style": s.get("style"), "room_type": s.get("room_type")}
                      for s in db.list("shares", user["_id"], limit=MAX_SHARES)]}


def share_delete(db, user: dict, sid: str) -> dict:
    s = db.get("shares", sid or "")
    if not s or s.get("owner") != user["_id"]:
        raise AppError("Unknown link.")
    db.delete("shares", sid)
    return {"ok": True}


# ── Pro expiry reminders ──────────────────────────────────────────────────────
REMIND_DAYS = int(os.getenv("REMIND_DAYS", "3"))


def send_expiry_reminders(db, now: float | None = None) -> int:
    now = now or time.time()
    sent = 0
    for u in db.all("users", None, limit=5000):
        until = (u.get("plan") or {}).get("until") or 0
        if now < until <= now + REMIND_DAYS * 86400 and u.get("reminded_until") != until:
            left = max(1, int((until - now) // 86400))
            mailer.notify(u["email"], "Your Aeterna Pro plan ends soon",
                          f"Hi {u['name']},\nyour Pro plan ends in about {left} day(s). "
                          f"To keep {os.getenv('PRO_DAILY_LIMIT', '50')} designs a day, open the Pricing page and renew — "
                          "paying again simply adds days to your current plan.\n" + mailer.link("pricing"))
            db.update("users", u["_id"], {"reminded_until": until})
            sent += 1
    return sent


def start_reminder_loop(db, every_hours: float = 6) -> None:
    def loop():
        while True:
            try:
                send_expiry_reminders(db)
            except Exception:  # noqa: BLE001
                log.exception("reminder loop failed")
            time.sleep(every_hours * 3600)
    threading.Thread(target=loop, daemon=True, name="reminders").start()


# ── evaluation report (owner only; also handy for the project report) ───────────
def report(db, days: int = 14) -> dict:
    """Aggregates over all designs: speed, ratings per style, daily activity. No images, no personal data."""
    now = time.time()
    hist = db.all("history", None, limit=100000,
                  projection={"created": 1, "mode": 1, "settings": 1, "seconds": 1, "count": 1, "ratings": 1, "favorite": 1})
    users = db.all("users", None, limit=100000, projection={"created": 1})
    per_style: dict[str, dict] = {}
    per_mode: dict[str, dict] = {}
    daily: dict[str, int] = {}
    times: list[float] = []
    for h in hist:
        n = max(1, int(h.get("count") or 1))
        sec = float(h.get("seconds") or 0)
        if sec:
            times.append(sec / n)
        r = [x for x in (h.get("ratings") or [])]
        likes, dislikes = sum(1 for x in r if x > 0), sum(1 for x in r if x < 0)
        for bucket, key in ((per_style, (h.get("settings") or {}).get("style", "?")), (per_mode, h.get("mode", "?"))):
            b = bucket.setdefault(key, {"designs": 0, "images": 0, "likes": 0, "dislikes": 0, "favorites": 0, "seconds": 0.0})
            b["designs"] += 1; b["images"] += n; b["likes"] += likes; b["dislikes"] += dislikes
            b["favorites"] += 1 if h.get("favorite") else 0; b["seconds"] += sec
        if now - h.get("created", 0) < days * 86400:
            d = time.strftime("%Y-%m-%d", time.gmtime(h["created"])); daily[d] = daily.get(d, 0) + n

    def finish(b):
        rated = b["likes"] + b["dislikes"]
        return {**b, "like_rate": round(b["likes"] / rated, 2) if rated else None,
                "avg_seconds_per_image": round(b["seconds"] / b["images"], 1) if b["images"] else None}
    times.sort()
    return {
        "users": len(users), "new_users_7d": sum(1 for u in users if now - u.get("created", 0) < 7 * 86400),
        "design_sessions": len(hist), "images": sum(b["images"] for b in per_mode.values()),
        "seconds_per_image": {"mean": round(sum(times) / len(times), 1) if times else None,
                              "median": round(times[len(times) // 2], 1) if times else None,
                              "p90": round(times[int(len(times) * 0.9)], 1) if times else None},
        "by_style": {k: finish(v) for k, v in sorted(per_style.items())},
        "by_mode": {k: finish(v) for k, v in sorted(per_mode.items())},
        "daily_images": dict(sorted(daily.items())),
    }
