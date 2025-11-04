import { isAddress } from '@polkadot/util-crypto';

export function isValidAddress(addr: string): boolean {
  try { return isAddress(addr); } catch { return false; }
}


