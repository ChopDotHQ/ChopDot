/**
 * usePots Hook
 * 
 * Hook to fetch pots via data layer service.
 * Supports refresh functionality for Step 4.
 */

import { useEffect, useState, useRef } from 'react';
import { useData } from '../services/data/DataContext';
import type { Pot } from '../services/data/types';

// Global refresh trigger (simple approach for Step 4)
let globalRefreshTrigger = 0;

/**
 * Hook to fetch pots via data layer service
 * 
 * @returns Array of pots
 */
export function usePots(): Pot[] {
  const { pots: potService } = useData();
  const [pots, setPots] = useState<Pot[]>([]);
  const refreshTriggerRef = useRef(0);

  // Initial load
  useEffect(() => {
    refreshTriggerRef.current = globalRefreshTrigger;
    
    potService.listPots()
      .then(data => {
        setPots(data);
        
        // Dev-only logging
        if (import.meta.env.DEV) {
          console.log('[usePots] Loaded', data.length, 'pots via data layer');
        }
      })
      .catch(error => {
        console.error('[usePots] Failed to load pots:', error);
        setPots([]);
      });
  }, [potService]);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      refreshTriggerRef.current = globalRefreshTrigger;
      potService.listPots()
        .then(data => {
          setPots(data);
          if (import.meta.env.DEV) {
            console.log('[usePots] Refreshed, loaded', data.length, 'pots');
          }
        })
        .catch(error => {
          console.error('[usePots] Refresh failed:', error);
        });
    };

    window.addEventListener('pots-refresh', handleRefresh);
    return () => {
      window.removeEventListener('pots-refresh', handleRefresh);
    };
  }, [potService]);

  return pots;
}

/**
 * Trigger a refresh of all usePots hooks
 * Dev-only utility for Step 4 testing
 */
export function refreshPots(): void {
  if (import.meta.env.DEV) {
    globalRefreshTrigger++;
    // Force re-render by dispatching a custom event
    window.dispatchEvent(new CustomEvent('pots-refresh'));
  }
}

