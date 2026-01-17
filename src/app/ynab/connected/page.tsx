"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const AUTO_CLOSE_DELAY = 3; // seconds

export default function YnabConnectedPage() {
  const [isPopup, setIsPopup] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_CLOSE_DELAY);
  const [autoCloseEnabled, setAutoCloseEnabled] = useState(true);

  useEffect(() => {
    // Detect if this page is opened in a popup (has opener)
    const hasOpener = typeof window !== "undefined" && window.opener !== null;
    setIsPopup(hasOpener);

    if (!hasOpener || !autoCloseEnabled) return;

    // Start countdown for auto-close
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Try to close the popup window
          try {
            window.close();
          } catch {
            // If close fails, disable auto-close
            setAutoCloseEnabled(false);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoCloseEnabled]);

  const handleManualClose = () => {
    try {
      window.close();
    } catch {
      // If close fails, redirect to home
      window.location.href = "/";
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main id="main-content" className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-zinc-900 rounded-lg shadow-lg text-center">
        <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <svg
            aria-hidden="true"
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
          {isPopup && autoCloseEnabled ? (
            <>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                This window will close automatically in{" "}
                <span className="font-medium text-zinc-900 dark:text-white">
                  {countdown}
                </span>{" "}
                {countdown === 1 ? "second" : "seconds"}.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleManualClose}
                  className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Close Now
                </button>
                <button
                  type="button"
                  onClick={() => setAutoCloseEnabled(false)}
                  className="flex-1 py-2 px-4 border border-zinc-300 rounded-md shadow-sm text-sm font-medium text-zinc-700 bg-white hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-600 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                You can close this window and return to Claude.
              </p>
              {isPopup ? (
                <button
                  type="button"
                  onClick={handleManualClose}
                  className="block w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Close Window
                </button>
              ) : (
                <Link
                  href="/"
                  className="block w-full py-2 px-4 border border-zinc-300 rounded-md shadow-sm text-sm font-medium text-zinc-700 bg-white hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-600 dark:hover:bg-zinc-700"
                >
                  Go to Home
                </Link>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
