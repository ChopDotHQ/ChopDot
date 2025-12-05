/**
 * Pots Debug Component (Dev Only)
 * 
 * Compares pot counts from UI state vs Data Layer.
 * Only renders in development mode.
 */

import { useEffect, useState } from 'react';
import { usePots } from '../hooks/usePots';
import type { Pot } from '../schema/pot';

interface PotsDebugProps {
  uiPots: Pot[]; // Pot from App.tsx (compatible with schema/pot.ts Pot)
}

/**
 * Dev-only debug panel comparing UI state vs Data Layer
 */
export function PotsDebug({ uiPots }: PotsDebugProps) {
  const dl = usePots();
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<'checking' | 'match' | 'mismatch'>('checking');

  // Delay rendering to avoid race conditions with initial migration
  useEffect(() => {
    // Wait for next frame to ensure App state hydration is complete
    const timer = setTimeout(() => {
      setMounted(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Compare counts and IDs when both are ready
  useEffect(() => {
    if (!mounted) return;

    const uiCount = uiPots.length;
    const dlCount = dl.pots.length;

    if (uiCount === dlCount) {
      // Check if IDs match
      const uiIds = new Set(uiPots.map(p => p.id).sort());
      const dlIds = new Set(dl.pots.map(p => p.id).sort());

      const idsMatch = 
        uiIds.size === dlIds.size &&
        Array.from(uiIds).every(id => dlIds.has(id));

      if (idsMatch) {
        setStatus('match');
      } else {
        setStatus('mismatch');
        
        // Log diff
        const missingInDL = Array.from(uiIds).filter(id => !dlIds.has(id));
        const extraInDL = Array.from(dlIds).filter(id => !uiIds.has(id));
        
        console.warn('[PotsDebug] Pot ID mismatch:', {
          uiCount,
          dlCount,
          missingInDL,
          extraInDL,
        });
      }
    } else {
      setStatus('mismatch');
      
      // Log count diff
      const uiIds = new Set(uiPots.map(p => p.id).sort());
      const dlIds = new Set(dl.pots.map(p => p.id).sort());
      const missingInDL = Array.from(uiIds).filter(id => !dlIds.has(id));
      const extraInDL = Array.from(dlIds).filter(id => !uiIds.has(id));
      
      console.warn('[PotsDebug] Pot count mismatch:', {
        uiCount: uiCount,
        dlCount: dlCount,
        missingInDL,
        extraInDL,
      });
    }
  }, [mounted, uiPots, dl.pots]);

  // Only render in dev mode
  if (!import.meta.env.DEV) {
    return null;
  }

  if (!mounted) {
    return null; // Don't show until after initial hydration
  }

  const uiCount = uiPots.length;
  const dlCount = dl.pots.length;
  const isMatch = status === 'match';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: isMatch ? '#10b981' : '#ef4444',
        color: 'white',
        padding: '8px 12px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        borderTop: '1px solid rgba(255, 255, 255, 0.2)',
      }}
    >
      <span>UI Pots: {uiCount}</span>
      <span>|</span>
      <span>DL Pots: {dlCount}</span>
      <span>|</span>
      <span>Status: {isMatch ? '✅' : '❌'}</span>
    </div>
  );
}
