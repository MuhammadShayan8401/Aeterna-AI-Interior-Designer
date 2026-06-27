"""
models/ann/preference_model.py
================================
ANN-based user preference prediction model.

Architecture: Multi-task MLP with shared trunk + 5 output heads
Input : 32-dimensional feature vector encoding session context
Heads : style classification, density classification, strength regression,
        satisfaction probability, aesthetic score

Trained from feedback.json via POST /feedback/train
Auto-loads from checkpoints/ann_preference.pth if present.
"""

from __future__ import annotations
import json
import logging
import time
from pathlib import Path
from dataclasses import dataclass, field

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

logger = logging.getLogger("aeterna.ann")

# ── Constants ─────────────────────────────────────────────────────────────────
STYLES   = ["modern","minimalist","scandinavian","industrial","bohemian",
            "mid-century modern","traditional","japandi","coastal","art deco"]
ROOMS    = ["living room","bedroom","kitchen","bathroom","dining room",
            "home office","nursery","studio apartment"]
DENSITIES = ["minimal","moderate","dense"]

FEATURE_DIM   = 32
MIN_RECORDS   = 5
CHECKPOINT    = Path(__file__).parent.parent.parent / "checkpoints" / "ann_preference.pth"
FEEDBACK_FILE = Path(__file__).parent.parent.parent / "uploads" / "feedback.json"


# ── Feature encoding ──────────────────────────────────────────────────────────

def encode_features(record: dict) -> np.ndarray:
    """Encode a feedback record into a 32-dim float32 feature vector."""
    vec = np.zeros(FEATURE_DIM, dtype=np.float32)

    s = str(record.get("style", "modern")).lower().strip()
    if s in STYLES:
        vec[STYLES.index(s)] = 1.0
    else:
        vec[0] = 1.0   # default to "modern"

    r = str(record.get("room_type", "living room")).lower().strip()
    if r in ROOMS:
        vec[10 + ROOMS.index(r)] = 1.0
    else:
        vec[10] = 1.0   # default to "living room"

    d = str(record.get("density", "moderate")).lower().strip()
    if d in DENSITIES:
        vec[18 + DENSITIES.index(d)] = 1.0
    else:
        vec[19] = 1.0   # default to "moderate"

    try:
        vec[21] = float(record.get("strength", 0.6))
        vec[22] = float(record.get("num_images", 3)) / 4.0
        vec[23] = float(record.get("aesthetic_score", 0.5))
        vec[24] = float(record.get("realism_score", 0.5))
        vec[25] = min(float(record.get("generation_time", 30)) / 60.0, 1.0)
        vec[26] = 1.0 if record.get("used_ai_recommendation") else 0.0
        vec[27] = float(record.get("like_ratio", 0.5))
    except (TypeError, ValueError) as e:
        logger.warning("Feature encoding error for record: %s", e)

    # Clamp all values to [0,1] as a safety net
    vec = np.clip(vec, 0.0, 1.0)
    return vec


# ── Model architecture ────────────────────────────────────────────────────────

class PreferenceANN(nn.Module):
    """
    Multi-task MLP for interior design preference prediction.

    Shared trunk uses LayerNorm instead of BatchNorm1d to support
    single-sample inference without crashing.

    Head 1: style classification (10 classes)
    Head 2: density classification (3 classes)
    Head 3: strength regression (sigmoid → [0.3, 0.9])
    Head 4: satisfaction probability (sigmoid → [0, 1])
    Head 5: aesthetic score (sigmoid → [0, 1])
    """
    def __init__(self, input_dim: int = FEATURE_DIM):
        super().__init__()
        # LayerNorm works with any batch size including 1
        self.trunk = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.LayerNorm(64),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(64, 64),
            nn.LayerNorm(64),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
        )
        self.style_head     = nn.Linear(64, len(STYLES))
        self.density_head   = nn.Linear(64, len(DENSITIES))
        self.strength_head  = nn.Linear(64, 1)
        self.sat_head       = nn.Linear(64, 1)
        self.aesthetic_head = nn.Linear(64, 1)

    def forward(self, x: torch.Tensor):
        x = x.float()
        h = self.trunk(x)
        style_logits   = self.style_head(h)
        density_logits = self.density_head(h)
        strength       = 0.3 + 0.6 * torch.sigmoid(self.strength_head(h))
        satisfaction   = torch.sigmoid(self.sat_head(h))
        aesthetic      = torch.sigmoid(self.aesthetic_head(h))
        return style_logits, density_logits, strength, satisfaction, aesthetic


# ── Singleton ─────────────────────────────────────────────────────────────────
_model: PreferenceANN | None = None
_device: torch.device | None = None


def _get_device() -> torch.device:
    global _device
    if _device is None:
        _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    return _device


def reset_ann_model() -> None:
    """Force the singleton to reload from disk on next call to load_ann_model()."""
    global _model
    _model = None
    logger.info("[ANN] Singleton reset — will reload from checkpoint on next call")


