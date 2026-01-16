import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getYnabAuthUrl } from "@/lib/ynab/oauth";
import { generateOAuthState, storeOAuthState } from "@/lib/ynab/state";

export async function GET(request: NextRequest) {
  // Get the current user session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    // Redirect to login with return URL
    const returnUrl = request.nextUrl.toString();
    return NextResponse.redirect(
      new URL(`/login?redirect=${encodeURIComponent(returnUrl)}`, request.url),
    );
  }

  // Generate and store OAuth state for CSRF protection
  const state = generateOAuthState();
  await storeOAuthState(session.user.id, state);

  // Redirect to YNAB authorization
  const authUrl = getYnabAuthUrl(state);
  return NextResponse.redirect(authUrl);
}
