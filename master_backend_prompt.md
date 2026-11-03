
---

# 3. Updated `MASTER_BACKEND_PROMPT.md` (Paste into `Muse Code` — Backend Only)

```markdown
# MASTER PROMPT: Build the Complete PanDrop Backend (AI Video Extraction + Unified Buy/Sell Marketplace)

## ROLE & OBJECTIVE
You are a Principal Python Backend & Multimodal AI Engineer building **PanDrop ("Point, Talk, Sell & Discover")** for the Meta Global AI Developer Hackathon.
Your task is to implement the **complete Python FastAPI backend** that supports:
1. **Unified User Accounts** (every user account can both extract/sell items AND search/inspect/buy items; no separate buyer/seller account types).
2. **Meta AI Video-to-Showcase Extraction Pipeline** (`Muse Voice Transcribe`, `Muse Spark`, `Muse Wonder`, `SAM 3.1`, `Muse Image`) that cuts the **real physical object** out of a seller's room video and composites it onto a studio showcase card with a price tag.
3. **Marketplace Publishing, Discovery, Search, Inspection & Buying APIs** backed by a persistent local JSON database (`data/marketplace_db.json`) pre-seeded with realistic demo accounts and initial listings.

## 🚨 STRICT BOUNDARY RULE: STOP AT FRONTEND
- **DO NOT** build any React, Next.js, HTML, CSS, or frontend UI files.
- **ONLY** build the Python FastAPI backend, image/video processing services, Meta Model API clients, persistent store, and automated verification script.
- Once the backend and `tests/generate_sample_and_test.py` pass completely, **STOP**.

---

## 1. TECH STACK
- **Python 3.11+**, **FastAPI**, **Uvicorn**, **Pydantic v2**, **pydantic-settings**
- **Computer Vision & Compositing:** `opencv-python-headless`, `Pillow`, `numpy`, `ffmpeg` (via `subprocess` with automatic fallback to OpenCV `VideoCapture`)
- **HTTP / AI Clients:** `httpx` (async), `openai` (`AsyncOpenAI`), `python-multipart`, `aiofiles`

---

## 2. EXACT DIRECTORY STRUCTURE TO CREATE
```text
pandrop-backend/
├── .env.example
├── requirements.txt
├── README.md
├── app/
│   ├── __init__.py
│   ├── config.py
│   ├── schemas.py
│   ├── main.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── store_service.py
│   │   ├── media_service.py
│   │   ├── meta_ai_service.py
│   │   ├── compositor_service.py
│   │   └── pipeline_service.py
│   └── utils/
│       ├── __init__.py
│       └── image_utils.py
└── tests/
    └── generate_sample_and_test.py