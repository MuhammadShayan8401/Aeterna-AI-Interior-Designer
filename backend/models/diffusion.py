"""
models/diffusion.py
Stable Diffusion pipelines for Aeterna:
  - img2img  → existing room redesign (unchanged)
  - txt2img  → NEW: empty room generation from scratch (Phase 2)
Both share MODEL_ID and are loaded as independent singletons so loading
one does not affect or reload the other.
"""

import random
import torch
from PIL import Image
from diffusers import (
    StableDiffusionImg2ImgPipeline,
    StableDiffusionPipeline,
    DPMSolverMultistepScheduler,
)

MODEL_ID = "runwayml/stable-diffusion-v1-5"

# ── Singleton loaders ──────────────────────────────────────────────────────────
_pipe = None        # img2img — room redesign (existing)
_pipe_txt2img = None  # txt2img — empty room generation (new)


def load_diffusion_model():
    global _pipe
    if _pipe is None:
        print("[Diffusion] Loading Stable Diffusion img2img (this may take ~2 min)...")
        _pipe = StableDiffusionImg2ImgPipeline.from_pretrained(
            MODEL_ID,
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            safety_checker=None,
            requires_safety_checker=False,
        )
        _pipe.scheduler = DPMSolverMultistepScheduler.from_config(
            _pipe.scheduler.config
        )
        if torch.cuda.is_available():
            _pipe = _pipe.to("cuda")
            _pipe.enable_attention_slicing()
        print("[Diffusion] img2img model loaded.")
    return _pipe


def load_txt2img_model():
    """
    Loads the txt2img pipeline, reusing weights already in memory from the
    img2img pipeline when possible (same MODEL_ID) to avoid downloading or
    holding two full copies of the UNet/VAE/text-encoder unnecessarily.
    """
    global _pipe_txt2img
    if _pipe_txt2img is None:
        print("[Diffusion] Loading Stable Diffusion txt2img (this may take ~2 min)...")
        if _pipe is not None:
            # Reuse already-loaded components from the img2img pipeline —
            # StableDiffusionPipeline and StableDiffusionImg2ImgPipeline
            # share the same component set (vae, text_encoder, tokenizer,
            # unet, scheduler, safety_checker, feature_extractor).
            _pipe_txt2img = StableDiffusionPipeline(
                vae=_pipe.vae,
                text_encoder=_pipe.text_encoder,
                tokenizer=_pipe.tokenizer,
                unet=_pipe.unet,
                scheduler=_pipe.scheduler,
                safety_checker=None,
                feature_extractor=_pipe.feature_extractor,
                requires_safety_checker=False,
            )
        else:
            _pipe_txt2img = StableDiffusionPipeline.from_pretrained(
                MODEL_ID,
                torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                safety_checker=None,
                requires_safety_checker=False,
            )
            _pipe_txt2img.scheduler = DPMSolverMultistepScheduler.from_config(
                _pipe_txt2img.scheduler.config
            )
            if torch.cuda.is_available():
                _pipe_txt2img = _pipe_txt2img.to("cuda")
                _pipe_txt2img.enable_attention_slicing()
        print("[Diffusion] txt2img model loaded.")
    return _pipe_txt2img


# ── img2img — existing room redesign (unchanged) ──────────────────────────────
def run_diffusion(
    image: Image.Image,
    prompt: str,
    negative_prompt: str,
    strength: float = 0.6,
    guidance_scale: float = 7.5,
    num_inference_steps: int = 30,
    seed: int = None,
) -> tuple[Image.Image, int]:
    """
    Args:
        image:             Input PIL Image (will be resized to 512x512)
        prompt:            Positive text prompt
        negative_prompt:   Negative text prompt
        strength:          How much to transform the image (0.3–0.9)
        guidance_scale:    Classifier-free guidance scale
        num_inference_steps: Denoising steps (more = better quality, slower)
        seed:              Random seed for reproducibility (None = random)
    Returns:
        result_image: Generated PIL Image
        seed_used:    The seed that was used (useful for frontend display)
    """
    pipe = load_diffusion_model()

    if seed is None:
        seed = random.randint(0, 2**32 - 1)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    generator = torch.Generator(device=device).manual_seed(seed)

    img = image.convert("RGB").resize((512, 512))

    result = pipe(
        prompt=prompt,
        negative_prompt=negative_prompt,
        image=img,
        strength=strength,
        guidance_scale=guidance_scale,
        num_inference_steps=num_inference_steps,
        generator=generator,
    )

    return result.images[0], seed


def run_diffusion_batch(
    image: Image.Image,
    prompt: str,
    negative_prompt: str,
    strength: float = 0.6,
    num_images: int = 3,
) -> tuple[list[Image.Image], list[int]]:
    """
    Generate multiple variations using different random seeds.
    Returns list of images and the seeds used.
    """
    images, seeds = [], []
    for _ in range(num_images):
        seed = random.randint(0, 2**32 - 1)
        img, used_seed = run_diffusion(
            image, prompt, negative_prompt, strength=strength, seed=seed
        )
        images.append(img)
        seeds.append(used_seed)
    return images, seeds


# ── txt2img — NEW: empty room generation from scratch ─────────────────────────
def run_txt2img(
    prompt: str,
    negative_prompt: str,
    guidance_scale: float = 7.5,
    num_inference_steps: int = 35,
    width: int = 512,
    height: int = 512,
    seed: int = None,
) -> tuple[Image.Image, int]:
    """
    Generate a full interior scene from text only — no input image.

    Args:
        prompt:               Positive text prompt
        negative_prompt:       Negative text prompt
        guidance_scale:         Classifier-free guidance scale
        num_inference_steps:     Denoising steps (txt2img benefits from a
                                  few more steps than img2img since there's
                                  no starting structure to lean on)
        width, height:           Output resolution (must be multiples of 8)
        seed:                     Random seed for reproducibility (None = random)
    Returns:
        result_image: Generated PIL Image
        seed_used:    The seed that was used
    """
    pipe = load_txt2img_model()

    if seed is None:
        seed = random.randint(0, 2**32 - 1)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    generator = torch.Generator(device=device).manual_seed(seed)

    result = pipe(
        prompt=prompt,
        negative_prompt=negative_prompt,
        guidance_scale=guidance_scale,
        num_inference_steps=num_inference_steps,
        width=width,
        height=height,
        generator=generator,
    )

    return result.images[0], seed


def run_txt2img_batch(
    prompt: str,
    negative_prompt: str,
    num_images: int = 3,
) -> tuple[list[Image.Image], list[int]]:
    """
    Generate multiple empty-room variations using different random seeds.
    Mirrors run_diffusion_batch's shape for frontend/route consistency.
    """
    images, seeds = [], []
    for _ in range(num_images):
        seed = random.randint(0, 2**32 - 1)
        img, used_seed = run_txt2img(prompt, negative_prompt, seed=seed)
        images.append(img)
        seeds.append(used_seed)
    return images, seeds
