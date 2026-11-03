import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Check, Loader2, RotateCcw, Sparkles } from "lucide-react";
import type { JobResponse } from "../types/pandrop";
import { STAGES, STAGE_TOTAL_MS } from "../lib/stages";

const TICK_MS = 90;

/** Rotating hints shown while the live models finish their work. */
const LIVE_HINTS = [
  "Transcribing your audio with Muse Voice…",
  "Detecting products across the video frames…",
  "Auditing each item's real condition…",
  "Compositing studio showcases with Muse Image…",
  "Writing your listing copy…",
];

export default function Processing({
  task,
  accelerated,
  live,
  fileName,
  onDone,
  onCancel,
}: {
  task: () => Promise<JobResponse>;
  /** Demo preset: compress the schedule into a short cinematic run. */
  accelerated: boolean;
  /** Live Meta models — the pipeline legitimately takes a few minutes. */
  live: boolean;
  fileName: string | null;
  onDone: (job: JobResponse) => void;
  onCancel: () => void;
}) {
  // Schedule length matches reality: demo ~2s, offline ~12s, live ~3.5 min.
  const total = useMemo(() => {
    if (accelerated) return STAGE_TOTAL_MS * 0.42;
    if (live) return 210_000;
    return STAGE_TOTAL_MS * 2.6;
  }, [accelerated, live]);
  const speed = useMemo(() => total / STAGE_TOTAL_MS, [total]);

  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(0);
  const [stageIdx, setStageIdx] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [hintIdx, setHintIdx] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
  }, [task]);

  // schedule ticker
  useEffect(() => {
    if (error || finished) return;
    const id = setInterval(() => {
      const el = Date.now() - startRef.current;
      setElapsed(el);
      setProgress(Math.min(0.97, el / total));
      let acc = 0;
      let idx = -1;
      for (let i = 0; i < STAGES.length; i++) {
        acc += STAGES[i].ms * speed;
        if (el >= acc) idx = i;
      }
      setStageIdx(idx);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [total, speed, error, finished]);

  // rotate the live-mode hints while the schedule is exhausted
  useEffect(() => {
    if (!live || accelerated) return;
    const id = setInterval(() => setHintIdx((i) => i + 1), 9_000);
    return () => clearInterval(id);
  }, [live, accelerated]);

  // the real task
  useEffect(() => {
    let alive = true;
    task()
      .then((job) => {
        if (!alive) return;
        setProgress(1);
        setStageIdx(STAGES.length - 1);
        setFinished(true);
        // Let the stage telemetry finish its run before handing off to the studio.
        const remaining = Math.max(0, total - (Date.now() - startRef.current));
        setTimeout(() => alive && onDone(job), remaining + (accelerated ? 250 : 500));
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task]);

  const fmtElapsed = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
  const pct = (progress * 100).toFixed(1);

  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-5 py-24">
      <motion.div
        initial={{ y: 28 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="ring-glow glass w-full overflow-hidden rounded-3xl"
      >
        {/* header: title + % + progress bar */}
        <div className="border-b border-line px-7 pt-7 pb-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="label mb-1.5">
                {accelerated ? "Loading the demo showcase" : "Running the PanDrop pipeline"}
              </p>
              <p className="truncate font-display text-[17px] font-semibold text-ink">
                {fileName ?? "sample clip"}
              </p>
            </div>
            <span className="font-mono text-[32px] leading-none font-bold text-ink tabular-nums">
              {pct}
              <span className="text-[15px] text-faint">%</span>
            </span>
          </div>
          <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
            <motion.div
              className="brand-gradient h-full rounded-full"
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              style={{ boxShadow: "0 0 14px rgba(236,72,153,0.5)" }}
            />
          </div>
          {live && !accelerated && (
            <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-pink/25 bg-pink/[0.06] px-4 py-3">
              <Sparkles size={15} className="shrink-0 text-pink" />
              <p className="text-[13px] font-semibold text-[#F9A8D4]">
                {LIVE_HINTS[hintIdx % LIVE_HINTS.length]}
                <span className="ml-2 font-normal text-faint">
                  Live models can take 2–4 minutes for multi-item videos.
                </span>
              </p>
            </div>
          )}
        </div>

        {/* stages */}
        <div className="px-7 py-4">
          {error ? (
            <div className="flex flex-col items-start gap-4 py-4">
              <p className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/[0.1] px-3.5 py-2 text-[13.5px] font-semibold text-red-300">
                <AlertTriangle size={15} />
                The pipeline hit a problem
              </p>
              <p className="text-[14px] leading-relaxed text-dim">{error}</p>
              <button onClick={onCancel} className="btn-ghost">
                <RotateCcw size={14} /> Back to upload
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {STAGES.map((s, i) => {
                const state =
                  finished || i < stageIdx ? "done" : i === stageIdx ? "running" : "queued";
                return (
                  <li
                    key={s.key}
                    className={`flex items-center gap-4 py-3.5 transition-opacity duration-300 ${
                      state === "queued" ? "opacity-40" : "opacity-100"
                    }`}
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border ${
                        state === "done"
                          ? "border-mint/40 bg-mint/[0.14] text-mint"
                          : state === "running"
                            ? "border-pink/50 bg-pink/[0.12] text-pink"
                            : "border-white/10 bg-white/[0.04] text-faint"
                      }`}
                    >
                      {state === "done" ? (
                        <Check size={16} strokeWidth={3} />
                      ) : state === "running" ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <span className="font-mono text-[11px] font-bold">{i + 1}</span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`font-display text-[15px] font-semibold ${
                          state === "running"
                            ? "text-ink"
                            : state === "done"
                              ? "text-dim"
                              : "text-mute"
                        }`}
                      >
                        {s.label}
                      </p>
                      <p className="truncate text-[12.5px] font-semibold text-faint">{s.detail}</p>
                    </div>
                    {state === "running" && !finished && (
                      <span className="anim-pulse-dot text-[12px] font-bold text-pink">
                        working…
                      </span>
                    )}
                    {state === "done" && (
                      <span className="text-[12px] font-bold text-mint">done</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* telemetry footer */}
        <div className="flex items-center justify-between border-t border-line bg-black/20 px-7 py-3.5">
          <span className="font-mono text-[11px] font-semibold text-faint">
            ELAPSED {fmtElapsed(elapsed)} · SCHED {fmtElapsed(total)}
          </span>
          <span className="font-mono text-[11px] font-semibold text-[#F9A8D4]">
            {finished
              ? "HANDOFF → STUDIO"
              : stageIdx >= 0
                ? STAGES[stageIdx].key.toUpperCase()
                : "STANDBY"}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
