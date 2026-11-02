import { type ReactNode } from "react";
import { BadgeCheck, Mic } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Tiny shared atoms                                                   */
/* ------------------------------------------------------------------ */

export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="bm-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00F0FF" />
          <stop offset="1" stopColor="#0066FF" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="26" r="10" fill="none" stroke="url(#bm-g)" strokeWidth="4" />
      <path
        d="M32 8v9M32 35v9M15 26h9M40 26h9"
        stroke="url(#bm-g)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M20 46h24l-4.5 10h-15z" fill="#FF6B35" />
      <path d="M20 46h24l-1.4 3H21.4z" fill="#F7C948" />
    </svg>
  );
}

export function Chip({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "neon" | "mint" | "ember" | "gold";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "border-white/10 bg-white/[0.04] text-dim",
    neon: "border-neon/30 bg-neon/[0.08] text-[#8DF4FF]",
    mint: "border-mint/35 bg-mint/[0.1] text-[#6EE7B7]",
    ember: "border-ember/40 bg-ember/[0.1] text-[#FFA36B]",
    gold: "border-gold/40 bg-gold/[0.1] text-[#F9DC7C]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[10.5px] tracking-[0.12em] uppercase ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Amber-orange gradient price tag with warm glow. */
export function PriceTag({
  formatted,
  size = "md",
}: {
  formatted: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "px-2 py-0.5 text-[11px] rounded-md",
    md: "px-2.5 py-1 text-[13px] rounded-lg",
    lg: "px-4 py-1.5 text-[20px] rounded-xl",
  };
  return (
    <span
      className={`price-chip inline-flex items-center font-mono font-bold tracking-tight ${sizes[size]}`}
    >
      {formatted}
    </span>
  );
}

/** Emerald verified-condition badge built from ai_badge_text. */
export function ConditionBadge({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border border-mint/35 bg-mint/[0.1] font-mono text-mint ${
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11.5px]"
      }`}
    >
      <BadgeCheck size={compact ? 12 : 14} className="shrink-0" />
      <span className="truncate">{text}</span>
    </span>
  );
}

/** Spoken claim quoted with a mic icon. */
export function SpokenClaim({ text }: { text: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11.5px] text-dim">
      <Mic size={12} className="shrink-0 text-neon/70" />
      <span className="truncate italic">“{text}”</span>
    </span>
  );
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <span className="hud-label">{children}</span>
      {right}
    </div>
  );
}
