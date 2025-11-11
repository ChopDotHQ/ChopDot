/**
 * CoinGecko Price Service
 * 
 * Fetches cryptocurrency prices from CoinGecko's free API.
 * - Free tier: 30 calls/minute, 10,000 calls/month
 * - No API key required
 * - 5-minute cache to reduce API calls
 */

export type FiatCurrency = 'usd' | 'chf' | 'eur' | 'gbp' | 'jpy';

interface PriceCache {
  prices: Record<FiatCurrency, number>;
  timestamp: number;
}

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

// In-memory cache
let priceCache: PriceCache | null = null;

/**
 * Fetch DOT price in multiple fiat currencies
 * Uses caching to minimize API calls
 */
export async function getDotPrices(
  currencies: FiatCurrency[] = ['usd', 'chf', 'eur']
): Promise<Record<FiatCurrency, number>> {
  // Check cache first
  if (priceCache && Date.now() - priceCache.timestamp < CACHE_DURATION_MS) {
    return priceCache.prices;
  }

  try {
    const vsCurrencies = currencies.join(',');
    const url = `${COINGECKO_API_BASE}/simple/price?ids=polkadot&vs_currencies=${vsCurrencies}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const dotData = data.polkadot;

    if (!dotData) {
      throw new Error('Polkadot price data not found');
    }

    // Build prices object with defaults
    const prices: Record<FiatCurrency, number> = {
      usd: dotData.usd || 0,
      chf: dotData.chf || 0,
      eur: dotData.eur || 0,
      gbp: dotData.gbp || 0,
      jpy: dotData.jpy || 0,
    };

    // Update cache
    priceCache = {
      prices,
      timestamp: Date.now(),
    };

    return prices;
  } catch (error) {
    console.error('[CoinGecko] Failed to fetch prices:', error);
    
    // Return cached prices if available (even if stale)
    if (priceCache) {
      console.warn('[CoinGecko] Using stale cache due to API error');
      return priceCache.prices;
    }

    // Fallback to zero if no cache
    return {
      usd: 0,
      chf: 0,
      eur: 0,
      gbp: 0,
      jpy: 0,
    };
  }
}

/**
 * Get DOT price in a specific fiat currency
 * Convenience wrapper around getDotPrices
 */
export async function getDotPrice(currency: FiatCurrency = 'usd'): Promise<number> {
  const prices = await getDotPrices([currency]);
  return prices[currency] || 0;
}

/**
 * Convert DOT amount to fiat equivalent
 */
export async function dotToFiat(
  dotAmount: number,
  fiatCurrency: FiatCurrency = 'usd'
): Promise<number> {
  const price = await getDotPrice(fiatCurrency);
  return dotAmount * price;
}

/**
 * Clear the price cache (useful for testing or forced refresh)
 */
export function clearPriceCache(): void {
  priceCache = null;
}

