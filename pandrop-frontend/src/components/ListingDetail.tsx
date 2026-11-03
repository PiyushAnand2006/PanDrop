import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  ShoppingCart,
  X,
} from "lucide-react";
import type { AssetStageKey, MarketplaceListing } from "../types/pandrop";
import { buyListing } from "../lib/api";
import AssetStageViewer from "./AssetStageViewer";
import { PriceTag } from "./atoms";

export default function ListingDetail({
  listing,
  currentUserId,
  onClose,
  onPurchased,
}: {
  listing: MarketplaceListing;
  currentUserId: string;
  onClose: () => void;
  /** Called with the updated listing after a successful purchase. */
  onPurchased: (updated: MarketplaceListing) => void;
}) {
  const [stage, setStage] = useState<AssetStageKey>("studio");
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bought, setBought] = useState<MarketplaceListing | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const view = bought ?? listing;
  const isOwn = view.seller_id === currentUserId;
  const sold = view.status === "sold";

  const handleBuy = async () => {
    setBuying(true);
    setError(null);
    try {
      const updated = await buyListing(view.listing_id, currentUserId);
      setBought(updated);
      onPurchased(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBuying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0.92 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-3 backdrop-blur-md sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Listing — ${view.seo_title}`}
    >
      <motion.div
        initial={{ y: 34, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="ring-glow grid max-h-[92vh] w-full max-w-6xl grid-cols-1 overflow-hidden rounded-3xl bg-surface shadow-panel lg:grid-cols-[1.12fr_0.88fr]"
      >
        {/* -------- left: authenticity inspection -------- */}
        <AssetStageViewer source={view} stage={stage} onStageChange={setStage} />

        {/* -------- right: listing intel + buy -------- */}
        <div className="min-h-0 overflow-y-auto p-6 sm:p-7">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="mb-1.5 text-[12.5px] font-bold text-faint">
                Listing · <span className="font-mono">{view.listing_id}</span>
              </p>
              <h3 className="font-display text-[22px] leading-snug font-semibold text-ink">
                {view.seo_title}
              </h3>
            </div>
            <button
              onClick={onClose}
              aria-label="Close listing"
              className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-mute transition hover:border-red-400/50 hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>

          {/* seller */}
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-line bg-black/25 px-4 py-3.5">
            <img
              src={view.seller_avatar}
              alt={view.seller_name}
              className="h-11 w-11 rounded-full border border-white/15"
            />
            <div className="min-w-0">
              <p className="truncate font-display text-[14.5px] font-semibold text-ink">
                {view.seller_name}
                <span className="ml-1.5 text-[12.5px] font-bold text-faint">
                  @{view.seller_username}
                </span>
              </p>
              <p className="flex items-center gap-1 text-[12px] font-semibold text-faint">
                <MapPin size={11} /> {view.seller_location}
              </p>
            </div>
            <span
              className={`ml-auto rounded-full px-3 py-1 text-[11.5px] font-bold ${
                sold
                  ? "border border-gold/40 bg-gold/[0.12] text-[#FCD34D]"
                  : "border border-mint/40 bg-mint/[0.12] text-[#6EE7B7]"
              }`}
            >
              {sold ? "Sold" : "Active"}
            </span>
          </div>

          {/* price + buy */}
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <PriceTag formatted={view.price.formatted} size="lg" />
            <div className="text-[12px] font-bold leading-relaxed text-faint">
              Asking price
              <br />
              <span className="text-mute">{view.price.currency}</span>
            </div>
            <div className="ml-auto">
              {sold ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/[0.1] px-4 py-2.5 font-display text-[13.5px] font-semibold text-[#FCD34D]">
                  <BadgeCheck size={15} />
                  {view.buyer_name ? `Sold to ${view.buyer_name}` : "Sold"}
                </span>
              ) : isOwn ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.05] px-4 py-2.5 font-display text-[13.5px] font-semibold text-mute">
                  Your listing — waiting for a buyer
                </span>
              ) : (
                <button
                  onClick={handleBuy}
                  disabled={buying}
                  className="btn-primary disabled:cursor-wait disabled:opacity-70"
                >
                  <ShoppingCart size={16} />
                  {buying ? "Buying…" : "Buy now"}
                </button>
              )}
            </div>
          </div>

          {/* purchase success */}
          {bought && (
            <motion.div
              initial={{ y: 10 }}
              animate={{ y: 0 }}
              className="mb-6 flex items-center gap-3 rounded-2xl border border-mint/40 bg-mint/[0.1] px-4 py-3.5"
            >
              <CheckCircle2 size={20} className="shrink-0 text-mint" />
              <p className="text-[13.5px] font-semibold text-[#6EE7B7]">
                Purchased! {view.price.formatted} left your wallet — find it under
                “Purchases” in your Account Hub.
              </p>
            </motion.div>
          )}

          {/* error */}
          {error && (
            <p className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/[0.1] px-4 py-3 text-[13.5px] font-semibold text-red-300">
              {error}
            </p>
          )}

          {/* condition audit */}
          <div className="mb-6 space-y-3.5 rounded-2xl border border-line bg-black/25 px-4 py-4">
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-mint/40 bg-mint/[0.12] text-mint">
                <ShieldCheck size={14} />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-[13.5px] text-mint">
                  {view.condition.ai_badge_text}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-mute">
                  {view.condition.ai_visual_notes}
                </p>
              </div>
            </div>
            <p className="border-t border-line pt-3 text-[12.5px] font-semibold text-faint italic">
              Seller's claim: “{view.condition.spoken_claim}” — verified by the AI
              visual audit above.
            </p>
          </div>

          <p className="text-[14px] leading-relaxed text-mute">{view.description}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
