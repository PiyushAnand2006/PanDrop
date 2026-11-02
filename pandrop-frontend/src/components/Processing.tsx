import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Loader2, RotateCcw } from "lucide-react";
import type { JobResponse } from "../types/pandrop";
import { STAGES, STAGE_TOTAL_MS } from "../lib/stages";

const TICK_MS = 90;

export default function Processing({
  task,
  accelerated,
  fileName,
  onDone,
  onCancel,
}: {
  task: () => Promise<JobResponse>;
  /** Demo preset: compress the schedule into a cinematic ~1.5s flash. */
  accelerated: boolean;
  fileName: string | null;
  onDone: (job: JobResponse) => void;
  onCancel: () => void;
}) {
  // Real pipeline: stretch the schedule to ~13s, then hold on the final stage.
  const speed = accelerated ? 0.42 : 2.6;
  const total = useMemo(() => STAGE_TOTAL_MS * speed, [speed]);

  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(0);
  const [stageIdx, setStageIdx] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const startRef = useRef(Date.now());
  const doneRef = useRef(false);

  // reset the clock when the task changes
  useEffect(() => {
    startRef.current = Date.now();
    doneRef.current = false;
  }, [task]);

  // schedule ticker
  useEffect(() => {
    if (error || finished) return;
    const id = setInterval(() => {
      const el = Date.now() - startRef.current;
      setElapsed(el);
      const p = Math.min(0.97, el / total);
      setProgress(p);
      // current stage = how many cumulative boundaries elapsed has passed
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

  // the real task
  useEffect(() => {
    let alive = true;
    task()
      .then((job) => {
        if (!alive) return;
        doneRef.current = true;
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
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="hud-corners glass w-full overflow-hidden rounded-2xl"
      >
        {/* header: big % + progress bar */}
        <div className="border-b border-line px-7 pt-7 pb-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="hud-label mb-2">
                {accelerated ? "Materializing demo showcase" : "Running PanDrop pipeline"}
              </p>
              <p className="truncate text-[15px] font-bold text-ink">
                {fileName ?? "demo_showcase.mp4"}
              </p>
            </div>
            <span className="font-mono text-[34px] leading-none font-bold text-neon tabular-nums">
              {pct}
              <span className="text-[16px] text-faint">%</span>
            </span>
          </div>
          <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #00F0FF, #0066FF)",
                boxShadow: "0 0 12px rgba(0,240,255,0.55)",
              }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* stages */}
        <div className="px-7 py-5">
          {error ? (
            <div className="flex flex-col items-start gap-4 py-4">
              <p className="inline-flex items-center gap-2 rounded-lg border border-ember/40 bg-ember/[0.1] px-3 py-2 text-[13px] text-[#FFA36B]">
                <AlertTriangle size={14} />
                Pipeline failed
              </p>
              <p className="text-[13px] leading-relaxed text-dim">{error}</p>
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/12 bg-white/[0.05] px-4 py-2 text-[12.5px] font-semibold text-ink transition hover:border-neon/40"
                >
                  <RotateCcw size={13} /> Back to upload
                </button>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {STAGES.map((s, i) => {
                const state =
                  finished || i < stageIdx
                    ? "done"
                    : i === stageIdx
                      ? "running"
                      : "queued";
                return (
                  <li
                    key={s.key}
                    className={`flex items-center gap-3.5 py-3 transition-opacity duration-300 ${
                      state === "queued" ? "opacity-35" : "opacity-100"
                    }`}
                  >
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border ${
                        state === "done"
                          ? "border-mint/40 bg-mint/[0.12] text-mint"
                          : state === "running"
                            ? "border-neon/50 bg-neon/[0.1] text-neon"
                            : "border-white/10 bg-white/[0.03] text-faint"
                      }`}
                    >
                      {state === "done" ? (
                        <Check size={14} strokeWidth={3} />
                      ) : state === "running" ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <span className="font-mono text-[10px]">{i + 1}</span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-[13.5px] font-semibold ${
                          state === "running" ? "text-ink" : state === "done" ? "text-dim" : "text-faint"
                        }`}
                      >
                        {s.label}
                      </p>
                      <p className="truncate font-mono text-[10.5px] tracking-[0.08em] text-faint">
                        {s.detail}
                      </p>
                    </div>
                    {state === "running" && !finished && (
                      <span className="hud-label !text-neon/80 anim-pulse-dot">working</span>
                    )}
                    {state === "done" && (
                      <span className="hud-label !text-mint/80">
                        {finished || i < stageIdx ? "✓" : ""}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* telemetry footer */}
        <div className="flex items-center justify-between border-t border-line bg-black/20 px-7 py-3.5">
          <span className="font-mono text-[10.5px] tracking-[0.14em] text-faint">
            ELAPSED {fmtElapsed(elapsed)} · SCHED {fmtElapsed(total)}
          </span>
          <span className="font-mono text-[10.5px] tracking-[0.14em] text-neon/70">
            {finished ? "HANDOFF → STUDIO" : stageIdx >= 0 ? STAGES[stageIdx].key.toUpperCase() : "STANDBY"}
          </span>
        </div>
      </motion.div>

      {/* scanline atmosphere */}
      <AnimatePresence>
        {!error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-x-0 top-14 h-px"
          >
            <div className="neon-line anim-flicker h-px w-full" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
