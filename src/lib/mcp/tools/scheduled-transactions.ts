import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  fromMilliunits,
  getAuthenticatedClient,
  jsonResponse,
  withErrorHandling,
} from "@/lib/mcp/helpers";

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
}
