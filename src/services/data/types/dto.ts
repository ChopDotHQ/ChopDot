/**
 * Data Transfer Objects (DTOs)
 * 
 * DTOs for create/update operations.
 * No computed fields - only input data.
 */

import { z } from 'zod';
import { MemberSchema, ExpenseSchema, PotSchema } from '../../../schema/pot';

// Create Pot DTO
export const CreatePotDTOSchema = z.object({
  name: z.string().min(1, 'Pot name is required'),
  type: z.enum(['expense', 'savings']),
  baseCurrency: z.enum(['DOT', 'USD']).default('USD'),
  budget: z.number().nullable().optional(),
  budgetEnabled: z.boolean().optional().default(false),
  checkpointEnabled: z.boolean().optional(),
  // Savings pot fields
  goalAmount: z.number().optional(),
  goalDescription: z.string().optional(),
  // Members (optional - defaults to owner only)
  members: z.array(MemberSchema).optional(),
});

export type CreatePotDTO = z.infer<typeof CreatePotDTOSchema>;

// Update Pot DTO (partial)
export const UpdatePotDTOSchema = PotSchema.partial().pick({
  name: true,
  baseCurrency: true,
  budget: true,
  budgetEnabled: true,
  checkpointEnabled: true,
  archived: true,
  goalAmount: true,
  goalDescription: true,
});

export type UpdatePotDTO = z.infer<typeof UpdatePotDTOSchema>;

// Create Expense DTO
export const CreateExpenseDTOSchema = ExpenseSchema.omit({
  id: true,
  attestations: true,
  attestationTxHash: true,
  attestationTimestamp: true,
}).extend({
  potId: z.string().min(1, 'Pot ID is required'),
});

export type CreateExpenseDTO = z.infer<typeof CreateExpenseDTOSchema>;

// Update Expense DTO (partial)
export const UpdateExpenseDTOSchema = ExpenseSchema.partial().pick({
  amount: true,
  currency: true,
  memo: true,
  date: true,
  paidBy: true,
  split: true,
  hasReceipt: true,
});

export type UpdateExpenseDTO = z.infer<typeof UpdateExpenseDTOSchema>;

// Create Member DTO
export const CreateMemberDTOSchema = MemberSchema.omit({
  id: true,
}).extend({
  potId: z.string().min(1, 'Pot ID is required'),
});

export type CreateMemberDTO = z.infer<typeof CreateMemberDTOSchema>;

// Update Member DTO (partial)
export const UpdateMemberDTOSchema = MemberSchema.partial().pick({
  name: true,
  address: true,
  verified: true,
  status: true,
});

export type UpdateMemberDTO = z.infer<typeof UpdateMemberDTOSchema>;

// Settlement Suggestion (from calc service)
export interface SettlementSuggestion {
  from: string; // memberId who owes
  to: string;   // memberId who is owed
  amount: number;
}

// On-chain Settlement History Entry
export interface OnchainSettlementHistory {
  id: string;
  when: number;
  type: 'onchain_settlement';
  fromMemberId: string;
  toMemberId: string;
  fromAddress: string;
  toAddress: string;
  amountDot: string;
  txHash: string;
  status: 'submitted' | 'in_block' | 'finalized' | 'failed';
  subscan?: string;
  note?: string;
}

