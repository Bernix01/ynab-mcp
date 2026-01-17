"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: globalThis.Error & { digest?: string };
  reset: () => void;
}) {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main id="main-content" className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-zinc-900 rounded-lg shadow-lg text-center">
        <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <svg
            aria-hidden="true"
            className="w-8 h-8 text-red-600 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            An unexpected error occurred. Please try again.
          </p>
          {error.digest && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={reset}
            className="block w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="block w-full py-2 px-4 border border-zinc-300 rounded-md shadow-sm text-sm font-medium text-zinc-700 bg-white hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-600 dark:hover:bg-zinc-700"
          >
            Go to Home
          </Link>
        </div>

        <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 flex items-center justify-center gap-1 mx-auto"
          >
            <svg
              aria-hidden="true"
              className={`w-4 h-4 transition-transform ${showHelp ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {showHelp ? "Hide troubleshooting tips" : "Need help?"}
          </button>

          {showHelp && (
            <div className="mt-4 text-left space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
              <p className="font-medium text-zinc-900 dark:text-zinc-200">Common solutions:</p>
              <ul className="space-y-2 list-disc list-inside">
                <li>Refresh the page and try again</li>
                <li>Clear your browser cookies and cache</li>
                <li>Check your internet connection</li>
                <li>Try signing out and back in</li>
                <li>If connecting YNAB, ensure your YNAB account is active</li>
              </ul>
              <p className="text-xs text-zinc-500 dark:text-zinc-500 pt-2">
                If the problem persists, please try again later or contact support with the Error ID above.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
