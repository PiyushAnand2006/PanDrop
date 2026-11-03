pandrop-backend/
├── .env.example
├── requirements.txt
├── README.md
├── app/
│   ├── __init__.py
│   ├── config.py
│   ├── schemas.py               # Unified Account, Extraction Job, & Marketplace schemas
│   ├── main.py                  # FastAPI routes for Accounts, Extraction Jobs, & Marketplace
│   ├── services/
│   │   ├── __init__.py
│   │   ├── store_service.py     # Persistent JSON/SQLite store for Accounts, Listings & Orders
│   │   ├── media_service.py     # FFmpeg/OpenCV audio & frame extraction
│   │   ├── meta_ai_service.py   # Muse Voice, Spark, Wonder, SAM 3.1, Muse Image clients
│   │   ├── compositor_service.py# Real object cutout, HUD mask, studio showcase & price tag
│   │   └── pipeline_service.py  # Async orchestrator for video-to-showcase extraction
│   └── utils/
│       ├── __init__.py
│       └── image_utils.py
├── static/
│   └── jobs/                    # Served at /static/jobs/{job_id}/...
└── tests/
    └── generate_sample_and_test.py