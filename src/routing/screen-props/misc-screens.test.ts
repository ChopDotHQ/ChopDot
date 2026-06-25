import { describe, expect, it } from 'vitest';

import { buildRequestPaymentNotification } from './misc-screens';

describe('request payment routing helpers', () => {
  it('records DOT payment requests without converting the amount to dollars', () => {
    const notification = buildRequestPaymentNotification({
      person: {
        id: 'leo',
        name: 'Leo',
        totalAmount: 0.541667,
        breakdown: [{ potName: 'Polkadot House', amount: 0.541667, currency: 'DOT' }],
      },
      message: '',
      deliveryMethod: 'in-app',
      timestamp: new Date('2026-06-20T10:00:00.000Z'),
    });

    expect(notification.id).toBe('1781949600000-leo');
    expect(notification.message).toBe('Requested 0.541667 DOT from Leo');
    expect(notification.message).not.toContain('$');
  });

  it('keeps mixed-currency requests as a pot breakdown instead of inventing one total currency', () => {
    const notification = buildRequestPaymentNotification({
      person: {
        id: 'nina',
        name: 'Nina',
        totalAmount: 42.5,
        breakdown: [
          { potName: 'Dinner', amount: 30, currency: 'USD' },
          { potName: 'Community pot', amount: 12.5, currency: 'USDC' },
        ],
      },
      message: '',
      deliveryMethod: 'clipboard',
      timestamp: new Date('2026-06-20T10:01:00.000Z'),
    });

    expect(notification.message).toBe(
      'Requested payment from Nina via clipboard: Dinner ($30.00), Community pot (12.50 USDC)',
    );
    expect(notification.message).not.toContain('$42.50');
  });

  it('uses the sender message when a personal note is provided', () => {
    const notification = buildRequestPaymentNotification({
      person: {
        id: 'omar',
        name: 'Omar',
        totalAmount: 20,
        breakdown: [{ potName: 'Emergency fund', amount: 20, currency: 'USD' }],
      },
      message: 'Can you send this today?',
      deliveryMethod: 'share',
      timestamp: new Date('2026-06-20T10:02:00.000Z'),
    });

    expect(notification.message).toBe('Can you send this today?');
  });
});
