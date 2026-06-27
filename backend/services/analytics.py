"""
services/analytics.py
=======================
Enhanced feedback analytics with ANN confidence scores,
style success rates, room-type trends, and satisfaction metrics.
Used by GET /feedback/analytics.
"""

from __future__ import annotations
import json
from pathlib import Path

FEEDBACK_FILE = Path(__file__).parent.parent / "uploads" / "feedback.json"


def _load() -> list[dict]:
    if not FEEDBACK_FILE.exists():
        return []
    try:
        return json.loads(FEEDBACK_FILE.read_text())
    except Exception:
        return []


def compute_analytics() -> dict:
    records = _load()
    if not records:
        return {
            "total": 0, "likes": 0, "dislikes": 0, "like_rate_pct": 0,
            "by_style": {}, "by_room": {}, "top_styles": [], "trends": [],
            "satisfaction_metrics": {}, "ai_usage": {},
        }

    total    = len(records)
    likes    = sum(1 for r in records if r.get("rating", 0) > 0)
    dislikes = total - likes

    # Per-style stats
    by_style: dict[str, dict] = {}
    for r in records:
        s = r.get("style", "unknown")
        if s not in by_style:
            by_style[s] = {"likes": 0, "dislikes": 0, "total": 0,
                           "aesthetic_scores": [], "realism_scores": []}
        by_style[s]["total"] += 1
        if r.get("rating", 0) > 0:
            by_style[s]["likes"] += 1
        else:
            by_style[s]["dislikes"] += 1
        if "aesthetic_score" in r:
            by_style[s]["aesthetic_scores"].append(r["aesthetic_score"])
        if "realism_score" in r:
            by_style[s]["realism_scores"].append(r["realism_score"])

    # Compute success rates
    style_results = {}
    for s, data in by_style.items():
        t = data["total"]
        rate = round(data["likes"] / t * 100, 1) if t > 0 else 0
        avg_aes = round(sum(data["aesthetic_scores"]) / len(data["aesthetic_scores"]), 3) \
            if data["aesthetic_scores"] else None
        style_results[s] = {
            "total":        t,
            "likes":        data["likes"],
            "dislikes":     data["dislikes"],
            "success_rate": rate,
            "avg_aesthetic": avg_aes,
        }

    # Top 3 styles by success rate (min 2 ratings)
    top_styles = sorted(
        [(s, d["success_rate"]) for s, d in style_results.items() if d["total"] >= 2],
        key=lambda x: x[1], reverse=True
    )[:3]

    # Per-room-type stats
    by_room: dict[str, dict] = {}
    for r in records:
        room = r.get("room_type", "unknown")
        if room not in by_room:
            by_room[room] = {"total": 0, "likes": 0}
        by_room[room]["total"] += 1
        if r.get("rating", 0) > 0:
            by_room[room]["likes"] += 1

    room_results = {
        room: {
            "total":        d["total"],
            "likes":        d["likes"],
            "success_rate": round(d["likes"] / d["total"] * 100, 1) if d["total"] > 0 else 0,
        }
        for room, d in by_room.items()
    }

    # AI recommendation usage stats
    ai_records = [r for r in records if r.get("used_ai_recommendation")]
    ai_usage = {
        "total_with_ai":    len(ai_records),
        "like_rate_with_ai": round(
            sum(1 for r in ai_records if r.get("rating", 0) > 0) / len(ai_records) * 100, 1
        ) if ai_records else 0,
        "like_rate_without_ai": round(
            sum(1 for r in records if r.get("rating", 0) > 0 and not r.get("used_ai_recommendation"))
            / max(total - len(ai_records), 1) * 100, 1
        ),
    }

    # Satisfaction metrics
    aesthetic_all = [r["aesthetic_score"] for r in records if "aesthetic_score" in r]
    realism_all   = [r["realism_score"]   for r in records if "realism_score"   in r]
    sat_metrics = {
        "avg_aesthetic": round(sum(aesthetic_all) / len(aesthetic_all), 3) if aesthetic_all else None,
        "avg_realism":   round(sum(realism_all)   / len(realism_all),   3) if realism_all   else None,
        "total_rated":   total,
    }

    # Simple trend: last 10 records
    recent   = records[-10:]
    trends   = [{"style": r.get("style","?"), "rating": r.get("rating",0)} for r in recent]

    return {
        "total":                total,
        "likes":                likes,
        "dislikes":             dislikes,
        "like_rate_pct":        round(likes / total * 100, 1),
        "by_style":             style_results,
        "by_room":              room_results,
        "top_styles":           [{"style": s, "success_rate": r} for s, r in top_styles],
        "trends":               trends,
        "satisfaction_metrics": sat_metrics,
        "ai_usage":             ai_usage,
    }
