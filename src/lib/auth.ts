import { oauthProvider } from "@better-auth/oauth-provider";
import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { jwt } from "better-auth/plugins";
import { db } from "@/db";
import { env } from "@/lib/env";
import { logError, logInfo } from "@/lib/logger";
import { deleteYnabTokens } from "@/lib/ynab/tokens";

export const auth = betterAuth({
  // Explicit base URL configuration
  baseURL: env.BETTER_AUTH_URL,
  // Explicit secret configuration
  secret: env.BETTER_AUTH_SECRET,
  // Trusted origins for CSRF protection
  trustedOrigins: [
    env.BETTER_AUTH_URL,
    ...(env.isProduction
      ? []
      : ["http://localhost:3000", "http://127.0.0.1:3000"]),
  ],
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    // Password requirements (must match client-side validation)
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // Custom password validation for strength requirements
    password: {
      // Validate password before hashing - throws error if requirements not met
      async hash(password) {
        // Validate password strength requirements
        const errors: string[] = [];
        if (password.length < 8) {
          errors.push("at least 8 characters");
        }
        if (!/[A-Z]/.test(password)) {
          errors.push("one uppercase letter");
        }
        if (!/[0-9]/.test(password)) {
          errors.push("one number");
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
          errors.push("one special character (!@#$%^&*)");
        }
        if (errors.length > 0) {
          throw new Error(`Password must contain ${errors.join(", ")}`);
        }
        // Use default scrypt hashing via Node.js crypto
        const { scrypt, randomBytes } = await import("node:crypto");
        const { promisify } = await import("node:util");
        const scryptAsync = promisify(scrypt);
        const salt = randomBytes(16).toString("hex");
        const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
        return `${salt}:${derivedKey.toString("hex")}`;
      },
      async verify({ hash, password }) {
        const { scrypt, timingSafeEqual } = await import("node:crypto");
        const { promisify } = await import("node:util");
        const scryptAsync = promisify(scrypt);
        const [salt, key] = hash.split(":");
        const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
        return timingSafeEqual(Buffer.from(key, "hex"), derivedKey);
      },
    },
  },
  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // Update session every day
    storeSessionInDatabase: true, // Required for OAuth Provider plugin
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  // Cookie security configuration
  advanced: {
    cookiePrefix: "ynab-mcp",
    useSecureCookies: env.isProduction,
  },
  // Disable default /token path since OAuth provider handles it
  disabledPaths: ["/token"],
  databaseHooks: {
    session: {
      delete: {
        // When a session is deleted (logout), also delete YNAB tokens
        before: async (session) => {
          if (session.userId) {
            try {
              await deleteYnabTokens(session.userId);
            } catch (error) {
              // Log but don't fail the session deletion
              logError("Failed to delete YNAB tokens on logout:", error);
            }
          }
          return;
        },
      },
    },
  },
  plugins: [
    jwt(),
    oauthProvider({
      loginPage: "/login",
      consentPage: "/consent",
      // Allow dynamic client registration for MCP clients
      allowDynamicClientRegistration: true,
      // Allow unauthenticated client registration (required for MCP clients)
      allowUnauthenticatedClientRegistration: true,
      // Explicit token expiration configuration
      accessTokenExpiresIn: 60 * 60, // 1 hour
      refreshTokenExpiresIn: 30 * 24 * 60 * 60, // 30 days
      // Valid audiences for resource indicator validation (RFC 8707)
      // Include both with and without trailing slash to handle client variations
      validAudiences: [
        env.BETTER_AUTH_URL,
        `${env.BETTER_AUTH_URL}/`,
      ],
    }),
  ],
  // Debug hooks for OAuth troubleshooting
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path.includes("oauth2") || ctx.path.includes("token")) {
        logInfo(`[AUTH] Before ${ctx.request?.method} ${ctx.path}`, {
          body: ctx.body,
          query: ctx.query,
          headers: {
            "content-type": ctx.headers?.get("content-type"),
            authorization: ctx.headers?.get("authorization") ? "[REDACTED]" : undefined,
          },
        });
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path.includes("oauth2") || ctx.path.includes("token")) {
        const returned = ctx.context.returned;
        logInfo(`[AUTH] After ${ctx.path}`, {
          returnedType: typeof returned,
          isError: returned instanceof Error,
          returned: returned instanceof Error
            ? { message: returned.message, name: returned.name }
            : returned,
        });
      }
    }),
  },
  // Error handling for debugging
  onAPIError: {
    onError: (error, ctx) => {
      const err = error as Error;
      logError(`[AUTH ERROR]`, {
        error: err?.message ?? String(error),
        context: ctx ? JSON.stringify(ctx).slice(0, 500) : undefined,
      });
    },
  },
});

export type Auth = typeof auth;
