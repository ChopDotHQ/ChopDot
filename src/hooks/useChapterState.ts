import { useState, useEffect, useCallback } from 'react';
import type { SettlementLeg, PotStatus } from '../types/app';
import { useData } from '../services/data/DataContext';
import { deriveChapterStatus } from '../services/data/services/SettlementService';

interface UseChapterStateParams {
  potId?: string;
  currentUserId: string;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

interface UseChapterStateResult {
  legs: SettlementLeg[];
  chapterStatus: PotStatus;
  isLoading: boolean;
  error: string | null;
  /** Payer: transition pending → paid */
  markPaid: (legId: string, method: SettlementLeg['method'], reference?: string) => Promise<void>;
  /** Receiver: transition paid → confirmed */
  confirmReceipt: (legId: string) => Promise<void>;
  /** Reload legs from backend */
  refresh: () => Promise<void>;
  /** True if there is an open chapter (at least one leg not yet confirmed) */
  hasOpenChapter: boolean;
}

export function useChapterState({
  potId,
  currentUserId,
  onShowToast,
}: UseChapterStateParams): UseChapterStateResult {
  const { settlements: settlementService } = useData();
  const [legs, setLegs] = useState<SettlementLeg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!potId) return;
    setIsLoading(true);
    setError(null);
    try {
      const fetched = await settlementService.getChapterLegs(potId);
      if (signal?.aborted) return;
      setLegs(fetched);
    } catch (err) {
      if (signal?.aborted) return;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      console.warn('[useChapterState] Failed to load legs:', err);
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [potId, settlementService]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const markPaid = useCallback(
    async (legId: string, method: SettlementLeg['method'], reference?: string) => {
      if (!potId) return;
      try {
        const updated = await settlementService.markPaid(legId, potId, method, reference);
        setLegs(prev => prev.map(l => (l.id === legId ? updated : l)));
        onShowToast?.('Payment recorded — waiting for confirmation', 'success');
      } catch (err) {
        console.error('[useChapterState] markPaid failed:', err);
        onShowToast?.('Failed to record payment', 'error');
      }
    },
    [potId, settlementService, onShowToast],
  );

  const confirmReceipt = useCallback(
    async (legId: string) => {
      if (!potId) return;
      const leg = legs.find(l => l.id === legId);
      if (leg && leg.toMemberId !== currentUserId) {
        onShowToast?.('Only the recipient can confirm this payment', 'info');
        return;
      }
      try {
        const updated = await settlementService.confirmReceipt(legId, potId);
        const updatedLegs = legs.map(l => (l.id === legId ? updated : l));
        setLegs(updatedLegs);

        if (updatedLegs.every(l => l.status === 'confirmed')) {
          onShowToast?.('Chapter closed — all payments confirmed', 'success');
        } else {
          onShowToast?.('Payment confirmed', 'success');
        }
      } catch (err) {
        console.error('[useChapterState] confirmReceipt failed:', err);
        onShowToast?.('Failed to confirm payment', 'error');
      }
    },
    [potId, legs, currentUserId, settlementService, onShowToast],
  );

  const chapterStatus = deriveChapterStatus(legs);
  const hasOpenChapter = legs.length > 0 && chapterStatus !== 'completed' && chapterStatus !== 'cancelled';

  return {
    legs,
    chapterStatus,
    isLoading,
    error,
    markPaid,
    confirmReceipt,
    refresh: () => load(),
    hasOpenChapter,
  };
}
