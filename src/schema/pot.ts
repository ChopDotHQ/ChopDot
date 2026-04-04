/**
 * Pot & Expense Schema with Validation
 *
 * Provides zod schemas and TypeScript types for Member, Expense, and Pot.
 * Validation rules:
 * - name non-empty
 * - amount > 0
 * - paidBy ∈ members
 * - no duplicate member IDs
 */

import { z } from 'zod';

// Member schema
export const MemberSchema = z.object({
  id: z.string().min(1, 'Member ID is required'),
  name: z.string().min(1, 'Member name is required'),
  verified: z.boolean().optional(),
  role: z.string().optional(), // 'Owner' | 'Member'
  status: z.string().optional(), // 'active' | 'pending' | 'removed'
});

export type Member = z.infer<typeof MemberSchema>;

// Expense schema - matches runtime Expense interface with backward compatibility
export const ExpenseSchema = z.object({
  id: z.string().min(1, 'Expense ID is required'),
  potId: z.string().optional(), // Optional for backward compatibility
  amount: z.number().positive('Amount must be greater than 0'),
  currency: z.string().optional(), // Will be set by migration if missing
  paidBy: z.string().min(1, 'Paid by member ID is required'),
  memo: z.string().optional(), // Primary field name
  description: z.string().optional(), // Legacy field - migration will map to memo
  date: z.string().optional(), // ISO date string
  createdAt: z.number().int().nonnegative().optional(), // Legacy timestamp
  split: z.array(z.object({
    memberId: z.string(),
    amount: z.number(),
  })).optional(),
  attestations: z.union([
    z.array(z.string()), // Legacy format: string[]
    z.array(z.object({
      memberId: z.string(),
      confirmedAt: z.string(), // ISO date string
    })), // New format: Array<{memberId, confirmedAt}>
  ]).optional(),
  hasReceipt: z.boolean().optional(),
}).passthrough() // Allow unknown fields for forward compatibility
.refine((data) => {
  return data.paidBy.trim() !== '';
}, {
  message: 'Paid by must not be empty',
  path: ['paidBy'],
});

export type Expense = z.infer<typeof ExpenseSchema>;

// Pot mode: casual (no confirmations) vs auditable (with confirmations)
export const PotModeSchema = z.enum(['casual', 'auditable']).default('casual');
export type PotMode = z.infer<typeof PotModeSchema>;

// Base currency type - common fiat currencies
export type BaseCurrency = 'USD' | 'EUR' | 'GBP' | 'CHF' | 'CAD' | 'AUD' | 'JPY';

/**
 * Type guard to check if a string is a valid base currency
 */
export function isBaseCurrency(currency: string): currency is BaseCurrency {
  return ['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY'].includes(currency);
}

export const PotSchema = z.object({
  id: z.string().min(1, 'Pot ID is required'),
  name: z.string().min(1, 'Pot name is required'),
  type: z.enum(['expense', 'savings']),
  baseCurrency: z.enum(['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY']).default('USD'),
  members: z.array(MemberSchema).min(1, 'Pot must have at least one member'),
  expenses: z.array(ExpenseSchema).default([]),
  history: z.array(z.unknown()).optional().default([]),
  budget: z.number().nullable().optional(),
  budgetEnabled: z.boolean().optional().default(false),
  checkpointEnabled: z.boolean().optional().default(true),
  archived: z.boolean().optional().default(false),
  mode: PotModeSchema.optional().default('casual'),
  lastEditAt: z.string().optional(), // ISO date string
  // Savings pot fields
  contributions: z.array(z.object({
    id: z.string(),
    memberId: z.string(),
    amount: z.number(),
    date: z.string(),
  }).passthrough()).optional(),
  goalAmount: z.number().optional(),
  goalDescription: z.string().optional(),
  // Legacy fields
  createdAt: z.union([z.number().int().nonnegative(), z.string()]).optional(),
  updatedAt: z.number().int().nonnegative().optional(),
}).passthrough() // Allow unknown fields for forward compatibility
.refine((data) => {
  // Validate no duplicate member IDs
  const memberIds = data.members.map(m => m.id);
  const uniqueIds = new Set(memberIds);
  return uniqueIds.size === memberIds.length;
}, {
  message: 'Pot cannot have duplicate member IDs',
  path: ['members'],
}).refine((data) => {
  // Validate that all expenses' paidBy are valid member IDs
  const memberIds = new Set(data.members.map(m => m.id));
  return data.expenses.every(exp => memberIds.has(exp.paidBy));
}, {
  message: 'All expenses must be paid by a valid member',
  path: ['expenses'],
});

export type Pot = z.infer<typeof PotSchema>;
export type ValidatedPot = Pot; // Alias for consistency

/**
 * Validate a member object
 */
export function validateMember(member: unknown): { success: boolean; data?: Member; error?: string } {
  try {
    const data = MemberSchema.parse(member);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || 'Invalid member' };
    }
    return { success: false, error: 'Invalid member' };
  }
}

/**
 * Validate an expense object (requires member IDs for paidBy validation)
 * Note: potId is optional in validation since it's set by the parent component
 */
export function validateExpense(expense: unknown, memberIds: string[]): { success: boolean; data?: Expense; error?: string } {
  try {
    const FormExpenseSchema = z.object({
      id: z.string().min(1, 'Expense ID is required'),
      potId: z.string().optional(),
      description: z.string().min(1, 'Description is required'),
      amount: z.number().positive('Amount must be greater than 0'),
      paidBy: z.string().min(1, 'Paid by member ID is required'),
      createdAt: z.number().int().nonnegative('Created at must be a valid timestamp'),
    }).refine((data) => {
      return data.paidBy.trim() !== '';
    }, {
      message: 'Paid by must not be empty',
      path: ['paidBy'],
    });

    const parsed = FormExpenseSchema.parse(expense);

    if (!memberIds.includes(parsed.paidBy)) {
      return { success: false, error: 'Paid by must be a valid member ID' };
    }

    return { success: true, data: parsed as Expense };
  } catch (error) {
    if (error instanceof z.ZodError && error.issues && Array.isArray(error.issues) && error.issues.length > 0) {
      return { success: false, error: error.issues[0]?.message || 'Invalid expense' };
    }
    return { success: false, error: error instanceof Error ? error.message : 'Invalid expense' };
  }
}

/**
 * Validate a pot object
 */
export function validatePot(pot: unknown): { success: boolean; data?: Pot; error?: string } {
  try {
    const data = PotSchema.parse(pot);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || 'Invalid pot' };
    }
    return { success: false, error: 'Invalid pot' };
  }
}
