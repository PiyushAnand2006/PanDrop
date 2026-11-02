import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Boxes, Clock3, Copy, Check, FileText, PackageOpen } from "lucide-react";
import type { JobResponse, ShowcaseItem } from "../types/pandrop";
import { copyText, formatShortTime } from "../lib/format";
import { Chip, SectionLabel } from "./atoms";
import ItemCard from "./ItemCard";
import ItemDetail from "./ItemDetail";
import VideoPanel, { type SeekRequest } from "./VideoPanel";

/* ------------------------------------------------------------------ */
/* Transcript panel                                                    */
/* ------------------------------------------------------------------ */

function TranscriptPanel({ job }: { job: JobResponse }) {
  const [ok, setOk] = useState(false);
  const words = job.transcript.trim() ? job.transcript.trim().split(/\s+/).length : 0;
  return (
    <div className="card rounded-3xl p-5 px-6 py-5">
      <SectionLabel
        right={
          <button
            onClick={async () => {
              if (await copyText(job.transcript)) {
                setOk(true);
                setTimeout(() => setOk(false), 1300);
              }
            }}
            aria-label="Copy transcript"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-[11.5px] font-bold text-mute transition hover:border-pink/45 hover:text-ink"
          >
            {ok ? <Check size={12} className="text-mint" /> : <Copy size={12} />}
            {ok ? "Copied" : "Copy"}
          </button>
        }
      >
        Transcript · Whisper STT
      </SectionLabel>
      {job.transcript ? (
        <>
          <p className="text-[15px] leading-relaxed text-dim">
            <span className="mr-1.5 font-bold text-pink">“</span>
            {job.transcript}
            <span className="ml-1.5 font-bold text-pink">”</span>
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <Chip tone="neutral">
              <Clock3 size={11} /> {formatShortTime(job.duration_sec)}
            </Chip>
            <Chip tone="neutral">{words} words</Chip>
            <Chip tone="blue">
              <FileText size={11} /> {job.items.length} items detected
            </Chip>
          </div>
        </>
      ) : (
        <p className="text-[14px] text-faint italic">
          No transcript was returned for this clip.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Studio                                                              */
/* ------------------------------------------------------------------ */

export default function Studio({
  job,
  isDemo,
  onReset,
}: {
  job: JobResponse;
  isDemo: boolean;
  onReset: () => void;
}) {
  const [time, setTime] = useState(0);
  const [seekReq, setSeekReq] = useState<SeekRequest>({ t: 0, nonce: 0 });
  const [detail, setDetail] = useState<ShowcaseItem | null>(null);

  const items = useMemo(
    () => [...job.items].sort((a, b) => a.timestamp_sec - b.timestamp_sec),
    [job.items],
  );

  const activeItem = useMemo(() => {
    let current: ShowcaseItem | null = null;
    for (const it of items) {
      if (it.timestamp_sec <= time + 0.15) current = it;
      else break;
    }
    return current;
  }, [items, time]);

  const seek = (t: number) => setSeekReq((s) => ({ t, nonce: s.nonce + 1 }));

  const openItem = (item: ShowcaseItem) => {
    seek(item.timestamp_sec);
    setDetail(item);
  };

  return (
    <div className="relative z-10 mx-auto min-h-screen w-full max-w-[1500px] px-4 pt-24 pb-16 sm:px-7">
      {/* ---------------- header ---------------- */}
      <motion.div
        initial={{ y: 18 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-7 flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <p className="label mb-1">
            Showcase · <span className="font-mono text-[11.5px]">{job.job_id}</span>
          </p>
          <h1 className="font-display text-[28px] leading-tight font-bold tracking-tight text-ink sm:text-[32px]">
            {items.length > 0 ? (
              <>
                {items.length} item{items.length === 1 ? "" : "s"} ready to{" "}
                <span className="brand-gradient-text">sell</span>
              </>
            ) : (
              "Showcase ready"
            )}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={isDemo ? "amber" : "mint"}>
            <Boxes size={12} />
            {isDemo ? "Sample pipeline output" : "Live pipeline"}
          </Chip>
          <Chip tone="neutral">
            <Clock3 size={12} /> {formatShortTime(job.duration_sec)} clip
          </Chip>
          <button onClick={onReset} className="btn-ghost lg:!hidden">
            New session
          </button>
        </div>
      </motion.div>

      {job.status === "failed" && (
        <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/[0.08] px-4 py-3 text-[14px] font-semibold text-red-300">
          The pipeline reported a failure for this job — results below may be partial.
        </div>
      )}

      {/* ---------------- body ---------------- */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,480px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,540px)_minmax(0,1fr)]">
        {/* left rail */}
        <div className="space-y-5 lg:sticky lg:top-[88px]">
          <motion.div
            initial={{ y: 22 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <VideoPanel
              job={{ ...job, items }}
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
            <TranscriptPanel job={job} />
          </motion.div>
        </div>

        {/* item grid */}
        <div>
          <SectionLabel
            right={
              <span className="text-[12px] font-bold text-faint">
                Click a card to open the asset lab
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
              <p className="max-w-sm text-[14px] leading-relaxed text-mute">
                Try a clip where you point at each product and say its name and price
                out loud — e.g. “this camera, 85 dollars, works perfectly”.
              </p>
              <button onClick={onReset} className="btn-primary mt-2 !py-2.5 !text-[13.5px]">
                Try another video
              </button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
              {items.map((item, i) => (
                <ItemCard
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
      </div>

      {/* ---------------- asset lab modal ---------------- */}
      {detail && (
        <ItemDetail
          key={detail.item_id}
          item={detail}
          items={items}
          onClose={() => setDetail(null)}
          onNavigate={(it) => {
            seek(it.timestamp_sec);
            setDetail(it);
          }}
        />
      )}
    </div>
  );
}
