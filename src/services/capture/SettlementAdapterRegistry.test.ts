import { describe, expect, it } from 'vitest';
import { getSettlementAdapter } from './SettlementAdapterRegistry';

const leg = {
  id: 'leg_1',
  fromMemberId: 'leo',
  toMemberId: 'mina',
  fromName: 'Leo',
  toName: 'Mina',
  amount: 42,
  currency: 'CHF',
};

describe('SettlementAdapterRegistry', () => {
  it('gives bank-like rails a copyable handoff without claiming confirmation', () => {
    const handoff = getSettlementAdapter('revolut').handoff({
      leg,
      sessionRef: 'leg_1',
    });

    expect(handoff.title).toBe('Revolut transfer');
    expect(handoff.statusLabel).toBe('ready to pay');
    expect(handoff.copyText).toContain('42.00 CHF');
    expect(handoff.waitingMessage).toContain('mark the share paid');
  });

  it('keeps Asset Hub and Coinage as evidence-supporting rails', () => {
    const assetHub = getSettlementAdapter('asset_hub').handoff({ leg, sessionRef: 'leg_1' });
    const coinage = getSettlementAdapter('coinage').handoff({ leg, sessionRef: 'leg_1' });

    expect(assetHub.waitingMessage).toContain('support payment evidence');
    expect(coinage.waitingMessage).toContain('support payment evidence');
    expect(assetHub.waitingMessage).toContain('confirmation rules');
    expect(coinage.waitingMessage).toContain('confirmation rules');
  });
});
