import type { NextRequest } from "next/server";

/**
 * Best-effort, in-memory fixed-window rate limiter keyed by client IP.
 *
 * Used to protect the public Nominatim proxy routes (/api/geocode,
 * /api/place-search, /api/reverse-geocode) from scraping and denial-of-service.
 * State lives in a module-level Map, so it is per serverless instance and
 * resets on cold start — this is intentionally lightweight (no Redis/KV infra):
 * it blunts abusive bursts without affecting normal debounced autocomplete use.
 */

interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();

// Bound memory if a warm instance is hit by many distinct IPs.
const MAX_KEYS = 10_000;

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the current window resets (for the Retry-After header). */
  retryAfterSeconds: number;
}

function clientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimit(
  request: NextRequest,
  {
    limit = 60,
    windowMs = 10_000,
    bucket = "default",
  }: { limit?: number; windowMs?: number; bucket?: string } = {},
): RateLimitResult {
  const key = `${bucket}:${clientIp(request)}`;
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    if (buckets.size >= MAX_KEYS) {
      for (const [k, w] of buckets) if (now >= w.resetAt) buckets.delete(k);
      if (buckets.size >= MAX_KEYS) buckets.clear();
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}
