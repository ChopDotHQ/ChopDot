/**
 * Settlement Calculation Service
 * 
 * Provides deterministic balance calculations and minimal settlement suggestions.
 * All calculations are pure functions with deterministic output.
 * 
 * Uses decimal.js for arbitrary precision math (crucial for crypto/financials).
 */

import type { Pot } from '../../schema/pot';
import Decimal from 'decimal.js';

// Configure Decimal for high precision (20 digits covers 18 decimal crypto tokens + integers)
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

// Thresholds
const ZERO_THRESHOLD = new Decimal('1e-9'); // Effectively zero for logic checks

/**
 * Balance for a member
 * net > 0 = is owed (creditor)
 * net < 0 = owes (debtor)
 * net = 0 = balanced
 */
export type Balance = {
  memberId: string;
  net: number;
};

/**
 * Settlement suggestion (minimal transfer)
 */
export type Suggestion = {
  from: string; // memberId who owes
  to: string;   // memberId who is owed
  amount: number;
};

/**
 * Compute balances for all members in a pot
 * 
 * Algorithm:
 * 1. For each expense, split equally among all members
 * 2. Track what each member paid vs what they owe
 * 3. Net = paid - owed
 * 
 * Uses Decimal for internal precision, returns number for compatibility.
 */
export function computeBalances(pot: Pot): Balance[] {
  // Sort members by ID for deterministic ordering
  const sortedMembers = [...pot.members].sort((a, b) => a.id.localeCompare(b.id));
  const memberIds = sortedMembers.map(m => m.id);
  
  // Initialize balances: what each member paid and what they owe
  const paid = new Map<string, Decimal>();
  const owed = new Map<string, Decimal>();
  
  memberIds.forEach(id => {
    paid.set(id, new Decimal(0));
    owed.set(id, new Decimal(0));
  });
  
  // Process each expense
  pot.expenses.forEach(expense => {
    // Safe conversion of amount to Decimal
    const amount = new Decimal(expense.amount);
    
    // Track what the payer paid
    const payerId = expense.paidBy;
    paid.set(payerId, (paid.get(payerId) || new Decimal(0)).plus(amount));
    
    // Use custom split if available, otherwise fall back to equal split
    if (expense.split && expense.split.length > 0) {
      // Use actual split amounts
      expense.split.forEach(split => {
        const splitAmount = new Decimal(split.amount);
        owed.set(split.memberId, (owed.get(split.memberId) || new Decimal(0)).plus(splitAmount));
      });
    } else {
      // Fall back to equal split: amount / numMembers
      // Decimal handles accurate division (e.g. 100/3 = 33.333...)
      const perPerson = amount.div(memberIds.length);
      
      memberIds.forEach(memberId => {
        owed.set(memberId, (owed.get(memberId) || new Decimal(0)).plus(perPerson));
      });
    }
  });
  
  // Calculate net balances
  return sortedMembers.map(member => {
    const memberPaid = paid.get(member.id) || new Decimal(0);
    const memberOwed = owed.get(member.id) || new Decimal(0);
    const net = memberPaid.minus(memberOwed);
    
    return {
      memberId: member.id,
      net: net.toNumber(), // Convert back to number for UI/Compatibility
    };
  });
}

/**
 * Suggest minimal settlements using greedy algorithm
 * 
 * Uses Decimal for internal logic to ensure 0.1 + 0.2 = 0.3 exactness.
 */
export function suggestSettlements(balances: Balance[]): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  // Convert to Decimal for processing
  // Sort deterministically
  const debtors = balances
    .filter(b => b.net < -ZERO_THRESHOLD.toNumber())
    .map(b => ({ memberId: b.memberId, amount: new Decimal(b.net).neg() })) // Store as positive debt
    .sort((a, b) => {
      const idCompare = a.memberId.localeCompare(b.memberId);
      if (idCompare !== 0) return idCompare;
      return a.amount.minus(b.amount).toNumber();
    });
  
  const creditors = balances
    .filter(b => b.net > ZERO_THRESHOLD.toNumber())
    .map(b => ({ memberId: b.memberId, amount: new Decimal(b.net) }))
    .sort((a, b) => {
      const idCompare = a.memberId.localeCompare(b.memberId);
      if (idCompare !== 0) return idCompare;
      return b.amount.minus(a.amount).toNumber(); // Descending for creditors
    });
  
  let debtorIdx = 0;
  let creditorIdx = 0;
  
  while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
    const debtor = debtors[debtorIdx];
    const creditor = creditors[creditorIdx];
    if (!debtor || !creditor) {
      break;
    }
    
    // Skip if settled
    if (debtor.amount.lessThan(ZERO_THRESHOLD)) {
      debtorIdx++;
      continue;
    }
    if (creditor.amount.lessThan(ZERO_THRESHOLD)) {
      creditorIdx++;
      continue;
    }
    
    // Transfer minimal amount
    // min(debt, credit)
    const transferAmount = Decimal.min(debtor.amount, creditor.amount);
    
    if (transferAmount.greaterThanOrEqualTo(ZERO_THRESHOLD)) {
      suggestions.push({
        from: debtor.memberId,
        to: creditor.memberId,
        amount: transferAmount.toNumber(),
      });
      
      // Update internal tracking
      debtor.amount = debtor.amount.minus(transferAmount);
      creditor.amount = creditor.amount.minus(transferAmount);
    } else {
      // Should not happen given threshold checks, but break safety
      break;
    }
  }
  
  // Sort suggestions deterministically
  return suggestions.sort((a, b) => {
    const fromCompare = a.from.localeCompare(b.from);
    if (fromCompare !== 0) return fromCompare;
    const toCompare = a.to.localeCompare(b.to);
    if (toCompare !== 0) return toCompare;
    return a.amount - b.amount;
  });
}

/**
 * Get balance for a specific member
 */
export function getMemberBalance(balances: Balance[], memberId: string): number {
  const balance = balances.find(b => b.memberId === memberId);
  return balance?.net || 0;
}

/**
 * Check if a pot is balanced
 */
export function isPotBalanced(balances: Balance[]): boolean {
  return balances.every(b => Math.abs(b.net) < ZERO_THRESHOLD.toNumber());
}
