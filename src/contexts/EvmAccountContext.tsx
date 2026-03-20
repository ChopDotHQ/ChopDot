import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getInjectedEvmProvider,
  getInjectedEvmProviderLabel,
  readInjectedEvmState,
  type InjectedEip1193Provider,
} from '../services/evm/injectedWallet';

type EvmAccountStatus = 'disabled' | 'disconnected' | 'connecting' | 'connected';

export interface EvmAccountContextValue {
  status: EvmAccountStatus;
  address: string | null;
  network: string | null;
  chainId: string | null;
  isAvailable: boolean;
  providerLabel: string | null;
  connect: () => Promise<string | null>;
  disconnect: () => void;
  refresh: () => Promise<void>;
}

const createPlaceholderValue = (enabled: boolean): EvmAccountContextValue => ({
  status: enabled ? 'disconnected' : 'disabled',
  address: null,
  network: null,
  chainId: null,
  isAvailable: false,
  providerLabel: null,
  connect: async () => null,
  disconnect: () => {},
  refresh: async () => {},
});

const EvmAccountContext = createContext<EvmAccountContextValue>(createPlaceholderValue(false));

interface EvmAccountProviderProps {
  children: ReactNode;
  enabled?: boolean;
}

export function EvmAccountProvider({ children, enabled = false }: EvmAccountProviderProps) {
  const [status, setStatus] = useState<EvmAccountStatus>(enabled ? 'disconnected' : 'disabled');
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [providerLabel, setProviderLabel] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setStatus('disabled');
      setAddress(null);
      setChainId(null);
      setProviderLabel(null);
      return;
    }

    const provider = getInjectedEvmProvider();
    setProviderLabel(getInjectedEvmProviderLabel(provider));
    if (!provider) {
      setStatus('disconnected');
      setAddress(null);
      setChainId(null);
      return;
    }

    const nextState = await readInjectedEvmState(provider);
    setAddress(nextState.address);
    setChainId(nextState.chainId);
    setStatus(nextState.address ? 'connected' : 'disconnected');
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    const provider = getInjectedEvmProvider() as InjectedEip1193Provider | null;
    if (!provider?.on || !provider.removeListener) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const nextAddress = Array.isArray(accounts) && typeof accounts[0] === 'string' ? accounts[0] : null;
      setAddress(nextAddress);
      setStatus(nextAddress ? 'connected' : 'disconnected');
    };

    const handleChainChanged = (nextChainId: unknown) => {
      setChainId(typeof nextChainId === 'string' ? nextChainId : null);
    };

    provider.on('accountsChanged', handleAccountsChanged);
    provider.on('chainChanged', handleChainChanged);

    return () => {
      provider.removeListener?.('accountsChanged', handleAccountsChanged);
      provider.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [enabled]);

  const connect = useCallback(async (): Promise<string | null> => {
    if (!enabled) {
      setStatus('disabled');
      return null;
    }

    const provider = getInjectedEvmProvider();
    setProviderLabel(getInjectedEvmProviderLabel(provider));
    if (!provider) {
      setStatus('disconnected');
      return null;
    }

    setStatus('connecting');
    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const nextAddress = Array.isArray(accounts) && typeof accounts[0] === 'string' ? accounts[0] : null;
      const nextChainId = await provider.request({ method: 'eth_chainId' }).catch(() => null);
      setAddress(nextAddress);
      setChainId(typeof nextChainId === 'string' ? nextChainId : null);
      setStatus(nextAddress ? 'connected' : 'disconnected');
      return nextAddress;
    } catch (error) {
      setStatus(address ? 'connected' : 'disconnected');
      return null;
    }
  }, [enabled, address]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setStatus(enabled ? 'disconnected' : 'disabled');
  }, [enabled]);

  const value = useMemo<EvmAccountContextValue>(() => ({
    status,
    address,
    network: chainId,
    chainId,
    isAvailable: Boolean(getInjectedEvmProvider()),
    providerLabel,
    connect,
    disconnect,
    refresh,
  }), [status, address, chainId, providerLabel, connect, disconnect, refresh]);

  return (
    <EvmAccountContext.Provider value={value}>
      {children}
    </EvmAccountContext.Provider>
  );
}

export function useEvmAccount(): EvmAccountContextValue {
  return useContext(EvmAccountContext);
}
