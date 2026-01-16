import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { createRemoteJWKSet, jwtVerify, decodeJwt } from "jose";
import { logError, logInfo } from "@/lib/logger";
import { env } from "@/lib/env";
import { registerAccountTools } from "@/lib/mcp/tools/accounts";
import { registerBudgetTools } from "@/lib/mcp/tools/budgets";
import { registerCategoryTools } from "@/lib/mcp/tools/categories";
import { registerMonthTools } from "@/lib/mcp/tools/months";
import { registerStatusTools } from "@/lib/mcp/tools/status";
import { registerTransactionTools } from "@/lib/mcp/tools/transactions";

// Create JWKS client for JWT verification (cached)
const JWKS = createRemoteJWKSet(
  new URL(`${env.BETTER_AUTH_URL}/api/auth/jwks`)
);

// MCP handler with tools
const handler = createMcpHandler(
  (server) => {
    // Register all YNAB tools
    registerStatusTools(server);
    registerBudgetTools(server);
    registerAccountTools(server);
    registerTransactionTools(server);
    registerCategoryTools(server);
    registerMonthTools(server);
  },
  {
    capabilities: {
      tools: {},
    },
  },
  {
    basePath: "/api",
    maxDuration: 60,
  },
);

/**
 * Verify the bearer token using JWT verification
 */
const verifyToken = async (
  _req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> => {
  logInfo("[MCP] verifyToken called", { hasToken: !!bearerToken, tokenPrefix: bearerToken?.slice(0, 20) });

  if (!bearerToken) return undefined;

  try {
    // First decode JWT to inspect claims (for debugging)
    const decoded = decodeJwt(bearerToken);
    logInfo("[MCP] JWT decoded claims", {
      iss: decoded.iss,
      aud: decoded.aud,
      sub: decoded.sub,
      exp: decoded.exp,
    });

    // Verify JWT using JWKS
    // Note: BetterAuth OAuth provider may use different issuer format
    // Include trailing slash variants for both issuer and audience
    const { payload } = await jwtVerify(bearerToken, JWKS, {
      // Accept issuer with or without trailing slash or /api/auth suffix
      issuer: [
        env.BETTER_AUTH_URL,
        `${env.BETTER_AUTH_URL}/`,
        `${env.BETTER_AUTH_URL}/api/auth`,
        `${env.BETTER_AUTH_URL}/api/auth/`,
      ],
      // Accept both with and without trailing slash for audience
      audience: [env.BETTER_AUTH_URL, `${env.BETTER_AUTH_URL}/`],
    });

    logInfo("[MCP] JWT verified", {
      sub: payload.sub,
      clientId: payload.clientId,
      scope: payload.scope
    });

    // Extract scopes from JWT payload
    const scopes = typeof payload.scope === "string"
      ? payload.scope.split(" ")
      : Array.isArray(payload.scope)
        ? payload.scope
        : [];

    return {
      token: bearerToken,
      clientId: payload.clientId as string || "unknown",
      scopes,
      expiresAt: payload.exp,
      extra: {
        userId: payload.sub,
      },
    };
  } catch (error) {
    logError("[MCP] JWT verification error:", error);
    return undefined;
  }
};

// Wrap handler with MCP authentication
const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
});

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
