import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

const { GET: originalGET, POST: originalPOST } = toNextJsHandler(auth);

/**
 * Wrapper to fix RFC 6749 compliance for token endpoint.
 * BetterAuth returns 400 for invalid_client, but RFC 6749 requires 401.
 * This is needed for MCP clients to know when to re-register via DCR.
 */
async function fixInvalidClientResponse(
  request: Request,
  handler: (req: Request) => Promise<Response>
): Promise<Response> {
  const response = await handler(request);

  // Only fix token endpoint responses
  const url = new URL(request.url);
  if (!url.pathname.endsWith("/oauth2/token")) {
    return response;
  }

  // Check if this is a 400 invalid_client that should be 401
  if (response.status === 400) {
    try {
      const body = await response.clone().json();
      if (body.error === "invalid_client") {
        // Return 401 with WWW-Authenticate header per RFC 6749
        return new Response(JSON.stringify(body), {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "WWW-Authenticate": 'Bearer error="invalid_client"',
          },
        });
      }
    } catch {
      // Not JSON or parsing failed, return original
    }
  }

  return response;
}

export async function GET(request: Request): Promise<Response> {
  return fixInvalidClientResponse(request, originalGET);
}

export async function POST(request: Request): Promise<Response> {
  return fixInvalidClientResponse(request, originalPOST);
}
