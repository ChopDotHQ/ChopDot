import { useCallback, useMemo } from 'react';
import { getChain } from '../services/chain';
import { pushTxToast, updateTxToast } from './useTxToasts';
import { fiatToDot } from '../utils/fiatToDot';
import { formatDOT } from '../utils/platformFee';
import type { TxStatus } from '../services/chain/adapter';

type ShowToast = (message: string, type?: 'success' | 'error' | 'info') => void;
type CryptoAsset = 'DOT' | 'USDC';

interface AccountSnapshot {
  address0: string | null;
  balanceHuman: string | null;
  status: string;
  refreshBalance: () => Promise<void>;
}

export interface SettlementTxParams {
  fromAddress: string;
  toAddress: string;
  totalAmount: number;
  asset: CryptoAsset;
  baseCurrency: string;
  dotPriceUsd: number | null;
  feeEstimate: number | null;
  isSimulationMode?: boolean;
}

export interface SettlementTxResult {
  txHash: string | undefined;
  amount: number;
  amountDot?: number;
}

interface UseSettlementTxParams {
  account: AccountSnapshot;
  onShowToast?: ShowToast;
}

interface UseSettlementTxResult {
  sendSettlementTx: (params: SettlementTxParams) => Promise<SettlementTxResult>;
  sendDotSettlement: (params: Omit<SettlementTxParams, 'asset' | 'baseCurrency'> & { isDotPot: boolean }) => Promise<SettlementTxResult>;
}

const SIMULATION_MOCK_ADDRESS = '15mock00000000000000000000000000000A';

export function useSettlementTx({ account, onShowToast }: UseSettlementTxParams): UseSettlementTxResult {
  const sendSettlementTx = useCallback(
    async (params: SettlementTxParams): Promise<SettlementTxResult> => {
      const {
        fromAddress: requestedFrom,
        toAddress,
        totalAmount,
        asset,
        baseCurrency,
        dotPriceUsd,
        feeEstimate,
        isSimulationMode = false,
      } = params;

      const fromAddress =
        isSimulationMode && !requestedFrom ? SIMULATION_MOCK_ADDRESS : requestedFrom;

      let amount = Math.abs(totalAmount);
      if (asset === 'DOT' && baseCurrency !== 'DOT') {
        const converted = fiatToDot(totalAmount, dotPriceUsd);
        if (converted === null) {
          onShowToast?.('Unable to convert amount to DOT. Please try again.', 'error');
          throw new Error('DOT_PRICE_UNAVAILABLE');
        }
        amount = converted;
      }

      const conservativeFee = feeEstimate ?? 0.01;
      const requiredDot = asset === 'DOT' ? amount + conservativeFee : conservativeFee;

      if (account.status === 'connected' && account.balanceHuman) {
        const walletBalance = parseFloat(account.balanceHuman || '0');
        if (walletBalance < requiredDot) {
          onShowToast?.(
            asset === 'DOT'
              ? `Insufficient balance: need ~${formatDOT(requiredDot)} (${formatDOT(amount)} + ${formatDOT(conservativeFee)} fee)`
              : `Insufficient DOT balance for fees: need ~${formatDOT(conservativeFee)}`,
            'error',
          );
          throw new Error('INSUFFICIENT_BALANCE');
        }
      }

      const chain = await getChain();

      pushTxToast('signing', { amount, currency: asset });

      let statusTxHash: string | undefined;
      const onStatus = (status: TxStatus, ctx?: { txHash?: string; blockHash?: string }) => {
        if (ctx?.txHash) statusTxHash = ctx.txHash;

        if (status === 'submitted') {
          updateTxToast('broadcast', { amount, currency: asset });
        } else if (status === 'inBlock' && ctx?.txHash) {
          updateTxToast('inBlock', {
            amount,
            currency: asset,
            txHash: ctx.txHash,
            fee: feeEstimate || 0.0024,
            feeCurrency: 'DOT',
          });
        } else if (status === 'finalized') {
          updateTxToast('finalized', {
            amount,
            currency: asset,
            txHash: ctx?.txHash || statusTxHash,
            fee: feeEstimate || 0.0024,
            feeCurrency: 'DOT',
          });
        }
      };

      const result = asset === 'DOT'
        ? await chain.sendDot({
          from: fromAddress,
          to: toAddress,
          amountDot: amount,
          onStatus,
        })
        : await chain.sendUsdc({
          from: fromAddress,
          to: toAddress,
          amountUsdc: amount,
          onStatus,
        });

      const txHash = result.txHash || statusTxHash;

      try {
        await account.refreshBalance();
      } catch {
        // Non-critical -- balance will refresh on next poll
      }

      return { txHash, amount, amountDot: asset === 'DOT' ? amount : undefined };
    },
    [account, onShowToast],
  );

  const sendDotSettlement = useCallback(
    (params: Omit<SettlementTxParams, 'asset' | 'baseCurrency'> & { isDotPot: boolean }) =>
      sendSettlementTx({
        ...params,
        asset: 'DOT',
        baseCurrency: params.isDotPot ? 'DOT' : 'USD',
      }),
    [sendSettlementTx],
  );

  return useMemo(() => ({ sendSettlementTx, sendDotSettlement }), [sendDotSettlement, sendSettlementTx]);
}
