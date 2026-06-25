import { addExpense, buildPotStatus } from '../../chapter/chapterEngine';
import type { ChapterDocument, SettlementLeg, SpendCardConfig } from '../../chapter/types';
import type { SpendSession } from './types';

export type CommitSpendSessionResult = {
  chapter: ChapterDocument;
  expenseId: string;
  openLegs: SettlementLeg[];
};

function upsertSpendCardRecentParticipants(
  chapter: ChapterDocument,
  spendCardId: string,
  participantIds: string[],
  settlementPreference: SpendCardConfig['settlementPreference'] = 'twint',
): ChapterDocument {
  const spendCards = chapter.spendCards ?? [];
  const index = spendCards.findIndex((card) => card.id === spendCardId);

  if (index === -1) {
    const newCard: SpendCardConfig = {
      id: spendCardId,
      label: chapter.name,
      recentParticipantIds: participantIds,
      settlementPreference,
      defaultSplitRule: 'equal',
    };
    return {
      ...chapter,
      spendCards: [...spendCards, newCard],
    };
  }

  const updatedCards = spendCards.map((card, cardIndex) =>
    cardIndex === index
      ? {
          ...card,
          recentParticipantIds: participantIds,
          settlementPreference,
        }
      : card,
  );

  return {
    ...chapter,
    spendCards: updatedCards,
  };
}

export function commitSpendSession(
  chapter: ChapterDocument,
  session: SpendSession,
): CommitSpendSessionResult {
  if (session.status === 'committed') {
    throw new Error('Spend session already committed');
  }

  const existingExpense = chapter.expenses.find((expense) => expense.sourceRef === session.id);
  if (existingExpense) {
    throw new Error('Spend session already committed');
  }

  if (session.amount <= 0) {
    throw new Error('Amount must be greater than zero');
  }

  if (session.participantIds.length === 0) {
    throw new Error('At least one participant required');
  }

  let next = addExpense(chapter, {
    paidByMemberId: session.payerMemberId,
    draft: {
      amount: session.amount,
      memo: session.memo,
      splitCount: session.participantIds.length,
    },
    splitMemberIds: session.participantIds,
    source: session.receiptItems?.length
      ? 'receipt_vision'
      : session.paymentEvidence
        ? 'qr'
        : 'spend_card',
    sourceRef: session.id,
    evidenceRefs: session.paymentEvidence ? [session.paymentEvidence] : undefined,
    receiptItems: session.receiptItems?.length ? session.receiptItems : undefined,
  });

  next = upsertSpendCardRecentParticipants(
    next,
    session.spendCardId,
    session.participantIds,
    session.settlementRail === 'asset_hub' ? 'asset_hub' : session.settlementRail ?? 'twint',
  );

  const expense = next.expenses.find((item) => item.sourceRef === session.id);
  if (!expense) {
    throw new Error('Failed to create expense from spend session');
  }

  const status = buildPotStatus(next);

  return {
    chapter: next,
    expenseId: expense.id,
    openLegs: status.legs,
  };
}
