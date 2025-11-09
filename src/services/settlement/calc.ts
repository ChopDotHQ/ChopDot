/**
 * Settlement Calculation Service
 * 
 * Provides deterministic balance calculations and minimal settlement suggestions.
 * All calculations are pure functions with deterministic output.
 */

import type { Pot } from '../../schema/pot';

const ROUNDING_PRECISION = 1e-6; // Micro precision (1e-6 DOT/USD)

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
 * Round a number to micro precision
 */
function roundToMicro(value: number): number {
  return Math.round(value / ROUNDING_PRECISION) * ROUNDING_PRECISION;
}

/**
 * Compute balances for all members in a pot
 * 
 * Algorithm:
 * 1. For each expense, split equally among all members
 * 2. Track what each member paid vs what they owe
 * 3. Net = paid - owed
 * 
 * Deterministic: members sorted by ID, rounding to micros
 */
export function computeBalances(pot: Pot): Balance[] {
  // Sort members by ID for deterministic ordering
  const sortedMembers = [...pot.members].sort((a, b) => a.id.localeCompare(b.id));
  const memberIds = sortedMembers.map(m => m.id);
  
  // Initialize balances: what each member paid and what they owe
  const paid = new Map<string, number>();
  const owed = new Map<string, number>();
  
  memberIds.forEach(id => {
    paid.set(id, 0);
    owed.set(id, 0);
  });
  
  // Process each expense
  pot.expenses.forEach(expense => {
    // Track what the payer paid (always full amount)
    const currentPaid = paid.get(expense.paidBy) || 0;
    paid.set(expense.paidBy, roundToMicro(currentPaid + expense.amount));
    
    // Use custom split if available, otherwise fall back to equal split
    if (expense.split && expense.split.length > 0) {
      // Use actual split amounts from expense.split[]
      expense.split.forEach(split => {
        const currentOwed = owed.get(split.memberId) || 0;
        owed.set(split.memberId, roundToMicro(currentOwed + split.amount));
      });
    } else {
      // Fall back to equal split: each member owes amount / numMembers
      const perPerson = roundToMicro(expense.amount / memberIds.length);
      memberIds.forEach(memberId => {
        const currentOwed = owed.get(memberId) || 0;
        owed.set(memberId, roundToMicro(currentOwed + perPerson));
      });
    }
  });
  
  // Calculate net balances
  const balances: Balance[] = sortedMembers.map(member => {
    const memberPaid = paid.get(member.id) || 0;
    const memberOwed = owed.get(member.id) || 0;
    const net = roundToMicro(memberPaid - memberOwed);
    
    return {
      memberId: member.id,
      net: roundToMicro(net),
    };
  });
  
  // Verify sum is approximately zero (within rounding error)
  const sum = balances.reduce((acc, b) => acc + b.net, 0);
  if (Math.abs(sum) > ROUNDING_PRECISION * balances.length) {
    console.warn('[Settlement] Balance sum is not zero:', sum, 'This may indicate a calculation error.');
  }
  
  return balances;
}

/**
 * Suggest minimal settlements using greedy algorithm
 * 
 * Algorithm:
 * 1. Sort debtors (net < 0) and creditors (net > 0) by amount
 * 2. Use two pointers: one for debtors, one for creditors
 * 3. Transfer minimal amount until all balances are settled
 * 4. Deterministic output: stable sort by memberId, then amount
 * 
 * Returns array of suggestions in minimal edges format
 */
export function suggestSettlements(balances: Balance[]): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  // Separate debtors and creditors, sort deterministically
  const debtors = balances
    .filter(b => b.net < -ROUNDING_PRECISION)
    .sort((a, b) => {
      // Primary sort: memberId (ascending) for determinism
      const idCompare = a.memberId.localeCompare(b.memberId);
      if (idCompare !== 0) return idCompare;
      // Secondary sort: amount (ascending, so more negative first)
      return a.net - b.net;
    })
    .map(b => ({ ...b, net: -b.net })); // Convert to positive for easier logic
  
  const creditors = balances
    .filter(b => b.net > ROUNDING_PRECISION)
    .sort((a, b) => {
      // Primary sort: memberId (ascending) for determinism
      const idCompare = a.memberId.localeCompare(b.memberId);
      if (idCompare !== 0) return idCompare;
      // Secondary sort: amount (descending, so larger first)
      return b.net - a.net;
    });
  
  // Two-pointer greedy algorithm
  let debtorIdx = 0;
  let creditorIdx = 0;
  
  while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
    const debtor = debtors[debtorIdx];
    const creditor = creditors[creditorIdx];
    
    if (!debtor || !creditor) break;
    
    if (debtor.net < ROUNDING_PRECISION && creditorIdx < creditors.length) {
      // Debtor is fully settled, move to next
      debtorIdx++;
      continue;
    }
    
    if (creditor.net < ROUNDING_PRECISION) {
      // Creditor is fully settled, move to next
      creditorIdx++;
      continue;
    }
    
    // Transfer minimal amount
    const transferAmount = roundToMicro(Math.min(debtor.net, creditor.net));
    
    if (transferAmount >= ROUNDING_PRECISION) {
      suggestions.push({
        from: debtor.memberId,
        to: creditor.memberId,
        amount: transferAmount,
      });
      
      // Update balances
      debtor.net = roundToMicro(debtor.net - transferAmount);
      creditor.net = roundToMicro(creditor.net - transferAmount);
    } else {
      // Amount too small, skip
      break;
    }
  }
  
  // Sort suggestions deterministically for consistent output
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
 * Check if a pot is balanced (all members have net ≈ 0)
 */
export function isPotBalanced(balances: Balance[]): boolean {
  return balances.every(b => Math.abs(b.net) < ROUNDING_PRECISION);
}

