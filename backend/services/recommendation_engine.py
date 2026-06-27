"""
services/recommendation_engine.py
====================================
Recommendation engine that translates ANN predictions into
concrete sidebar defaults and Stable Diffusion prompt boosts.
Also computes per-generation preference scores to rank images.

Used by:
    POST /generate        → inject AI-boosted prompts
    GET  /feedback/recommend → return recommended sidebar values
    POST /feedback/rank   → rank generated images by predicted preference
"""

from __future__ import annotations
from dataclasses import dataclass, field

from models.ann.preference_model import run_ann_inference, ANNRecommendation

# ── Style → Stable Diffusion prompt boost mapping ────────────────────────────
STYLE_PROMPT_BOOSTS: dict[str, str] = {
    "modern":            "sleek contemporary, architectural digest, minimalist accents",
    "minimalist":        "negative space, pristine surfaces, zen atmosphere, simple palette",
    "scandinavian":      "hygge warm, natural oak, white walls, soft textiles",
    "industrial":        "exposed concrete, Edison bulbs, raw steel, warehouse aesthetic",
    "bohemian":          "warm terracotta, rattan furniture, trailing plants, layered rugs",
    "mid-century modern": "teak sideboard, low profile, tapered legs, walnut wood",
    "traditional":       "crown molding, deep wood tones, antique brass, formal symmetry",
    "japandi":           "wabi-sabi, muted earth tones, bamboo, paper screens",
    "coastal":           "whitewashed wood, sea glass accents, linen drapes, airy",
    "art deco":          "chevron marble, gold inlay, velvet upholstery, glamorous geometry",
}

DENSITY_PROMPT_BOOSTS: dict[str, str] = {
    "minimal":  "breathing room, open floor plan, curated essentials",
    "moderate": "balanced furnishing, functional layout, harmonious proportions",
    "dense":    "layered textures, curated abundance, cozy maximalism",
}


@dataclass
class GenerationRecommendation:
    """Concrete settings and prompt boosts for Stable Diffusion."""
    style:         str
    density:       str
    strength:      float
    prompt_boost:  str
    negative_boost: str
    confidence:    float
    affinities:    dict[str, float] = field(default_factory=dict)


def get_generation_recommendation(context: dict) -> GenerationRecommendation:
    """
    Given session context (room_type, style, strength, history…),
    return ANN-optimised generation parameters.
    """
    rec: ANNRecommendation = run_ann_inference(context)

    style   = rec.recommended_style
    density = rec.recommended_density

    style_boost   = STYLE_PROMPT_BOOSTS.get(style, "")
    density_boost = DENSITY_PROMPT_BOOSTS.get(density, "")
    prompt_boost  = f"{style_boost}, {density_boost}".strip(", ")

    # Add quality boost if aesthetic score is high
    neg_boost = ""
    if rec.aesthetic_score < 0.4:
        neg_boost = "bland, generic, low quality, uninspired"

    return GenerationRecommendation(
        style          = style,
        density        = density,
        strength       = rec.suggested_strength,
        prompt_boost   = prompt_boost,
        negative_boost = neg_boost,
        confidence     = rec.confidence,
        affinities     = rec.style_affinities,
    )


def compute_preference_scores(
    seeds: list[int],
    style: str,
    density: str,
    strength: float,
    room_type: str,
    like_ratio: float = 0.5,
) -> list[dict]:
    """
    Score each generated image variant by predicted preference.
    Used by POST /feedback/rank to reorder images.

    Returns list of {seed, index, score} sorted by score desc.
    """
    scores = []
    for i, seed in enumerate(seeds):
        context = {
            "style":      style,
            "density":    density,
            "strength":   strength,
            "room_type":  room_type,
            "like_ratio": like_ratio,
            # Vary aesthetic_score slightly by seed to differentiate images
            "aesthetic_score": 0.5 + (seed % 100) / 500,
        }
        rec = run_ann_inference(context)
        score = 0.5 * rec.satisfaction_prob + 0.3 * rec.aesthetic_score + 0.2 * rec.confidence
        scores.append({"seed": seed, "index": i, "score": round(score, 4)})

    scores.sort(key=lambda x: x["score"], reverse=True)
    return scores
