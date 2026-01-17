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
export async function POST(request: Request) {
  try {
    const headersList = await headers();

    // CSRF protection: Verify origin matches host if origin is present
    const origin = headersList.get("origin");
    const host = headersList.get("host");
    if (origin && host && !origin.includes(host)) {
      return NextResponse.json(
        { error: "Forbidden", message: "Invalid origin" },
        { status: 403 },
      );
    }

    // CSRF protection: Require JSON content type to prevent form-based attacks
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return NextResponse.json(
        { error: "Bad Request", message: "Content-Type must be application/json" },
        { status: 400 },
      );
    }

    const session = await auth.api.getSession({
      headers: headersList,
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
