import { describe, expect, it } from 'vitest';
import { parsePaymentEvidence } from './PaymentEvidenceAdapter';

describe('parsePaymentEvidence', () => {
  it('parses t3rminal-style payment request evidence for checkout capture', () => {
    const result = parsePaymentEvidence(
      'polkadotapp://pay?amount=120&currency=CHF&terminalId=term-001&merchant=Cafe%20Zola&memo=Dinner',
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.evidence.kind).toBe('checkout_request');
    expect(result.evidence.source).toBe('t3rminal');
    expect(result.evidence.status).toBe('observed');
    expect(result.evidence.amount).toBe(120);
    expect(result.evidence.currency).toBe('CHF');
    expect(result.suggestedMemo).toBe('Cafe Zola - Dinner');
    expect(result.notice).toContain('Receiver still confirms');
  });

  it('parses W3S payment links as submitted evidence without confirming receipt', () => {
    const result = parsePaymentEvidence(
      'w3spay://request?amount=72.25&currency=CHF&merchant=Bakery%20Nord&status=submitted&paymentId=w3s-123',
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.evidence.kind).toBe('checkout_request');
    expect(result.evidence.source).toBe('w3spay');
    expect(result.evidence.status).toBe('submitted');
    expect(result.evidence.paymentId).toBe('w3s-123');
    expect(result.notice).toContain('Receiver still confirms');
  });

  it('parses Coinage-style payment links as evidence only', () => {
    const result = parsePaymentEvidence(
      'coinage://payment?amount=50&currency=CHF&merchant=Circle%20Shop&status=settled&paymentId=coin-1',
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.evidence.kind).toBe('checkout_request');
    expect(result.evidence.source).toBe('coinage');
    expect(result.evidence.status).toBe('settled');
    expect(result.evidence.paymentId).toBe('coin-1');
    expect(result.notice).toContain('Receiver still confirms');
  });

  it('parses receipt JSON without turning evidence into confirmation', () => {
    const result = parsePaymentEvidence(
      JSON.stringify({
        type: 't3rminal-receipt',
        receiptId: 'r-1',
        business: { name: 'Market Hall' },
        total: 45.5,
        currency: 'CHF',
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.evidence.kind).toBe('receipt');
    expect(result.evidence.status).toBe('observed');
    expect(result.suggestedAmount).toBe(45.5);
    expect(result.suggestedMemo).toContain('Market Hall');
  });

  it('does not turn failed checkout evidence into usable capture', () => {
    const result = parsePaymentEvidence(
      'w3spay://request?amount=22&currency=CHF&merchant=Kiosk&status=failed',
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('failed');
    expect(result.reason).toContain('failed');
  });

  it('shows interrupted checkout state as a retry/review case', () => {
    const result = parsePaymentEvidence(
      JSON.stringify({
        type: 'w3spay-request',
        merchantName: 'Night Market',
        amount: 18,
        currency: 'CHF',
        status: 'interrupted',
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('interrupted');
    expect(result.reason).toContain('interrupted');
  });

  it('rejects unknown payment states instead of hiding them as success', () => {
    const result = parsePaymentEvidence(
      'w3spay://request?amount=22&currency=CHF&merchant=Kiosk&status=maybe_later',
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('unknown_status');
    expect(result.reason).toContain('does not understand');
  });

  it('rejects unreadable evidence', () => {
    const result = parsePaymentEvidence('just a random note');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('unsupported');
  });
});
