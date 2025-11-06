import { encodeAddress, decodeAddress } from '@polkadot/util-crypto';

export function normalizeToPolkadot(address: string): string {
  const pub = decodeAddress(address);
  return encodeAddress(pub, 0);
}

export function isValidSs58Any(address: string): boolean {
  try {
    decodeAddress(address);
    return true;
  } catch (_) {
    return false;
  }
}

export function detectSs58Prefix(address: string): number | null {
  try {
    const pub = decodeAddress(address);
    for (let p = 0; p <= 63; p++) {
      if (encodeAddress(pub, p) === address) return p;
    }
    return null;
  } catch (_) {
    return null;
  }
}


