import type { SpendSession } from './types';

const DEFAULT_TTL_MS = 30 * 60 * 1000;

function nowIso(): string {
  return new Date().toISOString();
}

function newSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export class SpendSessionService {
  createDraft(input: {
    spendCardId: string;
    potId: string;
    payerMemberId: string;
    participantIds: string[];
    amount: number;
    currency: string;
    memo?: string;
    paymentEvidence?: SpendSession['paymentEvidence'];
    receiptItems?: SpendSession['receiptItems'];
    settlementRail?: SpendSession['settlementRail'];
    ttlMs?: number;
  }): SpendSession {
    const createdAt = nowIso();
    const expiresAt = new Date(Date.now() + (input.ttlMs ?? DEFAULT_TTL_MS)).toISOString();

    return {
      id: newSessionId(),
      spendCardId: input.spendCardId,
      potId: input.potId,
      payerMemberId: input.payerMemberId,
      participantIds: input.participantIds,
      amount: input.amount,
      currency: input.currency,
      memo: input.memo ?? 'Spend',
      paymentEvidence: input.paymentEvidence,
      receiptItems: input.receiptItems ?? [],
      settlementRail: input.settlementRail ?? 'twint',
      railStatus: 'ready_to_pay',
      status: 'draft',
      createdAt,
      expiresAt,
    };
  }

  updateDraft(
    session: SpendSession,
    updates: Partial<
      Pick<SpendSession, 'amount' | 'memo' | 'participantIds' | 'paymentEvidence' | 'receiptItems' | 'settlementRail' | 'railStatus'>
    >,
  ): SpendSession {
    if (session.status !== 'draft') {
      throw new Error('Only draft sessions can be updated');
    }

    if (this.isExpired(session)) {
      throw new Error('Spend session expired');
    }

    return {
      ...session,
      amount: updates.amount ?? session.amount,
      memo: updates.memo ?? session.memo,
      participantIds: updates.participantIds ?? session.participantIds,
      paymentEvidence: updates.paymentEvidence ?? session.paymentEvidence,
      receiptItems: updates.receiptItems ?? session.receiptItems,
      settlementRail: updates.settlementRail ?? session.settlementRail,
      railStatus: updates.railStatus ?? session.railStatus,
    };
  }

  markHandoffStarted(session: SpendSession): SpendSession {
    return {
      ...session,
      status: 'handoff_started',
      railStatus: 'handoff_started',
    };
  }

  markCommitted(session: SpendSession, expenseId: string): SpendSession {
    return {
      ...session,
      status: 'committed',
      committedExpenseId: expenseId,
    };
  }

  isExpired(session: SpendSession): boolean {
    return Date.now() >= new Date(session.expiresAt).getTime();
  }
}

export const spendSessionService = new SpendSessionService();
