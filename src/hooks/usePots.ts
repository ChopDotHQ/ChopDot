import { useEffect, useState, useRef, useCallback } from 'react';
import { useData } from '../services/data/DataContext';
import type { Pot } from '../services/data/types';

let globalRefreshTrigger = 0;

export interface UsePotsResult {
  pots: Pot[];
  loading: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function usePots(pageSize = 10): UsePotsResult {
  const { pots: potService } = useData();
  const [pots, setPots] = useState<Pot[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const refreshTriggerRef = useRef(0);

  // Initial load
  const loadPots = useCallback(async (isRefresh = false) => {
    try {
      setLoading(true);
      
      const currentOffset = isRefresh ? 0 : offset;
      
      const newPots = await potService.listPots({ 
        limit: pageSize, 
        offset: currentOffset 
      });
      
      if (isRefresh) {
        setPots(newPots);
        setOffset(pageSize);
      } else {
        setPots(prev => {
          // De-duplicate in case of race conditions
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueNewPots = newPots.filter(p => !existingIds.has(p.id));
          return [...prev, ...uniqueNewPots];
        });
        setOffset(prev => prev + pageSize);
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
      setLoading(false);
    }
  }, [potService, offset, pageSize]);

  // Handle load more
  const loadMore = async () => {
    if (!loading && hasMore) {
      await loadPots(false);
    }
  };

  // Handle refresh
  const refresh = async () => {
    await loadPots(true);
  };

  // Initial fetch
  useEffect(() => {
    loadPots(true); // Treat initial load as a refresh (start from 0)
  }, []); // Only run once on mount (deps empty intentionally, loadPots handles logic)

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
    refresh
  };
}

export function refreshPots(): void {
  globalRefreshTrigger++;
  window.dispatchEvent(new CustomEvent('pots-refresh'));
}
