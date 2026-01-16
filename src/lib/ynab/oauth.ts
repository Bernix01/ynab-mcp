import { z } from "zod";
import { env } from "@/lib/env";

const YNAB_AUTH_URL = "https://app.ynab.com/oauth/authorize";
const YNAB_TOKEN_URL = "https://app.ynab.com/oauth/token";

/**
 * Generate the YNAB OAuth authorization URL
 * Note: YNAB OAuth does not support PKCE - this is an accepted risk
 */
export function getYnabAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.YNAB_CLIENT_ID,
    redirect_uri: env.YNAB_REDIRECT_URI,
    response_type: "code",
    state,
  });

  return `${YNAB_AUTH_URL}?${params.toString()}`;
}

/**
 * Zod schema for YNAB token response validation
 */
const ynabTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string(),
  expires_in: z.number().positive(),
  refresh_token: z.string().min(1),
  created_at: z.number(),
});

export type YnabTokenResponse = z.infer<typeof ynabTokenResponseSchema>;

/**
 * Exchange an authorization code for access and refresh tokens
 */
export async function exchangeCodeForTokens(
  code: string,
): Promise<YnabTokenResponse> {
  const response = await fetch(YNAB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: env.YNAB_CLIENT_ID,
      client_secret: env.YNAB_CLIENT_SECRET,
      redirect_uri: env.YNAB_REDIRECT_URI,
      grant_type: "authorization_code",
      code,
    }),
  });

  if (!response.ok) {
    // Try to parse as JSON for structured error info
    let errorMessage: string;
    try {
      const errorData = await response.json();
      errorMessage =
        errorData.error_description || errorData.error || "Unknown error";
    } catch {
      errorMessage = await response.text();
    }
    throw new Error(`Failed to exchange code for tokens: ${errorMessage}`);
  }

  const data = await response.json();

  // Validate response structure
  const result = ynabTokenResponseSchema.safeParse(data);
  if (!result.success) {
    throw new Error(
      `Invalid token response from YNAB: ${result.error.message}`,
    );
  }

  return result.data;
}

/**
 * Refresh an expired access token using a refresh token
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<YnabTokenResponse> {
  const response = await fetch(YNAB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: env.YNAB_CLIENT_ID,
      client_secret: env.YNAB_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    // Try to parse as JSON for structured error info
    let errorMessage: string;
    try {
      const errorData = await response.json();
      errorMessage =
        errorData.error_description || errorData.error || "Unknown error";
    } catch {
      errorMessage = await response.text();
    }
    throw new Error(`Failed to refresh token: ${errorMessage}`);
  }

  const data = await response.json();

  // Validate response structure
  const result = ynabTokenResponseSchema.safeParse(data);
  if (!result.success) {
    throw new Error(
      `Invalid refresh token response from YNAB: ${result.error.message}`,
    );
  }

  return result.data;
}
