import type { API as YnabAPI } from "ynab";
import { env } from "@/lib/env";
import { logError } from "@/lib/logger";
import { getYnabClient } from "@/lib/ynab/client";

/** YNAB uses milliunits (1/1000 of currency unit) for all monetary values */
const MILLIUNITS_PER_UNIT = 1000;

/** Rate limit retry configuration */
const RATE_LIMIT_MAX_RETRIES = 3;
const RATE_LIMIT_BASE_DELAY_MS = 1000;

/**
 * MCP tool content type for text responses
 */
interface TextContent {
  type: "text";
  text: string;
}

/**
 * Standard MCP tool response format
 * Includes isError flag per MCP specification for proper error handling
 */
export interface ToolResponse {
  [key: string]: unknown;
  content: TextContent[];
  isError?: boolean;
}

/**
 * Extra context passed to MCP tool handlers
 */
interface ToolExtra {
  authInfo?: {
    extra?: {
      userId?: string;
    };
  };
}

/**
 * Create an error response for MCP tools
 * Sets isError: true so Claude can detect and self-correct from errors
 */
export function errorResponse(message: string): ToolResponse {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

/**
 * Create a success response for MCP tools
 */
export function successResponse(text: string): ToolResponse {
  return {
    content: [{ type: "text", text }],
  };
}

/**
 * Create a JSON response for MCP tools
 */
export function jsonResponse(data: unknown): ToolResponse {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * Result type for authenticated YNAB client
 */
type AuthResult =
  | { success: true; client: YnabAPI; userId: string }
  | { success: false; error: ToolResponse };

/**
 * Get authenticated YNAB client from tool context
 * Returns the client and userId if authenticated, or an error response
 * with authorization URL for YNAB connection
 */
export async function getAuthenticatedClient(
  extra: ToolExtra,
): Promise<AuthResult> {
  const userId = extra.authInfo?.extra?.userId as string | undefined;

  if (!userId) {
    return {
      success: false,
      error: errorResponse("Error: User not authenticated."),
    };
  }

  const client = await getYnabClient(userId);

  if (!client) {
    const authUrl = `${env.BETTER_AUTH_URL}/api/ynab/authorize`;
    return {
      success: false,
      error: errorResponse(
        `YNAB account not connected or authorization expired. YNAB tokens expire after 2 hours and are automatically refreshed, but if the refresh token is also invalid, you'll need to reconnect. Please authorize access by visiting: ${authUrl}`,
      ),
    };
  }

  return { success: true, client, userId };
}

/**
 * Convert YNAB milliunits to standard currency units
 */
export function fromMilliunits(milliunits: number): number {
  return milliunits / MILLIUNITS_PER_UNIT;
}

/**
 * Convert standard currency units to YNAB milliunits
 */
export function toMilliunits(amount: number): number {
  return Math.round(amount * MILLIUNITS_PER_UNIT);
}

/**
 * Check if an error is a YNAB rate limit (429) error
 */
function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    // YNAB SDK throws errors with specific format for rate limits
    const message = error.message.toLowerCase();
    return (
      message.includes("429") ||
      message.includes("too many requests") ||
      message.includes("rate limit")
    );
  }
  return false;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wrap a tool handler with error handling and rate limit retry
 */
export function withErrorHandling(
  handler: () => Promise<ToolResponse>,
  errorPrefix: string,
): Promise<ToolResponse> {
  return withRetry(handler, RATE_LIMIT_MAX_RETRIES).catch((error) => {
    const message = error instanceof Error ? error.message : "Unknown error";

    // Provide user-friendly message for rate limits
    if (isRateLimitError(error)) {
      return errorResponse(
        `${errorPrefix}: YNAB API rate limit exceeded. Please wait a moment and try again.`,
      );
    }

    return errorResponse(`${errorPrefix}: ${message}`);
  });
}

/**
 * Retry a handler with exponential backoff for rate limit errors
 */
async function withRetry(
  handler: () => Promise<ToolResponse>,
  maxRetries: number,
): Promise<ToolResponse> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await handler();
    } catch (error) {
      lastError = error;

      // Only retry on rate limit errors
      if (!isRateLimitError(error) || attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = RATE_LIMIT_BASE_DELAY_MS * 2 ** attempt;
      logError(
        `Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
        error,
      );
      await sleep(delay);
    }
  }

  throw lastError;
}
