"""
routes/dashboard.py
====================
User + Admin dashboards (NEW, additive). Every figure here comes from a
real query against MongoDB, feedback.json, or live process/ANN state —
no placeholder numbers, no simulated activity.

GET  /dashboard/me                — user dashboard (auth required)
GET  /dashboard/admin/overview    — admin dashboard (admin auth required)
POST /dashboard/admin/retrain     — admin-gated ANN retrain trigger
                                     (the existing public POST
                                     /feedback/train is untouched — this
                                     is a separate, authenticated entry
                                     point for the admin dashboard's
                                     "retrain" button specifically)
"""

import asyncio
import logging
import time as _time

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from bson import ObjectId

from core.deps import get_current_user, get_current_admin
from database.mongo import get_database
from database.persistence import (
    user_generation_stats, user_preference_breakdown, user_recent_activity,
    admin_user_counts, admin_generation_counts,
)
from services.analytics import compute_analytics, FEEDBACK_FILE
from models.ann.preference_model import CHECKPOINT, MIN_RECORDS, train_from_feedback

router = APIRouter()

# Process start time, for the admin dashboard's uptime figure. Defined here
# rather than imported from app.py — this module is loaded once, early, as
# part of app.py's own router imports, so the timestamp is for all practical
# purposes "server start", without creating a circular import back into the
# app module (which pulls in torch and the full ML stack just for a clock
# reading).
START_TIME = _time.time()


def _serialize_activity(items: list[dict]) -> list[dict]:
    out = []
    for d in items:
        d = dict(d)
        if hasattr(d.get("created_at"), "isoformat"):
            d["created_at"] = d["created_at"].isoformat()
        out.append(d)
    return out


# ════════════════════════════════════════════════════════════════════════════
# USER DASHBOARD
# ════════════════════════════════════════════════════════════════════════════

@router.get("/dashboard/me")
async def user_dashboard(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    role = current_user.get("role", "user")
    if role == "admin":
        # Admins don't have a Generations history of their own (they're
        # not end-users of the design pipeline) — point them at the
        # admin dashboard instead, consistent with /auth/me's split.
        return JSONResponse({
            "success": False,
            "error": "Admin accounts use /dashboard/admin/overview",
        }, status_code=403)

    gen_stats   = await user_generation_stats(user_id)
    preferences = await user_preference_breakdown(user_id)
    activity    = await user_recent_activity(user_id)

    # Feedback given: join feedback.json records (keyed by session_id)
    # against this user's own generation session_ids. The flat-file
    # feedback system predates per-account auth and has no user_id of
    # its own, so this is the only correct way to attribute it today.
    from database.mongo import generations_collection
    cursor = generations_collection().find({"user_id": ObjectId(user_id)}, {"session_id": 1})
    user_session_ids = {d["session_id"] async for d in cursor if d.get("session_id")}

    feedback_records = _load_feedback_records()
    user_feedback = [r for r in feedback_records if r.get("session_id") in user_session_ids]
    feedback_given = {
        "total":      len(user_feedback),
        "likes":      sum(1 for r in user_feedback if r.get("rating", 0) > 0),
        "dislikes":   sum(1 for r in user_feedback if r.get("rating", 0) <= 0),
    }

    return JSONResponse({
        "success": True,
        "user": {
            "id": user_id,
            "full_name": current_user.get("full_name"),
            "email": current_user.get("email"),
            "member_since": current_user.get("created_at").isoformat()
                if hasattr(current_user.get("created_at"), "isoformat") else None,
        },
        "generation_stats": gen_stats,
        "preference_analytics": preferences,
        "feedback_given": feedback_given,
        "recent_activity": _serialize_activity(activity),
    })


def _load_feedback_records() -> list[dict]:
    import json
    if not FEEDBACK_FILE.exists():
        return []
    try:
        return json.loads(FEEDBACK_FILE.read_text())
    except Exception:
        return []


# ════════════════════════════════════════════════════════════════════════════
# ADMIN DASHBOARD
# ════════════════════════════════════════════════════════════════════════════

@router.get("/dashboard/admin/overview")
async def admin_dashboard(current_admin: dict = Depends(get_current_admin)):
    user_counts = await admin_user_counts()
    gen_counts  = await admin_generation_counts()

    # Dataset monitoring — the actual file the ANN model trains from.
    feedback_records = _load_feedback_records()
    dataset_info = {
        "feedback_record_count": len(feedback_records),
        "feedback_file_size_kb": round(FEEDBACK_FILE.stat().st_size / 1024, 1) if FEEDBACK_FILE.exists() else 0,
        "feedback_file_exists": FEEDBACK_FILE.exists(),
    }

    # ANN status (reuses the same checkpoint inspection as /feedback/ann-status)
    ckpt_exists = CHECKPOINT.exists()
    ann_status = {
        "checkpoint_exists": ckpt_exists,
        "min_records_to_train": MIN_RECORDS,
        "ready_to_train": len(feedback_records) >= MIN_RECORDS,
    }
    if ckpt_exists:
        try:
            import torch
            ckpt = torch.load(CHECKPOINT, map_location="cpu")
            ann_status["trained_at"]   = ckpt.get("trained_at")
            ann_status["records_used"] = ckpt.get("records")
            ann_status["final_loss"]   = ckpt.get("final_loss")
        except Exception:
            pass

    # Generation performance — reuse the existing feedback analytics
    # (style success rates, like rate, AI usage uplift) rather than
    # recomputing it a second way.
    perf = compute_analytics()

    return JSONResponse({
        "success": True,
        "users": user_counts,
        "generations": gen_counts,
        "dataset": dataset_info,
        "ann_model": ann_status,
        "performance": {
            "like_rate_pct": perf.get("like_rate_pct"),
            "top_styles": perf.get("top_styles"),
            "ai_usage": perf.get("ai_usage"),
        },
        "system": {
            "database_connected": get_database() is not None,
            "uptime_sec": round(_time.time() - START_TIME, 1),
        },
    })


@router.post("/dashboard/admin/retrain")
async def admin_trigger_retrain(
    epochs: int = 150, lr: float = 3e-4,
    current_admin: dict = Depends(get_current_admin),
):
    """Admin-gated retrain trigger for the dashboard's 'Retrain Model'
    button. Calls the same train_from_feedback() used by the existing
    public POST /feedback/train, which is left untouched for backward
    compatibility with the current frontend ANNStatusPanel."""
    logger = logging.getLogger("aeterna.dashboard")
    logger.info("Admin %s triggered retrain (epochs=%d, lr=%s)", current_admin.get("email"), epochs, lr)
    try:
        result = await asyncio.to_thread(train_from_feedback, epochs, lr)
        return JSONResponse(result)
    except Exception as e:
        import traceback
        logger.error("Admin retrain failed: %s\n%s", e, traceback.format_exc())
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
