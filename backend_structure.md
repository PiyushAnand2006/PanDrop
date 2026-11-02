pandrop-backend/
├── .env.example                 # Environment variables template
├── requirements.txt             # Python dependencies
├── README.md                    # Backend setup & API documentation
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI app, CORS, StaticFiles, Routes
│   ├── config.py                # Pydantic Settings (API keys, URLs, flags)
│   ├── schemas.py               # Strict Pydantic request/response models
│   ├── services/
│   │   ├── __init__.py
│   │   ├── media_service.py     # FFmpeg audio extraction & frame sampling
│   │   ├── meta_ai_service.py   # Clients for Muse Voice, Spark, Wonder, SAM 3.1, Muse Image
│   │   ├── compositor_service.py# OpenCV/Pillow mask cutout, shadow, studio composite & price tag
│   │   └── pipeline_service.py  # Orchestrates the end-to-end async workflow
│   └── utils/
│       ├── __init__.py
│       └── image_utils.py       # Base64 encoding/decoding, bbox scaling, RGBA helpers
├── static/
│   └── jobs/                    # Auto-generated per job: /static/jobs/{job_id}/...
└── tests/
    └── test_pipeline.py         # CLI script to test pipeline on a sample video