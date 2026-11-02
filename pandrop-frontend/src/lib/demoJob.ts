import type { JobResponse, ShowcaseItem } from "../types/pandrop";
import { DEMO_PRODUCTS, buildDemoAssets } from "./demoAssets";

export const DEMO_JOB_ID = "demo-showcase";

interface DemoSpec {
  product: keyof typeof DEMO_PRODUCTS;
  item_id: string;
  spoken_name: string;
  seo_title: string;
  category: string;
  amount: number;
  timestamp_sec: number;
  score: number;
  badge: string;
  claim: string;
  notes: string;
  description: string;
  tags: string[];
  bbox: [number, number, number, number];
}

const SPECS: DemoSpec[] = [
  {
    product: "headphones",
    item_id: "item_1",
    spoken_name: "these Sony headphones",
    seo_title: "Sony Wireless Over-Ear Headphones — 9.2/10 Verified Clean",
    category: "Audio",
    amount: 100,
    timestamp_sec: 0.4,
    score: 9.2,
    badge: "9.2/10 • Verified Clean",
    claim: "barely used, still in box",
    notes:
      "Driver grilles show no mesh dents; headband padding retains full loft. Cup finish is uniform with zero micro-scratches under studio lighting.",
    description:
      "Flagship wireless over-ear headphones, barely used and stored in box. AI condition audit scored them 9.2/10 — verified clean across grilles, band and cups. Priced at $100. Ships as shown in the studio showcase photo.",
    tags: ["sony", "headphones", "wireless", "audio", "verified-clean"],
    bbox: [168, 112, 472, 346],
  },
  {
    product: "keyboard",
    item_id: "item_2",
    spoken_name: "this mechanical keyboard",
    seo_title: "75% Hot-Swappable Mechanical Keyboard — RGB, Great Condition",
    category: "Electronics",
    amount: 40,
    timestamp_sec: 2.0,
    score: 8.7,
    badge: "8.7/10 • Good Condition",
    claim: "great condition, brand new switches",
    notes:
      "Keycap legends crisp with no shine on alphas; deck shows light dust in the well only. Backlight strip fully uniform.",
    description:
      "Compact 75% hot-swappable mechanical keyboard with fresh switches and even RGB underglow. AI audit: 8.7/10 — good condition with crisp keycaps. Priced at $40. Ships as shown in the studio showcase photo.",
    tags: ["mechanical-keyboard", "hot-swap", "rgb", "75-percent"],
    bbox: [156, 186, 484, 336],
  },
  {
    product: "camera",
    item_id: "item_3",
    spoken_name: "this vintage Canon AE-1",
    seo_title: "Canon AE-1 35mm Film Camera (1984) — Working, Light Seals OK",
    category: "Cameras",
    amount: 85,
    timestamp_sec: 3.6,
    score: 8.9,
    badge: "8.9/10 • Verified Working",
    claim: "works perfectly",
    notes:
      "Lens glass clear — no fungus or haze under backlight check. Leatherette intact; minor brassing on the top plate consistent with age.",
    description:
      "Iconic 1984 Canon AE-1 35mm SLR, fully working with clean glass and intact light seals. AI audit: 8.9/10 — honest vintage wear, verified working. Priced at $85. Ships as shown in the studio showcase photo.",
    tags: ["canon", "ae-1", "film-camera", "35mm", "vintage"],
    bbox: [172, 146, 468, 326],
  },
  {
    product: "sneaker",
    item_id: "item_4",
    spoken_name: "Nike Air Force 1s, size 10",
    seo_title: "Nike Air Force 1 '07 — US 10, Worn Once, Gum Sole",
    category: "Footwear",
    amount: 60,
    timestamp_sec: 5.1,
    score: 9.4,
    badge: "9.4/10 • Verified Clean",
    claim: "worn once",
    notes:
      "Outsole tread depth essentially factory; midsole paint uncreased. Upper stitching perfect with no yellowing on the toe cap.",
    description:
      "Nike Air Force 1 '07 in US 10, worn once — tread and midsole are effectively factory fresh. AI audit: 9.4/10, verified clean. Priced at $60. Ships as shown in the studio showcase photo.",
    tags: ["nike", "air-force-1", "sneakers", "us-10", "worn-once"],
    bbox: [168, 200, 472, 346],
  },
];

let cached: JobResponse | null = null;

/** The instant demo preset — a finished JobResponse with fully synthesized assets. */
export function buildDemoJob(): JobResponse {
  if (cached) return cached;
  const items: ShowcaseItem[] = SPECS.map((spec) => {
    const product = DEMO_PRODUCTS[spec.product];
    const assets = buildDemoAssets(product, `$${spec.amount}`);
    return {
      item_id: spec.item_id,
      spoken_name: spec.spoken_name,
      seo_title: spec.seo_title,
      category: spec.category,
      price: { amount: spec.amount, currency: "USD", formatted: `$${spec.amount}` },
      timestamp_sec: spec.timestamp_sec,
      condition: {
        spoken_claim: spec.claim,
        ai_score: spec.score,
        ai_badge_text: spec.badge,
        ai_visual_notes: spec.notes,
      },
      description: spec.description,
      bounding_box: spec.bbox,
      tags: spec.tags,
      assets: {
        raw_frame_url: assets.raw,
        sam_mask_overlay_url: assets.sam,
        real_cutout_png_url: assets.cutout,
        studio_showcase_url: assets.studio,
        showcase_with_pricetag_url: assets.pricetag,
      },
    };
  });

  cached = {
    job_id: DEMO_JOB_ID,
    status: "completed",
    video_url: "",
    duration_sec: 6.4,
    transcript:
      "Okay, quick drop today. These Sony headphones — barely used, still in box — 100 dollars. " +
      "Next, this mechanical keyboard, 40 dollars, great condition, brand new switches. " +
      "Then this vintage Canon AE-1, works perfectly, asking 85. " +
      "And finally, Nike Air Force 1s, size 10, worn once — 60 dollars.",
    items,
  };
  return cached;
}
