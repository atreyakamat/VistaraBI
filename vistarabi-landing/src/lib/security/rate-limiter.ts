/**
 * In-memory rate limiter for VistaraBI API routes.
 * Uses a sliding window algorithm without any external dependencies.
 * 
 * For production at scale, replace with Upstash Redis or similar.
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// Global rate limit store (per-process; use Redis in multi-instance prod)
const store = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now - entry.windowStart > 60_000) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp (ms) when window resets
}

/**
 * Check if a request from `identifier` is within the rate limit.
 * Returns headers-ready result with remaining/reset info.
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;

  const entry = store.get(key);

  if (!entry || now - entry.windowStart > config.windowMs) {
    // New window
    store.set(key, { count: 1, windowStart: now });
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: now + config.windowMs,
    };
  }

  entry.count += 1;

  if (entry.count > config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: entry.windowStart + config.windowMs,
    };
  }

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    reset: entry.windowStart + config.windowMs,
  };
}

// Predefined configs for different route types
export const RATE_LIMITS = {
  /** Auth endpoints – prevent brute-force */
  AUTH: { limit: 10, windowMs: 60_000 },
  /** AI endpoints – expensive, rate-limit tightly */
  AI: { limit: 20, windowMs: 60_000 },
  /** File upload – moderate limit */
  UPLOAD: { limit: 10, windowMs: 60_000 },
  /** General API – generous */
  API: { limit: 100, windowMs: 60_000 },
  /** Report generation – resource-intensive */
  REPORT: { limit: 5, windowMs: 60_000 },
} satisfies Record<string, RateLimitConfig>;

/**
 * Get IP or user identifier from a Next.js Request.
 * Prefers authenticated user ID over IP for more granular limiting.
 */
export function getIdentifier(
  request: Request,
  userId?: string,
  suffix?: string
): string {
  if (userId) return `user:${userId}${suffix ? `:${suffix}` : ''}`;
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return `ip:${ip}${suffix ? `:${suffix}` : ''}`;
}

/**
 * Build rate limit response headers.
 */
export function buildRateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', String(result.limit));
  headers.set('X-RateLimit-Remaining', String(result.remaining));
  headers.set('X-RateLimit-Reset', String(result.reset));
  if (!result.success) {
    headers.set('Retry-After', String(Math.ceil((result.reset - Date.now()) / 1000)));
  }
  return headers;
}
