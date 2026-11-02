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
      ? { dot: "bg-mint", text: "BACKEND LINKED", tone: "mint" as const }
      : backend === "offline"
        ? { dot: "bg-gold", text: "STANDALONE · DEMO READY", tone: "gold" as const }
        : { dot: "bg-dim", text: "LINKING…", tone: "neutral" as const };

  return (
    <motion.header
      initial={{ y: -24 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div className="glass flex h-14 items-center justify-between border-x-0 border-t-0 px-4 sm:px-6">
        <button
          onClick={onReset}
          className="group flex items-center gap-3"
          aria-label="PanDrop home"
        >
          <span className="transition-transform duration-300 group-hover:rotate-[8deg]">
            <BrandMark />
          </span>
          <span className="flex items-baseline gap-2">
            <span className="text-[17px] font-extrabold tracking-tight text-ink">
              PanDrop
            </span>
            <span className="hud-label !text-neon/80">STUDIO</span>
          </span>
        </button>

        <div className="flex items-center gap-2.5">
          {isDemo && (
            <Chip tone="gold">
              <Zap size={11} />
              Demo data
            </Chip>
          )}
          {inStudio && (
            <button
              onClick={onReset}
              className="hidden items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] font-semibold text-dim transition hover:border-neon/40 hover:text-ink sm:inline-flex"
            >
              <RotateCcw size={13} />
              New session
            </button>
          )}
          <span
            className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 md:inline-flex"
            title={`API: ${API_BASE}`}
          >
            <span className={`anim-pulse-dot h-2 w-2 rounded-full ${status.dot}`} />
            <span className="font-mono text-[10.5px] tracking-[0.18em] text-dim">
              {status.text}
            </span>
          </span>
        </div>
      </div>
      <div className="neon-line h-px w-full opacity-60" />
    </motion.header>
  );
}
