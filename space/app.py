"""
Aeterna AI Interior Designer — Gradio backend for Hugging Face Spaces.

Everything the React frontend needs is exposed as a named API endpoint
(through @gradio/client). Authenticated endpoints take the user's access token
as their first argument. The Space page itself only shows a short status note —
generation is NOT publicly usable without an account.

  auth_register / auth_login / auth_refresh / auth_logout / auth_me
  auth_change_password / auth_delete
  redesign / from_scratch                       (need a token, count against the daily quota)
  history_list / history_get / history_favorite / history_rate / history_delete / history_clear
"""
from __future__ import annotations

import spaces

import base64
import functools
import io
import logging
import os
import time
import uuid

import gradio as gr
from PIL import Image

import auth
import billing
import engine
import extras
import mailer
from auth import AppError, DAILY_LIMIT, MAX_HISTORY
from prompts import (CHANGE_LEVEL, DENSITY, LIGHTING, PALETTES, ROOM_TYPES, STYLES,
                     build_prompt, describe)
from store import open_store

log = logging.getLogger("aeterna")

gpu = spaces.GPU(duration=120)

MAX_IMAGES = 4

if os.getenv("SENTRY_DSN"):                    # optional error reporting
    try:
        import sentry_sdk
        sentry_sdk.init(dsn=os.environ["SENTRY_DSN"], traces_sample_rate=0.0, send_default_pii=False)
    except Exception:  # pragma: no cover
        log.warning("sentry_sdk not installed; SENTRY_DSN ignored")
db = open_store()
engine.load()
for _problem in mailer.diagnose():
    print("[aeterna] EMAIL WARNING:", _problem, flush=True)


# ── plumbing ──────────────────────────────────────────────────────────────────
def guard(fn):
    """Turn our errors into messages the UI can show; hide unexpected ones."""
    @functools.wraps(fn)
    def run(*a, **k):
        try:
            return fn(*a, **k)
        except AppError as e:
            raise gr.Error(str(e), print_exception=False)
        except gr.Error:
            raise
        except Exception:
            log.exception("unexpected error in %s", fn.__name__)
            raise gr.Error("Something went wrong on the server. Please try again.", print_exception=False)
    return run


def guard_soft(fn):
    """For queued generation endpoints: return {"error": msg} instead of raising.
    The Gradio JS client drops error messages of queued jobs, so the app reads this field."""
    @functools.wraps(fn)
    def run(*a, **k):
        try:
            return fn(*a, **k)
        except AppError as e:
            return {"error": str(e)}
        except gr.Error as e:
            return {"error": str(e.message if hasattr(e, "message") else e)}
        except Exception:
            log.exception("unexpected error in %s", fn.__name__)
            return {"error": "Something went wrong on the server. Please try again."}
    return run


def client_ip(request: gr.Request | None) -> str:
    if request is None:
        return "unknown"
    fwd = (request.headers or {}).get("x-forwarded-for")
    return fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "unknown")


def _uri(img: Image.Image, quality=88, side=None) -> str:
    img = img.convert("RGB")
    if side:
        img.thumbnail((side, side))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def _clamp_n(n) -> int:
    try:
        return max(1, min(MAX_IMAGES, int(n)))
    except (TypeError, ValueError):
        return 2


# ── auth endpoints ────────────────────────────────────────────────────────────
@guard
def auth_register(name: str, email: str, password: str, ref: str, captcha: str, request: gr.Request) -> dict:
    ip = client_ip(request)
    extras.verify_captcha(captcha, ip)
    return auth.register(db, name, email, password, ip, ref)


@guard
def auth_login(email: str, password: str, request: gr.Request) -> dict:
    return auth.login(db, email, password, client_ip(request))


@guard
def auth_refresh(refresh_token: str) -> dict:
    return auth.refresh(db, refresh_token)


@guard
def auth_logout(refresh_token: str) -> dict:
    return auth.logout(db, refresh_token)


@guard
def auth_me(token: str) -> dict:
    return auth.profile(db, auth.verify_access(db, token))


@guard
def auth_forgot(email: str, request: gr.Request) -> dict:
    return auth.forgot_password(db, email, client_ip(request))


@guard
def auth_reset(token: str, new_password: str) -> dict:
    return auth.reset_password(db, token, new_password)


@guard
def auth_verify_email(token: str) -> dict:
    return auth.verify_email(db, token)


@guard
def auth_resend_verification(token: str) -> dict:
    return auth.resend_verification(db, auth.verify_access(db, token))


