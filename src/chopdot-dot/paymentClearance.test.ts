import { describe, expect, it } from 'vitest';
import { classifyPaymentClearance } from './paymentClearance';

describe('payment clearance model', () => {
  it('treats self-reported payment as a claim that still needs receipt proof', () => {
    const decision = classifyPaymentClearance({
      source: 'self_report',
      lifecycle: 'submitted',
      subjectKind: 'expense_leg',
    });

    expect(decision).toMatchObject({
      state: 'claimed',
      clearsPayment: false,
      requiresHumanConfirmation: true,
      userLabel: 'Marked paid',
    });
  });

  it('clears a payment when the receiver confirms money arrived', () => {
    const decision = classifyPaymentClearance({
      source: 'receiver_confirmation',
      lifecycle: 'confirmed_by_receiver',
      subjectKind: 'contribution',
    });

    expect(decision).toMatchObject({
      state: 'received',
      clearsPayment: true,
      requiresHumanConfirmation: false,
      closeoutEffect: 'chapter_rule_check',
    });
  });

  it('clears a payment when finalized rail evidence verifies recipient and amount', () => {
    const decision = classifyPaymentClearance({
      source: 'asset_hub_transfer',
      lifecycle: 'finalized',
      subjectKind: 'contribution',
      amountMatches: true,
      expectedRecipientMatched: true,
    });

    expect(decision).toMatchObject({
      state: 'received',
      clearsPayment: true,
      requiresHumanConfirmation: false,
      userLabel: 'Received',
    });
  });

  it('does not clear a payment when a finalized tx lacks recipient or amount proof', () => {
    const decision = classifyPaymentClearance({
      source: 'asset_hub_transfer',
      lifecycle: 'finalized',
      subjectKind: 'contribution',
      amountMatches: true,
      expectedRecipientMatched: false,
    });

    expect(decision).toMatchObject({
      state: 'claimed',
      clearsPayment: false,
      requiresHumanConfirmation: true,
      userLabel: 'Payment evidence found',
    });
  });

  it('treats escrow deposit as held value, not received value', () => {
    const decision = classifyPaymentClearance({
      source: 'escrow',
      lifecycle: 'deposited',
      subjectKind: 'release',
      amountMatches: true,
      expectedRecipientMatched: true,
    });

    expect(decision).toMatchObject({
      state: 'held',
      clearsPayment: false,
      requiresHumanConfirmation: false,
      userLabel: 'Held',
    });
  });

  it('clears a release when escrow release verifies expected recipient and amount', () => {
    const decision = classifyPaymentClearance({
      source: 'escrow',
      lifecycle: 'released',
      subjectKind: 'release',
      amountMatches: true,
      expectedRecipientMatched: true,
    });

    expect(decision).toMatchObject({
      state: 'released',
      clearsPayment: true,
      requiresHumanConfirmation: false,
      closeoutEffect: 'chapter_rule_check',
      userLabel: 'Released',
    });
  });

  it('keeps failed rail movement from becoming a hidden success', () => {
    const decision = classifyPaymentClearance({
      source: 'coinage',
      lifecycle: 'timeout',
      subjectKind: 'expense_leg',
      amountMatches: true,
      expectedRecipientMatched: true,
    });

    expect(decision).toMatchObject({
      state: 'failed',
      clearsPayment: false,
      requiresHumanConfirmation: false,
      userLabel: 'Payment did not go through',
    });
  });
});
