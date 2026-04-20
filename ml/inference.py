"""
inference.py — YOLOv8 inference helper for street advertisement detection.

Loads best.pt (fine-tuned model) if available, otherwise falls back to the
generic yolov8n.pt checkpoint for demonstration purposes.

Usage:
    from inference import run_inference
    detections = run_inference("/path/to/image.jpg")
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import List, Dict, Any

import numpy as np
from PIL import Image
from ultralytics import YOLO

# ── Model Loading ─────────────────────────────────────────────────────────────
_MODEL_DIR   = Path(__file__).parent / "models"
_BEST_PT     = _MODEL_DIR / "best.pt"
_FALLBACK_PT = "yolov8n.pt"

_model: YOLO | None = None


def _load_model() -> YOLO:
    """Load and cache the YOLO model (singleton pattern)."""
    global _model
    if _model is not None:
        return _model

    if _BEST_PT.exists():
        model_path = str(_BEST_PT)
        print(f"[inference] Loading fine-tuned model: {model_path}")
    else:
        model_path = _FALLBACK_PT
        print(
            f"[inference] best.pt not found — falling back to generic {_FALLBACK_PT}. "
            "Run train.py to produce a domain-specific model."
        )

    _model = YOLO(model_path)
    return _model


def is_model_loaded() -> bool:
    """Return True if the model singleton has been initialised."""
    return _model is not None


# ── Class name mapping (used when falling back to generic COCO model) ─────────
# The fine-tuned model already has the correct names in its metadata.
AD_CLASS_NAMES = {0: "poster", 1: "banner", 2: "sticker", 3: "graffiti_ad"}

CONFIDENCE_THRESHOLD = 0.4


# ── Inference ─────────────────────────────────────────────────────────────────
def run_inference(image_path: str) -> List[Dict[str, Any]]:
    """
    Run YOLOv8 inference on the given image.

    Args:
        image_path: Absolute or relative path to the image file.

    Returns:
        List of detection dicts. Each dict contains:
          - class_name  (str)
          - confidence  (float, 0–1)
          - bbox        (list[float]): [x1, y1, x2, y2] in pixel coordinates

        Returns an empty list if no detections exceed the confidence threshold.
    """
    if not os.path.isfile(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")

    model = _load_model()

    results = model(image_path, verbose=False)
    detections: List[Dict[str, Any]] = []

    for result in results:
        boxes = result.boxes
        if boxes is None:
            continue

        for box in boxes:
            confidence = float(box.conf[0])
            if confidence < CONFIDENCE_THRESHOLD:
                continue

            class_id = int(box.cls[0])

            # Prefer model's own class names; fall back to our mapping
            if result.names and class_id in result.names:
                class_name = result.names[class_id]
            else:
                class_name = AD_CLASS_NAMES.get(class_id, f"class_{class_id}")

            x1, y1, x2, y2 = box.xyxy[0].tolist()

            detections.append(
                {
                    "class_name": class_name,
                    "confidence": round(confidence, 4),
                    "bbox": [round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)],
                }
            )

    return detections


def get_image_size(image_path: str):
    """Return (width, height) of the image without fully loading it into memory."""
    with Image.open(image_path) as img:
        return img.size  # (width, height)
