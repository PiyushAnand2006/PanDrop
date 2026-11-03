# Product Requirements Document (PRD): PanDrop
**Subtitle:** Point, Talk, Sell & Discover — Unified AI Video-to-Showcase P2P Marketplace  
**Hackathon Track:** Build for Your World (Meta Global AI Developer Hackathon)  
**Participation Type:** Solo Developer  

---

## 1. Executive Summary
Selling and buying second-hand items online is broken:
- **For Sellers:** Taking photos, cleaning messy backgrounds, cropping, pricing, and typing descriptions takes hours.
- **For Buyers:** Buyers don't trust stock photos or vague "like new" claims on Craigslist/eBay.

**PanDrop** is a unified peer-to-peer AI marketplace where **every user account can both Buy and Sell** without separate account types:
1. **Extract & Post (Selling):** Any user records a 15-second video panning across their room while talking about items they want to sell. Meta's AI pipeline extracts the **real object photo** (**SAM 3.1**), audits its condition (**Muse Wonder**), places it on a studio showcase card with a price tag (**Muse Image** + **Muse Spark**), and lets the user **Post** it to the live marketplace in one click.
2. **Discover, Search & Inspect (Buying):** Any user can browse the **Discovery Feed** or **Search/Filter** listed items. Before buying, users can **Inspect** any listing to view the **Real SAM 3.1 Cutout**, the **Raw Room Frame**, the **Video Timestamp Proof**, and the **Muse Wonder 10-Point Condition Audit**, then purchase it immediately.

---

## 2. Meta Model Pipeline Integration
* **Muse Voice Transcribe (Meta Model API):** Converts the seller's spoken room tour into timestamped text segments.
* **Muse Spark / Muse Spark Open (Meta Model API / Fireworks / Baseten):** Extracts structured item intents, prices, categories, SEO titles, and descriptions; also powers semantic search filtering.
* **Muse Wonder (Meta Model API):** Picks the sharpest video frame around each item's timestamp, outputs bounding box coordinates, and performs an unbiased **10-Point Visual Condition Audit**.
* **SAM 3.1 (Meta Model API):** Segments the **real physical object** out of the video frame to generate both a transparent RGBA cutout (`real_cutout.png`) and a glowing HUD verification mask (`sam_hud_overlay.png`).
* **Muse Image (Meta Model API):** Generates a studio-grade product backdrop so the real extracted object cutout is showcased with a floating price tag (`studio_showcase.png`).
* **Muse Code:** Used to build and test the backend architecture.

---

## 3. Core Functional Modules

### Module A: Unified Account System (Buy & Sell in One Account)
* Every user has a single unified account (`UserAccount`) with both selling and buying capabilities enabled automatically.
* Includes a **Wallet Balance** (e.g., `$500.00` demo balance), **My Active Listings**, **My Sold Items**, and **My Purchased Items**.
* Includes both custom account creation and **1-Click Demo Account Switching** (e.g., switch between `@alex_seller` and `@maya_buyer` instantly during live judging to demonstrate posting from one account and inspecting/buying from another).

### Module B: AI Extraction & Posting Studio (Per Account)
* Any logged-in user can upload or record a short room scan video.
* The pipeline extracts all spoken items into interactive **Draft Showcase Cards** showing the **Real Object Cutout on a Studio Backdrop + Price Tag**.
* The user can edit the price/title and click **"Post Item to Marketplace"** (or **"Post All Extracted Items"**) to publish them live under their account.

### Module C: Discovery Feed & Search Engine
* Public marketplace feed accessible to all accounts.
* **Search & Filters:**
  * Keyword search (matches `seo_title`, `spoken_name`, `description`, `category`).
  * Category filter (`All`, `Electronics`, `Furniture`, `Audio`, `Accessories`, etc.).
  * Price range filter (`min_price`, `max_price`).
  * Minimum AI Condition Score filter (e.g., `8.0+ Verified`).

### Module D: Deep Authenticity Inspector & Instant Purchase
* When browsing the Discovery page, clicking any item opens the **Authenticity Inspector Modal**:
  * **4-Way Visual Verification:** Switch between `✨ Studio Showcase`, `✂️ SAM 3.1 Real Cutout`, `🎯 SAM 3.1 HUD Mask`, and `📸 Raw Room Frame`.
  * **Video Proof Player:** Jumps directly to `timestamp_sec` in the seller's original room video.
  * **Muse Wonder Condition Report:** Compares the seller's spoken claim vs. AI visual inspection notes.
  * **Instant Buy Button:** Any other account can click **"Buy Now"** to purchase the item, transferring funds and marking the item as `sold`.