/**
 * walletAuth - MVP stub (blockchain wallet auth removed)
 */

export async function requestWalletNonce(_address: string): Promise<string> {
  throw new Error('Wallet auth not available in MVP');
}

export function buildWalletAuthMessage(_nonce: string, _options?: any): string {
  return '';
}

export async function signPolkadotMessage(_address: string, _message: string): Promise<string> {
  throw new Error('Wallet signing not available in MVP');
}
