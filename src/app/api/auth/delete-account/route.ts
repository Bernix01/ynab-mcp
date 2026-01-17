import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { logError, logInfo } from "@/lib/logger";

/**
 * Delete a user account by email.
 * This is a simple "forgot password" alternative that deletes the account
 * so the user can create a new one.
 *
 * Note: All related data (sessions, accounts, YNAB tokens) will be cascade deleted.
 */
export async function POST(request: Request) {
  try {
    const headersList = await headers();

    // CSRF protection: Verify origin matches host
    const origin = headersList.get("origin");
    const host = headersList.get("host");
    if (origin && host && !origin.includes(host)) {
      return NextResponse.json(
        { error: "Forbidden", message: "Invalid origin" },
        { status: 403 }
      );
    }

    // Require JSON content type
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return NextResponse.json(
        { error: "Bad Request", message: "Content-Type must be application/json" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Bad Request", message: "Email is required" },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Find the user
    const existingUser = await db
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(eq(user.email, normalizedEmail))
      .limit(1);

    if (existingUser.length === 0) {
      // Don't reveal whether the email exists
      // Return success anyway to prevent email enumeration
      logInfo("[DELETE ACCOUNT] Account deletion requested for non-existent email", {
        email: normalizedEmail.slice(0, 3) + "***",
      });
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, it has been deleted.",
      });
    }

    const userToDelete = existingUser[0];

    // Delete the user (cascades to sessions, accounts, YNAB tokens, etc.)
    await db.delete(user).where(eq(user.id, userToDelete.id));

    logInfo("[DELETE ACCOUNT] Account deleted successfully", {
      userId: userToDelete.id,
      email: normalizedEmail.slice(0, 3) + "***",
    });

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully. You can now create a new account.",
    });
  } catch (error) {
    logError("[DELETE ACCOUNT] Error deleting account:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to delete account" },
      { status: 500 }
    );
  }
}
