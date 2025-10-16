/**
 * WALLET AUTHENTICATION UTILITIES
 * 
 * Handles wallet connection and signature verification for:
 * - Polkadot (Polkadot.js, SubWallet, Talisman)
 * - MetaMask (EVM)
 * - Rainbow (EVM via WalletConnect)
 */

export interface WalletConnection {
  address: string;
  provider: string;
  name?: string;
}

/**
 * Connect to Polkadot wallet
 */
export async function connectPolkadotWallet(): Promise<WalletConnection> {
  try {
    // Check if Polkadot extension is available
    const { web3Enable, web3Accounts, web3FromAddress: _web3FromAddress } = await import('@polkadot/extension-dapp');
    
    // Request access to extensions
    const extensions = await web3Enable('ChopDot');
    
    if (extensions.length === 0) {
      throw new Error('No Polkadot extension found. Please install Polkadot.js, SubWallet, or Talisman.');
    }
    
    // Get all accounts
    const accounts = await web3Accounts();
    
    if (accounts.length === 0) {
      throw new Error('No accounts found in Polkadot wallet');
    }
    
    // Use the first account (in production, let user choose)
    const account = accounts[0];
    if (!account) {
      throw new Error('No accounts available');
    }
    
    return {
      address: account.address,
      provider: account.meta.source || 'polkadot',
      name: account.meta.name,
    };
  } catch (error) {
    console.error('Polkadot wallet connection failed:', error);
    throw error;
  }
}

/**
 * Sign a message with Polkadot wallet
 */
export async function signPolkadotMessage(address: string, message: string): Promise<string> {
  try {
    const { web3FromAddress } = await import('@polkadot/extension-dapp');
    const { stringToHex } = await import('@polkadot/util');
    
    // Get the injector for this address
    const injector = await web3FromAddress(address);
    if (!injector || !injector.signer) {
      throw new Error('No signer available for address');
    }
    
    if (!injector.signer.signRaw) {
      throw new Error('Wallet does not support message signing');
    }
    
    // Sign the message
    const { signature } = await injector.signer.signRaw({
      address,
      data: stringToHex(message),
      type: 'bytes',
    });
    
    return signature;
  } catch (error) {
    console.error('Polkadot message signing failed:', error);
    throw error;
  }
}

/**
 * Connect to MetaMask
 */
export async function connectMetaMask(): Promise<WalletConnection> {
  try {
    // Check if MetaMask is installed
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask is not installed');
    }
    
    // Request account access
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });
    
    if (accounts.length === 0) {
      throw new Error('No accounts found in MetaMask');
    }
    
    return {
      address: accounts[0],
      provider: 'metamask',
    };
  } catch (error) {
    console.error('MetaMask connection failed:', error);
    throw error;
  }
}

/**
 * Sign a message with MetaMask
 */
export async function signMetaMaskMessage(address: string, message: string): Promise<string> {
  try {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask is not installed');
    }
    
    // Sign the message
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, address],
    });
    
    return signature;
  } catch (error) {
    console.error('MetaMask message signing failed:', error);
    throw error;
  }
}

// Singleton WalletConnect provider to prevent multiple initializations
let walletConnectProvider: any = null;

/**
 * Get or initialize WalletConnect provider (singleton pattern)
 */
async function getWalletConnectProvider() {
  if (walletConnectProvider) {
    return walletConnectProvider;
  }

  try {
    const { EthereumProvider: _EthereumProvider } = await import('@walletconnect/ethereum-provider');
    
    // For now, WalletConnect is disabled until you add a valid project ID
    // Get one from https://cloud.walletconnect.com
    throw new Error(
      'WalletConnect requires a valid Project ID. ' +
      'Get one from https://cloud.walletconnect.com and update walletAuth.ts'
    );
    
    // Uncomment and add your project ID when ready:
    /*
    walletConnectProvider = await EthereumProvider.init({
      projectId: 'YOUR_PROJECT_ID_HERE', // Replace with actual project ID
      chains: [1], // Ethereum mainnet
      showQrModal: true,
      metadata: {
        name: 'ChopDot',
        description: 'Expense splitting and group financial management',
        url: 'https://chopdot.app',
        icons: ['https://chopdot.app/icon.png']
      }
    });
    
    return walletConnectProvider;
    */
  } catch (error) {
    console.error('WalletConnect initialization failed:', error);
    throw error;
  }
}

/**
 * Connect to Rainbow or other WalletConnect wallets
 */
export async function connectWalletConnect(): Promise<WalletConnection> {
  try {
    const provider = await getWalletConnectProvider();
    
    // Enable session (shows QR Code modal)
    const accounts = await provider.enable();
    
    if (accounts.length === 0) {
      throw new Error('No accounts found');
    }
    
    return {
      address: accounts[0],
      provider: 'walletconnect',
    };
  } catch (error) {
    console.error('WalletConnect connection failed:', error);
    throw error;
  }
}

/**
 * Sign a message with WalletConnect
 */
export async function signWalletConnectMessage(address: string, message: string): Promise<string> {
  try {
    const provider = await getWalletConnectProvider();
    
    const signature = await provider.request({
      method: 'personal_sign',
      params: [message, address],
    });
    
    return signature as string;
  } catch (error) {
    console.error('WalletConnect message signing failed:', error);
    throw error;
  }
}

/**
 * Disconnect WalletConnect (cleanup)
 */
export async function disconnectWalletConnect(): Promise<void> {
  if (walletConnectProvider) {
    try {
      await walletConnectProvider.disconnect();
      walletConnectProvider = null;
    } catch (error) {
      console.error('WalletConnect disconnect failed:', error);
    }
  }
}

/**
 * Generate a sign-in message for wallet authentication
 */
export function generateSignInMessage(address: string): string {
  const timestamp = new Date().toISOString();
  const nonce = Math.random().toString(36).substring(7);
  
  return `Sign this message to authenticate with ChopDot\n\nAddress: ${address}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;
}

/**
 * Verify wallet signature (backend implementation)
 */
export async function verifyWalletSignature(
  address: string,
  message: string,
  signature: string,
  walletType: 'polkadot' | 'evm'
): Promise<boolean> {
  try {
    if (walletType === 'polkadot') {
      // Verify Polkadot signature
      const { signatureVerify } = await import('@polkadot/util-crypto');
      const { hexToU8a, stringToHex } = await import('@polkadot/util');
      
      const result = signatureVerify(
        stringToHex(message),
        hexToU8a(signature),
        address
      );
      
      return result.isValid;
    } else {
      // Verify EVM signature (MetaMask, Rainbow)
      const { ethers } = await import('ethers');
      const recoveredAddress = ethers.verifyMessage(message, signature);
      
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    }
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

// Type declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
