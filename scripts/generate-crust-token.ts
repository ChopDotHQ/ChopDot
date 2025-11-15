/**
 * Script to generate Crust Web3Auth token
 * 
 * Usage:
 *   1. Connect your wallet in the app
 *   2. Open browser console
 *   3. Run: await generateCrustToken()
 *   4. Copy the token to backend/.env as CRUST_W3AUTH_TOKEN
 */

import { generateCrustTokenFromWallet } from '../src/utils/crustAuth';

/**
 * Generate Crust token from connected wallet
 * 
 * Call this from browser console after connecting wallet
 */
export async function generateCrustToken(): Promise<string> {
  // Get wallet address from window (if available)
  const account = (window as any).account;
  
  if (!account || !account.address0) {
    throw new Error('No wallet connected. Please connect your wallet first.');
  }

  const walletAddress = account.address0;
  console.log('[CrustToken] Generating token for address:', walletAddress);

  const token = await generateCrustTokenFromWallet(walletAddress);
  
  console.log('\n✅ Crust Web3Auth Token Generated!\n');
  console.log('Add this to backend/.env:');
  console.log(`CRUST_W3AUTH_TOKEN=${token}\n`);
  console.log('Then restart your backend server.');
  
  return token;
}

// Make available globally for browser console
if (typeof window !== 'undefined') {
  (window as any).generateCrustToken = generateCrustToken;
}





