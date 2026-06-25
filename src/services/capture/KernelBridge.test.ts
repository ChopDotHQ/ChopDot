import { describe, expect, it } from 'vitest';
import { addMember, createAppChapter } from '../../chapter/chapterEngine';
import { commitSpendSession } from './KernelBridge';
import type { SpendSession } from './types';

function baseChapter() {
  let chapter = createAppChapter({
    name: 'Friday Crew',
    currency: 'CHF',
    organizerMemberId: 'alex',
    organizerName: 'Alex',
    potId: 'pot_1',
  });
  chapter = addMember(chapter, { name: 'Sam', memberId: 'sam' });
  chapter = addMember(chapter, { name: 'Jordan', memberId: 'jordan' });
  chapter = addMember(chapter, { name: 'Leo', memberId: 'leo' });
  return chapter;
}

describe('KernelBridge.commitSpendSession', () => {
  it('creates expense and open legs from spend session', () => {
    const chapter = baseChapter();
    const session: SpendSession = {
      id: 'sess_1',
      spendCardId: chapter.spendCards?.[0]?.id ?? 'sc_default',
      potId: 'pot_1',
      payerMemberId: 'alex',
      participantIds: ['alex', 'sam', 'jordan', 'leo'],
      amount: 120,
      currency: 'CHF',
      memo: 'Dinner',
      status: 'draft',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    };

    const result = commitSpendSession(chapter, session);
    expect(result.expenseId).toMatch(/^exp_/);
    expect(result.chapter.expenses).toHaveLength(1);
    expect(result.chapter.expenses[0]?.source).toBe('spend_card');
    expect(result.openLegs.length).toBe(3);
  });

  it('rejects duplicate commit for same session id', () => {
    const chapter = baseChapter();
    const session: SpendSession = {
      id: 'sess_dup',
      spendCardId: chapter.spendCards?.[0]?.id ?? 'sc_default',
      potId: 'pot_1',
      payerMemberId: 'alex',
      participantIds: ['alex', 'sam', 'jordan', 'leo'],
      amount: 80,
      currency: 'CHF',
      memo: 'Lunch',
      status: 'draft',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    };

    const first = commitSpendSession(chapter, session);
    expect(() => commitSpendSession(first.chapter, session)).toThrow(/already committed/i);
  });

  it('attaches checkout evidence without confirming open legs', () => {
    const chapter = baseChapter();
    const session: SpendSession = {
      id: 'sess_checkout',
      spendCardId: chapter.spendCards?.[0]?.id ?? 'sc_default',
      potId: 'pot_1',
      payerMemberId: 'alex',
      participantIds: ['alex', 'sam', 'jordan'],
      amount: 90,
      currency: 'CHF',
      memo: 'Cafe Zola - Lunch',
      paymentEvidence: {
        id: 'payev_1',
        kind: 'checkout_request',
        source: 't3rminal',
        status: 'settled',
        capturedAt: new Date().toISOString(),
        display: 'Cafe Zola · 90.00 CHF',
        rawHash: 'hash_1',
        amount: 90,
        currency: 'CHF',
        merchantName: 'Cafe Zola',
        terminalId: 'term-1',
      },
      status: 'draft',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    };

    const result = commitSpendSession(chapter, session);
    const expense = result.chapter.expenses[0];

    expect(expense?.source).toBe('qr');
    expect(expense?.evidenceRefs).toHaveLength(1);
    expect(expense?.evidenceRefs?.[0]?.display).toBe('Cafe Zola · 90.00 CHF');
    expect(result.openLegs).toHaveLength(2);
    expect(result.openLegs.every((leg) => leg.state === 'open')).toBe(true);
  });

  it('keeps Coinage-style settled evidence separate from member confirmation', () => {
    const chapter = baseChapter();
    const session: SpendSession = {
      id: 'sess_coinage',
      spendCardId: chapter.spendCards?.[0]?.id ?? 'sc_default',
      potId: 'pot_1',
      payerMemberId: 'alex',
      participantIds: ['alex', 'sam', 'jordan'],
      amount: 50,
      currency: 'CHF',
      memo: 'Circle Shop - Snacks',
      paymentEvidence: {
        id: 'payev_coinage',
        kind: 'checkout_request',
        source: 'coinage',
        status: 'settled',
        capturedAt: new Date().toISOString(),
        display: 'Circle Shop · 50.00 CHF',
        rawHash: 'hash_coinage_1',
        amount: 50,
        currency: 'CHF',
        merchantName: 'Circle Shop',
        paymentId: 'coin-1',
      },
      status: 'draft',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    };

    const result = commitSpendSession(chapter, session);
    const expense = result.chapter.expenses[0];

    expect(expense?.source).toBe('qr');
    expect(expense?.evidenceRefs?.[0]?.source).toBe('coinage');
    expect(expense?.evidenceRefs?.[0]?.status).toBe('settled');
    expect(result.openLegs).toHaveLength(2);
    expect(result.openLegs.every((leg) => leg.state === 'open')).toBe(true);
  });

  it('persists receipt checklist capture without confirming payment', () => {
    const chapter = baseChapter();
    const session: SpendSession = {
      id: 'sess_receipt',
      spendCardId: chapter.spendCards?.[0]?.id ?? 'sc_default',
      potId: 'pot_1',
      payerMemberId: 'alex',
      participantIds: ['alex', 'sam', 'jordan'],
      amount: 75,
      currency: 'CHF',
      memo: 'Receipt split',
      receiptItems: [
        { id: 'item_1', label: 'Pasta', amount: 28, assignedMemberIds: ['alex'] },
        { id: 'item_2', label: 'Pizza', amount: 25, assignedMemberIds: ['sam'] },
        { id: 'item_3', label: 'Drinks', amount: 22, assignedMemberIds: ['alex', 'sam', 'jordan'] },
      ],
      settlementRail: 'wise',
      status: 'draft',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    };

    const result = commitSpendSession(chapter, session);
    const expense = result.chapter.expenses[0];
    const spendCard = result.chapter.spendCards?.[0];

    expect(expense?.source).toBe('receipt_vision');
    expect(expense?.receiptItems).toHaveLength(3);
    expect(spendCard?.settlementPreference).toBe('wise');
    expect(result.openLegs).toHaveLength(2);
    expect(result.openLegs.every((leg) => leg.state === 'open')).toBe(true);
  });
});
