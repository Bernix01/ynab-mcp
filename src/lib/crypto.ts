/**
 * Token encryption utilities using AES-256-GCM
 * Uses the Web Crypto API for secure encryption/decryption
 */

import { env } from "@/lib/env";

/** Encryption algorithm */
const ALGORITHM = "AES-GCM";

/** Key length in bits */
const KEY_LENGTH = 256;

/** IV length in bytes (96 bits for GCM) */
const IV_LENGTH = 12;

/** PBKDF2 iteration count for key derivation */
const PBKDF2_ITERATIONS = 100000;

/** Default salt for key derivation (used only in development if ENCRYPTION_SALT not set) */
const DEFAULT_KEY_DERIVATION_SALT = "ynab-mcp-token-encryption";

// Fail fast: Require ENCRYPTION_SALT in production for secure token encryption
if (env.isProduction && !env.ENCRYPTION_SALT) {
  throw new Error(
    "ENCRYPTION_SALT environment variable must be set in production. " +
    "Generate a secure value with: openssl rand -hex 32"
  );
}

/**
 * Get the encryption salt from environment or use default (development only)
 */
function getEncryptionSalt(): string {
  return env.ENCRYPTION_SALT || DEFAULT_KEY_DERIVATION_SALT;
}

/** Magic bytes prefix for encrypted values (YM = YNAB MCP, 01 = version 1) */
const MAGIC_BYTES = new Uint8Array([0x59, 0x4d, 0x01]); // "YM\x01"

/** Length of magic bytes prefix */
const MAGIC_LENGTH = MAGIC_BYTES.length;

/**
 * Get or derive the encryption key from the environment
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  // Use dedicated token encryption key if available, otherwise fall back to auth secret
  const secret = env.TOKEN_ENCRYPTION_KEY || env.BETTER_AUTH_SECRET;

  // Derive a key from the secret using PBKDF2
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(getEncryptionSalt()),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypts a string value
 * Returns a base64-encoded string containing magic bytes, IV, and ciphertext
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const encoder = new TextEncoder();

  // Generate a random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Encrypt the data
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(plaintext),
  );

  // Combine magic bytes, IV, and ciphertext
  const combined = new Uint8Array(
    MAGIC_LENGTH + iv.length + ciphertext.byteLength,
  );
  combined.set(MAGIC_BYTES);
  combined.set(iv, MAGIC_LENGTH);
  combined.set(new Uint8Array(ciphertext), MAGIC_LENGTH + iv.length);

  // Return as base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a base64-encoded encrypted string
 * Supports both new format (with magic bytes) and legacy format (without)
 */
export async function decrypt(encryptedBase64: string): Promise<string> {
  const key = await getEncryptionKey();

  // Decode base64
  const combined = Uint8Array.from(atob(encryptedBase64), (c) =>
    c.charCodeAt(0),
  );

  // Check if this is the new format with magic bytes
  const hasMagicBytes =
    combined.length >= MAGIC_LENGTH &&
    combined[0] === MAGIC_BYTES[0] &&
    combined[1] === MAGIC_BYTES[1] &&
    combined[2] === MAGIC_BYTES[2];

  let ivStart: number;
  let ciphertextStart: number;

  if (hasMagicBytes) {
    // New format: magic bytes + IV + ciphertext
    ivStart = MAGIC_LENGTH;
    ciphertextStart = MAGIC_LENGTH + IV_LENGTH;
  } else {
    // Legacy format: IV + ciphertext (for backward compatibility)
    ivStart = 0;
    ciphertextStart = IV_LENGTH;
  }

  // Extract IV and ciphertext using subarray to avoid type issues
  const iv = new Uint8Array(
    combined.buffer,
    combined.byteOffset + ivStart,
    IV_LENGTH,
  );
  const ciphertext = new Uint8Array(
    combined.buffer,
    combined.byteOffset + ciphertextStart,
    combined.length - ciphertextStart,
  );

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext,
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Check if a string is an encrypted value by looking for magic bytes
 * Also supports legacy format detection for backward compatibility
 */
export function isEncrypted(value: string): boolean {
  try {
    const decoded = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

    // Check for new format with magic bytes
    if (
      decoded.length >= MAGIC_LENGTH + IV_LENGTH &&
      decoded[0] === MAGIC_BYTES[0] &&
      decoded[1] === MAGIC_BYTES[1] &&
      decoded[2] === MAGIC_BYTES[2]
    ) {
      return true;
    }

    // Fallback: legacy format check (base64 with sufficient length)
    // This is less reliable but needed for backward compatibility
    return decoded.length > IV_LENGTH;
  } catch {
    return false;
  }
}
