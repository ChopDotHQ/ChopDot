import { createContext, useContext, useState, ReactNode } from 'react';
import { getFlag, setFlag as setFlagModule, resetFlags as resetFlagsModule, FlagKey } from '../utils/flags';

export type FeatureFlags = {
  DEMO_MODE: boolean;
  SERVICE_FEE_CAP_BPS: number;
};

type FeatureFlagsContextValue = FeatureFlags & {
  setFlag: <T>(key: FlagKey, value: T) => void;
  resetFlags: () => void;
};

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

export function FeatureFlagsProvider(props: { children: ReactNode }) {
  const [flags] = useState<FeatureFlags>(() => {
    try {
      return {
        DEMO_MODE: getFlag<boolean>('DEMO_MODE'),
        SERVICE_FEE_CAP_BPS: getFlag<number>('SERVICE_FEE_CAP_BPS'),
      };
    } catch {
      return { DEMO_MODE: false, SERVICE_FEE_CAP_BPS: 250 };
    }
  });

  const contextValue: FeatureFlagsContextValue = {
    ...flags,
    setFlag: setFlagModule,
    resetFlags: resetFlagsModule,
  };

  return (
    <FeatureFlagsContext.Provider value={contextValue}>
      {props.children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags(): FeatureFlagsContextValue {
  const context = useContext(FeatureFlagsContext);
  if (context === null) throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
  return context;
}
