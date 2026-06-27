"""
models/segmentation.py
Semantic segmentation using SegFormer (ADE20K).
Detects room elements and furniture from input images.
"""

import numpy as np
import torch
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForSemanticSegmentation

# ── ADE20K label maps ─────────────────────────────────────────────────────────
ADE20K_LABELS = {
    0: "wall", 1: "building", 2: "sky", 3: "floor", 4: "tree",
    5: "ceiling", 6: "road", 7: "bed", 8: "windowpane", 9: "grass",
    10: "cabinet", 11: "sidewalk", 12: "person", 13: "earth",
    14: "door", 15: "table", 16: "mountain", 17: "plant", 18: "curtain",
    19: "chair", 20: "car", 21: "water", 22: "painting", 23: "sofa",
    24: "shelf", 25: "house", 26: "sea", 27: "mirror", 28: "rug",
    29: "field", 30: "armchair", 31: "seat", 32: "fence", 33: "desk",
    34: "rock", 35: "wardrobe", 36: "lamp", 37: "bathtub", 38: "railing",
    39: "cushion", 40: "base", 41: "box", 42: "column", 43: "signboard",
    44: "chest", 45: "counter", 46: "sand", 47: "sink", 48: "skyscraper",
    49: "fireplace", 50: "refrigerator", 53: "stairs", 57: "pillow",
    62: "bookcase", 64: "coffee table", 65: "toilet", 66: "flower",
    69: "bench", 70: "countertop", 71: "stove", 74: "computer",
    75: "swivel chair", 82: "light", 85: "chandelier", 89: "television",
    97: "ottoman", 99: "buffet", 110: "stool", 135: "vase", 148: "clock",
}

FURNITURE_LABELS = {
    7: "bed", 10: "cabinet", 15: "table", 19: "chair", 23: "sofa",
    24: "shelf", 30: "armchair", 31: "seat", 33: "desk", 35: "wardrobe",
    36: "lamp", 39: "cushion", 44: "chest", 57: "pillow", 62: "bookcase",
    64: "coffee table", 69: "bench", 75: "swivel chair", 85: "chandelier",
    89: "television", 97: "ottoman", 99: "buffet", 110: "stool",
}

MODEL_ID = "nvidia/segformer-b2-finetuned-ade-512-512"

# ── Singleton loader ──────────────────────────────────────────────────────────
_processor = None
_model = None


def load_segmentation_model():
    global _processor, _model
    if _model is None:
        print("[Segmentation] Loading SegFormer model...")
        _processor = AutoImageProcessor.from_pretrained(MODEL_ID)
        _model = AutoModelForSemanticSegmentation.from_pretrained(MODEL_ID)
        _model.eval()
        if torch.cuda.is_available():
            _model = _model.cuda()
        print("[Segmentation] Model loaded.")
    return _processor, _model


# ── Main function ─────────────────────────────────────────────────────────────
def run_segmentation(image: Image.Image) -> tuple[Image.Image, list[str]]:
    """
    Args:
        image: PIL Image (any size, will be processed at 512x512)
    Returns:
        mask_image: Colorized segmentation mask as PIL Image
        furniture_found: List of detected furniture labels
    """
    processor, model = load_segmentation_model()
    img_rgb = image.convert("RGB")

    inputs = processor(images=img_rgb, return_tensors="pt")
    if torch.cuda.is_available():
        inputs = {k: v.cuda() for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)

    logits = outputs.logits
    upsampled = torch.nn.functional.interpolate(
        logits,
        size=img_rgb.size[::-1],
        mode="bilinear",
        align_corners=False,
    )
    seg_map = upsampled.argmax(dim=1).squeeze().cpu().numpy()

    # Colorize mask with fixed palette
    np.random.seed(42)
    palette = np.random.randint(0, 255, (150, 3), dtype=np.uint8)
    colored = palette[seg_map % 150]
    mask_image = Image.fromarray(colored.astype(np.uint8))

    # Detect furniture present in the image
    unique_ids = np.unique(seg_map)
    furniture_found = [
        FURNITURE_LABELS[i] for i in unique_ids if i in FURNITURE_LABELS
    ]

    return mask_image, furniture_found
