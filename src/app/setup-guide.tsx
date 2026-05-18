"use client";

import { useState } from "react";

interface SetupGuideProps {
  serverUrl: string;
  isLoggedIn: boolean;
  isYnabConnected: boolean;
}

export function SetupGuide({
  serverUrl,
  isLoggedIn,
  isYnabConnected,
}: SetupGuideProps) {
  const [copied, setCopied] = useState(false);

  const mcpConfig = JSON.stringify(
    {
      mcpServers: {
        ynab: {
          type: "http",
          url: `${serverUrl}/api/mcp`,
        },
      },
    },
    null,
    2,
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(mcpConfig);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — user can still select and copy manually
    }
  };

  return (
    <div className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
      <h2 className="text-xl font-semibold mb-1 text-black dark:text-zinc-50">
        How to wire it up
      </h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-500 mb-5">
        Three steps to get Claude talking to your YNAB budget.
      </p>

      <ol className="space-y-6">
        <li className="flex gap-4">
          <StepNumber done={isLoggedIn} number={1} />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-black dark:text-zinc-200 text-sm">
              Create an account here
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Use the <strong>Create Account</strong> button below. This account
              is what Claude authenticates against and is separate from your
              YNAB login — only an email and password hash are stored.
            </p>
          </div>
        </li>

        <li className="flex gap-4">
          <StepNumber done={false} number={2} />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-black dark:text-zinc-200 text-sm">
              Add this server to your Claude client
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 mb-2">
              Paste into{" "}
              <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                claude_desktop_config.json
              </code>{" "}
              (Claude Desktop) or your project's{" "}
              <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                .mcp.json
              </code>{" "}
              (Claude Code):
            </p>
            <div className="relative">
              <pre className="text-xs font-mono bg-zinc-950 text-zinc-100 dark:bg-zinc-900 border border-zinc-800 rounded-md p-3 pr-16 overflow-x-auto">
                {mcpConfig}
              </pre>
              <button
                type="button"
                onClick={handleCopy}
                className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700"
                aria-label="Copy MCP configuration to clipboard"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
              On first connection, Claude opens a browser to sign you in to this
              server (the account from step 1) and approve the OAuth scope.
            </p>
          </div>
        </li>

        <li className="flex gap-4">
          <StepNumber done={isYnabConnected} number={3} />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-black dark:text-zinc-200 text-sm">
              Connect your YNAB account
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              {isLoggedIn ? (
                <>
                  Click <strong>Connect YNAB Account</strong> below and approve
                  access on YNAB. Tokens are encrypted at rest and refreshed
                  automatically.
                </>
              ) : (
                <>
                  After signing in, you'll see a{" "}
                  <strong>Connect YNAB Account</strong> button on this page.
                  Tokens are encrypted at rest and refreshed automatically.
                </>
              )}
            </p>
          </div>
        </li>
      </ol>

      <div className="mt-6 pt-5 border-t border-zinc-200 dark:border-zinc-800">
        <p className="font-medium text-black dark:text-zinc-200 text-sm mb-2">
          Try asking Claude
        </p>
        <ul className="space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
          <li>&ldquo;List my YNAB budgets.&rdquo;</li>
          <li>&ldquo;What&rsquo;s my checking account balance?&rdquo;</li>
          <li>
            &ldquo;Add a $42.18 Costco transaction from my credit card to the
            Groceries category.&rdquo;
          </li>
          <li>
            &ldquo;Here&rsquo;s my bank statement PDF — add any missing
            transactions to YNAB and flag duplicates.&rdquo;
          </li>
        </ul>
      </div>
    </div>
  );
}

function StepNumber({ number, done }: { number: number; done: boolean }) {
  return (
    <div
      className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border ${
        done
          ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
          : "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
      }`}
      aria-hidden="true"
    >
      {done ? (
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          role="img"
          aria-label="Completed"
        >
          <title>Completed</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ) : (
        number
      )}
    </div>
  );
}
