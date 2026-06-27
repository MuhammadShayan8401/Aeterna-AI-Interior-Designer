"""
routes/feedback.py  (upgraded — adaptive feedback learning system)

POST /feedback              — Submit rating (expanded schema)
GET  /feedback/summary      — Basic aggregate stats
GET  /feedback/all          — Full log
DELETE /feedback/clear      — Clear all
GET  /feedback/recommend    — ANN-based sidebar recommendations
GET  /feedback/analytics    — Enhanced analytics with ANN metrics
POST /feedback/train        — Retrain ANN from current feedback.json
POST /feedback/rank         — Rank generated images by predicted preference
"""

import json
import time
from pathlib import Path

from fastapi import APIRouter, Form
from fastapi.responses import JSONResponse

from models.ann.preference_model import run_ann_inference, train_from_feedback
from services.recommendation_engine import get_generation_recommendation, compute_preference_scores
from services.analytics import compute_analytics

router = APIRouter()

# ── Storage ───────────────────────────────────────────────────────────────────
FEEDBACK_FILE = Path(__file__).parent.parent / "uploads" / "feedback.json"
_feedback: list[dict] = []


def _load():
    global _feedback
    if FEEDBACK_FILE.exists():
        try:
            _feedback = json.loads(FEEDBACK_FILE.read_text())
        except Exception:
            _feedback = []


def _save():
    try:
        FEEDBACK_FILE.parent.mkdir(exist_ok=True)
        FEEDBACK_FILE.write_text(json.dumps(_feedback, indent=2))
    except Exception:
        pass


_load()


# ── POST /feedback ─────────────────────────────────────────────────────────────

@router.post("")
async def submit_feedback(
    session_id:             str   = Form(...),
    image_index:            int   = Form(...),
    rating:                 int   = Form(...),          # 1 or -1
    seed:                   int   = Form(0),
    room_type:              str   = Form(""),
    style:                  str   = Form(""),
    density:                str   = Form("moderate"),
    strength:               float = Form(0.6),
    num_images:             int   = Form(3),
    generation_time:        float = Form(0.0),
    used_ai_recommendation: bool  = Form(False),
    aesthetic_score:        float = Form(0.5),
    realism_score:          float = Form(0.5),
    prompt_text:            str   = Form(""),
):
    """
    Submit feedback for a generated image (expanded schema for ANN training).
    New fields: density, strength, num_images, generation_time,
    used_ai_recommendation, aesthetic_score, realism_score, prompt_text.
    """
    if rating not in (1, -1):
        return JSONResponse({"success": False, "error": "rating must be 1 or -1"}, status_code=400)

    entry = {
        "session_id":             session_id,
        "image_index":            image_index,
        "rating":                 rating,
        "seed":                   seed,
        "room_type":              room_type,
        "style":                  style,
        "density":                density,
        "strength":               round(strength, 3),
        "num_images":             num_images,
        "generation_time":        round(generation_time, 2),
        "used_ai_recommendation": used_ai_recommendation,
        "aesthetic_score":        round(aesthetic_score, 3),
        "realism_score":          round(realism_score, 3),
        "prompt_text":            prompt_text[:500],    # truncate for storage
        "timestamp":              time.time(),
    }
    _feedback.append(entry)
    _save()

    # Compute current like_ratio for this session
    session_records = [f for f in _feedback if f["session_id"] == session_id]
    like_ratio = sum(1 for f in session_records if f["rating"] > 0) / len(session_records)

    return JSONResponse({
        "success":         True,
        "total_feedback":  len(_feedback),
        "session_ratings": len(session_records),
        "session_like_ratio": round(like_ratio, 3),
    })


# ── GET /feedback/summary ─────────────────────────────────────────────────────

@router.get("/summary")
async def feedback_summary():
    total    = len(_feedback)
    likes    = sum(1 for f in _feedback if f["rating"] == 1)
    dislikes = total - likes
    style_counts: dict[str, dict] = {}
    for f in _feedback:
        s = f.get("style") or "unknown"
        if s not in style_counts:
            style_counts[s] = {"likes": 0, "dislikes": 0}
        if f["rating"] == 1:
            style_counts[s]["likes"] += 1
        else:
            style_counts[s]["dislikes"] += 1

    return JSONResponse({
        "total":         total,
        "likes":         likes,
        "dislikes":      dislikes,
        "like_rate_pct": round(likes / total * 100, 1) if total > 0 else 0,
        "by_style":      style_counts,
    })


# ── GET /feedback/all ─────────────────────────────────────────────────────────

@router.get("/all")
async def feedback_all():
    return JSONResponse({"feedback": _feedback, "total": len(_feedback)})


# ── DELETE /feedback/clear ────────────────────────────────────────────────────

@router.delete("/clear")
async def clear_feedback():
    global _feedback
    _feedback = []
    _save()
    return JSONResponse({"success": True, "message": "All feedback cleared."})


# ── GET /feedback/recommend ───────────────────────────────────────────────────

