import { motion } from "framer-motion";
import { Compass, Clapperboard, CircleUserRound } from "lucide-react";
import { AccountSwitcher } from "./AccountMenu";
import { BrandMark } from "./atoms";
import type { UserAccount } from "../types/pandrop";

export type View = "discover" | "studio" | "account";
export type BackendState = "checking" | "online" | "offline";

const NAV = [
  { key: "discover" as const, label: "Discover & Search", icon: Compass },
  { key: "studio" as const, label: "AI Sell Studio", icon: Clapperboard },
  { key: "account" as const, label: "My Account", icon: CircleUserRound },
];

export default function TopBar({
  view,
  onNavigate,
  users,
  currentUser,
  onSelectUser,
  onCreateUser,
}: {
  view: View;
  onNavigate: (view: View) => void;
  users: UserAccount[];
  currentUser: UserAccount | null;
  onSelectUser: (user: UserAccount) => void;
  onCreateUser: () => void;
}) {
  return (
    <motion.header
      initial={{ y: -24 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div className="glass flex h-16 items-center justify-between gap-4 border-x-0 border-t-0 px-4 sm:px-6">
        <button
          onClick={() => onNavigate("discover")}
          className="group flex shrink-0 items-center gap-3"
          aria-label="PanDrop home"
        >
          <span className="transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
            <BrandMark />
          </span>
          <span className="hidden font-display text-[19px] font-bold tracking-tight text-ink sm:block">
            PanDrop
          </span>
        </button>

        {/* three-view navigation */}
        <nav
          aria-label="Primary"
          className="flex items-center gap-1 rounded-2xl border border-white/[0.07] bg-black/25 p-1"
        >
          {NAV.map((n) => {
            const active = view === n.key;
            return (
              <button
                key={n.key}
                onClick={() => onNavigate(n.key)}
                aria-current={active ? "page" : undefined}
                className={`relative flex cursor-pointer items-center gap-1.5 rounded-xl px-2.5 py-2 font-display text-[12.5px] font-semibold whitespace-nowrap transition-colors sm:px-3.5 sm:text-[13.5px] ${
                  active ? "text-ink" : "text-mute hover:text-dim"
                }`}
              >
                <n.icon size={15} className={active ? "text-pink" : ""} />
                <span className="hidden md:inline">{n.label}</span>
                <span className="md:hidden">{n.label.split(" ")[0]}</span>
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 -z-10 rounded-xl bg-pink/[0.14] ring-1 ring-pink/35"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        <AccountSwitcher
          users={users}
          current={currentUser}
          onSelect={onSelectUser}
          onCreate={onCreateUser}
        />
      </div>
      <div className="neon-line h-px w-full opacity-50" />
    </motion.header>
  );
}
