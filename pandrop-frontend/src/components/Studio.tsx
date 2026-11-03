import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  Clock3,
  Copy,
  Check,
  PackageOpen,
  Store,
  UploadCloud,
  Zap,
} from "lucide-react";
import type { JobResponse, PublishItemOverride, ShowcaseItem, UserAccount } from "../types/pandrop";
import { processVideo, publishItems, resolveAssetUrl } from "../lib/api";
import { buildDemoJob } from "../lib/demoJob";
import { copyText, formatShortTime } from "../lib/format";
import { Chip, PriceTag, SectionLabel } from "./atoms";
import Processing from "./Processing";
import VideoPanel, { type SeekRequest } from "./VideoPanel";
import ItemDetail from "./ItemDetail";

/* ------------------------------------------------------------------ */
/* Idle state — dropzone + demo                                        */
/* ------------------------------------------------------------------ */

function StudioIdle({
  onFile,
  onDemo,
  userName,
}: {
  onFile: (f: File) => void;
  onDemo: () => void;
  userName: string | null;
}) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const take = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setError("That doesn't look like a video file — try MP4, MOV or WEBM.");
      return;
    }
    setError(null);
    onFile(file);
  };

  return (
    <div className="relative z-10 mx-auto min-h-screen w-full max-w-5xl px-4 pt-24 pb-16 sm:px-7">
      <motion.div
        initial={{ y: 18 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8 text-center"
      >
        <h1 className="font-display text-[30px] leading-tight font-bold tracking-tight text-ink sm:text-[36px]">
          AI Sell <span className="brand-gradient-text">Studio</span>
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-[15.5px] text-mute">
          Drop a quick room-scan video and the Meta AI pipeline — Muse Voice, Muse
          Spark, SAM 3.1, Muse Wonder — turns it into postable listings.
          {userName && (
            <>
              {" "}
              Everything is extracted as{" "}
              <span className="font-bold text-[#F9A8D4]">{userName}</span>.
            </>
          )}
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 30 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload a product video"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            take(e.dataTransfer.files?.[0]);
          }}
          className={`card ring-glow relative flex min-h-[380px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border-dashed p-8 text-center transition-all duration-200 ${
            dragging ? "border-pink/70 bg-pink/[0.06] shadow-glow-pink" : ""
          }`}
        >
          {dragging && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              <div className="anim-sweep absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-pink/20 to-transparent" />
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/*"
            className="hidden"
            onChange={(e) => take(e.target.files?.[0])}
          />

          <span
            className={`grid h-20 w-20 place-items-center rounded-3xl border transition-all duration-200 ${
              dragging ? "border-pink/60 bg-pink/15 text-pink" : "border-white/12 bg-white/[0.05] text-dim"
            }`}
          >
            <UploadCloud size={34} strokeWidth={1.7} />
          </span>
          <p className="relative mt-6 font-display text-xl font-semibold text-ink">
            {dragging ? "Release to run the pipeline" : "Drop your product video"}
          </p>
          <p className="relative mt-1.5 text-[14px] font-semibold text-faint">
            MP4, MOV or WEBM · point & talk at each item
          </p>

          <div className="relative mt-7 flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-xl border border-pink/35 bg-pink/[0.1] px-5 py-2.5 font-display text-[14px] font-semibold text-[#F9A8D4] transition hover:bg-pink/[0.18]">
              <UploadCloud size={15} />
              Browse files
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDemo();
              }}
              className="btn-ghost"
            >
              <Zap size={15} />
              Watch a 6-second demo
            </button>
          </div>

          {error && (
            <p className="relative mt-6 rounded-xl border border-red-500/40 bg-red-500/[0.1] px-3.5 py-2 text-[13px] font-semibold text-red-300">
              {error}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Publish panel                                                       */
/* ------------------------------------------------------------------ */

function PublishRow({
  item,
  selected,
  price,
  title,
  onToggle,
  onPrice,
  onTitle,
}: {
  item: ShowcaseItem;
  selected: boolean;
  price: string;
  title: string;
  onToggle: () => void;
  onPrice: (v: string) => void;
  onTitle: (v: string) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3.5 rounded-2xl border px-4 py-3 transition ${
        selected ? "border-pink/45 bg-pink/[0.06]" : "border-line bg-black/20"
      } ${item.is_published ? "opacity-60" : ""}`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        disabled={item.is_published}
        aria-label={`Include ${item.spoken_name}`}
        className="h-4.5 w-4.5 shrink-0 accent-pink"
      />
      <img
        src={resolveAssetUrl(item.assets.studio_showcase_url)}
        alt=""
        className="h-14 w-14 shrink-0 rounded-xl border border-white/10 object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[14px] font-semibold text-ink">
          {item.spoken_name}
          <span className="ml-2 font-mono text-[11px] font-semibold text-faint">
            {item.item_id}
          </span>
        </p>
        {item.is_published ? (
          <p className="mt-0.5 flex items-center gap-1 text-[12px] font-bold text-mint">
            <CheckCircle2 size={12} /> Posted · {item.published_listing_id}
          </p>
        ) : (
          <input
            value={title}
            onChange={(e) => onTitle(e.target.value)}
            aria-label={`Listing title for ${item.spoken_name}`}
            placeholder="Listing title…"
            className="mt-1 w-full rounded-lg border border-line bg-black/25 px-2.5 py-1.5 text-[12.5px] font-semibold text-dim outline-none transition focus:border-pink/50"
          />
        )}
      </div>
      {item.is_published ? (
        <PriceTag formatted={item.price.formatted} size="md" />
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[13px] font-bold text-faint">$</span>
          <input
            type="number"
            min={0}
            value={price}
            onChange={(e) => onPrice(e.target.value)}
            aria-label={`Price for ${item.spoken_name}`}
            className="w-20 rounded-lg border border-line bg-black/25 px-2.5 py-1.5 font-mono text-[13.5px] font-bold text-ink outline-none transition focus:border-pink/50"
          />
        </div>
      )}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Result state — extraction review + publish                          */
/* ------------------------------------------------------------------ */

function StudioResult({
  job,
  isDemo,
  user,
  mockAI,
  onGoDiscover,
  onPublished,
  onNewSession,
}: {
  job: JobResponse;
  isDemo: boolean;
  user: UserAccount | null;
  mockAI: boolean | null;
  onGoDiscover: () => void;
  /** Called after a successful publish so the app can refresh wallet/lists. */
  onPublished: () => void;
  onNewSession: () => void;
}) {
  const [items, setItems] = useState<ShowcaseItem[]>(job.items);
  const [draftPrice, setDraftPrice] = useState<Record<string, string>>({});
  const [draftTitle, setDraftTitle] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedCount, setPublishedCount] = useState<number | null>(null);
  const [time, setTime] = useState(0);
  const [seekReq, setSeekReq] = useState<SeekRequest>({ t: 0, nonce: 0 });
  const [detail, setDetail] = useState<ShowcaseItem | null>(null);
  const [copied, setCopied] = useState(false);

  // reset local state when a new job arrives
  useEffect(() => {
    setItems(job.items);
    setDraftPrice(
      Object.fromEntries(job.items.map((i) => [i.item_id, String(i.price.amount)])),
    );
    setDraftTitle(Object.fromEntries(job.items.map((i) => [i.item_id, i.seo_title])));
    setSelected(
      Object.fromEntries(job.items.map((i) => [i.item_id, !i.is_published])),
    );
    setPublishedCount(null);
    setPublishError(null);
  }, [job]);

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.timestamp_sec - b.timestamp_sec),
    [items],
  );

  const activeItem = useMemo(() => {
    let current: ShowcaseItem | null = null;
    for (const it of sorted) {
      if (it.timestamp_sec <= time + 0.15) current = it;
      else break;
    }
    return current;
  }, [sorted, time]);

  const seek = (t: number) => setSeekReq((s) => ({ t, nonce: s.nonce + 1 }));

  const openItem = (item: ShowcaseItem) => {
    seek(item.timestamp_sec);
    setDetail(item);
  };

  const unpublished = items.filter((i) => !i.is_published);
  const selectedIds = unpublished.filter((i) => selected[i.item_id]).map((i) => i.item_id);

  const overrides = useMemo(() => {
    const ov: Record<string, PublishItemOverride> = {};
    for (const id of selectedIds) {
      const orig = items.find((i) => i.item_id === id);
      if (!orig) continue;
      const o: PublishItemOverride = {};
      const p = Number(draftPrice[id]);
      if (Number.isFinite(p) && p >= 0 && p !== orig.price.amount) o.price = p;
      const t = (draftTitle[id] ?? "").trim();
      if (t && t !== orig.seo_title) o.seo_title = t;
      ov[id] = o;
    }
    return ov;
  }, [selectedIds, draftPrice, draftTitle, items]);

  const publish = async () => {
    if (!user) {
      setPublishError("Pick an account first — use the switcher in the top bar.");
      return;
    }
    if (selectedIds.length === 0) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const listings = await publishItems(user.user_id, job.job_id, selectedIds, overrides);
      const byItem = new Map(listings.map((l) => [l.item_id, l]));
      setItems((its) =>
        its.map((i) => {
          const l = byItem.get(i.item_id);
          return l
            ? {
                ...i,
                is_published: true,
                published_listing_id: l.listing_id,
                price: l.price,
                seo_title: l.seo_title,
              }
            : i;
        }),
      );
      setPublishedCount(listings.length);
      onPublished();
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : String(err));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="relative z-10 mx-auto min-h-screen w-full max-w-[1500px] px-4 pt-24 pb-16 sm:px-7">
      {/* header */}
      <motion.div
        initial={{ y: 18 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-7 flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <p className="label mb-1">
            Extraction · <span className="font-mono text-[11.5px]">{job.job_id}</span>
          </p>
          <h1 className="font-display text-[28px] leading-tight font-bold tracking-tight text-ink sm:text-[32px]">
            {items.length > 0 ? (
              <>
                {items.length} item{items.length === 1 ? "" : "s"}{" "}
                <span className="brand-gradient-text">extracted</span>
              </>
            ) : (
              "Extraction ready"
            )}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={isDemo || mockAI ? "amber" : "pink"}>
            <Boxes size={12} />
            {isDemo
              ? "Sample pipeline output"
              : mockAI
                ? "Offline preview · mock AI"
                : "Live pipeline · Meta AI"}
          </Chip>
          <Chip tone="neutral">
            <Clock3 size={12} /> {formatShortTime(job.duration_sec)} clip
          </Chip>
          <button onClick={onNewSession} className="btn-ghost">
            New session
          </button>
        </div>
      </motion.div>

      {/* mock-mode honesty callout */}
      {mockAI && !isDemo && (
        <div className="mb-6 rounded-2xl border border-gold/40 bg-gold/[0.08] px-5 py-4">
          <p className="font-display text-[14.5px] font-semibold text-[#FCD34D]">
            Running in offline preview mode — the Meta AI models aren't connected
          </p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-[#FDE68A]">
            Without the live models there is no speech recognition or item detection,
            so names, prices and audit scores below are placeholder output, not real
            detections. For accurate extraction, create{" "}
            <span className="font-mono text-[12.5px]">pandrop-backend/.env</span> with{" "}
            <span className="font-mono text-[12.5px]">META_API_KEY=…</span> and{" "}
            <span className="font-mono text-[12.5px]">USE_MOCK_AI=false</span>, then
            restart the backend.
          </p>
        </div>
      )}

      {/* success banner */}
      <AnimatePresence>
        {publishedCount != null && (
          <motion.div
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-mint/40 bg-mint/[0.1] px-5 py-4"
          >
            <CheckCircle2 size={20} className="text-mint" />
            <p className="text-[14px] font-semibold text-[#6EE7B7]">
              {publishedCount} listing{publishedCount === 1 ? "" : "s"} posted to the
              marketplace.
            </p>
            <button onClick={onGoDiscover} className="btn-primary ml-auto !py-2 !text-[13px]">
              <Store size={14} />
              View in Discover
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {job.status === "failed" && (
        <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/[0.08] px-4 py-3 text-[14px] font-semibold text-red-300">
          The pipeline reported a failure for this job — results below may be partial.
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,480px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,540px)_minmax(0,1fr)]">
        {/* left rail */}
        <div className="space-y-5 lg:sticky lg:top-[88px]">
          <motion.div
            initial={{ y: 22 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <VideoPanel
              job={{ ...job, items: sorted }}
              isDemo={isDemo}
              activeItem={activeItem}
              seekReq={seekReq}
              onTime={setTime}
            />
          </motion.div>
          <motion.div
            initial={{ y: 22 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.55, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="card rounded-3xl p-6 py-5">
              <SectionLabel
                right={
                  <button
                    onClick={async () => {
                      if (await copyText(job.transcript)) {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1300);
                      }
                    }}
                    aria-label="Copy transcript"
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-[11.5px] font-bold text-mute transition hover:border-pink/45 hover:text-ink"
                  >
                    {copied ? <Check size={12} className="text-mint" /> : <Copy size={12} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                }
              >
                Transcript · Muse Voice
              </SectionLabel>
              {job.transcript ? (
                <p className="text-[15px] leading-relaxed text-dim">
                  <span className="mr-1.5 font-bold text-pink">“</span>
                  {job.transcript}
                  <span className="ml-1.5 font-bold text-pink">”</span>
                </p>
              ) : (
                <p className="text-[14px] text-faint italic">
                  No transcript was returned for this clip.
                </p>
              )}
            </div>
          </motion.div>
        </div>

        {/* right: review + publish */}
        <div className="space-y-6">
          <div>
            <SectionLabel
              right={
                <span className="text-[12px] font-bold text-faint">
                  Click a card → asset lab
                </span>
              }
            >
              Detected items — {items.length}
            </SectionLabel>
            {items.length === 0 ? (
              <div className="card flex flex-col items-center gap-3 rounded-3xl px-6 py-16 text-center">
                <PackageOpen size={32} className="text-faint" />
                <p className="font-display text-[16px] font-semibold text-ink">
                  No items detected
                </p>
                <p className="max-w-sm text-[14px] text-mute">
                  Try a clip where you point at each product and say its name and price
                  out loud.
                </p>
                <button onClick={onNewSession} className="btn-primary mt-2 !py-2.5 !text-[13.5px]">
                  Try another video
                </button>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
                {sorted.map((item, i) => (
                  <ItemReviewCard
                    key={item.item_id}
                    item={item}
                    index={i}
                    active={activeItem?.item_id === item.item_id}
                    onOpen={openItem}
                  />
                ))}
              </div>
            )}
          </div>

          {/* publish panel */}
          {items.length > 0 && (
            <motion.section
              initial={{ y: 22 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.55, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="card rounded-3xl p-6">
                <SectionLabel
                  right={
                    <span className="text-[12px] font-bold text-faint">
                      {unpublished.length === 0
                        ? "Everything is posted"
                        : `${selectedIds.length} of ${unpublished.length} selected`}
                    </span>
                  }
                >
                  Post to marketplace
                </SectionLabel>

                {isDemo && (
                  <p className="mb-4 rounded-xl border border-gold/40 bg-gold/[0.08] px-4 py-3 text-[13px] font-semibold text-[#FCD34D]">
                    This is the bundled sample job — drop your own video to post live
                    listings under your account.
                  </p>
                )}

                <div className="space-y-2.5">
                  {sorted.map((item) => (
                    <PublishRow
                      key={item.item_id}
                      item={item}
                      selected={!!selected[item.item_id]}
                      price={draftPrice[item.item_id] ?? ""}
                      title={draftTitle[item.item_id] ?? ""}
                      onToggle={() =>
                        setSelected((s) => ({ ...s, [item.item_id]: !s[item.item_id] }))
                      }
                      onPrice={(v) => setDraftPrice((s) => ({ ...s, [item.item_id]: v }))}
                      onTitle={(v) => setDraftTitle((s) => ({ ...s, [item.item_id]: v }))}
                    />
                  ))}
                </div>

                {publishError && (
                  <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/[0.1] px-3.5 py-2.5 text-[13px] font-semibold text-red-300">
                    {publishError}
                  </p>
                )}

                {!isDemo && (
                  <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-5">
                    <button
                      onClick={publish}
                      disabled={publishing || selectedIds.length === 0}
                      className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Store size={16} />
                      {publishing
                        ? "Posting…"
                        : `Post ${selectedIds.length || ""} item${selectedIds.length === 1 ? "" : "s"}`}
                    </button>
                    <span className="text-[12.5px] font-semibold text-faint">
                      Listings go live instantly — switch accounts in the top bar to buy
                      them.
                    </span>
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </div>
      </div>

      {/* asset lab */}
      <AnimatePresence>
        {detail && (
          <ItemDetail
            key={detail.item_id}
            item={detail}
            items={sorted}
            onClose={() => setDetail(null)}
            onNavigate={(it) => {
              seek(it.timestamp_sec);
              setDetail(it);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* compact review card — slimmer than the discovery card, wired to the lab */
function ItemReviewCard({
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
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-2">
        <img
          src={resolveAssetUrl(item.assets.studio_showcase_url)}
          alt={item.spoken_name}
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
        <span className="absolute top-3 left-3 inline-flex items-center rounded-full bg-black/55 px-2.5 py-1 font-mono text-[11px] font-semibold text-white/90 backdrop-blur-sm">
          {formatShortTime(item.timestamp_sec)}
        </span>
        <span className="absolute top-3 right-3">
          <PriceTag formatted={item.price.formatted} size="sm" />
        </span>
        {item.is_published && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-mint/45 bg-mint/20 px-2.5 py-1 text-[11px] font-bold text-[#6EE7B7] backdrop-blur-sm">
            <CheckCircle2 size={11} /> Posted
          </span>
        )}
        {active && !item.is_published && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-pink/50 bg-pink/25 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
            <span className="anim-pulse-dot h-1.5 w-1.5 rounded-full bg-pink" />
            On screen now
          </span>
        )}
        <span className="absolute right-3 bottom-3 inline-flex translate-y-1.5 items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          Asset lab <ArrowUpRight size={12} />
        </span>
      </div>
      <div className="space-y-2.5 px-5 py-4">
        <p className="truncate font-display text-[15.5px] font-semibold text-ink">
          {item.spoken_name}
        </p>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate rounded-full border border-mint/40 bg-mint/[0.12] px-2.5 py-0.5 text-[11px] font-bold text-[#6EE7B7]">
            {item.condition.ai_badge_text}
          </span>
          <span className="shrink-0 text-[12px] font-bold text-faint">{item.category}</span>
        </div>
      </div>
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */
/* Studio shell — idle / processing / result                           */
/* ------------------------------------------------------------------ */

export default function Studio({
  user,
  job,
  mockAI,
  onJob,
  onGoDiscover,
  onPublished,
}: {
  user: UserAccount | null;
  job: JobResponse | null;
  mockAI: boolean | null;
  onJob: (job: JobResponse | null) => void;
  onGoDiscover: () => void;
  onPublished: () => void;
}) {
  const [task, setTask] = useState<(() => Promise<JobResponse>) | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setIsDemo(false);
      setFileName(file.name);
      const promise = processVideo(file, user?.user_id ?? "");
      promise.catch(() => {}); // Processing view surfaces the error
      setTask(() => () => promise);
    },
    [user],
  );

  const handleDemo = useCallback(() => {
    setIsDemo(true);
    setFileName(null);
    const promise = new Promise<JobResponse>((resolve) =>
      setTimeout(() => resolve(buildDemoJob()), 180),
    );
    setTask(() => () => promise);
  }, []);

  const runTask = useCallback(
    () => (task ? task() : Promise.reject(new Error("no task"))),
    [task],
  );

  const newSession = useCallback(() => {
    setTask(null);
    setIsDemo(false);
    setFileName(null);
    onJob(null);
  }, [onJob]);

  return (
    <>
      {!job && !task && (
        <StudioIdle onFile={handleFile} onDemo={handleDemo} userName={user?.display_name ?? null} />
      )}
      {!job && task && (
        <Processing
          task={runTask}
          accelerated={isDemo}
          fileName={fileName}
          onDone={(j) => {
            setTask(null);
            onJob(j);
          }}
          onCancel={newSession}
        />
      )}
      {job && (
        <StudioResult
          job={job}
          isDemo={isDemo}
          user={user}
          mockAI={mockAI}
          onGoDiscover={onGoDiscover}
          onPublished={onPublished}
          onNewSession={newSession}
        />
      )}
    </>
  );
}
