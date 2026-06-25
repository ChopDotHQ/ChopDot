/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { createAppChapter, addExpense, addMember, refreshLegs } from '../../chapter/chapterEngine';
import {
  applyFirmaWebhookClaim,
  buildFirmaWebhookFixture,
  parseFirmaWebhookPayload,
  verifyFirmaWebhookSignature,
} from './firmaWebhookClaim';
import { buildFirmaMemo, parseFirmaMemo } from './adapters/FirmaHandoffAdapter';
import { firmaHandoffAdapter } from './adapters/FirmaHandoffAdapter';
import { twintHandoffAdapter } from './adapters/TwintHandoffAdapter';

describe('FirmaHandoffAdapter', () => {
  it('builds memo with leg pot and chapter refs', () => {
    const memo = buildFirmaMemo({ legId: 'leg_1', potId: 'pot_1', chapterId: 'ch_1' });
    expect(parseFirmaMemo(memo)).toEqual({
      legId: 'leg_1',
      potId: 'pot_1',
      chapterId: 'ch_1',
    });
  });

  it('returns firma handoff with deep link', () => {
    const result = firmaHandoffAdapter.handoff({
      leg: {
        id: 'leg_1',
        fromMemberId: 'alice',
        toMemberId: 'owner',
        fromName: 'Alice',
        toName: 'You',
        amount: 30,
        currency: 'CHF',
      },
      sessionRef: 'leg_1',
      potId: 'pot_1',
      chapterId: 'ch_1',
    });

    expect(result.railId).toBe('firma');
    expect(result.deepLinkHref).toContain('firma.cash');
    expect(result.waitingMessage).toBeTruthy();
  });
});

describe('TwintHandoffAdapter', () => {
  it('returns sms link when phone provided', () => {
    const result = twintHandoffAdapter.handoff({
      leg: {
        id: 'leg_1',
        fromMemberId: 'alice',
        toMemberId: 'owner',
        fromName: 'Alice',
        toName: 'You',
        amount: 30,
        currency: 'CHF',
      },
      sessionRef: 'leg_1',
      counterpartyPhone: '+41791234567',
    });

    expect(result.smsHref).toContain('sms:');
  });
});

describe('applyFirmaWebhookClaim', () => {
  function chapterWithDinnerSplit() {
    let chapter = createAppChapter({
      name: 'Friday Crew',
      currency: 'CHF',
      organizerMemberId: 'owner',
      organizerName: 'You',
      potId: 'pot_1',
    });
    chapter = addMember(chapter, { name: 'Alice', memberId: 'alice' });
    chapter = addMember(chapter, { name: 'Bob', memberId: 'bob' });
    chapter = addMember(chapter, { name: 'Charlie', memberId: 'charlie' });
    chapter = addExpense(chapter, {
      paidByMemberId: 'owner',
      draft: { amount: 120, memo: 'Dinner', splitCount: 4 },
      splitMemberIds: chapter.members.map((member) => member.id),
      source: 'spend_card',
    });
    return refreshLegs(chapter);
  }

  it('marks matching leg claimed from webhook payload', () => {
    const chapter = chapterWithDinnerSplit();
    const openLeg = chapter.legs.find((leg) => leg.fromMemberId === 'alice' && leg.state === 'open');
    expect(openLeg).toBeTruthy();

    const payload = buildFirmaWebhookFixture({
      legId: openLeg!.id,
      potId: 'pot_1',
      chapterId: chapter.id,
      amount: openLeg!.amount,
      currency: openLeg!.currency,
    });

    const result = applyFirmaWebhookClaim(chapter, {
      payload,
      deliveryId: 'delivery_1',
    });

    expect(result.status).toBe('claimed');
    if (result.status === 'claimed') {
      const updatedLeg = result.chapter.legs.find((leg) => leg.id === openLeg!.id);
      expect(updatedLeg?.state).toBe('claimed');
    }
  });

  it('rejects amount mismatch', () => {
    const chapter = chapterWithDinnerSplit();
    const openLeg = chapter.legs.find((leg) => leg.fromMemberId === 'alice' && leg.state === 'open');
    expect(openLeg).toBeTruthy();

    const payload = buildFirmaWebhookFixture({
      legId: openLeg!.id,
      potId: 'pot_1',
      chapterId: chapter.id,
      amount: openLeg!.amount + 5,
      currency: openLeg!.currency,
    });

    const result = applyFirmaWebhookClaim(chapter, { payload, deliveryId: 'delivery_2' });
    expect(result.status).toBe('error');
  });
});

describe('verifyFirmaWebhookSignature', () => {
  it('validates hmac signature', async () => {
    const body = JSON.stringify({ type: 'payment.settled' });
    const secret = 'test-secret';

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const signature = Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

    const valid = await verifyFirmaWebhookSignature(body, signature, secret);
    expect(valid).toBe(true);
  });
});

describe('parseFirmaWebhookPayload', () => {
  it('parses settled payload', () => {
    const payload = buildFirmaWebhookFixture({
      legId: 'leg_1',
      potId: 'pot_1',
      chapterId: 'ch_1',
      amount: 10,
      currency: 'CHF',
    });
    expect(parseFirmaWebhookPayload(payload)?.type).toBe('payment.settled');
  });
});
