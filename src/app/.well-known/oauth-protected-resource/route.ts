import { protectedResourceHandler } from "mcp-handler";
import { env } from "@/lib/env";

export const GET = protectedResourceHandler({
  authServerUrls: [env.BETTER_AUTH_URL],
  // Explicit resource URL to ensure consistency with validAudiences
  resourceUrl: env.BETTER_AUTH_URL,
});

// Handle CORS preflight
export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
