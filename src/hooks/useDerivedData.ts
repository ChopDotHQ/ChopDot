import { useMemo } from 'react';
import Decimal from 'decimal.js';
import { calculateSettlements } from '../utils/settlements';
import type { Pot, Settlement, Person, ActivityItem, PotHistory } from '../types/app';
import type { ExpenseSummary } from '../services/data/types';
import type { PersonSettlement, SettlementBreakdown } from '../utils/settlements';
import { usePots } from './usePots';

type PendingExpense = {
  id: string;
  memo: string;
  amount: number;
  currency?: string;
  paidBy: string;
  potName: string;
};

type YouTabInsights = {
  monthlySpending: number;
  topCategory: string;
  topCategoryAmount: number;
  activePots: number;
  totalSettled: number;
  expensesConfirmed: number;
  expensesNeedingConfirmation: number;
  confirmationRate: number;
  settlementsCompleted: number;
  activeGroups: number;
};

type ExistingContact = {
  id: string;
  name: string;
  trustScore: number;
  paymentPreference: string;
  sharedPots: number;
};

type UseDerivedDataParams = {
  pots: Pot[];
  settlements: Settlement[];
  userId?: string;
  currentPot?: Pot | null;
  summaries?: Record<string, ExpenseSummary>; // Optional override; falls back to usePots()
};

