import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { exchangeCodeForTokens } from "@/lib/ynab/oauth";
import { validateOAuthState } from "@/lib/ynab/state";
import { saveYnabTokens } from "@/lib/ynab/tokens";

/** Allowed redirect paths after OAuth completion */
const ALLOWED_REDIRECT_PATHS = ["/ynab/connected", "/error", "/login"];

/** Schema for OAuth callback query parameters */
const callbackParamsSchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  error: z.string().optional(),
});

/**
 * Safely redirect to an allowed path
 */
function safeRedirect(
  request: NextRequest,
  path: string,
  queryParams?: Record<string, string>,
): NextResponse {
  // Validate the path is in our allowlist
  const basePath = path.split("?")[0];
  if (!ALLOWED_REDIRECT_PATHS.includes(basePath)) {
    // If not allowed, redirect to error page
    return NextResponse.redirect(
      new URL("/error?message=Invalid+redirect", request.url),
    );
  }

  const url = new URL(path, request.url);
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      url.searchParams.set(key, value);
    }
  }
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Validate query parameters with Zod
  const parseResult = callbackParamsSchema.safeParse({
    code: searchParams.get("code") || undefined,
    state: searchParams.get("state") || undefined,
    error: searchParams.get("error") || undefined,
  });

  if (!parseResult.success) {
    return safeRedirect(request, "/error", {
      message: "Invalid callback parameters",
    });
  }

  const { code, state, error } = parseResult.data;

  if (error) {
    return safeRedirect(request, "/error", { message: error });
  }

  if (!code) {
    return safeRedirect(request, "/error", {
      message: "No authorization code received",
    });
  }

  if (!state) {
    return safeRedirect(request, "/error", {
      message: "Missing OAuth state parameter",
    });
  }

  // Get the current user session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return safeRedirect(request, "/login", { redirect: "/api/ynab/authorize" });
  }

  // Validate the OAuth state to prevent CSRF attacks
  const isValidState = await validateOAuthState(session.user.id, state);
  if (!isValidState) {
    return safeRedirect(request, "/error", {
      message: "Invalid or expired OAuth state",
    });
  }

  try {
    // Exchange the authorization code for tokens
    const tokenResponse = await exchangeCodeForTokens(code);

    // Save the tokens to the database
    await saveYnabTokens(session.user.id, tokenResponse);

    // Redirect to success page
    return safeRedirect(request, "/ynab/connected");
  } catch (err) {
    logError("YNAB OAuth error:", err);
    return safeRedirect(request, "/error", {
      message: "Failed to connect YNAB account",
    });
  }
}
