import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getAuthenticatedClient,
  jsonResponse,
  withErrorHandling,
} from "@/lib/mcp/helpers";

export function registerBudgetTools(server: McpServer) {
  // List all budgets
  server.tool(
    "ynab_list_budgets",
    "List all budgets the user has access to",
    {},
    async (_args, extra) => {
      const auth = await getAuthenticatedClient(extra);
      if (!auth.success) return auth.error;

      return withErrorHandling(async () => {
        const response = await auth.client.budgets.getBudgets();
        const budgets = response.data.budgets.map((b) => ({
          id: b.id,
          name: b.name,
          lastModifiedOn: b.last_modified_on,
          firstMonth: b.first_month,
          lastMonth: b.last_month,
        }));
        return jsonResponse(budgets);
      }, "Error fetching budgets");
    },
  );

  // Get budget details
  server.tool(
    "ynab_get_budget",
    "Get detailed information about a specific budget",
    {
      budget_id: z
        .string()
        .describe(
          'The budget ID (use "last-used" for the last accessed budget)',
        ),
    },
    async (args, extra) => {
      const auth = await getAuthenticatedClient(extra);
      if (!auth.success) return auth.error;

      return withErrorHandling(async () => {
        const response = await auth.client.budgets.getBudgetById(
          args.budget_id,
        );
        const budget = response.data.budget;
        return jsonResponse({
          id: budget.id,
          name: budget.name,
          lastModifiedOn: budget.last_modified_on,
          dateFormat: budget.date_format,
          currencyFormat: budget.currency_format,
          accountCount: budget.accounts?.length ?? 0,
          categoryGroupCount: budget.category_groups?.length ?? 0,
        });
      }, "Error fetching budget");
    },
  );

  // Get budget settings
  server.tool(
    "ynab_get_budget_settings",
    "Get settings for a specific budget",
    {
      budget_id: z.string().describe("The budget ID"),
    },
    async (args, extra) => {
      const auth = await getAuthenticatedClient(extra);
      if (!auth.success) return auth.error;

      return withErrorHandling(async () => {
        const response = await auth.client.budgets.getBudgetSettingsById(
          args.budget_id,
        );
        return jsonResponse(response.data.settings);
      }, "Error fetching budget settings");
    },
  );
}
