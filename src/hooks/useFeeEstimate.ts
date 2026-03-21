import { useState, useEffect, useCallback, useMemo } from 'react';
import { getChain } from '../services/chain';
import { fiatToDot } from '../utils/fiatToDot';

type CryptoAsset = 'DOT' | 'USDC';

interface UseFeeEstimateParams {
  fromAddress: string | null;
  toAddress: string | null;
  totalAmount: number;
  asset?: CryptoAsset;
  baseCurrency?: string;
  dotPriceUsd: number | null;
  enabled: boolean;
  isSimulationMode?: boolean;
  isDotPot?: boolean;
}

interface UseFeeEstimateResult {
  feeEstimate: number | null;
  feeLoading: boolean;
  feeError: boolean;
}

const SIMULATION_MOCK_ADDRESS = '15mock00000000000000000000000000000A';
const FALLBACK_FEE_DOT = 0.0025;

export function useFeeEstimate({
  fromAddress,
  toAddress,
  totalAmount,
  asset,
  baseCurrency,
  dotPriceUsd,
  enabled,
  isSimulationMode = false,
  isDotPot,
}: UseFeeEstimateParams): UseFeeEstimateResult {
  const [feeEstimate, setFeeEstimate] = useState<number | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState(false);

  const senderAddress = useMemo(() => {
    if (isSimulationMode && !fromAddress) return SIMULATION_MOCK_ADDRESS;
    return fromAddress;
  }, [fromAddress, isSimulationMode]);

  // Keep legacy callers stable: `isDotPot=false` historically meant a fiat pot
  // whose estimated network fee still needed a DOT-denominated transfer amount.
  const resolvedAsset: CryptoAsset = asset ?? 'DOT';
  const resolvedBaseCurrency = baseCurrency ?? (isDotPot ? 'DOT' : 'USD');

  const estimate = useCallback(async (): Promise<number> => {
    if (!senderAddress || !toAddress || totalAmount <= 0) {
      return 0;
    }

    const amountDot = resolvedAsset === 'DOT'
      ? (resolvedBaseCurrency === 'DOT' ? Math.abs(totalAmount) : (fiatToDot(totalAmount, dotPriceUsd) ?? 0))
      : 0.1;

    try {
      const chain = await getChain();
      const feePlanck = await chain.estimateFee({
        from: senderAddress,
        to: toAddress,
        amountDot: amountDot > 0 ? amountDot : 0.1,
      });
      const config = chain.getConfig();
      return parseFloat(feePlanck) / Math.pow(10, config.decimals);
    } catch (error) {
      console.error('[useFeeEstimate] Fee estimation error:', error);
      return FALLBACK_FEE_DOT;
    }
  }, [dotPriceUsd, resolvedAsset, resolvedBaseCurrency, senderAddress, toAddress, totalAmount]);

  useEffect(() => {
    if (!enabled || !toAddress || totalAmount <= 0) {
      setFeeEstimate(null);
      setFeeLoading(false);
      setFeeError(false);
      return;
    }

    let cancelled = false;
    setFeeLoading(true);
    setFeeError(false);

    estimate()
      .then((fee) => {
        if (!cancelled) {
          setFeeEstimate(fee);
          setFeeLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFeeError(true);
          setFeeLoading(false);
          setFeeEstimate(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, toAddress, totalAmount, estimate]);

  return useMemo(
    () => ({ feeEstimate, feeLoading, feeError }),
    [feeEstimate, feeLoading, feeError],
  );
}
