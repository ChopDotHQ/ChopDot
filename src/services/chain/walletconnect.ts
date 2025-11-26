/**
 * WalletConnect service for Polkadot/Substrate chains
 * Supports mobile wallets like Nova Wallet
 */

import SignClient from '@walletconnect/sign-client';
import type { SessionTypes } from '@walletconnect/types';
import { WalletConnectModal } from '@walletconnect/modal';

// WalletConnect Project ID from environment variable
// Fallback to default project ID if not set
const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '15e72db89587fa8bd14473b8ff73a0bb';

// Polkadot chain IDs for WalletConnect
// Format: namespace:chainId (genesis hash in hex)
// Nova Wallet uses the genesis hash format
const POLKADOT_RELAY_CHAIN_ID = 'polkadot:91b171bb158e2d3848fa23a9f1c25182';
// Note: Asset Hub might need a different format or might not be supported
const POLKADOT_ASSET_HUB_CHAIN_ID = 'polkadot:91b171bb158e2d3848fa23a9f1c25182'; // Try same as relay for now

// Default to Relay Chain
const POLKADOT_CHAIN_ID = POLKADOT_RELAY_CHAIN_ID;

let signClient: SignClient | null = null;
let session: SessionTypes.Struct | null = null;
let walletConnectModal: WalletConnectModal | null = null;

export async function initWalletConnect(): Promise<SignClient> {
  if (signClient) {
    return signClient;
  }

  signClient = await SignClient.init({
    projectId: WALLETCONNECT_PROJECT_ID,
    metadata: {
      name: 'ChopDot',
      description: 'Polkadot Chain Test',
      url: window.location.origin,
      icons: [`${window.location.origin}/favicon.ico`],
    },
    // SECURITY: Disable any auto-approval settings
    // All transactions MUST require user approval in Nova Wallet
  });

  // Initialize WalletConnect Modal
  // Configure for Polkadot/Substrate chains
  if (!walletConnectModal) {
    try {
      walletConnectModal = new WalletConnectModal({
        projectId: WALLETCONNECT_PROJECT_ID,
        chains: [POLKADOT_RELAY_CHAIN_ID, POLKADOT_ASSET_HUB_CHAIN_ID],
        // Prioritize Polkadot-native wallets at the top
        // Wallet IDs from WalletConnect Explorer: https://explorer.walletconnect.com/
        // Note: Check WalletConnect docs for correct property name (may be explorerRecommendedWalletIds or featuredWalletIds)
        // For now, explorer will auto-discover wallets that support Polkadot chains
        // We exclude Rainbow since it doesn't support Polkadot
        enableExplorer: true,
        explorerExcludedWalletIds: ['rainbow', 'rainbowkit'],
        // TODO: Add explorerRecommendedWalletIds once we confirm the correct wallet IDs:
        // - Nova Wallet
        // - SubWallet  
        // - Talisman
        // These can be found at https://explorer.walletconnect.com/ by searching for each wallet
      });
    } catch (error) {
      console.warn('[WalletConnect] Modal initialization failed, will use QR code flow:', error);
      walletConnectModal = null;
    }
  }

  // Listen for session events
  signClient.on('session_update', ({ topic, params }) => {
    // Update session if it's the current one
    if (session && session.topic === topic) {
      session = { ...session, ...params };
    }
  });

  signClient.on('session_delete', () => {
    session = null;
  });

  return signClient;
}

/**
 * Connect via WalletConnect - opens modal with wallet selection
 * For Polkadot/Substrate, WalletConnect shows available wallets in the modal
 * The modal will display browser extensions (SubWallet, Talisman) and QR code for mobile wallets
 */
