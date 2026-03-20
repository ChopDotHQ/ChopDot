import { describe, expect, it } from "vitest";
import { buildCloseoutReceiptText } from "./closeoutReceipt";
import type { ProofDetailRecord } from "../nav";

const baseRecord: ProofDetailRecord = {
  counterpartyName: "Alice",
  amount: 12.345678,
  currency: "DOT",
  method: "dot",
  at: Date.parse("2026-03-20T10:30:00.000Z"),
  txHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  closeoutId: "42",
  closeoutLegIndex: 1,
  proofTxHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  proofStatus: "completed",
  proofContract: "0xcccccccccccccccccccccccccccccccccccccccc",
  potNames: ["Builder Dinner"],
};

describe("buildCloseoutReceiptText", () => {
  it("builds a readable DOT closeout receipt", () => {
    const receipt = buildCloseoutReceiptText(baseRecord);

    expect(receipt).toContain("ChopDot Closeout Receipt");
    expect(receipt).toContain("Counterparty: Alice");
    expect(receipt).toContain("Amount: 12.345678 DOT");
    expect(receipt).toContain("Closeout onchain: 42");
    expect(receipt).toContain("Settlement leg: 2");
    expect(receipt).toContain("Settlement proof: completed");
    expect(receipt).toContain("Proof tx: 0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
  });

  it("formats fiat-style receipts without optional proof fields", () => {
    const receipt = buildCloseoutReceiptText({
      counterpartyName: "Bob",
      amount: 18.5,
      currency: "USD",
      method: "bank",
      at: Date.parse("2026-03-20T12:00:00.000Z"),
      proofStatus: "anchored",
    });

    expect(receipt).toContain("Amount: $18.50");
    expect(receipt).toContain("Method: BANK");
    expect(receipt).toContain("Settlement proof: anchored");
    expect(receipt).not.toContain("Closeout onchain:");
    expect(receipt).not.toContain("Proof tx:");
    expect(receipt).not.toContain("Proof contract:");
  });
});
