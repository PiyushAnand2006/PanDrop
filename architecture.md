# System Architecture: PanDrop Backend

## 1. High-Level Pipeline Architecture

```text
                       ┌──────────────────────────┐
                       │  POST /api/v1/jobs       │
                       │  (Multipart Video Upload)│
                       └────────────┬─────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   Media Service (FFmpeg)      │
                    │  1. Extract audio.wav         │
                    │  2. Probe video FPS/duration  │
                    └───────┬───────────────┬───────┘
                            │               │
                            ▼               │
             ┌────────────────────────────┐ │
             │   Muse Voice Transcribe    │ │
             │ (Speech -> Timed Segments) │ │
             └──────────────┬─────────────┘ │
                            │               │
                            ▼               │
             ┌────────────────────────────┐ │
             │  Muse Spark / Spark Open   │ │
             │ (Extract Items, Prices,    │ │
             │  Timestamps -> JSON Array) │ │
             └──────────────┬─────────────┘ │
                            │               │
       ┌────────────────────┴───────────────┘
       │  (Fan-out: Async Parallel Worker per Detected Item)
       ▼
┌─────────────────────────────────────────────────────────────────┐
│ ITEM WORKER (Runs concurrently for Item 1, Item 2, Item N...)   │
│                                                                 │
│  1. Frame Sampler (FFmpeg/OpenCV)                               │
│     └─► Extracts 3 candidate frames around `timestamp_sec`      │
│                                                                 │
│  2. Muse Wonder (Vision-Language Reasoning)                     │
│     ├─► Picks sharpest frame (`best_frame.jpg`)                 │
│     ├─► Outputs object bbox `[x1, y1, x2, y2]` & center `[x,y]` │
│     └─► Performs Condition Audit (Score 1-10 + Visual Notes)    │
│                                                                 │
│  3. SAM 3.1 (Segment Anything 3.1)                              │
│     ├─► Segments object using `best_frame.jpg` + bbox/prompt    │
│     ├─► Saves HUD colored mask (`hud_mask.png`)                 │
│     └─► Extracts REAL object transparent PNG (`real_cutout.png`)│
│                                                                 │
│  4. Muse Image + Studio Compositor (Pillow/OpenCV)              │
│     ├─► Muse Image generates clean studio backdrop for item     │
│     ├─► Alpha-composites `real_cutout.png` + soft drop shadow   │
│     │   onto studio backdrop -> `studio_showcase.png`           │
│     └─► Generates price-tagged image -> `showcase_tagged.png`   │
│                                                                 │
│  5. Muse Spark (Listing Copywriter)                             │
│     └─► Generates SEO Title, Description, Tags, Price Badge     │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
              ┌─────────────────────────────────┐
              │  JSON Response Payload          │
              │  (Full Job Metadata + URLs to   │
              │   all Raw, Cutout, & Showcase   │
              │   Images for Frontend Cards)    │
              └─────────────────────────────────┘