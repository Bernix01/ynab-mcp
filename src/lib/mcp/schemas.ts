/**
 * Shared Zod schemas for MCP tools
 * Provides reusable, validated schemas for common YNAB parameters
 */

import { z } from "zod";

/**
 * Date format regex patterns
 */
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_REGEX = /^\d{4}-\d{2}-01$/;

/**
 * Common ID schemas with validation
 */
export const budgetIdSchema = z
  .string()
  .min(1, "Budget ID is required")
  .describe("The budget ID");

export const accountIdSchema = z
  .string()
  .min(1, "Account ID is required")
  .describe("The account ID");

export const categoryIdSchema = z
  .string()
  .min(1, "Category ID is required")
  .describe("The category ID");

export const transactionIdSchema = z
  .string()
  .min(1, "Transaction ID is required")
  .describe("The transaction ID");

export const payeeIdSchema = z
  .string()
  .min(1, "Payee ID is required")
  .describe("The payee ID");

/**
 * Date schemas with format validation
 */
export const dateSchema = z
  .string()
  .regex(DATE_REGEX, "Date must be in YYYY-MM-DD format")
  .describe("Date in YYYY-MM-DD format");

export const monthSchema = z
  .string()
  .regex(MONTH_REGEX, "Month must be in YYYY-MM-01 format")
  .describe("Budget month in YYYY-MM-01 format");

export const optionalDateSchema = dateSchema
  .optional()
  .describe("Optional date in YYYY-MM-DD format");

export const optionalMonthSchema = monthSchema
  .optional()
  .describe("Optional budget month in YYYY-MM-01 format");

/**
 * Transaction-related schemas
 */
export const transactionTypeSchema = z
  .enum(["uncategorized", "unapproved"])
  .optional()
  .describe("Filter transactions by type");

export const clearedStatusSchema = z
  .enum(["cleared", "uncleared", "reconciled"])
  .describe("Transaction cleared status");

export const amountSchema = z
  .number()
  .describe("Amount in currency units (will be converted to milliunits)");

export const memoSchema = z
  .string()
  .max(200, "Memo must be 200 characters or less")
  .optional()
  .describe("Transaction memo");

/**
 * Pagination schemas
 */
export const limitSchema = z
  .number()
  .int()
  .positive()
  .max(1000)
  .optional()
  .describe("Maximum number of results to return");

/**
 * Common parameter combinations
 */
export const budgetParams = {
  budget_id: budgetIdSchema,
} as const;

export const accountParams = {
  budget_id: budgetIdSchema,
  account_id: accountIdSchema,
} as const;

export const categoryParams = {
  budget_id: budgetIdSchema,
  category_id: categoryIdSchema,
} as const;

export const transactionParams = {
  budget_id: budgetIdSchema,
  transaction_id: transactionIdSchema,
} as const;

export const monthParams = {
  budget_id: budgetIdSchema,
  month: monthSchema,
} as const;

/**
 * Type exports for use in tool handlers
 */
export type BudgetId = z.infer<typeof budgetIdSchema>;
export type AccountId = z.infer<typeof accountIdSchema>;
export type CategoryId = z.infer<typeof categoryIdSchema>;
export type TransactionId = z.infer<typeof transactionIdSchema>;
export type PayeeId = z.infer<typeof payeeIdSchema>;
export type DateString = z.infer<typeof dateSchema>;
export type MonthString = z.infer<typeof monthSchema>;
export type TransactionType = z.infer<typeof transactionTypeSchema>;
export type ClearedStatus = z.infer<typeof clearedStatusSchema>;