# ── payments (manual Easypaisa; see billing.py) ───────────────────────────────
@guard
def billing_plans() -> dict:
    return billing.plans()


@guard
def billing_info(token: str) -> dict:
    return billing.info(db, auth.verify_access(db, token))


@guard
def billing_submit(token: str, tx_id: str, amount: float, sender: str, method: str, proof: str, plan: str = "month") -> dict:
    return billing.submit(db, auth.verify_access(db, token), tx_id, amount, sender, method, proof, plan)


@guard
def billing_pay_start(token: str, plan: str = "month") -> dict:
    return billing.pay_start(db, auth.verify_access(db, token), plan)


@guard
def billing_gateway_callback(order: str, status: str, amount: str, signature: str, request: gr.Request) -> dict:
    return billing.gateway_callback(db, order, status, amount, signature, client_ip(request))


@guard
def owner_payments(owner_key: str, status: str, request: gr.Request) -> dict:
    return billing.owner_list(db, owner_key, client_ip(request), status)


@guard
def owner_decide(owner_key: str, payment_id: str, approve: bool, note: str, request: gr.Request) -> dict:
    return billing.owner_decide(db, owner_key, client_ip(request), payment_id, approve, note)


@guard
def owner_mail_status(owner_key: str, request: gr.Request) -> dict:
    return billing.owner_mail_status(db, owner_key, client_ip(request))


@guard
def owner_mail_test(owner_key: str, to: str, request: gr.Request) -> dict:
    return billing.owner_mail_test(db, owner_key, client_ip(request), to)


@guard
def owner_report(owner_key: str, request: gr.Request) -> dict:
    return billing.owner_report(db, owner_key, client_ip(request))


@guard
def owner_proof(owner_key: str, payment_id: str, request: gr.Request) -> dict:
    return billing.owner_proof(db, owner_key, client_ip(request), payment_id)


@guard
def owner_stats(owner_key: str, request: gr.Request) -> dict:
    return billing.owner_stats(db, owner_key, client_ip(request))


# ── misc: health, budget, share links ─────────────────────────────────────────
@guard
def ping() -> dict:
    """Cheap health check (used by uptime pingers / the frontend to wake the Space)."""
    return {"ok": True, "mock": engine.MOCK, "time": time.time(), **engine.stats()}


@guard
def budget_estimate(room_type: str, style: str, density: str) -> dict:
    return extras.budget(room_type, style, density)


@guard
def share_create(token: str, item_id: str, index: int) -> dict:
    user = auth.verify_access(db, token)
    return extras.share_create(db, user, _own(user, item_id), int(index))


@guard
def share_get(share_id: str) -> dict:
    return extras.share_get(db, share_id)


@guard
def share_list(token: str) -> dict:
    return extras.share_list(db, auth.verify_access(db, token))


@guard
def share_delete(token: str, share_id: str) -> dict:
    return extras.share_delete(db, auth.verify_access(db, token), share_id)


@guard
def auth_change_password(token: str, old_password: str, new_password: str) -> dict:
    return auth.change_password(db, auth.verify_access(db, token), old_password, new_password)


@guard
def auth_delete(token: str, password: str) -> dict:
    return auth.delete_account(db, auth.verify_access(db, token), password)


# ── history endpoints (per user) ──────────────────────────────────────────────
def _own(user, item_id):
    item = db.get("history", item_id)
    if not item or item.get("owner") != user["_id"]:
        raise AppError("That design no longer exists.")
    return item


def _card(h):
    return {"id": h["_id"], "created": h["created"], "mode": h["mode"], "settings": h["settings"],
            "thumb": h["thumb"], "count": len(h["images"]) if "images" in h else h.get("count", 1),
            "favorite": h.get("favorite", False)}


@guard
def history_list(token: str) -> dict:
    user = auth.verify_access(db, token)
    rows = db.list("history", user["_id"], limit=60,
                   projection={"mode": 1, "settings": 1, "thumb": 1, "count": 1, "favorite": 1, "created": 1})
    return {"items": [_card(h) for h in rows]}


@guard
def history_get(token: str, item_id: str) -> dict:
    user = auth.verify_access(db, token)
    h = _own(user, item_id)
    return {**{k: v for k, v in h.items() if k not in ("owner", "_id")}, "id": h["_id"]}


@guard
def history_favorite(token: str, item_id: str, value: bool) -> dict:
    user = auth.verify_access(db, token)
    _own(user, item_id)
    db.update("history", item_id, {"favorite": bool(value)})
    return {"ok": True}


