"""
Transactional email over HTTPS (Hugging Face Spaces can't be relied on for SMTP — connections time out).

Providers (auto-selected by which key is set):
  BREVO_API_KEY   -> Brevo  (free: 300/day; no domain needed — verify a single sender address)   [recommended]
  RESEND_API_KEY  -> Resend (free: 100/day; sending to arbitrary users needs a verified domain)
  neither         -> "console": the email is only printed in the Space logs (development)

Other variables: MAIL_FROM_EMAIL (must be your verified sender), MAIL_FROM_NAME (Aeterna),
                 APP_URL (public URL of the frontend, used for links in emails, e.g. https://aeterna.vercel.app)
"""
from __future__ import annotations

import json
import logging
import os
import threading
import urllib.error
import urllib.request

log = logging.getLogger("aeterna.mail")

BREVO_KEY = os.getenv("BREVO_API_KEY", "").strip()
RESEND_KEY = os.getenv("RESEND_API_KEY", "").strip()
FROM_EMAIL = os.getenv("MAIL_FROM_EMAIL", "").strip()
FROM_NAME = os.getenv("MAIL_FROM_NAME", "Aeterna").strip()
APP_URL = os.getenv("APP_URL", "http://localhost:3000").rstrip("/")

provider = "brevo" if BREVO_KEY else "resend" if RESEND_KEY else "console"
outbox: list[dict] = []          # console mode only: last messages, handy in tests
status = {"sent": 0, "failed": 0, "last_error": "", "last_ok": 0.0, "last_error_at": 0.0}   # shown on the admin page


def diagnose() -> list[str]:
    """Plain-language reasons why emails would not reach people. Empty list = looks fine."""
    out = []
    if provider == "console":
        out.append("No mail provider is set (BREVO_API_KEY or RESEND_API_KEY). Emails are only printed in the Space logs and nobody receives them.")
    elif not FROM_EMAIL:
        out.append("MAIL_FROM_EMAIL is not set, so every email is skipped. Set it to a sender address you verified in your mail provider.")
    if provider == "resend":
        out.append("Resend only delivers to your own account email until you verify a domain. Prefer Brevo for sending to any user.")
    if "localhost" in APP_URL:
        out.append("APP_URL is not set, so links in emails point to localhost. Set APP_URL to your website address.")
    if status["last_error"]:
        out.append("Last send error: " + status["last_error"])
    return out


def health() -> dict:
    return {"provider": provider, "from": FROM_EMAIL, "app_url": APP_URL, "sent": status["sent"], "failed": status["failed"],
            "last_ok": status["last_ok"], "last_error": status["last_error"], "problems": diagnose()}


def deliverable() -> bool:
    """True when emails can really leave the server (provider + sender set)."""
    return provider != "console" and bool(FROM_EMAIL)


def configured() -> bool:
    return provider != "console"


def link(path: str, **params) -> str:
    """Frontend link. The app uses hash routing, e.g. https://app/#/verify?token=…"""
    q = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{APP_URL}/#/{path}" + (f"?{q}" if q else "")


def _post(url: str, headers: dict, body: dict) -> None:
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST",
                                 headers={"Content-Type": "application/json", "Accept": "application/json", **headers})
    with urllib.request.urlopen(req, timeout=15) as r:
        r.read()


