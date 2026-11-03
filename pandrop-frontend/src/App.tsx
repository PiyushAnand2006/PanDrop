import { useCallback, useEffect, useState } from "react";
import type { JobResponse, MarketplaceListing, UserAccount } from "./types/pandrop";
import { getUser, listUsers } from "./lib/api";
import Atmosphere from "./components/Atmosphere";
import TopBar, { type View } from "./components/TopBar";
import { CreateAccountModal } from "./components/AccountMenu";
import Discover from "./components/Discover";
import Studio from "./components/Studio";
import AccountHub from "./components/AccountHub";
import ListingDetail from "./components/ListingDetail";

export default function App() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [view, setView] = useState<View>("discover");
  const [studioJob, setStudioJob] = useState<JobResponse | null>(null);
  const [walletVersion, setWalletVersion] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [openListing, setOpenListing] = useState<MarketplaceListing | null>(null);

  /* ---------------- accounts ---------------- */
  useEffect(() => {
    let alive = true;
    listUsers()
      .then((us) => {
        if (!alive) return;
        setUsers(us);
        // default to the first seeded account until the judge switches
        setCurrentUser((cur) => cur ?? us[0] ?? null);
      })
      .catch(() => alive && setUsers([]));
    return () => {
      alive = false;
    };
  }, [walletVersion]);

  const refreshUser = useCallback(
    async (id: string) => {
      try {
        const u = await getUser(id);
        setCurrentUser(u);
        setUsers((us) => us.map((x) => (x.user_id === id ? u : x)));
      } catch {
        /* keep the stale copy */
      }
    },
    [],
  );

  const handlePurchased = useCallback(() => {
    setWalletVersion((v) => v + 1);
    if (currentUser) void refreshUser(currentUser.user_id);
  }, [currentUser, refreshUser]);

  const handlePublished = useCallback(() => {
    setWalletVersion((v) => v + 1);
  }, []);

  const handleCreated = useCallback(
    (user: UserAccount) => {
      setUsers((us) => [...us, user]);
      setCurrentUser(user);
      setCreateOpen(false);
    },
    [],
  );

  /* ---------------- navigation helpers ---------------- */
  const openJobInStudio = useCallback((job: JobResponse) => {
    setStudioJob(job);
    setView("studio");
  }, []);

  return (
    <div className="relative min-h-screen bg-base text-ink">
      <Atmosphere />
      <TopBar
        view={view}
        onNavigate={(v) => {
          setView(v);
          window.scrollTo({ top: 0 });
        }}
        users={users}
        currentUser={currentUser}
        onSelectUser={(u) => setCurrentUser(u)}
        onCreateUser={() => setCreateOpen(true)}
      />

      {view === "discover" && (
        <Discover walletVersion={walletVersion} onOpenListing={setOpenListing} />
      )}

      {view === "studio" && (
        <Studio
          user={currentUser}
          job={studioJob}
          onJob={setStudioJob}
          onGoDiscover={() => {
            setView("discover");
            window.scrollTo({ top: 0 });
          }}
          onPublished={handlePublished}
        />
      )}

      {view === "account" &&
        (currentUser ? (
          <AccountHub
            user={currentUser}
            walletVersion={walletVersion}
            onUserRefreshed={(u) => setCurrentUser(u)}
            onOpenListing={setOpenListing}
            onOpenJob={openJobInStudio}
          />
        ) : (
          <div className="mx-auto max-w-lg px-6 pt-40 text-center">
            <p className="font-display text-[18px] font-semibold text-ink">
              No account selected
            </p>
            <p className="mt-2 text-[14.5px] text-mute">
              Start the backend (or create an account from the top-bar switcher) to open
              your hub.
            </p>
          </div>
        ))}

      {/* shared listing inspector */}
      {openListing && (
        <ListingDetail
          listing={openListing}
          currentUserId={currentUser?.user_id ?? ""}
          onClose={() => setOpenListing(null)}
          onPurchased={(updated) => {
            setOpenListing(updated);
            handlePurchased();
          }}
        />
      )}

      {createOpen && (
        <CreateAccountModal
          onClose={() => setCreateOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
