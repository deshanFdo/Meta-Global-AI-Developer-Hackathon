// In-memory sliding-window rate limiter for API routes.
// Protects Meta API spend from abuse. Best-effort on serverless (per-instance
// state); pair with provider quotas for production.

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

function prune(now: number, windowMs: number): void {
  // Opportunistic cleanup so idle IPs don't leak memory.
  if (buckets.size > 5000) {
    buckets.forEach((bucket, key) => {
      while (bucket.hits.length > 0 && bucket.hits[0] <= now - windowMs) bucket.hits.shift();
      if (bucket.hits.length === 0) buckets.delete(key);
    });
  }
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim().slice(0, 64) || "unknown";
  return "local";
}

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  prune(now, windowMs);
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }
  while (bucket.hits.length > 0 && bucket.hits[0] <= now - windowMs) bucket.hits.shift();
  if (bucket.hits.length >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.hits[0] + windowMs - now) / 1000));
    return { ok: false, retryAfterSec };
  }
  bucket.hits.push(now);
  return { ok: true, retryAfterSec: 0 };
}

/** Reject absurd bodies before buffering them (defense below the JSON parser). */
export function contentLengthOk(req: Request, maxBytes: number): boolean {
  const raw = req.headers.get("content-length");
  if (raw === null) return true; // chunked; route-level checks still apply
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= maxBytes;
}
