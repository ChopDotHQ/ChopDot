import { describe, expect, it } from 'vitest';

import { getSettlementStatusCopy } from './SettleHome';

describe('getSettlementStatusCopy', () => {
  it('explains that pending tracked settlement has not sent payment yet', () => {
    expect(getSettlementStatusCopy('pending')).toEqual({
      label: 'Pending',
      title: 'Not started yet',
      body: 'No payment has been sent from this tracked settlement yet.',
    });
  });

  it('keeps in-flight state separate from confirmation', () => {
    const copy = getSettlementStatusCopy('in_flight', 'Approve the request in your wallet.');

    expect(copy.label).toBe('In progress');
    expect(copy.body).toBe('Approve the request in your wallet.');
    expect(copy.title).not.toContain('confirmed');
  });

  it('does not treat payment evidence as final confirmation', () => {
    const copy = getSettlementStatusCopy('confirmation_required');

    expect(copy.label).toBe('Waiting for confirmation');
    expect(copy.body).toContain('not fully confirmed yet');
  });

  it('shows failed settlement as an action-needed state', () => {
    const copy = getSettlementStatusCopy('failed', 'Wallet approval was cancelled.');

    expect(copy.label).toBe('Needs attention');
    expect(copy.title).toBe('Payment did not finish');
    expect(copy.body).toBe('Wallet approval was cancelled.');
  });
});
