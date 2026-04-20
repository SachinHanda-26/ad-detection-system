# ML Layer — README

## Overview

The `ml/` directory contains the Python-based computer vision pipeline built on [YOLOv8](https://github.com/ultralytics/ultralytics).

### Components

| File | Purpose |
|---|---|
| `data.yaml` | YOLOv8 dataset config — defines class names and data paths |
| `train.py` | Fine-tune YOLOv8 on your annotated advertisement dataset |
| `inference.py` | Pure-Python inference helper (importable by the FastAPI app) |
| `inference_api.py` | FastAPI microservice — exposes `POST /predict` and `GET /health` |
| `requirements.txt` | Python dependencies |

---

## Setup

```bash
cd ml
pip install -r requirements.txt
```

---

## Starting the Inference API

```bash
uvicorn inference_api:app --reload --port 8001
```

Test with curl:

```bash
# Health check
curl http://localhost:8001/health

# Predict
curl -X POST http://localhost:8001/predict \
  -F "file=@/path/to/street_image.jpg"
```

---

## Training Your Own Model

### 1. Annotate Your Dataset

Use [CVAT](https://cvat.ai/) or [Roboflow](https://roboflow.com/) to annotate street images with 4 classes:

| ID | Name | Description |
|---|---|---|
| 0 | `poster` | Paper/printed poster on walls or poles |
| 1 | `banner` | Large fabric/vinyl banner on structures |
| 2 | `sticker` | Adhesive sticker advertisement |
| 3 | `graffiti_ad` | Graffiti-style promotional content |

Export in **YOLO 1.1** format.

### 2. Place Data

```
ml/
  data/
    images/
      train/   ← training images (.jpg / .png)
      val/     ← validation images
    labels/
      train/   ← YOLO .txt label files
      val/
```

### 3. Train

```bash
cd ml
python train.py
```

Fine-tuned weights will be saved to `ml/models/best.pt`.

---

## Fallback Behaviour

If `ml/models/best.pt` does not exist (i.e. you haven't trained yet), the inference engine automatically falls back to the generic **yolov8n.pt** COCO checkpoint. This will detect general objects rather than advertisement-specific classes, but the API and backend pipeline remain fully functional for development and testing.

---

## Class Reference

```
0 - poster      : paper/printed poster affixed to walls, poles, or surfaces
1 - banner      : large fabric/vinyl banner hung on structures or fences
2 - sticker     : small adhesive sticker advertisement on surfaces
3 - graffiti_ad : graffiti-style promotional or commercial content
```
