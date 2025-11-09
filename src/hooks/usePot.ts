/**
 * usePot Hook
 * 
 * Hook to fetch a single pot via data layer service.
 * Supports refresh functionality for Step 5b.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useData } from '../services/data/DataContext';
import type { Pot } from '../services/data/types';
import { warnDev, logDev } from '../utils/logDev';

// Global refresh trigger per pot ID
const globalRefreshTriggers = new Map<string, number>();

export interface UsePotResult {
  pot: Pot | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Hook to fetch a single pot via data layer service
 * 
 * @param potId - Pot ID to fetch
 * @returns Object with pot, loading state, error, and refresh function
 */
export function usePot(potId: string | null | undefined): UsePotResult {
  const { pots: potService } = useData();
  const [pot, setPot] = useState<Pot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const refreshTriggerRef = useRef(0);

  const loadPot = useCallback(async () => {
    if (!potId) {
      setPot(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await potService.getPot(potId);
      setPot(data);
      setLoading(false);
      
      // Dev-only logging
      if (import.meta.env.DEV) {
        logDev('[usePot] Loaded pot via data layer', { potId, potName: data.name });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setPot(null);
      setLoading(false);
      
      // Dev-only warning
      if (import.meta.env.DEV) {
        warnDev('[usePot] Failed to load pot', { potId, error });
      }
    }
  }, [potService, potId]);

  // Initial load
  useEffect(() => {
    if (potId) {
      refreshTriggerRef.current = globalRefreshTriggers.get(potId) || 0;
    }
    loadPot();
  }, [loadPot, potId]);

  // Listen for refresh events
  useEffect(() => {
    if (!potId) return;

    const handleRefresh = (event: CustomEvent<{ potId: string }>) => {
      if (event.detail.potId === potId) {
        refreshTriggerRef.current = globalRefreshTriggers.get(potId) || 0;
        loadPot();
      }
    };

    window.addEventListener('pot-refresh', handleRefresh as EventListener);
    return () => {
      window.removeEventListener('pot-refresh', handleRefresh as EventListener);
    };
  }, [loadPot, potId]);

  const refresh = useCallback(() => {
    if (!potId) return;
    
    if (import.meta.env.DEV) {
      logDev('[usePot] Refreshing pot', { potId });
    }
    
    const current = globalRefreshTriggers.get(potId) || 0;
    globalRefreshTriggers.set(potId, current + 1);
    refreshTriggerRef.current = current + 1;
    
    // Dispatch refresh event
    window.dispatchEvent(new CustomEvent('pot-refresh', { detail: { potId } }));
    
    // Also trigger load directly
    loadPot();
  }, [loadPot, potId]);

  return { pot, loading, error, refresh };
}

/**
 * Trigger a refresh of a specific pot
 * Dev-only utility for Step 5b testing
 */
export function refreshPot(potId: string): void {
  if (import.meta.env.DEV) {
    const current = globalRefreshTriggers.get(potId) || 0;
    globalRefreshTriggers.set(potId, current + 1);
    window.dispatchEvent(new CustomEvent('pot-refresh', { detail: { potId } }));
  }
}