@guard
def history_rate(token: str, item_id: str, index: int, value: int) -> dict:
    """value: 1 like, -1 dislike, 0 clear. Keeps the user's style taste in sync."""
    user = auth.verify_access(db, token)
    h = _own(user, item_id)
    ratings, i, value = list(h.get("ratings", [])), int(index), max(-1, min(1, int(value)))
    if not 0 <= i < len(ratings):
        raise AppError("Unknown image.")
    delta, ratings[i] = value - ratings[i], value
    db.update("history", item_id, {"ratings": ratings})
    taste = dict(user.get("taste", {}))
    style = h["settings"].get("style")
    if style and delta:
        taste[style] = taste.get(style, 0) + delta
        db.update("users", user["_id"], {"taste": taste})
    return {"taste": taste}


@guard
def history_delete(token: str, item_id: str) -> dict:
    user = auth.verify_access(db, token)
    _own(user, item_id)
    db.delete("history", item_id)
    return {"ok": True}


@guard
def history_clear(token: str) -> dict:
    """Deletes everything except favourites."""
    user = auth.verify_access(db, token)
    for h in db.list("history", user["_id"], limit=500, projection={"favorite": 1}):
        if not h.get("favorite"):
            db.delete("history", h["_id"])
    return {"ok": True}


def _save_history(user, mode, images, settings, prompt, furniture, seconds, before):
    item = {
        "owner": user["_id"], "created": time.time(), "mode": mode, "settings": settings,
        "prompt": prompt, "furniture": furniture, "seconds": seconds,
        "images": [_uri(i, 82) for i in images], "thumb": _uri(images[0], 70, 320), "count": len(images),
        "before": _uri(before, 72, 512) if before is not None else None,
        "aspect": f"{images[0].width} / {images[0].height}",
        "ratings": [0] * len(images), "favorite": False,
    }
    item_id = uuid.uuid4().hex
    db.insert("history", item_id, item)
    # keep the newest MAX_HISTORY non-favourites
    rest = [h for h in db.list("history", user["_id"], limit=500, projection={"favorite": 1}) if not h.get("favorite")]
    for old in rest[MAX_HISTORY:]:
        db.delete("history", old["_id"])
    return item_id


# ── generation ────────────────────────────────────────────────────────────────
def _generate(user, mode, run, settings, furniture_fn=None):
    """Quota check → run → save history. Refunds the quota if generation fails."""
    started = time.time()
    limit = auth.limit_for(user)
    if db.consume(user["_id"], auth.today(), limit) is None:
        raise AppError(f"You've used all {limit} designs for today. Come back tomorrow!")
    try:
        images, seeds, prompt, furniture, before = run()
    except Exception:
        db.refund(user["_id"], auth.today())
        raise
    seconds = round(time.time() - started, 1)
    engine.record_time(seconds / max(1, len(images)))
    item_id = _save_history(user, mode, images, settings, prompt, furniture, seconds, before)
    return {
        "id": item_id, "mode": mode, "images": [_uri(i) for i in images], "seeds": seeds,
        "prompt": prompt, "furniture": furniture, "seconds": seconds,
        "description": describe(mode, settings["room_type"], settings["style"], settings["density"], furniture),
        "settings": settings, "quota": auth.profile(db, user)["quota"],
        "aspect": f"{images[0].width} / {images[0].height}",
    }

@gpu
@guard_soft
def redesign(token, image, room_type, style, density, palette, change, extra, num_images, progress=gr.Progress()):
    user = auth.verify_access(db, token)
    auth.require_verified(user)
    if image is None:
        raise AppError("Please upload a photo of your room first.")
    extra = extras.moderate_text(extra)
    extras.check_image(image)
    n = _clamp_n(num_images)
    settings = dict(room_type=room_type, style=style, density=density, palette=palette,
                    change=change, extra=extra, num_images=n)

    def run():
        progress(0, desc="Reading your room …")
        photo = engine.fit(image)
        furniture = engine.detect_furniture(photo)
        prompt, negative = build_prompt(mode="photo", room_type=room_type, style=style, density=density,
                                        palette=palette, extra=extra, furniture=furniture)
        images, seeds = engine.generate(
            mode="photo", prompt=prompt, negative=negative, n=n, image=photo,
            strength=CHANGE_LEVEL.get(change, 0.62),
            on_step=lambda i, t: progress((i, t), desc=f"Designing variation {i + 1} of {t} …"))
        return images, seeds, prompt, furniture, photo

    return _generate(user, "photo", run, settings)

