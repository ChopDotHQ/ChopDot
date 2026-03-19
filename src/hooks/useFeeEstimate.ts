import { useState, useEffect, useCallback, useMemo } from 'react';
import { getChain } from '../services/chain';
import { fiatToDot } from '../utils/fiatToDot';

interface UseFeeEstimateParams {
  fromAddress: string | null;
  toAddress: string | null;
  totalAmount: number;
  isDotPot: boolean;
  dotPriceUsd: number | null;
  enabled: boolean;
  isSimulationMode?: boolean;
}

interface UseFeeEstimateResult {
  feeEstimate: number | null;
  feeLoading: boolean;
  feeError: boolean;
}

const SIMULATION_MOCK_ADDRESS = '15mock00000000000000000000000000000A';
const FALLBACK_FEE_DOT = 0.0025;

/**
 * Estimates the network fee for a DOT transfer.
 * Converts fiat amounts to DOT using the provided price before estimating.
 */
export function useFeeEstimate({
  fromAddress,
  toAddress,
  totalAmount,
  isDotPot,
  dotPriceUsd,
  enabled,
  isSimulationMode = false,
}: UseFeeEstimateParams): UseFeeEstimateResult {
  const [feeEstimate, setFeeEstimate] = useState<number | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState(false);

  const senderAddress = useMemo(() => {
    if (isSimulationMode && !fromAddress) return SIMULATION_MOCK_ADDRESS;
    return fromAddress;
  }, [fromAddress, isSimulationMode]);

  const estimate = useCallback(async (): Promise<number> => {
    if (!senderAddress || !toAddress || totalAmount <= 0) {
      return 0;
    }

    const amountDot = isDotPot
      ? Math.abs(totalAmount)
      : (fiatToDot(totalAmount, dotPriceUsd) ?? 0);

    if (amountDot <= 0) return 0;

    try {
      const chain = await getChain();
      const feePlanck = await chain.estimateFee({
        from: senderAddress,
        to: toAddress,
        amountDot,
      });
      const config = chain.getConfig();
      return parseFloat(feePlanck) / Math.pow(10, config.decimals);
    } catch (error) {
      console.error('[useFeeEstimate] Fee estimation error:', error);
      return FALLBACK_FEE_DOT;
    }
  }, [senderAddress, toAddress, totalAmount, isDotPot, dotPriceUsd]);

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
    [feeEstimate, feeLoading, feeError]
  );
}
