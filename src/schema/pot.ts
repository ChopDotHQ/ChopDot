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
  address: z.string().nullable().optional(),
  name: z.string().min(1, 'Member name is required'),
  verified: z.boolean().optional(),
  role: z.string().optional(), // 'Owner' | 'Member'
  status: z.string().optional(), // 'active' | 'pending' | 'removed'
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
  receiptUrl: z.string().url().optional(), // IPFS gateway URL for receipt
  attestationTxHash: z.string().optional(),
  attestationTimestamp: z.string().optional(),
}).passthrough() // Allow unknown fields for forward compatibility
.refine((data) => {
  // Validate that paidBy is a valid member ID (will be checked at pot level)
  return data.paidBy.trim() !== '';
}, {
  message: 'Paid by must not be empty',
  path: ['paidBy'],
});

export type Expense = z.infer<typeof ExpenseSchema>;

// PotHistory schema - discriminated union for on-chain history
const PotHistoryBaseSchema = z.object({
  id: z.string(),
  when: z.number().int().nonnegative(), // Date.now()
  txHash: z.string().optional(),
  block: z.string().optional(),
  status: z.enum(['submitted', 'in_block', 'finalized', 'failed']).optional(),
  subscan: z.string().optional(),
});

const OnchainSettlementHistorySchema = PotHistoryBaseSchema.extend({
  type: z.literal('onchain_settlement'),
  fromMemberId: z.string(),
  toMemberId: z.string(),
  fromAddress: z.string(), // SS58-0
  toAddress: z.string(), // SS58-0
  amountDot: z.string(), // e.g. "0.017"
  txHash: z.string(), // always present for settlements
  subscan: z.string().optional(),
  note: z.string().optional(),
});

const RemarkCheckpointHistorySchema = PotHistoryBaseSchema.extend({
  type: z.literal('remark_checkpoint'),
  message: z.string(), // full remark payload
  potHash: z.string(), // blake2 hash of serialized snapshot
  cid: z.string().nullable().optional(), // optional off-chain backup reference
});

export const PotHistorySchema = z.discriminatedUnion('type', [
  OnchainSettlementHistorySchema,
  RemarkCheckpointHistorySchema,
]);

export type PotHistory = z.infer<typeof PotHistorySchema>;

// ExpenseCheckpoint schema (for currentCheckpoint)
const ExpenseCheckpointSchema = z.object({
  id: z.string(),
  createdBy: z.string(),
  createdAt: z.string(), // ISO date string
  status: z.enum(['pending', 'confirmed', 'bypassed']),
  confirmations: z.record(z.string(), z.boolean()).optional(), // Map<string, boolean> serialized
  expiresAt: z.string().optional(), // ISO date string
  bypassedBy: z.string().optional(),
  bypassedAt: z.string().optional(),
}).passthrough();

// Contribution schema (for savings pots)
const ContributionSchema = z.object({
  id: z.string(),
  memberId: z.string(),
  amount: z.number(),
  date: z.string(), // ISO date string
  txHash: z.string().optional(),
}).passthrough();

// Pot mode: casual (no confirmations) vs auditable (with confirmations)
export const PotModeSchema = z.enum(['casual', 'auditable']).default('casual');
export type PotMode = z.infer<typeof PotModeSchema>;

// Last checkpoint metadata (simplified)
const LastCheckpointSchema = z.object({
  hash: z.string(),
  txHash: z.string().optional(),
  at: z.string(), // ISO date string
  cid: z.string().optional(),
}).optional();

// Pot schema - matches runtime Pot interface with passthrough for future fields
export const PotSchema = z.object({
  id: z.string().min(1, 'Pot ID is required'),
  name: z.string().min(1, 'Pot name is required'),
  type: z.enum(['expense', 'savings']),
  baseCurrency: z.enum(['DOT', 'USD']).default('USD'),
  members: z.array(MemberSchema).min(1, 'Pot must have at least one member'),
  expenses: z.array(ExpenseSchema).default([]),
  history: z.array(PotHistorySchema).optional().default([]),
  budget: z.number().nullable().optional(),
  budgetEnabled: z.boolean().optional().default(false),
  checkpointEnabled: z.boolean().optional().default(true),
  currentCheckpoint: ExpenseCheckpointSchema.optional(),
  archived: z.boolean().optional().default(false),
  // New fields: pot mode and confirmations
  mode: PotModeSchema.optional().default('casual'),
  confirmationsEnabled: z.boolean().optional(),
  lastCheckpoint: LastCheckpointSchema.optional(),
  lastEditAt: z.string().optional(), // ISO date string
  // Savings pot fields
  contributions: z.array(ContributionSchema).optional(),
  totalPooled: z.number().optional(),
  yieldRate: z.number().optional(),
  defiProtocol: z.string().optional(),
  goalAmount: z.number().optional(),
  goalDescription: z.string().optional(),
  // Legacy fields
  createdAt: z.number().int().nonnegative().optional(),
  updatedAt: z.number().int().nonnegative().optional(),
  lastBackupCid: z.string().nullable().optional(),
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

