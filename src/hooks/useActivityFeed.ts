import { useMemo } from 'react';
import { formatCurrencyAmount } from '../utils/currencyFormat';

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
  attestations: string[] | Array<{ memberId: string; confirmedAt: string }>;
}

interface Contribution {
  id: string;
  memberId: string;
  amount: number;
  date: string;
}

export interface ActivityEvent {
  id: string;
  type: 'expense_added' | 'expense_edited' | 'expense_deleted' | 'attestation' | 'member_joined' | 'contribution' | 'withdrawal';
  timestamp: string;
  description: string;
  actor: string;
  metadata?: {
    amount?: number;
    currency?: string;
    expenseMemo?: string;
  };
}

interface UseActivityFeedParams {
  expenses: Expense[];
  members: Member[];
  contributions: Contribution[];
  baseCurrency: string;
  limit?: number;
}

export function useActivityFeed({
  expenses,
  members,
  contributions,
  baseCurrency,
  limit = 20,
}: UseActivityFeedParams): ActivityEvent[] {
  return useMemo(() => {
    const events: ActivityEvent[] = [];

    expenses.forEach((expense) => {
      const paidByMember = members.find((m) => m.id === expense.paidBy);
      events.push({
        id: `expense-${expense.id}`,
        type: 'expense_added',
        timestamp: expense.date,
        description: `${paidByMember?.name === 'You' ? 'You' : paidByMember?.name} added "${expense.memo}"`,
        actor: paidByMember?.name || 'Unknown',
        metadata: {
          amount: expense.amount,
          currency: expense.currency || baseCurrency,
          expenseMemo: expense.memo,
        },
      });

      expense.attestations.forEach((memberId, index) => {
        const attestor = members.find((m) => m.id === (typeof memberId === 'string' ? memberId : memberId.memberId));
        const attestationDate = new Date(
          new Date(expense.date).getTime() + (index + 1) * 60000
        ).toISOString();
        events.push({
          id: `attestation-${expense.id}-${typeof memberId === 'string' ? memberId : memberId.memberId}`,
          type: 'attestation',
          timestamp: attestationDate,
          description: `${attestor?.name === 'You' ? 'You' : attestor?.name} confirmed "${expense.memo}"`,
          actor: attestor?.name || 'Unknown',
        });
      });
    });

    contributions.forEach((contribution) => {
      const contributor = members.find((m) => m.id === contribution.memberId);
      const isContribution = contribution.amount > 0;
      events.push({
        id: `contribution-${contribution.id}`,
        type: isContribution ? 'contribution' : 'withdrawal',
        timestamp: contribution.date,
        description: isContribution
          ? `${contributor?.name === 'You' ? 'You' : contributor?.name} added ${formatCurrencyAmount(contribution.amount, baseCurrency)}`
          : `${contributor?.name === 'You' ? 'You' : contributor?.name} withdrew ${formatCurrencyAmount(Math.abs(contribution.amount), baseCurrency)}`,
        actor: contributor?.name || 'Unknown',
        metadata: {
          amount: Math.abs(contribution.amount),
          currency: baseCurrency,
        },
      });
    });

    return events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }, [expenses, members, contributions, baseCurrency, limit]);
}
