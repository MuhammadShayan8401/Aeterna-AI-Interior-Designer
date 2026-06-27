"""
models/prompts.py
Dynamic prompt builder for interior design generation.
Combines room type, style, density, and detected furniture
into rich positive + negative prompts for Stable Diffusion.
"""

# ── Style modifiers ───────────────────────────────────────────────────────────
STYLE_MODIFIERS = {
    "modern":            "sleek modern, clean lines, contemporary",
    "minimalist":        "minimalist, uncluttered, Zen, negative space",
    "scandinavian":      "Scandinavian, hygge, light wood, neutral tones",
    "industrial":        "industrial loft, exposed brick, metal accents",
    "bohemian":          "bohemian eclectic, warm textures, layered rugs",
    "mid-century modern": "mid-century modern, organic shapes, teak wood",
    "traditional":       "traditional classic, rich wood tones, ornate details",
    "japandi":           "Japandi, wabi-sabi, natural materials, serene",
    "coastal":           "coastal beach house, light airy, natural linen",
    "art deco":          "art deco, geometric patterns, gold accents, glamorous",
}

# ── Density modifiers ─────────────────────────────────────────────────────────
DENSITY_MODIFIERS = {
    "minimal":  "minimal furniture, open space, breathing room",
    "moderate": "tastefully furnished, balanced layout",
    "dense":    "richly furnished, layered decor, cozy and full",
}

# ── Lighting modifiers (by room type — existing, used by build_prompt) ───────
LIGHTING_MODIFIERS = {
    "bedroom":        "warm soft lighting, bedside lamps",
    "living room":    "natural daylight, ambient lighting",
    "kitchen":        "bright task lighting, under-cabinet lights",
    "bathroom":       "clean white lighting, spa-like",
    "dining room":    "warm pendant lighting over table",
    "home office":    "cool daylight, desk lamp",
    "nursery":        "soft warm lighting, gentle atmosphere",
    "studio apartment": "multifunctional lighting, warm and bright",
}

# ── Lighting CONDITIONS (NEW — user-selectable, empty room generation only) ──
# Distinct from LIGHTING_MODIFIERS above, which is auto-picked by room type
# for the existing redesign flow. Empty Room Generation lets the user pick
# the lighting mood explicitly since there's no photo to infer it from.
LIGHTING_CONDITIONS = {
    "natural":     "bright natural daylight, soft window light, airy",
    "warm":        "warm golden ambient lighting, cozy glow, soft shadows",
    "bright":      "bright even lighting, crisp and clean, well-lit",
    "evening":     "warm evening lighting, lamps glowing, intimate atmosphere",
    "golden hour": "golden hour sunlight, long warm shadows, cinematic glow",
    "overcast":    "soft diffused overcast daylight, even and gentle",
}

# ── Negative prompt (shared across all styles) ────────────────────────────────
BASE_NEGATIVE_PROMPT = (
    "ugly, distorted, blurry, low quality, watermark, text, logo, "
    "deformed, bad anatomy, disfigured, extra limbs, cropped, "
    "worst quality, jpeg artifacts, overexposed, underexposed, "
    "people, person, human, face, hands, cluttered mess"
)


# ── Builder ───────────────────────────────────────────────────────────────────
def build_prompt(
    room_type: str,
    style: str,
    density: str,
    furniture: list[str],
) -> tuple[str, str]:
    """
    Build positive and negative prompts for Stable Diffusion.

    Args:
        room_type:  e.g. "living room"
        style:      e.g. "modern"
        density:    "minimal" | "moderate" | "dense"
        furniture:  list of detected furniture labels from segmentation

    Returns:
        (positive_prompt, negative_prompt)

    Example output:
        "sleek modern, clean lines, contemporary living room interior,
         tastefully furnished, balanced layout, sofa, coffee table, lamp,
         natural daylight, ambient lighting, professional interior design
         photography, realistic lighting, high quality, 8k,
         architectural digest, beautiful composition"
    """
    style_key = style.lower()
    style_mod = STYLE_MODIFIERS.get(style_key, style)

    density_key = density.lower()
    density_mod = DENSITY_MODIFIERS.get(density_key, "tastefully furnished")

    lighting = LIGHTING_MODIFIERS.get(room_type.lower(), "beautiful natural lighting")

    # Use up to 4 detected furniture items
    furniture_str = (
        ", ".join(furniture[:4]) if furniture else "carefully selected furniture"
    )

    positive_prompt = (
        f"{style_mod} {room_type} interior, "
        f"{density_mod}, {furniture_str}, "
        f"{lighting}, "
        f"professional interior design photography, realistic lighting, "
        f"high quality, 8k, architectural digest, beautiful composition, "
        f"photorealistic"
    )

    return positive_prompt, BASE_NEGATIVE_PROMPT


def describe_prompt(
    room_type: str,
    style: str,
    density: str,
    furniture: list[str],
) -> str:
    """
    Returns a human-readable one-liner describing the generation settings.
    Used in the Streamlit UI.
    """
    furniture_str = ", ".join(furniture[:3]) if furniture else "auto-detected furniture"
    return (
        f"{style.title()} {room_type} · {density} furnishing · "
        f"detected: {furniture_str}"
    )


# ── Empty Room Generation — NEW (txt2img, no input photo) ────────────────────

# Empty-room scenes need a stronger negative prompt than redesign: with no
# starting image to anchor structure, txt2img is more prone to drifting
# into warped architecture or surreal room layouts.
EMPTY_ROOM_NEGATIVE_PROMPT = (
    BASE_NEGATIVE_PROMPT + ", "
    "warped walls, impossible architecture, floating furniture, "
    "multiple rooms, collage, duplicate, asymmetric room, "
    "low resolution, oversaturated"
)


def build_empty_room_prompt(
    room_type: str,
    style: str,
    density: str,
    lighting: str,
) -> tuple[str, str]:
    """
    Build positive and negative prompts for Empty Room Generation (txt2img).

    Unlike build_prompt() (img2img redesign), there's no detected furniture
    list to draw from — the scene is generated entirely from these four
    selections — and lighting is an explicit user choice rather than one
    inferred from room type.

    Args:
        room_type:  e.g. "bedroom", "kitchen", "office", "living room"
        style:      e.g. "modern"
        density:    "minimal" | "moderate" | "dense"
        lighting:   one of LIGHTING_CONDITIONS, e.g. "warm", "natural"

    Returns:
        (positive_prompt, negative_prompt)
    """
    style_mod    = STYLE_MODIFIERS.get(style.lower(), style)
    density_mod  = DENSITY_MODIFIERS.get(density.lower(), "tastefully furnished")
    lighting_mod = LIGHTING_CONDITIONS.get(lighting.lower(), "natural balanced lighting")

    positive_prompt = (
        f"empty {room_type} interior design concept, no people, "
        f"{style_mod}, {density_mod}, {lighting_mod}, "
        f"professional interior design photography, wide angle, "
        f"realistic proportions, high quality, 8k, architectural digest, "
        f"beautiful composition, photorealistic"
    )

    return positive_prompt, EMPTY_ROOM_NEGATIVE_PROMPT


def describe_empty_room_prompt(room_type: str, style: str, density: str, lighting: str) -> str:
    """Human-readable one-liner for Empty Room Generation results."""
    return (
        f"{style.title()} {room_type} · {density} furnishing · {lighting} lighting"
    )
