import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Check if we're in a build context
 */
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

/**
 * Create database connection
 * During build phase, we create a dummy connection that won't be used
 */
function createDb(): NeonHttpDatabase<typeof schema> {
  if (isBuildPhase || !env.DATABASE_URL) {
    // Return a proxy that throws helpful errors if used during build
    return new Proxy({} as NeonHttpDatabase<typeof schema>, {
      get(_target, prop) {
        if (prop === "then") return undefined; // Avoid promise-like behavior
        throw new Error(
          `Database cannot be accessed during build phase. Property accessed: ${String(prop)}`,
        );
      },
    });
  }

  const sql: NeonQueryFunction<boolean, boolean> = neon(env.DATABASE_URL);
  return drizzle(sql, { schema });
}

export const db = createDb();
