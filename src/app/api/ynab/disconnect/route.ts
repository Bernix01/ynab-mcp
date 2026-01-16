import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { deleteYnabTokens } from "@/lib/ynab/tokens";

/**
 * POST /api/ynab/disconnect
 * Revokes the user's YNAB connection by deleting their stored tokens.
 * Requires authentication.
 */
export async function POST() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "You must be logged in to disconnect YNAB",
        },
        { status: 401 },
      );
    }

    await deleteYnabTokens(session.user.id);

    return NextResponse.json({
      success: true,
      message: "YNAB account disconnected successfully",
    });
  } catch (error) {
    logError("Failed to disconnect YNAB:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to disconnect YNAB account",
      },
      { status: 500 },
    );
  }
}
