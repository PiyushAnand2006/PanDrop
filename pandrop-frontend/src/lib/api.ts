import type { HealthResponse, JobResponse } from "../types/pandrop";

/**
 * API_BASE — root of the FastAPI backend.
 * All relative asset paths returned by the backend ("/static/jobs/…") must go
 * through resolveAssetUrl() so they point at the backend origin, not the Vite dev server.
 */
export const API_BASE: string =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/** Prepend API_BASE to backend-relative paths ("/static/…"); pass everything else through. */
export function resolveAssetUrl(path: string): string {
  if (!path) return path;
  if (path.startsWith("/") || path.startsWith("\\")) return `${API_BASE}${path}`;
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
export async function checkHealth(timeoutMs = 2500): Promise<HealthResponse> {
  const res = await withTimeout(fetch(`${API_BASE}/api/v1/health`), timeoutMs);
  if (!res.ok) throw new Error(`health ${res.status}`);
  return (await res.json()) as HealthResponse;
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

/**
 * Upload a video. The backend processes synchronously — the promise resolves
 * with the finished JobResponse (may take a while on real pipelines).
 */
export async function processVideo(file: File): Promise<JobResponse> {
  const body = new FormData();
  body.append("file", file, file.name);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/process-video`, {
      method: "POST",
      body,
    });
  } catch (err) {
    throw new ApiError(
      "Could not reach the PanDrop backend. Is it running on " + API_BASE + "?",
    );
  }
  if (!res.ok) {
    let detail = `Upload failed (${res.status})`;
    try {
      const data = await res.json();
      if (typeof data?.detail === "string") detail = data.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(detail, res.status);
  }
  return (await res.json()) as JobResponse;
}

/** Fetch a previously processed job by id. */
export async function getJob(jobId: string): Promise<JobResponse> {
  const res = await fetch(`${API_BASE}/api/v1/jobs/${encodeURIComponent(jobId)}`);
  if (!res.ok) throw new ApiError(`Job ${jobId} not found`, res.status);
  return (await res.json()) as JobResponse;
}
