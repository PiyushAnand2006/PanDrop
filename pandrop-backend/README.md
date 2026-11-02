# PanDrop Backend — Point, Talk, Sell

FastAPI backend that turns a short pan-and-talk video into studio showcase
cards: Muse Voice transcription → Muse Spark item/price extraction →
Muse Wonder frame selection + condition audit → SAM 3.1 real-object
segmentation → Muse Image studio backdrop + Pillow compositing.

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

| Method | Path | Description |
|---|---|---|
| GET | `/health` (alias `/api/v1/health`) | Health check + mock-mode flag |
| POST | `/api/v1/process-video` | Multipart video upload → `JobResponse` JSON |
| POST | `/api/v1/jobs` | Alias of the above |
| GET | `/api/v1/jobs/{job_id}` | Re-fetch a completed job's stored result |
| GET | `/static/jobs/{job_id}/...` | Generated frames, cutouts and showcase images |

Upload field name is `file`. Accepted types: `.mp4`, `.mov`, `.webm`.

Response shape matches `schema.py` at the repo root: `job_id`, `status`,
`video_url`, `duration_sec`, `transcript`, and `items[]` each with `price`,
`condition`, `bounding_box` and `assets` URLs (`raw_frame_url`,
`sam_mask_overlay_url`, `real_cutout_png_url`, `studio_showcase_url`,
`showcase_with_pricetag_url`).

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

The script generates a synthetic room video, runs the pipeline, prints the
JSON response, and asserts every showcase asset exists on disk.
