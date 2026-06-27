"""
routes/empty_room.py — POST /generate/empty-room
Generates a full interior from text description using SD txt2img.
No input photograph required.
Now accepts: prompt, strength, color_preference, budget (ignored gracefully if unsupported).
"""
import traceback
from fastapi import APIRouter, Depends, Form
from fastapi.responses import JSONResponse

from core.deps import get_optional_user_id
from services.generation_service import run_empty_room_pipeline

router = APIRouter()


@router.post("/generate/empty-room")
async def generate_empty_room(
    room_type:        str   = Form("living room"),
    style:            str   = Form("modern"),
    density:          str   = Form("moderate"),
    lighting:         str   = Form("natural"),
    num_images:       int   = Form(3),
    ai_assisted:      bool  = Form(False),
    session_id:       str   = Form(""),
    like_ratio:       float = Form(0.5),
    # Extra fields from the guided wizard (used to enrich the auto-prompt)
    prompt:           str   = Form(""),
    strength:         float = Form(0.6),
    color_preference: str   = Form("neutral"),
    budget:           str   = Form("mid-range"),
    user_id: str | None = Depends(get_optional_user_id),
):
    try:
        result = await run_empty_room_pipeline(
            room_type=room_type, style=style, density=density, lighting=lighting,
            num_images=num_images, ai_assisted=ai_assisted,
            session_id=session_id, like_ratio=like_ratio, user_id=user_id,
            # Pass enrichment fields through as extra_prompt_context
            extra_prompt=prompt.strip() or None,
            strength=strength,
            color_preference=color_preference,
            budget=budget,
        )
        return JSONResponse(result)

    except ValueError as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=400)
    except Exception as e:
        return JSONResponse({
            "success": False, "error": str(e),
            "trace": traceback.format_exc(),
        }, status_code=500)
