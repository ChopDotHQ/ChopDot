import { useState, useEffect, useCallback, useRef } from 'react';
import type { PotEvent, PotEventType } from '../types/app';

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';

async function fetchEvents(potId: string): Promise<PotEvent[]> {
  const res = await fetch(`${API_BASE}/api/pots/${potId}/events`);
  if (!res.ok) throw new Error(`[useEventFeed] ${res.status}`);
  const raw = await res.json() as Array<{
    id: string;
    type: string;
    actorId: string;
    meta?: Record<string, unknown>;
    createdAt: string;
  }>;
  return raw.map(e => ({
    id: e.id,
    type: e.type as PotEventType,
    actorId: e.actorId,
    meta: e.meta,
    timestamp: e.createdAt,
  }));
}

export function useEventFeed(potId?: string) {
  const [events, setEvents] = useState<PotEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!potId) return;
    setIsLoading(true);
    setError(null);
    try {
      const fetched = await fetchEvents(potId);
      if (signal?.aborted) return;
      setEvents(fetched);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [potId]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);

    function scheduleNext() {
      timerRef.current = setTimeout(() => {
        if (!controller.signal.aborted && document.visibilityState === 'visible') {
          load(controller.signal);
        }
        scheduleNext();
      }, 30_000);
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible' && !controller.signal.aborted) {
        load(controller.signal);
      }
    }

    scheduleNext();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      controller.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [load]);

  return { events, isLoading, error, refresh: () => load() };
}