@gpu
@guard_soft
def redesign_region(token, image, mask, room_type, style, density, palette, change, extra, num_images, progress=gr.Progress()):
    """Restyle only the painted (white) part of the photo; everything else stays exactly as it was."""
    user = auth.verify_access(db, token)
    auth.require_verified(user)
    if image is None:
        raise AppError("Please upload a photo of your room first.")
    if mask is None:
        raise AppError("Paint the part of the room you want to change first.")
    extra = extras.moderate_text(extra)
    extras.check_image(image)
    cover = engine.mask_coverage(mask)
    if cover < 0.01:
        raise AppError("The painted area is too small. Paint over the wall, sofa or floor you want to change.")
    n = _clamp_n(num_images)
    settings = dict(room_type=room_type, style=style, density=density, palette=palette,
                    change=change, extra=extra, num_images=n, region=True)

    def run():
        progress(0, desc="Reading your room …")
        photo = engine.fit(image)
        furniture = engine.detect_furniture(photo)
        prompt, negative = build_prompt(mode="photo", room_type=room_type, style=style, density=density,
                                        palette=palette, extra=extra, furniture=furniture)
        images, seeds = engine.generate(
            mode="photo", prompt=prompt, negative=negative, n=n, image=photo,
            strength=max(CHANGE_LEVEL.get(change, 0.62), 0.7),   # the painted part can change freely; the rest is restored
            on_step=lambda i, t: progress((i, t), desc=f"Designing variation {i + 1} of {t} …"))
        return [engine.composite(photo, im, mask) for im in images], seeds, prompt, furniture, photo

    return _generate(user, "photo", run, settings)

@gpu
@guard_soft
def from_scratch(token, room_type, style, density, lighting, palette, extra, num_images, progress=gr.Progress()):
    user = auth.verify_access(db, token)
    auth.require_verified(user)
    extra = extras.moderate_text(extra)
    n = _clamp_n(num_images)
    settings = dict(room_type=room_type, style=style, density=density, lighting=lighting,
                    palette=palette, extra=extra, num_images=n)

    def run():
        prompt, negative = build_prompt(mode="scratch", room_type=room_type, style=style, density=density,
                                        lighting=lighting, palette=palette, extra=extra)
        images, seeds = engine.generate(
            mode="scratch", prompt=prompt, negative=negative, n=n,
            on_step=lambda i, t: progress((i, t), desc=f"Designing concept {i + 1} of {t} …"))
        return images, seeds, prompt, [], None

    return _generate(user, "scratch", run, settings)

@gpu
@guard_soft
def variation(token, item_id, index, style, palette, extra, change, num_images, progress=gr.Progress()):
    """'More like this' / 'change the colours': restyle one of the user's generated images."""
    user = auth.verify_access(db, token)
    auth.require_verified(user)
    item = _own(user, item_id)
    imgs = item.get("images") or []
    i = int(index)
    if not 0 <= i < len(imgs):
        raise AppError("Unknown image.")
    extra = extras.moderate_text(extra)
    n = _clamp_n(num_images)
    base = item["settings"]
    settings = {**base, "style": style if style in STYLES else base.get("style", "modern"),
                "palette": palette if palette in PALETTES else base.get("palette", "neutral"),
                "extra": extra, "change": change if change in CHANGE_LEVEL else "subtle",
                "num_images": n, "variation_of": item_id}
    src = Image.open(io.BytesIO(base64.b64decode(imgs[i].split(",", 1)[1]))).convert("RGB")

    def run():
        photo = engine.fit(src)
        furniture = item.get("furniture") or []
        prompt, negative = build_prompt(mode="photo", room_type=settings["room_type"], style=settings["style"],
                                        density=settings.get("density", "balanced"), palette=settings["palette"],
                                        extra=extra, furniture=furniture)
        images, seeds = engine.generate(
            mode="photo", prompt=prompt, negative=negative, n=n, image=photo,
            strength=CHANGE_LEVEL[settings["change"]],
            on_step=lambda k, t: progress((k, t), desc=f"Designing variation {k + 1} of {t} …"))
        return images, seeds, prompt, furniture, photo

    return _generate(user, "photo", run, settings)


