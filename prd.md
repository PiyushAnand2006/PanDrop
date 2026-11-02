# Product Requirements Document (PRD): PanDrop
**Subtitle:** Point, Talk, Sell — Instant AI Video-to-Showcase E-Commerce Engine  
**Hackathon Track:** Build for Your World (Meta Global AI Developer Hackathon)  
**Participation Type:** Solo Developer  

---

## 1. Executive Summary
Selling personal items online (Facebook Marketplace, eBay, Craigslist, moving sales) is tedious. Users must photograph each item individually, clean up messy bedroom backgrounds, crop photos, research pricing, and manually type titles and descriptions. 

**PanDrop** lets a user record a single 15-second video panning across their room while casually talking about what they want to sell and for how much. The backend pipeline automatically:
1. Transcribes their voice with timestamps (**Muse Voice Transcribe**).
2. Extracts structured item intents and prices (**Muse Spark**).
3. Selects the sharpest video frame for each item and audits its physical condition (**Muse Wonder**).
4. Cuts out the **real physical object** with pixel-perfect accuracy (**SAM 3.1**).
5. Places the real extracted object onto a clean, studio-lit showcase backdrop (**Muse Image** + RGBA Compositing).
6. Outputs ready-to-render e-commerce **Showcase Cards** complete with the real object photo, studio backdrop, condition badge, and price tag metadata.

---

## 2. Hackathon Model Alignment
To maximize judging criteria, PanDrop chains the complete Meta Model API suite in a single cohesive pipeline:
* **Muse Voice Transcribe (Meta Model API):** Audio-to-text transcription with word/segment-level timestamps.
* **Muse Spark / Muse Spark Open (Meta Model API / Fireworks / Baseten):** Extracts structured JSON listings, SEO titles, descriptions, categories, and pricing from raw spoken transcripts.
* **Muse Wonder (Meta Model API):** Multimodal vision reasoning to select the least blurry video frame around the spoken timestamp, locate the target object's coordinates, and perform an "Honest Condition Audit" (1–10 score + visual inspection notes).
* **SAM 3.1 (Meta Model API):** Generates pixel-perfect segmentation masks of the real object from the chosen frame for both (a) transparent PNG extraction and (b) HUD video overlay masks.
* **Muse Image (Meta Model API):** Generates a studio-grade product photography backdrop/surface tailored to the item category so the real extracted object cutout can be showcased professionally.
* **Muse Glimmer (Open Weights via Modal/Baseten):** Used for high-throughput parallel batch processing when multiple items are detected in a single video.
* **Muse Code:** Used as the primary AI coding agent to scaffold and build the project.

---

## 3. Core User Journey
1. **Capture:** The user uploads a short `.mp4` or `.mov` video scanning their desk/room while speaking (e.g., *"Selling these Sony headphones for $100, barely used, and this mechanical keyboard for $40, the A key is slightly faded."*).
2. **Ingest & Split:** The backend extracts the audio track and samples high-resolution video frames.
3. **Understand & Locate:** The system matches spoken items and prices to exact timestamps, selects the best frame for each object, and locates the object in pixel space.
4. **Extract & Showcase (Core Feature):**
   - **SAM 3.1** isolates the **real object** from the messy room frame as a high-res transparent PNG cutout.
   - **Muse Image** creates a clean studio showcase background.
   - The backend composites the **real object cutout** with a natural studio drop-shadow onto the showcase background (preserving 100% visual authenticity of the seller's real item while making it look like a studio product card).
5. **Serve:** The backend returns a structured JSON payload containing all generated asset URLs (raw crop, transparent cutout, studio showcase image, SAM mask overlay) and metadata (price tag, title, condition score, timestamps) ready for any frontend consumer.

---

## 4. Functional Requirements (Backend Scope)

### FR-1: Video Ingestion & Media Processing
* Accept `.mp4`, `.mov`, or `.webm` video uploads via `POST /api/v1/process-video`.
* Use `ffmpeg` to extract a clean `.mp3`/`.wav` audio file and extract frames at configurable intervals or specific timestamps.

### FR-2: Timestamped Speech Transcription
* Send extracted audio to **Muse Voice Transcribe** to obtain transcript segments with start/end timestamps (in seconds).

### FR-3: Intent & Price Tag Extraction
* Pass timestamped transcript segments to **Muse Spark** to extract a JSON array of items for sale, including:
  * `spoken_name`
  * `asking_price` (numeric value + formatted string like `"$100"`)
  * `spoken_condition`
  * `timestamp_sec` (exact second the item was mentioned)
  * `category`

### FR-4: Best-Frame Selection & Visual Condition Audit
* For each detected item, sample candidate frames within `[timestamp_sec - 1.5s, timestamp_sec + 1.5s]`.
* Pass candidate frames to **Muse Wonder** to:
  1. Select the sharpest, best-framed image of the target object.
  2. Return the bounding box `[x_min, y_min, x_max, y_max]` and center point `[x, y]` of the object.
  3. Generate a visual `condition_score` (1–10) and `condition_summary` verifying the user's spoken claim.

### FR-5: Real Object Extraction (SAM 3.1)
* Pass the selected frame, bounding box/point coordinates, and text prompt to **SAM 3.1**.
* Generate:
  1. A binary segmentation mask (`mask.png`).
  2. A colored HUD overlay image (`hud_overlay.png`).
  3. A cropped, transparent RGBA cutout of the **real physical object** (`real_cutout.png`).

### FR-6: Studio Showcase Compositing (Muse Image + Pillow)
* Generate or transform the background using **Muse Image** to create a clean studio surface matching the item's category.
* Composite the **real object cutout** (`real_cutout.png`) centered on the studio background with a realistic soft drop shadow, ensuring the actual product remains 100% genuine while looking like a professional e-commerce showcase (`showcase_card.png`).
* Also optionally generate a pre-badged image (`showcase_with_pricetag.png`) that renders the price badge directly onto the showcase image for instant sharing.

---

## 5. Non-Functional Requirements
* **Parallel Execution:** Item pipelines (Step 4 to Step 6) must run concurrently via `asyncio.gather` so processing 3 items takes the same time as processing 1 item.
* **Demo Reliability (Fallback Mode):** All external model calls must support retry logic and a deterministic fallback/mock mode (`USE_MOCK_MODELS=false` by default) so local pipeline testing works offline and live demos never crash.
* **Self-Contained Asset Serving:** All generated images and masks must be saved to a local `/static/jobs/{job_id}/` directory and served directly via FastAPI `StaticFiles`.

---

## 6. Out of Scope (Phase 1 - Backend Only)
* Frontend React/Next.js UI components (to be built in Phase 2).
* Third-party OAuth integrations (eBay/Facebook Marketplace publishing APIs).
* User authentication and payment processing.