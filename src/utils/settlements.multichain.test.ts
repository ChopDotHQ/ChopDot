import { describe, expect, it } from 'vitest';
import { calculateSettlements, calculatePotSettlements } from './settlements';
import { UNSETTLED_SETTLEMENT_POTS } from '../services/data/seeds/unsettledSettlementPots';

type ChainScenario = {
  network: 'ethereum' | 'polkadot' | 'polygon' | 'tezos' | 'solana';
  currency: 'ETH' | 'DOT' | 'MATIC' | 'XTZ' | 'SOL';
  totalExpense: number;
  ownerShare: number;
};

const SCENARIOS: ChainScenario[] = [
  { network: 'ethereum', currency: 'ETH', totalExpense: 0.45, ownerShare: 0.225 },
  { network: 'polkadot', currency: 'DOT', totalExpense: 2.4, ownerShare: 1.2 },
  { network: 'polygon', currency: 'MATIC', totalExpense: 48, ownerShare: 24 },
  { network: 'tezos', currency: 'XTZ', totalExpense: 30, ownerShare: 15 },
  { network: 'solana', currency: 'SOL', totalExpense: 6, ownerShare: 3 },
];

const people = [
  { id: 'owner', name: 'You', balance: 0, trustScore: 100, potCount: 1 },
  { id: 'counterparty', name: 'Counterparty', balance: 0, trustScore: 90, potCount: 1 },
];

function createTwoMemberPot(
  id: string,
  currency: ChainScenario['currency'],
  totalExpense: number,
  ownerShare: number,
): any {
  return {
    id,
    name: `${currency} settle test`,
    baseCurrency: currency,
    members: [
      { id: 'owner', name: 'You', role: 'Owner', status: 'active' },
      { id: 'counterparty', name: 'Counterparty', role: 'Member', status: 'active' },
    ],
    expenses: [
      {
        id: `${id}-expense`,
        amount: totalExpense,
        currency,
        paidBy: 'counterparty',
        memo: `${currency} shared expense`,
        date: new Date().toISOString(),
        split: [
          { memberId: 'owner', amount: ownerShare },
          { memberId: 'counterparty', amount: totalExpense - ownerShare },
        ],
        attestations: [],
        hasReceipt: true,
      },
    ],
    history: [] as any[],
  };
}

describe('multi-chain settlement calculations', () => {
  it.each(SCENARIOS)(
    'creates settlement debt for $network ($currency)',
    ({ currency, totalExpense, ownerShare }: ChainScenario) => {
      const pot = createTwoMemberPot(`pot-${currency}`, currency, totalExpense, ownerShare);
      const settled = calculatePotSettlements(pot as any, 'owner');
      expect(settled.youOwe).toHaveLength(1);
      expect(settled.youOwe[0]?.id).toBe('counterparty');
      expect(settled.youOwe[0]?.totalAmount).toBeCloseTo(ownerShare, 8);
    },
  );

  it.each(SCENARIOS)(
    'zeros debt after on-chain settlement history for $network ($currency)',
    ({ currency, totalExpense, ownerShare }: ChainScenario) => {
      const pot = createTwoMemberPot(`pot-finalized-${currency}`, currency, totalExpense, ownerShare);
      pot.history = [
        {
          id: `tx-${currency}`,
          when: Date.now(),
          type: 'onchain_settlement',
          fromMemberId: 'owner',
          toMemberId: 'counterparty',
          fromAddress: 'from-address',
          toAddress: 'to-address',
          amountDot: ownerShare.toString(),
          txHash: `0x${currency.toLowerCase()}finalized`,
          status: 'finalized',
        },
      ];

      const after = calculatePotSettlements(pot as any, 'owner');
      expect(after.youOwe).toHaveLength(0);

      const acrossPots = calculateSettlements([pot as any], people as any, 'owner');
      expect(acrossPots.youOwe).toHaveLength(1);
      expect(acrossPots.youOwe[0]?.totalAmount).toBeCloseTo(ownerShare, 8);
    },
  );

  it('seed fixture contains unsettled pots for all requested chains/currencies', () => {
    const needed = new Set(['DOT', 'ETH', 'MATIC', 'XTZ', 'SOL']);
    const present = new Set(UNSETTLED_SETTLEMENT_POTS.map((pot) => pot.baseCurrency));
    needed.forEach((currency) => expect(present.has(currency as any)).toBe(true));

    const aggregate = calculateSettlements(UNSETTLED_SETTLEMENT_POTS as any, [
      { id: 'owner', name: 'You', balance: 0, trustScore: 100, potCount: 5 },
      { id: 'alice', name: 'Alice', balance: 0, trustScore: 90, potCount: 1 },
      { id: 'bob', name: 'Bob', balance: 0, trustScore: 90, potCount: 1 },
      { id: 'carol', name: 'Carol', balance: 0, trustScore: 90, potCount: 1 },
      { id: 'dave', name: 'Dave', balance: 0, trustScore: 90, potCount: 1 },
      { id: 'erin', name: 'Erin', balance: 0, trustScore: 90, potCount: 1 },
      { id: 'frank', name: 'Frank', balance: 0, trustScore: 90, potCount: 1 },
      { id: 'gina', name: 'Gina', balance: 0, trustScore: 90, potCount: 1 },
      { id: 'hank', name: 'Hank', balance: 0, trustScore: 90, potCount: 1 },
    ] as any, 'owner');

    expect(aggregate.youOwe.length).toBeGreaterThan(0);
  });

  it('supports settlement calculations for configured CI user context', () => {
    const userId = process.env.CHOPDOT_TEST_USER_ID || 'owner';
    const allPeople = [
      'owner',
      'alice',
      'bob',
      'carol',
      'dave',
      'erin',
      'frank',
      'gina',
      'hank',
    ].map((id) => ({ id, name: id, balance: 0, trustScore: 90, potCount: 1 }));

    const result = calculateSettlements(
      UNSETTLED_SETTLEMENT_POTS as any,
      allPeople as any,
      userId,
    );

    expect(Array.isArray(result.youOwe)).toBe(true);
    expect(Array.isArray(result.owedToYou)).toBe(true);
  });
});
