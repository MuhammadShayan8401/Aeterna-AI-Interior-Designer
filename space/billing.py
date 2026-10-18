"""
Manual Easypaisa payments (works with a personal wallet — no merchant account or API needed).

Flow
  1. The user sees your Easypaisa number + a personal reference on the Pricing page and pays the amount.
  2. They submit the transaction ID (TID) from the Easypaisa receipt. A "pending" payment is created and you get an email.
  3. You check the payment arrived in your Easypaisa app, then approve it (tools/owner.py) -> Pro is switched on for
     PRO_DAYS days and the user is emailed. Reject it if the money never arrived.

Config (Space variables):  EASYPAISA_NUMBER, EASYPAISA_NAME, OWNER_EMAIL (where requests are sent), OWNER_KEY (secret, 24+ characters),
                           PRO_PRICE_PKR (500), PRO_DAYS (30), PRO_DAILY_LIMIT (50)

With an Easypay/JazzCash/PayFast merchant account, set GATEWAY_CHECKOUT_URL + GATEWAY_SECRET to also offer "Pay online"
(see the gateway section below and tools/gateway-relay/README.md). Manual payments keep working next to it.
"""
from __future__ import annotations

import hashlib
import hmac
import os
import re
import time
import uuid

import auth
import mailer
from auth import AppError, _Limiter, _hash, limit_for, plan_info
from store import Duplicate

PRICE = int(os.getenv("PRO_PRICE_PKR", "500"))
DAYS = int(os.getenv("PRO_DAYS", "30"))
PRO_LIMIT = int(os.getenv("PRO_DAILY_LIMIT", "50"))
WEEK_PRICE = int(os.getenv("PRO_WEEK_PRICE_PKR", "200"))      # 0 turns the weekly plan off
WEEK_DAYS = int(os.getenv("PRO_WEEK_DAYS", "7"))


def plan_options() -> dict:
    """Plans users can buy: id -> {price, days}. Monthly is always there."""
    out = {}
    if WEEK_PRICE > 0:
        out["week"] = {"price": WEEK_PRICE, "days": WEEK_DAYS}
    out["month"] = {"price": PRICE, "days": DAYS}
    return out


def _plan(plan: str) -> tuple[str, dict]:
    opts = plan_options()
    plan = plan if plan in opts else "month"
    return plan, opts[plan]
EP_NUMBER = os.getenv("EASYPAISA_NUMBER", "+923151032255").strip()
EP_NAME = os.getenv("EASYPAISA_NAME", "Muhammad Shayan Ahmed").strip()
OWNER_EMAIL = os.getenv("OWNER_EMAIL", "").strip()
OWNER_KEY = os.getenv("OWNER_KEY", "").strip()

JAZZ_NUMBER = os.getenv("JAZZCASH_NUMBER", "").strip()
JAZZ_NAME = os.getenv("JAZZCASH_NAME", EP_NAME).strip()
BANK_NAME = os.getenv("BANK_NAME", "").strip()
BANK_TITLE = os.getenv("BANK_TITLE", EP_NAME).strip()
BANK_ACCOUNT = os.getenv("BANK_ACCOUNT", "").strip()        # IBAN or account number
MAX_PROOF_BYTES = 4_000_000


def methods() -> list[dict]:
    """Payment methods shown on the Pricing page. Easypaisa is always first; others appear when configured."""
    out = []
    if EP_NUMBER:
        out.append({"id": "easypaisa", "label": "Easypaisa", "number": EP_NUMBER, "name": EP_NAME})
    if JAZZ_NUMBER:
        out.append({"id": "jazzcash", "label": "JazzCash", "number": JAZZ_NUMBER, "name": JAZZ_NAME})
    if BANK_ACCOUNT:
        out.append({"id": "bank", "label": BANK_NAME or "Bank transfer", "number": BANK_ACCOUNT, "name": BANK_TITLE})
    return out


def _proof(data: str) -> str:
    """Validate + shrink a payment screenshot (data URI) so it is cheap to store."""
    if not data:
        return ""
    import base64, io
    from PIL import Image
    try:
        raw = base64.b64decode(str(data).split(",", 1)[-1], validate=False)
        if len(raw) > MAX_PROOF_BYTES:
            raise AppError("The screenshot is too large (4 MB max).")
        img = Image.open(io.BytesIO(raw)); img.load()
    except AppError:
        raise
    except Exception:  # noqa: BLE001
        raise AppError("That screenshot could not be read. Please upload a JPG or PNG.")
    img = img.convert("RGB"); img.thumbnail((900, 1600))
    buf = io.BytesIO(); img.save(buf, format="JPEG", quality=70)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


