"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useMemo } from "react";
import { authClient } from "@/lib/auth-client";

// Whitelist of allowed redirect paths to prevent open redirect attacks
const ALLOWED_REDIRECT_PREFIXES = ["/", "/consent", "/login"];

// Password strength requirements
interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "One number", test: (p) => /[0-9]/.test(p) },
  { label: "One special character (!@#$%^&*)", test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

function PasswordStrengthMeter({ password }: { password: string }) {
  const results = useMemo(
    () => PASSWORD_REQUIREMENTS.map((req) => ({ ...req, met: req.test(password) })),
    [password]
  );

  const strength = results.filter((r) => r.met).length;
  const strengthPercent = (strength / PASSWORD_REQUIREMENTS.length) * 100;

  const getStrengthColor = () => {
    if (strengthPercent <= 25) return "bg-red-500";
    if (strengthPercent <= 50) return "bg-orange-500";
    if (strengthPercent <= 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStrengthLabel = () => {
    if (strengthPercent <= 25) return "Weak";
    if (strengthPercent <= 50) return "Fair";
    if (strengthPercent <= 75) return "Good";
    return "Strong";
  };

  if (!password) return null;

  return (
    <div id="password-requirements" className="mt-2 space-y-2">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getStrengthColor()}`}
            style={{ width: `${strengthPercent}%` }}
          />
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400 w-12">
          {getStrengthLabel()}
        </span>
      </div>

      {/* Requirements checklist */}
      <ul className="space-y-1">
        {results.map((req) => (
          <li
            key={req.label}
            className={`flex items-center gap-1.5 text-xs ${
              req.met
                ? "text-green-600 dark:text-green-400"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {req.met ? (
              <svg
                aria-hidden="true"
                className="w-3.5 h-3.5"
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
            ) : (
              <svg
                aria-hidden="true"
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" strokeWidth={2} />
              </svg>
            )}
            <span>{req.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Validates a redirect URL to prevent open redirect attacks.
 * Only allows relative paths from the whitelist, blocks protocol handlers.
 */
function getSafeRedirectUrl(redirect: string | null): string {
  if (!redirect) return "/";

  // Block protocol handlers (javascript:, data:, etc.) and protocol-relative URLs
  if (redirect.includes(":") || redirect.startsWith("//")) {
    return "/";
  }

  // Must start with /
  if (!redirect.startsWith("/")) {
    return "/";
  }

  // Check against whitelist of allowed prefixes
  const isAllowed = ALLOWED_REDIRECT_PREFIXES.some(
    (prefix) => redirect === prefix || redirect.startsWith(prefix + "/") || redirect.startsWith(prefix + "?")
  );

  return isAllowed ? redirect : "/";
}

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(searchParams.get("mode") === "signup");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectUrl = getSafeRedirectUrl(searchParams.get("redirect"));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await authClient.signUp.email({
          email,
          password,
          name,
        });
        if (error) {
          throw new Error(error.message || "Sign up failed");
        }
      } else {
        const { error } = await authClient.signIn.email({
          email,
          password,
        });
        if (error) {
          throw new Error(error.message || "Sign in failed");
        }
      }

      // Redirect to the original URL or home
      router.push(redirectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-zinc-900 rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            {isSignUp ? "Create Account" : "Sign In"}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {isSignUp
              ? "Create an account to connect your YNAB"
              : "Sign in to access your YNAB data"}
          </p>
        </div>

        {error && (
          <div
            id="form-error"
            role="alert"
            className="p-3 text-sm text-red-700 bg-red-100 rounded-md dark:bg-red-900/30 dark:text-red-400"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                required={isSignUp}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="mt-1 block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                placeholder="Your name"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              aria-describedby={error ? "form-error" : undefined}
              className="mt-1 block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              aria-describedby={error ? "form-error" : isSignUp ? "password-requirements" : undefined}
              className="mt-1 block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
              placeholder="••••••••"
            />
            {isSignUp && <PasswordStrengthMeter password={password} />}
            {!isSignUp && (
              <div className="mt-1 text-right">
                <Link
                  href="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
                >
                  Forgot password?
                </Link>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "Please wait..."
              : isSignUp
                ? "Create Account"
                : "Sign In"}
          </button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-zinc-900 rounded-lg shadow-lg">
        <div className="text-center">
          <div className="h-8 w-32 mx-auto bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
          <div className="mt-2 h-4 w-48 mx-auto bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
