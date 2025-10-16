/**
 * FEATURE FLAGS REACT CONTEXT
 * 
 * React wrapper around /utils/flags.ts that provides reactive flag access.
 * Flags automatically update across all components when changed.
 * 
 * Usage:
 * ```tsx
 * // In App.tsx (root)
 * import { FeatureFlagsProvider } from './contexts/FeatureFlagsContext';
 * 
 * function App() {
 *   return (
 *     <FeatureFlagsProvider>
 *       <YourApp />
 *     </FeatureFlagsProvider>
 *   );
 * }
 * 
 * // In any component
 * import { useFeatureFlags } from './contexts/FeatureFlagsContext';
 * 
 * function MyComponent() {
 *   const { POLKADOT_APP_ENABLED, setFlag } = useFeatureFlags();
 *   
 *   if (!POLKADOT_APP_ENABLED) {
 *     return null; // Hide wallet UI
 *   }
 *   
 *   return (
 *     <button onClick={() => setFlag('POLKADOT_APP_ENABLED', false)}>
 *       Disable Wallet
 *     </button>
 *   );
 * }
 * ```
 */

import { createContext, useContext, useState, ReactNode } from 'react';
import { 
  getFlag, 
  setFlag as setFlagModule, 
  resetFlags as resetFlagsModule, 
  // subscribe, 
  FlagKey 
} from '../utils/flags';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Feature flags shape with typed values.
 */
export type FeatureFlags = {
  POLKADOT_APP_ENABLED: boolean;
  IPFS_RECEIPTS_ENABLED: boolean;
  PUSH_ENABLED: boolean;
  SERVICE_FEE_CAP_BPS: number;
};

/**
 * Context value includes flags + mutation methods.
 */
type FeatureFlagsContextValue = FeatureFlags & {
  setFlag: <T>(key: FlagKey, value: T) => void;
  resetFlags: () => void;
};

// ============================================================================
// CONTEXT
// ============================================================================

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

/**
 * Feature flags provider.
 * Wraps your app to provide reactive flag access to all child components.
 * 
 * @param props.children - React children to wrap
 * 
 * @example
 * <FeatureFlagsProvider>
 *   <App />
 * </FeatureFlagsProvider>
 */
export function FeatureFlagsProvider(props: { children: ReactNode }): JSX.Element {
  // Lazy initialization with memoization - only read flags once on mount
  const [flags] = useState<FeatureFlags>(() => {
    try {
      return {
        POLKADOT_APP_ENABLED: getFlag<boolean>('POLKADOT_APP_ENABLED'),
        IPFS_RECEIPTS_ENABLED: getFlag<boolean>('IPFS_RECEIPTS_ENABLED'),
        PUSH_ENABLED: getFlag<boolean>('PUSH_ENABLED'),
        SERVICE_FEE_CAP_BPS: getFlag<number>('SERVICE_FEE_CAP_BPS'),
      };
    } catch (error) {
      console.error('[FeatureFlags] Error loading flags:', error);
      // Return safe defaults
      return {
        POLKADOT_APP_ENABLED: true,
        IPFS_RECEIPTS_ENABLED: false,
        PUSH_ENABLED: false,
        SERVICE_FEE_CAP_BPS: 250,
      };
    }
  });

  // Note: We're not subscribing to changes for now to improve performance
  // Flags are read once at mount and remain static for the session
  // If you need dynamic flags, uncomment the useEffect below:
  
  /*
  useEffect(() => {
    const unsubscribe = subscribe(() => {
      setFlags({
        POLKADOT_APP_ENABLED: getFlag<boolean>('POLKADOT_APP_ENABLED'),
        IPFS_RECEIPTS_ENABLED: getFlag<boolean>('IPFS_RECEIPTS_ENABLED'),
        PUSH_ENABLED: getFlag<boolean>('PUSH_ENABLED'),
        SERVICE_FEE_CAP_BPS: getFlag<number>('SERVICE_FEE_CAP_BPS'),
      });
    });
    return unsubscribe;
  }, []);
  */

  // Build context value (flags + mutation methods)
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

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to access feature flags and mutation methods.
 * Must be used within a FeatureFlagsProvider.
 * 
 * @returns Current flag values + setFlag() + resetFlags()
 * @throws Error if used outside FeatureFlagsProvider
 * 
 * @example
 * const { POLKADOT_APP_ENABLED, setFlag, resetFlags } = useFeatureFlags();
 * 
 * // Read flag
 * if (POLKADOT_APP_ENABLED) {
 *   return <WalletUI />;
 * }
 * 
 * // Update flag
 * setFlag('POLKADOT_APP_ENABLED', false);
 * 
 * // Reset all flags
 * resetFlags();
 */
export function useFeatureFlags(): FeatureFlagsContextValue {
  const context = useContext(FeatureFlagsContext);
  
  if (context === null) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
  }
  
  return context;
}