def load_ann_model() -> PreferenceANN:
    global _model
    if _model is not None:
        return _model

    device = _get_device()
    _model = PreferenceANN(FEATURE_DIM).to(device)
    _model.eval()

    if CHECKPOINT.exists():
        try:
            ckpt  = torch.load(CHECKPOINT, map_location=device)
            state = ckpt.get("model", ckpt)
            _model.load_state_dict(state, strict=False)
            trained_at = ckpt.get("trained_at")
            records    = ckpt.get("records", "?")
            ts = time.strftime("%Y-%m-%d %H:%M", time.localtime(trained_at)) if trained_at else "unknown"
            logger.info("[ANN] Loaded checkpoint: records=%s trained=%s", records, ts)
        except Exception as exc:
            logger.error("[ANN] Failed to load checkpoint: %s", exc)
    else:
        logger.info("[ANN] No checkpoint at %s — using random weights", CHECKPOINT)
        logger.info("[ANN] Collect feedback and call POST /feedback/train to train.")

    return _model


# ── Inference ─────────────────────────────────────────────────────────────────

@dataclass
class ANNRecommendation:
    recommended_style:   str
    recommended_density: str
    suggested_strength:  float
    satisfaction_prob:   float
    aesthetic_score:     float
    style_affinities:    dict[str, float] = field(default_factory=dict)
    density_affinities:  dict[str, float] = field(default_factory=dict)
    confidence:          float = 0.0


def run_ann_inference(context: dict) -> ANNRecommendation:
    model  = load_ann_model()
    device = next(model.parameters()).device

    feat = encode_features(context)
    x    = torch.tensor(feat, dtype=torch.float32).unsqueeze(0).to(device)

    model.eval()
    with torch.no_grad():
        style_logits, density_logits, strength, satisfaction, aesthetic = model(x)

    style_probs   = F.softmax(style_logits,   dim=-1).squeeze(0).cpu().numpy()
    density_probs = F.softmax(density_logits, dim=-1).squeeze(0).cpu().numpy()

    return ANNRecommendation(
        recommended_style   = STYLES[int(np.argmax(style_probs))],
        recommended_density = DENSITIES[int(np.argmax(density_probs))],
        suggested_strength  = round(float(strength.squeeze().cpu()), 3),
        satisfaction_prob   = round(float(satisfaction.squeeze().cpu()), 3),
        aesthetic_score     = round(float(aesthetic.squeeze().cpu()), 3),
        style_affinities    = {s: round(float(p), 4) for s, p in zip(STYLES, style_probs)},
        density_affinities  = {d: round(float(p), 4) for d, p in zip(DENSITIES, density_probs)},
        confidence          = round(float(np.max(style_probs)), 4),
    )


# ── Training ──────────────────────────────────────────────────────────────────

