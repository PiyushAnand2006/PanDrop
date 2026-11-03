import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ListPlus,
  Mic,
  ShieldCheck,
  X,
} from "lucide-react";
import type { AssetStageKey, ShowcaseItem } from "../types/pandrop";
import { copyText } from "../lib/format";
import { PriceTag, SectionLabel } from "./atoms";
import AssetStageViewer from "./AssetStageViewer";

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
        <AssetStageViewer
          source={item}
          stage={stage}
          onStageChange={setStage}
        />

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

          {/* price + publish state */}
          <div className="mb-6 flex flex-wrap items-center gap-3.5">
            <PriceTag formatted={item.price.formatted} size="lg" />
            <div className="text-[12px] font-bold leading-relaxed text-faint">
              Extracted price
              <br />
              <span className="text-mute">{item.price.currency}</span>
            </div>
            {item.is_published && (
              <span className="ml-auto rounded-full border border-mint/40 bg-mint/[0.12] px-3 py-1.5 text-[12px] font-bold text-[#6EE7B7]">
                Posted to marketplace
              </span>
            )}
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

          {/* actions */}
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
            {!item.is_published ? (
              <button className="btn-primary !px-4 !py-2.5 !text-[13.5px]">
                <ListPlus size={15} />
                Post to marketplace
              </button>
            ) : (
              <span className="text-[12.5px] font-bold text-faint">
                Published as {item.published_listing_id}
              </span>
            )}
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
