import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BadgeCheck,
  Clock3,
  Clapperboard,
  MapPin,
  PackageCheck,
  ShoppingCart,
  Store,
  Wallet,
} from "lucide-react";
import type {
  JobResponse,
  MarketplaceListing,
  UserAccount,
  UserDashboardResponse,
} from "../types/pandrop";
import { getDashboard, resolveAssetUrl } from "../lib/api";
import { formatShortTime } from "../lib/format";
import { ConditionBadge, PriceTag } from "./atoms";

type Tab = "active" | "sold" | "purchased" | "jobs";

const TABS: { key: Tab; label: string; icon: typeof Store }[] = [
  { key: "active", label: "Active listings", icon: Store },
  { key: "sold", label: "Sold items", icon: PackageCheck },
  { key: "purchased", label: "Purchases", icon: ShoppingCart },
  { key: "jobs", label: "Extraction jobs", icon: Clapperboard },
];

function ListingMini({
  listing,
  onOpen,
  tag,
}: {
  listing: MarketplaceListing;
  onOpen: (l: MarketplaceListing) => void;
  tag?: string;
}) {
  return (
    <button
      onClick={() => onOpen(listing)}
      className="card card-hover group flex w-full cursor-pointer items-center gap-4 rounded-2xl p-3 text-left"
    >
      <img
        src={resolveAssetUrl(listing.assets.studio_showcase_url)}
        alt=""
        className="h-16 w-16 shrink-0 rounded-xl border border-white/10 object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[14px] font-semibold text-ink">
          {listing.seo_title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <ConditionBadge text={listing.condition.ai_badge_text} compact />
          {tag && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                tag === "sold"
                  ? "border border-gold/40 bg-gold/[0.1] text-[#FCD34D]"
                  : "border border-blue-400/40 bg-blue-400/[0.1] text-blue-300"
              }`}
            >
              {tag === "sold"
                ? listing.buyer_name
                  ? `Sold to ${listing.buyer_name}`
                  : "Sold"
                : listing.seller_name
                  ? `From ${listing.seller_name}`
                  : "Purchased"}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <PriceTag formatted={listing.price.formatted} size="sm" />
        <span className="flex items-center gap-0.5 text-[11px] font-bold text-faint opacity-0 transition group-hover:opacity-100">
          Inspect <ArrowUpRight size={10} />
        </span>
      </div>
    </button>
  );
}

function JobRow({
  job,
  onOpen,
}: {
  job: JobResponse;
  onOpen: (job: JobResponse) => void;
}) {
  return (
    <button
      onClick={() => onOpen(job)}
      className="card card-hover group flex w-full cursor-pointer items-center gap-4 rounded-2xl p-3.5 text-left"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-violet/30 bg-violet/[0.12] text-violet">
        <Clapperboard size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-[12.5px] font-semibold text-ink">
          {job.job_id}
        </p>
        <p className="truncate text-[12px] font-semibold text-faint">
          {job.transcript || "No transcript"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="flex items-center gap-1 font-mono text-[11px] font-semibold text-faint">
          <Clock3 size={11} /> {formatShortTime(job.duration_sec)}
        </span>
        <span className="rounded-full border border-pink/35 bg-pink/[0.1] px-2.5 py-0.5 text-[11px] font-bold text-[#F9A8D4]">
          {job.items.length} items
        </span>
        <span className="flex items-center gap-0.5 text-[11px] font-bold text-[#F9A8D4] opacity-0 transition group-hover:opacity-100">
          Open in studio <ArrowUpRight size={10} />
        </span>
      </div>
    </button>
  );
}

export default function AccountHub({
  user,
  walletVersion,
  onUserRefreshed,
  onOpenListing,
  onOpenJob,
}: {
  user: UserAccount;
  /** Bumped by the app after buys/publishes to force a dashboard reload. */
  walletVersion: number;
  onUserRefreshed: (u: UserAccount) => void;
  onOpenListing: (l: MarketplaceListing) => void;
  onOpenJob: (j: JobResponse) => void;
}) {
  const [data, setData] = useState<UserDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("active");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await getDashboard(user.user_id);
      setData(d);
      if (d.user.wallet_balance !== user.wallet_balance) onUserRefreshed(d.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [user.user_id, user.wallet_balance, onUserRefreshed]);

  useEffect(() => {
    void load();
  }, [load, walletVersion]);

  const earnings = (data?.sold_listings ?? []).reduce((a, l) => a + l.price.amount, 0);
  const spent = (data?.purchased_listings ?? []).reduce((a, l) => a + l.price.amount, 0);

  const empty: Record<Tab, { title: string; body: string }> = {
    active: {
      title: "No active listings",
      body: "Drop a video in the AI Sell Studio, tweak the extracted items and post them — they appear here instantly.",
    },
    sold: {
      title: "Nothing sold yet",
      body: "When another account buys one of your listings, the item and your earnings show up here.",
    },
    purchased: {
      title: "No purchases yet",
      body: "Head to Discover & Search, inspect a listing's SAM 3.1 cutout and hit Buy — your new items land here.",
    },
    jobs: {
      title: "No extraction jobs",
      body: "Every video you run through the pipeline is kept here so you can re-open and post items later.",
    },
  };

  return (
    <div className="relative z-10 mx-auto min-h-screen w-full max-w-[1200px] px-4 pt-24 pb-16 sm:px-7">
      {/* ---------------- profile header ---------------- */}
      <motion.div
        initial={{ y: 18 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="ring-glow card flex flex-wrap items-center gap-5 rounded-3xl p-6 sm:p-7">
          <img
            src={user.avatar_url}
            alt={user.display_name}
            className="h-20 w-20 rounded-2xl border border-white/15 shadow-card"
          />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[26px] leading-tight font-bold tracking-tight text-ink">
              {user.display_name}
              <span className="ml-2 font-mono text-[14px] font-semibold text-faint">
                @{user.username}
              </span>
            </h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-[13.5px] font-semibold text-mute">
              <MapPin size={13} /> {user.location || "Anywhere"}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="label mb-0.5">Wallet balance</p>
              <p className="font-mono text-[28px] leading-none font-bold text-[#FCD34D]">
                ${user.wallet_balance.toFixed(2)}
              </p>
            </div>
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-gold/40 bg-gold/[0.1] text-[#FCD34D]">
              <Wallet size={22} />
            </span>
          </div>
        </div>
      </motion.div>

      {/* ---------------- stat strip ---------------- */}
      <motion.div
        initial={{ y: 18 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
        className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4"
      >
        {[
          { label: "Active listings", value: data?.active_listings.length ?? 0, tone: "text-ink" },
          { label: "Sold items", value: data?.sold_listings.length ?? 0, tone: "text-ink" },
          { label: "Earned", value: `$${earnings.toFixed(0)}`, tone: "text-[#6EE7B7]" },
          { label: "Spent", value: `$${spent.toFixed(0)}`, tone: "text-[#F9A8D4]" },
        ].map((s) => (
          <div key={s.label} className="card rounded-2xl px-5 py-4">
            <p className="label">{s.label}</p>
            <p className={`mt-1 font-mono text-[24px] leading-none font-bold ${s.tone}`}>
              {loading ? "—" : s.value}
            </p>
          </div>
        ))}
      </motion.div>

      {/* ---------------- tabs ---------------- */}
      <motion.div
        initial={{ y: 18 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        className="mt-8"
      >
        <div
          role="tablist"
          aria-label="Account sections"
          className="flex flex-wrap gap-1.5 rounded-2xl border border-white/[0.07] bg-black/25 p-1.5"
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            const count =
              t.key === "active"
                ? data?.active_listings.length
                : t.key === "sold"
                  ? data?.sold_listings.length
                  : t.key === "purchased"
                    ? data?.purchased_listings.length
                    : data?.extraction_jobs.length;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={`relative flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 font-display text-[13.5px] font-semibold transition-colors ${
                  active ? "text-ink" : "text-mute hover:text-dim"
                }`}
              >
                <t.icon size={15} className={active ? "text-pink" : ""} />
                {t.label}
                {count != null && count > 0 && (
                  <span className="rounded-full bg-white/[0.08] px-1.5 font-mono text-[10.5px] font-bold text-dim">
                    {count}
                  </span>
                )}
                {active && (
                  <motion.span
                    layoutId="hub-tab"
                    className="absolute inset-0 -z-10 rounded-xl bg-pink/[0.14] ring-1 ring-pink/35"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ---------------- tab content ---------------- */}
      <div className="mt-5">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card h-20 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <div className="card rounded-3xl px-6 py-14 text-center">
            <p className="font-display text-[16px] font-semibold text-ink">
              Couldn't load this dashboard
            </p>
            <p className="mx-auto mt-2 max-w-md text-[14px] text-mute">{error}</p>
          </div>
        ) : (
          <>
            {tab === "active" &&
              (data?.active_listings.length ? (
                <div className="space-y-3">
                  {data.active_listings.map((l) => (
                    <ListingMini key={l.listing_id} listing={l} onOpen={onOpenListing} />
                  ))}
                </div>
              ) : (
                <EmptyState {...empty.active} />
              ))}

            {tab === "sold" &&
              (data?.sold_listings.length ? (
                <div className="space-y-3">
                  {data.sold_listings.map((l) => (
                    <ListingMini key={l.listing_id} listing={l} onOpen={onOpenListing} tag="sold" />
                  ))}
                </div>
              ) : (
                <EmptyState {...empty.sold} />
              ))}

            {tab === "purchased" &&
              (data?.purchased_listings.length ? (
                <div className="space-y-3">
                  {data.purchased_listings.map((l) => (
                    <ListingMini
                      key={l.listing_id}
                      listing={l}
                      onOpen={onOpenListing}
                      tag="purchased"
                    />
                  ))}
                </div>
              ) : (
                <EmptyState {...empty.purchased} />
              ))}

            {tab === "jobs" &&
              (data?.extraction_jobs.length ? (
                <div className="space-y-3">
                  {data.extraction_jobs.map((j) => (
                    <JobRow key={j.job_id} job={j} onOpen={onOpenJob} />
                  ))}
                </div>
              ) : (
                <EmptyState {...empty.jobs} />
              ))}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="card flex flex-col items-center gap-2.5 rounded-3xl px-6 py-14 text-center">
      <BadgeCheck size={28} className="text-faint" />
      <p className="font-display text-[16px] font-semibold text-ink">{title}</p>
      <p className="max-w-md text-[14px] leading-relaxed text-mute">{body}</p>
    </div>
  );
}
