/**
 * Settlement Calculation Service
 *
 * Provides deterministic balance calculations and minimal settlement suggestions.
 * All calculations are pure functions with deterministic output.
 *
 * Uses decimal.js for arbitrary precision math (crucial for crypto/financials).
 */

import type { Pot } from '../../schema/pot';
import { getExpenseFunding, hasNativeExpenseFunding, assertExplicitFundingSplit, ExpenseFundingError } from '../../domain/expenseFunding';
import Decimal from 'decimal.js';

// Configure Decimal for high precision (20 digits covers 18 decimal crypto tokens + integers)
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

// Thresholds
const ZERO_THRESHOLD = new Decimal('1e-9'); // Effectively zero for logic checks

/** net > 0 = is owed; net < 0 = owes; net = 0 = balanced. */
export type Balance = {
  memberId: string;
  net: number;
};

export type Suggestion = {
  from: string;
  to: string;
  amount: number;
};

/**
 * Compute paid minus allocated per group member.
 * Native funding must be valid and have explicit conserving allocations.
 * The existing legacy equal-split fallback is deliberately unchanged.
 */
export function computeBalances(pot: Pot): Balance[] {
  const sortedMembers = [...pot.members].sort((a, b) => a.id.localeCompare(b.id));
  const memberIds = sortedMembers.map(m => m.id);
  const paid = new Map<string, Decimal>();
  const owed = new Map<string, Decimal>();

  memberIds.forEach(id => {
    paid.set(id, new Decimal(0));
    owed.set(id, new Decimal(0));
  });

  pot.expenses.forEach(expense => {
    const accountingExpense = { ...expense, currency: expense.currency ?? pot.baseCurrency };
    const funding = getExpenseFunding(accountingExpense, memberIds);
    if (hasNativeExpenseFunding(expense)) {
      if (accountingExpense.currency !== pot.baseCurrency) {
        throw new ExpenseFundingError('FUND-002', 'Native funding cannot mix currencies in one calculation');
      }
      assertExplicitFundingSplit(accountingExpense, memberIds);
    }
    const amount = new Decimal(expense.amount);

    funding.forEach((contribution) => {
      const contributionAmount = new Decimal(contribution.amount);
      paid.set(
        contribution.memberId,
        (paid.get(contribution.memberId) || new Decimal(0)).plus(contributionAmount),
      );
    });

    if (expense.split && expense.split.length > 0) {
      expense.split.forEach(split => {
        const splitAmount = new Decimal(split.amount);
        owed.set(split.memberId, (owed.get(split.memberId) || new Decimal(0)).plus(splitAmount));
      });
    } else {
      const perPerson = amount.div(memberIds.length);
      memberIds.forEach(memberId => {
        owed.set(memberId, (owed.get(memberId) || new Decimal(0)).plus(perPerson));
      });
    }
  });

  return sortedMembers.map(member => {
    const memberPaid = paid.get(member.id) || new Decimal(0);
    const memberOwed = owed.get(member.id) || new Decimal(0);
    return { memberId: member.id, net: memberPaid.minus(memberOwed).toNumber() };
  });
}

/** Suggest minimal settlements using the existing deterministic greedy algorithm. */
export function suggestSettlements(balances: Balance[]): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const debtors = balances
    .filter(b => b.net < -ZERO_THRESHOLD.toNumber())
    .map(b => ({ memberId: b.memberId, amount: new Decimal(b.net).neg() }))
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
      return b.amount.minus(a.amount).toNumber();
    });
  let debtorIdx = 0;
  let creditorIdx = 0;

  while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
    const debtor = debtors[debtorIdx];
    const creditor = creditors[creditorIdx];
    if (!debtor || !creditor) break;
    if (debtor.amount.lessThan(ZERO_THRESHOLD)) {
      debtorIdx++;
      continue;
    }
    if (creditor.amount.lessThan(ZERO_THRESHOLD)) {
      creditorIdx++;
      continue;
    }
    const transferAmount = Decimal.min(debtor.amount, creditor.amount);
    if (transferAmount.greaterThanOrEqualTo(ZERO_THRESHOLD)) {
      suggestions.push({ from: debtor.memberId, to: creditor.memberId, amount: transferAmount.toNumber() });
      debtor.amount = debtor.amount.minus(transferAmount);
      creditor.amount = creditor.amount.minus(transferAmount);
    } else {
      break;
    }
  }
  return suggestions.sort((a, b) => {
    const fromCompare = a.from.localeCompare(b.from);
    if (fromCompare !== 0) return fromCompare;
    const toCompare = a.to.localeCompare(b.to);
    if (toCompare !== 0) return toCompare;
    return a.amount - b.amount;
  });
}

export function getMemberBalance(balances: Balance[], memberId: string): number {
  return balances.find(b => b.memberId === memberId)?.net || 0;
}

export function isPotBalanced(balances: Balance[]): boolean {
  return balances.every(b => Math.abs(b.net) < ZERO_THRESHOLD.toNumber());
}
