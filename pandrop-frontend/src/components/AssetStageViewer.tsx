import { AnimatePresence, motion } from "framer-motion";
import { Download } from "lucide-react";
import type { AssetStageKey, ItemAssets } from "../types/pandrop";
import { ASSET_STAGES, assetUrlFor } from "../types/pandrop";
import { resolveAssetUrl } from "../lib/api";
import { bboxReadout, formatTimecode, scoreTone } from "../lib/format";

interface StageSource {
  item_id: string;
  timestamp_sec: number;
  bounding_box: [number, number, number, number] | number[];
  condition: { ai_score: number };
  assets: ItemAssets;
}

/**
 * The five-stage pipeline viewer shared by the extraction lab (ItemDetail)
 * and the marketplace listing inspector (ListingDetail).
 */
export default function AssetStageViewer({
  source,
  stage,
  onStageChange,
}: {
  source: StageSource;
  stage: AssetStageKey;
  onStageChange: (stage: AssetStageKey) => void;
}) {
  const bbox = (source.bounding_box ?? [0, 0, 0, 0]) as [number, number, number, number];
  const tone = scoreTone(source.condition.ai_score);
  const scoreColor =
    tone === "high" ? "text-mint" : tone === "mid" ? "text-[#F9A8D4]" : "text-gold";

  return (
    <div className="flex min-w-0 flex-col border-b border-line lg:border-r lg:border-b-0">
      {/* stage tabs */}
      <div className="flex items-stretch overflow-x-auto border-b border-line bg-base/40">
        {ASSET_STAGES.map((s, i) => {
          const active = s.key === stage;
          return (
            <button
              key={s.key}
              onClick={() => onStageChange(s.key)}
              title={s.hint}
              className={`relative flex min-w-fit flex-1 cursor-pointer items-center gap-2 px-3.5 py-3.5 text-[12px] font-bold whitespace-nowrap transition-colors ${
                active ? "text-ink" : "text-faint hover:text-dim"
              }`}
            >
              <span
                className={`font-mono text-[10.5px] font-semibold ${active ? "text-pink" : "text-faint"}`}
              >
                {i + 1}
              </span>
              {s.label}
              {active && (
                <motion.span
                  layoutId={`stage-underline-${source.item_id}`}
                  className="brand-gradient absolute inset-x-3 bottom-0 h-0.5 rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* viewer */}
      <div className="checker-bg relative aspect-[4/3] w-full overflow-hidden bg-black/40">
        <AnimatePresence mode="sync">
          <motion.img
            key={`${source.item_id}-${stage}`}
            src={resolveAssetUrl(assetUrlFor(source, stage))}
            alt={`${source.item_id} — ${stage}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            className="absolute inset-0 h-full w-full object-contain"
            draggable={false}
          />
        </AnimatePresence>
        <AnimatePresence mode="sync">
          <motion.div
            key={`sweep-${source.item_id}-${stage}`}
            initial={{ x: "-30%" }}
            animate={{ x: "430%" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.85, ease: "easeInOut" }}
            className="pointer-events-none absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-pink/15 to-transparent"
          />
        </AnimatePresence>
        <span className="absolute top-3 left-3 rounded-full bg-black/60 px-3 py-1 text-[11.5px] font-bold text-white/90 backdrop-blur-sm">
          {ASSET_STAGES.find((s) => s.key === stage)?.label}
        </span>
      </div>

      {/* telemetry row */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-line px-5 py-3.5 font-mono text-[11px] font-semibold text-faint">
        <span>
          T+<span className="text-dim">{formatTimecode(source.timestamp_sec)}</span>
        </span>
        <span>
          BBOX <span className="text-dim">{bboxReadout(bbox)}</span>
        </span>
        <span>
          SCORE <span className={scoreColor}>{source.condition.ai_score.toFixed(1)}</span>
        </span>
        <a
          href={resolveAssetUrl(assetUrlFor(source, stage))}
          download={`${source.item_id}_${stage}.png`}
          onClick={(e) => {
            const url = resolveAssetUrl(assetUrlFor(source, stage));
            if (url.startsWith("http")) {
              e.preventDefault();
              window.open(url, "_blank");
            }
          }}
          className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-mute transition hover:border-pink/45 hover:text-ink"
        >
          <Download size={13} />
          PNG
        </a>
      </div>
    </div>
  );
}