export const useDerivedData = ({
  pots,
  settlements,
  userId,
  currentPot,
  summaries: summariesProp,
}: UseDerivedDataParams) => {
  // Fetch summaries directly so they're always up-to-date regardless of prop threading
  const { summaries: fetchedSummaries } = usePots();
  const summaries = summariesProp ?? fetchedSummaries;
  const currentUserId = userId || 'owner';
  const people: Person[] = useMemo(() => {
    const peopleMap = new Map<string, Person>();

    pots.forEach((pot) => {
      pot.members.forEach((member) => {
        if (member.id !== currentUserId && !peopleMap.has(member.id)) {
          peopleMap.set(member.id, {
            id: member.id,
            name: member.name,
            balance: 0,
            trustScore: 95,
            paymentPreference: member.address ? 'DOT' : 'Bank',
            potCount: 0,
          });
        }
        if (member.id !== currentUserId) {
          const existing = peopleMap.get(member.id);
          if (existing && member.address) {
            existing.paymentPreference = 'DOT';
            (existing as unknown as Record<string, unknown>).address = member.address;
          }
        }
      });
    });

    return Array.from(peopleMap.values());
  }, [currentUserId, pots]);

  const balances = useMemo(() => {
    const start = performance.now();
    const result = calculateSettlements(pots, people, currentUserId);
    const time = performance.now() - start;
    if (time > 10) {
      console.warn(`⏱️ [Performance] balances calculation: ${time.toFixed(2)}ms`);
    }
    return result;
  }, [currentUserId, pots, people]);

  // When Supabase pots have no expense data yet (normalized table, not in metadata),
  // fall back to computing settlements from ExpenseSummary data.
  const summaryBalances = useMemo(() => {
    if (balances.youOwe.length > 0 || balances.owedToYou.length > 0) return null;
    if (!summaries || Object.keys(summaries).length === 0) return null;

    const youOweMap = new Map<string, { settlement: PersonSettlement; total: Decimal }>();
    const owedToYouMap = new Map<string, { settlement: PersonSettlement; total: Decimal }>();

    for (const [potId, summary] of Object.entries(summaries)) {
      const pot = pots.find((p) => p.id === potId);
      if (!pot || pot.archived) continue;

      const net = new Decimal(summary.myExpenses).minus(summary.myShare);
      const currency = pot.baseCurrency || 'USD';
      const threshold = currency === 'DOT' ? new Decimal('0.000001') : new Decimal('0.01');
      if (net.abs().lessThan(threshold)) continue;

      const otherMembers = pot.members.filter((m) => m.id !== currentUserId);
      if (otherMembers.length === 0) continue;

      const perMember = net.abs().dividedBy(otherMembers.length);
      const breakdown: SettlementBreakdown = {
        potName: pot.name,
        amount: perMember.toNumber(),
        currency,
      };

      for (const member of otherMembers) {
        const targetMap = net.lessThan(0) ? youOweMap : owedToYouMap;
        const existing = targetMap.get(member.id);
        if (existing) {
          existing.total = existing.total.plus(perMember);
          existing.settlement.totalAmount = existing.total.toNumber();
          existing.settlement.breakdown.push(breakdown);
        } else {
          const settlement: PersonSettlement = {
            id: member.id,
            name: member.name,
            totalAmount: perMember.toNumber(),
            breakdown: [{ ...breakdown }],
            trustScore: 95,
            paymentPreference: member.address ? 'DOT' : 'Bank',
            address: member.address,
          };
          targetMap.set(member.id, { settlement, total: perMember });
        }
      }
    }

    return {
      youOwe: Array.from(youOweMap.values()).map((e) => ({ ...e.settlement, totalAmount: e.total.toNumber() })),
      owedToYou: Array.from(owedToYouMap.values()).map((e) => ({ ...e.settlement, totalAmount: e.total.toNumber() })),
      byPerson: new Map<string, string>(),
    };
  }, [balances, summaries, pots, currentUserId]);

  const effectiveBalances = summaryBalances ?? balances;

  const pendingExpenses: PendingExpense[] = useMemo(() => {
    void currentUserId;
    return [];
  }, [currentUserId]);

  const activities: ActivityItem[] = useMemo(() => {
    const start = performance.now();
    const items: ActivityItem[] = [];

    const personNames = new Map<string, string>();
    pots.forEach((pot) => {
      pot.members.forEach((m) => {
        if (!personNames.has(m.id)) personNames.set(m.id, m.name);
      });
    });

    pots.forEach((pot) => {
      if (pot.createdAt) {
        items.push({
          id: `pot-created-${pot.id}`,
          type: 'pot_created',
          timestamp: pot.createdAt,
          title: `Created ${pot.name}`,
          subtitle: pot.type === 'savings' ? 'Savings pot' : 'Expense pot',
          amount: undefined,
        });
      }
    });

    pots.forEach((pot) => {
      pot.expenses.forEach((expense) => {
        items.push({
          id: expense.id,
          type: 'expense',
          timestamp: expense.date,
          title: expense.memo,
          subtitle: `${pot.name} • Paid by ${expense.paidBy === currentUserId ? 'You' : expense.paidBy}`,
          amount: String(expense.amount),
        });
      });
    });

    pots.forEach((pot) => {
      (pot.history || []).forEach((h: PotHistory) => {
        if (h.type !== 'onchain_settlement') return;
        const fromName =
          pot.members.find((m) => m.id === h.fromMemberId)?.name || h.fromMemberId;
        const toName = pot.members.find((m) => m.id === h.toMemberId)?.name || h.toMemberId;
        const amountStr = h.amountDot
          ? `${h.amountDot} DOT`
          : h.amountUsdc
            ? `${h.amountUsdc} USDC`
            : '';
        const title = amountStr ? `On-chain settlement ${amountStr}` : 'On-chain settlement';
        items.push({
          id: `history-${pot.id}-${h.id}`,
          type: 'settlement',
          timestamp: new Date(h.when).toISOString(),
          title,
          subtitle: `${pot.name} • ${fromName} → ${toName}`,
          amount: h.amountDot || h.amountUsdc,
        });
      });
    });

    settlements.forEach((s) => {
      const name = personNames.get(s.personId) || s.personId;
      const title = `Settled ${s.currency === 'DOT' ? new Decimal(s.amount).toFixed(6) + ' DOT' : '$' + new Decimal(s.amount).toFixed(2)} with ${name}`;
      items.push({
        id: s.id,
        type: 'settlement',
        timestamp: s.date,
        title,
        subtitle:
          s.potIds && s.potIds.length > 0
            ? s.potIds.map((pid) => pots.find((p) => p.id === pid)?.name || 'Unknown').join(', ')
            : 'All pots',
        amount: s.amount,
      });
    });

    const sorted = items.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    const time = performance.now() - start;
    if (time > 10) {
      console.warn(`⏱️ [Performance] activities calculation: ${time.toFixed(2)}ms (${items.length} items)`);
    }
    return sorted;
  }, [currentUserId, pots, settlements]);

  const totalOwed = effectiveBalances.owedToYou.reduce((sum, p) => sum + Number(p.totalAmount), 0);
  const totalOwing = effectiveBalances.youOwe.reduce((sum, p) => sum + Number(p.totalAmount), 0);

  const { expensesConfirmed, expensesNeedingConfirmation, monthlySpending } = useMemo(() => {
    const allExpenses = pots.flatMap((p) => p.expenses);

    const currentMonthExpenses = allExpenses.filter((e) => {
      const d = new Date(e.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const spending = currentMonthExpenses
      .filter((e) => e.paidBy === currentUserId)
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      expensesConfirmed: 0,
      expensesNeedingConfirmation: 0,
      monthlySpending: spending,
    };
  }, [pots]);

  const youTabInsights: YouTabInsights = useMemo(() => {
    const confirmationRate =
      expensesConfirmed + expensesNeedingConfirmation > 0
        ? Math.round((expensesConfirmed / (expensesConfirmed + expensesNeedingConfirmation)) * 100)
        : 100;

    const activeGroups = pots.filter((p) => p.type === 'expense').length;
    const settlementsCompleted = settlements.length;

    return {
      monthlySpending,
      topCategory: 'Groceries',
      topCategoryAmount: 245.5,
      activePots: activeGroups,
      totalSettled: 1250.0,
      expensesConfirmed,
      expensesNeedingConfirmation,
      confirmationRate,
      settlementsCompleted,
      activeGroups,
    };
  }, [pots, settlements, expensesConfirmed, expensesNeedingConfirmation, monthlySpending]);

  const existingContacts: ExistingContact[] = useMemo(
    () =>
      people.map((person) => ({
        id: person.id,
        name: person.name,
        trustScore: person.trustScore,
        paymentPreference: person.paymentPreference,
        sharedPots: pots.filter((pot) => pot.members.some((member) => member.id === person.id))
          .length,
      })),
    [people, pots],
  );

  const currentMemberIds = useMemo(
    () => currentPot?.members.map((member) => member.id) || [],
    [currentPot],
  );

  return {
    people,
    balances: effectiveBalances,
    pendingExpenses,
    activities,
    totalOwed,
    totalOwing,
    expensesConfirmed,
    expensesNeedingConfirmation,
    monthlySpending,
    youTabInsights,
    existingContacts,
    currentMemberIds,
  };
};
