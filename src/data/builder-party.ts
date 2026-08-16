import type { Expense, Member, Pot } from "../types/app";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const builderPartyMembersTemplate: Member[] = [
  { id: "owner", name: "You", role: "Owner", status: "active" },
  { id: "alice", name: "Alice", role: "Member", status: "active" },
  { id: "bob", name: "Bob", role: "Member", status: "active" },
  { id: "charlie", name: "Charlie", role: "Member", status: "active" },
];

type BuilderPartyExpenseTemplate = Omit<Expense, "date"> & { daysAgo: number };

const builderPartyExpenseTemplates: BuilderPartyExpenseTemplate[] = [
  {
    id: "pb1",
    amount: 120,
    currency: "USD",
    paidBy: "owner",
    memo: "Hack lounge deposit",
    daysAgo: 6,
    split: [
      { memberId: "owner", amount: 30 },
      { memberId: "alice", amount: 30 },
      { memberId: "bob", amount: 30 },
      { memberId: "charlie", amount: 30 },
    ],
    attestations: ["alice", "bob", "charlie"],
    hasReceipt: true,
  },
  {
    id: "pb2",
    amount: 120,
    currency: "USD",
    paidBy: "alice",
    memo: "Night market dinner",
    daysAgo: 4,
    split: [
      { memberId: "owner", amount: 30 },
      { memberId: "alice", amount: 30 },
      { memberId: "bob", amount: 30 },
      { memberId: "charlie", amount: 30 },
    ],
    attestations: ["owner", "charlie"],
    hasReceipt: true,
  },
  {
    id: "pb3",
    amount: 120,
    currency: "USD",
    paidBy: "bob",
    memo: "Recharge snacks & coffee",
    daysAgo: 3,
    split: [
      { memberId: "owner", amount: 30 },
      { memberId: "alice", amount: 30 },
      { memberId: "bob", amount: 30 },
      { memberId: "charlie", amount: 30 },
    ],
    attestations: ["alice"],
    hasReceipt: false,
  },
  {
    id: "pb4",
    amount: 120,
    currency: "USD",
    paidBy: "charlie",
    memo: "Badge print run",
    daysAgo: 1,
    split: [
      { memberId: "owner", amount: 30 },
      { memberId: "alice", amount: 30 },
      { memberId: "bob", amount: 30 },
      { memberId: "charlie", amount: 30 },
    ],
    attestations: [],
    hasReceipt: true,
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

export const createPolkadotBuilderPartyPot = (now = Date.now()): Pot => ({
  id: "4",
  name: "🎉 Team Offsite",
  type: "expense",
  baseCurrency: "USD",
  members: createBuilderPartyMembers(),
  expenses: createBuilderPartyExpenses(now),
  budget: 600,
  budgetEnabled: true,
  checkpointEnabled: false,
});
