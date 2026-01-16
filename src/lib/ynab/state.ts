import { and, eq, gt, like, lt } from "drizzle-orm";
import { db } from "@/db";
import { verification } from "@/db/schema";

/** OAuth state expiry time in minutes */
const STATE_EXPIRY_MINUTES = 10;

/** Prefix for OAuth state identifiers in the verification table */
const STATE_IDENTIFIER_PREFIX = "ynab_oauth_state";

/** Length of the random state token in bytes (produces 64 hex chars) */
const STATE_TOKEN_BYTES = 32;

/** Milliseconds per minute */
const MS_PER_MINUTE = 60 * 1000;

/** Data stored alongside OAuth state */
interface OAuthStateData {
  state: string;
  returnUrl?: string;
}

/** Result from validating OAuth state */
export interface OAuthStateValidationResult {
  valid: boolean;
  returnUrl?: string;
}

/**
 * Generates a cryptographically secure random state string
 */
export function generateOAuthState(): string {
  const array = new Uint8Array(STATE_TOKEN_BYTES);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

/**
 * Stores an OAuth state for later validation
 */
export async function storeOAuthState(
  userId: string,
  state: string,
  returnUrl?: string,
): Promise<void> {
  const expiresAt = new Date(Date.now() + STATE_EXPIRY_MINUTES * MS_PER_MINUTE);

  const stateData: OAuthStateData = { state, returnUrl };

  await db.insert(verification).values({
    id: crypto.randomUUID(),
    identifier: `${STATE_IDENTIFIER_PREFIX}:${userId}`,
    value: JSON.stringify(stateData),
    expiresAt,
  });
}

/**
 * Validates and consumes an OAuth state
 * Returns validation result with optional return URL
 */
export async function validateOAuthState(
  userId: string,
  state: string,
): Promise<OAuthStateValidationResult> {
  const now = new Date();
  const identifier = `${STATE_IDENTIFIER_PREFIX}:${userId}`;

  // Find all non-expired states for this user
  const results = await db
    .select()
    .from(verification)
    .where(
      and(
        eq(verification.identifier, identifier),
        gt(verification.expiresAt, now),
      ),
    );

  // Find matching state
  for (const result of results) {
    try {
      const stateData: OAuthStateData = JSON.parse(result.value);
      if (stateData.state === state) {
        // Delete the state to prevent replay attacks
        await db.delete(verification).where(eq(verification.id, result.id));
        return { valid: true, returnUrl: stateData.returnUrl };
      }
    } catch {
      // Legacy format: plain state string
      if (result.value === state) {
        await db.delete(verification).where(eq(verification.id, result.id));
        return { valid: true };
      }
    }
  }

  return { valid: false };
}

/**
 * Cleans up expired OAuth states
 */
export async function cleanupExpiredStates(): Promise<void> {
  const now = new Date();

  await db
    .delete(verification)
    .where(
      and(
        like(verification.identifier, `${STATE_IDENTIFIER_PREFIX}:%`),
        lt(verification.expiresAt, now),
      ),
    );
}
