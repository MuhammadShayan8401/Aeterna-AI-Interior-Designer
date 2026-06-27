"""
core/security.py
=================
Password hashing (bcrypt, used directly) and JWT issuing/verification
(python-jose). Pure utility functions — no FastAPI dependencies live
here; those are in routes/auth.py / core/deps.py.

Note: we call the `bcrypt` package directly rather than going through
passlib's CryptContext. passlib 1.7.4 (the latest release, unmaintained
since 2020) breaks on bcrypt>=4.1 because it probes a removed
`bcrypt.__about__` attribute — a well-known incompatibility. Calling
bcrypt directly avoids that fragile dependency entirely.
"""

import time
from typing import Literal

import bcrypt
from jose import JWTError, jwt

from core.config import settings

TokenType = Literal["access", "refresh"]

# bcrypt has a hard 72-byte input limit; longer passwords are truncated
# at the byte level before hashing (this matches bcrypt's own behavior).
_BCRYPT_MAX_BYTES = 72


# ── Passwords ────────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    raw = plain.encode("utf-8")[:_BCRYPT_MAX_BYTES]
    return bcrypt.hashpw(raw, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        raw = plain.encode("utf-8")[:_BCRYPT_MAX_BYTES]
        return bcrypt.checkpw(raw, hashed.encode("utf-8"))
    except Exception:
        return False


# ── JWT ──────────────────────────────────────────────────────────────────────

def _create_token(subject: str, role: str, token_type: TokenType, expires_seconds: int) -> str:
    now = int(time.time())
    payload = {
        "sub":  subject,           # user/admin id
        "role": role,               # "user" | "admin"
        "type": token_type,
        "iat":  now,
        "exp":  now + expires_seconds,
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(subject: str, role: str) -> str:
    return _create_token(subject, role, "access", settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)


def create_refresh_token(subject: str, role: str) -> str:
    return _create_token(subject, role, "refresh", settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400)


def decode_token(token: str) -> dict | None:
    """Returns the decoded payload, or None if invalid/expired."""
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None
