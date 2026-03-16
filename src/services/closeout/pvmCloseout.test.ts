import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Pot } from "../../schema/pot";
import {
  anchorCloseoutDraft,
  canCreatePvmCloseout,
  createCloseoutDraft,
  getCloseoutReadiness,
  recordSettlementProof,
} from "./pvmCloseout";

const basePot: Pot = {
  id: "pot-closeout",
  name: "Hackathon House",
  type: "expense",
  baseCurrency: "DOT",
  members: [
    {
      id: "owner",
      name: "You",
      role: "Owner",
      status: "active",
      address: "15owner111111111111111111111111111111111111111111",
      evmAddress: "0x1111111111111111111111111111111111111111",
    },
    {
      id: "alice",
      name: "Alice",
      role: "Member",
      status: "active",
      address: "15alice11111111111111111111111111111111111111111",
      evmAddress: "0x2222222222222222222222222222222222222222",
    },
  ],
  expenses: [
    {
      id: "exp-1",
      amount: 10,
      currency: "DOT",
      paidBy: "alice",
      memo: "Venue snacks",
      date: "2026-03-16T00:00:00.000Z",
      split: [
        { memberId: "owner", amount: 5 },
        { memberId: "alice", amount: 5 },
      ],
      attestations: [],
      hasReceipt: false,
    },
  ],
  history: [],
  closeouts: [],
  budgetEnabled: false,
  checkpointEnabled: false,
  archived: false,
  mode: "casual",
};

describe("pvmCloseout", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    (globalThis as any).window = {};
  });

  it("identifies closeout-ready pots when all participant EVM addresses exist", () => {
    expect(canCreatePvmCloseout(basePot)).toBe(true);
  });

  it("builds a closeout draft with settlement legs and snapshot hash", async () => {
    const draft = await createCloseoutDraft({
      pot: basePot,
      createdByMemberId: "owner",
    });

    expect(draft.status).toBe("draft");
    expect(draft.totalLegCount).toBe(1);
    expect(draft.legs[0]).toMatchObject({
      fromMemberId: "owner",
      toMemberId: "alice",
      asset: "DOT",
      status: "pending",
      fromAddress: "0x1111111111111111111111111111111111111111",
      toAddress: "0x2222222222222222222222222222222222222222",
    });
    expect(draft.snapshotHash).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it("reports readiness blockers for missing EVM address and disabled flag", async () => {
    vi.stubEnv("VITE_ENABLE_PVM_CLOSEOUT", "0");
    const pot = {
      ...basePot,
      members: basePot.members.map((member) =>
        member.id === "alice" ? { ...member, evmAddress: undefined } : member,
      ),
    };

    const readiness = await getCloseoutReadiness(pot);

    expect(readiness.find((item) => item.id === "feature_flag")?.status).toBe("fail");
    expect(readiness.find((item) => item.id === "member_evm_addresses")?.status).toBe("fail");
  });

  it("uses simulation mode for readiness, anchor, and proof recording", async () => {
    vi.stubEnv("VITE_ENABLE_PVM_CLOSEOUT", "1");
    vi.stubEnv("VITE_SIMULATE_PVM_CLOSEOUT", "1");

    const readiness = await getCloseoutReadiness(basePot);
    expect(readiness.find((item) => item.id === "wallet_provider")?.status).toBe("pass");

    const draft = await createCloseoutDraft({
      pot: basePot,
      createdByMemberId: "owner",
    });
    const anchored = await anchorCloseoutDraft(draft);
    expect(anchored.closeoutId).toMatch(/^\d+$/);
    expect(anchored.contractTxHash).toMatch(/^0x[a-f0-9]{64}$/);

    const proof = await recordSettlementProof({
      closeoutId: anchored.closeoutId!,
      legIndex: 0,
      settlementTxHash: `0x${"a".repeat(64)}`,
    });
    expect(proof.proofStatus).toBe("completed");
    expect(proof.proofTxHash).toMatch(/^0x[a-f0-9]{64}$/);
  });
});
