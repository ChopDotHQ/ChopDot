import { describe, expect, it } from 'vitest';
import {
  buildConfirmShareText,
  buildPayShareText,
  encodeCaptureUrl,
} from './QRPayloadCodec';

describe('QRPayloadCodec', () => {
  it('encodes spend, pay, and confirm links without exposing stack language', () => {
    expect(encodeCaptureUrl('spend', 'token with spaces', 'https://app.chopdot.test')).toBe(
      'https://app.chopdot.test/spend?t=token%20with%20spaces',
    );
    expect(encodeCaptureUrl('pay', 'pay_token', 'https://app.chopdot.test')).toBe(
      'https://app.chopdot.test/pay?t=pay_token',
    );
    expect(encodeCaptureUrl('confirm', 'confirm_token', 'https://app.chopdot.test')).toBe(
      'https://app.chopdot.test/confirm?t=confirm_token',
    );
  });

  it('builds plain-English pay and confirm share text', () => {
    const payText = buildPayShareText({
      amount: 40,
      currency: 'CHF',
      counterpartyName: 'Mina',
      url: 'https://app.chopdot.test/pay?t=pay_token',
    });
    expect(payText).toContain('Your share: 40.00 CHF');
    expect(payText).toContain('tap to pay Mina');
    expect(payText).toContain('/pay?t=pay_token');
    expect(payText).not.toMatch(/kernel|adapter|webhook|statement store|supabase/i);

    const confirmText = buildConfirmShareText({
      payerName: 'Leo',
      amount: 40,
      currency: 'CHF',
      url: 'https://app.chopdot.test/confirm?t=confirm_token',
    });
    expect(confirmText).toContain('Leo marked 40.00 CHF sent');
    expect(confirmText).toContain('tap to confirm you received it');
    expect(confirmText).toContain('/confirm?t=confirm_token');
    expect(confirmText).not.toMatch(/kernel|adapter|webhook|statement store|supabase/i);
  });
});
