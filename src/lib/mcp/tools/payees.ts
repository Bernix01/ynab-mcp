import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getAuthenticatedClient,
  jsonResponse,
  withErrorHandling,
} from "@/lib/mcp/helpers";

export function registerPayeeTools(server: McpServer) {
  // List all payees
  server.tool(
    "ynab_list_payees",
    "List all payees in a budget",
    {
      budget_id: z.string().describe("The budget ID"),
    },
    async (args, extra) => {
      const auth = await getAuthenticatedClient(extra);
      if (!auth.success) return auth.error;

      return withErrorHandling(async () => {
        const response = await auth.client.payees.getPayees(args.budget_id);
        const payees = response.data.payees
          .filter((p) => !p.deleted)
          .map((p) => ({
            id: p.id,
            name: p.name,
            transferAccountId: p.transfer_account_id,
          }));
        return jsonResponse(payees);
      }, "Error fetching payees");
    },
  );
}
