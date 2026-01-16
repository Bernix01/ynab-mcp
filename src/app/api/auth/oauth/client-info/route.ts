import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { oauthClient } from "@/db/schema";

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(request: NextRequest): Promise<Response> {
  console.log("[CLIENT-INFO] Route handler started");

  try {
    const clientId = request.nextUrl.searchParams.get("client_id");
    console.log("[CLIENT-INFO] Request received", { clientId });

    if (!clientId) {
      console.log("[CLIENT-INFO] No client_id, returning 400");
      return jsonResponse({ error: "client_id is required" }, 400);
    }

    console.log("[CLIENT-INFO] Querying database...");
    const client = await db
      .select({
        name: oauthClient.name,
        icon: oauthClient.icon,
        redirectUris: oauthClient.redirectUris,
        clientId: oauthClient.clientId,
      })
      .from(oauthClient)
      .where(eq(oauthClient.clientId, clientId))
      .limit(1);

    console.log("[CLIENT-INFO] Query result", { found: client.length > 0 });

    if (client.length === 0) {
      console.log("[CLIENT-INFO] Client not found, returning 404");
      return jsonResponse({ error: "Client not found" }, 404);
    }

    const responseData = {
      name: client[0].name || clientId,
      icon: client[0].icon || null,
      redirectUris: client[0].redirectUris || [],
    };

    console.log("[CLIENT-INFO] Building response...", responseData);
    const response = jsonResponse(responseData);
    console.log("[CLIENT-INFO] Returning response");
    return response;
  } catch (error) {
    console.error("[CLIENT-INFO] Error:", error);
    return jsonResponse({ error: "Failed to fetch client info" }, 500);
  }
}
