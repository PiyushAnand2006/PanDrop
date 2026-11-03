
---

# 4. Updated `MASTER_FRONTEND_PROMPT.md` (Paste into `glm-flash-5.3` — Frontend Only)

```markdown
# MASTER PROMPT: Build the Complete PanDrop Frontend (Unified AI Video-to-Showcase P2P Marketplace)

## ROLE & OBJECTIVE
You are a Staff Frontend Engineer and Product Designer building the frontend for **PanDrop ("Point, Talk, Sell & Discover")** for the Meta Global AI Developer Hackathon.

Build a sleek, dark-mode-first **AI Video-to-Showcase P2P Marketplace** in `pandrop-frontend/` using **Vite + React 18 + TypeScript + Tailwind CSS + Framer Motion + Lucide React** that connects to our FastAPI backend (`http://localhost:8000`).

## 🚨 CORE PRODUCT ARCHITECTURE (UNIFIED ACCOUNTS)
1. **Single Unified Account System (No Separate Buyer/Seller Accounts):**
   - Every user account can **both Extract/Post items for sale AND Search/Inspect/Buy items from other users**.
   - Include a top-bar **Unified Account Switcher + Create Account Modal** showing the active user's avatar, name, and live wallet balance (e.g., `Alex Chen • $650`).
   - Switching accounts in 1 click (e.g. from `@alex_chen` to `@maya_lin`) immediately updates the UI so a judge can extract & post an item as Alex, switch to Maya in 1 click, search for Alex's item on the Discovery page, inspect its SAM 3.1 cutout & raw video frame, and buy it!

2. **Three Core Navigation Views in the Top Bar:**
   - **`🧭 Discover & Search` (Marketplace Feed):** Search bar, category pills, price & AI condition score filters, and interactive **Showcase Listing Cards** posted by all users.
   - **`🎬 AI Sell Studio (Extract & Post)`:** Upload or record a room scan video, watch the 5-step Meta AI pipeline (`Muse Voice`, `Muse Spark`, `Muse Wonder`, `SAM 3.1`, `Muse Image`) extract the real objects into Studio Showcase Cards with floating price tags, tweak prices/titles, and click **"Post to Marketplace"**.
   - **`👤 My Account Hub (Selling + Buying)`:** Unified dashboard for the current account showing:
     - **My Active Listings** (items I posted for sale)
     - **My Sold Items** (items other users bought from me + earnings)
     - **My Purchases** (items I bought from other users)
     - **My Extraction Jobs** (past room scan videos)

---

## 1. EXACT BACKEND API CONTRACT (`src/types/pandrop.ts`)
Base URL: `const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"`.
Always resolve relative asset URLs (`/static/jobs/...`) by prepending `API_BASE`.

```typescript
export interface UserAccount {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  location: string;
  wallet_balance: number;
  created_at: string;
}

export interface PriceInfo {
  amount: number;
  currency: string;
  formatted: string;
}

export interface ConditionAudit {
  spoken_claim: string;
  ai_score: number;
  ai_badge_text: string;
  ai_visual_notes: string;
}

export interface ItemAssets {
  raw_frame_url: string;
  sam_mask_overlay_url: string;
  real_cutout_png_url: string;
  studio_showcase_url: string;
  showcase_with_pricetag_url: string;
}

export interface ShowcaseItem {
  item_id: string;
  spoken_name: string;
  seo_title: string;
  category: string;
  price: PriceInfo;
  timestamp_sec: number;
  condition: ConditionAudit;
  description: string;
  bounding_box: [number, number, number, number];
  assets: ItemAssets;
  is_published: boolean;
  published_listing_id?: string | null;
}

export interface JobResponse {
  job_id: string;
  user_id: string;
  status: string;
  video_url: string;
  duration_sec: number;
  transcript: string;
  items: ShowcaseItem[];
  created_at: string;
}

export interface MarketplaceListing {
  listing_id: string;
  job_id: string;
  item_id: string;
  seller_id: string;
  seller_name: string;
  seller_username: string;
  seller_avatar: string;
  seller_location: string;
  status: "active" | "sold";
  buyer_id?: string | null;
  buyer_name?: string | null;
  sold_at?: string | null;
  spoken_name: string;
  seo_title: string;
  category: string;
  price: PriceInfo;
  timestamp_sec: number;
  video_url: string;
  condition: ConditionAudit;
  description: string;
  bounding_box: [number, number, number, number];
  assets: ItemAssets;
  created_at: string;
}

export interface UserDashboardResponse {
  user: UserAccount;
  extraction_jobs: JobResponse[];
  active_listings: MarketplaceListing[];
  sold_listings: MarketplaceListing[];
  purchased_listings: MarketplaceListing[];
}