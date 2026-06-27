"""
core/config.py
===============
Centralized environment-driven settings for Aeterna's database and auth
layer (Phase 2 — production extension). Existing pipeline modules
(segmentation, depth, diffusion, ANN) are untouched and do not depend
on this file.

All values fall back to sane local-dev defaults so the existing
generate/feedback/ann routes keep working even before a .env is set up.
Override via a .env file in backend/ (loaded automatically) or real
environment variables in production.
"""

import os
import secrets
from pathlib import Path

from dotenv import load_dotenv

# Load backend/.env if present (does nothing if the file doesn't exist).
load_dotenv(Path(__file__).parent.parent / ".env")


class Settings:
    # ── MongoDB ────────────────────────────────────────────────────────────
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    DB_NAME:     str = os.getenv("DB_NAME", "aeterna")

    # ── JWT ────────────────────────────────────────────────────────────────
    # In production, JWT_SECRET_KEY MUST be set explicitly — a random key
    # generated at process start (the fallback below) would invalidate every
    # issued token on every restart/redeploy.
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY") or secrets.token_urlsafe(48)
    JWT_ALGORITHM:  str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES:  int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS:    int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

    # ── Admin bootstrap ────────────────────────────────────────────────────
    # One-time setup key used by POST /auth/admin/bootstrap. The endpoint
    # only ever succeeds while the admins collection is empty, so this key
    # stops being security-relevant after the first admin account exists.
    ADMIN_SETUP_KEY: str = os.getenv("ADMIN_SETUP_KEY", "")

    @property
    def jwt_secret_is_ephemeral(self) -> bool:
        """True if JWT_SECRET_KEY wasn't explicitly configured — tokens
        won't survive a process restart. Used to log a startup warning."""
        return not os.getenv("JWT_SECRET_KEY")


settings = Settings()
