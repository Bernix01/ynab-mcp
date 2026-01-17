import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ynabToken } from "@/db/schema";
import { decrypt, encrypt, isEncrypted } from "@/lib/crypto";
import { logError, logInfo } from "@/lib/logger";
import { refreshAccessToken, type YnabTokenResponse } from "./oauth";

/** Token refresh buffer - refresh tokens this many minutes before expiry */
const TOKEN_REFRESH_BUFFER_MINUTES = 5;

/** Milliseconds per second */
const MS_PER_SECOND = 1000;

export interface YnabTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

/**
 * Decrypt a token value, handling both encrypted and legacy plaintext values
 */
async function decryptToken(value: string): Promise<string> {
  if (isEncrypted(value)) {
    return decrypt(value);
  }
  // Return plaintext for legacy tokens (will be re-encrypted on next save)
  return value;
}

export async function getYnabTokens(
  userId: string,
): Promise<YnabTokens | null> {
  const result = await db
    .select()
    .from(ynabToken)
    .where(eq(ynabToken.userId, userId))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const token = result[0];

  // Decrypt the tokens - if decryption fails, the tokens were encrypted with
  // a different key (e.g., salt changed) and we need to re-authorize
  let accessToken: string;
  let refreshToken: string;
  try {
    accessToken = await decryptToken(token.accessToken);
    refreshToken = await decryptToken(token.refreshToken);
  } catch (error) {
    logError("[YNAB] Failed to decrypt tokens (key/salt may have changed), removing invalid tokens:", error);
    await db.delete(ynabToken).where(eq(ynabToken.userId, userId));
    return null;
  }

  // Check if token is expired or will expire soon
  const refreshThreshold = new Date(
    Date.now() + TOKEN_REFRESH_BUFFER_MINUTES * 60 * MS_PER_SECOND,
  );
  if (token.expiresAt < refreshThreshold) {
    const minutesUntilExpiry = Math.round(
      (token.expiresAt.getTime() - Date.now()) / MS_PER_SECOND / 60
    );
    logInfo("[YNAB] Token needs refresh", {
      userId,
      expiresAt: token.expiresAt.toISOString(),
      minutesUntilExpiry,
      isExpired: token.expiresAt < new Date(),
    });

    // Refresh the token
    try {
      const refreshed = await refreshAccessToken(refreshToken);
      const newTokens = await saveYnabTokens(userId, refreshed);
      logInfo("[YNAB] Token refreshed successfully", { userId });
      return newTokens;
    } catch (error) {
      logError("[YNAB] Failed to refresh token, removing invalid tokens:", error);
      // Delete the invalid token - user will need to reauthorize
      await db.delete(ynabToken).where(eq(ynabToken.userId, userId));
      return null;
    }
  }

  return {
    accessToken,
    refreshToken,
    expiresAt: token.expiresAt,
  };
}

export async function saveYnabTokens(
  userId: string,
  tokenResponse: YnabTokenResponse,
): Promise<YnabTokens> {
  const expiresAt = new Date(
    (tokenResponse.created_at + tokenResponse.expires_in) * MS_PER_SECOND,
  );

  // Encrypt the tokens before storing
  const encryptedAccessToken = await encrypt(tokenResponse.access_token);
  const encryptedRefreshToken = await encrypt(tokenResponse.refresh_token);

  // Use atomic upsert to prevent race conditions
  await db
    .insert(ynabToken)
    .values({
      id: crypto.randomUUID(),
      userId,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: ynabToken.userId,
      set: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        // updatedAt is automatically handled by $onUpdate in schema
      },
    });

  return {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    expiresAt,
  };
}

export async function deleteYnabTokens(userId: string): Promise<void> {
  await db.delete(ynabToken).where(eq(ynabToken.userId, userId));
}
