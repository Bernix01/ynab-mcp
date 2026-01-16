import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  fromMilliunits,
  getAuthenticatedClient,
  jsonResponse,
  successResponse,
  toMilliunits,
  withErrorHandling,
} from "@/lib/mcp/helpers";

export function registerCategoryTools(server: McpServer) {
  // List all categories
  server.tool(
    "ynab_list_categories",
    "List all categories in a budget",
    {
      budget_id: z.string().describe("The budget ID"),
    },
    async (args, extra) => {
      const auth = await getAuthenticatedClient(extra);
      if (!auth.success) return auth.error;

      return withErrorHandling(async () => {
        const response = await auth.client.categories.getCategories(
          args.budget_id,
        );
        const categoryGroups = response.data.category_groups.map((group) => ({
          id: group.id,
          name: group.name,
          hidden: group.hidden,
          deleted: group.deleted,
          categories: group.categories?.map((c) => ({
            id: c.id,
            name: c.name,
            hidden: c.hidden,
            budgeted: fromMilliunits(c.budgeted),
            activity: fromMilliunits(c.activity),
            balance: fromMilliunits(c.balance),
          })),
        }));
        return jsonResponse(categoryGroups);
      }, "Error fetching categories");
    },
  );

  // Get category details
  server.tool(
    "ynab_get_category",
    "Get details for a specific category",
    {
      budget_id: z.string().describe("The budget ID"),
      category_id: z.string().describe("The category ID"),
    },
    async (args, extra) => {
      const auth = await getAuthenticatedClient(extra);
      if (!auth.success) return auth.error;

      return withErrorHandling(async () => {
        const response = await auth.client.categories.getCategoryById(
          args.budget_id,
          args.category_id,
        );
        const c = response.data.category;
        return jsonResponse({
          id: c.id,
          categoryGroupId: c.category_group_id,
          categoryGroupName: c.category_group_name,
          name: c.name,
          hidden: c.hidden,
          originalCategoryGroupId: c.original_category_group_id,
          note: c.note,
          budgeted: fromMilliunits(c.budgeted),
          activity: fromMilliunits(c.activity),
          balance: fromMilliunits(c.balance),
          goalType: c.goal_type,
          goalDay: c.goal_day,
          goalCadence: c.goal_cadence,
          goalCadenceFrequency: c.goal_cadence_frequency,
          goalCreationMonth: c.goal_creation_month,
          goalTarget: c.goal_target ? fromMilliunits(c.goal_target) : null,
          goalTargetMonth: c.goal_target_month,
          goalPercentageComplete: c.goal_percentage_complete,
          goalMonthsToBudget: c.goal_months_to_budget,
          goalUnderFunded: c.goal_under_funded
            ? fromMilliunits(c.goal_under_funded)
            : null,
          goalOverallFunded: c.goal_overall_funded
            ? fromMilliunits(c.goal_overall_funded)
            : null,
          goalOverallLeft: c.goal_overall_left
            ? fromMilliunits(c.goal_overall_left)
            : null,
          deleted: c.deleted,
        });
      }, "Error fetching category");
    },
  );

  // Get category for a specific month
  server.tool(
    "ynab_get_category_month",
    "Get category details for a specific month",
    {
      budget_id: z.string().describe("The budget ID"),
      month: z.string().describe("The budget month (YYYY-MM-01)"),
      category_id: z.string().describe("The category ID"),
    },
    async (args, extra) => {
      const auth = await getAuthenticatedClient(extra);
      if (!auth.success) return auth.error;

      return withErrorHandling(async () => {
        const response = await auth.client.categories.getMonthCategoryById(
          args.budget_id,
          args.month,
          args.category_id,
        );
        const c = response.data.category;
        return jsonResponse({
          id: c.id,
          name: c.name,
          budgeted: fromMilliunits(c.budgeted),
          activity: fromMilliunits(c.activity),
          balance: fromMilliunits(c.balance),
          goalType: c.goal_type,
          goalPercentageComplete: c.goal_percentage_complete,
        });
      }, "Error fetching category month");
    },
  );

  // Update category budgeted amount for a month
  server.tool(
    "ynab_update_category_budget",
    "Update the budgeted amount for a category in a specific month",
    {
      budget_id: z.string().describe("The budget ID"),
      month: z.string().describe("The budget month (YYYY-MM-01)"),
      category_id: z.string().describe("The category ID"),
      budgeted: z.number().describe("The new budgeted amount"),
    },
    async (args, extra) => {
      const auth = await getAuthenticatedClient(extra);
      if (!auth.success) return auth.error;

      return withErrorHandling(async () => {
        const response = await auth.client.categories.updateMonthCategory(
          args.budget_id,
          args.month,
          args.category_id,
          {
            category: {
              budgeted: toMilliunits(args.budgeted),
            },
          },
        );
        return successResponse(
          `Category budget updated. New budgeted amount: ${fromMilliunits(response.data.category.budgeted)}`,
        );
      }, "Error updating category budget");
    },
  );
}
