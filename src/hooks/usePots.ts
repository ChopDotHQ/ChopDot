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
  const { user, isLoading: authLoading } = useAuth();
  const dataSourceType = import.meta.env.VITE_DATA_SOURCE || 'local';
  const usingSupabase = dataSourceType === 'supabase';
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
    if (usingSupabase && authLoading) {
      setLoading(true);
      return;
    }
    if (usingSupabase && !user) {
      if (isRefresh) {
        setPots([]);
        setSummaries({});
        setOffset(0);
        setHasMore(false);
      }
      setLoading(false);
      return;
    }
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
      const summaryPotIds = usingSupabase
        ? potIds.filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
        : potIds;
      let summaryBatch: Record<string, ExpenseSummary> = {};
      if (summaryPotIds.length > 0) {
        try {
          summaryBatch = await expenseService.getExpenseSummaries(summaryPotIds, summaryUserId);
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
      
    } catch (error) {
      console.error('[usePots] Failed to load pots:', error);
      if (isRefresh) setPots([]);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [usingSupabase, authLoading, user, potService, expenseService, offset, pageSize, summaryUserId]);

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
    return () => {
      // Reset fetch guard so React StrictMode's second invocation (or re-mount after
      // auth scope change) isn't blocked by a stale isFetchingRef from the first run.
      isFetchingRef.current = false;
    };
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
