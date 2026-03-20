import type { Pot, Settlement } from "../types/app";

export const HACKATHON_DEMO_SEED_VERSION = "2026-03-17-v1";

export type HackathonDemoSeed = {
  version: string;
  mockBalancePlanck: string;
  pots: Pot[];
  settlements: Settlement[];
};

const owner = {
  id: "owner",
  name: "You",
  role: "Owner" as const,
  status: "active" as const,
  address: "15GrwkvKWLJUXwKZFXChsVGdfnRDEhinYMiGWXnV8Pfv7Hjq",
  evmAddress: "0x1111111111111111111111111111111111111111",
};

const alice = {
  id: "alice",
  name: "Alice",
  role: "Member" as const,
  status: "active" as const,
  address: "15Jh2k3Xm29ry1CNtXNvzPTC2QgHYMnyqcG4cSnhpV9MrAbf",
  evmAddress: "0x2222222222222222222222222222222222222222",
};

const bob = {
  id: "bob",
  name: "Bob",
  role: "Member" as const,
  status: "active" as const,
  address: "13FJ4i6TJyGXPRvWHzRvDDDeZPAHDq6cHruM3aMcDwZJWLEH",
  evmAddress: "0x3333333333333333333333333333333333333333",
};

export function isHackathonDemoMode(): boolean {
  return import.meta.env.VITE_HACKATHON_DEMO_MODE === "1";
}

export function shouldResetHackathonDemoData(): boolean {
  return import.meta.env.VITE_HACKATHON_DEMO_RESET === "1";
}

export function getHackathonDemoSeed(): HackathonDemoSeed {
  const liveCloseoutPot: Pot = {
    id: "hackathon-live-closeout",
    name: "Hackathon Demo: Builder Dinner",
    type: "expense",
    baseCurrency: "DOT",
    mode: "casual",
    checkpointEnabled: false,
    budgetEnabled: true,
    budget: 18,
    archived: false,
    members: [owner, alice, bob],
    expenses: [
      {
        id: "hack-1",
        amount: 9.7,
        currency: "DOT",
        paidBy: "alice",
        memo: "Team dinner for demo night",
        date: "2026-03-17T08:00:00.000Z",
        split: [
          { memberId: "owner", amount: 4.85 },
          { memberId: "alice", amount: 2.425 },
          { memberId: "bob", amount: 2.425 },
        ],
        attestations: ["owner", "bob"],
        hasReceipt: true,
      },
      {
        id: "hack-2",
        amount: 3.6,
        currency: "DOT",
        paidBy: "bob",
        memo: "Late-night coffee run",
        date: "2026-03-17T10:30:00.000Z",
        split: [
          { memberId: "owner", amount: 1.2 },
          { memberId: "alice", amount: 1.2 },
          { memberId: "bob", amount: 1.2 },
        ],
        attestations: ["owner"],
        hasReceipt: false,
      },
    ],
    history: [],
    closeouts: [],
    createdAt: "2026-03-17T07:30:00.000Z",
    lastEditAt: "2026-03-17T10:30:00.000Z",
    confirmationsEnabled: false,
  };

  const proofRetryPot: Pot = {
    id: "hackathon-proof-retry",
    name: "Hackathon Demo: Proof Recovery",
    type: "expense",
    baseCurrency: "DOT",
    mode: "casual",
    checkpointEnabled: false,
    budgetEnabled: false,
    archived: false,
    members: [owner, alice],
    expenses: [
      {
        id: "hack-proof-1",
        amount: 5,
        currency: "DOT",
        paidBy: "alice",
        memo: "Pitch deck printing",
        date: "2026-03-17T09:00:00.000Z",
        split: [
          { memberId: "owner", amount: 2.5 },
          { memberId: "alice", amount: 2.5 },
        ],
        attestations: ["owner"],
        hasReceipt: false,
      },
    ],
    history: [],
    closeouts: [
      {
        id: "hackathon-closeout-active",
        potId: "hackathon-proof-retry",
        asset: "DOT",
        snapshotHash: `0x${"b".repeat(64)}`,
        metadataHash: `0x${"c".repeat(64)}`,
        contractAddress:
          import.meta.env.VITE_PVM_CLOSEOUT_CONTRACT_ADDRESS ||
          "0x3333333333333333333333333333333333333333",
        closeoutId: "98765",
        contractTxHash: `0x${"d".repeat(64)}`,
        status: "active",
        createdByMemberId: "owner",
        createdAt: Date.parse("2026-03-17T09:05:00.000Z"),
        participantMemberIds: ["owner", "alice"],
        participantAddresses: [owner.evmAddress!, alice.evmAddress!],
        settledLegCount: 1,
        totalLegCount: 1,
        legs: [
          {
            index: 0,
            fromMemberId: "owner",
            toMemberId: "alice",
            fromAddress: owner.evmAddress!,
            toAddress: alice.evmAddress!,
            amount: "2.500000",
            asset: "DOT",
            settlementTxHash: `0x${"e".repeat(64)}`,
            status: "paid",
          },
        ],
      },
    ],
    createdAt: "2026-03-17T08:45:00.000Z",
    lastEditAt: "2026-03-17T09:05:00.000Z",
    confirmationsEnabled: false,
  };

  const settlements: Settlement[] = [
    {
      id: "hackathon-proof-retry-settlement",
      personId: "alice",
      amount: "2.500000",
      currency: "DOT",
      method: "dot",
      potIds: ["hackathon-proof-retry"],
      date: "2026-03-17T09:06:00.000Z",
      txHash: `0x${"e".repeat(64)}`,
      closeoutId: "98765",
      closeoutLegIndex: 0,
      proofStatus: "anchored",
    },
  ];

  const mockBalancePlanck =
    import.meta.env.VITE_HACKATHON_DEMO_MOCK_BALANCE?.trim() || "2500000000000";

  return {
    version: HACKATHON_DEMO_SEED_VERSION,
    mockBalancePlanck,
    pots: [liveCloseoutPot, proofRetryPot],
    settlements,
  };
}
