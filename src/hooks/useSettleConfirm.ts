import { useState } from 'react';
import type { PotHistory } from '../types/app';
import type { TxStatus } from '../services/chain/adapter';
import { getChain } from '../services/chain';
import { buildSubscanUrl } from '../services/chain/utils';

export interface SettlementModalState {
  fromMemberId: string;
  toMemberId: string;
  fromAddress: string;
  toAddress: string;
  fromName: string;
  toName: string;
  amountDot?: number;
  amountUsdc?: number;
}

interface UseSettleConfirmParams {
  isUsdcPot: boolean;
  potHistory: PotHistory[];
  onUpdatePot?: (updates: { history?: PotHistory[]; lastCheckpoint?: unknown; lastEditAt?: string }) => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
  refreshBalance: () => Promise<void>;
}

interface UseSettleConfirmReturn {
  settlementModal: SettlementModalState | null;
  isSending: boolean;
  setSettlementModal: (modal: SettlementModalState | null) => void;
  handleSettleConfirm: () => Promise<void>;
  handleSettleCancel: () => void;
}

function generateSettlementId(): string {
  return `settlement-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useSettleConfirm({
  isUsdcPot,
  potHistory,
  onUpdatePot,
  onShowToast,
  refreshBalance,
}: UseSettleConfirmParams): UseSettleConfirmReturn {
  const [settlementModal, setSettlementModal] = useState<SettlementModalState | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handleSettleConfirm = async () => {
    if (!settlementModal || !onUpdatePot) return;

    setIsSending(true);

    try {
      let txHash: string | undefined;
      let blockHash: string | undefined;
      let status: 'in_block' | 'finalized' | 'failed' = 'in_block';

      const chain = await getChain();

      const statusHandler = (s: TxStatus, ctx?: { txHash?: string; blockHash?: string }) => {
        if (s === 'submitted') {
          onShowToast?.('Transaction submitted...', 'info');
        } else if (s === 'inBlock') {
          txHash = ctx?.txHash || txHash;
          blockHash = ctx?.blockHash || blockHash;
          status = 'in_block';
          onShowToast?.(`Transaction in block! ${txHash ? `Hash: ${txHash.slice(0, 8)}...` : ''}`, 'success');
        } else if (s === 'finalized') {
          status = 'finalized';
          blockHash = ctx?.blockHash || blockHash;
          onShowToast?.('Transaction finalized!', 'success');
        }
      };

      if (isUsdcPot && settlementModal.amountUsdc !== undefined) {
        await chain.sendUsdc({
          from: settlementModal.fromAddress,
          to: settlementModal.toAddress,
          amountUsdc: settlementModal.amountUsdc,
          onStatus: statusHandler,
        });

        if (!txHash) throw new Error('Transaction hash not received');

        const historyEntry: PotHistory = {
          id: generateSettlementId(),
          type: 'onchain_settlement',
          fromMemberId: settlementModal.fromMemberId,
          toMemberId: settlementModal.toMemberId,
          fromAddress: settlementModal.fromAddress,
          toAddress: settlementModal.toAddress,
          amountUsdc: settlementModal.amountUsdc.toFixed(6),
          amountDot: undefined,
          assetId: 1337,
          txHash,
          block: blockHash,
          status,
          when: Date.now(),
          subscan: buildSubscanUrl(txHash),
        } as PotHistory;

        onUpdatePot({ history: [historyEntry, ...potHistory] });
      } else if (settlementModal.amountDot !== undefined) {
        await chain.sendDot({
          from: settlementModal.fromAddress,
          to: settlementModal.toAddress,
          amountDot: settlementModal.amountDot,
          onStatus: statusHandler,
        });

        if (!txHash) throw new Error('Transaction hash not received');

        const historyEntry: PotHistory = {
          id: generateSettlementId(),
          type: 'onchain_settlement',
          fromMemberId: settlementModal.fromMemberId,
          toMemberId: settlementModal.toMemberId,
          fromAddress: settlementModal.fromAddress,
          toAddress: settlementModal.toAddress,
          amountDot: settlementModal.amountDot.toFixed(6),
          txHash,
          block: blockHash,
          status,
          when: Date.now(),
          subscan: buildSubscanUrl(txHash),
        };

        onUpdatePot({ history: [historyEntry, ...potHistory] });
      } else {
        throw new Error('No settlement amount provided');
      }

      try {
        await refreshBalance();
      } catch (refreshError) {
        console.error('[useSettleConfirm] Balance refresh failed:', refreshError);
      }

      setSettlementModal(null);
      setIsSending(false);
    } catch (error: unknown) {
      console.error('[useSettleConfirm] Settlement error:', error);
      setIsSending(false);

      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'USER_REJECTED') {
        onShowToast?.('Transaction cancelled', 'info');
      } else if (message.includes('Insufficient')) {
        onShowToast?.('Insufficient balance for transaction', 'error');
      } else {
        onShowToast?.(`Settlement failed: ${message}`, 'error');
      }
    }
  };

  const handleSettleCancel = () => {
    setSettlementModal(null);
    setIsSending(false);
  };

  return {
    settlementModal,
    isSending,
    setSettlementModal,
    handleSettleConfirm,
    handleSettleCancel,
  };
}
