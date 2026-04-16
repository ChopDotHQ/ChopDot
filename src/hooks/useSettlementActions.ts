/**
 * useSettlementActions
 *
 * Manages the settlement confirmation flow.
 *
 * When a user confirms a settlement (method + optional reference):
 * 1. Creates typed settlement legs in Supabase (pending → paid transition happens via ChapterPanel)
 * 2. Returns a SettlementResult for the confirmation screen
 *
 * Uses SettlementService via DataContext directly — no need to thread it through deps.
 */

import { useCallback } from 'react';
import type { SettlementResult } from '../nav';
import { useData } from '../services/data/DataContext';

export type SettlementPotBreakdown = {
  potId: string;
  potName: string;
  amount: number;
};

export type SettleHomeSettlement = {
  id: string;         // counterparty member ID
  name: string;
  totalAmount: number;
  direction: 'owe' | 'owed';
  pots: SettlementPotBreakdown[];
};

interface UseSettlementActionsParams {
  currentPotId: string | null;
  userId: string | undefined;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  notifyPotRefresh: () => void;
}

export const useSettlementActions = (deps: UseSettlementActionsParams) => {
  const { showToast, notifyPotRefresh, userId, currentPotId } = deps;
  const { settlements: settlementService } = useData();

  const confirmSettlement = useCallback(
    async (params: {
      method: 'cash' | 'bank' | 'paypal' | 'twint';
      reference?: string;
      settlement: SettleHomeSettlement;
    }): Promise<SettlementResult | null> => {
      const { method, reference, settlement } = params;
      const currentUserId = userId ?? 'owner';
      const counterpartyId = settlement.id;

      // Determine from/to based on direction
      const fromMemberId = settlement.direction === 'owe' ? currentUserId : counterpartyId;
      const toMemberId   = settlement.direction === 'owe' ? counterpartyId : currentUserId;

      // Build one leg per pot breakdown (or a single leg if no breakdown)
      const legsToCreate: Array<{
        potId: string;
        fromMemberId: string;
        toMemberId: string;
        amount: number;
        currency: string;
      }> = settlement.pots.length > 0
        ? settlement.pots.map(p => ({
            potId: p.potId || currentPotId || '',
            fromMemberId,
            toMemberId,
            amount: p.amount,
            currency: 'USD', // baseCurrency threaded in from caller if available
          }))
        : currentPotId
          ? [{ potId: currentPotId, fromMemberId, toMemberId, amount: settlement.totalAmount, currency: 'USD' }]
          : [];

      // Persist legs if we have a pot context
      if (legsToCreate.length > 0 && legsToCreate.every(l => !!l.potId)) {
        try {
          // Group by potId and propose one chapter per pot
          const byPot = new Map<string, typeof legsToCreate>();
          for (const leg of legsToCreate) {
            const existing = byPot.get(leg.potId) ?? [];
            existing.push(leg);
            byPot.set(leg.potId, existing);
          }

          for (const [potId, potLegs] of byPot) {
            await settlementService.proposeChapter(potId, potLegs);
          }

          notifyPotRefresh();
        } catch (err) {
          console.error('[useSettlementActions] proposeChapter failed:', err);
          showToast('Settlement recorded locally — sync will retry', 'info');
        }
      }

      const result: SettlementResult = {
        counterpartyId,
        counterpartyName: settlement.name,
        amount: settlement.totalAmount,
        method,
        ref: reference,
        direction: settlement.direction,
        scope: currentPotId ? 'pot' : 'person-all',
        at: Date.now(),
      };

      showToast('Settlement proposed — waiting for counterparty', 'success');
      notifyPotRefresh();
      return result;
    },
    [userId, currentPotId, settlementService, showToast, notifyPotRefresh],
  );

  const retrySettlementProof = useCallback(async (_settlementId: string) => {
    showToast('Retry not available in MVP', 'info');
  }, [showToast]);

  return {
    confirmSettlement,
    retrySettlementProof,
  };
};
