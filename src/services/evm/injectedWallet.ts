export type InjectedEip1193Provider = {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

export function getInjectedEvmProvider(): InjectedEip1193Provider | null {
  if (typeof window === "undefined") return null;
  return (window.ethereum as InjectedEip1193Provider | undefined) || null;
}

export function getInjectedEvmProviderLabel(provider: InjectedEip1193Provider | null): string | null {
  if (!provider) return null;
  if (provider.isMetaMask) return "MetaMask";
  return "Injected 0x Wallet";
}

export async function getInjectedEvmAccount(
  provider: InjectedEip1193Provider | null,
): Promise<string | null> {
  if (!provider) return null;

  try {
    const accounts = await provider.request({ method: "eth_accounts" });
    if (Array.isArray(accounts) && typeof accounts[0] === "string") {
      return accounts[0];
    }
    return null;
  } catch {
    return null;
  }
}

export async function getInjectedEvmChainId(
  provider: InjectedEip1193Provider | null,
): Promise<string | null> {
  if (!provider) return null;

  try {
    const chainId = await provider.request({ method: "eth_chainId" });
    return typeof chainId === "string" ? chainId : null;
  } catch {
    return null;
  }
}

export async function readInjectedEvmState(provider: InjectedEip1193Provider | null) {
  const [address, chainId] = await Promise.all([
    getInjectedEvmAccount(provider),
    getInjectedEvmChainId(provider),
  ]);

  return { address, chainId };
}
