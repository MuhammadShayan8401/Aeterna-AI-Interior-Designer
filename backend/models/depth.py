"""
models/depth.py
Monocular depth estimation using MiDaS (small variant).
Produces a grayscale depth map from any room image.
"""

import numpy as np
import cv2
import torch
from PIL import Image

# ── Singleton loader ──────────────────────────────────────────────────────────
_midas = None
_transform = None


def load_depth_model():
    global _midas, _transform
    if _midas is None:
        print("[Depth] Loading MiDaS model...")
        _midas = torch.hub.load(
            "intel-isl/MiDaS", "MiDaS_small", trust_repo=True
        )
        _midas.eval()
        if torch.cuda.is_available():
            _midas = _midas.cuda()
        transforms = torch.hub.load(
            "intel-isl/MiDaS", "transforms", trust_repo=True
        )
        _transform = transforms.small_transform
        print("[Depth] Model loaded.")
    return _midas, _transform


# ── Main function ─────────────────────────────────────────────────────────────
def run_depth(image: Image.Image) -> Image.Image:
    """
    Args:
        image: PIL Image (RGB)
    Returns:
        depth_image: Grayscale depth map as PIL Image (normalized 0–255)
    """
    midas, transform = load_depth_model()

    img_np = np.array(image.convert("RGB"))
    input_batch = transform(img_np)

    if torch.cuda.is_available():
        input_batch = input_batch.cuda()

    with torch.no_grad():
        depth = midas(input_batch)
        depth = torch.nn.functional.interpolate(
            depth.unsqueeze(1),
            size=img_np.shape[:2],
            mode="bicubic",
            align_corners=False,
        ).squeeze()

    depth_np = depth.cpu().numpy()
    depth_norm = cv2.normalize(
        depth_np, None, 0, 255, cv2.NORM_MINMAX, dtype=cv2.CV_8U
    )
    return Image.fromarray(depth_norm)
