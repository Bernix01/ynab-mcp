import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TransactionsResponse } from "ynab";
import { z } from "zod";
import {
  fromMilliunits,
  getAuthenticatedClient,
  jsonResponse,
  successResponse,
  toMilliunits,
  withErrorHandling,
} from "@/lib/mcp/helpers";

export function registerTransactionTools(server: McpServer) {
  // List transactions
  server.tool(
    "ynab_list_transactions",
    "List transactions in a budget with optional filters",
    {
      budget_id: z.string().describe("The budget ID"),
      account_id: z.string().optional().describe("Filter by account ID"),
      since_date: z
        .string()
        .optional()
        .describe(
          "Only return transactions on or after this date (YYYY-MM-DD)",
        ),
      type: z
        .enum(["uncategorized", "unapproved"])
        .optional()
        .describe("Filter by transaction type"),
    },
    async (args, extra) => {
      const auth = await getAuthenticatedClient(extra);
      if (!auth.success) return auth.error;

      return withErrorHandling(async () => {
        let response: TransactionsResponse;
        if (args.account_id) {
          response = await auth.client.transactions.getTransactionsByAccount(
            args.budget_id,
            args.account_id,
            args.since_date,
            args.type,
          );
        } else {
          response = await auth.client.transactions.getTransactions(
            args.budget_id,
            args.since_date,
            args.type,
          );
        }

        const transactions = response.data.transactions.map((t) => ({
          id: t.id,
          date: t.date,
          amount: fromMilliunits(t.amount),
          memo: t.memo,
          cleared: t.cleared,
          approved: t.approved,
          accountName: t.account_name,
          payeeName: t.payee_name,
          categoryName: t.category_name,
          flagColor: t.flag_color,
        }));
        return jsonResponse(transactions);
      }, "Error fetching transactions");
    },
  );

  // Get transaction details
  server.tool(
    "ynab_get_transaction",
    "Get details for a specific transaction",
    {
      budget_id: z.string().describe("The budget ID"),
      transaction_id: z.string().describe("The transaction ID"),
    },
    async (args, extra) => {
      const auth = await getAuthenticatedClient(extra);
      if (!auth.success) return auth.error;

      return withErrorHandling(async () => {
        const response = await auth.client.transactions.getTransactionById(
          args.budget_id,
          args.transaction_id,
        );
        const t = response.data.transaction;
        return jsonResponse({
          id: t.id,
          date: t.date,
          amount: fromMilliunits(t.amount),
          memo: t.memo,
          cleared: t.cleared,
          approved: t.approved,
          accountId: t.account_id,
          accountName: t.account_name,
          payeeId: t.payee_id,
          payeeName: t.payee_name,
          categoryId: t.category_id,
          categoryName: t.category_name,
          flagColor: t.flag_color,
          importId: t.import_id,
          subtransactions: t.subtransactions?.map((st) => ({
            id: st.id,
            amount: fromMilliunits(st.amount),
            memo: st.memo,
            categoryId: st.category_id,
            categoryName: st.category_name,
          })),
        });
      }, "Error fetching transaction");
    },
  );

  // Create transaction
  server.tool(
    "ynab_create_transaction",
    "Create a new transaction",
    {
      budget_id: z.string().describe("The budget ID"),
      account_id: z.string().describe("The account ID"),
      date: z.string().describe("Transaction date (YYYY-MM-DD)"),
      amount: z
        .number()
        .describe(
          "Transaction amount (positive for inflow, negative for outflow)",
        ),
      payee_name: z.string().optional().describe("Payee name"),
      category_id: z.string().optional().describe("Category ID"),
      memo: z.string().optional().describe("Transaction memo"),
      cleared: z
        .enum(["cleared", "uncleared", "reconciled"])
        .optional()
        .describe("Cleared status"),
      approved: z
        .boolean()
        .optional()
        .describe("Whether the transaction is approved"),
    },
    async (args, extra) => {
      const auth = await getAuthenticatedClient(extra);
      if (!auth.success) return auth.error;

      return withErrorHandling(async () => {
        const response = await auth.client.transactions.createTransaction(
          args.budget_id,
          {
            transaction: {
              account_id: args.account_id,
              date: args.date,
              amount: toMilliunits(args.amount),
              payee_name: args.payee_name,
              category_id: args.category_id,
              memo: args.memo,
              cleared: args.cleared,
              approved: args.approved,
            },
          },
        );
        return successResponse(
          `Transaction created successfully. ID: ${response.data.transaction?.id}`,
        );
      }, "Error creating transaction");
    },
  );

  // Update transaction
  server.tool(
    "ynab_update_transaction",
    "Update an existing transaction",
    {
      budget_id: z.string().describe("The budget ID"),
      transaction_id: z.string().describe("The transaction ID to update"),
      account_id: z.string().optional().describe("New account ID"),
      date: z.string().optional().describe("New date (YYYY-MM-DD)"),
      amount: z.number().optional().describe("New amount"),
      payee_name: z.string().optional().describe("New payee name"),
      category_id: z.string().optional().describe("New category ID"),
      memo: z.string().optional().describe("New memo"),
      cleared: z
        .enum(["cleared", "uncleared", "reconciled"])
        .optional()
        .describe("New cleared status"),
      approved: z.boolean().optional().describe("New approved status"),
    },
    async (args, extra) => {
      const auth = await getAuthenticatedClient(extra);
      if (!auth.success) return auth.error;

      return withErrorHandling(async () => {
        const updateData: Record<string, unknown> = {};
        if (args.account_id) updateData.account_id = args.account_id;
        if (args.date) updateData.date = args.date;
        if (args.amount !== undefined)
          updateData.amount = toMilliunits(args.amount);
        if (args.payee_name) updateData.payee_name = args.payee_name;
        if (args.category_id) updateData.category_id = args.category_id;
        if (args.memo !== undefined) updateData.memo = args.memo;
        if (args.cleared) updateData.cleared = args.cleared;
        if (args.approved !== undefined) updateData.approved = args.approved;

        const response = await auth.client.transactions.updateTransaction(
          args.budget_id,
          args.transaction_id,
          {
            transaction: updateData as Parameters<
              typeof auth.client.transactions.updateTransaction
            >[2]["transaction"],
          },
        );
        return successResponse(
          `Transaction updated successfully. ID: ${response.data.transaction?.id}`,
        );
      }, "Error updating transaction");
    },
  );

  // Delete transaction
  server.tool(
    "ynab_delete_transaction",
    "Delete a transaction",
    {
      budget_id: z.string().describe("The budget ID"),
      transaction_id: z.string().describe("The transaction ID to delete"),
    },
    async (args, extra) => {
      const auth = await getAuthenticatedClient(extra);
      if (!auth.success) return auth.error;

      return withErrorHandling(async () => {
        await auth.client.transactions.deleteTransaction(
          args.budget_id,
          args.transaction_id,
        );
        return successResponse("Transaction deleted successfully.");
      }, "Error deleting transaction");
    },
  );
}
