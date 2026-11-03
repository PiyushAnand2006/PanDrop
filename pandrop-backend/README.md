# PanDrop Backend — Point, Talk, Sell & Discover

FastAPI backend for a unified AI video-to-showcase P2P marketplace.
Every account can both sell (extract) and buy:

- **Extract:** Muse Voice transcription → Muse Spark item/price extraction →
  Muse Wonder frame selection + condition audit → SAM 3.1 real-object
  segmentation → Muse Image studio backdrop + Pillow compositing.
- **Marketplace:** unified accounts with wallets, publish extracted items,
  discovery feed with search/filters, authenticity inspection, instant buy.

Persistent store: `data/marketplace_db.json`, pre-seeded with demo accounts
(`@alex_chen`, `@maya_lin`, `@sam_parker`, $500 wallets) and initial listings.

## Setup

```bash
cd pandrop-backend
python -m venv .venv
.venv\Scripts\activate        # Windows (use source .venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
copy .env.example .env        # Windows (use cp on macOS/Linux)
```

`ffmpeg`/`ffprobe` on PATH is recommended. Without it the backend falls back
to OpenCV for probing/frames and writes a silent placeholder audio track.

## Run

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Open http://localhost:8000/docs for interactive API docs.

## API

Uploads accept multipart `file` (`.mp4`, `.mov`, `.webm`) plus an optional
`user_id` form field (defaults to the first demo account).

| Method | Path | Description |
|---|---|---|
| GET | `/health` (alias `/api/v1/health`) | Health check + mock-mode flag |
| POST | `/api/v1/process-video` | Video upload → `JobResponse` with showcase cards |
| POST | `/api/v1/jobs` | Alias of the above |
| GET | `/api/v1/jobs/{job_id}` | Re-fetch a completed job's stored result |
| GET | `/api/v1/users` | List unified accounts (1-click switch) |
| POST | `/api/v1/users` | Create account (`username`, `display_name`, `location`) |
| GET | `/api/v1/users/{user_id}` | Account details + wallet |
| GET | `/api/v1/users/{user_id}/dashboard` | Jobs, active/sold listings, purchases |
| POST | `/api/v1/marketplace/publish` | Publish job items (`user_id`, `job_id`, optional `item_ids` + price/title `overrides`) |
| GET | `/api/v1/marketplace/listings` | Discovery feed (`q`, `category`, `min_price`, `max_price`, `min_condition`) |
| GET | `/api/v1/marketplace/{listing_id}` | Authenticity inspection payload |
| POST | `/api/v1/marketplace/{listing_id}/buy` | Instant buy (`buyer_id`; wallet transfer, marks `sold`) |
| GET | `/static/jobs/{job_id}/...` | Generated frames, cutouts and showcase images |

## Offline / fallback mode

With `USE_MOCK_AI=true` (default) or no `META_API_KEY`, every Meta model call
falls back to a genuine local implementation over the real video:

- **Wonder:** sharpest frame by Laplacian variance + central bounding box.
- **SAM 3.1:** `cv2.grabCut()` segmentation initialised with that box.
- **Muse Image:** procedural radial-gradient studio backdrop (Pillow/NumPy).
- **Voice/Spark:** heuristic transcript parsing; set `PANDROP_DEMO_TRANSCRIPT`
  to supply demo speech text for silent sample videos.

Set `USE_MOCK_AI=false`, `USE_MOCK_MODELS=false` and a real `META_API_KEY` /
`META_API_BASE_URL` to use the live Meta Model APIs. Failed live calls fall
back automatically when `ENABLE_FALLBACK_ON_ERROR=true`.

## Verify

```bash
python tests/generate_sample_and_test.py            # in-process pipeline run
python tests/generate_sample_and_test.py --url http://localhost:8000
```

Phase 1 generates a synthetic room video, runs the pipeline, and asserts
every showcase asset exists on disk. Phase 2 proves the marketplace loop
over HTTP: seeded accounts → publish → search/filter → inspect → buy with
wallet transfer → dashboards, plus double-buy and self-buy rejections.
