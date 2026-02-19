import { useEffect, useState, useRef, useCallback } from 'react';
import { useData } from '../services/data/DataContext';
import type { ExpenseSummary, Pot } from '../services/data/types';
import { useAuth } from '../contexts/AuthContext';

let globalRefreshTrigger = 0;

export interface UsePotsResult {
  pots: Pot[];
  loading: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  summaries: Record<string, ExpenseSummary>;
}

export function usePots(pageSize = 10): UsePotsResult {
  const { pots: potService, expenses: expenseService } = useData();
  const { user } = useAuth();
  const summaryUserId = user?.id ?? 'owner';
  const authScopeKey = `${user?.authMethod ?? 'none'}:${summaryUserId}`;
  const [pots, setPots] = useState<Pot[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [summaries, setSummaries] = useState<Record<string, ExpenseSummary>>({});
  const refreshTriggerRef = useRef(0);
  const isFetchingRef = useRef(false);

  // Initial load
  const loadPots = useCallback(async (isRefresh = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setLoading(true);
      
      const currentOffset = isRefresh ? 0 : offset;
      
      const newPots = await potService.listPots({ 
        limit: pageSize, 
        offset: currentOffset 
      });
      
      const potIds = newPots.map((pot) => pot.id);
      let summaryBatch: Record<string, ExpenseSummary> = {};
      if (potIds.length > 0) {
        try {
          summaryBatch = await expenseService.getExpenseSummaries(potIds, summaryUserId);
        } catch (summaryError) {
          console.warn('[usePots] Failed to load expense summaries:', summaryError);
        }
      }

      if (isRefresh) {
        setPots(newPots);
        setOffset(pageSize);
        setSummaries(summaryBatch);
      } else {
        setPots(prev => {
          // De-duplicate in case of race conditions
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueNewPots = newPots.filter(p => !existingIds.has(p.id));
          return [...prev, ...uniqueNewPots];
        });
        setOffset(prev => prev + pageSize);
        setSummaries(prev => ({ ...prev, ...summaryBatch }));
      }
      
      // Determine if there are more
      // Simple heuristic: if we got fewer than requested, we're at the end
      setHasMore(newPots.length === pageSize);
      
      if (import.meta.env.DEV) {
        console.log(`[usePots] Loaded ${newPots.length} pots (offset: ${currentOffset})`);
      }
    } catch (error) {
      console.error('[usePots] Failed to load pots:', error);
      if (isRefresh) setPots([]);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [potService, expenseService, offset, pageSize, summaryUserId]);

  // Handle load more
  const loadMore = async () => {
    if (!loading && hasMore && !isFetchingRef.current) {
      await loadPots(false);
    }
  };

  // Handle refresh
  const refresh = async () => {
    await loadPots(true);
  };

  // Initial fetch
  useEffect(() => {
    // Critical: reset and refetch whenever auth scope changes.
    // Without this, guest/local pot data can persist after sign-in.
    setPots([]);
    setSummaries({});
    setOffset(0);
    setHasMore(true);
    loadPots(true); // Treat initial load as a refresh (start from 0)
    // Intentionally keyed by auth scope only.
    // loadPots depends on offset/pageSize and would cause unnecessary loops here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authScopeKey]);

  // Listen for global refresh events (e.g. after creating a pot)
  useEffect(() => {
    const handleGlobalRefresh = () => {
      if (refreshTriggerRef.current !== globalRefreshTrigger) {
        refreshTriggerRef.current = globalRefreshTrigger;
        refresh();
      }
    };

    window.addEventListener('pots-refresh', handleGlobalRefresh);
    return () => {
      window.removeEventListener('pots-refresh', handleGlobalRefresh);
    };
  }, [refresh]);

  return {
    pots,
    loading,
    hasMore,
    loadMore,
    refresh,
    summaries,
  };
}

export function refreshPots(): void {
  globalRefreshTrigger++;
  window.dispatchEvent(new CustomEvent('pots-refresh'));
}