def _send_now(to: str, subject: str, html: str, text: str) -> str:
    """Sends one email. Returns "" on success or a readable error (also recorded for the admin page)."""
    err = ""
    try:
        if provider == "brevo":
            _post("https://api.brevo.com/v3/smtp/email", {"api-key": BREVO_KEY}, {
                "sender": {"name": FROM_NAME, "email": FROM_EMAIL}, "to": [{"email": to}],
                "subject": subject, "htmlContent": html, "textContent": text})
        elif provider == "resend":
            _post("https://api.resend.com/emails", {"Authorization": f"Bearer {RESEND_KEY}"}, {
                "from": f"{FROM_NAME} <{FROM_EMAIL}>", "to": [to], "subject": subject, "html": html, "text": text})
        else:
            outbox.append({"to": to, "subject": subject, "text": text})
            del outbox[:-50]
            print(f"[mail:console] to={to} | {subject}\n{text}\n", flush=True)
    except urllib.error.HTTPError as e:
        body = e.read()[:300].decode("utf-8", "replace")
        err = f"{provider} refused the email (HTTP {e.code}): {body}"
        log.error("email to %s failed: %s", to, err)
    except Exception as e:  # noqa: BLE001
        err = f"could not reach {provider}: {e}"
        log.exception("email to %s failed", to)
    if err:
        status["failed"] += 1; status["last_error"] = err; status["last_error_at"] = __import__("time").time()
    else:
        status["sent"] += 1; status["last_ok"] = __import__("time").time()
        if provider != "console":
            status["last_error"] = ""
    return err


def send_test(to: str) -> dict:
    """Sends right now and reports the real result (used by the admin page)."""
    if provider != "console" and not FROM_EMAIL:
        return {"ok": False, "error": "MAIL_FROM_EMAIL is not set."}
    err = _send_now(to, "Aeterna test email", _wrap("It works", "This is a test email from your Aeterna backend."),
                    "This is a test email from your Aeterna backend.")
    if provider == "console" and not err:
        err = "No mail provider is configured, so nothing was sent (the text was printed in the Space logs)."
    return {"ok": not err, "error": err, "provider": provider}


def send(to: str, subject: str, html: str, text: str) -> None:
    """Fire-and-forget so API calls stay fast. Failures are recorded (admin page) and logged, never raised."""
    if provider != "console" and not FROM_EMAIL:
        log.error("MAIL_FROM_EMAIL is not set — cannot send email")
        status["failed"] += 1; status["last_error"] = "MAIL_FROM_EMAIL is not set, so the email was skipped."
        return
    threading.Thread(target=_send_now, args=(to, subject, html, text), daemon=True).start()


# ── templates ─────────────────────────────────────────────────────────────────
def _wrap(title: str, body_html: str, button: str | None = None, url: str | None = None) -> str:
    btn = (f'<p style="margin:28px 0"><a href="{url}" style="background:#111;color:#fff;padding:13px 26px;'
           f'text-decoration:none;font-size:14px">{button}</a></p>') if button and url else ""
    return (f'<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:auto;padding:32px;color:#222">'
            f'<h2 style="font-family:Georgia,serif;font-weight:500;margin:0 0 16px">{title}</h2>'
            f'<div style="font-size:14px;line-height:1.7;color:#555">{body_html}</div>{btn}'
            f'<p style="font-size:12px;color:#999">If the button does not work, copy this link: {url or ""}</p>'
            f'<p style="font-size:12px;color:#aaa;margin-top:24px">Aeterna · AI interior design</p></div>')


def verify_email(to: str, name: str, token: str) -> None:
    url = link("verify", token=token)
    send(to, "Confirm your email for Aeterna",
         _wrap("Confirm your email", f"Hi {name},<br>tap the button to confirm your address and start designing. "
               "The link works for 24 hours.", "Confirm email", url),
         f"Hi {name},\nConfirm your email: {url}\n(valid for 24 hours)")


def reset_password(to: str, name: str, token: str) -> None:
    url = link("reset", token=token)
    send(to, "Reset your Aeterna password",
         _wrap("Reset your password", f"Hi {name},<br>we received a request to reset your password. "
               "The link works for one hour. If this wasn't you, you can ignore this email.", "Choose a new password", url),
         f"Hi {name},\nReset your password: {url}\n(valid for 1 hour). If this wasn't you, ignore this email.")


def notify(to: str, subject: str, message: str) -> None:
    send(to, subject, _wrap(subject, message.replace("\n", "<br>")), message)
