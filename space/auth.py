"""
Accounts: register / login / refresh / logout / change password / delete.

- Passwords: Argon2id hashes (never stored or logged in clear).
- Access token: short-lived signed JWT (30 min), sent by the client with each call.
- Refresh token: random opaque string, stored only as a SHA-256 hash, single use
  (rotated on every refresh), revoked on logout / password change / account deletion.
- Login & sign-up are rate limited. Error messages never reveal whether an e-mail exists.
"""
from __future__ import annotations

import hashlib
import os
import re
import secrets
import threading
import time
from datetime import datetime, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

import mailer
from store import Duplicate

ACCESS_TTL = int(os.getenv("ACCESS_TOKEN_MINUTES", "30")) * 60
REFRESH_TTL = int(os.getenv("REFRESH_TOKEN_DAYS", "30")) * 86400
DAILY_LIMIT = int(os.getenv("DAILY_LIMIT", "10"))
MAX_HISTORY = 20
PRO_LIMIT = int(os.getenv("PRO_DAILY_LIMIT", "50"))
# Verification is enforced when a real email provider is configured (override with REQUIRE_EMAIL_VERIFICATION=1/0).
REQUIRE_VERIFIED = os.getenv("REQUIRE_EMAIL_VERIFICATION", "1" if mailer.configured() else "0") == "1"
VERIFY_TTL, RESET_TTL = 24 * 3600, 3600

_secret = os.getenv("JWT_SECRET")
if not _secret:
    _secret = secrets.token_urlsafe(48)
    print("[aeterna] WARNING: JWT_SECRET not set — using a random one, everyone is signed out on every restart. "
          "Set JWT_SECRET in your Space secrets.")

ph = PasswordHasher()
_DUMMY = ph.hash("not-a-real-password")
EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,255}\.[^@\s]{2,}$")


class AppError(Exception):
    """Message is safe to show to the user."""


class AuthExpired(AppError):
    """Access token missing/invalid/expired — the client should refresh and retry."""


# ── helpers ───────────────────────────────────────────────────────────────────
def today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _uid(email: str) -> str:
    return "u_" + hashlib.sha256(email.encode()).hexdigest()[:20]


def _hash(t: str) -> str:
    return hashlib.sha256(t.encode()).hexdigest()


def plan_info(u: dict) -> dict:
    p = u.get("plan") or {}
    active = bool(p.get("until")) and p["until"] > time.time()
    return {"name": "pro" if active else "free", "active": active, "until": p.get("until") if active else None}


REF_BONUS = int(os.getenv("REFERRAL_BONUS", "2"))      # extra daily designs per friend who joins
REF_CAP = int(os.getenv("REFERRAL_CAP", "10"))          # max extra daily designs from referrals


def bonus_for(u: dict) -> int:
    got = min(REF_CAP, REF_BONUS * int(u.get("referrals", 0)))
    return got + (REF_BONUS if u.get("ref_credited") else 0)       # friends who joined via a link also get a welcome bonus


def limit_for(u: dict) -> int:
    return (PRO_LIMIT if plan_info(u)["active"] else DAILY_LIMIT) + bonus_for(u)


def _public(u: dict) -> dict:
    # accounts created before email verification existed have no flag and count as verified
    return {"id": u["_id"], "name": u["name"], "email": u["email"], "created": u["created"],
            "verified": bool(u.get("verified", True)), "verification_required": REQUIRE_VERIFIED,
            "plan": plan_info(u), "ref": u.get("ref", ""), "referrals": int(u.get("referrals", 0)),
            "bonus": bonus_for(u)}


class _Limiter:
    def __init__(self, n: int, window: int):
        self.n, self.window, self.hits, self.lock = n, window, {}, threading.Lock()

    def _clean(self, key):
        cut = time.time() - self.window
        self.hits[key] = [t for t in self.hits.get(key, []) if t > cut]
        return self.hits[key]

    def blocked(self, key) -> bool:
        with self.lock:
            return len(self._clean(key)) >= self.n

    def hit(self, key):
        with self.lock:
            self._clean(key).append(time.time())

    def reset(self, key):
        with self.lock:
            self.hits.pop(key, None)


mail_limit = _Limiter(5, 60 * 60)        # verification / reset emails per user or address (and per ip)
login_limit = _Limiter(5, 15 * 60)       # failed logins per (email, ip)
signup_limit = _Limiter(8, 60 * 60)      # sign-ups per ip


def clean_email(email: str) -> str:
    email = (email or "").strip().lower()
    if not EMAIL_RE.match(email):
        raise AppError("Please enter a valid email address.")
    return email


