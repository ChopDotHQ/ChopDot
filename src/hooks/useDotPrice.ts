import { useState, useEffect } from 'react';
import { getDotPrice } from '../services/prices/coingecko';

interface UseDotPriceParams {
  enabled: boolean;
  currency?: 'usd';
}

interface UseDotPriceResult {
  dotPrice: number | null;
  isLoading: boolean;
}

/**
 * Fetches and caches the current DOT price.
 * Only fetches when `enabled` is true and the price API is not disabled.
 */
export function useDotPrice({ enabled, currency = 'usd' }: UseDotPriceParams): UseDotPriceResult {
  const [dotPrice, setDotPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const shouldFetch = enabled && import.meta.env.VITE_ENABLE_PRICE_API !== '0';
    if (!shouldFetch) return;

    let cancelled = false;
    setIsLoading(true);

    getDotPrice(currency)
      .then((price) => {
        if (!cancelled) {
          setDotPrice(price);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, currency]);

  return { dotPrice, isLoading };
}
