import type {
  JobResponse,
  ListingQuery,
  MarketplaceListing,
  PublishItemOverride,
  UserAccount,
  UserDashboardResponse,
} from "../types/pandrop";

/**
 * API_BASE — root of the FastAPI backend.
 * All relative asset paths returned by the backend ("/static/…") must go
 * through resolveAssetUrl() so they point at the backend origin, not the Vite dev server.
 */
export const API_BASE: string =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Prepend API_BASE to backend-relative paths ("/static/…", "/api/…").
 * Everything else (absolute URLs, bundled /demo/… assets, data URIs) passes through.
 */
export function resolveAssetUrl(path: string): string {
  if (!path) return path;
  if (path.startsWith("/static/") || path.startsWith("/api/")) return `${API_BASE}${path}`;
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

/** Lightweight liveness probe used for the header status pill. */
export async function checkHealth(timeoutMs = 2500): Promise<{ mock_ai: boolean }> {
  const res = await withTimeout(fetch(`${API_BASE}/api/v1/health`), timeoutMs);
  if (!res.ok) throw new Error(`health ${res.status}`);
  return (await res.json()) as { mock_ai: boolean };
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
    res = await fetch(`${API_BASE}/api/v1/process-video`, { method: "POST", body });
  } catch {
    throw new ApiError(
      "Could not reach the PanDrop backend. Is it running on " + API_BASE + "?",
    );
  }
  if (!res.ok) throw await readError(res, `Upload failed (${res.status})`);
  return (await res.json()) as JobResponse;
}

/** Fetch a previously processed job by id. */
export async function getJob(jobId: string): Promise<JobResponse> {
  const res = await fetch(`${API_BASE}/api/v1/jobs/${encodeURIComponent(jobId)}`);
  if (!res.ok) throw await readError(res, `Job ${jobId} not found`);
  return (await res.json()) as JobResponse;
}

/* ------------------------------------------------------------------ */
/* Accounts                                                            */
/* ------------------------------------------------------------------ */

export async function listUsers(): Promise<UserAccount[]> {
  const res = await fetch(`${API_BASE}/api/v1/users`);
  if (!res.ok) throw await readError(res, "Could not load accounts");
  return (await res.json()) as UserAccount[];
}

export async function createUser(
  username: string,
  displayName: string,
  location: string,
): Promise<UserAccount> {
  const res = await fetch(`${API_BASE}/api/v1/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, display_name: displayName, location }),
  });
  if (!res.ok) throw await readError(res, "Could not create the account");
  return (await res.json()) as UserAccount;
}

export async function getUser(userId: string): Promise<UserAccount> {
  const res = await fetch(`${API_BASE}/api/v1/users/${encodeURIComponent(userId)}`);
  if (!res.ok) throw await readError(res, "Account not found");
  return (await res.json()) as UserAccount;
}

export async function getDashboard(userId: string): Promise<UserDashboardResponse> {
  const res = await fetch(
    `${API_BASE}/api/v1/users/${encodeURIComponent(userId)}/dashboard`,
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
  const res = await fetch(`${API_BASE}/api/v1/marketplace/publish`, {
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
  const res = await fetch(`${API_BASE}/api/v1/marketplace/listings?${params.toString()}`);
  if (!res.ok) throw await readError(res, "Could not load the marketplace");
  return (await res.json()) as MarketplaceListing[];
}

export async function getListing(listingId: string): Promise<MarketplaceListing> {
  const res = await fetch(
    `${API_BASE}/api/v1/marketplace/${encodeURIComponent(listingId)}`,
  );
  if (!res.ok) throw await readError(res, "Listing not found");
  return (await res.json()) as MarketplaceListing;
}

export async function buyListing(
  listingId: string,
  buyerId: string,
): Promise<MarketplaceListing> {
  const res = await fetch(
    `${API_BASE}/api/v1/marketplace/${encodeURIComponent(listingId)}/buy`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyer_id: buyerId }),
    },
  );
  if (!res.ok) throw await readError(res, "Purchase failed");
  return (await res.json()) as MarketplaceListing;
}
