/**
 * Pot & Expense Schema with Validation
 * 
 * Provides zod schemas and TypeScript types for Member, Expense, and Pot.
 * Includes validation rules:
 * - name non-empty
 * - amount > 0
 * - paidBy ∈ members
 * - no duplicate member IDs
 * - address must be isValidSs58Any
 */

import { z } from 'zod';
import { isValidSs58Any } from '../services/chain/address';

// Member schema - note: address is optional for MVP, but validated if provided
export const MemberSchema = z.object({
  id: z.string().min(1, 'Member ID is required'),
  address: z.string().optional(),
  name: z.string().min(1, 'Member name is required'),
  verified: z.boolean().optional(),
}).refine((data) => {
  // If address is provided, it must be a valid SS58 address
  if (data.address && data.address.trim() !== '') {
    return isValidSs58Any(data.address);
  }
  return true;
}, {
  message: 'Address must be a valid SS58 address',
  path: ['address'],
});

export type Member = z.infer<typeof MemberSchema>;

// Expense schema - simplified for MVP (equal split only)
export const ExpenseSchema = z.object({
  id: z.string().min(1, 'Expense ID is required'),
  potId: z.string().min(1, 'Pot ID is required'),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  paidBy: z.string().min(1, 'Paid by member ID is required'),
  createdAt: z.number().int().nonnegative('Created at must be a valid timestamp'),
}).refine((data) => {
  // Validate that paidBy is a valid member ID (will be checked at pot level)
  return data.paidBy.trim() !== '';
}, {
  message: 'Paid by must not be empty',
  path: ['paidBy'],
});

export type Expense = z.infer<typeof ExpenseSchema>;

// Pot schema
export const PotSchema = z.object({
  id: z.string().min(1, 'Pot ID is required'),
  name: z.string().min(1, 'Pot name is required'),
  members: z.array(MemberSchema).min(1, 'Pot must have at least one member'),
  expenses: z.array(ExpenseSchema),
  createdAt: z.number().int().nonnegative('Created at must be a valid timestamp'),
  updatedAt: z.number().int().nonnegative('Updated at must be a valid timestamp'),
}).refine((data) => {
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

/**
 * Validate a member object
 */
export function validateMember(member: unknown): { success: boolean; data?: Member; error?: string } {
  try {
    const data = MemberSchema.parse(member);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Invalid member' };
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
    // Create a schema for form validation (potId is optional since it's set by parent)
    // We can't use .extend() because ExpenseSchema has refinements, so we recreate it
    const FormExpenseSchema = z.object({
      id: z.string().min(1, 'Expense ID is required'),
      potId: z.string().optional(), // Optional for form validation
      description: z.string().min(1, 'Description is required'),
      amount: z.number().positive('Amount must be greater than 0'),
      paidBy: z.string().min(1, 'Paid by member ID is required'),
      createdAt: z.number().int().nonnegative('Created at must be a valid timestamp'),
    }).refine((data) => {
      // Validate that paidBy is not empty
      return data.paidBy.trim() !== '';
    }, {
      message: 'Paid by must not be empty',
      path: ['paidBy'],
    });
    
    const parsed = FormExpenseSchema.parse(expense);
    
    // Additional validation: paidBy must be in memberIds
    if (!memberIds.includes(parsed.paidBy)) {
      return { success: false, error: 'Paid by must be a valid member ID' };
    }
    
    // Return success - potId will be set by parent when saving
    return { success: true, data: parsed as Expense };
  } catch (error) {
    if (error instanceof z.ZodError && error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
      return { success: false, error: error.errors[0].message || 'Invalid expense' };
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
      return { success: false, error: error.errors[0]?.message || 'Invalid pot' };
    }
    return { success: false, error: 'Invalid pot' };
  }
}

