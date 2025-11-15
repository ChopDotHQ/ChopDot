import { createContext, useContext, useMemo, type ReactNode } from 'react';

type EvmAccountStatus = 'disabled' | 'disconnected' | 'connecting' | 'connected';

export interface EvmAccountContextValue {
  status: EvmAccountStatus;
  address: string | null;
  network: string | null;
  connect: () => Promise<string | null>;
  disconnect: () => void;
}

const createPlaceholderValue = (enabled: boolean): EvmAccountContextValue => ({
  status: enabled ? 'disconnected' : 'disabled',
  address: null,
  network: null,
  connect: async () => {
    if (enabled) {
      console.warn('[EvmAccount] Embedded wallet scaffolding is enabled but not implemented yet.');
    } else {
      console.warn('[EvmAccount] Embedded wallet is disabled (VITE_ENABLE_EMBEDDED_WALLET=0).');
    }
    return null;
  },
  disconnect: () => {
    console.warn('[EvmAccount] No embedded wallet session to disconnect yet.');
  },
});

const EvmAccountContext = createContext<EvmAccountContextValue>(createPlaceholderValue(false));

interface EvmAccountProviderProps {
  children: ReactNode;
  enabled?: boolean;
}

export function EvmAccountProvider({ children, enabled = false }: EvmAccountProviderProps) {
  const value = useMemo(() => createPlaceholderValue(enabled), [enabled]);

  return (
    <EvmAccountContext.Provider value={value}>
      {children}
    </EvmAccountContext.Provider>
  );
}

export function useEvmAccount(): EvmAccountContextValue {
  return useContext(EvmAccountContext);
}