def check_password(pw: str, email: str = "") -> None:
    if not isinstance(pw, str) or len(pw) < 8:
        raise AppError("Password must be at least 8 characters.")
    if len(pw) > 128:
        raise AppError("Password is too long (128 characters max).")
    if pw.lower() == email.lower() or pw.lower() in {"password", "12345678", "123456789", "qwertyuiop"}:
        raise AppError("That password is too easy to guess. Please choose another.")


# ── tokens ────────────────────────────────────────────────────────────────────
def _access(uid: str) -> str:
    now = int(time.time())
    return jwt.encode({"sub": uid, "typ": "access", "iat": now, "exp": now + ACCESS_TTL}, _secret, algorithm="HS256")


def _new_refresh(db, uid: str) -> str:
    token = secrets.token_urlsafe(48)
    exp = time.time() + REFRESH_TTL
    db.insert("refresh", _hash(token), {"owner": uid, "created": time.time(), "exp": exp,
                                        "exp_dt": datetime.fromtimestamp(exp, timezone.utc)} if db.kind == "mongodb"
              else {"owner": uid, "created": time.time(), "exp": exp})
    return token


def _session(db, user: dict) -> dict:
    return {"user": _public(user), "access_token": _access(user["_id"]), "refresh_token": _new_refresh(db, user["_id"])}


def verify_access(db, token: str) -> dict:
    """Returns the user document for a valid access token, else raises AuthExpired."""
    try:
        data = jwt.decode(token or "", _secret, algorithms=["HS256"], options={"require": ["exp", "sub"]})
        if data.get("typ") != "access":
            raise jwt.InvalidTokenError
    except jwt.PyJWTError:
        raise AuthExpired("AUTH_EXPIRED: please sign in again.")
    user = db.get("users", data["sub"])
    if not user:
        raise AuthExpired("AUTH_EXPIRED: account not found.")
    return user


# ── actions ───────────────────────────────────────────────────────────────────
def _credit_referral(db, user: dict) -> None:
    """Called once the new user is verified (or immediately when verification is off)."""
    code = user.get("referred_by")
    if not code or user.get("ref_credited"):
        return
    owner = next(iter(db.all("users", {"ref": code}, limit=1)), None)
    db.update("users", user["_id"], {"ref_credited": True})
    if owner and owner["_id"] != user["_id"]:
        db.update("users", owner["_id"], {"referrals": int(owner.get("referrals", 0)) + 1})


def register(db, name: str, email: str, password: str, ip: str, ref: str = "") -> dict:
    if signup_limit.blocked(ip):
        raise AppError("Too many sign-ups from this network. Please try again later.")
    name = (name or "").strip()
    if not 1 <= len(name) <= 60:
        raise AppError("Please enter your name (up to 60 characters).")
    email = clean_email(email)
    check_password(password, email)
    signup_limit.hit(ip)
    user = {"owner": _uid(email), "created": time.time(), "name": name, "email": email,
            "pw": ph.hash(password), "taste": {}, "verified": not REQUIRE_VERIFIED,
            "ref": secrets.token_hex(4), "referrals": 0}
    ref = re.sub(r"[^a-f0-9]", "", (ref or "").lower())[:8]
    if ref:
        user["referred_by"] = ref
    try:
        db.insert("users", _uid(email), user)
    except Duplicate:
        raise AppError("An account with this email already exists. Try signing in.")
    user["_id"] = _uid(email)
    if REQUIRE_VERIFIED:
        _send_verification(db, user)
    else:
        _credit_referral(db, user)
    return _session(db, db.get("users", user["_id"]))


def login(db, email: str, password: str, ip: str) -> dict:
    email = (email or "").strip().lower()
    key = f"{email}|{ip}"
    if login_limit.blocked(key):
        raise AppError("Too many failed attempts. Please wait a few minutes and try again.")
    user = db.get("users", _uid(email)) if EMAIL_RE.match(email) else None
    try:
        ph.verify(user["pw"] if user else _DUMMY, password or "")
        ok = user is not None
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        ok = False
    if not ok:
        login_limit.hit(key)
        raise AppError("Incorrect email or password.")
    login_limit.reset(key)
    if ph.check_needs_rehash(user["pw"]):
        db.update("users", user["_id"], {"pw": ph.hash(password)})
    return _session(db, user)


# ── email verification & password reset ──────────────────────────────────────
def _etoken(db, uid: str, kind: str, ttl: int) -> str:
    db.delete_owned("etokens", uid) if kind == "reset" else None      # only the newest reset link works
    token = secrets.token_urlsafe(32)
    exp = time.time() + ttl
    doc = {"owner": uid, "kind": kind, "created": time.time(), "exp": exp}
    if db.kind == "mongodb":
        doc["exp_dt"] = datetime.fromtimestamp(exp, timezone.utc)
    db.insert("etokens", _hash(token), doc)
    return token


