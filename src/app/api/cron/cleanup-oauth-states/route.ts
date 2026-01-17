import { NextResponse } from "next/server";
import { cleanupExpiredStates } from "@/lib/ynab/state";
import { logInfo, logError } from "@/lib/logger";

/**
 * GET /api/cron/cleanup-oauth-states
 * Cron job to clean up expired OAuth states from the database.
 * Runs periodically via Vercel Cron.
 *
 * Security: This endpoint is protected by Vercel's CRON_SECRET header validation.
 */
export async function GET(request: Request) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // In production, require CRON_SECRET for authentication
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    logInfo("[Cron] Starting OAuth state cleanup");

    await cleanupExpiredStates();

    logInfo("[Cron] OAuth state cleanup completed");

    return NextResponse.json({
      success: true,
      message: "Expired OAuth states cleaned up",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError("[Cron] OAuth state cleanup failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Cleanup failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
