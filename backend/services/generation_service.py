"""
services/generation_service.py
================================
Centralizes the two generation pipelines (redesign img2img, empty-room
txt2img) so routes/generate.py, routes/empty_room.py, and the new
/history/{id}/regenerate endpoint all call the same code instead of
duplicating pipeline logic three times.

Both functions:
  - return the same response shape the original routes already returned
    (so routes/generate.py and routes/empty_room.py's external API
    contract is unchanged — existing frontend code keeps working)
  - additionally persist a Generation record (best-effort — see
    database/persistence.py) and save output images to disk under
    /uploads/outputs so History can display and revisit them later
    without bloating MongoDB documents with base64 data.
"""

import time
import traceback
from typing import Optional

from PIL import Image

from models.segmentation import run_segmentation
from models.depth import run_depth
from models.diffusion import run_diffusion_batch, run_txt2img_batch
from models.prompts import (
    build_prompt, describe_prompt,
    build_empty_room_prompt, describe_empty_room_prompt, LIGHTING_CONDITIONS,
)
from models.ann.preference_model import run_ann_inference
from services.recommendation_engine import get_generation_recommendation, compute_preference_scores
from utils.image_utils import (
    bytes_to_pil, resize_for_model, pil_to_b64, save_output, path_to_url,
)
from database.persistence import save_generation

# ANN feature vector expects a "strength" input even for txt2img, which has
# no transformation-strength concept of its own — see routes/empty_room.py.
_NEUTRAL_STRENGTH = 0.6


# ════════════════════════════════════════════════════════════════════════════
# REDESIGN (img2img) — used by POST /generate and history regenerate
# ════════════════════════════════════════════════════════════════════════════

async def run_redesign_pipeline(
    *,
    image_bytes: bytes,
    input_image_url: Optional[str],   # already-saved URL, e.g. from save_upload + path_to_url
    room_type: str,
    style: str,
    density: str,
    num_images: int,
    strength: float,
    ai_assisted: bool,
    session_id: str,
    like_ratio: float = 0.5,
    user_id: Optional[str] = None,
    parent_generation_id: Optional[str] = None,
) -> dict:
    t_start = time.time()

    pil_img     = bytes_to_pil(image_bytes)
    pil_resized = resize_for_model(pil_img)

    mask_img, furniture = run_segmentation(pil_resized)
    depth_img = run_depth(pil_resized)

    context = {
        "room_type": room_type, "style": style, "density": density,
        "strength": strength, "like_ratio": like_ratio, "num_images": num_images,
        "aesthetic_score": 0.5, "realism_score": 0.5,
        "used_ai_recommendation": ai_assisted,
    }
    ann_rec = run_ann_inference(context)
    gen_rec = get_generation_recommendation(context)

    eff_style    = gen_rec.style    if ai_assisted else style
    eff_density  = gen_rec.density  if ai_assisted else density
    eff_strength = gen_rec.strength if ai_assisted else max(0.3, min(0.9, strength))

    prompt, negative_prompt = build_prompt(room_type, eff_style, eff_density, furniture)
    if ai_assisted and gen_rec.prompt_boost:
        prompt = f"{prompt}, {gen_rec.prompt_boost}"
    if ai_assisted and gen_rec.negative_boost:
        negative_prompt = f"{negative_prompt}, {gen_rec.negative_boost}"

    description = describe_prompt(room_type, eff_style, eff_density, furniture)

    num_images = max(1, min(4, num_images))
    gen_images, seeds = run_diffusion_batch(
        pil_resized, prompt, negative_prompt, strength=eff_strength, num_images=num_images,
    )
    generation_time = round(time.time() - t_start, 2)

    ranked = compute_preference_scores(
        seeds=seeds, style=eff_style, density=eff_density,
        strength=eff_strength, room_type=room_type, like_ratio=like_ratio,
    )
    order       = [r["index"] for r in ranked]
    gen_images  = [gen_images[i] for i in order]
    seeds       = [seeds[i]      for i in order]
    pref_scores = [ranked[i]["score"] for i in range(len(ranked))]

    b64_images  = [pil_to_b64(img) for img in gen_images]
    saved_urls  = [path_to_url(save_output(img, prefix="redesign")) for img in gen_images]

    generation_id = await save_generation(
        session_id=session_id, generation_type="redesign",
        room_type=room_type, style=eff_style, density=eff_density,
        strength=eff_strength, prompt=prompt, negative_prompt=negative_prompt,
        input_image_url=input_image_url, output_image_urls=saved_urls, seeds=seeds,
        preference_scores=pref_scores, furniture_detected=furniture,
        ann_recommendation_used=ai_assisted, generation_time=generation_time,
        user_id=user_id, parent_generation_id=parent_generation_id,
    )

    return {
        "success": True,
        "generation_type": "redesign",
        "generation_id": generation_id,
        "description": description,
        "prompt": prompt,
        "negative_prompt": negative_prompt,
        "furniture_detected": furniture,
        "segmentation_mask": pil_to_b64(mask_img),
        "depth_map": pil_to_b64(depth_img),
        "generated_images": b64_images,
        "output_image_urls": saved_urls,
        "seeds": seeds,
        "preference_scores": pref_scores,
        "generation_time": generation_time,
        "settings": {
            "room_type": room_type, "style": eff_style, "density": eff_density,
            "strength": eff_strength, "num_images": num_images, "ai_assisted": ai_assisted,
            "user_style": style, "user_density": density, "user_strength": strength,
        },
        "ann_recommendation": {
            "recommended_style": ann_rec.recommended_style,
            "recommended_density": ann_rec.recommended_density,
            "suggested_strength": ann_rec.suggested_strength,
            "satisfaction_prob": ann_rec.satisfaction_prob,
            "aesthetic_score": ann_rec.aesthetic_score,
            "confidence": ann_rec.confidence,
            "style_affinities": ann_rec.style_affinities,
            "density_affinities": ann_rec.density_affinities,
            "prompt_boost": gen_rec.prompt_boost,
        },
    }


