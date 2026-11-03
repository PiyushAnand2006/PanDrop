import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, UserPlus, Wallet } from "lucide-react";
import type { UserAccount } from "../types/pandrop";
import { createUser } from "../lib/api";

/* ------------------------------------------------------------------ */
/* Create-account modal                                                */
/* ------------------------------------------------------------------ */

export function CreateAccountModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (user: UserAccount) => void;
}) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!username.trim()) {
      setError("Pick a username first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const user = await createUser(username, displayName, location);
      onCreated(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0.92 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Create account"
    >
      <motion.div
        initial={{ y: 28, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="ring-glow w-full max-w-md overflow-hidden rounded-3xl bg-surface p-7 shadow-panel"
      >
        <h3 className="font-display text-[22px] font-semibold text-ink">
          Create your account
        </h3>
        <p className="mt-1 text-[13.5px] text-mute">
          One account sells <span className="font-bold text-dim">and</span> buys — you
          start with a $500 wallet.
        </p>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="label mb-1.5 block">Username</span>
            <div className="flex items-center rounded-xl border border-line bg-black/25 px-3 focus-within:border-pink/50">
              <span className="font-mono text-[14px] font-semibold text-faint">@</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="swift_rider"
                autoFocus
                className="w-full bg-transparent py-2.5 font-mono text-[14px] font-semibold text-ink outline-none placeholder:text-faint/60"
              />
            </div>
          </label>
          <label className="block">
            <span className="label mb-1.5 block">Display name</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Riley Park"
              className="w-full rounded-xl border border-line bg-black/25 px-3.5 py-2.5 text-[14.5px] font-semibold text-ink outline-none transition focus:border-pink/50 placeholder:text-faint/60"
            />
          </label>
          <label className="block">
            <span className="label mb-1.5 block">Location</span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="San Francisco, CA"
              className="w-full rounded-xl border border-line bg-black/25 px-3.5 py-2.5 text-[14.5px] font-semibold text-ink outline-none transition focus:border-pink/50 placeholder:text-faint/60"
            />
          </label>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/[0.1] px-3.5 py-2.5 text-[13px] font-semibold text-red-300">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button onClick={submit} disabled={busy} className="btn-primary disabled:opacity-70">
            <UserPlus size={16} />
            {busy ? "Creating…" : "Create account"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Account switcher (top-bar dropdown)                                 */
/* ------------------------------------------------------------------ */

export function AccountSwitcher({
  users,
  current,
  onSelect,
  onCreate,
}: {
  users: UserAccount[];
  current: UserAccount | null;
  onSelect: (user: UserAccount) => void;
  onCreate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Switch account"
        aria-expanded={open}
        className="flex cursor-pointer items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] py-1.5 pr-2.5 pl-2 transition hover:border-pink/40"
      >
        {current ? (
          <img
            src={current.avatar_url}
            alt=""
            className="h-8 w-8 rounded-full border border-white/15"
          />
        ) : (
          <span className="brand-gradient grid h-8 w-8 place-items-center rounded-full text-[12px] font-bold text-white">
            ?
          </span>
        )}
        <span className="hidden text-left sm:block">
          <span className="block font-display text-[13px] leading-tight font-semibold text-ink">
            {current ? current.display_name : "No account"}
          </span>
          <span className="flex items-center gap-1 font-mono text-[11px] leading-tight font-semibold text-[#FCD34D]">
            <Wallet size={10} />
            {current ? `$${current.wallet_balance.toFixed(0)}` : "$0"}
          </span>
        </span>
        <ChevronDown
          size={15}
          className={`text-mute transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-line bg-surface shadow-panel"
          >
            <p className="border-b border-line px-4 pt-3.5 pb-2 text-[11.5px] font-bold text-faint">
              Switch account — one click
            </p>
            <ul className="max-h-72 overflow-y-auto p-1.5">
              {users.map((u) => {
                const active = current?.user_id === u.user_id;
                return (
                  <li key={u.user_id}>
                    <button
                      onClick={() => {
                        onSelect(u);
                        setOpen(false);
                      }}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition ${
                        active ? "bg-pink/[0.12]" : "hover:bg-white/[0.05]"
                      }`}
                    >
                      <img
                        src={u.avatar_url}
                        alt=""
                        className="h-9 w-9 rounded-full border border-white/15"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-[13.5px] font-semibold text-ink">
                          {u.display_name}
                          <span className="ml-1.5 font-mono text-[11px] font-semibold text-faint">
                            @{u.username}
                          </span>
                        </span>
                        <span className="block truncate text-[11.5px] font-semibold text-faint">
                          {u.location || "Anywhere"}
                        </span>
                      </span>
                      <span className="font-mono text-[12px] font-bold text-[#FCD34D]">
                        ${u.wallet_balance.toFixed(0)}
                      </span>
                      {active && <Check size={15} className="shrink-0 text-pink" />}
                    </button>
                  </li>
                );
              })}
              {users.length === 0 && (
                <li className="px-3 py-4 text-center text-[13px] font-semibold text-faint">
                  Backend offline — start it to load accounts.
                </li>
              )}
            </ul>
            <button
              onClick={() => {
                onCreate();
                setOpen(false);
              }}
              className="flex w-full cursor-pointer items-center gap-2 border-t border-line px-4 py-3.5 font-display text-[13.5px] font-semibold text-[#F9A8D4] transition hover:bg-pink/[0.08]"
            >
              <UserPlus size={15} />
              Create new account
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
