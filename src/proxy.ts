import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitHeaders,
} from "@/lib/rate-limit";

/**
 * Rate limiting middleware for critical endpoints
 */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const ip = getClientIp(request);

  // Apply rate limiting based on path
  let rateLimitConfig = null;
  let rateLimitKey = "";

  if (
    path.startsWith("/api/auth/sign-in") ||
    path.startsWith("/api/auth/sign-up")
  ) {
    rateLimitConfig = RATE_LIMITS.login;
    rateLimitKey = `login:${ip}`;
  } else if (
    path.startsWith("/api/ynab/authorize") ||
    path.startsWith("/api/ynab/callback")
  ) {
    rateLimitConfig = RATE_LIMITS.oauth;
    rateLimitKey = `oauth:${ip}`;
  } else if (path.startsWith("/api/auth/oauth/introspect")) {
    rateLimitConfig = RATE_LIMITS.introspection;
    rateLimitKey = `introspect:${ip}`;
  }

  // If no rate limit config applies, continue
  if (!rateLimitConfig || !rateLimitKey) {
    return NextResponse.next();
  }

  const result = checkRateLimit(rateLimitKey, rateLimitConfig);

  if (!result.allowed) {
    return new NextResponse(
      JSON.stringify({
        error: "Too Many Requests",
        message: `Rate limit exceeded. Try again in ${Math.ceil(result.resetIn / 1000)} seconds.`,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          ...rateLimitHeaders(result),
        },
      },
    );
  }

  // Add rate limit headers to successful responses
  const response = NextResponse.next();
  const headers = rateLimitHeaders(result);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    "/api/auth/sign-in/:path*",
    "/api/auth/sign-up/:path*",
    "/api/auth/oauth/introspect",
    "/api/ynab/authorize",
    "/api/ynab/callback",
  ],
};
