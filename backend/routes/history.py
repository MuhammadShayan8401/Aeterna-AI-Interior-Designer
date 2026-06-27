"""
routes/history.py
==================
History + Revisit system (NEW, additive). Covers both generation modes
(redesign + empty_room) since both write to the same Generations
collection (see database/schemas.py: GenerationDoc, generation_type).

GET    /history                       — paginated list, filterable
GET    /history/{id}                  — single record (for reopening/
                                          before-after comparison — the
                                          comparison slider itself is a
                                          frontend concern; this just
                                          returns input_image_url +
                                          output_image_urls)
PATCH  /history/{id}/favorite         — set/toggle favorite
DELETE /history/{id}                  — delete a record
POST   /history/{id}/regenerate       — re-run generation from the
                                          record's stored settings,
                                          optionally overriding individual
                                          fields, creating a NEW record
                                          linked via parent_generation_id

Access control: a record is visible to the user who owns it (user_id
match) or, for anonymous generations (user_id is null), to the session
that created it. Logged-in users identify via Bearer token; anonymous
callers must pass their session_id as a query parameter.

If MongoDB isn't connected, these routes return 503 (via require_db,
surfaced naturally since the helpers in database/persistence.py call
generations_collection() which raises) — there's no meaningful degraded
mode for "show me my history" the way there is for generation itself.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from core.deps import get_optional_user_id
from database.persistence import (
    list_generations, get_generation, set_favorite, delete_generation,
    _doc_owned_by,
)
from services.generation_service import run_redesign_pipeline, run_empty_room_pipeline
from utils.image_utils import url_to_path

router = APIRouter()


def _serialize(doc: dict) -> dict:
    out = dict(doc)
    out["_id"] = str(out["_id"])
    out["user_id"] = str(out["user_id"]) if out.get("user_id") else None
    out["parent_generation_id"] = (
        str(out["parent_generation_id"]) if out.get("parent_generation_id") else None
    )
    if isinstance(out.get("created_at"), datetime):
        out["created_at"] = out["created_at"].isoformat()
    return out


async def _get_owned_or_404(generation_id: str, user_id: Optional[str], session_id: Optional[str]) -> dict:
    doc = await get_generation(generation_id)
    if doc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Generation not found")
    if not _doc_owned_by(doc, user_id, session_id):
        # 404 rather than 403 — don't reveal that a record exists to
        # someone who doesn't own it.
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Generation not found")
    return doc


# ── List ───────────────────────────────────────────────────────────────────────

@router.get("/history")
async def get_history(
    session_id: Optional[str] = Query(None, description="Required for anonymous (non-logged-in) callers"),
    generation_type: Optional[str] = Query(None, pattern="^(redesign|empty_room)$"),
    favorites_only: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: Optional[str] = Depends(get_optional_user_id),
):
    if not user_id and not session_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Provide either a Bearer token or a session_id query parameter",
        )

    docs, total = await list_generations(
        user_id=user_id, session_id=session_id,
        generation_type=generation_type, favorites_only=favorites_only,
        skip=(page - 1) * page_size, limit=page_size,
    )
    return JSONResponse({
        "success": True,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": page * page_size < total,
        "results": [_serialize(d) for d in docs],
    })


# ── Detail (reopen / before-after comparison) ──────────────────────────────────

@router.get("/history/{generation_id}")
async def get_history_item(
    generation_id: str,
    session_id: Optional[str] = Query(None),
    user_id: Optional[str] = Depends(get_optional_user_id),
):
    doc = await _get_owned_or_404(generation_id, user_id, session_id)
    return JSONResponse({"success": True, "result": _serialize(doc)})


# ── Favorite ────────────────────────────────────────────────────────────────────

class FavoriteRequest(BaseModel):
    is_favorite: bool = True


@router.patch("/history/{generation_id}/favorite")
async def update_favorite(
    generation_id: str,
    payload: FavoriteRequest,
    session_id: Optional[str] = Query(None),
    user_id: Optional[str] = Depends(get_optional_user_id),
):
    await _get_owned_or_404(generation_id, user_id, session_id)
    ok = await set_favorite(generation_id, payload.is_favorite)
    return JSONResponse({"success": ok, "is_favorite": payload.is_favorite})


# ── Delete ──────────────────────────────────────────────────────────────────────

@router.delete("/history/{generation_id}")
async def remove_history_item(
    generation_id: str,
    session_id: Optional[str] = Query(None),
    user_id: Optional[str] = Depends(get_optional_user_id),
):
    await _get_owned_or_404(generation_id, user_id, session_id)
    ok = await delete_generation(generation_id)
    return JSONResponse({"success": ok})


# ── Regenerate from previous settings ───────────────────────────────────────────

class RegenerateRequest(BaseModel):
    """All fields optional — anything not provided is reused from the
    original record. ai_assisted defaults to off for regeneration unless
    explicitly requested, since the point is usually to reproduce/tweak
    a specific past result rather than let the ANN pick again."""
    room_type:   Optional[str]   = None
    style:       Optional[str]   = None
    density:     Optional[str]   = None
    strength:    Optional[float] = None     # redesign only
    lighting:    Optional[str]   = None      # empty_room only
    num_images:  Optional[int]   = None
    ai_assisted: bool = False
    session_id:  Optional[str]   = Field(None, description="Required for anonymous callers")


@router.post("/history/{generation_id}/regenerate")
async def regenerate_history_item(
    generation_id: str,
    payload: RegenerateRequest,
    user_id: Optional[str] = Depends(get_optional_user_id),
):
    original = await _get_owned_or_404(generation_id, user_id, payload.session_id)

    room_type  = payload.room_type  or original["room_type"]
    style      = payload.style      or original["style"]
    density    = payload.density    or original["density"]
    num_images = payload.num_images or len(original.get("seeds") or [1])
    session_id = payload.session_id or original["session_id"]

    if original["generation_type"] == "redesign":
        if not original.get("input_image_url"):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Original source image is unavailable for this record — cannot regenerate a redesign without it.",
            )
        try:
            image_bytes = url_to_path(original["input_image_url"]).read_bytes()
        except FileNotFoundError:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "The original source image file no longer exists on disk.",
            )

        result = await run_redesign_pipeline(
            image_bytes=image_bytes,
            input_image_url=original["input_image_url"],
            room_type=room_type, style=style, density=density,
            num_images=num_images,
            strength=payload.strength if payload.strength is not None else (original.get("strength") or 0.6),
            ai_assisted=payload.ai_assisted, session_id=session_id,
            user_id=user_id, parent_generation_id=generation_id,
        )
    else:  # empty_room
        result = await run_empty_room_pipeline(
            room_type=room_type, style=style, density=density,
            lighting=payload.lighting or original.get("lighting") or "natural",
            num_images=num_images, ai_assisted=payload.ai_assisted,
            session_id=session_id, user_id=user_id, parent_generation_id=generation_id,
        )

    return JSONResponse(result)