def train_from_feedback(epochs: int = 150, lr: float = 3e-4) -> dict:
    """
    Train / fine-tune the ANN from feedback.json.

    Called by POST /feedback/train.
    Returns a result dict (always has success:bool key).

    Critical fixes applied:
    - Uses MSELoss for strength regression (was incorrectly using BCELoss on
      a sigmoid of a re-normalised value which produced NaN gradients)
    - Uses LayerNorm model (no BatchNorm1d crash on single-sample batches)
    - Calls reset_ann_model() after saving so the singleton re-reads the
      fresh checkpoint on the next inference call
    - Detailed logging at every step
    """
    logger.info("[ANN] Training started — epochs=%d lr=%s", epochs, lr)

    # ── Load feedback records ─────────────────────────────────────────────────
    records: list[dict] = []
    if FEEDBACK_FILE.exists():
        try:
            raw     = FEEDBACK_FILE.read_text(encoding="utf-8")
            records = json.loads(raw)
            logger.info("[ANN] Loaded %d feedback records from %s", len(records), FEEDBACK_FILE)
        except json.JSONDecodeError as exc:
            logger.error("[ANN] feedback.json parse error: %s", exc)
            return {"success": False, "error": f"feedback.json parse error: {exc}", "count": 0}
    else:
        logger.warning("[ANN] feedback.json not found at %s", FEEDBACK_FILE)
        return {"success": False, "error": "No feedback file found", "count": 0}

    if len(records) < MIN_RECORDS:
        msg = f"Need at least {MIN_RECORDS} feedback records to train (have {len(records)})"
        logger.warning("[ANN] %s", msg)
        return {"success": False, "error": msg, "count": len(records)}

    # ── Validate and encode records ───────────────────────────────────────────
    X_list, y_style, y_density, y_strength, y_sat = [], [], [], [], []
    skipped = 0

    for i, r in enumerate(records):
        try:
            feat = encode_features(r)
            if np.any(np.isnan(feat)) or np.any(np.isinf(feat)):
                logger.warning("[ANN] Skipping record %d: NaN/Inf in features", i)
                skipped += 1
                continue

            X_list.append(feat)

            s   = str(r.get("style", "modern")).lower().strip()
            s_i = STYLES.index(s) if s in STYLES else 0
            y_style.append(s_i)

            d   = str(r.get("density", "moderate")).lower().strip()
            d_i = DENSITIES.index(d) if d in DENSITIES else 1
            y_density.append(d_i)

            # Strength target: normalised to [0,1] for MSELoss
            strength_val = float(r.get("strength", 0.6))
            strength_norm = np.clip((strength_val - 0.3) / 0.6, 0.0, 1.0)
            y_strength.append([strength_norm])

            # Satisfaction: 1 if liked, 0 if disliked
            y_sat.append([1.0 if r.get("rating", 0) > 0 else 0.0])

        except Exception as exc:
            logger.warning("[ANN] Skipping record %d due to error: %s", i, exc)
            skipped += 1
            continue

    if len(X_list) < MIN_RECORDS:
        msg = f"Only {len(X_list)} valid records after validation (skipped {skipped})"
        logger.error("[ANN] %s", msg)
        return {"success": False, "error": msg, "count": len(X_list)}

    logger.info("[ANN] Training on %d valid records (%d skipped)", len(X_list), skipped)

    # ── Build tensors ─────────────────────────────────────────────────────────
    device = _get_device()
    try:
        X         = torch.tensor(np.array(X_list),   dtype=torch.float32).to(device)
        t_style   = torch.tensor(y_style,             dtype=torch.long).to(device)
        t_density = torch.tensor(y_density,           dtype=torch.long).to(device)
        t_str     = torch.tensor(y_strength,          dtype=torch.float32).to(device)
        t_sat     = torch.tensor(y_sat,               dtype=torch.float32).to(device)
    except Exception as exc:
        logger.error("[ANN] Tensor construction failed: %s", exc)
        return {"success": False, "error": f"Tensor error: {exc}", "count": len(X_list)}

    logger.info("[ANN] Tensors: X=%s device=%s", list(X.shape), device)

    # ── Train ─────────────────────────────────────────────────────────────────
    # Always create a fresh model for training so we don't fine-tune a stale singleton
    model = PreferenceANN(FEATURE_DIM).to(device)
    model.train()

    ce  = nn.CrossEntropyLoss()
    mse = nn.MSELoss()          # replaces BCELoss — correct for bounded regression
    bce = nn.BCELoss()

    opt       = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=epochs, eta_min=1e-5)

    losses       = []
    log_interval = max(1, epochs // 5)

    for epoch in range(1, epochs + 1):
        opt.zero_grad()
        try:
            sl, dl, st, sat, aes = model(X)
        except Exception as exc:
            logger.error("[ANN] Forward pass failed at epoch %d: %s", epoch, exc)
            return {"success": False, "error": f"Forward pass error: {exc}", "count": len(X_list)}

        # ── Loss ──────────────────────────────────────────────────────────────
        loss_style   = ce(sl, t_style)
        loss_density = ce(dl, t_density)
        # Strength: model outputs [0.3,0.9], normalise to [0,1] before MSE
        loss_strength = mse((st - 0.3) / 0.6, t_str)
        loss_sat      = bce(sat, t_sat)

        loss = loss_style + loss_density + loss_strength + loss_sat

        if torch.isnan(loss) or torch.isinf(loss):
            logger.error("[ANN] NaN/Inf loss at epoch %d — aborting", epoch)
            return {"success": False, "error": f"NaN loss at epoch {epoch}", "count": len(X_list)}

        loss.backward()
        nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        opt.step()
        scheduler.step()
        losses.append(loss.item())

        if epoch % log_interval == 0 or epoch == 1 or epoch == epochs:
            logger.info("[ANN] Epoch %d/%d  loss=%.4f  style=%.4f  density=%.4f  str=%.4f  sat=%.4f",
                        epoch, epochs, loss.item(),
                        loss_style.item(), loss_density.item(),
                        loss_strength.item(), loss_sat.item())

    model.eval()
    final_loss = round(losses[-1], 4)
    logger.info("[ANN] Training complete — final_loss=%.4f  epochs=%d  records=%d",
                final_loss, epochs, len(X_list))

    # ── Save checkpoint ───────────────────────────────────────────────────────
    try:
        CHECKPOINT.parent.mkdir(parents=True, exist_ok=True)
        save_path = CHECKPOINT
        torch.save({
            "model":      model.state_dict(),
            "trained_at": time.time(),
            "records":    len(X_list),
            "epochs":     epochs,
            "final_loss": final_loss,
            "skipped":    skipped,
        }, save_path)
        # Verify the file was actually written
        if not save_path.exists() or save_path.stat().st_size == 0:
            raise IOError("Checkpoint file is missing or empty after save")
        logger.info("[ANN] Checkpoint saved to %s (%d bytes)", save_path, save_path.stat().st_size)
    except Exception as exc:
        logger.error("[ANN] Checkpoint save FAILED: %s", exc)
        return {"success": False, "error": f"Failed to save checkpoint: {exc}", "count": len(X_list)}

    # ── Reset singleton so next inference loads the fresh checkpoint ──────────
    reset_ann_model()
    logger.info("[ANN] Singleton reset — next inference will load fresh weights")

    return {
        "success":    True,
        "epochs":     epochs,
        "records":    len(X_list),
        "skipped":    skipped,
        "final_loss": final_loss,
        "checkpoint": str(CHECKPOINT),
        "checkpoint_size_bytes": CHECKPOINT.stat().st_size,
    }