# ════════════════════════════════════════════════════════════════════════════
# EMPTY ROOM (txt2img) — used by POST /generate/empty-room and history regenerate
# ════════════════════════════════════════════════════════════════════════════

async def run_empty_room_pipeline(
    *,
    room_type: str,
    style: str,
    density: str,
    lighting: str,
    num_images: int,
    ai_assisted: bool,
    session_id: str,
    like_ratio: float = 0.5,
    user_id: Optional[str] = None,
    parent_generation_id: Optional[str] = None,
    # Extra fields from the guided wizard
    extra_prompt: Optional[str] = None,
    strength: float = _NEUTRAL_STRENGTH,
    color_preference: str = "neutral",
    budget: str = "mid-range",
) -> dict:
    if lighting.lower() not in LIGHTING_CONDITIONS:
        raise ValueError(
            f"Unknown lighting condition '{lighting}'. "
            f"Choose from: {', '.join(LIGHTING_CONDITIONS)}"
        )

    t_start = time.time()

    context = {
        "room_type": room_type, "style": style, "density": density,
        "strength": _NEUTRAL_STRENGTH, "like_ratio": like_ratio, "num_images": num_images,
        "aesthetic_score": 0.5, "realism_score": 0.5,
        "used_ai_recommendation": ai_assisted,
    }
    ann_rec = run_ann_inference(context)
    gen_rec = get_generation_recommendation(context)

    eff_style   = gen_rec.style   if ai_assisted else style
    eff_density = gen_rec.density if ai_assisted else density

    prompt, negative_prompt = build_empty_room_prompt(room_type, eff_style, eff_density, lighting)
    if ai_assisted and gen_rec.prompt_boost:
        prompt = f"{prompt}, {gen_rec.prompt_boost}"
    if ai_assisted and gen_rec.negative_boost:
        negative_prompt = f"{negative_prompt}, {gen_rec.negative_boost}"
    # Append user-provided prompt enrichment from the wizard
    if extra_prompt:
        prompt = f"{prompt}, {extra_prompt}"
    # Append color preference and budget hints when not neutral/mid-range
    if color_preference and color_preference.lower() not in ("neutral", ""):
        prompt = f"{prompt}, {color_preference} color palette"
    if budget and budget.lower() in ("premium", "luxury"):
        prompt = f"{prompt}, high-end materials, luxury finishes"

    description = describe_empty_room_prompt(room_type, eff_style, eff_density, lighting)

    num_images = max(1, min(4, num_images))
    gen_images, seeds = run_txt2img_batch(prompt, negative_prompt, num_images=num_images)
    generation_time = round(time.time() - t_start, 2)

    ranked = compute_preference_scores(
        seeds=seeds, style=eff_style, density=eff_density,
        strength=_NEUTRAL_STRENGTH, room_type=room_type, like_ratio=like_ratio,
    )
    order       = [r["index"] for r in ranked]
    gen_images  = [gen_images[i] for i in order]
    seeds       = [seeds[i]      for i in order]
    pref_scores = [ranked[i]["score"] for i in range(len(ranked))]

    b64_images = [pil_to_b64(img) for img in gen_images]
    saved_urls = [path_to_url(save_output(img, prefix="empty_room")) for img in gen_images]

    generation_id = await save_generation(
        session_id=session_id, generation_type="empty_room",
        room_type=room_type, style=eff_style, density=eff_density, lighting=lighting,
        prompt=prompt, negative_prompt=negative_prompt,
        output_image_urls=saved_urls, seeds=seeds, preference_scores=pref_scores,
        ann_recommendation_used=ai_assisted, generation_time=generation_time,
        user_id=user_id, parent_generation_id=parent_generation_id,
    )

    return {
        "success": True,
        "generation_type": "empty_room",
        "generation_id": generation_id,
        "description": description,
        "prompt": prompt,
        "negative_prompt": negative_prompt,
        "generated_images": b64_images,
        "output_image_urls": saved_urls,
        "seeds": seeds,
        "preference_scores": pref_scores,
        "generation_time": generation_time,
        "settings": {
            "room_type": room_type, "style": eff_style, "density": eff_density,
            "lighting": lighting, "num_images": num_images, "ai_assisted": ai_assisted,
            "user_style": style, "user_density": density,
        },
        "ann_recommendation": {
            "recommended_style": ann_rec.recommended_style,
            "recommended_density": ann_rec.recommended_density,
            "satisfaction_prob": ann_rec.satisfaction_prob,
            "aesthetic_score": ann_rec.aesthetic_score,
            "confidence": ann_rec.confidence,
            "style_affinities": ann_rec.style_affinities,
            "density_affinities": ann_rec.density_affinities,
            "prompt_boost": gen_rec.prompt_boost,
        },
    }
