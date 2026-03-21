/// <reference types="cypress" />

const seededPot = {
  id: "pvm-e2e-pot",
  name: "PVM E2E Pot",
  type: "expense",
  baseCurrency: "DOT",
  mode: "casual",
  checkpointEnabled: false,
  budgetEnabled: false,
  archived: false,
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
  createdAt: "2026-03-16T00:00:00.000Z",
};

const anchoredCloseoutPot = {
  ...seededPot,
  closeouts: [
    {
      id: "closeout-active-1",
      potId: "pvm-e2e-pot",
      asset: "DOT",
      snapshotHash: `0x${"b".repeat(64)}`,
      contractAddress: "0x3333333333333333333333333333333333333333",
      closeoutId: "98765",
      contractTxHash: `0x${"c".repeat(64)}`,
      status: "active",
      createdByMemberId: "owner",
      createdAt: Date.now(),
      participantMemberIds: ["owner", "alice"],
      participantAddresses: [
        "0x1111111111111111111111111111111111111111",
        "0x2222222222222222222222222222222222222222",
      ],
      settledLegCount: 0,
      totalLegCount: 1,
      legs: [
        {
          index: 0,
          fromMemberId: "owner",
          toMemberId: "alice",
          fromAddress: "0x1111111111111111111111111111111111111111",
          toAddress: "0x2222222222222222222222222222222222222222",
          amount: "5.000000",
          asset: "DOT",
          status: "pending",
        },
      ],
    },
  ],
};

function seedGuestData(pots: unknown[], settlements: unknown[] = []) {
  const potsJson = JSON.stringify(pots);
  const settlementsJson = JSON.stringify(settlements);

  cy.loginAsGuest();

  cy.window().then((win) => {
    win.localStorage.setItem("chopdot_e2e_seed_pots", potsJson);
    win.localStorage.setItem("chopdot_e2e_seed_settlements", settlementsJson);
  });

  cy.visit("/pots");
  cy.contains(/^Pots$/i, { timeout: 30000 }).should("be.visible");
}

describe("PVM closeout", () => {
  it("shows anchored closeout context in the settlement flow", () => {
    seedGuestData([anchoredCloseoutPot]);

    cy.contains("PVM E2E Pot", { timeout: 20000 }).click({ force: true });
    cy.contains("button", /Settle Up/i, { timeout: 20000 }).click({ force: true });
    cy.contains("button", /Alice/i, { timeout: 20000 }).click({ force: true });

    cy.contains("label", /Payment Method/i).should("be.visible");
    cy.contains(/Closeout/i).should("be.visible");
    cy.contains(/Onchain closeout/i).should("be.visible");
    cy.contains(/98765/i).should("be.visible");
    cy.contains(/anchored/i).should("be.visible");
  });
});
