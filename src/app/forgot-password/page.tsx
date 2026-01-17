"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [step, setStep] = useState<"email" | "confirm" | "success">("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setStep("confirm");
  };

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (confirmEmail !== email) {
      setError("Email addresses do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to delete account");
        setLoading(false);
        return;
      }

      setStep("success");
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-zinc-900 rounded-lg shadow-lg">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <svg
                aria-hidden="true"
                className="w-6 h-6 text-green-600 dark:text-green-400"
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
            <h1 className="text-2xl font-bold text-black dark:text-zinc-50">
              Account Deleted
            </h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Your account has been deleted. You can now create a new account
              with the same email address.
            </p>
          </div>

          <Link
            href="/login?mode=signup"
            className="flex h-12 w-full items-center justify-center rounded-full bg-black px-5 text-white font-medium transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Create New Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-zinc-900 rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-black dark:text-zinc-50">
            {step === "email" ? "Forgot Password?" : "Confirm Account Deletion"}
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            {step === "email"
              ? "Since password recovery isn't available, you can delete your account and create a new one."
              : "This action cannot be undone. Type your email again to confirm."}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 text-sm text-red-700 bg-red-100 rounded-md dark:bg-red-900/30 dark:text-red-400"
          >
            {error}
          </div>
        )}

        {step === "email" ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="mt-1 block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                placeholder="you@example.com"
              />
            </div>

            <div className="p-3 text-sm text-amber-700 bg-amber-100 rounded-md dark:bg-amber-900/30 dark:text-amber-400">
              <strong>Warning:</strong> This will permanently delete your
              account and all associated data including your YNAB connection.
            </div>

            <button
              type="submit"
              className="flex h-12 w-full items-center justify-center rounded-full bg-red-600 px-5 text-white font-medium transition-colors hover:bg-red-700"
            >
              Continue to Delete Account
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirmSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="confirm-email"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Type <strong>{email}</strong> to confirm
              </label>
              <input
                id="confirm-email"
                type="email"
                required
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                autoComplete="off"
                className="mt-1 block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                placeholder="Confirm your email"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setConfirmEmail("");
                  setError("");
                }}
                className="flex h-12 w-full items-center justify-center rounded-full border border-zinc-300 px-5 text-black font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || confirmEmail !== email}
                className="flex h-12 w-full items-center justify-center rounded-full bg-red-600 px-5 text-white font-medium transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Deleting..." : "Delete My Account"}
              </button>
            </div>
          </form>
        )}

        <div className="text-center">
          <Link
            href="/login"
            className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
