/**
 * PanDrop API contract — mirrors pandrop-backend/app/schemas.py (v2 marketplace).
 * The FastAPI backend runs at VITE_API_BASE_URL || http://localhost:8000
 */

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
  formatted: string; // e.g. "$100"
}

export interface ConditionAudit {
  spoken_claim: string;
  ai_score: number; // e.g. 9.2
  ai_badge_text: string; // e.g. "9.2/10 • Verified Clean"
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
  tags?: string[];
}

export type JobStatus = "processing" | "completed" | "failed";

export interface JobResponse {
  job_id: string;
  user_id: string;
  status: JobStatus;
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

export interface PublishItemOverride {
  price?: number | null;
  seo_title?: string | null;
}

export interface ListingQuery {
  q?: string;
  category?: string;
  min_price?: number | null;
  max_price?: number | null;
  min_condition?: number | null;
  status?: "active" | "sold" | "";
}

/** The five asset stages the pipeline produces for every item, in order. */
export const ASSET_STAGES = [
  { key: "raw", label: "Raw frame", hint: "Best frame pulled from the source video" },
  { key: "sam", label: "SAM 3.1 seg", hint: "Segment-Anything mask + HUD overlay" },
  { key: "cutout", label: "Real cutout", hint: "Alpha-extracted product PNG" },
  { key: "studio", label: "Studio showcase", hint: "Composited studio-lit hero shot" },
  { key: "pricetag", label: "Price tag", hint: "Showcase with AI price tag burned in" },
] as const;

export type AssetStageKey = (typeof ASSET_STAGES)[number]["key"];

/** Works for ShowcaseItem and MarketplaceListing alike (structural typing). */
export function assetUrlFor(source: { assets: ItemAssets }, stage: AssetStageKey): string {
  switch (stage) {
    case "raw":
      return source.assets.raw_frame_url;
    case "sam":
      return source.assets.sam_mask_overlay_url;
    case "cutout":
      return source.assets.real_cutout_png_url;
    case "studio":
      return source.assets.studio_showcase_url;
    case "pricetag":
      return source.assets.showcase_with_pricetag_url;
  }
}
