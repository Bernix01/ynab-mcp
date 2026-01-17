/**
 * Script to set up the well-known "ynab" OAuth client.
 * Run with: npx tsx scripts/setup-oauth-client.ts
 */

import "dotenv/config";
import { ensureOAuthClient } from "../src/lib/ensure-oauth-client";

async function main() {
  console.log("Setting up well-known OAuth client...");
  await ensureOAuthClient();
  console.log("Done!");
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed to set up OAuth client:", error);
  process.exit(1);
});
