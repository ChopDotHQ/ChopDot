/**
 * useSettlementActions - MVP stub (on-chain settlement removed)
 * 
 * In MVP, settlements are recorded offline in Supabase only.
 * No blockchain proof or on-chain anchoring.
 */

import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Pot, Settlement } from '../types/app';
import type { SettlementResult } from '../nav';

export type SettlementPotBreakdown = {
  potId: string;
  potName: string;
  amount: number;
};

export type SettleHomeSettlement = {
  id: string;
  name: string;
  totalAmount: number;
  direction: 'owe' | 'owed';
  pots: SettlementPotBreakdown[];
};

interface UseSettlementActionsParams {
  potService: any;
  pots: Pot[];
  setPots: Dispatch<SetStateAction<Pot[]>>;
  settlements: Settlement[];
  setSettlements: Dispatch<SetStateAction<Settlement[]>>;
  currentPotId: string | null;
  userId: string | undefined;
  currentUserAddress: string | null;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  back: () => void;
  replace: (screen: any) => void;
  notifyPotRefresh: () => void;
}

export const useSettlementActions = (deps: UseSettlementActionsParams) => {
  const { showToast, back, notifyPotRefresh } = deps;

  const confirmSettlement = useCallback(async (_params: {
    method: 'cash' | 'bank' | 'paypal' | 'twint';
    reference?: string;
    settlement: SettleHomeSettlement;
  }): Promise<SettlementResult | null> => {
    // MVP: mark settlement as confirmed in Supabase (offline)
    showToast('Settlement recorded', 'success');
    notifyPotRefresh();
    back();
    return null;
  }, [showToast, notifyPotRefresh, back]);

  const retrySettlementProof = useCallback(async (_settlementId: string) => {
    showToast('Retry not available in MVP', 'info');
  }, [showToast]);

  return {
    confirmSettlement,
    retrySettlementProof,
  };
};
