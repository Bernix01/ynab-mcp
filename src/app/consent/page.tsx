"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

interface ClientInfo {
  name: string;
  icon?: string;
  redirectUris?: string[];
}

function ConsentForm() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [redirectUriValid, setRedirectUriValid] = useState<boolean | null>(
    null,
  );

  const clientId = searchParams.get("client_id");
  const redirectUri = searchParams.get("redirect_uri");
  const scope = searchParams.get("scope");
  const state = searchParams.get("state");
  const responseType = searchParams.get("response_type");
  const codeChallenge = searchParams.get("code_challenge");
  const codeChallengeMethod = searchParams.get("code_challenge_method");

  // Parse scopes for display
  const scopes = scope?.split(" ").filter(Boolean) || [];

  useEffect(() => {
    // Fetch client info and validate redirect_uri
    if (clientId && redirectUri) {
      fetch(
        `/api/auth/oauth/client-info?client_id=${encodeURIComponent(clientId)}`,
      )
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Client not found");
        })
        .then((data) => {
          setClientInfo(data);
          // Validate redirect_uri against registered URIs
          const registeredUris: string[] = data.redirectUris || [];
          const isValid = registeredUris.some((uri) => {
            // Exact match required for security
            if (uri === redirectUri) return true;
            // For localhost development, allow different ports (MCP clients use dynamic ports)
            try {
              const registered = new URL(uri);
              const requested = new URL(redirectUri);
              if (
                registered.hostname === "localhost" &&
                requested.hostname === "localhost" &&
                registered.pathname === requested.pathname
              ) {
                return true;
              }
            } catch {
              // Invalid URL, fall through
            }
            return false;
          });
          setRedirectUriValid(isValid);
          if (!isValid) {
            setError("Invalid redirect URI for this client");
          }
        })
        .catch(() => {
          setClientInfo({ name: clientId });
          setRedirectUriValid(false);
          setError("Unknown client");
        });
    }
  }, [clientId, redirectUri]);

  const handleAuthorize = async (approved: boolean) => {
    setLoading(true);
    setError("");

    // Validate redirect_uri before any redirect
    if (!redirectUriValid) {
      setError("Cannot redirect: invalid redirect URI");
      setLoading(false);
      return;
    }

    // This should never happen due to earlier validation, but TypeScript needs this check
    if (!redirectUri) {
      setError("Missing redirect URI");
      setLoading(false);
      return;
    }

    try {
      if (!approved) {
        // Redirect back with error - redirectUri already validated
        const errorUrl = new URL(redirectUri);
        errorUrl.searchParams.set("error", "access_denied");
        errorUrl.searchParams.set(
          "error_description",
          "User denied the request",
        );
        if (state) errorUrl.searchParams.set("state", state);
        window.location.href = errorUrl.toString();
        return;
      }

      // Use BetterAuth client to submit consent
      const { data, error } = await authClient.oauth2.consent({
        accept: true,
        scope: scope || undefined,
      });

      if (error) {
        throw new Error(error.message || "Authorization failed");
      }

      // BetterAuth returns uri with the authorization code
      if (data?.uri) {
        window.location.href = data.uri;
      } else if (redirectUri && clientId) {
        // Fallback: redirect back to authorize endpoint
        const authorizeUrl = new URL("/api/auth/oauth2/authorize", window.location.origin);
        authorizeUrl.searchParams.set("client_id", clientId);
        authorizeUrl.searchParams.set("redirect_uri", redirectUri);
        if (scope) authorizeUrl.searchParams.set("scope", scope);
        if (state) authorizeUrl.searchParams.set("state", state);
        if (responseType) authorizeUrl.searchParams.set("response_type", responseType);
        if (codeChallenge) authorizeUrl.searchParams.set("code_challenge", codeChallenge);
        if (codeChallengeMethod) authorizeUrl.searchParams.set("code_challenge_method", codeChallengeMethod);
        window.location.href = authorizeUrl.toString();
      } else {
        throw new Error("No redirect URL returned from consent endpoint");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  const getScopeDescription = (scopeName: string): string => {
    const descriptions: Record<string, string> = {
      openid: "Access your basic profile information",
      profile: "Access your profile details",
      email: "Access your email address",
      "ynab:read": "Read your YNAB budgets and transactions",
      "ynab:write": "Modify your YNAB budgets and transactions",
    };
    return descriptions[scopeName] || `Access: ${scopeName}`;
  };

  if (!clientId || !redirectUri) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600">Invalid Request</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Missing required OAuth parameters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-zinc-900 rounded-lg shadow-lg">
        <div className="text-center">
          {clientInfo?.icon && (
            <img
              src={clientInfo.icon}
              alt={clientInfo.name}
              className="w-16 h-16 mx-auto mb-4 rounded-lg"
            />
          )}
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Authorize Access
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-semibold">
              {clientInfo?.name || clientId}
            </span>{" "}
            is requesting access to your account.
          </p>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        )}

        {scopes.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              This application will be able to:
            </h2>
            <ul className="space-y-2">
              {scopes.map((s) => (
                <li
                  key={s}
                  className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400"
                >
                  <svg
                    className="w-5 h-5 text-green-500 flex-shrink-0"
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
                  <span>{getScopeDescription(s)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleAuthorize(false)}
            disabled={loading || !redirectUriValid}
            className="flex-1 py-2 px-4 border border-zinc-300 rounded-md shadow-sm text-sm font-medium text-zinc-700 bg-white hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-600 dark:hover:bg-zinc-700"
          >
            Deny
          </button>
          <button
            type="button"
            onClick={() => handleAuthorize(true)}
            disabled={loading || !redirectUriValid}
            className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading
              ? "Authorizing..."
              : redirectUriValid === null
                ? "Validating..."
                : "Authorize"}
          </button>
        </div>

        <p className="text-xs text-center text-zinc-500 dark:text-zinc-500">
          By authorizing, you agree to share the requested information with this
          application.
        </p>
      </div>
    </div>
  );
}

function ConsentFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-zinc-900 rounded-lg shadow-lg">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-zinc-200 dark:bg-zinc-700 rounded-lg animate-pulse" />
          <div className="h-8 w-48 mx-auto bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
          <div className="mt-2 h-4 w-64 mx-auto bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function ConsentPage() {
  return (
    <Suspense fallback={<ConsentFallback />}>
      <ConsentForm />
    </Suspense>
  );
}
