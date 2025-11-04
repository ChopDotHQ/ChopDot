import React, { createContext, useContext, useEffect, useState } from 'react';
import { ApiPromise } from '@polkadot/api';
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
        // Dynamically import to tolerate API differences across @substrate/connect versions
        const sc = await import('@substrate/connect');
        const WellKnownChain = (sc as any).WellKnownChain;
        const getWellKnownChain = (sc as any).getWellKnownChain;
        const chainSpec = getWellKnownChain
          ? getWellKnownChain(preset.wellKnown === 'westend2' ? WellKnownChain.westend2 : WellKnownChain.polkadot)
          : undefined;

        let provider: any;
        if ((sc as any).ScProvider) {
          provider = new (sc as any).ScProvider(chainSpec);
        } else if ((sc as any).createScProvider) {
          provider = (sc as any).createScProvider(chainSpec);
        } else if ((sc as any).default) {
          provider = new (sc as any).default(chainSpec);
        } else {
          throw new Error('Light client provider not available in @substrate/connect');
        }

        if (typeof provider.connect === 'function') {
          await provider.connect();
        }

        const { ApiPromise } = await import('@polkadot/api');
        const apiInst = await ApiPromise.create({ provider: provider as unknown as any });
        if (!mounted) return;
        setApi(apiInst);
        await apiInst.isReady;
        if (!mounted) return;
        setIsReady(true);
      } catch (e) {
        if (!mounted) return;
        setError(e);
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


