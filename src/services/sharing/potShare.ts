/**
 * Pot Sharing Service - MVP stub
 *
 * IPFS/Crust sharing is not available in MVP.
 * This module is kept as a stub to avoid import errors.
 */

import type { Pot } from '../../schema/pot';

// MVP: IPFS sharing not available
export async function sharePot(_pot: Pot): Promise<{
  cid: string;
  shareLink: string;
  ipfsUrl: string;
}> {
  throw new Error('IPFS sharing not available in MVP');
}

export async function importPotFromCID(_cid: string): Promise<Pot> {
  throw new Error('IPFS import not available in MVP');
}

