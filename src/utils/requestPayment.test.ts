import { describe, expect, it } from 'vitest';

import {
  buildPaymentRequestNotificationMessage,
  buildPaymentRequestText,
  formatRequestAmount,
  inferRequestCurrency,
} from './requestPayment';

describe('requestPayment', () => {
  it('formats DOT requests with currency-aware totals and breakdowns', () => {
    const person = {
      id: 'alice',
      name: 'Alice',
      totalAmount: 0.541667,
      breakdown: [{ potName: 'Polkadot House', amount: 0.541667, currency: 'DOT' }],
    };

    expect(inferRequestCurrency(person)).toBe('DOT');
    expect(formatRequestAmount(person.totalAmount, 'DOT')).toBe('0.541667 DOT');
    expect(buildPaymentRequestText(person, 'Please settle today')).toContain('Amount: 0.541667 DOT');
    expect(buildPaymentRequestText(person, 'Please settle today')).toContain('Polkadot House (0.541667 DOT)');
  });

  it('avoids inventing a fake aggregate currency when a person owes across mixed pots', () => {
    const person = {
      id: 'bob',
      name: 'Bob',
      totalAmount: 42.5,
      breakdown: [
        { potName: 'Trip', amount: 30, currency: 'USD' },
        { potName: 'Node Ops', amount: 12.5, currency: 'USDC' },
      ],
    };

    expect(inferRequestCurrency(person)).toBeNull();
    expect(buildPaymentRequestText(person, '')).toContain('Amount: See pot breakdown below');
    expect(buildPaymentRequestNotificationMessage(person, '', 'clipboard')).toContain('Trip ($30.00), Node Ops (12.50 USDC)');
  });
});
