"""
YOLOv8 Training Script for Street Advertisement Detection

Classes:
  0 - poster       : paper/printed poster affixed to walls, poles, or surfaces
  1 - banner       : large fabric/vinyl banner hung on structures or fences
  2 - sticker      : small adhesive sticker advertisement on surfaces
  3 - graffiti_ad  : graffiti-style promotional or commercial content sprayed/painted

Requirements:
  pip install ultralytics
  Annotate your dataset in YOLO format (CVAT → Export YOLO 1.1)
  Place images under ml/data/images/train and ml/data/images/val
  Place labels under ml/data/labels/train and ml/data/labels/val
"""

import os
import shutil
from pathlib import Path
from ultralytics import YOLO

# ── Configuration ────────────────────────────────────────────────────────────
DATA_YAML   = "data.yaml"        # relative to ml/ directory
BASE_MODEL  = "yolov8n.pt"       # pretrained backbone (nano – fastest)
EPOCHS      = 50
IMG_SIZE    = 640
PROJECT_DIR = "runs"
RUN_NAME    = "ad_detection"
MODELS_DIR  = Path("models")
BEST_DEST   = MODELS_DIR / "best.pt"

# ── Helpers ───────────────────────────────────────────────────────────────────
def ensure_dirs():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)


def copy_best_weights(results):
    """Copy best.pt from the YOLO run directory to ml/models/best.pt."""
    run_dir = Path(results.save_dir)
    best_src = run_dir / "weights" / "best.pt"
    if best_src.exists():
        shutil.copy2(best_src, BEST_DEST)
        print(f"\n✅  Best weights saved to: {BEST_DEST.resolve()}")
    else:
        print(f"\n⚠️  best.pt not found at {best_src}. Check the run directory.")


def print_metrics(results):
    """Print mAP, precision, and recall from training results."""
    try:
        metrics = results.results_dict
        map50    = metrics.get("metrics/mAP50(B)",    "N/A")
        map5095  = metrics.get("metrics/mAP50-95(B)", "N/A")
        precision = metrics.get("metrics/precision(B)", "N/A")
        recall    = metrics.get("metrics/recall(B)",    "N/A")

        print("\n" + "=" * 50)
        print("  TRAINING COMPLETE — FINAL METRICS")
        print("=" * 50)
        print(f"  mAP@0.50       : {map50}")
        print(f"  mAP@0.50:0.95  : {map5095}")
        print(f"  Precision      : {precision}")
        print(f"  Recall         : {recall}")
        print("=" * 50 + "\n")
    except Exception as exc:
        print(f"Could not parse metrics: {exc}")


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    ensure_dirs()

    print(f"Loading base model: {BASE_MODEL}")
    model = YOLO(BASE_MODEL)

    print(f"Starting training for {EPOCHS} epochs on '{DATA_YAML}' …")
    results = model.train(
        data=DATA_YAML,
        epochs=EPOCHS,
        imgsz=IMG_SIZE,
        project=PROJECT_DIR,
        name=RUN_NAME,
        exist_ok=True,       # don't fail if run name already exists
        verbose=True,
    )

    copy_best_weights(results)
    print_metrics(results)

    print("Training pipeline finished.")


if __name__ == "__main__":
    # Change working directory to ml/ so relative paths work
    os.chdir(Path(__file__).parent)
    main()
