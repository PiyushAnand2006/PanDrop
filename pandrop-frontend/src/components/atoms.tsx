import { type ReactNode } from "react";
import { BadgeCheck, Mic } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Tiny shared atoms                                                   */
/* ------------------------------------------------------------------ */

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="bm-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#EC4899" />
          <stop offset="0.55" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#bm-g)" />
      <circle cx="30" cy="26" r="8" fill="none" stroke="#fff" strokeWidth="3.5" />
      <path
        d="M30 13v6M30 33v6M17 26h6M37 26h6"
        stroke="#fff"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path d="M22 44h20l-4 9H26z" fill="#fff" opacity="0.92" />
    </svg>
  );
}

export function Chip({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "pink" | "violet" | "blue" | "mint" | "amber";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "border-white/10 bg-white/[0.05] text-mute",
    pink: "border-pink/35 bg-pink/[0.12] text-[#F9A8D4]",
    violet: "border-violet/35 bg-violet/[0.12] text-[#C4B5FD]",
    blue: "border-royal/45 bg-royal/[0.16] text-[#93C5FD]",
    mint: "border-mint/40 bg-mint/[0.12] text-[#6EE7B7]",
    amber: "border-gold/45 bg-gold/[0.12] text-[#FCD34D]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-bold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Warm amber price tag with a soft glow. */
export function PriceTag({
  formatted,
  size = "md",
}: {
  formatted: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "px-2 py-0.5 text-[12px] rounded-lg",
    md: "px-2.5 py-1 text-[14px] rounded-lg",
    lg: "px-4 py-1.5 text-[22px] rounded-xl",
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
      className={`inline-flex items-center gap-1.5 rounded-full border border-mint/40 bg-mint/[0.12] font-bold text-[#6EE7B7] ${
        compact ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-[12.5px]"
      }`}
    >
      <BadgeCheck size={compact ? 13 : 15} className="shrink-0" />
      <span className="truncate">{text}</span>
    </span>
  );
}

/** Spoken claim quoted with a mic icon. */
export function SpokenClaim({ text }: { text: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[13px] font-semibold text-dim">
      <Mic size={13} className="shrink-0 text-pink" />
      <span className="truncate italic">“{text}”</span>
    </span>
  );
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <span className="label">{children}</span>
      {right}
    </div>
  );
}
