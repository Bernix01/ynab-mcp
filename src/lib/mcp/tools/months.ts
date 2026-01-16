import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  fromMilliunits,
  getAuthenticatedClient,
  jsonResponse,
  withErrorHandling,
} from "@/lib/mcp/helpers";

export function registerMonthTools(server: McpServer) {
  // Get budget months
  server.tool(
    "ynab_list_months",
    "List all budget months",
    {
      budget_id: z.string().describe("The budget ID"),
    },
    async (args, extra) => {
      const auth = await getAuthenticatedClient(extra);
      if (!auth.success) return auth.error;

      return withErrorHandling(async () => {
        const response = await auth.client.months.getBudgetMonths(
          args.budget_id,
        );
        const months = response.data.months.map((m) => ({
          month: m.month,
          note: m.note,
          income: fromMilliunits(m.income),
          budgeted: fromMilliunits(m.budgeted),
          activity: fromMilliunits(m.activity),
          toBeBudgeted: fromMilliunits(m.to_be_budgeted),
          ageOfMoney: m.age_of_money,
        }));
        return jsonResponse(months);
      }, "Error fetching months");
    },
  );

  // Get budget month details
  server.tool(
    "ynab_get_month",
    "Get details for a specific budget month",
    {
      budget_id: z.string().describe("The budget ID"),
      month: z.string().describe("The budget month (YYYY-MM-01)"),
    },
    async (args, extra) => {
      const auth = await getAuthenticatedClient(extra);
      if (!auth.success) return auth.error;

      return withErrorHandling(async () => {
        const response = await auth.client.months.getBudgetMonth(
          args.budget_id,
          args.month,
        );
        const m = response.data.month;
        return jsonResponse({
          month: m.month,
          note: m.note,
          income: fromMilliunits(m.income),
          budgeted: fromMilliunits(m.budgeted),
          activity: fromMilliunits(m.activity),
          toBeBudgeted: fromMilliunits(m.to_be_budgeted),
          ageOfMoney: m.age_of_money,
          categories: m.categories?.map((c) => ({
            id: c.id,
            name: c.name,
            budgeted: fromMilliunits(c.budgeted),
            activity: fromMilliunits(c.activity),
            balance: fromMilliunits(c.balance),
          })),
        });
      }, "Error fetching month");
    },
  );
}