@router.get("/recommend")
async def get_recommendations(
    room_type:  str   = "living room",
    style:      str   = "modern",
    density:    str   = "moderate",
    strength:   float = 0.6,
    session_id: str   = "",
):
    """
    Return ANN-based recommendations for sidebar defaults.
    The frontend calls this to pre-fill AI Assisted Mode values.
    """
    # Compute per-session like ratio from feedback history
    session_records = [f for f in _feedback if f.get("session_id") == session_id] if session_id else []
    like_ratio = (
        sum(1 for f in session_records if f["rating"] > 0) / len(session_records)
        if session_records else 0.5
    )

    context = {
        "room_type":  room_type,
        "style":      style,
        "density":    density,
        "strength":   strength,
        "like_ratio": like_ratio,
        "num_images": 3,
        "aesthetic_score": 0.5,
        "realism_score":   0.5,
        "used_ai_recommendation": False,
    }

    try:
        rec = get_generation_recommendation(context)
        ann = run_ann_inference(context)
        return JSONResponse({
            "success":            True,
            "recommended_style":  rec.style,
            "recommended_density": rec.density,
            "suggested_strength": rec.strength,
            "confidence":         rec.confidence,
            "style_affinities":   rec.affinities,
            "density_affinities": ann.density_affinities,
            "satisfaction_prob":  ann.satisfaction_prob,
            "aesthetic_score":    ann.aesthetic_score,
            "prompt_boost":       rec.prompt_boost,
            "reasoning":          f"Based on {len(_feedback)} feedback records. "
                                  f"Confidence: {rec.confidence:.0%}",
        })
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


# ── GET /feedback/analytics ───────────────────────────────────────────────────

@router.get("/analytics")
async def get_analytics():
    """Enhanced analytics: style success rates, room trends, ANN metrics, AI usage."""
    try:
        data = compute_analytics()
        return JSONResponse({"success": True, **data})
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


# ── POST /feedback/train ──────────────────────────────────────────────────────

@router.post("/train")
async def retrain_ann(epochs: int = 150, lr: float = 3e-4):
    """
    Retrain the ANN preference model from current feedback.json.
    Runs in a background thread so it never blocks the event loop.
    Epochs default to 150 for better convergence.
    """
    import asyncio, logging
    logger = logging.getLogger("aeterna.feedback")
    logger.info("[Train] POST /feedback/train received — epochs=%d lr=%s", epochs, lr)
    try:
        # Run CPU/GPU training off the event loop
        result = await asyncio.to_thread(train_from_feedback, epochs, lr)
        logger.info("[Train] Result: %s", result)
        return JSONResponse(result)
    except Exception as e:
        import traceback
        logging.getLogger("aeterna.feedback").error("[Train] Unexpected error: %s\n%s", e, traceback.format_exc())
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


@router.get("/ann-status")
async def feedback_ann_status():
    """
    Lightweight ANN status check used by the Sidebar / SystemStatus.
    Returns checkpoint existence, record count, and training readiness.
    Does NOT load the checkpoint or run inference — just checks files.
    """
    from models.ann.preference_model import CHECKPOINT, FEEDBACK_FILE, MIN_RECORDS
    import json as _json, time as _time

    ckpt_exists  = CHECKPOINT.exists()
    record_count = len(_feedback)

    trained_at   = None
    records_used = None
    final_loss   = None
    if ckpt_exists:
        try:
            import torch
            ckpt         = torch.load(CHECKPOINT, map_location="cpu")
            trained_at   = ckpt.get("trained_at")
            records_used = ckpt.get("records")
            final_loss   = ckpt.get("final_loss")
        except Exception:
            pass

    status = "ready" if ckpt_exists and record_count >= MIN_RECORDS else (
             "untrained" if not ckpt_exists else "insufficient_data")

    return JSONResponse({
        "success":        True,
        "status":         status,
        "checkpoint":     ckpt_exists,
        "record_count":   record_count,
        "min_records":    MIN_RECORDS,
        "ready":          ckpt_exists,
        "trained_at":     trained_at,
        "records_used":   records_used,
        "final_loss":     final_loss,
        "message": {
            "ready":             f"Preference model loaded — trained on {records_used or '?'} records",
            "untrained":         f"No checkpoint. Rate {max(0, MIN_RECORDS - record_count)} more designs then click Update Preference Model.",
            "insufficient_data": f"Need {MIN_RECORDS} ratings, have {record_count}.",
        }.get(status, "Unknown state"),
    })


# ── POST /feedback/rank ───────────────────────────────────────────────────────

@router.post("/rank")
async def rank_images(
    seeds:     str   = Form(...),      # comma-separated seed list
    style:     str   = Form("modern"),
    density:   str   = Form("moderate"),
    strength:  float = Form(0.6),
    room_type: str   = Form("living room"),
    session_id: str  = Form(""),
):
    """
    Rank a list of generated images by predicted user preference.
    Returns images sorted by ANN preference score (highest first).
    """
    try:
        seed_list = [int(s.strip()) for s in seeds.split(",") if s.strip()]

        session_records = [f for f in _feedback if f.get("session_id") == session_id] if session_id else []
        like_ratio = (
            sum(1 for f in session_records if f["rating"] > 0) / len(session_records)
            if session_records else 0.5
        )

        ranked = compute_preference_scores(
            seeds=seed_list, style=style, density=density,
            strength=strength, room_type=room_type, like_ratio=like_ratio,
        )
        return JSONResponse({"success": True, "ranked": ranked})
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