# ── Gradio app ────────────────────────────────────────────────────────────────
# ── admin panel (lives on the Space page itself — NOT part of the website) ─────────────────────────
def _admin_rows(token, status, request):
    ip = client_ip(request)
    rows = billing.owner_list(db, token, ip, status)["payments"]
    table = [[p["id"], p["status"], p["amount"], p["method"], p["tx_id"], p["name"], p["email"], p["reference"], "yes" if p["has_proof"] else ""]
             for p in rows]
    choices = [(f'{p["name"]} · PKR {p["amount"]} · {p["tx_id"]}', p["id"]) for p in rows if p["status"] == "pending"]
    return table, choices


def admin_refresh(token, status, request: gr.Request):
    try:
        ip = client_ip(request)
        stats = billing.owner_stats(db, token, ip)
        mail = billing.owner_mail_status(db, token, ip)
        table, choices = _admin_rows(token, status, request)
        return stats, mail, table, gr.update(choices=choices, value=None), ""
    except AppError as e:
        return None, None, [], gr.update(choices=[], value=None), f"**{e}**"


def admin_login(username, password, request: gr.Request):
    try:
        token = billing.admin_login(username, password, client_ip(request))
    except AppError as e:
        return "", f"**{e}**", gr.update(visible=True), gr.update(visible=False)
    return token, "Signed in (the session lasts 30 minutes).", gr.update(visible=False), gr.update(visible=True)


def admin_logout():
    return "", "Signed out.", gr.update(visible=True), gr.update(visible=False), "", ""


def admin_decide(token, payment_id, approve, note, status, request: gr.Request):
    if not payment_id:
        return (*admin_refresh(token, status, request)[:4], "Choose a pending payment first.")
    try:
        r = billing.owner_decide(db, token, client_ip(request), payment_id, approve, note)
        msg = f"Payment {r['status']}."
    except AppError as e:
        msg = f"**{e}**"
    return (*admin_refresh(token, status, request)[:4], msg)


def admin_approve(token, payment_id, note, status, request: gr.Request):
    return admin_decide(token, payment_id, True, note, status, request)


def admin_reject(token, payment_id, note, status, request: gr.Request):
    return admin_decide(token, payment_id, False, note, status, request)


def admin_proof(token, payment_id, request: gr.Request):
    try:
        data = billing.owner_proof(db, token, client_ip(request), payment_id or "")["proof"]
        return Image.open(io.BytesIO(base64.b64decode(data.split(",", 1)[-1]))) if data else None
    except Exception:  # noqa: BLE001 — a missing/expired session or no screenshot just shows nothing
        return None


def admin_mail_test(token, to, request: gr.Request):
    try:
        r = billing.owner_mail_test(db, token, client_ip(request), to)
        return "Sent. Check the inbox (and spam)." if r["ok"] else f"**Not sent:** {r['error']}"
    except AppError as e:
        return f"**{e}**"


