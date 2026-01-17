import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getYnabTokens } from "@/lib/ynab/tokens";
import { DisconnectYnabButton } from "./disconnect-ynab-button";
import { SignOutButton } from "./sign-out-button";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const isLoggedIn = !!session?.user;

  // Check YNAB connection status if logged in
  const ynabTokens = isLoggedIn ? await getYnabTokens(session.user.id) : null;
  const isYnabConnected = ynabTokens !== null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main id="main-content" className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-12 py-16 px-8 bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-black dark:text-zinc-50">
            YNAB MCP Server
          </h1>
          <p className="max-w-lg text-lg leading-7 text-zinc-600 dark:text-zinc-400">
            A Model Context Protocol server that provides Claude with secure
            access to your YNAB budget data.
          </p>
        </div>

        <div className="flex flex-col items-center gap-6 w-full max-w-md">
          <div className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <h2 className="text-xl font-semibold mb-4 text-black dark:text-zinc-50">
              Features
            </h2>
            <ul className="space-y-3 text-zinc-600 dark:text-zinc-400">
              <li className="flex items-center gap-3">
                <svg aria-hidden="true" className="w-5 h-5 text-zinc-500 dark:text-zinc-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>View and manage budgets</span>
              </li>
              <li className="flex items-center gap-3">
                <svg aria-hidden="true" className="w-5 h-5 text-zinc-500 dark:text-zinc-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span>Track account balances</span>
              </li>
              <li className="flex items-center gap-3">
                <svg aria-hidden="true" className="w-5 h-5 text-zinc-500 dark:text-zinc-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
                <span>Create and update transactions</span>
              </li>
              <li className="flex items-center gap-3">
                <svg aria-hidden="true" className="w-5 h-5 text-zinc-500 dark:text-zinc-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span>Monitor category spending</span>
              </li>
              <li className="flex items-center gap-3">
                <svg aria-hidden="true" className="w-5 h-5 text-zinc-500 dark:text-zinc-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Analyze monthly budget data</span>
              </li>
            </ul>
          </div>

          {isLoggedIn ? (
            <div className="w-full space-y-4">
              <div
                role="status"
                className="w-full rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4"
              >
                <p className="text-sm text-green-800 dark:text-green-200">
                  Signed in as <strong>{session.user.email}</strong>
                </p>
              </div>

              {isYnabConnected ? (
                <div
                  role="status"
                  className="w-full rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg
                        aria-hidden="true"
                        className="w-5 h-5 text-blue-600 dark:text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        YNAB account connected
                      </p>
                    </div>
                    <DisconnectYnabButton />
                  </div>
                </div>
              ) : (
                <div
                  role="status"
                  className="w-full rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4"
                >
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    YNAB account not connected
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3 w-full">
                {!isYnabConnected && (
                  <Link
                    href="/api/ynab/authorize"
                    className="flex h-12 w-full items-center justify-center rounded-full bg-black px-5 text-white font-medium transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                  >
                    Connect YNAB Account
                  </Link>
                )}
                <SignOutButton />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 w-full">
              <Link
                href="/login"
                className="flex h-12 w-full items-center justify-center rounded-full bg-black px-5 text-white font-medium transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                Sign In
              </Link>
              <Link
                href="/login?mode=signup"
                className="flex h-12 w-full items-center justify-center rounded-full border border-zinc-300 px-5 text-black font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-900"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>

        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          Connect your YNAB account to let Claude help manage your budget.
        </p>
      </main>
    </div>
  );
}
