import { useMemo } from 'react';
import { computeBalances, suggestSettlements, getMemberBalance } from '../services/settlement/calc';
import type { Pot, Expense as PotExpense } from '../schema/pot';
import { normalizeCurrency } from '../utils/currencyFormat';
import { calculatePotSettlements } from '../utils/settlements';
import { applyConfirmedLegAdjustments, type ConfirmedLegAdjustment } from '../utils/confirmedLegAdjustments';

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
  confirmedLegs?: ConfirmedLegAdjustment[];
}

export function usePotBalances({
  expenses,
  members,
  potId,
  baseCurrency,
  currentUserId,
  budget,
  confirmedLegs = [],
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
  const potSettlements = useMemo(
    () =>
      applyConfirmedLegAdjustments(
        calculatePotSettlements(potForCalc as any, currentUserId),
        members,
        {
          currentUserId,
          potName: potForCalc.name,
          baseCurrency: normalizedBaseCurrency,
          confirmedLegs,
        },
      ),
    [potForCalc, currentUserId, members, normalizedBaseCurrency, confirmedLegs]
  );
  const settlementSuggestions = useMemo(() => suggestSettlements(computedBalances), [computedBalances]);
  const legacyNetBalance = getMemberBalance(computedBalances, currentUserId);
  const netBalance = useMemo(() => {
    const owedToYou = potSettlements.owedToYou.reduce((sum, person) => sum + person.totalAmount, 0);
    const youOwe = potSettlements.youOwe.reduce((sum, person) => sum + person.totalAmount, 0);
    const net = owedToYou - youOwe;
    return Number.isFinite(net) ? net : legacyNetBalance;
  }, [legacyNetBalance, potSettlements.owedToYou, potSettlements.youOwe]);

  const budgetPercentage = budget ? Math.min((totalExpenses / budget) * 100, 100) : 0;
  const budgetRemaining = budget ? Math.max(budget - totalExpenses, 0) : 0;
  const isOverBudget = budget ? totalExpenses > budget : false;

  const totalOutstanding = useMemo(() => {
    const raw = [...potSettlements.owedToYou, ...potSettlements.youOwe].reduce(
      (sum, person) => sum + person.totalAmount,
      0
    );
    return raw > settleThreshold ? raw : 0;
  }, [potSettlements.owedToYou, potSettlements.youOwe, settleThreshold]);

  const balances = useMemo(
    () => [
      ...potSettlements.owedToYou.map((person) => {
        const member = members.find((m) => m.id === person.id);
        return member ? { member, balance: person.totalAmount } : null;
      }),
      ...potSettlements.youOwe.map((person) => {
        const member = members.find((m) => m.id === person.id);
        return member ? { member, balance: -person.totalAmount } : null;
      }),
    ].filter(Boolean) as { member: Member; balance: number }[],
    [members, potSettlements.owedToYou, potSettlements.youOwe]
  );

  const canSettle = useMemo(
    () =>
      expenses.length > 0 &&
      (balances.some((b) => Math.abs(b.balance) > settleThreshold) ||
        potSettlements.owedToYou.length > 0 ||
        potSettlements.youOwe.length > 0),
    [expenses.length, balances, potSettlements.owedToYou.length, potSettlements.youOwe.length, settleThreshold]
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
