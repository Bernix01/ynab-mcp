import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getYnabTokens } from "@/lib/ynab/tokens";
import { ConsentForm } from "./consent-form";

interface ConsentPageProps {
  searchParams: Promise<{
    client_id?: string;
    redirect_uri?: string;
    scope?: string;
    state?: string;
    response_type?: string;
    code_challenge?: string;
    code_challenge_method?: string;
  }>;
}

export default async function ConsentPage({ searchParams }: ConsentPageProps) {
  const params = await searchParams;

  // Get the current user session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    // Build return URL with all OAuth params
    const returnParams = new URLSearchParams();
    if (params.client_id) returnParams.set("client_id", params.client_id);
    if (params.redirect_uri) returnParams.set("redirect_uri", params.redirect_uri);
    if (params.scope) returnParams.set("scope", params.scope);
    if (params.state) returnParams.set("state", params.state);
    if (params.response_type) returnParams.set("response_type", params.response_type);
    if (params.code_challenge) returnParams.set("code_challenge", params.code_challenge);
    if (params.code_challenge_method) returnParams.set("code_challenge_method", params.code_challenge_method);

    const returnUrl = `/consent?${returnParams.toString()}`;
    redirect(`/login?redirect=${encodeURIComponent(returnUrl)}`);
  }

  // Check YNAB connection status server-side
  const ynabTokens = await getYnabTokens(session.user.id);
  const ynabConnected = ynabTokens !== null;

  // If YNAB not connected, show connect page
  if (!ynabConnected) {
    // Build current URL for return after YNAB auth
    const currentParams = new URLSearchParams();
    if (params.client_id) currentParams.set("client_id", params.client_id);
    if (params.redirect_uri) currentParams.set("redirect_uri", params.redirect_uri);
    if (params.scope) currentParams.set("scope", params.scope);
    if (params.state) currentParams.set("state", params.state);
    if (params.response_type) currentParams.set("response_type", params.response_type);
    if (params.code_challenge) currentParams.set("code_challenge", params.code_challenge);
    if (params.code_challenge_method) currentParams.set("code_challenge_method", params.code_challenge_method);

    const returnUrl = `/consent?${currentParams.toString()}`;

    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-zinc-900 rounded-lg shadow-lg">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-amber-600 dark:text-amber-400"
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
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Connect YNAB First
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Before authorizing this application, you need to connect your YNAB account.
            </p>
          </div>

          <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              This MCP server needs access to your YNAB budget data to function.
              Click below to securely connect your YNAB account.
            </p>
          </div>

          <a
            href={`/api/ynab/authorize?return_url=${encodeURIComponent(returnUrl)}`}
            className="block w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-center"
          >
            Connect YNAB Account
          </a>

          <p className="text-xs text-center text-zinc-500 dark:text-zinc-500">
            You will be redirected to YNAB to authorize access, then returned here to complete the setup.
          </p>
        </div>
      </div>
    );
  }

  // YNAB is connected, show consent form
  return <ConsentForm />;
}
