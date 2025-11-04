import React, { createContext, useContext, useEffect, useState } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { ScProvider } from '@polkadot/rpc-provider/substrate-connect';
import { WellKnownChain } from '@substrate/connect';
import { getCurrentChain, type ChainPreset } from './chains';

interface ChainContextValue { api?: ApiPromise; isReady: boolean; error?: unknown; preset: ChainPreset; setChain: (key: 'westend'|'polkadot') => void }

const ChainContext = createContext<ChainContextValue>({ isReady: false, preset: getCurrentChain(), setChain: () => {} });

export const LightClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [api, setApi] = useState<ApiPromise>();
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<unknown>();
  const [preset, setPreset] = useState<ChainPreset>(getCurrentChain());

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const chain = preset.wellKnown === 'westend2' ? WellKnownChain.westend2 : WellKnownChain.polkadot;
        const provider = new (ScProvider as unknown as any)(chain as unknown as any);
        await provider.connect();
        const apiInst = await ApiPromise.create({ provider });
        if (!mounted) return;
        setApi(apiInst);
        await apiInst.isReady;
        if (!mounted) return;
        setIsReady(true);
      } catch (e) {
        // Dev fallback: attempt public RPC if light client fails (keeps UX unblocked)
        try {
          const ws = new WsProvider('wss://westend-rpc.polkadot.io');
          const apiInst = await ApiPromise.create({ provider: ws });
          if (!mounted) return;
          setApi(apiInst);
          await apiInst.isReady;
          if (!mounted) return;
          setIsReady(true);
        } catch (e2) {
          if (!mounted) return;
          setError(e2);
        }
      }
    })();
    return () => { mounted = false; api?.disconnect().catch(() => {}); };
  }, [preset.key]);

  useEffect(() => {
    const onChange = (e: any) => {
      const next = getCurrentChain();
      setIsReady(false);
      setPreset(next);
    };
    window.addEventListener('chopdot:chainChanged', onChange as any);
    return () => window.removeEventListener('chopdot:chainChanged', onChange as any);
  }, []);

  const setChain = (key: 'westend'|'polkadot') => {
    localStorage.setItem('chopdot_chain', key);
    window.dispatchEvent(new CustomEvent('chopdot:chainChanged', { detail: key }));
  };

  const banner = (
    <div className="px-3 py-1 text-xs border-b">Connected to: {preset.label}</div>
  );

  if (!isReady) {
    return (
      <div>
        {banner}
        <div className="p-4 text-sm opacity-80">Initializing light client…</div>
      </div>
    );
  }
  if (error) {
    return <div className="p-4 text-sm text-red-600">Light client error: {String((error as any)?.message || error)}</div>;
  }
  return <ChainContext.Provider value={{ api, isReady, preset, setChain }}>{banner}{children}</ChainContext.Provider>;
};

export const useChain = () => useContext(ChainContext);


