import { motion } from "framer-motion";
import { ArrowUpRight, Crosshair } from "lucide-react";
import type { ShowcaseItem } from "../types/pandrop";
import { resolveAssetUrl } from "../lib/api";
import { formatShortTime } from "../lib/format";
import { ConditionBadge, PriceTag } from "./atoms";

export default function ItemCard({
  item,
  index,
  active,
  onOpen,
}: {
  item: ShowcaseItem;
  index: number;
  active: boolean;
  onOpen: (item: ShowcaseItem) => void;
}) {
  return (
    <motion.button
      layout
      initial={{ y: 24 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.55, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => onOpen(item)}
      className={`group relative overflow-hidden rounded-2xl border text-left transition-all duration-300 ${
        active
          ? "border-neon/55 shadow-glow-neon"
          : "border-line hover:border-neon/35 hover:shadow-[0_18px_50px_rgba(0,240,255,0.10)]"
      }`}
    >
      {/* studio image with price-tag crossfade on hover */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-panel-2">
        <img
          src={resolveAssetUrl(item.assets.studio_showcase_url)}
          alt={item.spoken_name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.045]"
          draggable={false}
        />
        <img
          src={resolveAssetUrl(item.assets.showcase_with_pricetag_url)}
          alt=""
          aria-hidden
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          draggable={false}
        />

        {/* timestamp chip */}
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-black/55 px-2 py-1 font-mono text-[10px] tracking-[0.14em] text-ink/90 backdrop-blur-md">
          <Crosshair size={11} className="text-neon" />
          T+{formatShortTime(item.timestamp_sec)}
        </span>

        {/* price tag */}
        <span className="absolute top-3 right-3">
          <PriceTag formatted={item.price.formatted} size="sm" />
        </span>

        {/* ON AIR indicator */}
        {active && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-md border border-neon/50 bg-neon/15 px-2 py-1 font-mono text-[9.5px] tracking-[0.2em] text-neon backdrop-blur-md">
            <span className="anim-pulse-dot h-1.5 w-1.5 rounded-full bg-neon" />
            ON AIR
          </span>
        )}

        {/* open-lab hint */}
        <span className="absolute right-3 bottom-3 inline-flex translate-y-1.5 items-center gap-1 rounded-md bg-black/60 px-2 py-1 font-mono text-[9.5px] tracking-[0.18em] text-[#8DF4FF] opacity-0 backdrop-blur-md transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          OPEN ASSET LAB <ArrowUpRight size={11} />
        </span>
      </div>

      {/* meta */}
      <div className="space-y-2.5 p-4">
        <p className="truncate text-[14.5px] font-bold text-ink">{item.spoken_name}</p>
        <div className="flex items-center gap-2">
          <ConditionBadge text={item.condition.ai_badge_text} compact />
          <span className="ml-auto font-mono text-[10px] tracking-[0.14em] text-faint uppercase">
            {item.category}
          </span>
        </div>
      </div>
    </motion.button>
  );
}
