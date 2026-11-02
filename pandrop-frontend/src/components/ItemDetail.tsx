import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ListPlus,
  Mic,
  ShieldCheck,
  X,
} from "lucide-react";
import type { AssetStageKey, ShowcaseItem } from "../types/pandrop";
import { ASSET_STAGES, assetUrlFor } from "../types/pandrop";
import { resolveAssetUrl } from "../lib/api";
import { bboxReadout, copyText, formatTimecode, scoreTone } from "../lib/format";
import { Chip, PriceTag, SectionLabel } from "./atoms";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={async () => {
        if (await copyText(text)) {
          setOk(true);
          setTimeout(() => setOk(false), 1300);
        }
      }}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-[11.5px] font-bold text-mute transition hover:border-pink/45 hover:text-ink"
      aria-label={`Copy ${label}`}
    >
      {ok ? <Check size={12} className="text-mint" /> : <Copy size={12} />}
      {ok ? "Copied" : "Copy"}
    </button>
  );
}

export default function ItemDetail({
  item,
  items,
  onClose,
  onNavigate,
}: {
  item: ShowcaseItem;
  items: ShowcaseItem[];
  onClose: () => void;
  onNavigate: (item: ShowcaseItem) => void;
}) {
  const [stage, setStage] = useState<AssetStageKey>("studio");
  const idx = items.findIndex((it) => it.item_id === item.item_id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && idx < items.length - 1) onNavigate(items[idx + 1]);
      if (e.key === "ArrowLeft" && idx > 0) onNavigate(items[idx - 1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, items, onClose, onNavigate]);

  const tone = scoreTone(item.condition.ai_score);
  const scoreColor =
    tone === "high" ? "text-mint" : tone === "mid" ? "text-[#F9A8D4]" : "text-gold";

  return (
    <motion.div
      initial={{ opacity: 0.92 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-3 backdrop-blur-md sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Asset lab — ${item.spoken_name}`}
    >
      <motion.div
        initial={{ y: 34, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="ring-glow grid max-h-[92vh] w-full max-w-6xl grid-cols-1 overflow-hidden rounded-3xl bg-surface shadow-panel lg:grid-cols-[1.12fr_0.88fr]"
      >
        {/* ------------------------------------------------------ */}
        {/* Left: stage viewer                                      */}
        {/* ------------------------------------------------------ */}
        <div className="flex min-w-0 flex-col border-b border-line lg:border-r lg:border-b-0">
          {/* stage tabs */}
          <div className="flex items-stretch overflow-x-auto border-b border-line bg-base/40">
            {ASSET_STAGES.map((s, i) => {
              const active = s.key === stage;
              return (
                <button
                  key={s.key}
                  onClick={() => setStage(s.key)}
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
                      layoutId="stage-underline"
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
                key={`${item.item_id}-${stage}`}
                src={resolveAssetUrl(assetUrlFor(item, stage))}
                alt={`${item.spoken_name} — ${stage}`}
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
                key={`sweep-${item.item_id}-${stage}`}
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
              T+<span className="text-dim">{formatTimecode(item.timestamp_sec)}</span>
            </span>
            <span>
              BBOX <span className="text-dim">{bboxReadout(item.bounding_box)}</span>
            </span>
            <span>
              SCORE <span className={scoreColor}>{item.condition.ai_score.toFixed(1)}</span>
            </span>
            <a
              href={resolveAssetUrl(assetUrlFor(item, stage))}
              download={`${item.item_id}_${stage}.png`}
              onClick={(e) => {
                const url = resolveAssetUrl(assetUrlFor(item, stage));
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

        {/* ------------------------------------------------------ */}
        {/* Right: listing intel                                    */}
        {/* ------------------------------------------------------ */}
        <div className="min-h-0 overflow-y-auto p-6 sm:p-7">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="mb-1 text-[12.5px] font-bold text-faint">
                {item.item_id} · spoken: “{item.spoken_name}”
              </p>
              <h3 className="font-display text-[22px] leading-snug font-semibold text-ink">
                {item.seo_title}
              </h3>
            </div>
            <button
              onClick={onClose}
              aria-label="Close asset lab"
              className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-mute transition hover:border-red-400/50 hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>

          {/* price */}
          <div className="mb-6 flex items-center gap-3.5">
            <PriceTag formatted={item.price.formatted} size="lg" />
            <div className="text-[12px] font-bold leading-relaxed text-faint">
              Asking price
              <br />
              <span className="text-mute">{item.price.currency}</span>
            </div>
          </div>

          {/* condition audit */}
          <SectionLabel>Condition audit</SectionLabel>
          <div className="mb-6 space-y-3.5 rounded-2xl border border-line bg-black/25 px-4 py-4">
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-pink/30 bg-pink/[0.12] text-pink">
                <Mic size={14} />
              </span>
              <p className="text-[13.5px] font-semibold text-dim italic">
                “{item.condition.spoken_claim}”
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-mint/40 bg-mint/[0.12] text-mint">
                <ShieldCheck size={14} />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-[13.5px] text-mint">
                  {item.condition.ai_badge_text}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-mute">
                  {item.condition.ai_visual_notes}
                </p>
              </div>
            </div>
          </div>

          {/* listing copy */}
          <SectionLabel right={<CopyButton text={item.seo_title} label="SEO title" />}>
            SEO title
          </SectionLabel>
          <p className="mb-5 text-[14px] leading-relaxed text-ink/90">{item.seo_title}</p>

          <SectionLabel right={<CopyButton text={item.description} label="description" />}>
            Description
          </SectionLabel>
          <p className="mb-5 text-[14px] leading-relaxed text-mute">{item.description}</p>

          {item.tags && item.tags.length > 0 && (
            <>
              <SectionLabel>Tags</SectionLabel>
              <div className="mb-6 flex flex-wrap gap-2">
                {item.tags.map((t) => (
                  <Chip key={t} tone="neutral">
                    #{t}
                  </Chip>
                ))}
              </div>
            </>
          )}

          {/* actions */}
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
            <button className="btn-primary !px-4 !py-2.5 !text-[13.5px]">
              <ListPlus size={15} />
              List to marketplace
            </button>
            <span className="text-[11.5px] font-bold text-faint">
              Demo action — connect an adapter
            </span>
          </div>

          {/* prev / next */}
          <div className="mt-5 flex items-center justify-between">
            <button
              disabled={idx <= 0}
              onClick={() => onNavigate(items[idx - 1])}
              className="btn-ghost !px-3 !py-1.5 !text-[11.5px] disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft size={13} /> Prev
            </button>
            <span className="font-mono text-[11px] font-semibold text-faint">
              {idx + 1} / {items.length}
            </span>
            <button
              disabled={idx >= items.length - 1}
              onClick={() => onNavigate(items[idx + 1])}
              className="btn-ghost !px-3 !py-1.5 !text-[11.5px] disabled:cursor-not-allowed disabled:opacity-30"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