submit_limit = _Limiter(5, 24 * 3600)      # payment submissions per user per day
owner_limit = _Limiter(8, 15 * 60)         # wrong owner keys per ip
TID_RE = re.compile(r"^[A-Z0-9]{6,24}$")
PK_PHONE = re.compile(r"^(?:\+?92|0)3\d{9}$")


def reference(user: dict) -> str:
    """Short code the user writes in the Easypaisa note so you can match the payment."""
    return "AET-" + hashlib.sha256(user["_id"].encode()).hexdigest()[:6].upper()


def _card(p: dict) -> dict:
    return {"id": p["_id"], "created": p["created"], "tx_id": p["tx_id"], "amount": p["amount"],
            "status": p["status"], "note": p.get("decision_note", ""), "method": p.get("method", "easypaisa")}


def plans() -> dict:
    """Public: what the plans are (no payment details)."""
    return {"configured": bool(methods()) or gateway_enabled(), "price": PRICE, "days": DAYS, "currency": "PKR",
            "free_limit": limit_for({}), "pro_limit": PRO_LIMIT, "options": plan_options()}


def info(db, user: dict) -> dict:
    mine = sorted(db.list("payments", user["_id"], limit=10), key=lambda p: -p["created"])
    return {
        "configured": bool(methods()),
        "easypaisa": {"number": EP_NUMBER, "name": EP_NAME},
        "methods": methods(),
        "gateway": {"enabled": gateway_enabled(), "label": GATEWAY_NAME},
        "price": PRICE, "days": DAYS, "currency": "PKR", "options": plan_options(),
        "free_limit": limit_for({}), "pro_limit": PRO_LIMIT,
        "plan": plan_info(user), "reference": reference(user),
        "payments": [_card(p) for p in mine],
    }


def submit(db, user: dict, tx_id: str, amount, sender: str = "", method: str = "easypaisa", proof: str = "", plan: str = "month") -> dict:
    if not methods():
        raise AppError("Payments are not set up yet. Please contact the site owner.")
    ids = [m["id"] for m in methods()]
    method = method if method in ids else ids[0]
    tid = re.sub(r"[\s-]", "", str(tx_id or "")).upper()
    if not TID_RE.match(tid):
        raise AppError("Enter the transaction ID exactly as shown in your payment receipt (letters and numbers).")
    proof = _proof(proof)
    try:
        amount = int(float(amount))
    except (TypeError, ValueError):
        raise AppError("Enter the amount you paid.")
    plan, opt = _plan(plan)
    if amount < opt["price"]:
        raise AppError(f"The amount must be at least PKR {opt['price']} for the {plan} plan.")
    sender = re.sub(r"[\s-]", "", str(sender or ""))
    if sender and not PK_PHONE.match(sender):
        raise AppError("Enter the Easypaisa number you paid from, like 03XXXXXXXXX (or leave it empty).")
    if submit_limit.blocked(user["_id"]):
        raise AppError("Too many submissions today. Please wait for your earlier payments to be reviewed.")
    if sum(p["status"] == "pending" for p in db.list("payments", user["_id"], limit=20)) >= 3:
        raise AppError("You already have payments waiting for review.")
    pid = uuid.uuid4().hex
    try:
        db.insert("payment_tx", _hash(tid), {"owner": user["_id"], "created": time.time(), "payment": pid})   # unique TID
    except Duplicate:
        raise AppError("That transaction ID has already been submitted.")
    submit_limit.hit(user["_id"])
    pay = {"owner": user["_id"], "created": time.time(), "status": "pending", "tx_id": tid, "amount": amount,
           "sender": sender, "email": user["email"], "name": user["name"], "reference": reference(user),
           "method": method, "proof": proof, "plan": plan, "days": opt["days"]}
    db.insert("payments", pid, pay)
    if OWNER_EMAIL:
        mailer.notify(OWNER_EMAIL, f"Aeterna payment to review — PKR {amount}",
                      f"{user['name']} <{user['email']}> says they paid PKR {amount}.\n"
                      f"Method: {method}{' (screenshot attached in dashboard)' if proof else ''}\nTransaction ID: {tid}\nFrom: {sender or 'not given'}\nReference: {pay['reference']}\n"
                      f"Payment id: {pid}\n\nCheck it in your Easypaisa app, then run:\n"
                      f"  python tools/owner.py approve {pid}\n  python tools/owner.py reject {pid}")
    return {"payment": _card({**pay, "_id": pid})}


def _grant(db, user: dict, days: int = DAYS) -> None:
    base = max(time.time(), (user.get("plan") or {}).get("until", 0))           # renewing extends the current period
    db.update("users", user["_id"], {"plan": {"name": "pro", "until": base + int(days) * 86400}})


