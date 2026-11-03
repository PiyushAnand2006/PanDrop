import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import type { MarketplaceListing } from "../types/pandrop";
import { listListings, resolveAssetUrl } from "../lib/api";
import { ConditionBadge, PriceTag } from "./atoms";

/* ------------------------------------------------------------------ */
/* Listing card                                                        */
/* ------------------------------------------------------------------ */

function ListingCard({
  listing,
  index,
  onOpen,
}: {
  listing: MarketplaceListing;
  index: number;
  onOpen: (l: MarketplaceListing) => void;
}) {
  return (
    <motion.button
      layout
      initial={{ y: 24 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.06, 0.4), ease: [0.22, 1, 0.36, 1] }}
      onClick={() => onOpen(listing)}
      className="card card-hover group relative cursor-pointer overflow-hidden rounded-3xl text-left"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-2">
        <img
          src={resolveAssetUrl(listing.assets.studio_showcase_url)}
          alt={listing.seo_title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          draggable={false}
        />
        <img
          src={resolveAssetUrl(listing.assets.showcase_with_pricetag_url)}
          alt=""
          aria-hidden
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-400 group-hover:opacity-100"
          draggable={false}
        />
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white/90 backdrop-blur-sm">
          <MapPin size={11} />
          {listing.seller_location}
        </span>
        {listing.status === "sold" && (
          <span className="absolute inset-0 grid place-items-center bg-black/55">
            <span className="rounded-full border border-gold/50 bg-black/70 px-4 py-1.5 font-display text-[15px] font-bold text-[#FCD34D] backdrop-blur-sm">
              Sold{listing.buyer_name ? ` to ${listing.buyer_name}` : ""}
            </span>
          </span>
        )}
      </div>

      <div className="space-y-3 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-[15.5px] font-semibold text-ink">
              {listing.seo_title}
            </p>
            <p className="mt-0.5 truncate text-[12.5px] font-semibold text-faint">
              @{listing.seller_username} · {listing.category}
            </p>
          </div>
          <PriceTag formatted={listing.price.formatted} size="md" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <ConditionBadge text={listing.condition.ai_badge_text} compact />
          <span className="text-[11.5px] font-bold text-[#F9A8D4] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            Inspect →
          </span>
        </div>
      </div>
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */
/* Discover view                                                       */
/* ------------------------------------------------------------------ */

const CATEGORIES = ["All", "Audio", "Furniture", "Electronics", "Cameras", "Footwear", "General"];
const CONDITION_STEPS = [0, 7, 8, 9];

export default function Discover({
  walletVersion,
  onOpenListing,
}: {
  /** Increments when wallet/listings change elsewhere, triggering a refresh. */
  walletVersion: number;
  onOpenListing: (l: MarketplaceListing) => void;
}) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [minCondition, setMinCondition] = useState(0);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const query = useMemo(
    () => ({ q, category, max_price: maxPrice, min_condition: minCondition || null, status: "active" as const }),
    [q, category, maxPrice, minCondition],
  );

  useEffect(() => {
    let alive = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listListings(query);
        if (alive) setListings(data);
      } catch (err) {
        if (alive) {
          setListings([]);
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (alive) setLoading(false);
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [query, walletVersion]);

  const categories = useMemo(() => {
    const found = new Set(listings.map((l) => l.category));
    return CATEGORIES.filter((c) => c === "All" || found.has(c)).concat(
      [...found].filter((c) => !CATEGORIES.includes(c)),
    );
  }, [listings]);

  return (
    <div className="relative z-10 mx-auto min-h-screen w-full max-w-[1500px] px-4 pt-24 pb-16 sm:px-7">
      {/* ---------------- header ---------------- */}
      <motion.div
        initial={{ y: 18 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-6"
      >
        <h1 className="font-display text-[28px] leading-tight font-bold tracking-tight text-ink sm:text-[32px]">
          Discover & <span className="brand-gradient-text">Search</span>
        </h1>
        <p className="mt-1 text-[15px] text-mute">
          Every listing below was extracted from a real video by the PanDrop pipeline.
        </p>
      </motion.div>

      {/* ---------------- search + filters ---------------- */}
      <motion.div
        initial={{ y: 18 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
        className="mb-5 space-y-4"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-[240px] flex-1 items-center rounded-2xl border border-line bg-black/25 px-4 transition focus-within:border-pink/50">
            <Search size={17} className="shrink-0 text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search listings — try “speaker” or “chair”…"
              aria-label="Search listings"
              className="w-full bg-transparent py-3 pl-3 text-[15px] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-faint/70"
            />
          </div>
          <button
            onClick={() => setShowFilters((s) => !s)}
            aria-expanded={showFilters}
            className={`btn-ghost ${showFilters ? "!border-pink/50 !text-ink" : ""}`}
          >
            <SlidersHorizontal size={15} />
            Filters
          </button>
        </div>

        {/* category pills */}
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`cursor-pointer rounded-full border px-4 py-1.5 font-display text-[13px] font-semibold transition ${
                  active
                    ? "border-pink/55 bg-pink/[0.14] text-ink"
                    : "border-white/10 bg-white/[0.03] text-mute hover:border-pink/35 hover:text-dim"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>

        {/* advanced filters */}
        {showFilters && (
          <motion.div
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="card flex flex-wrap items-end gap-6 rounded-2xl px-5 py-4"
          >
            <label className="block">
              <span className="label mb-1.5 block">Max price</span>
              <input
                type="number"
                min={0}
                value={maxPrice ?? ""}
                onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : null)}
                placeholder="Any"
                className="w-32 rounded-xl border border-line bg-black/25 px-3 py-2 font-mono text-[13.5px] font-semibold text-ink outline-none focus:border-pink/50"
              />
            </label>
            <div>
              <span className="label mb-1.5 block">
                Min AI condition · {minCondition ? minCondition.toFixed(0) : "any"}
              </span>
              <div className="flex gap-1.5">
                {CONDITION_STEPS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setMinCondition(s)}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-[12.5px] font-bold transition ${
                      minCondition === s
                        ? "border-mint/50 bg-mint/[0.12] text-[#6EE7B7]"
                        : "border-white/10 bg-white/[0.03] text-mute hover:text-dim"
                    }`}
                  >
                    {s > 0 && <ShieldCheck size={13} />}
                    {s === 0 ? "Any" : `${s}+`}
                  </button>
                ))}
              </div>
            </div>
            {(maxPrice != null || minCondition > 0) && (
              <button
                onClick={() => {
                  setMaxPrice(null);
                  setMinCondition(0);
                }}
                className="mb-1 cursor-pointer text-[12.5px] font-bold text-[#F9A8D4] hover:underline"
              >
                Reset filters
              </button>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* ---------------- results ---------------- */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card h-80 animate-pulse rounded-3xl bg-surface/60" />
          ))}
        </div>
      ) : error ? (
        <div className="card rounded-3xl px-6 py-16 text-center">
          <p className="font-display text-[16px] font-semibold text-ink">
            The marketplace is unreachable
          </p>
          <p className="mx-auto mt-2 max-w-md text-[14px] text-mute">{error}</p>
        </div>
      ) : listings.length === 0 ? (
        <div className="card rounded-3xl px-6 py-16 text-center">
          <p className="font-display text-[16px] font-semibold text-ink">No listings found</p>
          <p className="mx-auto mt-2 max-w-md text-[14px] text-mute">
            Try clearing the filters — or head to the AI Sell Studio, drop a video and
            post the first item for this category.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {listings.map((l, i) => (
            <ListingCard key={l.listing_id} listing={l} index={i} onOpen={onOpenListing} />
          ))}
        </div>
      )}
    </div>
  );
}
