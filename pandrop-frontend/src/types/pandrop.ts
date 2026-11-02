/**
 * PanDrop API contract — mirrors pandrop-backend/app/schemas.py exactly.
 * The FastAPI backend runs at VITE_API_BASE_URL || http://localhost:8000
 */

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
  /** Returned by the live backend; optional so demo data stays contract-clean. */
  tags?: string[];
}

export type JobStatus = "processing" | "completed" | "failed";

export interface JobResponse {
  job_id: string;
  status: JobStatus;
  video_url: string;
  duration_sec: number;
  transcript: string;
  items: ShowcaseItem[];
}

export interface HealthResponse {
  status: string;
  service: string;
  mock_ai: boolean;
  version: string;
}

/** The five asset stages the pipeline produces for every item, in order. */
export const ASSET_STAGES = [
  {
    key: "raw",
    label: "RAW FRAME",
    hint: "Best frame pulled from the source video",
  },
  {
    key: "sam",
    label: "SAM 3.1 SEG",
    hint: "Segment-Anything mask + HUD overlay",
  },
  {
    key: "cutout",
    label: "REAL CUTOUT",
    hint: "Alpha-extracted product PNG",
  },
  {
    key: "studio",
    label: "STUDIO SHOWCASE",
    hint: "Composited studio-lit hero shot",
  },
  {
    key: "pricetag",
    label: "PRICE TAG",
    hint: "Showcase with AI price tag burned in",
  },
] as const;

export type AssetStageKey = (typeof ASSET_STAGES)[number]["key"];

export function assetUrlFor(item: ShowcaseItem, stage: AssetStageKey): string {
  switch (stage) {
    case "raw":
      return item.assets.raw_frame_url;
    case "sam":
      return item.assets.sam_mask_overlay_url;
    case "cutout":
      return item.assets.real_cutout_png_url;
    case "studio":
      return item.assets.studio_showcase_url;
    case "pricetag":
      return item.assets.showcase_with_pricetag_url;
  }
}
