/**
 * Sanitized logging utilities
 * Redacts sensitive information from log messages
 */

// Patterns that might contain sensitive data
const SENSITIVE_PATTERNS = [
  // Tokens and secrets
  /access_token[=:]["']?[\w-]+/gi,
  /refresh_token[=:]["']?[\w-]+/gi,
  /bearer\s+[\w-]+/gi,
  /authorization[=:]["']?[\w-]+/gi,
  // API keys
  /api[_-]?key[=:]["']?[\w-]+/gi,
  /client[_-]?secret[=:]["']?[\w-]+/gi,
  // Base64-encoded data (potential tokens)
  /eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/g, // JWT pattern
];

const REDACTION_PLACEHOLDER = "[REDACTED]";

/**
 * Sanitize a string by redacting sensitive patterns
 */
function sanitize(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value);
  }

  let str: string;
  if (value instanceof Error) {
    // Include stack trace but sanitize the message
    str = `${value.name}: ${value.message}${value.stack ? `\n${value.stack}` : ""}`;
  } else if (typeof value === "object") {
    try {
      str = JSON.stringify(value);
    } catch {
      str = String(value);
    }
  } else {
    str = String(value);
  }

  // Apply all sensitive patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    str = str.replace(pattern, REDACTION_PLACEHOLDER);
  }

  return str;
}

/**
 * Sanitized console.error wrapper
 */
export function logError(message: string, ...args: unknown[]): void {
  const sanitizedArgs = args.map(sanitize);
  console.error(message, ...sanitizedArgs);
}

/**
 * Sanitized console.warn wrapper
 */
export function logWarn(message: string, ...args: unknown[]): void {
  const sanitizedArgs = args.map(sanitize);
  console.warn(message, ...sanitizedArgs);
}

/**
 * Sanitized console.log wrapper
 */
export function logInfo(message: string, ...args: unknown[]): void {
  const sanitizedArgs = args.map(sanitize);
  console.log(message, ...sanitizedArgs);
}