# ── automatic payments through a merchant gateway (Easypay / JazzCash / PayFast …) ─────────────────────
# Needs a merchant account. The gateway posts the result to a small relay (tools/gateway-relay/worker.js), which signs it with
# GATEWAY_SECRET and calls `billing_gateway_callback`; we verify the signature and switch Pro on. Nothing is trusted otherwise.
GATEWAY_URL = os.getenv("GATEWAY_CHECKOUT_URL", "").strip()     # e.g. https://pay.example/checkout?store=123&order={order}&amount={amount}&email={email}&sig={sig}&back={back}
GATEWAY_SECRET = os.getenv("GATEWAY_SECRET", "").strip()        # 24+ random characters, shared with the relay
GATEWAY_NAME = os.getenv("GATEWAY_NAME", "Easypay").strip()
GATEWAY_BACK = os.getenv("GATEWAY_RETURN_URL", os.getenv("APP_URL", "")).strip()
gateway_limit = _Limiter(30, 15 * 60)                            # bad callbacks per ip


def gateway_enabled() -> bool:
    return bool(GATEWAY_URL and len(GATEWAY_SECRET) >= 24)


def _gsign(*parts) -> str:
    return hmac.new(GATEWAY_SECRET.encode(), "|".join(str(x) for x in parts).encode(), hashlib.sha256).hexdigest()


def pay_start(db, user: dict, plan: str = "month") -> dict:
    """Creates an order and returns the URL to send the user to."""
    if not gateway_enabled():
        raise AppError("Online payment is not available. Please pay by transfer instead.")
    if sum(p["status"] == "awaiting" for p in db.list("payments", user["_id"], limit=20)) >= 5:
        raise AppError("You have unfinished online payments. Please finish or wait for them to expire.")
    plan, opt = _plan(plan)
    order = uuid.uuid4().hex
    db.insert("payments", order, {"owner": user["_id"], "created": time.time(), "status": "awaiting", "tx_id": order[:12].upper(),
                                  "amount": opt["price"], "sender": "", "email": user["email"], "name": user["name"],
                                  "reference": reference(user), "method": "gateway", "proof": "", "plan": plan, "days": opt["days"]})
    from urllib.parse import quote
    url = GATEWAY_URL.format(order=order, amount=opt["price"], email=quote(user["email"]), sig=_gsign(order, opt["price"]), back=quote(GATEWAY_BACK))
    return {"order": order, "url": url}


def gateway_callback(db, order: str, status: str, amount, signature: str, ip: str) -> dict:
    """Called by the relay. `status` is "paid" or "failed"; the signature covers order|status|amount."""
    if gateway_limit.blocked(ip):
        raise AppError("Too many attempts.")
    if not gateway_enabled() or not hmac.compare_digest(str(signature or "").encode(), _gsign(order, status, amount).encode()):
        gateway_limit.hit(ip)
        raise AppError("Not allowed.")
    p = db.get("payments", order or "")
    if not p or p.get("method") != "gateway":
        raise AppError("Unknown order.")
    if p["status"] != "awaiting":                                   # idempotent: gateways retry callbacks
        return {"ok": True, "status": p["status"]}
    user = db.get("users", p["owner"])
    if status == "paid" and int(float(amount)) >= p["amount"] and user:
        _grant(db, user, p.get("days", DAYS))
        db.update("payments", order, {"status": "approved", "decided": time.time(), "decision_note": "paid online"})
        mailer.notify(user["email"], "You're on Aeterna Pro",
                      f"Hi {user['name']},\nyour online payment of PKR {p['amount']} was received. Pro is active for {p.get('days', DAYS)} days "
                      f"with up to {PRO_LIMIT} designs a day. Thank you!")
        return {"ok": True, "status": "approved"}
    db.update("payments", order, {"status": "rejected", "decided": time.time(), "decision_note": "payment failed or amount too low"})
    return {"ok": True, "status": "rejected"}


# ── owner actions (protected by OWNER_KEY) ────────────────────────────────────
ADMIN_USER = os.getenv("ADMIN_USERNAME", "").strip()
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
ADMIN_TTL = 30 * 60
admin_limit = _Limiter(5, 15 * 60)                                   # failed admin logins per ip


def admin_enabled() -> bool:
    return bool(ADMIN_USER) and len(ADMIN_PASSWORD) >= 12


def _admin_sig(exp: int) -> str:
    key = hashlib.sha256((auth._secret + "|" + ADMIN_PASSWORD).encode()).digest()      # changing the password signs everyone out
    return hmac.new(key, f"admin|{ADMIN_USER}|{exp}".encode(), hashlib.sha256).hexdigest()


