import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  FolderOpen,
  ScanLine,
  ShieldCheck,
  Tag,
  UploadCloud,
  Zap,
} from "lucide-react";
import { API_BASE } from "../lib/api";
import { Chip } from "./atoms";
import type { BackendState } from "./TopBar";

const FEATURES = [
  {
    icon: ScanLine,
    title: "SAM 3.1 segmentation",
    body: "Point at an item while you talk — a pixel-perfect mask lifts it straight out of the frame.",
    tone: "pink" as const,
  },
  {
    icon: ShieldCheck,
    title: "AI condition audit",
    body: "Your spoken claim is cross-checked against what the camera actually sees.",
    tone: "violet" as const,
  },
  {
    icon: Tag,
    title: "Studio price tagging",
    body: "Cutouts become studio-lit hero shots with the price burned right in.",
    tone: "blue" as const,
  },
] as const;

const STEPS = [
  { n: "1", t: "Drop a video", d: "Any clip of you showing the item around." },
  { n: "2", t: "Point & talk", d: "“This camera — 85 bucks, works perfectly.”" },
  { n: "3", t: "AI does the rest", d: "Segmentation, audit and studio compositing." },
  { n: "4", t: "Listing ready", d: "Showcase art, badge and price tag — done." },
] as const;

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};
const rise = {
  hidden: { y: 26 },
  show: {
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export default function Landing({
  onFile,
  onDemo,
  backend,
  initialError,
}: {
  onFile: (file: File) => void;
  onDemo: () => void;
  backend: BackendState;
  initialError: string | null;
}) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
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
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 sm:px-8">
      <main className="grid flex-1 items-center gap-12 pt-28 pb-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14">
        {/* ---------------------------------------------------------- */}
        {/* Hero                                                        */}
        {/* ---------------------------------------------------------- */}
        <motion.section variants={container} initial="hidden" animate="show">
          <motion.div variants={rise} className="mb-6 flex flex-wrap items-center gap-2">
            <Chip tone="pink">SAM 3.1 segmentation</Chip>
            <Chip tone="violet">AI condition audit</Chip>
            <Chip tone={backend === "online" ? "mint" : "amber"}>
              {backend === "online" ? "Live pipeline ready" : "Works offline"}
            </Chip>
          </motion.div>

          <motion.h1
            variants={rise}
            className="text-[11vw] leading-[1.04] font-bold tracking-tight text-ink sm:text-6xl lg:text-[4.2rem]"
          >
            Point. Talk.
            <br />
            <span className="brand-gradient-text">Sold.</span>
          </motion.h1>

          <motion.p
            variants={rise}
            className="mt-6 max-w-xl text-[17px] leading-relaxed text-dim"
          >
            Turn a casual product video into a complete e-commerce listing. Say what
            it is and what it costs — PanDrop segments each item, checks its
            condition, and composes studio-ready imagery with the price burned in.
          </motion.p>

          <motion.ul variants={rise} className="mt-8 space-y-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="group flex items-start gap-4">
                <span
                  className={`mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-2xl border transition-transform duration-200 group-hover:scale-105 ${
                    f.tone === "pink"
                      ? "border-pink/30 bg-pink/[0.12] text-pink"
                      : f.tone === "violet"
                        ? "border-violet/30 bg-violet/[0.12] text-violet"
                        : "border-royal/40 bg-royal/[0.14] text-royal-bright"
                  }`}
                >
                  <f.icon size={19} />
                </span>
                <div>
                  <p className="font-display text-[15.5px] font-semibold text-ink">
                    {f.title}
                  </p>
                  <p className="text-[14px] leading-snug text-mute">{f.body}</p>
                </div>
              </li>
            ))}
          </motion.ul>

          <motion.div variants={rise} className="mt-9 flex flex-wrap items-center gap-3.5">
            <button onClick={onDemo} className="btn-primary">
              <Zap size={17} />
              Watch a 6-second demo
            </button>
            <span className="text-[14px] text-mute">
              Real clip, real pipeline output — no upload needed.
            </span>
          </motion.div>
        </motion.section>

        {/* ---------------------------------------------------------- */}
        {/* Right: real video + dropzone                                */}
        {/* ---------------------------------------------------------- */}
        <motion.section
          initial={{ y: 34 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.75, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-5"
        >
          {/* real sample video — actual frames from the bundled clip */}
          <figure className="ring-glow overflow-hidden rounded-3xl">
            <video
              src="/demo/sample.mp4"
              poster="/demo/item_1/raw_frame.jpg"
              autoPlay
              muted
              loop
              playsInline
              aria-label="Real sample clip: a product drop being recorded"
              className="aspect-video w-full bg-surface object-cover"
            />
            <figcaption className="flex items-center justify-between bg-surface px-4 py-2.5 text-[12.5px] font-bold text-mute">
              <span>The sample clip — real footage</span>
              <span className="font-mono text-[11px] text-faint">00:06 · 640×480</span>
            </figcaption>
          </figure>

          {/* dropzone */}
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
            className={`card card-hover relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border-dashed p-8 text-center transition-all duration-200 ${
              dragging
                ? "border-pink/70 bg-pink/[0.06] shadow-glow-pink"
                : "border-line-strong hover:border-pink/40"
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
              className={`grid h-16 w-16 place-items-center rounded-2xl border transition-all duration-200 ${
                dragging
                  ? "border-pink/60 bg-pink/15 text-pink"
                  : "border-white/12 bg-white/[0.05] text-dim"
              }`}
            >
              <UploadCloud size={28} strokeWidth={1.8} />
            </span>

            <p className="relative mt-5 font-display text-lg font-semibold text-ink">
              {dragging ? "Drop it — we'll take it from here" : "Drop your product video"}
            </p>
            <p className="relative mt-1 text-[13.5px] font-semibold text-faint">
              MP4, MOV or WEBM · up to a few minutes
            </p>

            <span className="relative mt-6 inline-flex items-center gap-2 rounded-xl border border-pink/35 bg-pink/[0.1] px-5 py-2.5 font-display text-[14px] font-semibold text-[#F9A8D4] transition-all duration-200 hover:bg-pink/[0.18]">
              <FolderOpen size={16} />
              Browse files
            </span>

            <p className="relative mt-5 max-w-xs text-[12.5px] leading-relaxed text-faint">
              Processed by the PanDrop pipeline at{" "}
              <span className="font-mono text-[11.5px] text-mute">
                {API_BASE.replace(/^https?:\/\//, "")}
              </span>
            </p>

            {error && (
              <motion.p
                initial={{ y: 8 }}
                animate={{ y: 0 }}
                className="relative mt-5 inline-flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/[0.1] px-3.5 py-2 text-[13px] font-semibold text-red-300"
              >
                <AlertTriangle size={14} />
                {error}
              </motion.p>
            )}
          </div>
        </motion.section>
      </main>

      {/* ---------------------------------------------------------- */}
      {/* How it works strip                                          */}
      {/* ---------------------------------------------------------- */}
      <motion.footer
        initial={{ y: 24 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.5, duration: 0.7 }}
        className="pb-10"
      >
        <div className="neon-line mb-8 h-px w-full opacity-40" />
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="group">
              <div className="flex items-center gap-3">
                <span className="brand-gradient grid h-8 w-8 place-items-center rounded-xl font-display text-[14px] font-bold text-white shadow-glow-pink">
                  {s.n}
                </span>
                <span className="font-display text-[15px] font-semibold text-ink">{s.t}</span>
              </div>
              <p className="mt-2 pl-11 text-[13.5px] leading-snug text-mute">{s.d}</p>
            </div>
          ))}
        </div>
      </motion.footer>
    </div>
  );
}
