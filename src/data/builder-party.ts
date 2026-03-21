import type { Expense, Member, Pot, PotHistory } from "../types/app";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const builderPartyMembersTemplate: Member[] = [
  {
    id: "owner",
    name: "You",
    role: "Owner",
    status: "active",
    address: "15GrwkvKWLJUXwKZFXChsVGdfnRDEhinYMiGWXnV8Pfv7Hjq",
  },
  {
    id: "alice",
    name: "Alice",
    role: "Member",
    status: "active",
    address: "15Jh2k3Xm29ry1CNtXNvzPTC2QgHYMnyqcG4cSnhpV9MrAbf",
  },
  {
    id: "bob",
    name: "Bob",
    role: "Member",
    status: "active",
    address: "13FJ4i6TJyGXPRvWHzRvDDDeZPAHDq6cHruM3aMcDwZJWLEH",
  },
  {
    id: "charlie",
    name: "Charlie",
    role: "Member",
    status: "active",
    address: "16Hk8qqBPGF6NQvM6PgZGZXzx9Dj2TqkBTsEz9wqgFudaGt3",
  },
];

type BuilderPartyExpenseTemplate = Omit<Expense, "date"> & { daysAgo: number };

const builderPartyExpenseTemplates: BuilderPartyExpenseTemplate[] = [
  {
    id: "pb1",
    amount: 1.2,
    currency: "DOT",
    paidBy: "owner",
    memo: "Hack lounge deposit",
    daysAgo: 6,
    split: [
      { memberId: "owner", amount: 0.3 },
      { memberId: "alice", amount: 0.3 },
      { memberId: "bob", amount: 0.3 },
      { memberId: "charlie", amount: 0.3 },
    ],
    attestations: ["alice", "bob", "charlie"],
    hasReceipt: true,
  },
  {
    id: "pb2",
    amount: 1.2,
    currency: "DOT",
    paidBy: "alice",
    memo: "Night market dinner",
    daysAgo: 4,
    split: [
      { memberId: "owner", amount: 0.3 },
      { memberId: "alice", amount: 0.3 },
      { memberId: "bob", amount: 0.3 },
      { memberId: "charlie", amount: 0.3 },
    ],
    attestations: ["owner", "charlie"],
    hasReceipt: true,
  },
  {
    id: "pb3",
    amount: 1.2,
    currency: "DOT",
    paidBy: "bob",
    memo: "Recharge snacks & coffee",
    daysAgo: 3,
    split: [
      { memberId: "owner", amount: 0.3 },
      { memberId: "alice", amount: 0.3 },
      { memberId: "bob", amount: 0.3 },
      { memberId: "charlie", amount: 0.3 },
    ],
    attestations: ["alice"],
    hasReceipt: false,
  },
  {
    id: "pb4",
    amount: 1.2,
    currency: "DOT",
    paidBy: "charlie",
    memo: "Badge print run",
    daysAgo: 1,
    split: [
      { memberId: "owner", amount: 0.3 },
      { memberId: "alice", amount: 0.3 },
      { memberId: "bob", amount: 0.3 },
      { memberId: "charlie", amount: 0.3 },
    ],
    attestations: [],
    hasReceipt: true,
  },
  {
    id: "pb5",
    amount: 0.001,
    currency: "DOT",
    paidBy: "bob",
    memo: "Micro-settlement demo",
    daysAgo: 0,
    split: [{ memberId: "owner", amount: 0.001 }],
    attestations: [],
    hasReceipt: false,
  },
];

const createBuilderPartyMembers = (): Member[] =>
  builderPartyMembersTemplate.map((member) => ({ ...member }));

const createBuilderPartyExpenses = (now = Date.now()): Expense[] =>
  builderPartyExpenseTemplates.map(({ daysAgo, ...expense }) => ({
    ...expense,
    date: new Date(now - daysAgo * DAY_IN_MS).toISOString(),
    split: expense.split.map((split) => ({ ...split })),
    attestations: [...expense.attestations],
  }));

const demoMicroOnchainSettlement = (now: number): PotHistory => ({
  id: "demo-onchain-micro",
  type: "onchain_settlement",
  fromMemberId: "bob",
  toMemberId: "owner",
  fromAddress: builderPartyMembersTemplate[2]!.address!,
  toAddress: builderPartyMembersTemplate[0]!.address!,
  amountDot: "0.001000",
  txHash:
    "0x0000000000000000000000000000000000000000000000000000000000000001",
  subscan:
    "https://polkadot.subscan.io/extrinsic/0x0000000000000000000000000000000000000000000000000000000000000001",
  status: "finalized",
  when: now,
});

export const createPolkadotBuilderPartyPot = (now = Date.now()): Pot => ({
  id: "4",
  name: "Polkadot Builder Party",
  type: "expense",
  baseCurrency: "DOT",
  members: createBuilderPartyMembers(),
  expenses: createBuilderPartyExpenses(now),
  history: [demoMicroOnchainSettlement(now)],
  budget: 6,
  budgetEnabled: true,
  checkpointEnabled: false,
});
