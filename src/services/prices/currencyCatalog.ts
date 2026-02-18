import { CRYPTO_CURRENCY_CODES, FIAT_CURRENCY_CODES, type CurrencyCode } from './types';

export type CurrencyKind = 'fiat' | 'crypto';
export type CryptoLayer = 'L1' | 'L2' | 'stable';

export interface CurrencyCatalogItem {
  code: CurrencyCode;
  label: string;
  kind: CurrencyKind;
  layer?: CryptoLayer;
}

const FIAT_LABELS: Record<(typeof FIAT_CURRENCY_CODES)[number], string> = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  CHF: 'Swiss Franc',
  JPY: 'Japanese Yen',
};

const CRYPTO_DETAILS: Record<(typeof CRYPTO_CURRENCY_CODES)[number], { label: string; layer: CryptoLayer }> = {
  DOT: { label: 'Polkadot', layer: 'L1' },
  USDC: { label: 'USD Coin', layer: 'stable' },
  ETH: { label: 'Ethereum', layer: 'L1' },
  SOL: { label: 'Solana', layer: 'L1' },
  MATIC: { label: 'Polygon', layer: 'L2' },
  XTZ: { label: 'Tezos', layer: 'L1' },
  ARB: { label: 'Arbitrum', layer: 'L2' },
  OP: { label: 'Optimism', layer: 'L2' },
};

export const CURRENCY_CATALOG: CurrencyCatalogItem[] = [
  ...FIAT_CURRENCY_CODES.map((code) => ({
    code,
    label: FIAT_LABELS[code],
    kind: 'fiat' as const,
  })),
  ...CRYPTO_CURRENCY_CODES.map((code) => ({
    code,
    label: CRYPTO_DETAILS[code].label,
    kind: 'crypto' as const,
    layer: CRYPTO_DETAILS[code].layer,
  })),
];
