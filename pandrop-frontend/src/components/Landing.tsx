import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Crosshair,
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
    body: "Point-prompt the item — a pixel-perfect mask lifts it out of the frame.",
  },
  {
    icon: ShieldCheck,
    title: "AI condition audit",
    body: "Your spoken claim is cross-checked against what the camera actually sees.",
  },
  {
    icon: Tag,
    title: "Studio price tagging",
    body: "Cutouts become studio-lit hero shots with the price burned right in.",
  },
] as const;

const STEPS = [
  { n: "01", t: "Drop a video", d: "Any clip of you showing the item around." },
  { n: "02", t: "Point & talk", d: "“This camera — 85 bucks, works perfectly.”" },
  { n: "03", t: "AI segments", d: "SAM 3.1 isolates each product at its timestamp." },
  { n: "04", t: "Listing ready", d: "Showcase art, audit badge, price tag — done." },
] as const;

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};
const rise = {
  hidden: { y: 26 },
  show: {
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
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
      <main className="grid flex-1 items-center gap-12 pt-28 pb-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        {/* ---------------------------------------------------------- */}
        {/* Hero                                                        */}
        {/* ---------------------------------------------------------- */}
        <motion.section variants={container} initial="hidden" animate="show">
          <motion.div variants={rise} className="mb-6 flex flex-wrap items-center gap-2">
            <Chip tone="neon">
              <Crosshair size={11} /> SAM 3.1 powered
            </Chip>
            <Chip>Video → Listings</Chip>
            <Chip tone={backend === "online" ? "mint" : "gold"}>
              {backend === "online" ? "Live pipeline" : "Offline demo mode"}
            </Chip>
          </motion.div>

          <motion.h1
            variants={rise}
            className="text-[13vw] leading-[0.94] font-extrabold tracking-[-0.035em] text-ink sm:text-6xl lg:text-[4.6rem]"
          >
            Point. Talk.
            <br />
            <span className="price-gradient">Sold.</span>
          </motion.h1>

          <motion.p
            variants={rise}
            className="mt-6 max-w-xl text-[15.5px] leading-relaxed text-dim"
          >
            PanDrop turns a casual product video into a complete e-commerce showcase.
            Say what it is and what it costs — the studio segments it, audits its
            condition, and composes listing-ready imagery with the price burned in.
          </motion.p>

          <motion.ul variants={rise} className="mt-8 space-y-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="group flex items-start gap-3.5">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-neon/25 bg-neon/[0.07] text-neon transition-all duration-300 group-hover:border-neon/60 group-hover:shadow-[0_0_18px_rgba(0,240,255,0.25)]">
                  <f.icon size={17} />
                </span>
                <div>
                  <p className="text-[14px] font-bold text-ink">{f.title}</p>
                  <p className="text-[13px] leading-snug text-faint">{f.body}</p>
                </div>
              </li>
            ))}
          </motion.ul>

          <motion.div variants={rise} className="mt-9 flex flex-wrap items-center gap-3">
            <button
              onClick={onDemo}
              className="group inline-flex items-center gap-2.5 rounded-xl border border-gold/40 bg-gold/[0.08] px-5 py-3 text-[13.5px] font-bold text-[#F9DC7C] transition-all duration-300 hover:border-gold/70 hover:bg-gold/[0.14] hover:shadow-[0_0_28px_rgba(247,201,72,0.22)]"
            >
              <Zap
                size={16}
                className="transition-transform duration-300 group-hover:scale-110"
              />
              Load Instant Demo Showcase
            </button>
            <span className="text-[12px] text-faint">
              No video handy? Judge the full UI in one click.
            </span>
          </motion.div>
        </motion.section>

        {/* ---------------------------------------------------------- */}
        {/* Dropzone                                                    */}
        {/* ---------------------------------------------------------- */}
        <motion.section
          initial={{ y: 34, scale: 0.985 }}
          animate={{ y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
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
            className={`hud-corners glass relative flex aspect-[4/3.4] max-h-[520px] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl p-8 text-center transition-all duration-300 sm:aspect-auto sm:h-[440px] ${
              dragging
                ? "border-neon/60 shadow-glow-neon scale-[1.01]"
                : "hover:border-white/20"
            }`}
          >
            {/* scan sweep while dragging */}
            {dragging && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                <div className="anim-sweep absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-neon/15 to-transparent" />
              </div>
            )}
            <div className="scanlines pointer-events-none absolute inset-0 opacity-60" />

            <input
              ref={inputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/*"
              className="hidden"
              onChange={(e) => take(e.target.files?.[0])}
            />

            <span
              className={`relative grid h-20 w-20 place-items-center rounded-2xl border transition-all duration-300 ${
                dragging
                  ? "border-neon/70 bg-neon/15 text-neon shadow-glow-neon"
                  : "border-white/12 bg-white/[0.05] text-dim"
              }`}
            >
              <UploadCloud size={34} strokeWidth={1.6} />
              <span className="absolute -right-1.5 -bottom-1.5 grid h-6 w-6 place-items-center rounded-md border border-neon/40 bg-obsidian text-neon">
                <Crosshair size={12} />
              </span>
            </span>

            <p className="relative mt-6 text-lg font-bold text-ink">
              {dragging ? "Release to run the pipeline" : "Drop your product video"}
            </p>
            <p className="relative mt-1.5 font-mono text-[11px] tracking-[0.18em] text-faint">
              MP4 · MOV · WEBM — TALK & POINT AT EACH ITEM
            </p>

            <span className="relative mt-7 inline-flex items-center gap-2 rounded-xl border border-neon/35 bg-neon/[0.09] px-5 py-2.5 text-[13px] font-bold text-[#8DF4FF] transition-all duration-300 hover:bg-neon/[0.16] hover:shadow-[0_0_24px_rgba(0,240,255,0.25)]">
              <FolderOpen size={15} />
              Browse files
            </span>

            <p className="relative mt-6 max-w-xs text-[11.5px] leading-relaxed text-faint">
              The clip is processed by the PanDrop pipeline at{" "}
              <span className="font-mono text-dim">{API_BASE.replace(/^https?:\/\//, "")}</span>
            </p>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative mt-5 inline-flex items-center gap-2 rounded-lg border border-ember/40 bg-ember/[0.1] px-3 py-2 text-[12px] text-[#FFA36B]"
              >
                <AlertTriangle size={13} />
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
        transition={{ delay: 0.6, duration: 0.8 }}
        className="pb-10"
      >
        <div className="neon-line mb-8 h-px w-full opacity-40" />
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="group">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[26px] font-bold text-neon/25 transition-colors duration-300 group-hover:text-neon/70">
                  {s.n}
                </span>
                <span className="text-[14px] font-bold text-ink">{s.t}</span>
              </div>
              <p className="mt-1.5 pl-[52px] text-[12.5px] leading-snug text-faint">
                {s.d}
              </p>
            </div>
          ))}
        </div>
      </motion.footer>
    </div>
  );
}
