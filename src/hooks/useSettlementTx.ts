import { useCallback, useMemo } from 'react';
import { getChain } from '../services/chain';
import { pushTxToast, updateTxToast } from './useTxToasts';
import { fiatToDot } from '../utils/fiatToDot';
import { formatDOT } from '../utils/platformFee';
import type { TxStatus } from '../services/chain/adapter';

type ShowToast = (message: string, type?: 'success' | 'error' | 'info') => void;

interface AccountSnapshot {
  address0: string | null;
  balanceHuman: string | null;
  status: string;
  refreshBalance: () => Promise<void>;
}

export interface DotSettlementParams {
  fromAddress: string;
  toAddress: string;
  totalAmount: number;
  isDotPot: boolean;
  dotPriceUsd: number | null;
  feeEstimate: number | null;
  isSimulationMode?: boolean;
}

export interface DotSettlementResult {
  txHash: string | undefined;
  amountDot: number;
}

interface UseSettlementTxParams {
  account: AccountSnapshot;
  onShowToast?: ShowToast;
}

interface UseSettlementTxResult {
  sendDotSettlement: (params: DotSettlementParams) => Promise<DotSettlementResult>;
}

const SIMULATION_MOCK_ADDRESS = '15mock00000000000000000000000000000A';

/**
 * Encapsulates the DOT settlement transaction flow:
 * fiat-to-DOT conversion, balance validation, chain.sendDot, tx toasts, balance refresh.
 */
export function useSettlementTx({ account, onShowToast }: UseSettlementTxParams): UseSettlementTxResult {
  const sendDotSettlement = useCallback(
    async (params: DotSettlementParams): Promise<DotSettlementResult> => {
      const {
        fromAddress: requestedFrom,
        toAddress,
        totalAmount,
        isDotPot,
        dotPriceUsd,
        feeEstimate,
        isSimulationMode = false,
      } = params;

      const fromAddress =
        isSimulationMode && !requestedFrom ? SIMULATION_MOCK_ADDRESS : requestedFrom;

      // Convert amount
      let amountDot = Math.abs(totalAmount);
      if (!isDotPot) {
        const converted = fiatToDot(totalAmount, dotPriceUsd);
        if (converted === null) {
          onShowToast?.('Unable to convert amount to DOT. Please try again.', 'error');
          throw new Error('DOT_PRICE_UNAVAILABLE');
        }
        amountDot = converted;
      }

      // Balance validation
      const conservativeFee = feeEstimate ?? 0.01;
      const required = amountDot + conservativeFee;

      if (account.status === 'connected' && account.balanceHuman) {
        const walletBalance = parseFloat(account.balanceHuman || '0');
        if (walletBalance < required) {
          onShowToast?.(
            `Insufficient balance: need ~${formatDOT(required)} (${formatDOT(amountDot)} + ${formatDOT(conservativeFee)} fee)`,
            'error'
          );
          throw new Error('INSUFFICIENT_BALANCE');
        }
      }

      const chain = await getChain();

      pushTxToast('signing', { amount: amountDot, currency: 'DOT' });

      let statusTxHash: string | undefined;
      const result = await chain.sendDot({
        from: fromAddress,
        to: toAddress,
        amountDot,
        onStatus: (status: TxStatus, ctx?: { txHash?: string; blockHash?: string }) => {
          if (ctx?.txHash) statusTxHash = ctx.txHash;

          if (status === 'submitted') {
            updateTxToast('broadcast', { amount: amountDot, currency: 'DOT' });
          } else if (status === 'inBlock' && ctx?.txHash) {
            updateTxToast('inBlock', {
              amount: amountDot,
              currency: 'DOT',
              txHash: ctx.txHash,
              fee: feeEstimate || 0.0024,
              feeCurrency: 'DOT',
            });
          } else if (status === 'finalized' && ctx?.blockHash) {
            updateTxToast('finalized', {
              amount: amountDot,
              currency: 'DOT',
              txHash: ctx.txHash || statusTxHash,
              fee: feeEstimate || 0.0024,
              feeCurrency: 'DOT',
            });
          }
        },
      });

      const txHash = result.txHash || statusTxHash;

      try {
        await account.refreshBalance();
      } catch {
        // Non-critical -- balance will refresh on next poll
      }

      return { txHash, amountDot };
    },
    [account, onShowToast]
  );

  return useMemo(() => ({ sendDotSettlement }), [sendDotSettlement]);
}
