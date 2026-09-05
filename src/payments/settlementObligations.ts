import type {AppState} from '../types.ts';
import {getOpenSplits} from '../state/store.ts';

export interface SettlementObligation {
  key: string;
  from: string;
  to: string;
  amount: number;
  splitIds: string[];
}

/**
 * Groups open shares only when they have the same payer and receiver.
 * A group-level net balance is presentation data; it cannot transfer the
 * authority to request or confirm one expense to a different creditor.
 */
export function settlementObligations(state: AppState, groupId: string): SettlementObligation[] {
  const byRoute = new Map<string, SettlementObligation>();
  for (const split of getOpenSplits(state, groupId)) {
    const expense = state.expenses[split.expenseId];
    if (!expense || split.userId === expense.paidByUserId) continue;
    const key = `${split.userId}:${expense.paidByUserId}`;
    const current = byRoute.get(key) ?? {
      key,
      from: split.userId,
      to: expense.paidByUserId,
      amount: 0,
      splitIds: [],
    };
    current.amount += split.amount;
    current.splitIds.push(split.id);
    byRoute.set(key, current);
  }
  return [...byRoute.values()]
    .map(obligation => ({...obligation, splitIds: [...obligation.splitIds].sort()}))
    .sort((left, right) => left.to.localeCompare(right.to) || left.from.localeCompare(right.from));
}
