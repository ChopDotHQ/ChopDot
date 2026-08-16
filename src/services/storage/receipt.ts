/**
 * receipt storage - MVP stub (IPFS storage removed)
 * Receipt uploads not supported in MVP.
 */

export async function uploadReceipt(_file: File): Promise<string | null> {
  console.warn('[MVP] Receipt upload not supported in MVP');
  return null;
}
