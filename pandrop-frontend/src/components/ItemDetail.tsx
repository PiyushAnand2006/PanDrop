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
      className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[10px] tracking-[0.14em] text-dim transition hover:border-neon/40 hover:text-ink"
      aria-label={`Copy ${label}`}
    >
      {ok ? <Check size={11} className="text-mint" /> : <Copy size={11} />}
      {ok ? "COPIED" : "COPY"}
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
    tone === "high" ? "text-mint" : tone === "mid" ? "text-neon" : "text-gold";

  return (
    <motion.div
      initial={{ opacity: 0.92 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-3 backdrop-blur-md sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Asset lab — ${item.spoken_name}`}
    >
      <motion.div
        initial={{ y: 34, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="hud-corners glass grid max-h-[92vh] w-full max-w-6xl grid-cols-1 overflow-hidden rounded-2xl lg:grid-cols-[1.12fr_0.88fr]"
      >
        {/* ------------------------------------------------------ */}
        {/* Left: stage viewer                                      */}
        {/* ------------------------------------------------------ */}
        <div className="flex min-w-0 flex-col border-b border-line lg:border-r lg:border-b-0">
          {/* stage tabs */}
          <div className="flex items-stretch overflow-x-auto border-b border-line">
            {ASSET_STAGES.map((s, i) => {
              const active = s.key === stage;
              return (
                <button
                  key={s.key}
                  onClick={() => setStage(s.key)}
                  title={s.hint}
                  className={`relative flex min-w-fit flex-1 items-center gap-2 px-3.5 py-3 font-mono text-[9.5px] tracking-[0.14em] whitespace-nowrap transition-colors ${
                    active ? "text-neon" : "text-faint hover:text-dim"
                  }`}
                >
                  <span className={active ? "text-neon/60" : "text-faint/50"}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {s.label}
                  {active && (
                    <motion.span
                      layoutId="stage-underline"
                      className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-neon shadow-[0_0_8px_rgba(0,240,255,0.7)]"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* viewer */}
          <div className="checker-bg relative aspect-[4/3] w-full overflow-hidden bg-[#05060a]">
            <AnimatePresence mode="sync">
              <motion.img
                key={`${item.item_id}-${stage}`}
                src={resolveAssetUrl(assetUrlFor(item, stage))}
                alt={`${item.spoken_name} — ${stage}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.32 }}
                className="absolute inset-0 h-full w-full object-contain"
                draggable={false}
              />
            </AnimatePresence>
            {/* sweep on change */}
            <AnimatePresence mode="sync">
              <motion.div
                key={`sweep-${item.item_id}-${stage}`}
                initial={{ x: "-30%" }}
                animate={{ x: "430%" }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: "easeInOut" }}
                className="pointer-events-none absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-neon/12 to-transparent"
              />
            </AnimatePresence>
            <span className="absolute top-3 left-3 rounded-md border border-white/10 bg-black/55 px-2 py-1 font-mono text-[9.5px] tracking-[0.2em] text-ink/80 backdrop-blur-sm">
              {ASSET_STAGES.find((s) => s.key === stage)?.label}
            </span>
          </div>

          {/* telemetry row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-line px-5 py-3 font-mono text-[10px] tracking-[0.12em] text-faint">
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
                if (resolveAssetUrl(assetUrlFor(item, stage)).startsWith("http")) {
                  e.preventDefault();
                  window.open(resolveAssetUrl(assetUrlFor(item, stage)), "_blank");
                }
              }}
              className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-dim transition hover:border-neon/40 hover:text-ink"
            >
              <Download size={12} />
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
              <p className="mb-1.5 font-mono text-[10px] tracking-[0.2em] text-faint uppercase">
                {item.item_id} · spoken: “{item.spoken_name}”
              </p>
              <h3 className="text-[21px] leading-snug font-extrabold tracking-tight text-ink">
                {item.seo_title}
              </h3>
            </div>
            <button
              onClick={onClose}
              aria-label="Close asset lab"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-dim transition hover:border-ember/50 hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>

          {/* price */}
          <div className="mb-6 flex items-center gap-3">
            <PriceTag formatted={item.price.formatted} size="lg" />
            <div className="font-mono text-[10px] leading-relaxed tracking-[0.16em] text-faint">
              ASKING PRICE
              <br />
              <span className="text-dim">{item.price.currency}</span>
            </div>
          </div>

          {/* condition audit */}
          <SectionLabel>Condition audit</SectionLabel>
          <div className="mb-6 space-y-3 rounded-xl border border-line bg-black/25 p-4">
            <div className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-neon/25 bg-neon/[0.07] text-neon/90">
                <Mic size={13} />
              </span>
              <p className="text-[12.5px] text-dim italic">“{item.condition.spoken_claim}”</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-mint/35 bg-mint/[0.1] text-mint">
                <ShieldCheck size={13} />
              </span>
              <div className="min-w-0">
                <p className="font-mono text-[11.5px] font-bold text-mint">
                  {item.condition.ai_badge_text}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-dim">
                  {item.condition.ai_visual_notes}
                </p>
              </div>
            </div>
          </div>

          {/* listing copy */}
          <SectionLabel right={<CopyButton text={item.seo_title} label="SEO title" />}>
            SEO title
          </SectionLabel>
          <p className="mb-5 text-[13px] leading-relaxed text-ink/90">{item.seo_title}</p>

          <SectionLabel right={<CopyButton text={item.description} label="description" />}>
            Description
          </SectionLabel>
          <p className="mb-5 text-[13px] leading-relaxed text-dim">{item.description}</p>

          {item.tags && item.tags.length > 0 && (
            <>
              <SectionLabel>Tags</SectionLabel>
              <div className="mb-6 flex flex-wrap gap-1.5">
                {item.tags.map((t) => (
                  <Chip key={t}>#{t}</Chip>
                ))}
              </div>
            </>
          )}

          {/* actions */}
          <div className="flex flex-wrap items-center gap-2.5 border-t border-line pt-5">
            <button className="inline-flex items-center gap-2 rounded-xl border border-neon/45 bg-neon/[0.1] px-4 py-2.5 text-[12.5px] font-bold text-[#8DF4FF] transition hover:bg-neon/[0.18] hover:shadow-[0_0_22px_rgba(0,240,255,0.25)]">
              <ListPlus size={15} />
              List to Marketplace
            </button>
            <span className="font-mono text-[9.5px] tracking-[0.14em] text-faint">
              DEMO ACTION — CONNECT AN ADAPTER
            </span>
          </div>

          {/* prev / next */}
          <div className="mt-5 flex items-center justify-between">
            <button
              disabled={idx <= 0}
              onClick={() => onNavigate(items[idx - 1])}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] text-dim transition enabled:hover:border-neon/40 enabled:hover:text-ink disabled:opacity-30"
            >
              <ChevronLeft size={13} /> PREV
            </button>
            <span className="font-mono text-[10px] tracking-[0.2em] text-faint">
              {idx + 1} / {items.length}
            </span>
            <button
              disabled={idx >= items.length - 1}
              onClick={() => onNavigate(items[idx + 1])}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] text-dim transition enabled:hover:border-neon/40 enabled:hover:text-ink disabled:opacity-30"
            >
              NEXT <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
