# AdDetect — CV-Based Detection of Unauthorized Street Advertisements

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A full-stack, production-ready system for detecting and reporting unauthorized street advertisements using computer vision (YOLOv8), a Node.js API, MongoDB, and an LLM-powered enforcement report generator.

---

## Architecture

```
┌─────────────────────┐     upload image      ┌──────────────────────┐
│   React Frontend     │ ──────────────────▶  │  Node.js / Express   │
│   (port 3000)        │ ◀──────────────────  │  Backend (port 3001) │
└─────────────────────┘    detections +        └────────┬─────────────┘
                            LLM report                   │  runInference()
                                                         ▼
                                                ┌──────────────────────┐
                                                │ FastAPI ML Service   │
                                                │ YOLOv8 (port 8001)   │
                                                └──────────────────────┘
                                                         │
                                                         ▼
                                                ┌──────────────────────┐
                                                │ MongoDB (port 27017) │
                                                └──────────────────────┘
```

---

## Quick Start (Local Development)

### Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB (local install or [MongoDB Atlas](https://www.mongodb.com/atlas))
- Git

### 1 — Clone the repository

```bash
git clone https://github.com/your-org/ad-detection-system.git
cd ad-detection-system
```

### 2 — ML service setup

```bash
cd ml
pip install -r requirements.txt
```

### 3 — Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Open `backend/.env` and fill in:

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string (default: `mongodb://localhost:27017/ad_detection`) |
| `OPENAI_API_KEY` | Your OpenAI API key (optional — see Offline Mode below) |
| `ML_SERVICE_URL` | URL of the FastAPI service (default: `http://localhost:8001`) |
| `PORT` | Backend port (default: `3001`) |

### 4 — Frontend setup

```bash
cd frontend
npm install
```

### 5 — Start MongoDB

```bash
# macOS with Homebrew
brew services start mongodb-community

# Windows (run as Administrator)
net start MongoDB

# Or use Docker
docker run -d -p 27017:27017 --name mongo mongo:7
```

### 6 — Start the ML inference service

```bash
cd ml
uvicorn inference_api:app --reload --port 8001
```

Test it is running:
```bash
curl http://localhost:8001/health
# {"status":"ok","model_loaded":true}
```

### 7 — Start the backend

```bash
cd backend
npm run dev
```

The API will be available at `http://localhost:3001`.

### 8 — Start the frontend

```bash
cd frontend
npm start
```

### 9 — Open the app

Navigate to **http://localhost:3000** in your browser.

---

## Training Your Own Model

The system ships with a **yolov8n.pt fallback** that detects general COCO objects. To detect street advertisements specifically you need to fine-tune the model.

### Step 1 — Annotate your dataset

Use [CVAT](https://cvat.ai/) or [Roboflow](https://roboflow.com/) to annotate street images with 4 classes:

| ID | Class | Description |
|---|---|---|
| 0 | `poster` | Paper/printed poster on walls or poles |
| 1 | `banner` | Large fabric/vinyl banner on structures |
| 2 | `sticker` | Small adhesive sticker advertisement |
| 3 | `graffiti_ad` | Graffiti-style promotional content |

Export in **YOLO 1.1** format.

### Step 2 — Place data

```
ml/
  data/
    images/
      train/
      val/
    labels/
      train/
      val/
```

### Step 3 — Run training

```bash
cd ml
python train.py
```

Weights are saved to `ml/models/best.pt` and picked up automatically on next service restart.

---

## Offline Mode (No OpenAI Key)

If `OPENAI_API_KEY` is missing or set to `your_key_here`, the LLM service automatically falls back to a **deterministic rule-based report generator**:

- 0 detections → `legalStatus: authorized`
- 1–2 detections → `legalStatus: likely_unauthorized`  
- 3+ detections or any with confidence ≥ 0.8 → `legalStatus: unauthorized`

The full pipeline (upload → detect → report → MongoDB) still works without an API key.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/detect` | Upload image, run detection + LLM report |
| `GET` | `/api/history` | Paginated detection list |
| `GET` | `/api/history/stats` | Aggregate statistics |
| `GET` | `/api/reports` | Paginated reports |
| `GET` | `/api/reports/:id` | Single report |
| `DELETE` | `/api/reports/:id` | Delete report |
| `GET` | `/health` | Backend health check |

All responses follow the shape:
```json
{ "success": true|false, "data": { ... }, "error": null|"string" }
```

---

## Docker (Optional)

Run all services with Docker Compose:

```bash
# Copy and fill env
cp backend/.env.example backend/.env

# Build and run
docker compose up --build
```

Services:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- ML API: http://localhost:8001

---

## Tech Stack

| Layer | Technology |
|---|---|
| CV / ML | Python, YOLOv8 (ultralytics) |
| ML API | FastAPI, uvicorn |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| LLM | OpenAI GPT-4o-mini via LangChain.js |
| Frontend | React 18, Tailwind CSS 3, React Router v6 |
| HTTP client | axios |

---

## License

MIT
