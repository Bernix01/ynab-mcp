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
): Promise<void> {
  const expiresAt = new Date(Date.now() + STATE_EXPIRY_MINUTES * MS_PER_MINUTE);

  await db.insert(verification).values({
    id: crypto.randomUUID(),
    identifier: `${STATE_IDENTIFIER_PREFIX}:${userId}`,
    value: state,
    expiresAt,
  });
}

/**
 * Validates and consumes an OAuth state
 * Returns true if the state is valid, false otherwise
 */
export async function validateOAuthState(
  userId: string,
  state: string,
): Promise<boolean> {
  const now = new Date();
  const identifier = `${STATE_IDENTIFIER_PREFIX}:${userId}`;

  // Find and delete the matching state (consuming it)
  const result = await db
    .select()
    .from(verification)
    .where(
      and(
        eq(verification.identifier, identifier),
        eq(verification.value, state),
        gt(verification.expiresAt, now),
      ),
    )
    .limit(1);

  if (result.length === 0) {
    return false;
  }

  // Delete the state to prevent replay attacks
  await db.delete(verification).where(eq(verification.id, result[0].id));

  return true;
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
