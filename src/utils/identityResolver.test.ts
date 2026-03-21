import { describe, expect, it } from "vitest";
import {
  normalizeWalletAddress,
  resolveMemberIdentity,
  resolvePaymentPreference,
} from "./identityResolver";

describe("identityResolver", () => {
  it("normalizes wallet addresses and strips empty values", () => {
    expect(normalizeWalletAddress(" 15abc ")).toBe("15abc");
    expect(normalizeWalletAddress("   ")).toBeUndefined();
    expect(normalizeWalletAddress(undefined)).toBeUndefined();
  });

  it("resolves member identity by id first, then name", () => {
    const sources = [
      { id: "alice-id", name: "Alice", address: " 15alice ", paymentPreference: "Bank" },
      { id: "bob-id", name: "Bob", address: "", paymentPreference: "PayPal" },
    ];

    const byId = resolveMemberIdentity({
      targetId: "alice-id",
      targetName: "Alice",
      sources,
      fallbackPreference: "Any method",
    });
    expect(byId.id).toBe("alice-id");
    expect(byId.name).toBe("Alice");
    expect(byId.address).toBe("15alice");
    expect(byId.paymentPreference).toBe("DOT");
    expect(byId.matchedBy).toBe("id");

    const byName = resolveMemberIdentity({
      targetName: "bob",
      sources,
      fallbackPreference: "Any method",
    });
    expect(byName.id).toBe("bob-id");
    expect(byName.name).toBe("Bob");
    expect(byName.address).toBeUndefined();
    expect(byName.paymentPreference).toBe("PayPal");
    expect(byName.matchedBy).toBe("name");
  });

  it("falls back cleanly when no source match exists", () => {
    const resolved = resolveMemberIdentity({
      targetId: "charlie-id",
      targetName: "Charlie",
      sources: [],
      fallbackPreference: "Any method",
    });

    expect(resolved.id).toBe("charlie-id");
    expect(resolved.name).toBe("Charlie");
    expect(resolved.address).toBeUndefined();
    expect(resolved.paymentPreference).toBe("Any method");
    expect(resolved.matchedBy).toBe("none");
  });

  it("prefers DOT when an address exists", () => {
    expect(resolvePaymentPreference("15abc", "Bank")).toBe("DOT");
    expect(resolvePaymentPreference(undefined, "Bank")).toBe("Bank");
    expect(resolvePaymentPreference(undefined, undefined, "Any method")).toBe("Any method");
  });
});

