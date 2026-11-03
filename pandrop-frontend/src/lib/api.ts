import type {
  JobResponse,
  ListingQuery,
  MarketplaceListing,
  PublishItemOverride,
  UserAccount,
  UserDashboardResponse,
} from "../types/pandrop";

/**
 * API base resolution.
 *
 * The backend may run on 8000 by default, but that port is frequently occupied
 * by other dev services, so the frontend probes a small set of candidates and
 * sticks with the first one that answers as a PanDrop backend. An explicit
 * VITE_API_BASE_URL always wins if it responds.
 */

const DEFAULT_BASES = [
  import.meta.env.VITE_API_BASE_URL,
  "http://localhost:8000",
  "http://localhost:8010",
  "http://localhost:8020",
  "http://127.0.0.1:8000",
  "http://127.0.0.1:8010",
].filter((v): v is string => !!v);

let resolvedBase: string | null = null;
let resolvedMockAI: boolean | null = null;
let resolving: Promise<{ base: string; mockAI: boolean }> | null = null;

/** Probe candidates and remember the first real PanDrop backend. */
export function resolveApiBase(): Promise<{ base: string; mockAI: boolean }> {
  if (resolvedBase) {
    return Promise.resolve({ base: resolvedBase, mockAI: !!resolvedMockAI });
  }
  if (resolving) return resolving;

  resolving = (async () => {
    for (const base of DEFAULT_BASES) {
      try {
        const res = await withTimeout(
          fetch(`${base}/api/v1/health`, { headers: { Accept: "application/json" } }),
          1500,
        );
        if (!res.ok) continue;
        const data = await res.json();
        if (data?.service === "pandrop-backend" && data?.status === "ok") {
          resolvedBase = base;
          resolvedMockAI = !!data.mock_ai;
          return { base, mockAI: resolvedMockAI };
        }
      } catch {
        /* try the next candidate */
      }
    }
    // Nothing answered — return the configured default WITHOUT caching it, so
    // the next call re-probes (the backend may come up at any moment).
    resolving = null;
    return { base: DEFAULT_BASES[0], mockAI: false };
  })();
  return resolving;
}

/** Reset the cached base so the next call re-probes (e.g. after a failure). */
export function invalidateApiBase(): void {
  resolvedBase = null;
  resolvedMockAI = null;
  resolving = null;
}

/** The currently resolved base (null until the first probe succeeds). */
export function currentApiBase(): string | null {
  return resolvedBase;
}

/** For display only — the configured default before any probe. */
export const API_BASE: string = DEFAULT_BASES[0];

/**
 * Prepend the resolved backend origin to backend-relative paths
 * ("/static/…", "/api/…"). Everything else (absolute URLs, bundled /demo/…
 * assets, data URIs) passes through unchanged.
 */
export function resolveAssetUrl(path: string): string {
  if (!path) return path;
  if (path.startsWith("/static/") || path.startsWith("/api/")) {
    return `${resolvedBase ?? API_BASE}${path}`;
  }
  return path;
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function readError(res: Response, fallback: string): Promise<ApiError> {
  let detail = fallback;
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") detail = data.detail;
  } catch {
    /* non-JSON error body */
  }
  return new ApiError(detail, res.status);
}

/** Shared base resolution with a friendly error when nothing responds. */
async function base(): Promise<string> {
  const { base } = await resolveApiBase();
  return base;
}

/** Drop the cached base after a network failure so the next call re-probes. */
function resetBase(): void {
  resolvedBase = null;
  resolvedMockAI = null;
  resolving = null;
}

function throwOffline(tried: string): never {
  throw new ApiError(
    `Could not reach the PanDrop backend (tried ${tried}). ` +
      `Start it with: cd pandrop-backend && uvicorn app.main:app --port 8000`,
  );
}

/**
 * Upload a video for the given account. The backend processes synchronously —
 * the promise resolves with the finished JobResponse.
 */
export async function processVideo(file: File, userId: string): Promise<JobResponse> {
  const body = new FormData();
  body.append("file", file, file.name);
  body.append("user_id", userId);
  let res: Response;
  try {
    res = await fetch(`${await base()}/api/v1/process-video`, { method: "POST", body });
  } catch {
    resetBase();
    throwOffline(DEFAULT_BASES[0]);
  }
  if (!res.ok) throw await readError(res, `Upload failed (${res.status})`);
  return (await res.json()) as JobResponse;
}

