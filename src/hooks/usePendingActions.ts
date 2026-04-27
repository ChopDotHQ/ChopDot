import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabase } from '../utils/supabase-client';

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';

export interface PendingActionSummary {
  potId: string;
  count: number;
  role: 'payer' | 'receiver';
}

async function fetchPendingActions(userId: string): Promise<PendingActionSummary[]> {
  const client = getSupabase();
  const headers: HeadersInit = {};
  if (client) {
    const { data } = await client.auth.getSession();
    const uid = data.session?.user?.id;
    if (uid) headers['x-user-id'] = uid;
  }
  const res = await fetch(`${API_BASE}/api/users/${encodeURIComponent(userId)}/pending-actions`, { headers });
  if (!res.ok) throw new Error(`[usePendingActions] ${res.status}`);
  return res.json() as Promise<PendingActionSummary[]>;
}

const POLL_INTERVAL = 30_000;

/**
 * Polls the backend every 30 s (when the tab is visible) to find pots where
 * the current user has a settlement action to take — either marking a payment
 * or confirming receipt.
 *
 * Returns a Map<potId, PendingActionSummary> for O(1) lookup in pot lists.
 */
export function usePendingActions(userId?: string) {
  const [actions, setActions] = useState<Map<string, PendingActionSummary>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const items = await fetchPendingActions(userId);
      setActions(new Map(items.map(i => [i.potId, i])));
    } catch {
      // Silently fail — badges are best-effort
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    load();

    function scheduleNext() {
      timerRef.current = setTimeout(() => {
        if (document.visibilityState === 'visible') load();
        scheduleNext();
      }, POLL_INTERVAL);
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') load();
    }

    scheduleNext();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [userId, load]);

  return { actions, refresh: load };
}
