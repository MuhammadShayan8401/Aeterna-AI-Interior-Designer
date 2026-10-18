"""
Model loading + generation.

Designed for free Hugging Face Spaces (CPU) but uses a GPU automatically when
there is one (paid GPU or ZeroGPU). To keep CPU generation usable the app runs
Stable Diffusion 1.5 with the LCM-LoRA, which needs ~6-8 steps instead of 30.

Set AETERNA_MOCK=1 to skip all models and return placeholder images — handy for
developing the frontend without downloading ~5 GB of weights.
"""
from __future__ import annotations

import os
import random
import time

import numpy as np
from PIL import Image, ImageDraw

MOCK = os.getenv("AETERNA_MOCK") == "1"
SD_MODEL = os.getenv("AETERNA_SD_MODEL", "stable-diffusion-v1-5/stable-diffusion-v1-5")
LCM_LORA = os.getenv("AETERNA_LCM_LORA", "latent-consistency/lcm-lora-sdv1-5")
SEG_MODEL = os.getenv("AETERNA_SEG_MODEL", "nvidia/segformer-b0-finetuned-ade-512-512")
def _default_size() -> int:
    """512 px on GPU, 384 px on CPU (about 1.8x faster there); override with AETERNA_SIZE."""
    if os.getenv("AETERNA_SIZE"):
        return int(os.environ["AETERNA_SIZE"])
    if MOCK:
        return 512
    try:
        import torch
        return 512 if torch.cuda.is_available() else 384
    except Exception:  # pragma: no cover
        return 384


LONG_SIDE = _default_size()
STEPS = int(os.getenv("AETERNA_STEPS", "8"))
GUIDANCE = float(os.getenv("AETERNA_GUIDANCE", "1.5"))
# Optional layout lock: ControlNet (edges) keeps walls, windows and furniture positions while the style changes.
# Off by default. Needs a GPU in practice and ~1.5 GB more weights. Untested on real models in this repo — try it with tools/bench.py.
CONTROLNET = os.getenv("AETERNA_CONTROLNET", "").strip()          # "" (off) or "canny"
CONTROLNET_MODEL = os.getenv("AETERNA_CONTROLNET_MODEL", "lllyasviel/sd-controlnet-canny")
CONTROLNET_SCALE = float(os.getenv("AETERNA_CONTROLNET_SCALE", "0.8"))

# ADE20K classes worth telling the user about (ids differ per checkpoint, so we use names).
FURNITURE = {
    "bed", "cabinet", "table", "chair", "sofa", "shelf", "armchair", "seat", "desk",
    "wardrobe", "lamp", "cushion", "chest of drawers", "pillow", "bookcase",
    "coffee table", "bench", "swivel chair", "chandelier", "television receiver",
    "ottoman", "buffet", "stool", "plant", "curtain", "rug", "painting", "mirror",
    "fireplace", "countertop", "sink",
}
PRETTY = {"television receiver": "television", "chest of drawers": "drawers"}

_state: dict = {}


def _device() -> str:
    import torch
    return "cuda" if torch.cuda.is_available() else "cpu"


def load() -> None:
    """Load everything once at startup."""
    if MOCK or _state.get("ready"):
        return
    import torch
    from diffusers import (AutoPipelineForImage2Image, LCMScheduler,
                           StableDiffusionPipeline)
    from transformers import AutoImageProcessor, AutoModelForSemanticSegmentation

    dev = _device()
    dtype = torch.float16 if dev == "cuda" else torch.float32
    if dev == "cpu":
        torch.set_num_threads(max(1, os.cpu_count() or 2))
    else:
        torch.backends.cuda.matmul.allow_tf32 = True
        torch.backends.cudnn.allow_tf32 = True

    print(f"[aeterna] loading Stable Diffusion on {dev} …")
    txt = StableDiffusionPipeline.from_pretrained(
        SD_MODEL, torch_dtype=dtype, safety_checker=None, requires_safety_checker=False
    )
    txt.scheduler = LCMScheduler.from_config(txt.scheduler.config)
    txt.load_lora_weights(LCM_LORA)
    txt.fuse_lora()
    txt.set_progress_bar_config(disable=True)
    txt = txt.to(dev)
    img = AutoPipelineForImage2Image.from_pipe(txt)   # shares the same weights
    img.set_progress_bar_config(disable=True)
    cn_pipe = None
    if CONTROLNET:
        try:
            from diffusers import ControlNetModel, StableDiffusionControlNetImg2ImgPipeline
            cn = ControlNetModel.from_pretrained(CONTROLNET_MODEL, torch_dtype=dtype)
            cn_pipe = StableDiffusionControlNetImg2ImgPipeline.from_pipe(txt, controlnet=cn).to(dev)
            cn_pipe.set_progress_bar_config(disable=True)
            print("[aeterna] layout lock (ControlNet) enabled")
        except Exception as e:  # noqa: BLE001 — never block startup because of an optional feature
            print("[aeterna] ControlNet unavailable, continuing without it:", e)

    print("[aeterna] loading segmentation …")
    proc = AutoImageProcessor.from_pretrained(SEG_MODEL)
    seg = AutoModelForSemanticSegmentation.from_pretrained(SEG_MODEL).eval()

    _state.update(txt=txt, img=img, cn=cn_pipe, proc=proc, seg=seg, dev=dev, ready=True)
    print("[aeterna] ready.")
    try:                                   # one tiny run so the first real user doesn't pay for lazy init
        t0 = time.time()
        generate(mode="scratch", prompt="a room", negative="", n=1)
        print(f"[aeterna] warm-up image in {time.time() - t0:.1f}s")
    except Exception as e:  # noqa: BLE001
        print("[aeterna] warm-up skipped:", e)