def _send_verification(db, user: dict) -> None:
    mailer.verify_email(user["email"], user["name"], _etoken(db, user["_id"], "verify", VERIFY_TTL))


def resend_verification(db, user: dict) -> dict:
    if user.get("verified", True):
        return {"ok": True, "already": True}
    if mail_limit.blocked(user["_id"]):
        raise AppError("Too many emails requested. Please wait a while and try again.")
    mail_limit.hit(user["_id"])
    _send_verification(db, user)
    return {"ok": True, "delivery": "ok" if mailer.deliverable() else "unavailable"}


def verify_email(db, token: str) -> dict:
    doc = db.pop("etokens", _hash(token or ""))
    if not doc or doc["kind"] != "verify" or doc["exp"] < time.time():
        raise AppError("This confirmation link is invalid or has expired. Sign in and request a new one.")
    db.update("users", doc["owner"], {"verified": True})
    u = db.get("users", doc["owner"])
    if u:
        _credit_referral(db, u)
    return {"ok": True}


def forgot_password(db, email: str, ip: str) -> dict:
    """Always answers the same way, so it can't be used to discover which emails have accounts."""
    generic = {"ok": True, "delivery": "ok" if mailer.deliverable() else "unavailable"}   # same for every address
    email = (email or "").strip().lower()
    if not EMAIL_RE.match(email):
        return generic
    if mail_limit.blocked(f"ip:{ip}") or mail_limit.blocked(f"e:{email}"):
        raise AppError("Too many reset requests. Please wait a while and try again.")
    mail_limit.hit(f"ip:{ip}"); mail_limit.hit(f"e:{email}")
    user = db.get("users", _uid(email))
    if user:
        mailer.reset_password(user["email"], user["name"], _etoken(db, user["_id"], "reset", RESET_TTL))
    return generic


def reset_password(db, token: str, new_password: str) -> dict:
    doc = db.get("etokens", _hash(token or ""))
    if not doc or doc["kind"] != "reset" or doc["exp"] < time.time():
        raise AppError("This reset link is invalid or has expired. Please request a new one.")
    user = db.get("users", doc["owner"])
    if not user:
        raise AppError("This reset link is invalid or has expired. Please request a new one.")
    check_password(new_password, user["email"])
    db.delete("etokens", _hash(token))                                    # single use
    db.update("users", user["_id"], {"pw": ph.hash(new_password), "verified": True})   # they proved they own the inbox
    db.delete_owned("refresh", user["_id"])                               # sign out everywhere
    login_limit.reset(f"{user['email']}|")
    return {"ok": True}


def require_verified(user: dict) -> None:
    if REQUIRE_VERIFIED and not user.get("verified", True):
        raise AppError("VERIFY_EMAIL: Please confirm your email address first — we sent you a link.")


def refresh(db, refresh_token: str) -> dict:
    doc = db.pop("refresh", _hash(refresh_token or ""))          # single use: rotated below
    if not doc or doc["exp"] < time.time():
        raise AuthExpired("AUTH_EXPIRED: please sign in again.")
    user = db.get("users", doc["owner"])
    if not user:
        raise AuthExpired("AUTH_EXPIRED: account not found.")
    return _session(db, user)


def logout(db, refresh_token: str) -> dict:
    if refresh_token:
        db.delete("refresh", _hash(refresh_token))
    return {"ok": True}


def change_password(db, user: dict, old: str, new: str) -> dict:
    try:
        ph.verify(user["pw"], old or "")
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        raise AppError("Your current password is incorrect.")
    check_password(new, user["email"])
    db.update("users", user["_id"], {"pw": ph.hash(new)})
    db.delete_owned("refresh", user["_id"])                       # sign out everywhere else
    return _session(db, db.get("users", user["_id"]))


def delete_account(db, user: dict, password: str) -> dict:
    try:
        ph.verify(user["pw"], password or "")
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        raise AppError("Password is incorrect.")
    for c in ("history", "refresh", "usage", "etokens"):
        db.delete_owned(c, user["_id"])
    db.delete("users", user["_id"])
    return {"ok": True}


def profile(db, user: dict) -> dict:
    if not user.get("ref"):                                   # accounts created before referrals existed
        user["ref"] = secrets.token_hex(4)
        db.update("users", user["_id"], {"ref": user["ref"]})
    used, limit = db.used(user["_id"], today()), limit_for(user)
    return {"user": _public(user), "taste": user.get("taste", {}),
            "quota": {"used": used, "limit": limit, "remaining": max(0, limit - used)}}
