/**
 * useSettleConfirm - MVP stub
 *
 * In MVP, settlements are confirmed offline only.
 */

import { useState } from 'react';

export interface SettlementModalState {
  fromMemberId: string;
  toMemberId: string;
  fromName: string;
  toName: string;
  amount?: number;
}

interface UseSettleConfirmParams {
  potHistory?: unknown[];
  onUpdatePot?: (updates: unknown) => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export function useSettleConfirm(params: UseSettleConfirmParams) {
  const { onShowToast } = params;
  const [settlementModal, setSettlementModal] = useState<SettlementModalState | null>(null);
  const [isSending] = useState(false);

  const handleSettleConfirm = async () => {
    setSettlementModal(null);
    onShowToast?.('Settlement recorded', 'success');
  };

  const handleSettleCancel = () => {
    setSettlementModal(null);
  };

  return {
    settlementModal,
    isSending,
    setSettlementModal,
    handleSettleConfirm,
    handleSettleCancel,
  };
}
