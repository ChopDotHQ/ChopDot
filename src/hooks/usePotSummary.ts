import { useMemo } from 'react';
import type { NormalizedExpense, NormalizedMember } from './usePotDataMerge';

interface CheckpointConfirmation {
  confirmed: boolean;
  confirmedAt?: string;
}

interface UsePotSummaryOptions {
  expenses: NormalizedExpense[];
  members: NormalizedMember[];
  currentUserId: string;
  budget?: number;
  contributions: Array<{ memberId: string; amount: number }>;
  checkpointConfirmations?: Map<string, CheckpointConfirmation> | Record<string, CheckpointConfirmation>;
}

export function usePotSummary({
  expenses,
  members,
  currentUserId,
  budget,
  contributions,
  checkpointConfirmations,
}: UsePotSummaryOptions) {
  const myExpenses = expenses
    .filter((e) => e.paidBy === currentUserId)
    .reduce((sum, e) => sum + e.amount, 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const myShare = expenses.reduce((sum, e) => {
    const share = (e.split ?? []).find((s) => s.memberId === currentUserId);
    return sum + (share?.amount || 0);
  }, 0);

  const totalContributed = contributions.reduce((sum, c) => sum + c.amount, 0);

  const quickPicks = useMemo(() => {
    type PickKey = string;
    const stats = new Map<PickKey, { label: string; amount: number; participantIds?: string[]; count: number; lastTs: number }>();
    const memberIdSet = new Set(members.map((m) => m.id));

    [...expenses].reverse().forEach((e) => {
      const label = (e.memo || '').trim();
      if (label.length === 0) return;
      const participantIds = (e.split ?? [])
        .filter((s) => s.amount > 0 && memberIdSet.has(s.memberId))
        .map((s) => s.memberId)
        .sort();
      const key = `${label.toLowerCase()}|${participantIds.join(',')}` as PickKey;
      const existing = stats.get(key);
      const ts = e.date ? new Date(e.date).getTime() : Date.now();
      if (existing) {
        existing.count += 1;
        if (ts > existing.lastTs) {
          existing.amount = e.amount;
          existing.lastTs = ts;
        }
      } else {
        stats.set(key, { label, amount: e.amount, participantIds: participantIds.length > 0 ? participantIds : undefined, count: 1, lastTs: ts });
      }
    });

    return Array.from(stats.values())
      .sort((a, b) => (b.lastTs !== a.lastTs ? b.lastTs - a.lastTs : b.count - a.count))
      .slice(0, 8)
      .map((r) => ({ label: r.label, amount: r.amount, participantIds: r.participantIds }));
  }, [expenses, members]);

  const confirmationsArray: CheckpointConfirmation[] = checkpointConfirmations
    ? (checkpointConfirmations instanceof Map
      ? Array.from(checkpointConfirmations.values())
      : Object.values(checkpointConfirmations as Record<string, CheckpointConfirmation>))
    : [];
  const confirmedCount = confirmationsArray.filter(c => c.confirmed).length;
  const totalCount = members.length;

  return {
    myExpenses,
    totalExpenses,
    myShare,
    net: myExpenses - myShare,
    totalContributed,
    yieldEarned: 0 - totalContributed,
    budgetPercentage: budget ? Math.min((totalExpenses / budget) * 100, 100) : 0,
    budgetRemaining: budget ? Math.max(budget - totalExpenses, 0) : 0,
    isOverBudget: budget ? totalExpenses > budget : false,
    quickPicks,
    confirmedCount,
    totalCount,
  };
}
