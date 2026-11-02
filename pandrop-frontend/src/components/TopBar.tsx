import { motion } from "framer-motion";
import { RotateCcw, Zap } from "lucide-react";
import { API_BASE } from "../lib/api";
import { BrandMark, Chip } from "./atoms";

export type BackendState = "checking" | "online" | "offline";

export default function TopBar({
  backend,
  isDemo,
  inStudio,
  onReset,
}: {
  backend: BackendState;
  isDemo: boolean;
  inStudio: boolean;
  onReset: () => void;
}) {
  const status =
    backend === "online"
      ? { dot: "bg-mint", text: "Backend connected" }
      : backend === "offline"
        ? { dot: "bg-gold", text: "Demo mode — no backend" }
        : { dot: "bg-mute", text: "Connecting…" };

  return (
    <motion.header
      initial={{ y: -24 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div className="glass flex h-16 items-center justify-between border-x-0 border-t-0 px-4 sm:px-6">
        <button
          onClick={onReset}
          className="group flex items-center gap-3"
          aria-label="PanDrop home"
        >
          <span className="transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
            <BrandMark />
          </span>
          <span className="font-display text-[19px] font-bold tracking-tight text-ink">
            PanDrop
          </span>
        </button>

        <div className="flex items-center gap-2.5">
          {isDemo && (
            <Chip tone="amber">
              <Zap size={12} />
              Demo clip
            </Chip>
          )}
          {inStudio && (
            <button onClick={onReset} className="btn-ghost !hidden sm:!inline-flex">
              <RotateCcw size={14} />
              New session
            </button>
          )}
          <span
            className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 md:inline-flex"
            title={`API: ${API_BASE}`}
          >
            <span className={`anim-pulse-dot h-2 w-2 rounded-full ${status.dot}`} />
            <span className="text-[13px] font-bold text-mute">{status.text}</span>
          </span>
        </div>
      </div>
      <div className="neon-line h-px w-full opacity-50" />
    </motion.header>
  );
}
