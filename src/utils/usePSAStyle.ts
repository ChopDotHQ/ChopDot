/**
 * PSA STYLE UTILITY HOOK
 * 
 * Provides utilities for applying Polkadot Second Age (PSA) glassmorphism styles
 * conditionally based on the current brand variant setting.
 * 
 * Usage:
 * ```tsx
 * const { isPSA, psaStyles, psaClasses } = usePSAStyle();
 * 
 * <div
 *   className={isPSA ? psaClasses.panel : 'card'}
 *   style={isPSA ? psaStyles.panel : undefined}
 * >
 *   Content
 * </div>
 * ```
 */

import { useMemo } from 'react';
import { useTheme } from './useTheme';
import type { CSSProperties } from 'react';

export interface PSAStyles {
  panel: CSSProperties;
  card: CSSProperties;
  cardHover: CSSProperties;
  guestCard: CSSProperties;
  background: CSSProperties;
  pinkAccentButton: CSSProperties;
  pinkAccentButtonHover: CSSProperties;
}

export interface PSAClasses {
  panel: string;
  card: string;
  guestCard: string;
}

export function usePSAStyle() {
  const { brandVariant, resolvedTheme } = useTheme();
  const isPSA = brandVariant === 'polkadot-second-age';
  const isDark = resolvedTheme === 'dark';

  const psaStyles = useMemo<PSAStyles>(() => {
    if (!isPSA) {
      return {
        panel: {},
        card: {},
        cardHover: {},
        guestCard: {},
        background: {},
        pinkAccentButton: {},
        pinkAccentButtonHover: {},
      };
    }

    if (isDark) {
      return {
        panel: {
          background: 'rgba(255, 255, 255, 0.15)',
          borderColor: 'rgba(255, 255, 255, 0.35)',
          boxShadow:
            '0 10px 40px rgba(0, 0, 0, 0.25), 0 0 20px rgba(255, 40, 103, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.5), inset 0 -1px 20px rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        },
        card: {
          background: 'rgba(255, 255, 255, 0.14)',
          borderColor: 'rgba(255, 255, 255, 0.3)',
          boxShadow:
            '0 4px 16px rgba(0, 0, 0, 0.3), 0 0 8px rgba(255, 40, 103, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.5), inset 0 -1px 10px rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        },
        cardHover: {
          background: 'rgba(255, 255, 255, 0.22)',
          boxShadow:
            '0 6px 20px rgba(0, 0, 0, 0.35), 0 0 12px rgba(255, 40, 103, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.6), inset 0 -1px 10px rgba(255, 255, 255, 0.2)',
        },
        guestCard: {
          background: 'rgba(255, 255, 255, 0.08)',
          borderColor: 'rgba(255, 255, 255, 0.3)',
          boxShadow:
            '0 2px 8px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(20px) saturate(150%)',
          WebkitBackdropFilter: 'blur(20px) saturate(150%)',
        },
        background: {
          backgroundColor: '#0A0A0A',
          backgroundImage: `url('/assets/background-polka-a_inverted.png'), radial-gradient(ellipse at 20% 50%, rgba(255, 255, 255, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(255, 255, 255, 0.06) 0%, transparent 50%), radial-gradient(ellipse at 40% 20%, rgba(255, 255, 255, 0.04) 0%, transparent 50%), linear-gradient(135deg, #050505 0%, #0A0A0A 50%, #050505 100%)`,
          backgroundSize: 'cover, 100% 100%, 100% 100%, 100% 100%, 100% 100%',
          backgroundPosition: 'center, 0% 0%, 100% 100%, 50% 50%, 0% 0%',
          color: '#FAFAF9',
        },
        pinkAccentButton: {
          background: 'rgba(255, 40, 103, 0.95)',
          borderColor: 'rgba(255, 40, 103, 1)',
          borderWidth: '1px',
          borderStyle: 'solid',
          boxShadow:
            '0 4px 16px rgba(255, 40, 103, 0.5), 0 0 12px rgba(255, 40, 103, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.6), inset 0 -1px 10px rgba(255, 40, 103, 0.35)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        },
        pinkAccentButtonHover: {
          background: 'rgba(255, 40, 103, 1)',
          boxShadow:
            '0 6px 20px rgba(255, 40, 103, 0.6), 0 0 16px rgba(255, 40, 103, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.7), inset 0 -1px 10px rgba(255, 40, 103, 0.4)',
        },
      };
    } else {
      return {
        panel: {
          background: 'rgba(255, 255, 255, 0.3)',
          borderColor: 'rgba(255, 255, 255, 0.5)',
          boxShadow:
            '0 10px 40px rgba(0, 0, 0, 0.12), 0 0 20px rgba(255, 40, 103, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.9), inset 0 -1px 20px rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        },
        card: {
          background: 'rgba(255, 255, 255, 0.7)',
          borderColor: 'rgba(255, 255, 255, 0.8)',
          boxShadow:
            '0 4px 16px rgba(0, 0, 0, 0.15), 0 0 8px rgba(255, 40, 103, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.95), inset 0 -1px 10px rgba(255, 255, 255, 0.3)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        },
        cardHover: {
          background: 'rgba(255, 255, 255, 0.85)',
          boxShadow:
            '0 6px 20px rgba(0, 0, 0, 0.18), 0 0 12px rgba(255, 40, 103, 0.12), inset 0 1px 1px rgba(255, 255, 255, 1), inset 0 -1px 10px rgba(255, 255, 255, 0.4)',
        },
        guestCard: {
          background: 'rgba(0, 0, 0, 0.05)',
          borderColor: 'rgba(0, 0, 0, 0.2)',
          boxShadow:
            '0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px) saturate(150%)',
          WebkitBackdropFilter: 'blur(20px) saturate(150%)',
        },
        background: {
          backgroundColor: '#FAFAF9',
          backgroundImage: `url('/assets/background-polka-a.png'), radial-gradient(ellipse at 20% 50%, rgba(0, 0, 0, 0.03) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(0, 0, 0, 0.02) 0%, transparent 50%), radial-gradient(ellipse at 40% 20%, rgba(0, 0, 0, 0.01) 0%, transparent 50%), linear-gradient(135deg, #F5F5F5 0%, #FAFAF9 50%, #F5F5F5 100%)`,
          backgroundSize: 'cover, 100% 100%, 100% 100%, 100% 100%, 100% 100%',
          backgroundPosition: 'center, 0% 0%, 100% 100%, 50% 50%, 0% 0%',
          color: '#1C1917',
        },
        pinkAccentButton: {
          background: 'rgba(255, 40, 103, 0.98)',
          borderColor: 'rgba(255, 40, 103, 1)',
          borderWidth: '1px',
          borderStyle: 'solid',
          boxShadow:
            '0 4px 16px rgba(255, 40, 103, 0.45), 0 0 12px rgba(255, 40, 103, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.8), inset 0 -1px 10px rgba(255, 40, 103, 0.3)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        },
        pinkAccentButtonHover: {
          background: 'rgba(255, 40, 103, 1)',
          boxShadow:
            '0 6px 20px rgba(255, 40, 103, 0.55), 0 0 16px rgba(255, 40, 103, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.9), inset 0 -1px 10px rgba(255, 40, 103, 0.35)',
        },
      };
    }
  }, [isPSA, isDark]);

  const psaClasses = useMemo<PSAClasses>(() => {
    if (!isPSA) {
      return {
        panel: 'card',
        card: 'card',
        guestCard: 'card',
      };
    }

    return {
      panel: 'psa-glass-panel',
      card: 'psa-glass-card',
      guestCard: 'psa-glass-guest-card',
    };
  }, [isPSA]);

  return {
    isPSA,
    psaStyles,
    psaClasses,
  };
}
