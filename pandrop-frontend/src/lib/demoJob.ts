import type { JobResponse } from "../types/pandrop";

export const DEMO_JOB_ID = "demo-showcase";

/**
 * "Load Instant Demo Showcase" preset.
 *
 * Everything here is REAL pipeline output: the bundled clip is the actual
 * sample video recorded for the repo, and every artifact (raw frame, SAM 3.1
 * overlay, cutout, studio composite, price-tag burn-in) was produced by the
 * PanDrop backend for that clip — copied verbatim into /public/demo.
 * No imagery is synthesized in the frontend.
 *
 * The only presentational tweak: the offline pipeline reports timestamp_sec 0.0
 * for both items, so marker positions are spread to match the transcript pacing
 * ("…Sony headphones… and this mechanical keyboard…" across the 6 s clip).
 */

const SRC = "/demo";

let cached: JobResponse | null = null;

export function buildDemoJob(): JobResponse {
  if (cached) return cached;
  cached = {
    job_id: "job_2be39738",
    user_id: "",
    status: "completed",
    video_url: `${SRC}/sample.mp4`,
    duration_sec: 6.0,
    created_at: "",
    transcript:
      "Selling these Sony headphones for 100 dollars, barely used, and this mechanical keyboard for 40 dollars, good condition",
    items: [
      {
        item_id: "item_1",
        spoken_name: "Sony headphones",
        seo_title: "Sony headphones — General",
        category: "General",
        price: { amount: 100, currency: "USD", formatted: "$100" },
        timestamp_sec: 0.4,
        condition: {
          spoken_claim: "barely used",
          ai_score: 8.5,
          ai_badge_text: "8.5/10 • Good Condition",
          ai_visual_notes:
            '"Sony headphones" is centred and in focus in the selected frame (sharpness 522.4). No major visible damage detected by the offline audit.',
        },
        description:
          'Sony headphones in barely used. AI condition audit: 8.5/10. "Sony headphones" is centred and in focus in the selected frame (sharpness 522.4). No major visible damage detected by the offline audit. Priced at $100. Ships as shown in the studio showcase photo.',
        bounding_box: [144, 108, 496, 372],
        is_published: false,
        published_listing_id: null,
        tags: ["sony", "headphones", "general"],
        assets: {
          raw_frame_url: `${SRC}/item_1/raw_frame.jpg`,
          sam_mask_overlay_url: `${SRC}/item_1/sam_hud_overlay.png`,
          real_cutout_png_url: `${SRC}/item_1/real_cutout.png`,
          studio_showcase_url: `${SRC}/item_1/studio_showcase.png`,
          showcase_with_pricetag_url: `${SRC}/item_1/showcase_pricetag.png`,
        },
      },
      {
        item_id: "item_2",
        spoken_name: "mechanical keyboard",
        seo_title: "mechanical keyboard — General",
        category: "General",
        price: { amount: 40, currency: "USD", formatted: "$40" },
        timestamp_sec: 3.4,
        condition: {
          spoken_claim: "good condition",
          ai_score: 8.5,
          ai_badge_text: "8.5/10 • Good Condition",
          ai_visual_notes:
            '"mechanical keyboard" is centred and in focus in the selected frame (sharpness 522.4). No major visible damage detected by the offline audit.',
        },
        description:
          'mechanical keyboard in good condition. AI condition audit: 8.5/10. "mechanical keyboard" is centred and in focus in the selected frame (sharpness 522.4). No major visible damage detected by the offline audit. Priced at $40. Ships as shown in the studio showcase photo.',
        bounding_box: [144, 108, 496, 372],
        is_published: false,
        published_listing_id: null,
        tags: ["mechanical", "keyboard", "general"],
        assets: {
          raw_frame_url: `${SRC}/item_2/raw_frame.jpg`,
          sam_mask_overlay_url: `${SRC}/item_2/sam_hud_overlay.png`,
          real_cutout_png_url: `${SRC}/item_2/real_cutout.png`,
          studio_showcase_url: `${SRC}/item_2/studio_showcase.png`,
          showcase_with_pricetag_url: `${SRC}/item_2/showcase_pricetag.png`,
        },
      },
    ],
  };
  return cached;
}
