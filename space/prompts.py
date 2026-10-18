"""Prompt building for Aeterna. One place for every option the UI offers."""

ROOM_TYPES = [
    "living room", "bedroom", "kitchen", "bathroom",
    "dining room", "home office", "nursery", "studio apartment",
]

STYLES = {
    "modern":       "sleek modern interior, clean lines, neutral palette, glass and brushed steel accents",
    "contemporary": "contemporary interior, curved forms, textural contrast, warm neutrals with a dark anchor",
    "minimalist":   "minimalist interior, uncluttered, negative space, only essential furniture, calm",
    "scandinavian": "Scandinavian interior, hygge, light oak wood, white walls, linen textiles, soft daylight",
    "japandi":      "Japandi interior, wabi-sabi, low-profile furniture, natural materials, muted earth tones",
    "industrial":   "industrial loft interior, exposed brick, raw concrete, black metal accents, reclaimed wood",
    "luxury":       "luxury interior, marble surfaces, walnut wood, velvet upholstery, brass details, statement lighting",
}

DENSITY = {
    "minimal":  "minimal furniture, open space, breathing room",
    "balanced": "tastefully furnished, balanced layout, a few decorative accents",
    "full":     "richly furnished, layered decor, plants and art, cozy and full",
}

LIGHTING = {
    "natural":     "bright natural daylight, soft window light, airy",
    "warm":        "warm golden ambient lighting, cozy glow, soft shadows",
    "bright":      "bright even lighting, crisp and clean, well-lit",
    "evening":     "warm evening lighting, lamps glowing, intimate atmosphere",
    "golden hour": "golden hour sunlight, long warm shadows, cinematic glow",
    "overcast":    "soft diffused overcast daylight, even and gentle",
}

PALETTES = {
    "neutral": "",
    "warm":    "warm terracotta and cream color palette",
    "cool":    "cool blue and grey color palette",
    "earth":   "earthy olive, sand and brown color palette",
    "mono":    "monochrome black, white and grey color palette",
    "forest":  "deep forest green color palette with natural wood",
}

# How strongly a photo is transformed (img2img strength).
CHANGE_LEVEL = {"subtle": 0.45, "balanced": 0.62, "bold": 0.78}

QUALITY = (
    "professional interior design photography, realistic proportions, "
    "photorealistic, high detail, architectural digest"
)

NEGATIVE = (
    "ugly, distorted, blurry, low quality, watermark, text, logo, deformed, "
    "cropped, jpeg artifacts, people, person, face, hands, cluttered mess, "
    "warped walls, floating furniture, collage, oversaturated"
)


def _pick(table: dict, key: str, default_key: str) -> str:
    return table.get((key or "").lower().strip(), table[default_key])


def build_prompt(
    *,
    mode: str,                  # "photo" | "scratch"
    room_type: str,
    style: str,
    density: str = "balanced",
    lighting: str = "natural",
    palette: str = "neutral",
    extra: str = "",
    furniture: list[str] | None = None,
) -> tuple[str, str]:
    room_type = room_type if room_type in ROOM_TYPES else "living room"
    parts = [f"{room_type}", _pick(STYLES, style, "modern"), _pick(DENSITY, density, "balanced")]
    if mode == "scratch":
        parts.insert(0, "interior design concept")
        parts.append(_pick(LIGHTING, lighting, "natural"))
    elif furniture:
        parts.append(", ".join(furniture[:5]))
    pal = _pick(PALETTES, palette, "neutral")
    if pal:
        parts.append(pal)
    extra = (extra or "").strip()[:200]
    if extra:
        parts.append(extra)
    parts.append(QUALITY)
    return ", ".join(parts), NEGATIVE


def describe(mode, room_type, style, density, furniture=None) -> str:
    base = f"{style.title()} {room_type} · {density} furnishing"
    if mode == "photo" and furniture:
        base += " · kept: " + ", ".join(furniture[:4])
    return base
