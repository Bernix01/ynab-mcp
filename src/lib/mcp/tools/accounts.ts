import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  fromMilliunits,
  getAuthenticatedClient,
  jsonResponse,
  withErrorHandling,
} from "@/lib/mcp/helpers";

export function registerAccountTools(server: McpServer) {
  // List all accounts
  server.tool(
    "ynab_list_accounts",
    "List all accounts in a budget",
    {
      budget_id: z.string().describe("The budget ID"),
    },
    async (args, extra) => {
      const auth = await getAuthenticatedClient(extra);
      if (!auth.success) return auth.error;

      return withErrorHandling(async () => {
        const response = await auth.client.accounts.getAccounts(args.budget_id);
        const accounts = response.data.accounts.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          onBudget: a.on_budget,
          closed: a.closed,
          balance: fromMilliunits(a.balance),
          clearedBalance: fromMilliunits(a.cleared_balance),
          unclearedBalance: fromMilliunits(a.uncleared_balance),
        }));
        return jsonResponse(accounts);
      }, "Error fetching accounts");
    },
  );

  // Get account details
  server.tool(
    "ynab_get_account",
    "Get details for a specific account",
    {
      budget_id: z.string().describe("The budget ID"),
      account_id: z.string().describe("The account ID"),
    },
    async (args, extra) => {
      const auth = await getAuthenticatedClient(extra);
      if (!auth.success) return auth.error;

      return withErrorHandling(async () => {
        const response = await auth.client.accounts.getAccountById(
          args.budget_id,
          args.account_id,
        );
        const account = response.data.account;
        return jsonResponse({
          id: account.id,
          name: account.name,
          type: account.type,
          onBudget: account.on_budget,
          closed: account.closed,
          note: account.note,
          balance: fromMilliunits(account.balance),
          clearedBalance: fromMilliunits(account.cleared_balance),
          unclearedBalance: fromMilliunits(account.uncleared_balance),
          transferPayeeId: account.transfer_payee_id,
          directImportLinked: account.direct_import_linked,
          directImportInError: account.direct_import_in_error,
          lastReconciledAt: account.last_reconciled_at,
        });
      }, "Error fetching account");
    },
  );

  // Get account balance
  server.tool(
    "ynab_get_account_balance",
    "Get the current balance for a specific account",
    {
      budget_id: z.string().describe("The budget ID"),
      account_id: z.string().describe("The account ID"),
    },
    async (args, extra) => {
      const auth = await getAuthenticatedClient(extra);
      if (!auth.success) return auth.error;

      return withErrorHandling(async () => {
        const response = await auth.client.accounts.getAccountById(
          args.budget_id,
          args.account_id,
        );
        const account = response.data.account;
        return jsonResponse({
          name: account.name,
          balance: fromMilliunits(account.balance),
          clearedBalance: fromMilliunits(account.cleared_balance),
          unclearedBalance: fromMilliunits(account.uncleared_balance),
        });
      }, "Error fetching account balance");
    },
  );
}
