import type { Pot } from '../types';

const nowIso = () => new Date().toISOString();
const daysAgoIso = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

export const UNSETTLED_SETTLEMENT_POTS: Pot[] = [
  {
    id: 'seed-unsettled-dot',
    name: 'Polkadot Builders House',
    type: 'expense',
    baseCurrency: 'DOT',
    members: [
      { id: 'owner', name: 'You', role: 'Owner', status: 'active' },
      { id: 'alice', name: 'Alice', role: 'Member', status: 'active' },
      { id: 'bob', name: 'Bob', role: 'Member', status: 'active' },
    ],
    expenses: [
      {
        id: 'dot-1',
        amount: 2.4,
        currency: 'DOT',
        paidBy: 'alice',
        memo: 'Hackathon apartment',
        date: daysAgoIso(5),
        split: [
          { memberId: 'owner', amount: 0.8 },
          { memberId: 'alice', amount: 0.8 },
          { memberId: 'bob', amount: 0.8 },
        ],
        attestations: [],
        hasReceipt: true,
      },
      {
        id: 'dot-2',
        amount: 0.9,
        currency: 'DOT',
        paidBy: 'bob',
        memo: 'Food and snacks',
        date: daysAgoIso(4),
        split: [
          { memberId: 'owner', amount: 0.3 },
          { memberId: 'alice', amount: 0.3 },
          { memberId: 'bob', amount: 0.3 },
        ],
        attestations: [],
        hasReceipt: false,
      },
    ],
    history: [],
    archived: false,
    budgetEnabled: false,
    checkpointEnabled: false,
    mode: 'casual',
    confirmationsEnabled: false,
    lastEditAt: nowIso(),
  },
  {
    id: 'seed-unsettled-eth',
    name: 'ETH NYC Trip',
    type: 'expense',
    baseCurrency: 'ETH',
    members: [
      { id: 'owner', name: 'You', role: 'Owner', status: 'active' },
      { id: 'carol', name: 'Carol', role: 'Member', status: 'active' },
    ],
    expenses: [
      {
        id: 'eth-1',
        amount: 0.45,
        currency: 'ETH',
        paidBy: 'carol',
        memo: 'Hotel booking',
        date: daysAgoIso(7),
        split: [
          { memberId: 'owner', amount: 0.225 },
          { memberId: 'carol', amount: 0.225 },
        ],
        attestations: [],
        hasReceipt: true,
      },
    ],
    history: [],
    archived: false,
    budgetEnabled: false,
    checkpointEnabled: false,
    mode: 'casual',
    confirmationsEnabled: false,
    lastEditAt: nowIso(),
  },
  {
    id: 'seed-unsettled-matic',
    name: 'Polygon Team Lunch',
    type: 'expense',
    baseCurrency: 'MATIC',
    members: [
      { id: 'owner', name: 'You', role: 'Owner', status: 'active' },
      { id: 'dave', name: 'Dave', role: 'Member', status: 'active' },
      { id: 'erin', name: 'Erin', role: 'Member', status: 'active' },
    ],
    expenses: [
      {
        id: 'matic-1',
        amount: 48,
        currency: 'MATIC',
        paidBy: 'dave',
        memo: 'Catering',
        date: daysAgoIso(3),
        split: [
          { memberId: 'owner', amount: 16 },
          { memberId: 'dave', amount: 16 },
          { memberId: 'erin', amount: 16 },
        ],
        attestations: [],
        hasReceipt: true,
      },
    ],
    history: [],
    archived: false,
    budgetEnabled: false,
    checkpointEnabled: false,
    mode: 'casual',
    confirmationsEnabled: false,
    lastEditAt: nowIso(),
  },
  {
    id: 'seed-unsettled-xtz',
    name: 'Tezos Retreat',
    type: 'expense',
    baseCurrency: 'XTZ',
    members: [
      { id: 'owner', name: 'You', role: 'Owner', status: 'active' },
      { id: 'frank', name: 'Frank', role: 'Member', status: 'active' },
    ],
    expenses: [
      {
        id: 'xtz-1',
        amount: 30,
        currency: 'XTZ',
        paidBy: 'frank',
        memo: 'Train tickets',
        date: daysAgoIso(2),
        split: [
          { memberId: 'owner', amount: 15 },
          { memberId: 'frank', amount: 15 },
        ],
        attestations: [],
        hasReceipt: false,
      },
    ],
    history: [],
    archived: false,
    budgetEnabled: false,
    checkpointEnabled: false,
    mode: 'casual',
    confirmationsEnabled: false,
    lastEditAt: nowIso(),
  },
  {
    id: 'seed-unsettled-sol',
    name: 'Solana Dev Week',
    type: 'expense',
    baseCurrency: 'SOL',
    members: [
      { id: 'owner', name: 'You', role: 'Owner', status: 'active' },
      { id: 'gina', name: 'Gina', role: 'Member', status: 'active' },
      { id: 'hank', name: 'Hank', role: 'Member', status: 'active' },
    ],
    expenses: [
      {
        id: 'sol-1',
        amount: 6,
        currency: 'SOL',
        paidBy: 'gina',
        memo: 'Workspace rental',
        date: daysAgoIso(6),
        split: [
          { memberId: 'owner', amount: 2 },
          { memberId: 'gina', amount: 2 },
          { memberId: 'hank', amount: 2 },
        ],
        attestations: [],
        hasReceipt: true,
      },
      {
        id: 'sol-2',
        amount: 3,
        currency: 'SOL',
        paidBy: 'hank',
        memo: 'Meals',
        date: daysAgoIso(1),
        split: [
          { memberId: 'owner', amount: 1 },
          { memberId: 'gina', amount: 1 },
          { memberId: 'hank', amount: 1 },
        ],
        attestations: [],
        hasReceipt: true,
      },
    ],
    history: [],
    archived: false,
    budgetEnabled: false,
    checkpointEnabled: false,
    mode: 'casual',
    confirmationsEnabled: false,
    lastEditAt: nowIso(),
  },
];

export function ensureUnsettledSettlementSeedPots(existingPots: Pot[]): Pot[] {
  const byId = new Map(existingPots.map((pot) => [pot.id, pot]));
  UNSETTLED_SETTLEMENT_POTS.forEach((pot) => {
    if (!byId.has(pot.id)) {
      byId.set(pot.id, pot);
    }
  });
  return Array.from(byId.values());
}
