/**
 * Simple in-memory rate limiter
 * For production, consider using Upstash Redis or Vercel KV
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (will reset on serverless function cold starts)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let lastCleanup = Date.now();

function cleanupExpired() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Current request count */
  current: number;
  /** Maximum allowed requests */
  limit: number;
  /** Milliseconds until rate limit resets */
  resetIn: number;
}

/**
 * Check rate limit for a given identifier
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): RateLimitResult {
  cleanupExpired();

  const now = Date.now();
  const key = identifier;
  let entry = rateLimitStore.get(key);

  // Initialize or reset expired entry
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);

  const allowed = entry.count <= config.limit;
  const resetIn = Math.max(0, entry.resetTime - now);

  return {
    allowed,
    current: entry.count,
    limit: config.limit,
    resetIn,
  };
}

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
  // Check various headers that may contain the real IP
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback to a default identifier
  return "unknown";
}

/**
 * Create rate limit headers for response
 */
export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": Math.max(
      0,
      result.limit - result.current,
    ).toString(),
    "X-RateLimit-Reset": Math.ceil(result.resetIn / 1000).toString(),
  };
}

// Preset configurations for different endpoints
export const RATE_LIMITS = {
  /** Login attempts: 5 per 15 minutes per IP */
  login: {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  },
  /** OAuth flows: 10 per hour per IP */
  oauth: {
    limit: 10,
    windowMs: 60 * 60 * 1000,
  },
  /** Token introspection: 100 per minute per IP */
  introspection: {
    limit: 100,
    windowMs: 60 * 1000,
  },
  /** MCP API calls: 60 per minute per user */
  mcp: {
    limit: 60,
    windowMs: 60 * 1000,
  },
} as const;
