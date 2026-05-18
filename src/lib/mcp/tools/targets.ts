import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  fromMilliunits,
  getAuthenticatedClient,
  jsonResponse,
  withErrorHandling,
} from "@/lib/mcp/helpers";

const GOAL_TYPE_LABELS: Record<string, string> = {
  TB: "Target Balance",
  TBD: "Target Balance by Date",
  MF: "Monthly Funding",
  NEED: "Plan Your Spending",
  DEBT: "Debt Payoff",
};

export function registerTargetTools(server: McpServer) {
  // List all categories that have a target/goal set
  server.tool(
    "ynab_list_targets",
    "List all category targets (goals) in a budget, with progress and funding status. Optionally filter to only show under-funded targets.",
    {
      budget_id: z.string().describe("The budget ID"),
      only_under_funded: z
        .boolean()
        .optional()
        .describe(
          "If true, only return targets that are currently under-funded for this month",
        ),
    },
    async (args, extra) => {
      const auth = await getAuthenticatedClient(extra);
      if (!auth.success) return auth.error;

      return withErrorHandling(async () => {
        const response = await auth.client.categories.getCategories(
          args.budget_id,
        );

        const targets: Array<Record<string, unknown>> = [];
        for (const group of response.data.category_groups) {
          if (group.deleted || group.hidden) continue;
          for (const c of group.categories ?? []) {
            if (c.deleted || c.hidden) continue;
            if (!c.goal_type) continue;

            const underFunded = c.goal_under_funded ?? 0;
            if (args.only_under_funded && underFunded <= 0) continue;

            targets.push({
              categoryId: c.id,
              categoryName: c.name,
              categoryGroupId: group.id,
              categoryGroupName: group.name,
              goalType: c.goal_type,
              goalTypeLabel: GOAL_TYPE_LABELS[c.goal_type] ?? c.goal_type,
              goalTarget: c.goal_target ? fromMilliunits(c.goal_target) : null,
              goalTargetMonth: c.goal_target_month,
              goalCadence: c.goal_cadence,
              goalCadenceFrequency: c.goal_cadence_frequency,
              goalDay: c.goal_day,
              goalCreationMonth: c.goal_creation_month,
              goalPercentageComplete: c.goal_percentage_complete,
              goalMonthsToBudget: c.goal_months_to_budget,
              budgeted: fromMilliunits(c.budgeted),
              activity: fromMilliunits(c.activity),
              balance: fromMilliunits(c.balance),
              goalUnderFunded: c.goal_under_funded
                ? fromMilliunits(c.goal_under_funded)
                : 0,
              goalOverallFunded: c.goal_overall_funded
                ? fromMilliunits(c.goal_overall_funded)
                : null,
              goalOverallLeft: c.goal_overall_left
                ? fromMilliunits(c.goal_overall_left)
                : null,
            });
          }
        }

        return jsonResponse(targets);
      }, "Error fetching targets");
    },
  );
}
