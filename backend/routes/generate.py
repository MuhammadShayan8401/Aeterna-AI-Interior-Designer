"""
routes/generate.py  (upgraded — ANN-enhanced generation + persistence)
POST /generate — Full pipeline with ANN recommendation injection.

The pipeline itself now lives in services/generation_service.py
(run_redesign_pipeline) so it can be reused by /history/{id}/regenerate
without duplicating logic. This route's job is just: validate the
upload, save it, resolve the optional current user, and call the
shared pipeline — the JSON response shape is unchanged from before.
"""

import traceback
from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import JSONResponse

from core.deps import get_optional_user_id
from services.generation_service import run_redesign_pipeline
from utils.image_utils import (
    bytes_to_pil, resize_for_model, pil_to_b64,
    validate_image_bytes, save_upload, path_to_url,
)

router = APIRouter()


@router.post("/generate")
async def generate(
    image:      UploadFile = File(...),
    room_type:  str        = Form("living room"),
    style:      str        = Form("modern"),
    density:    str        = Form("moderate"),
    num_images: int        = Form(3),
    strength:   float      = Form(0.6),
    ai_assisted: bool      = Form(False),
    session_id: str        = Form(""),
    like_ratio: float      = Form(0.5),
    user_id:    str | None = Depends(get_optional_user_id),
):
    try:
        # ── Validate, save & load ─────────────────────────────────────────────
        raw = await image.read()
        validate_image_bytes(raw, image.filename or "upload.jpg")
        saved_path      = save_upload(raw, image.filename or "upload.jpg")
        input_image_url = path_to_url(saved_path)

        result = await run_redesign_pipeline(
            image_bytes=raw,
            input_image_url=input_image_url,
            room_type=room_type, style=style, density=density,
            num_images=num_images, strength=strength, ai_assisted=ai_assisted,
            session_id=session_id, like_ratio=like_ratio, user_id=user_id,
        )
        return JSONResponse(result)

    except ValueError as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=400)
    except Exception as e:
        return JSONResponse({
            "success": False, "error": str(e),
            "trace": traceback.format_exc()
        }, status_code=500)
