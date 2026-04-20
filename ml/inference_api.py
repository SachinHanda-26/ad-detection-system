"""
inference_api.py — FastAPI microservice wrapping the YOLOv8 inference engine.

Start with:
    uvicorn inference_api:app --reload --port 8001

Endpoints:
    POST /predict   — multipart image upload → detection results JSON
    GET  /health    — liveness / readiness check
"""

import os
import uuid
import tempfile
from pathlib import Path
from typing import List, Dict, Any

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Ensure the script's directory is in PYTHONPATH so that
# inference.py can be imported regardless of CWD.
import sys
sys.path.insert(0, str(Path(__file__).parent))

from inference import run_inference, get_image_size, is_model_loaded, _load_model

# ── App Setup ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AdDetect Inference API",
    description="YOLOv8-based street advertisement detection microservice",
    version="1.0.0",
)

# Allow requests from Node.js backend and React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3001",
        "http://localhost:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pre-load model on startup so first request is fast
@app.on_event("startup")
async def startup_event():
    try:
        _load_model()
        print("[startup] Model loaded successfully.")
    except Exception as exc:
        print(f"[startup] WARNING: Could not pre-load model — {exc}")


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    """Liveness + readiness probe."""
    return JSONResponse(
        content={
            "status": "ok",
            "model_loaded": is_model_loaded(),
        }
    )


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """
    Accept an image file and return YOLOv8 detection results.

    Returns:
        {
          "detections": [{ "class_name", "confidence", "bbox": [x1,y1,x2,y2] }, …],
          "count": <int>,
          "image_size": [width, height]
        }
    """
    # ── Validate content type ─────────────────────────────────────────────────
    allowed_types = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
    content_type = file.content_type or ""
    if content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{content_type}'. Allowed: jpeg, png, webp.",
        )

    # ── Save to temp file ─────────────────────────────────────────────────────
    suffix = Path(file.filename or "upload.jpg").suffix or ".jpg"
    tmp_path: str | None = None

    try:
        # Use a named temp file that persists until we explicitly delete it
        fd, tmp_path = tempfile.mkstemp(suffix=suffix)
        try:
            contents = await file.read()
            with os.fdopen(fd, "wb") as f:
                f.write(contents)
        except Exception:
            os.close(fd)
            raise

        # ── Run inference ─────────────────────────────────────────────────────
        try:
            detections: List[Dict[str, Any]] = run_inference(tmp_path)
            width, height = get_image_size(tmp_path)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=500, detail=str(exc))
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Inference failed: {str(exc)}",
            )

        return JSONResponse(
            content={
                "detections": detections,
                "count": len(detections),
                "image_size": [width, height],
            }
        )

    finally:
        # Always clean up temp file
        if tmp_path and os.path.isfile(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass


# ── Dev entrypoint ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("inference_api:app", host="0.0.0.0", port=8001, reload=True)
