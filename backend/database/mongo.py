"""
database/mongo.py
==================
Async MongoDB connection lifecycle (Motor) + collection accessors.

Design notes:
- Connection is established in app.py's startup event and closed on
  shutdown — this module just holds the client/db references and is
  imported wherever a collection is needed.
- If MongoDB is unreachable, `connect_to_mongo()` logs a warning instead
  of crashing the process. This matters because the existing pipeline
  routes (/generate, /feedback, /ann) have no database dependency and
  must keep working even if Mongo is down or not yet configured —
  per the "do not break existing features" requirement.
- `require_db()` is the dependency new auth/db-backed routes use; it
  raises a clean 503 if Mongo isn't connected, rather than a confusing
  AttributeError on a None client.
"""

import logging

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from core.config import settings

logger = logging.getLogger("aeterna.db")

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_to_mongo() -> bool:
    """Attempt to connect to MongoDB. Returns True on success."""
    global _client, _db
    try:
        _client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=4000)
        await _client.admin.command("ping")
        _db = _client[settings.DB_NAME]
        await _ensure_indexes(_db)
        logger.info("MongoDB connected → db=%s", settings.DB_NAME)
        return True
    except Exception as e:
        logger.warning(
            "MongoDB connection failed (%s). Auth/DB-backed routes will return 503; "
            "the existing AI pipeline routes are unaffected.", e
        )
        _client = None
        _db = None
        return False


async def close_mongo_connection() -> None:
    global _client
    if _client is not None:
        _client.close()
        logger.info("MongoDB connection closed")


def get_database() -> AsyncIOMotorDatabase | None:
    return _db


def require_db() -> AsyncIOMotorDatabase:
    """FastAPI dependency — use in any route that needs Mongo."""
    if _db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable. Check MONGODB_URI / that MongoDB is running.",
        )
    return _db


# ── Collection accessors ──────────────────────────────────────────────────────
# Centralizing collection names here means every route imports these
# instead of stringly-typed `db["users"]` calls scattered around.

def users_collection():
    return require_db()["users"]


def admins_collection():
    return require_db()["admins"]


def generations_collection():
    return require_db()["generations"]


def feedback_collection():
    return require_db()["feedback"]


def ann_training_logs_collection():
    return require_db()["ann_training_logs"]


# ── Indexes ────────────────────────────────────────────────────────────────────

async def _ensure_indexes(db: AsyncIOMotorDatabase) -> None:
    await db["users"].create_index("email", unique=True)
    await db["admins"].create_index("email", unique=True)
    await db["generations"].create_index([("user_id", 1), ("created_at", -1)])
    await db["generations"].create_index("generation_type")
    await db["feedback"].create_index("generation_id")
    await db["feedback"].create_index([("user_id", 1), ("created_at", -1)])
    await db["ann_training_logs"].create_index([("trained_at", -1)])
