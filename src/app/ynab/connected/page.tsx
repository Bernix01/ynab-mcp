"use client";

import Link from "next/link";

export default function YnabConnectedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-zinc-900 rounded-lg shadow-lg text-center">
        <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <svg
            className="w-8 h-8 text-green-600 dark:text-green-400"
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
        </div>

        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            YNAB Connected
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Your YNAB account has been successfully connected. You can now use
            Claude to manage your budgets.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You can close this window and return to Claude.
          </p>
          <Link
            href="/"
            className="block w-full py-2 px-4 border border-zinc-300 rounded-md shadow-sm text-sm font-medium text-zinc-700 bg-white hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-600 dark:hover:bg-zinc-700"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
