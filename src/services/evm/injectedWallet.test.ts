import { beforeEach, describe, expect, it } from "vitest";
import {
  getInjectedEvmAccount,
  getInjectedEvmChainId,
  getInjectedEvmProvider,
  getInjectedEvmProviderLabel,
  readInjectedEvmState,
} from "./injectedWallet";

describe("injectedWallet", () => {
  beforeEach(() => {
    (globalThis as any).window = {};
  });

  it("returns null when no injected provider exists", async () => {
    expect(getInjectedEvmProvider()).toBeNull();
    expect(getInjectedEvmProviderLabel(null)).toBeNull();
    await expect(getInjectedEvmAccount(null)).resolves.toBeNull();
    await expect(getInjectedEvmChainId(null)).resolves.toBeNull();
  });

  it("reads address and chain id from the injected provider", async () => {
    const provider = {
      isMetaMask: true,
      request: async ({ method }: { method: string }) => {
        if (method === "eth_accounts") {
          return ["0x1111111111111111111111111111111111111111"];
        }
        if (method === "eth_chainId") {
          return "0x190f1";
        }
        return null;
      },
    };
    (globalThis as any).window = { ethereum: provider };

    expect(getInjectedEvmProvider()).toBe(provider);
    expect(getInjectedEvmProviderLabel(provider)).toBe("MetaMask");
    await expect(getInjectedEvmAccount(provider)).resolves.toBe("0x1111111111111111111111111111111111111111");
    await expect(getInjectedEvmChainId(provider)).resolves.toBe("0x190f1");
    await expect(readInjectedEvmState(provider)).resolves.toEqual({
      address: "0x1111111111111111111111111111111111111111",
      chainId: "0x190f1",
    });
  });

  it("falls back to generic provider label for non-MetaMask wallets", () => {
    const provider = {
      request: async () => [],
    };

    expect(getInjectedEvmProviderLabel(provider as any)).toBe("Injected 0x Wallet");
  });
});