# ── timing stats (shown by /ping so you can see real speed after deploying) ──
_times: list[float] = []


def record_time(seconds: float) -> None:
    _times.append(seconds); del _times[:-20]


def stats() -> dict:
    return {"device": "mock" if MOCK else _state.get("dev", "loading"), "size": LONG_SIDE, "steps": STEPS, "layout_lock": bool(_state.get("cn")),
            "avg_seconds": round(sum(_times) / len(_times), 1) if _times else None, "samples": len(_times)}


def composite(original: Image.Image, generated: Image.Image, mask: Image.Image, feather: int = 6) -> Image.Image:
    """Keep `generated` only where the (white) mask is painted; the rest stays the original photo."""
    from PIL import ImageFilter
    size = original.size
    m = mask.convert("L").resize(size, Image.LANCZOS).point(lambda v: 255 if v > 127 else 0)
    if feather:
        m = m.filter(ImageFilter.GaussianBlur(feather))
    return Image.composite(generated.convert("RGB").resize(size), original.convert("RGB"), m)


def mask_coverage(mask: Image.Image) -> float:
    m = mask.convert("L").resize((64, 64))
    return sum(1 for v in m.getdata() if v > 127) / 4096


# ── helpers ───────────────────────────────────────────────────────────────────
def fit(image: Image.Image, long_side: int = LONG_SIDE) -> Image.Image:
    """Resize keeping aspect ratio; sides are multiples of 8 (required by SD)."""
    image = image.convert("RGB")
    w, h = image.size
    s = long_side / max(w, h)
    nw, nh = max(256, round(w * s / 8) * 8), max(256, round(h * s / 8) * 8)
    return image.resize((nw, nh), Image.LANCZOS)


def edge_map(image: Image.Image) -> Image.Image:
    """Simple edge picture used as the ControlNet hint (pure Pillow, no OpenCV needed)."""
    from PIL import ImageFilter, ImageOps
    g = ImageOps.autocontrast(image.convert("L").filter(ImageFilter.GaussianBlur(1.2)))
    e = g.filter(ImageFilter.FIND_EDGES).point(lambda v: 255 if v > 28 else 0).filter(ImageFilter.MaxFilter(3))
    return e.convert("RGB")


def detect_furniture(image: Image.Image) -> list[str]:
    """Names of furniture / decor found in the photo (largest first)."""
    if MOCK:
        return ["sofa", "coffee table", "lamp"]
    import torch
    proc, seg = _state["proc"], _state["seg"]
    with torch.inference_mode():
        logits = seg(**proc(images=image, return_tensors="pt")).logits
    ids, counts = np.unique(logits.argmax(1).squeeze().numpy(), return_counts=True)
    total = counts.sum()
    found = []
    for i, c in sorted(zip(ids, counts), key=lambda t: -t[1]):
        name = seg.config.id2label[int(i)].split(",")[0].strip()
        if name in FURNITURE and c / total > 0.004:
            found.append(PRETTY.get(name, name))
    return found[:6]


def _placeholder(seed: int, size: tuple[int, int], label: str) -> Image.Image:
    rnd = random.Random(seed)
    base = tuple(rnd.randint(150, 225) for _ in range(3))
    im = Image.new("RGB", size, base)
    d = ImageDraw.Draw(im)
    d.rectangle([0, int(size[1] * .68), size[0], size[1]], fill=tuple(max(0, c - 55) for c in base))
    d.rectangle([size[0] * .2, size[1] * .5, size[0] * .8, size[1] * .7], fill=tuple(max(0, c - 90) for c in base))
    d.text((12, 10), f"MOCK · {label}", fill=(255, 255, 255))
    return im


# ── generation ────────────────────────────────────────────────────────────────
def generate(*, mode: str, prompt: str, negative: str, n: int,
             image: Image.Image | None = None, strength: float = 0.62,
             on_step=None) -> tuple[list[Image.Image], list[int]]:
    """Returns (images, seeds). `on_step(i, n)` is called before each image."""
    seeds = [random.randint(0, 2**31 - 1) for _ in range(n)]
    out: list[Image.Image] = []
    for i, seed in enumerate(seeds):
        if on_step:
            on_step(i, n)
        if MOCK:
            time.sleep(0.4)
            size = image.size if image is not None else (LONG_SIDE, int(LONG_SIDE * .75))
            out.append(_placeholder(seed, size, mode))
            continue
        import torch
        gen = torch.Generator(device="cpu").manual_seed(seed)
        common = dict(prompt=prompt, negative_prompt=negative,
                      guidance_scale=GUIDANCE, generator=gen)
        with torch.inference_mode():
            if mode == "photo":
                # img2img runs round(steps*strength) denoising steps; keep >= 4.
                steps = max(STEPS, int(np.ceil(4 / max(strength, 0.2))))
                if _state.get("cn") is not None:
                    res = _state["cn"](image=image, control_image=edge_map(image), strength=strength,
                                       controlnet_conditioning_scale=CONTROLNET_SCALE, num_inference_steps=steps, **common)
                else:
                    res = _state["img"](image=image, strength=strength,
                                        num_inference_steps=steps, **common)
            else:
                w, h = LONG_SIDE, int(LONG_SIDE * 0.75) // 8 * 8
                res = _state["txt"](width=w, height=h, num_inference_steps=STEPS, **common)
        out.append(res.images[0])
    return out, seeds
