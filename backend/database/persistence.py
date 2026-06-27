"""
database/persistence.py
========================
Thin helper for writing Generation records without forcing every caller
to handle "what if Mongo isn't connected" — the existing pipeline routes
must keep working even with no database configured, so persistence here
is always best-effort: failures are logged and swallowed, never raised.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from bson import ObjectId

from database.mongo import get_database, generations_collection, users_collection

logger = logging.getLogger("aeterna.persistence")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def save_generation(
    *,
    session_id: str,
    generation_type: str,                  # "redesign" | "empty_room"
    room_type: str,
    style: str,
    density: str,
    prompt: str,
    output_image_urls: list[str],
    seeds: list[int],
    preference_scores: Optional[list[float]] = None,
    strength: Optional[float] = None,        # redesign only
    lighting: Optional[str] = None,           # empty_room only
    negative_prompt: Optional[str] = None,
    input_image_url: Optional[str] = None,
    furniture_detected: Optional[list[str]] = None,
    ann_recommendation_used: bool = False,
    generation_time: Optional[float] = None,
    user_id: Optional[str] = None,
    parent_generation_id: Optional[str] = None,
) -> Optional[str]:
    """
    Writes a Generation document. Returns the inserted id as a string, or
    None if the database is unavailable / the write failed — callers
    should treat None as "not persisted" and continue regardless, since
    generation/feedback/ANN routes must never fail because Mongo is down.
    """
    if get_database() is None:
        return None

    doc = {
        "user_id":             ObjectId(user_id) if user_id else None,
        "session_id":          session_id,
        "generation_type":     generation_type,
        "room_type":           room_type,
        "style":               style,
        "density":             density,
        "strength":            strength,
        "lighting":            lighting,
        "prompt":              prompt,
        "negative_prompt":     negative_prompt,
        "input_image_url":     input_image_url,
        "output_image_urls":   output_image_urls,
        "seeds":               seeds,
        "furniture_detected":  furniture_detected or [],
        "ann_recommendation_used": ann_recommendation_used,
        "preference_scores":   preference_scores or [],
        "generation_time":     generation_time,
        "is_favorite":         False,
        "parent_generation_id": ObjectId(parent_generation_id) if parent_generation_id else None,
        "created_at":          _utcnow(),
    }

    try:
        result = await generations_collection().insert_one(doc)
        return str(result.inserted_id)
    except Exception as e:
        logger.warning("Failed to persist generation (continuing without it): %s", e)
        return None


# ── History read/update/delete helpers ────────────────────────────────────────
# Used by routes/history.py. Unlike save_generation(), these intentionally
# DO raise (via require_db, inside database.mongo) — listing/editing
# history is a Mongo-backed feature with no meaningful degraded mode, so
# routes/history.py surfaces a clean 503 rather than silently returning
# empty results, which would look like "you have no history" instead of
# "the database is down".

def _doc_owned_by(doc: dict, user_id: Optional[str], session_id: Optional[str]) -> bool:
    """A record is accessible by its owning user, or — for anonymous
    records (user_id is null) — by the session that created it."""
    if doc.get("user_id") is not None:
        return user_id is not None and str(doc["user_id"]) == user_id
    return session_id is not None and doc.get("session_id") == session_id


async def list_generations(
    *,
    user_id: Optional[str],
    session_id: Optional[str],
    generation_type: Optional[str] = None,
    favorites_only: bool = False,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list[dict], int]:
    """Returns (page_of_docs, total_count) for the owning user/session."""
    query: dict = {}
    if user_id:
        query["user_id"] = ObjectId(user_id)
    elif session_id:
        query["session_id"] = session_id
        query["user_id"] = None
    else:
        return [], 0

    if generation_type:
        query["generation_type"] = generation_type
    if favorites_only:
        query["is_favorite"] = True

    coll = generations_collection()
    total = await coll.count_documents(query)
    cursor = coll.find(query).sort("created_at", -1).skip(skip).limit(limit)
    docs = [d async for d in cursor]
    return docs, total


async def get_generation(generation_id: str) -> Optional[dict]:
    try:
        return await generations_collection().find_one({"_id": ObjectId(generation_id)})
    except Exception:
        return None


async def set_favorite(generation_id: str, is_favorite: bool) -> bool:
    result = await generations_collection().update_one(
        {"_id": ObjectId(generation_id)}, {"$set": {"is_favorite": is_favorite}}
    )
    return result.matched_count > 0


async def delete_generation(generation_id: str) -> bool:
    result = await generations_collection().delete_one({"_id": ObjectId(generation_id)})
    return result.deleted_count > 0


# ── Dashboard aggregation helpers ──────────────────────────────────────────────
# Used by routes/dashboard.py. Like the history helpers above, these are
# Mongo-backed features with no meaningful degraded mode, so they raise
# (via require_db inside the collection accessors) rather than silently
# returning zeros, which would look like real data.

async def user_generation_stats(user_id: str) -> dict:
    coll = generations_collection()
    uid = ObjectId(user_id)

    total = await coll.count_documents({"user_id": uid})
    redesign_count = await coll.count_documents({"user_id": uid, "generation_type": "redesign"})
    empty_room_count = await coll.count_documents({"user_id": uid, "generation_type": "empty_room"})
    favorites_count = await coll.count_documents({"user_id": uid, "is_favorite": True})
    with_ai = await coll.count_documents({"user_id": uid, "ann_recommendation_used": True})

    return {
        "total": total,
        "redesign_count": redesign_count,
        "empty_room_count": empty_room_count,
        "favorites_count": favorites_count,
        "ai_usage": {
            "total_with_ai": with_ai,
            "total_without_ai": total - with_ai,
            "ai_usage_rate_pct": round(with_ai / total * 100, 1) if total else 0,
        },
    }


async def user_preference_breakdown(user_id: str, top_n: int = 5) -> dict:
    """Counts style/room_type/density occurrences across a user's own
    generation history — distinct from the global ANN preference model;
    this is just "what has this person actually generated"."""
    coll = generations_collection()
    uid = ObjectId(user_id)

    async def _top(field: str) -> list[dict]:
        pipeline = [
            {"$match": {"user_id": uid}},
            {"$group": {"_id": f"${field}", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": top_n},
        ]
        return [{"value": d["_id"], "count": d["count"]} async for d in coll.aggregate(pipeline) if d["_id"]]

    return {
        "top_styles":     await _top("style"),
        "top_room_types": await _top("room_type"),
        "top_density":    await _top("density"),
    }


async def user_recent_activity(user_id: str, limit: int = 10) -> list[dict]:
    coll = generations_collection()
    cursor = (
        coll.find({"user_id": ObjectId(user_id)})
        .sort("created_at", -1)
        .limit(limit)
    )
    out = []
    async for d in cursor:
        out.append({
            "generation_id":   str(d["_id"]),
            "generation_type": d["generation_type"],
            "room_type":       d["room_type"],
            "style":           d["style"],
            "is_favorite":     d.get("is_favorite", False),
            "created_at":      d["created_at"],
        })
    return out


async def admin_user_counts() -> dict:
    coll = users_collection()
    total = await coll.count_documents({})
    active = await coll.count_documents({"is_active": True})

    thirty_days_ago = _utcnow().replace(tzinfo=None) - timedelta(days=30)
    recently_active = await coll.count_documents({"last_login": {"$gte": thirty_days_ago}})
    new_30d = await coll.count_documents({"created_at": {"$gte": thirty_days_ago}})

    return {
        "total_users": total,
        "active_users": active,
        "recently_active_30d": recently_active,
        "new_users_30d": new_30d,
    }


async def admin_generation_counts() -> dict:
    coll = generations_collection()
    total = await coll.count_documents({})
    redesign = await coll.count_documents({"generation_type": "redesign"})
    empty_room = await coll.count_documents({"generation_type": "empty_room"})

    pipeline = [
        {"$match": {"generation_time": {"$ne": None}}},
        {"$group": {"_id": None, "avg_time": {"$avg": "$generation_time"}, "n": {"$sum": 1}}},
    ]
    perf = [d async for d in coll.aggregate(pipeline)]
    avg_generation_time = round(perf[0]["avg_time"], 2) if perf else None

    return {
        "total_generations": total,
        "redesign_count": redesign,
        "empty_room_count": empty_room,
        "avg_generation_time_sec": avg_generation_time,
    }
