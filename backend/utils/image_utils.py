"""
utils/image_utils.py
Shared image helpers: base64 encoding/decoding,
file saving, resizing, and format validation.
"""

import base64
import io
import os
import uuid
from pathlib import Path
from PIL import Image

UPLOADS_DIR = Path(__file__).parent.parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
TARGET_SIZE = (512, 512)


# ── Encoding ──────────────────────────────────────────────────────────────────
def pil_to_b64(image: Image.Image, fmt: str = "PNG") -> str:
    """Convert PIL Image to base64 string."""
    buf = io.BytesIO()
    image.save(buf, format=fmt)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def b64_to_pil(b64_str: str) -> Image.Image:
    """Convert base64 string to PIL Image."""
    data = base64.b64decode(b64_str)
    return Image.open(io.BytesIO(data))


def bytes_to_pil(raw: bytes) -> Image.Image:
    """Convert raw bytes to PIL Image."""
    return Image.open(io.BytesIO(raw))


# ── Resizing ──────────────────────────────────────────────────────────────────
def resize_for_model(image: Image.Image, size: tuple = TARGET_SIZE) -> Image.Image:
    """Resize image to target size, converting to RGB."""
    return image.convert("RGB").resize(size, Image.LANCZOS)


def resize_preserve_aspect(
    image: Image.Image, max_side: int = 1024
) -> Image.Image:
    """Resize image preserving aspect ratio, capping longest side."""
    w, h = image.size
    if max(w, h) <= max_side:
        return image
    scale = max_side / max(w, h)
    new_w, new_h = int(w * scale), int(h * scale)
    return image.resize((new_w, new_h), Image.LANCZOS)


# ── File saving ───────────────────────────────────────────────────────────────
def save_upload(raw: bytes, original_filename: str) -> str:
    """
    Save raw uploaded bytes to /uploads with a unique filename.
    Returns the saved file path (string).
    """
    ext = Path(original_filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {ext}")
    if len(raw) > MAX_SIZE_BYTES:
        raise ValueError(f"File too large: {len(raw) / 1e6:.1f}MB (max 10MB)")

    unique_name = f"{uuid.uuid4().hex}{ext}"
    save_path = UPLOADS_DIR / unique_name
    save_path.write_bytes(raw)
    return str(save_path)


def save_output(image: Image.Image, prefix: str = "output") -> str:
    """
    Save generated output image to /uploads/outputs/.
    Returns relative path string.
    """
    output_dir = UPLOADS_DIR / "outputs"
    output_dir.mkdir(exist_ok=True)
    filename = f"{prefix}_{uuid.uuid4().hex[:8]}.png"
    path = output_dir / filename
    image.save(path, format="PNG")
    return str(path)


def path_to_url(path: str) -> str:
    """
    Convert an absolute path under UPLOADS_DIR (as returned by save_upload/
    save_output) into a URL servable via the app's `/uploads` static mount
    (see app.py: app.mount("/uploads", StaticFiles(directory=UPLOADS))).

    Used when persisting generation records — Generations.input_image_url
    / output_image_urls store URLs, not raw base64, to keep documents
    small as history grows.
    """
    try:
        rel = Path(path).relative_to(UPLOADS_DIR)
        return f"/uploads/{rel.as_posix()}"
    except ValueError:
        # Already a relative/URL-shaped string, or outside UPLOADS_DIR —
        # return as-is rather than raising, since this is a display
        # convenience, not a security boundary.
        return path


def url_to_path(url: str) -> Path:
    """
    Reverse of path_to_url() — resolves a "/uploads/..." URL (as stored in
    a Generation record) back to the local file path. Used by
    /history/{id}/regenerate to re-read a past redesign's source image.
    Raises FileNotFoundError if the URL doesn't point at an existing file
    under UPLOADS_DIR (also guards against path traversal).
    """
    if not url.startswith("/uploads/"):
        raise FileNotFoundError(f"Not an uploads URL: {url}")
    rel = url[len("/uploads/"):]
    resolved = (UPLOADS_DIR / rel).resolve()
    if UPLOADS_DIR.resolve() not in resolved.parents and resolved != UPLOADS_DIR.resolve():
        raise FileNotFoundError("Resolved path escapes uploads directory")
    if not resolved.is_file():
        raise FileNotFoundError(f"Source file no longer exists: {url}")
    return resolved


# ── Validation ────────────────────────────────────────────────────────────────
def validate_image_bytes(raw: bytes, filename: str) -> None:
    """Raise ValueError if image is invalid, wrong type, or too large."""
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type '{ext}'. "
            f"Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    if len(raw) > MAX_SIZE_BYTES:
        raise ValueError(
            f"File size {len(raw) / 1e6:.1f}MB exceeds 10MB limit."
        )
    # Try opening with Pillow to catch corrupt files
    try:
        Image.open(io.BytesIO(raw)).verify()
    except Exception:
        raise ValueError("Uploaded file is not a valid image.")