export async function connectViaWalletConnectModal(): Promise<{ address: string; accounts: string[] }> {
  const client = await initWalletConnect();
  
  // Request connection - this will trigger WalletConnect's UI
  // For Polkadot chains, this typically shows a QR code that mobile wallets can scan
  // Browser extensions (SubWallet, Talisman) can connect directly
  const { uri, approval } = await client.connect({
    optionalNamespaces: {
      polkadot: {
        methods: [
          'polkadot_signTransaction',
          'polkadot_signMessage',
          'polkadot_signAndSendTransaction',
        ],
        chains: [POLKADOT_RELAY_CHAIN_ID, POLKADOT_ASSET_HUB_CHAIN_ID],
        events: ['chainChanged', 'accountsChanged'],
      },
    },
  });

  if (!uri) {
    throw new Error('Failed to generate WalletConnect URI');
  }

  // Open WalletConnect modal - pass the URI so wallets can connect
  // The modal will show desktop wallets immediately
  // Mobile wallets tab may show loading, but users can use "Scan with your wallet" tab for QR code
  if (walletConnectModal) {
    await walletConnectModal.openModal({
      uri, // Pass the URI so wallets know what connection to use
      chains: [POLKADOT_RELAY_CHAIN_ID, POLKADOT_ASSET_HUB_CHAIN_ID],
    });
  }

  // Wait for connection approval
  const onConnect = approval()
    .then((sessionData) => {
      session = sessionData;
      
      // Close modal
      if (walletConnectModal) {
        walletConnectModal.closeModal();
      }
      
      // Extract addresses from accounts (format: "polkadot:91b171bb158e2d3848fa23a9f1c25182:15XyKf7G...")
      const accounts = session.namespaces.polkadot?.accounts || [];
      const addresses = accounts
        .map((acc) => {
          const parts = acc.split(':');
          if (parts.length >= 3) {
            return parts.slice(2).join(':');
          }
          return parts[2] || '';
        })
        .filter((addr): addr is string => !!addr && addr.length > 0);
      
      if (addresses.length === 0) {
        console.error('[WalletConnect] No valid addresses found in session');
        throw new Error('No accounts found in session');
      }

      return {
        address: addresses[0]!, // Non-null assertion: addresses.length > 0 checked above
        accounts: addresses,
      };
    })
    .catch((error) => {
      // Close modal on error
      if (walletConnectModal) {
        walletConnectModal.closeModal();
      }
      console.error('[WalletConnect] Connection failed:', error);
      throw error;
    });

  return onConnect;
}

export async function connectNovaWallet(): Promise<{ uri: string; onConnect: Promise<{ address: string; accounts: string[] }> }> {
  const client = await initWalletConnect();
  
  // Request connection
  const { uri, approval } = await client.connect({
    optionalNamespaces: {
      polkadot: {
        methods: [
          'polkadot_signTransaction',
          'polkadot_signMessage',
          'polkadot_signAndSendTransaction',
        ],
        chains: [POLKADOT_RELAY_CHAIN_ID, POLKADOT_ASSET_HUB_CHAIN_ID],
        events: ['chainChanged', 'accountsChanged'],
      },
    },
  });

  if (!uri) {
    throw new Error('Failed to generate WalletConnect URI');
  }

  // Return URI for QR code and promise that resolves when connected
  const onConnect = approval()
    .then((sessionData) => {
      session = sessionData;
      
      console.log('[WalletConnect] Session data received:', {
        namespaces: Object.keys(session.namespaces),
        polkadotAccounts: session.namespaces.polkadot?.accounts?.length || 0,
        ethereumAccounts: session.namespaces.eip155?.accounts?.length || 0,
      });
      
      // Extract addresses from Polkadot accounts (format: "polkadot:91b171bb158e2d3848fa23a9f1c25182:15XyKf7G...")
      const polkadotAccounts = session.namespaces.polkadot?.accounts || [];
      const addresses = polkadotAccounts
        .map((acc) => {
          const parts = acc.split(':');
          if (parts.length >= 3) {
            return parts.slice(2).join(':');
          }
          return parts[2] || '';
        })
        .filter((addr): addr is string => !!addr && addr.length > 0);
      
      // Check if MetaMask or other EVM wallet connected (only Ethereum accounts)
      const ethereumAccounts = session.namespaces.eip155?.accounts || [];
      if (addresses.length === 0 && ethereumAccounts.length > 0) {
        console.warn('[WalletConnect] EVM wallet connected but no Polkadot accounts. MetaMask mobile does not support Polkadot directly.');
        throw new Error('MetaMask mobile does not support Polkadot chains. Please use Nova Wallet, SubWallet, or Talisman for Polkadot connections.');
      }
      
      if (addresses.length === 0) {
        console.error('[WalletConnect] No valid Polkadot addresses found in session');
        throw new Error('No Polkadot accounts found. Please use a Polkadot-compatible wallet like Nova Wallet, SubWallet, or Talisman.');
      }

      return {
        address: addresses[0]!, // Non-null assertion: addresses.length > 0 checked above
        accounts: addresses,
      };
    })
    .catch((error) => {
      console.error('[WalletConnect] Connection failed:', error);
      throw error;
    });

  return { uri, onConnect };
}

