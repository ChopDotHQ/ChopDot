/**
 * Data Layer Types
 * 
 * Re-exports domain types from existing schemas.
 * Single source of truth - no duplication.
 */

// Re-export from schema/pot.ts (our canonical schema)
export type { Pot, Expense, Member, PotHistory } from '../../../schema/pot';

// Re-export from settlements utility
export type { Person, SettlementBreakdown, PersonSettlement, CalculatedSettlements } from '../../../utils/settlements';

// Re-export from settlement calc service
export type { Balance, Suggestion } from '../../settlement/calc';

// Additional types used in data layer
export interface ExpenseCheckpoint {
  id: string;
  createdBy: string;
  createdAt: string;
  status: 'pending' | 'confirmed' | 'bypassed';
  confirmations: Map<string, { confirmed: boolean; confirmedAt?: string }>;
  expiresAt: string;
  bypassedBy?: string;
  bypassedAt?: string;
}

export interface Contribution {
  id: string;
  memberId: string;
  amount: number;
  date: string;
  txHash?: string;
}

export interface Settlement {
  id: string;
  personId: string;
  amount: number;
  currency: string;
  method: 'cash' | 'bank' | 'paypal' | 'twint' | 'dot' | 'usdc';
  potIds?: string[];
  date: string;
  txHash?: string;
}

export interface ExpenseSummary {
  potId: string;
  totalExpenses: number;
  myExpenses: number;
  myShare: number;
}
