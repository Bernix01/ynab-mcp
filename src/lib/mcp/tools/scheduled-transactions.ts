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

const FREQUENCIES = [
  "never",
  "daily",
  "weekly",
  "everyOtherWeek",
  "twiceAMonth",
  "every4Weeks",
  "monthly",
  "everyOtherMonth",
  "every3Months",
  "every4Months",
  "twiceAYear",
  "yearly",
  "everyOtherYear",
] as const;

const FLAG_COLORS = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
] as const;

export function registerScheduledTransactionTools(server: McpServer) {
  // List scheduled (planned) transactions
  server.tool(
    "ynab_list_scheduled_transactions",
    "List all scheduled (planned) transactions in a budget",
    {
      budget_id: z.string().describe("The budget ID"),
    },
    async (args, extra) => {
      const auth = await getAuthenticatedClient(extra);
      if (!auth.success) return auth.error;

      return withErrorHandling(async () => {
        const response =
          await auth.client.scheduledTransactions.getScheduledTransactions(
            args.budget_id,
          );
        const transactions = response.data.scheduled_transactions
          .filter((t) => !t.deleted)
          .map((t) => ({
            id: t.id,
            dateFirst: t.date_first,
            dateNext: t.date_next,
            frequency: t.frequency,
            amount: fromMilliunits(t.amount),
            memo: t.memo,
            flagColor: t.flag_color,
            accountId: t.account_id,
            accountName: t.account_name,
            payeeId: t.payee_id,
            payeeName: t.payee_name,
            categoryId: t.category_id,
            categoryName: t.category_name,
            transferAccountId: t.transfer_account_id,
            subtransactions: t.subtransactions
              ?.filter((st) => !st.deleted)
              .map((st) => ({
                id: st.id,
                amount: fromMilliunits(st.amount),
                memo: st.memo,
                categoryId: st.category_id,
                payeeId: st.payee_id,
                transferAccountId: st.transfer_account_id,
              })),
          }));
        return jsonResponse(transactions);
      }, "Error fetching scheduled transactions");
    },
  );

  // Get a specific scheduled transaction
  server.tool(
    "ynab_get_scheduled_transaction",
    "Get details for a specific scheduled (planned) transaction",
    {
      budget_id: z.string().describe("The budget ID"),
      scheduled_transaction_id: z
        .string()
        .describe("The scheduled transaction ID"),
    },
    async (args, extra) => {
      const auth = await getAuthenticatedClient(extra);
      if (!auth.success) return auth.error;

      return withErrorHandling(async () => {
        const response =
          await auth.client.scheduledTransactions.getScheduledTransactionById(
            args.budget_id,
            args.scheduled_transaction_id,
          );
        const t = response.data.scheduled_transaction;
        return jsonResponse({
          id: t.id,
          dateFirst: t.date_first,
          dateNext: t.date_next,
          frequency: t.frequency,
          amount: fromMilliunits(t.amount),
          memo: t.memo,
          flagColor: t.flag_color,
          accountId: t.account_id,
          accountName: t.account_name,
          payeeId: t.payee_id,
          payeeName: t.payee_name,
          categoryId: t.category_id,
          categoryName: t.category_name,
          transferAccountId: t.transfer_account_id,
          deleted: t.deleted,
          subtransactions: t.subtransactions
            ?.filter((st) => !st.deleted)
            .map((st) => ({
              id: st.id,
              amount: fromMilliunits(st.amount),
              memo: st.memo,
              categoryId: st.category_id,
              payeeId: st.payee_id,
              transferAccountId: st.transfer_account_id,
            })),
        });
      }, "Error fetching scheduled transaction");
    },
  );

  // Create scheduled transaction
  server.tool(
    "ynab_create_scheduled_transaction",
    "Create a new scheduled (recurring/upcoming) transaction. Splits are not supported.",
    {
      budget_id: z.string().describe("The budget ID"),
      account_id: z.string().describe("The account ID"),
      date: z
        .string()
        .describe(
          "First/next occurrence date (YYYY-MM-DD). Must be a future date no more than 5 years out.",
        ),
      amount: z
        .number()
        .optional()
        .describe(
          "Amount in currency units (e.g., 9.33 for $9.33). Positive for inflow, negative for outflow.",
        ),
      frequency: z
        .enum(FREQUENCIES)
        .optional()
        .describe("How often the transaction recurs. Defaults to 'never'."),
      payee_name: z.string().optional().describe("Payee name"),
      category_id: z
        .string()
        .optional()
        .describe("Category ID (Credit Card Payment categories not permitted)"),
      memo: z.string().optional().describe("Transaction memo"),
      flag_color: z
        .enum(FLAG_COLORS)
        .optional()
        .describe("Transaction flag color"),
    },
    async (args, extra) => {
      const auth = await getAuthenticatedClient(extra);
      if (!auth.success) return auth.error;

      return withErrorHandling(async () => {
        const response =
          await auth.client.scheduledTransactions.createScheduledTransaction(
            args.budget_id,
            {
              scheduled_transaction: {
                account_id: args.account_id,
                date: args.date,
                amount:
                  args.amount !== undefined
                    ? toMilliunits(args.amount)
                    : undefined,
                frequency: args.frequency,
                payee_name: args.payee_name,
                category_id: args.category_id,
                memo: args.memo,
                flag_color: args.flag_color,
              },
            },
          );
        return successResponse(
          `Scheduled transaction created successfully. ID: ${response.data.scheduled_transaction?.id}`,
        );
      }, "Error creating scheduled transaction");
    },
  );

  // Update scheduled transaction
  server.tool(
    "ynab_update_scheduled_transaction",
    "Update an existing scheduled transaction",
    {
      budget_id: z.string().describe("The budget ID"),
      scheduled_transaction_id: z
        .string()
        .describe("The scheduled transaction ID to update"),
      account_id: z
        .string()
        .describe("The account ID (required by YNAB on update)"),
      date: z
        .string()
        .describe(
          "First/next occurrence date (YYYY-MM-DD), required by YNAB on update. Must be a future date no more than 5 years out.",
        ),
      amount: z
        .number()
        .optional()
        .describe("New amount in currency units (e.g., 9.33 for $9.33)"),
      frequency: z
        .enum(FREQUENCIES)
        .optional()
        .describe("New recurrence frequency"),
      payee_name: z.string().optional().describe("New payee name"),
      category_id: z.string().optional().describe("New category ID"),
      memo: z.string().optional().describe("New memo"),
      flag_color: z.enum(FLAG_COLORS).optional().describe("New flag color"),
    },
    async (args, extra) => {
      const auth = await getAuthenticatedClient(extra);
      if (!auth.success) return auth.error;

      return withErrorHandling(async () => {
        const response =
          await auth.client.scheduledTransactions.updateScheduledTransaction(
            args.budget_id,
            args.scheduled_transaction_id,
            {
              scheduled_transaction: {
                account_id: args.account_id,
                date: args.date,
                amount:
                  args.amount !== undefined
                    ? toMilliunits(args.amount)
                    : undefined,
                frequency: args.frequency,
                payee_name: args.payee_name,
                category_id: args.category_id,
                memo: args.memo,
                flag_color: args.flag_color,
              },
            },
          );
        return successResponse(
          `Scheduled transaction updated successfully. ID: ${response.data.scheduled_transaction?.id}`,
        );
      }, "Error updating scheduled transaction");
    },
  );

  // Delete scheduled transaction
  server.tool(
    "ynab_delete_scheduled_transaction",
    "Delete a scheduled transaction",
    {
      budget_id: z.string().describe("The budget ID"),
      scheduled_transaction_id: z
        .string()
        .describe("The scheduled transaction ID to delete"),
    },
    async (args, extra) => {
      const auth = await getAuthenticatedClient(extra);
      if (!auth.success) return auth.error;

      return withErrorHandling(async () => {
        await auth.client.scheduledTransactions.deleteScheduledTransaction(
          args.budget_id,
          args.scheduled_transaction_id,
        );
        return successResponse("Scheduled transaction deleted successfully.");
      }, "Error deleting scheduled transaction");
    },
  );
}
