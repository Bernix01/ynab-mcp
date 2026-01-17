/**
 * Ensures the well-known "ynab" OAuth client exists in the database.
 * This allows Claude Desktop and other MCP clients to use client_id "ynab"
 * without needing dynamic client registration.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { oauthClient } from "@/db/schema";
import { logInfo } from "@/lib/logger";

const WELL_KNOWN_CLIENT = {
  id: "ynab-mcp-client",
  clientId: "ynab",
  name: "YNAB MCP Client",
  // Redirect URIs for various MCP clients:
  // - Claude.ai and Claude.com web clients
  // - Localhost with any port for Claude Desktop (uses dynamic ports)
  redirectUris: [
    "https://claude.ai/api/mcp/auth_callback",
    "https://claude.com/api/mcp/auth_callback",
    "http://localhost",
    "http://127.0.0.1",
  ],
  // Public client - no secret required (PKCE is used instead)
  public: true,
  tokenEndpointAuthMethod: "none",
  grantTypes: ["authorization_code", "refresh_token"],
  responseTypes: ["code"],
  scopes: ["openid", "profile", "email", "offline_access"],
};

export async function ensureOAuthClient(): Promise<void> {
  try {
    // Check if client already exists
    const existing = await db
      .select({ id: oauthClient.id, redirectUris: oauthClient.redirectUris })
      .from(oauthClient)
      .where(eq(oauthClient.clientId, WELL_KNOWN_CLIENT.clientId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing client to ensure redirect URIs are current
      const currentUris = existing[0].redirectUris || [];
      const expectedUris = WELL_KNOWN_CLIENT.redirectUris;

      // Check if URIs need updating
      const needsUpdate =
        currentUris.length !== expectedUris.length ||
        !expectedUris.every(uri => currentUris.includes(uri));

      if (needsUpdate) {
        await db
          .update(oauthClient)
          .set({
            redirectUris: WELL_KNOWN_CLIENT.redirectUris,
            updatedAt: new Date(),
          })
          .where(eq(oauthClient.clientId, WELL_KNOWN_CLIENT.clientId));
        logInfo("[OAuth] Updated well-known client 'ynab' redirect URIs");
      } else {
        logInfo("[OAuth] Well-known client 'ynab' already up to date");
      }
      return;
    }

    // Insert the well-known client
    await db.insert(oauthClient).values({
      id: WELL_KNOWN_CLIENT.id,
      clientId: WELL_KNOWN_CLIENT.clientId,
      name: WELL_KNOWN_CLIENT.name,
      redirectUris: WELL_KNOWN_CLIENT.redirectUris,
      public: WELL_KNOWN_CLIENT.public,
      tokenEndpointAuthMethod: WELL_KNOWN_CLIENT.tokenEndpointAuthMethod,
      grantTypes: WELL_KNOWN_CLIENT.grantTypes,
      responseTypes: WELL_KNOWN_CLIENT.responseTypes,
      scopes: WELL_KNOWN_CLIENT.scopes,
      disabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logInfo("[OAuth] Created well-known client 'ynab'");
  } catch (error) {
    // Log but don't fail - dynamic registration is still available
    logInfo("[OAuth] Could not ensure well-known client exists", { error });
  }
}
