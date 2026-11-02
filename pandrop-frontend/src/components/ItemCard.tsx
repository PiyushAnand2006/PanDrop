import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
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
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => onOpen(item)}
      className={`card card-hover group relative cursor-pointer overflow-hidden rounded-3xl text-left ${
        active ? "border-pink/60 shadow-glow-pink" : ""
      }`}
    >
      {/* studio image with price-tag crossfade on hover */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-2">
        <img
          src={resolveAssetUrl(item.assets.studio_showcase_url)}
          alt={`${item.spoken_name} — studio showcase`}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          draggable={false}
        />
        <img
          src={resolveAssetUrl(item.assets.showcase_with_pricetag_url)}
          alt=""
          aria-hidden
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-400 group-hover:opacity-100"
          draggable={false}
        />

        {/* timestamp chip */}
        <span className="absolute top-3 left-3 inline-flex items-center rounded-full bg-black/55 px-2.5 py-1 font-mono text-[11px] font-semibold text-white/90 backdrop-blur-sm">
          {formatShortTime(item.timestamp_sec)}
        </span>

        {/* price tag */}
        <span className="absolute top-3 right-3">
          <PriceTag formatted={item.price.formatted} size="sm" />
        </span>

        {/* ON AIR indicator */}
        {active && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-pink/50 bg-pink/25 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
            <span className="anim-pulse-dot h-1.5 w-1.5 rounded-full bg-pink" />
            On screen now
          </span>
        )}

        {/* open-lab hint */}
        <span className="absolute right-3 bottom-3 inline-flex translate-y-1.5 items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          Open asset lab <ArrowUpRight size={12} />
        </span>
      </div>

      {/* meta */}
      <div className="space-y-3 px-5 py-4">
        <p className="truncate font-display text-[16px] font-semibold text-ink">
          {item.spoken_name}
        </p>
        <div className="flex items-center gap-2">
          <ConditionBadge text={item.condition.ai_badge_text} compact />
          <span className="ml-auto text-[12px] font-bold text-faint">{item.category}</span>
        </div>
      </div>
    </motion.button>
  );
}
