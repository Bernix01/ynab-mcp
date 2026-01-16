import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const isLoggedIn = !!session?.user;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-12 py-16 px-8 bg-white dark:bg-black">
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
            <ul className="space-y-2 text-zinc-600 dark:text-zinc-400">
              <li>View and manage budgets</li>
              <li>Track account balances</li>
              <li>Create and update transactions</li>
              <li>Monitor category spending</li>
              <li>Analyze monthly budget data</li>
            </ul>
          </div>

          {isLoggedIn ? (
            <div className="w-full space-y-4">
              <div className="w-full rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
                <p className="text-sm text-green-800 dark:text-green-200">
                  Signed in as <strong>{session.user.email}</strong>
                </p>
              </div>
              <div className="flex flex-col gap-3 w-full">
                <Link
                  href="/api/ynab/authorize"
                  className="flex h-12 w-full items-center justify-center rounded-full bg-black px-5 text-white font-medium transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                >
                  Connect YNAB Account
                </Link>
                <form action="/api/auth/sign-out" method="POST">
                  <button
                    type="submit"
                    className="flex h-12 w-full items-center justify-center rounded-full border border-zinc-300 px-5 text-black font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-900"
                  >
                    Sign Out
                  </button>
                </form>
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