/** Fetch a previously processed job by id. */
export async function getJob(jobId: string): Promise<JobResponse> {
  const res = await fetch(`${await base()}/api/v1/jobs/${encodeURIComponent(jobId)}`);
  if (!res.ok) throw await readError(res, `Job ${jobId} not found`);
  return (await res.json()) as JobResponse;
}

/* ------------------------------------------------------------------ */
/* Accounts                                                            */
/* ------------------------------------------------------------------ */

export async function listUsers(): Promise<UserAccount[]> {
  let res: Response;
  try {
    res = await fetch(`${await base()}/api/v1/users`);
  } catch {
    resetBase();
    throwOffline(DEFAULT_BASES[0]);
  }
  if (!res.ok) throw await readError(res, "Could not load accounts");
  return (await res.json()) as UserAccount[];
}

export async function createUser(
  username: string,
  displayName: string,
  location: string,
): Promise<UserAccount> {
  const res = await fetch(`${await base()}/api/v1/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, display_name: displayName, location }),
  });
  if (!res.ok) throw await readError(res, "Could not create the account");
  return (await res.json()) as UserAccount;
}

export async function getUser(userId: string): Promise<UserAccount> {
  const res = await fetch(`${await base()}/api/v1/users/${encodeURIComponent(userId)}`);
  if (!res.ok) throw await readError(res, "Account not found");
  return (await res.json()) as UserAccount;
}

export async function getDashboard(userId: string): Promise<UserDashboardResponse> {
  const res = await fetch(
    `${await base()}/api/v1/users/${encodeURIComponent(userId)}/dashboard`,
  );
  if (!res.ok) throw await readError(res, "Dashboard not found");
  return (await res.json()) as UserDashboardResponse;
}

/* ------------------------------------------------------------------ */
/* Marketplace                                                         */
/* ------------------------------------------------------------------ */

export async function publishItems(
  userId: string,
  jobId: string,
  itemIds: string[],
  overrides: Record<string, PublishItemOverride> = {},
): Promise<MarketplaceListing[]> {
  const res = await fetch(`${await base()}/api/v1/marketplace/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, job_id: jobId, item_ids: itemIds, overrides }),
  });
  if (!res.ok) throw await readError(res, "Could not publish to the marketplace");
  return (await res.json()) as MarketplaceListing[];
}

export async function listListings(query: ListingQuery = {}): Promise<MarketplaceListing[]> {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category && query.category !== "All") params.set("category", query.category);
  if (query.min_price != null) params.set("min_price", String(query.min_price));
  if (query.max_price != null) params.set("max_price", String(query.max_price));
  if (query.min_condition != null) params.set("min_condition", String(query.min_condition));
  if (query.status) params.set("status", query.status);
  const res = await fetch(`${await base()}/api/v1/marketplace/listings?${params.toString()}`);
  if (!res.ok) throw await readError(res, "Could not load the marketplace");
  return (await res.json()) as MarketplaceListing[];
}

export async function getListing(listingId: string): Promise<MarketplaceListing> {
  const res = await fetch(
    `${await base()}/api/v1/marketplace/${encodeURIComponent(listingId)}`,
  );
  if (!res.ok) throw await readError(res, "Listing not found");
  return (await res.json()) as MarketplaceListing;
}

export async function buyListing(
  listingId: string,
  buyerId: string,
): Promise<MarketplaceListing> {
  const res = await fetch(
    `${await base()}/api/v1/marketplace/${encodeURIComponent(listingId)}/buy`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyer_id: buyerId }),
    },
  );
  if (!res.ok) throw await readError(res, "Purchase failed");
  return (await res.json()) as MarketplaceListing;
}

/** Startup probe used by the App shell to reflect mock/live mode in the UI. */
export async function probeBackend(): Promise<{
  base: string;
  mockAI: boolean;
  online: boolean;
}> {
  const { base, mockAI } = await resolveApiBase();
  const online = resolvedMockAI !== null;
  return { base, mockAI, online };
}
