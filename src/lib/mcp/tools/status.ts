import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { env } from "@/lib/env";
import { errorResponse, jsonResponse } from "@/lib/mcp/helpers";
import { getYnabTokens } from "@/lib/ynab/tokens";

/**
 * Extra context passed to MCP tool handlers
 */
interface ToolExtra {
  authInfo?: {
    extra?: {
      userId?: string;
    };
  };
}

export function registerStatusTools(server: McpServer) {
  // Check YNAB connection status
  server.tool(
    "ynab_connection_status",
    "Check if YNAB account is connected and tokens are valid. Use this to verify connection before making YNAB API calls.",
    {},
    async (_args, extra: ToolExtra) => {
      const userId = extra.authInfo?.extra?.userId as string | undefined;

      if (!userId) {
        return errorResponse("Error: User not authenticated with MCP server.");
      }

      const tokens = await getYnabTokens(userId);

      if (!tokens) {
        const authUrl = `${env.BETTER_AUTH_URL}/api/ynab/authorize`;
        return jsonResponse({
          connected: false,
          message: "YNAB account not connected or tokens expired and could not be refreshed.",
          action_required: "User needs to authorize YNAB access",
          authorization_url: authUrl,
          instructions: "Please visit the authorization URL to connect your YNAB account. After connecting, retry your YNAB request.",
        });
      }

      const now = new Date();
      const expiresIn = Math.round((tokens.expiresAt.getTime() - now.getTime()) / 1000 / 60);

      return jsonResponse({
        connected: true,
        message: "YNAB account is connected and tokens are valid.",
        token_expires_in_minutes: expiresIn,
        note: expiresIn < 30
          ? "Token will be automatically refreshed when needed."
          : "Connection is healthy.",
      });
    },
  );
}
