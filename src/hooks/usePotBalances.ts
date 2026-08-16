import { useMemo } from 'react';
import { computeBalances, suggestSettlements, getMemberBalance } from '../services/settlement/calc';
import type { Pot, Expense as PotExpense } from '../schema/pot';
import { normalizeCurrency } from '../utils/currencyFormat';

interface Member {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  amount: number;
  currency: string;
  paidBy: string;
  memo: string;
  date: string;
  split: { memberId: string; amount: number }[];
  attestations: string[] | Array<{ memberId: string; confirmedAt: string }>;
  hasReceipt: boolean;
}

interface UsePotBalancesParams {
  expenses: Expense[];
  members: Member[];
  potId?: string;
  baseCurrency: string;
  currentUserId: string;
  budget?: number;
  budgetEnabled?: boolean;
}

export function usePotBalances({
  expenses,
  members,
  potId,
  baseCurrency,
  currentUserId,
  budget,
}: UsePotBalancesParams) {
  const normalizedBaseCurrency = normalizeCurrency(baseCurrency);
  const settleThreshold = 0.01;

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const potForCalc: Pot = useMemo(() => {
    const potExpenses: PotExpense[] = expenses.map((exp) => ({
      id: exp.id,
      potId: potId || '',
      description: exp.memo || 'Expense',
      amount: exp.amount,
      paidBy: exp.paidBy,
      createdAt: new Date(exp.date).getTime(),
      split: exp.split,
    }));

    const potMembers = members.map((m) => ({
      id: m.id,
      name: m.name,
      address: undefined,
    }));

    return {
      id: potId || 'temp',
      name: 'Pot',
      type: 'expense' as const,
      baseCurrency: normalizedBaseCurrency as Pot['baseCurrency'],
      mode: 'casual' as const,
      members: potMembers,
      expenses: potExpenses,
      history: [],
      budgetEnabled: false,
      checkpointEnabled: true,
      archived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as unknown as Pot;
  }, [expenses, members, potId, normalizedBaseCurrency]);

  const computedBalances = useMemo(() => computeBalances(potForCalc), [potForCalc]);
  const settlementSuggestions = useMemo(() => suggestSettlements(computedBalances), [computedBalances]);
  const netBalance = getMemberBalance(computedBalances, currentUserId);

  const budgetPercentage = budget ? Math.min((totalExpenses / budget) * 100, 100) : 0;
  const budgetRemaining = budget ? Math.max(budget - totalExpenses, 0) : 0;
  const isOverBudget = budget ? totalExpenses > budget : false;

  const totalOutstanding = useMemo(() => {
    const raw = computedBalances.reduce(
      (sum, balance) => (balance.net > settleThreshold ? sum + balance.net : sum),
      0
    );
    return raw > settleThreshold ? raw : 0;
  }, [computedBalances, settleThreshold]);

  const balances = useMemo(
    () =>
      computedBalances
        .filter((b) => b.memberId !== currentUserId && Math.abs(b.net) > settleThreshold)
        .map((b) => {
          const member = members.find((m) => m.id === b.memberId);
          if (!member) return null;
          return { member, balance: b.net };
        })
        .filter(Boolean) as { member: Member; balance: number }[],
    [computedBalances, currentUserId, members, settleThreshold]
  );

  const canSettle = useMemo(
    () =>
      expenses.length > 0 &&
      (balances.some((b) => Math.abs(b.balance) > settleThreshold) ||
        settlementSuggestions.length > 0),
    [expenses.length, balances, settlementSuggestions.length, settleThreshold]
  );

  return {
    normalizedBaseCurrency,
    settleThreshold,
    totalExpenses,
    computedBalances,
    settlementSuggestions,
    netBalance,
    budgetPercentage,
    budgetRemaining,
    isOverBudget,
    totalOutstanding,
    balances,
    canSettle,
  };
}
