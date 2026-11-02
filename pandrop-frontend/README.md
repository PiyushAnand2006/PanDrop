# PanDrop Frontend — Point. Talk. Sold.

High-craft, dark-mode-first **AI Video-to-Showcase E-Commerce Studio** for the Meta Global AI Developer Hackathon. Drop a product video, talk about your items, and PanDrop segments each product (SAM 3.1), audits its condition, and composes listing-ready studio imagery with the price burned in.

**Stack:** Vite · React 18 · TypeScript · Tailwind CSS v4 · Framer Motion · Lucide React

---

## Quick start

```bash
# 1 — start the FastAPI backend (separate folder, port 8000)
cd ../pandrop-backend
uvicorn app.main:app --port 8000

# 2 — start the frontend
npm install
npm run dev          # http://localhost:5173
```

Open the app and either:

- **Drop a product video** (MP4 / MOV / WEBM) — you talking about your items ("this camera, 85 bucks, works perfectly") — or
- **Click “Load Instant Demo Showcase”** — a full 4-item showcase with synthesized pipeline artifacts, zero backend required. Judges can evaluate the entire UI instantly.

> If your machine already uses port 8000, point the frontend elsewhere: copy `.env.example` to `.env`, set `VITE_API_BASE_URL=http://localhost:<port>`, and restart.

## Scripts

| Command           | Purpose                              |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Vite dev server on :5173             |
| `npm run build`   | Typecheck (`tsc -b`) + production build |
| `npm run preview` | Serve the production build           |
| `npm run typecheck` | Typecheck only                     |

## Architecture

```
src/
├─ types/pandrop.ts      # Exact FastAPI contract (JobResponse, ShowcaseItem, …)
│                        # + ASSET_STAGES / assetUrlFor() pipeline stage model
├─ lib/
│  ├─ api.ts             # API_BASE, resolveAssetUrl(), processVideo(), health probe
│  ├─ demoJob.ts         # “Instant Demo Showcase” preset (contract-complete)
│  ├─ demoAssets.ts      # Runtime SVG → data-URI generator for all 5 artifact stages
│  ├─ stages.ts          # Pipeline stage telemetry model
│  └─ format.ts          # Timecodes, bbox readouts, clipboard helpers
├─ hooks/ · components/
│  ├─ Landing.tsx        # Hero + drag-&-drop dropzone + demo CTA
│  ├─ Processing.tsx     # Live pipeline stage telemetry (real + accelerated demo)
│  ├─ Studio.tsx         # Showcase: video rail, transcript, item grid
│  ├─ VideoPanel.tsx     # Real player + timeline markers · simulated demo reel
│  ├─ ItemCard.tsx       # Studio shot → price-tag crossfade, ON AIR sync
│  └─ ItemDetail.tsx     # “Asset Lab”: 5-stage viewer, audit, copy, download
└─ index.css             # Design tokens (@theme), glass/HUD utilities, atmosphere
```

### Backend contract

- `POST /api/v1/process-video` (multipart `file`) → `JobResponse` (synchronous pipeline)
- `GET  /api/v1/jobs/{job_id}` → `JobResponse`
- `GET  /api/v1/health` → `{ status, service, mock_ai, version }`
- `GET  /static/…` → job artifacts

All relative asset paths returned by the backend (`/static/jobs/…`) are resolved through
`resolveAssetUrl()` against `API_BASE` (`VITE_API_BASE_URL` || `http://localhost:8000`),
so the studio renders real artifacts cross-origin. Data-URI demo assets pass through untouched.

### Design language

“Linear meets Apple Vision Pro meets Shopify Studio” — deep obsidian (`#090A0F`) canvas,
glassmorphic panels with hairline borders, electric cyan → royal blue HUD accents,
amber-orange gradient price tags with warm glow, emerald verified-condition badges,
Plus Jakarta Sans for UI and JetBrains Mono for all telemetry (timestamps, bounding boxes, prices).

### Robustness notes

- View switching is animation-independent (plain conditional rendering); entrance motion is
  transform-only, so the UI never freezes invisible under throttled animation frames.
- Upload requests are created eagerly, so React StrictMode double-mounting cannot double-POST.
- The video player degrades gracefully (“Source video unavailable”) when the browser lacks
  the codec — all rendered assets and interactions stay live.
- The header pill polls `/api/v1/health` every 30 s: **BACKEND LINKED** vs **STANDALONE · DEMO READY**.
