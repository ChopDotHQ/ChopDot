/**
 * useChapterState
 *
 * Loads and manages the open chapter (settlement legs) for a pot.
 *
 * Responsibilities:
 * - Fetches typed settlement legs from Supabase
 * - Derives chapter status (active / partially_settled / completed)
 * - Provides markPaid and confirmReceipt actions
 * - Keeps legs in sync with Supabase on action
 *
 * Usage:
 *   const { legs, chapterStatus, markPaid, confirmReceipt, isLoading } = useChapterState({ potId, currentUserId, settlements });
 */

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
  /** Payer: transition pending → paid */
  markPaid: (legId: string, method: SettlementLeg['method'], reference?: string) => Promise<void>;
  /** Receiver: transition paid → confirmed */
  confirmReceipt: (legId: string) => Promise<void>;
  /** Reload legs from Supabase */
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

  const load = useCallback(async () => {
    if (!potId) return;
    setIsLoading(true);
    try {
      const fetched = await settlementService.getChapterLegs(potId);
      // Most recent legs first, show only the "current chapter"
      // (legs not yet confirmed — all pending/paid)
      setLegs(fetched);
    } catch (err) {
      console.warn('[useChapterState] Failed to load legs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [potId, settlementService]);

  useEffect(() => {
    load();
  }, [load]);

  const markPaid = useCallback(
    async (legId: string, method: SettlementLeg['method'], reference?: string) => {
      try {
        const updated = await settlementService.markPaid(legId, method, reference);
        setLegs(prev => prev.map(l => (l.id === legId ? updated : l)));
        onShowToast?.('Payment recorded — waiting for confirmation', 'success');
      } catch (err) {
        console.error('[useChapterState] markPaid failed:', err);
        onShowToast?.('Failed to record payment', 'error');
      }
    },
    [settlementService, onShowToast],
  );

  const confirmReceipt = useCallback(
    async (legId: string) => {
      // Guard: only the receiver (toMemberId) should confirm
      const leg = legs.find(l => l.id === legId);
      if (leg && leg.toMemberId !== currentUserId) {
        onShowToast?.('Only the recipient can confirm this payment', 'info');
        return;
      }
      try {
        const updated = await settlementService.confirmReceipt(legId);
        setLegs(prev => prev.map(l => (l.id === legId ? updated : l)));

        const allConfirmed = legs
          .map(l => (l.id === legId ? updated : l))
          .every(l => l.status === 'confirmed');

        if (allConfirmed) {
          onShowToast?.('Chapter closed — all payments confirmed', 'success');
        } else {
          onShowToast?.('Payment confirmed', 'success');
        }
      } catch (err) {
        console.error('[useChapterState] confirmReceipt failed:', err);
        onShowToast?.('Failed to confirm payment', 'error');
      }
    },
    [legs, currentUserId, settlementService, onShowToast],
  );

  const chapterStatus = deriveChapterStatus(legs);
  const hasOpenChapter = legs.length > 0 && chapterStatus !== 'completed' && chapterStatus !== 'cancelled';

  return {
    legs,
    chapterStatus,
    isLoading,
    markPaid,
    confirmReceipt,
    refresh: load,
    hasOpenChapter,
  };
}
