/**
 * Environment variable validation using Zod
 * Validates all required environment variables at import time
 */

import { z } from "zod";

/**
 * Check if we're in a build context (Next.js build phase)
 * During build, we don't require all environment variables
 */
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

/**
 * Environment variable schema with validation
 */
const envSchema = z.object({
  /** Database connection URL */
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  /** BetterAuth secret for signing tokens (minimum 32 characters) */
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),

  /** Base URL for the application */
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),

  /** YNAB OAuth client ID */
  YNAB_CLIENT_ID: z.string().min(1, "YNAB_CLIENT_ID is required"),

  /** YNAB OAuth client secret */
  YNAB_CLIENT_SECRET: z.string().min(1, "YNAB_CLIENT_SECRET is required"),

  /** YNAB OAuth redirect URI */
  YNAB_REDIRECT_URI: z.string().url("YNAB_REDIRECT_URI must be a valid URL"),

  /** Optional: Separate token encryption key (falls back to BETTER_AUTH_SECRET) */
  TOKEN_ENCRYPTION_KEY: z.string().optional(),

  /** Salt for encryption key derivation (32-byte hex string) */
  ENCRYPTION_SALT: z.string().optional(),

  /** Node environment */
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

/**
 * Build-time fallback schema (allows empty values during build)
 */
const buildEnvSchema = z.object({
  DATABASE_URL: z.string().default(""),
  BETTER_AUTH_SECRET: z.string().default("build-time-placeholder-secret-32ch"),
  BETTER_AUTH_URL: z.string().default("http://localhost:3000"),
  YNAB_CLIENT_ID: z.string().default(""),
  YNAB_CLIENT_SECRET: z.string().default(""),
  YNAB_REDIRECT_URI: z.string().default("http://localhost:3000/api/ynab/callback"),
  TOKEN_ENCRYPTION_KEY: z.string().optional(),
  ENCRYPTION_SALT: z.string().optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

/**
 * Parse and validate environment variables
 */
function parseEnv() {
  // During build phase, use relaxed validation
  if (isBuildPhase) {
    const result = buildEnvSchema.safeParse(process.env);
    if (!result.success) {
      // This should never happen with defaults
      console.warn("Build phase env parsing failed:", result.error.message);
    }
    return {
      ...(result.success ? result.data : buildEnvSchema.parse({})),
      isProduction: process.env.NODE_ENV === "production",
    };
  }

  // Runtime validation (strict)
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Environment validation failed:\n${errors}`);
  }

  return {
    ...result.data,
    /** Whether we're in production */
    isProduction: result.data.NODE_ENV === "production",
  };
}

/**
 * Validated environment configuration
 */
export const env = parseEnv();

/** Type for the environment configuration */
export type Env = typeof env;