def admin_login(username: str, password: str, ip: str) -> str:
    """Checks the admin credential from the Space's secrets and returns a 30-minute session token.
    There is no registration for admins: the only way in is knowing these two secrets."""
    if not admin_enabled():
        raise AppError("Admin login is not set up. Set ADMIN_USERNAME and ADMIN_PASSWORD (12+ characters) in the Space secrets.")
    if admin_limit.blocked(ip):
        raise AppError("Too many failed attempts. Try again in a few minutes.")
    ok_user = hmac.compare_digest((username or "").strip().encode(), ADMIN_USER.encode())
    ok_pw = hmac.compare_digest((password or "").encode(), ADMIN_PASSWORD.encode())
    if not (ok_user and ok_pw):
        admin_limit.hit(ip)
        raise AppError("Wrong username or password.")
    admin_limit.reset(ip)
    exp = int(time.time()) + ADMIN_TTL
    return f"adm.{exp}.{_admin_sig(exp)}"


def admin_session_ok(token: str) -> bool:
    try:
        tag, exp, sig = (token or "").split(".")
        return admin_enabled() and tag == "adm" and int(exp) > time.time() and hmac.compare_digest(sig, _admin_sig(int(exp)))
    except (ValueError, AttributeError):
        return False


# ── owner actions: allowed with the OWNER_KEY (command-line tools) or an admin session (Space admin panel) ──
def _check_owner(db, key: str, ip: str) -> None:
    if owner_limit.blocked(ip):
        raise AppError("Too many attempts.")
    key = key or ""
    if key.startswith("adm."):
        if admin_session_ok(key):
            return
        raise AppError("Your admin session has expired. Please sign in again.")
    if len(OWNER_KEY) < 24 or not hmac.compare_digest(key.encode(), OWNER_KEY.encode()):
        owner_limit.hit(ip)
        raise AppError("Not allowed.")


def owner_list(db, key: str, ip: str, status: str = "pending") -> dict:
    _check_owner(db, key, ip)
    rows = db.all("payments", {"status": status} if status in ("pending", "approved", "rejected") else None, limit=100)
    return {"payments": [{**_card(p), "name": p["name"], "email": p["email"], "sender": p.get("sender", ""),
                          "reference": p.get("reference", ""), "has_proof": bool(p.get("proof"))} for p in rows]}


def owner_proof(db, key: str, ip: str, payment_id: str) -> dict:
    _check_owner(db, key, ip)
    p = db.get("payments", payment_id)
    if not p:
        raise AppError("No such payment.")
    return {"proof": p.get("proof", "")}


def owner_stats(db, key: str, ip: str) -> dict:
    _check_owner(db, key, ip)
    users, pays = db.all("users", None, limit=100000), db.all("payments", None, limit=100000)
    now = time.time()
    return {"users": len(users),
            "pro_active": sum(1 for u in users if (u.get("plan") or {}).get("until", 0) > now),
            "verified": sum(1 for u in users if u.get("verified", True)),
            "pending": sum(p["status"] == "pending" for p in pays),
            "approved": sum(p["status"] == "approved" for p in pays),
            "revenue_pkr": sum(p["amount"] for p in pays if p["status"] == "approved")}


def owner_report(db, key: str, ip: str) -> dict:
    _check_owner(db, key, ip)
    import extras
    return extras.report(db)


def owner_decide(db, key: str, ip: str, payment_id: str, approve: bool, note: str = "") -> dict:
    _check_owner(db, key, ip)
    p = db.get("payments", payment_id)
    if not p:
        raise AppError("No such payment.")
    if p["status"] != "pending":
        raise AppError(f"Already {p['status']}.")
    user = db.get("users", p["owner"])
    if approve:
        if not user:
            raise AppError("The user no longer exists.")
        _grant(db, user, p.get("days", DAYS))
    db.update("payments", payment_id, {"status": "approved" if approve else "rejected",
                                       "decided": time.time(), "decision_note": (note or "")[:200]})
    if user:
        if approve:
            mailer.notify(user["email"], "You're on Aeterna Pro",
                          f"Hi {user['name']},\nyour payment of PKR {p['amount']} was received. Pro is active for {p.get('days', DAYS)} days "
                          f"with up to {PRO_LIMIT} designs a day. Thank you!")
        else:
            mailer.notify(user["email"], "We couldn't confirm your payment",
                          f"Hi {user['name']},\nwe could not find your payment (transaction {p['tx_id']}). "
                          f"{note or ''}\nPlease check the transaction ID and submit it again, or reply to this email.")
    return {"ok": True, "status": "approved" if approve else "rejected"}


def owner_mail_status(db, key: str, ip: str) -> dict:
    _check_owner(db, key, ip)
    return mailer.health()


def owner_mail_test(db, key: str, ip: str, to: str) -> dict:
    _check_owner(db, key, ip)
    to = (to or "").strip()
    if not auth.EMAIL_RE.match(to):
        raise AppError("Enter a valid email address.")
    return mailer.send_test(to)
