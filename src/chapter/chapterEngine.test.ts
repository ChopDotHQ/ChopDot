import { describe, expect, it, vi } from 'vitest';
import {
  addExpense,
  addMember,
  buildPotStatus,
  closeChapter,
  confirmLeg,
  createChapter,
  markLegPaid,
  refreshLegs,
} from './chapterEngine';
import { parseExpenseMessage } from './parseExpense';

function baseChapter() {
  let chapter = createChapter({
    name: 'Summer trip',
    currency: 'EUR',
    telegramChatId: '-1001',
    organizer: { name: 'Alex', telegramUserId: 'tg_alex' },
  });
  chapter = addMember(chapter, { name: 'Sam', telegramUserId: 'tg_sam' });
  chapter = addMember(chapter, { name: 'Jordan', telegramUserId: 'tg_jordan' });
  return chapter;
}

describe('parseExpenseMessage', () => {
  it('parses natural language amount and memo', () => {
    expect(parseExpenseMessage('I paid €120 for dinner')).toEqual({
      amount: 120,
      memo: 'for dinner',
      splitCount: undefined,
    });
  });

  it('parses split count', () => {
    expect(parseExpenseMessage('paid 90 groceries split 3 ways')).toEqual({
      amount: 90,
      memo: 'groceries',
      splitCount: 3,
    });
  });
});

describe('chapterEngine L0 loop', () => {
  it('tracks open legs after expense', () => {
    let chapter = baseChapter();
    const draft = parseExpenseMessage('I paid 120 dinner');
    expect(draft).not.toBeNull();
    chapter = addExpense(chapter, {
      paidByMemberId: 'alex',
      draft: draft!,
    });

    const status = buildPotStatus(chapter);
    expect(status.openLegCount).toBeGreaterThan(0);
    expect(status.blockers.some((b) => b.includes('→'))).toBe(true);
  });

  it('requires confirm after claimed paid', () => {
    let chapter = baseChapter();
    chapter = addExpense(chapter, {
      paidByMemberId: 'alex',
      draft: { amount: 120, memo: 'Airbnb', splitCount: 3 },
    });

    const debtorLeg = buildPotStatus(chapter).legs.find((l) => l.fromName === 'Sam');
    expect(debtorLeg).toBeDefined();

    chapter = markLegPaid(chapter, { payerMemberId: 'sam' });
    expect(buildPotStatus(chapter).openLegCount).toBeGreaterThan(0);

    chapter = confirmLeg(chapter, { creditorMemberId: 'alex' });
    const status = buildPotStatus(chapter);
    expect(status.legs.find((l) => l.fromName === 'Sam')).toBeUndefined();
  });

  it('blocks close until all legs confirmed', () => {
    let chapter = baseChapter();
    chapter = addExpense(chapter, {
      paidByMemberId: 'alex',
      draft: { amount: 90, memo: 'Dinner', splitCount: 3 },
    });

    expect(() => closeChapter(chapter)).toThrow(/open leg/i);

    let current = refreshLegs(chapter);
    while (buildPotStatus(current).openLegCount > 0) {
      const leg = buildPotStatus(current).legs[0];
      if (!leg) {
        break;
      }
      current = markLegPaid(current, { payerMemberId: leg.fromMemberId, legId: leg.id });
      current = confirmLeg(current, { creditorMemberId: leg.toMemberId, legId: leg.id });
      current = refreshLegs(current);
    }

    current = closeChapter(current);
    expect(current.chapterState).toBe('closed');
  });

  it('keeps expense ids unique during rapid capture', () => {
    const dateNow = vi.spyOn(Date, 'now').mockReturnValue(1_780_000_000_000);
    try {
      let chapter = baseChapter();
      chapter = addExpense(chapter, {
        paidByMemberId: 'alex',
        draft: { amount: 90, memo: 'Cabin', splitCount: 3 },
      });
      chapter = addExpense(chapter, {
        paidByMemberId: 'sam',
        draft: { amount: 45, memo: 'Dinner', splitCount: 3 },
      });

      const ids = chapter.expenses.map((expense) => expense.id);
      expect(new Set(ids).size).toBe(ids.length);
    } finally {
      dateNow.mockRestore();
    }
  });

  it('keeps checkout payment evidence separate from leg confirmation', () => {
    let chapter = baseChapter();
    chapter = addExpense(chapter, {
      paidByMemberId: 'alex',
      draft: { amount: 90, memo: 'Cafe Zola checkout', splitCount: 3 },
      source: 'qr',
      sourceRef: 'sess_checkout_1',
      evidenceRefs: [
        {
          id: 'payev_1',
          kind: 'checkout_request',
          source: 't3rminal',
          status: 'settled',
          capturedAt: new Date().toISOString(),
          display: 'Cafe Zola checkout',
          rawHash: 'hash_1',
          amount: 90,
          currency: 'EUR',
          terminalId: 'term-1',
        },
      ],
    });

    const status = buildPotStatus(chapter);
    expect(chapter.expenses[0]?.evidenceRefs?.[0]?.status).toBe('settled');
    expect(status.openLegCount).toBeGreaterThan(0);
    expect(status.legs.every((leg) => leg.state === 'open')).toBe(true);
  });
});
