# PanDrop Frontend — Point. Talk. Sell & Discover.

High-craft, dark-mode-first **AI Video-to-Showcase P2P Marketplace** for the Meta Global AI Developer Hackathon. Drop a product video, talk about your items, and PanDrop segments each product (SAM 3.1), audits its condition, composes studio imagery with the price burned in — then posts it to a unified two-sided marketplace where any account can discover, inspect and buy it.

**Stack:** Vite · React 18 · TypeScript · Tailwind CSS v4 · Framer Motion · Lucide React

## The three views

| View | What happens there |
|---|---|
| **Discover & Search** | Marketplace feed with search, category pills, price + AI-condition filters. Click a card to inspect authenticity (raw frame → SAM 3.1 mask → cutout → studio shot → price tag) and **Buy now** with wallet balance. |
| **AI Sell Studio** | Drop a room-scan video → the Meta AI pipeline extracts items → tweak prices/titles → **Post to Marketplace**. |
| **My Account Hub** | Active listings, sold items + earnings, purchases, and every past extraction job (re-openable in the studio). |

**Unified accounts:** the top-bar switcher (avatar · name · live wallet balance) flips the
entire app between accounts in one click — the demo loop is *post as Alex → switch to
Maya → search → inspect → buy*. Seeded accounts (Alex / Maya / Sam, $500 wallets) plus
two sample listings come from the backend on first load.

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
- **Click “Watch a 6-second demo”** — the bundled sample clip plus its REAL pipeline artifacts (raw frame, SAM 3.1 overlay, cutout, studio composite, price-tag burn-in), produced by the PanDrop backend and served from `public/demo/`. No synthetic imagery — every pixel comes from the actual video frames.

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
public/demo/            # REAL sample clip + its real backend-rendered artifacts
src/
├─ types/pandrop.ts      # Exact FastAPI contract (JobResponse, ShowcaseItem, …)
│                        # + ASSET_STAGES / assetUrlFor() pipeline stage model
├─ lib/
│  ├─ api.ts             # API_BASE, resolveAssetUrl(), processVideo(), health probe
│  ├─ demoJob.ts         # Demo preset built from the real pipeline job output
│  ├─ stages.ts          # Pipeline stage telemetry model
│  └─ format.ts          # Timecodes, bbox readouts, clipboard helpers
├─ components/
│  ├─ Landing.tsx        # Video-first hero (real sample clip) + dropzone + demo CTA
│  ├─ Processing.tsx     # Live pipeline stage telemetry (real + accelerated demo)
│  ├─ Studio.tsx         # Showcase: video rail, transcript, item grid
│  ├─ VideoPanel.tsx     # Real player + timeline markers
│  ├─ ItemCard.tsx       # Studio shot → price-tag crossfade, on-screen sync
│  └─ ItemDetail.tsx     # “Asset Lab”: 5-stage viewer, audit, copy, download
└─ index.css             # Design tokens (@theme), gradients, atmosphere
```

### Backend contract

- `POST /api/v1/process-video` (multipart `file` + `user_id`) → `JobResponse` (sync pipeline, saved to the account)
- `GET/POST /api/v1/users`, `GET /api/v1/users/{id}/dashboard` → unified accounts
- `POST /api/v1/marketplace/publish` → post extracted items (with price/title overrides)
- `GET /api/v1/marketplace/listings?q&category&min_price&max_price&min_condition&status` → discovery feed
- `POST /api/v1/marketplace/{listing_id}/buy` → wallet-based purchase
- `GET /static/…` → job + seed artifacts

All relative asset paths returned by the backend (`/static/jobs/…`) are resolved through
`resolveAssetUrl()` against `API_BASE` (`VITE_API_BASE_URL` || `http://localhost:8000`),
so the studio renders real artifacts cross-origin. Frontend-bundled `/demo/…` assets pass
through untouched.

### Design language

“Creator Studio” — midnight-navy (`#0F172A`) canvas with video-pink → violet → royal-blue
brand gradients (`#EC4899 → #8B5CF6 → #2563EB`), warm amber price tags, emerald
verified-condition badges, Rubik display type over Nunito Sans body, and JetBrains Mono
reserved for telemetry (timestamps, bounding boxes, prices). Designed with the
ui-ux-pro-max design-system rules (contrast ≥ 4.5:1, 16px body, 150–300 ms motion,
44 px touch targets, reduced-motion support).

### Robustness notes

- View switching is animation-independent (plain conditional rendering); entrance motion is
  transform-only, so the UI never freezes invisible under throttled animation frames.
- Upload requests are created eagerly, so React StrictMode double-mounting cannot double-POST.
- The video player degrades gracefully (“Source video unavailable”) when the browser lacks
  the codec — all rendered assets and interactions stay live.
- The header pill polls `/api/v1/health` every 30 s: **BACKEND LINKED** vs **STANDALONE · DEMO READY**.