export async function disconnectWalletConnect(): Promise<void> {
  if (signClient && session) {
    await signClient.disconnect({
      topic: session.topic,
      reason: {
        code: 6000,
        message: 'User disconnected',
      },
    });
    session = null;
  }
}

export function getWalletConnectSession(): SessionTypes.Struct | null {
  return session;
}

/**
 * Sign and send a transaction via WalletConnect
 */
export async function signAndSendTransaction(
  address: string,
  transaction: string
): Promise<{ txHash: string }> {
  if (!signClient || !session) {
    throw new Error('WalletConnect session not found');
  }

  try {
    // WalletConnect limitation: Nova Wallet only recognizes polkadot:<genesisHash> format
    // Asset Hub and Relay Chain share the same genesis hash, so WalletConnect doesn't distinguish them
    // We must use the Relay Chain chain ID format for WalletConnect requests
    // However, the actual transaction will be sent to whichever RPC endpoint we're connected to
    
    // Always use Relay Chain format for WalletConnect (Nova Wallet requirement)
    // Note: The transaction itself is still for the correct chain based on RPC endpoint
    const targetChainId = POLKADOT_RELAY_CHAIN_ID;
    
    // Request transaction signing via WalletConnect
    // This MUST prompt Nova Wallet to sign the transaction
    const response = await signClient.request({
      topic: session.topic,
      chainId: targetChainId,
      request: {
        method: 'polkadot_signAndSendTransaction',
        params: {
          address,
          transaction, // Unsigned transaction hex (SCALE-encoded extrinsic)
        },
      },
    });

    // Response format depends on WalletConnect implementation
    // Could be just the hash, or an object with hash
    if (typeof response === 'string') {
      return { txHash: response };
    } else if (response && typeof response === 'object' && 'hash' in response) {
      return { txHash: (response as any).hash };
    } else {
      throw new Error('Unexpected response format from WalletConnect');
    }
  } catch (error: any) {
    console.error('[WalletConnect] Transaction signing error:', error);
    
    // Check for user rejection
    if (error?.message?.includes('User rejected') || 
        error?.message?.includes('cancelled') ||
        error?.message?.includes('Rejected') ||
        error?.msg === 'Rejected') {
      throw new Error('USER_REJECTED');
    }
    
    // Re-throw with more context
    throw new Error(error?.message || 'Transaction signing failed');
  }
}

/**
 * Create a WalletConnect-compatible signer for Polkadot API
 */
export function createWalletConnectSigner(address: string) {
  return {
    signPayload: async (payload: any) => {
      if (!signClient || !session) {
        throw new Error('WalletConnect session not found');
      }

      // For WalletConnect, we need to use the signing methods
      // This is a simplified version - actual implementation may need more handling
      const chainId = POLKADOT_CHAIN_ID;
      
      const response = await signClient.request({
        topic: session.topic,
        chainId,
        request: {
          method: 'polkadot_signTransaction',
          params: {
            address,
            transaction: payload.toHex(),
          },
        },
      });

      return response as { signature: string };
    },
    signRaw: async (raw: { address: string; data: string }) => {
      if (!signClient || !session) {
        throw new Error('WalletConnect session not found');
      }

      const chainId = POLKADOT_CHAIN_ID;
      
      const response = await signClient.request({
        topic: session.topic,
        chainId,
        request: {
          method: 'polkadot_signMessage',
          params: {
            address: raw.address,
            message: raw.data,
          },
        },
      });

      return { signature: response as string };
    },
  };
}