with gr.Blocks(title="Aeterna API") as demo:
    gr.Markdown("# Aeterna AI Interior Designer — API\n"
                "This Space is the backend for the Aeterna web app. Please use the web app to sign in and create designs.")

    with gr.Accordion("Admin", open=False):
        atok = gr.State("")
        with gr.Column() as login_box:
            gr.Markdown("Sign in with the admin username and password stored in this Space's secrets (`ADMIN_USERNAME`, `ADMIN_PASSWORD`).")
            a_user = gr.Textbox(label="Username")
            a_pw = gr.Textbox(label="Password", type="password")
            a_login = gr.Button("Sign in", variant="primary")
        a_msg = gr.Markdown()
        with gr.Column(visible=False) as panel:
            a_out = gr.Button("Sign out", size="sm")
            with gr.Row():
                a_stats = gr.JSON(label="Stats")
                a_mail = gr.JSON(label="Email status")
            a_status = gr.Radio(["pending", "approved", "rejected"], value="pending", label="Payments")
            a_table = gr.Dataframe(headers=["id", "status", "PKR", "method", "transaction", "name", "email", "reference", "screenshot"],
                                   interactive=False, wrap=True)
            a_pick = gr.Dropdown(label="Pending payment", choices=[])
            a_note = gr.Textbox(label="Note to the user (used when rejecting)")
            with gr.Row():
                a_ok = gr.Button("Approve", variant="primary"); a_no = gr.Button("Reject"); a_show = gr.Button("Show screenshot")
                a_reload = gr.Button("Refresh")
            a_img = gr.Image(label="Payment screenshot", interactive=False)
            a_to = gr.Textbox(label="Send a test email to")
            a_test = gr.Button("Send test email")
        views = [a_stats, a_mail, a_table, a_pick, a_msg]
        a_login.click(admin_login, [a_user, a_pw], [atok, a_msg, login_box, panel], api_name=False, queue=False
                      ).then(admin_refresh, [atok, a_status], views, api_name=False, queue=False)
        a_out.click(admin_logout, None, [atok, a_msg, login_box, panel, a_pw, a_note], api_name=False, queue=False)
        a_reload.click(admin_refresh, [atok, a_status], views, api_name=False, queue=False)
        a_status.change(admin_refresh, [atok, a_status], views, api_name=False, queue=False)
        a_ok.click(admin_approve, [atok, a_pick, a_note, a_status], views, api_name=False, queue=False)
        a_no.click(admin_reject, [atok, a_pick, a_note, a_status], views, api_name=False, queue=False)
        a_show.click(admin_proof, [atok, a_pick], a_img, api_name=False, queue=False)
        a_test.click(admin_mail_test, [atok, a_to], a_msg, api_name=False, queue=False)

    # JSON-only endpoints (no queue: they must stay fast even while a design is generating)
    for fn in (auth_register, auth_login, auth_refresh, auth_logout, auth_me, auth_change_password, auth_delete,
               auth_forgot, auth_reset, auth_verify_email, auth_resend_verification,
               billing_plans, billing_info, billing_submit, billing_pay_start, billing_gateway_callback, owner_payments, owner_decide, owner_proof, owner_stats, owner_report, owner_mail_status, owner_mail_test,
               ping, budget_estimate, share_create, share_get, share_list, share_delete,
               history_list, history_get, history_favorite, history_rate, history_delete, history_clear):
        gr.api(fn, api_name=fn.__name__, queue=False)

    # Generation endpoints. Components are hidden: they only describe the API for @gradio/client.
    with gr.Column(visible=False):
        tok1 = gr.Textbox(); photo = gr.Image(type="pil")
        room = gr.Dropdown(ROOM_TYPES); style = gr.Dropdown(list(STYLES)); density = gr.Dropdown(list(DENSITY))
        palette = gr.Dropdown(list(PALETTES)); change = gr.Dropdown(list(CHANGE_LEVEL))
        extra = gr.Textbox(); n = gr.Number(precision=0)
        out1 = gr.JSON(); go1 = gr.Button()
        go1.click(redesign, [tok1, photo, room, style, density, palette, change, extra, n], out1, api_name="redesign")

        tokr = gr.Textbox(); photor = gr.Image(type="pil"); maskr = gr.Image(type="pil")
        roomr = gr.Dropdown(ROOM_TYPES); styler = gr.Dropdown(list(STYLES)); densr = gr.Dropdown(list(DENSITY))
        palr = gr.Dropdown(list(PALETTES)); chr_ = gr.Dropdown(list(CHANGE_LEVEL)); extr = gr.Textbox(); nr = gr.Number(precision=0)
        outr = gr.JSON(); gor = gr.Button()
        gor.click(redesign_region, [tokr, photor, maskr, roomr, styler, densr, palr, chr_, extr, nr], outr, api_name="redesign_region")

        tok2 = gr.Textbox(); room2 = gr.Dropdown(ROOM_TYPES); style2 = gr.Dropdown(list(STYLES))
        density2 = gr.Dropdown(list(DENSITY)); light2 = gr.Dropdown(list(LIGHTING))
        palette2 = gr.Dropdown(list(PALETTES)); extra2 = gr.Textbox(); n2 = gr.Number(precision=0)
        out2 = gr.JSON(); go2 = gr.Button()
        go2.click(from_scratch, [tok2, room2, style2, density2, light2, palette2, extra2, n2], out2, api_name="from_scratch")

        tok3 = gr.Textbox(); item3 = gr.Textbox(); idx3 = gr.Number(precision=0)
        style3 = gr.Dropdown(list(STYLES)); palette3 = gr.Dropdown(list(PALETTES)); extra3 = gr.Textbox()
        change3 = gr.Dropdown(list(CHANGE_LEVEL)); n3 = gr.Number(precision=0)
        out3 = gr.JSON(); go3 = gr.Button()
        go3.click(variation, [tok3, item3, idx3, style3, palette3, extra3, change3, n3], out3, api_name="variation")

demo.queue(default_concurrency_limit=1, max_size=12)
extras.start_reminder_loop(db)

if __name__ == "__main__":
    demo.launch()
