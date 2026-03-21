/**
 * WalletConnect service for Polkadot/Substrate and EVM chains
 * Supports mobile wallets like Nova Wallet, MetaMask, Rainbow, Trust, etc.
 */

import type SignClientType from '@walletconnect/sign-client';
import type { SessionTypes } from '@walletconnect/types';
import type { WalletConnectModal } from '@walletconnect/modal';

const loadSignClient = async () =>
  (await import('@walletconnect/sign-client')).default;
const loadWalletConnectModal = async () =>
  (await import('@walletconnect/modal')).WalletConnectModal;

const getWalletConnectProjectId = (): string => {
  const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
  if (!projectId) {
    throw new Error(
      '[WalletConnect] VITE_WALLETCONNECT_PROJECT_ID is required but not set. ' +
      'Add it to your Vercel environment variables or .env file. ' +
      'Get your project ID from https://cloud.walletconnect.com/'
    );
  }
  return projectId;
};

// Polkadot chain IDs
const POLKADOT_RELAY_CHAIN_ID = 'polkadot:91b171bb158e2d3848fa23a9f1c25182';
const POLKADOT_ASSET_HUB_CHAIN_ID = 'polkadot:91b171bb158e2d3848fa23a9f1c25182';
const POLKADOT_CHAIN_ID = POLKADOT_RELAY_CHAIN_ID;

// EVM chain IDs (eip155 namespace)
const EVM_MAINNET_CHAIN_ID = 'eip155:1';

export type ConnectedChain = 'polkadot' | 'evm';

let signClient: SignClientType | null = null;
let session: SessionTypes.Struct | null = null;
let walletConnectModal: WalletConnectModal | null = null;

export async function initWalletConnect(): Promise<SignClientType> {
  if (signClient) {
    return signClient;
  }

  const SignClient = await loadSignClient();
  signClient = await SignClient.init({
    projectId: getWalletConnectProjectId(),
    metadata: {
      name: 'ChopDot',
      description: 'Polkadot Chain Test',
      url: window.location.origin,
      icons: [`${window.location.origin}/favicon.ico`],
    },
    // SECURITY: Disable any auto-approval settings
    // All transactions MUST require user approval in Nova Wallet
  });

  if (!walletConnectModal) {
    try {
      const WalletConnectModal = await loadWalletConnectModal();
      walletConnectModal = new WalletConnectModal({
        projectId: getWalletConnectProjectId(),
        chains: [POLKADOT_RELAY_CHAIN_ID, POLKADOT_ASSET_HUB_CHAIN_ID, EVM_MAINNET_CHAIN_ID],
        enableExplorer: true,
        explorerRecommendedWalletIds: [
          '43fd1a0aeb90df53ade012cca36692a46d265f0b99b7561e645af42d752edb92', // Nova Wallet
          '9ce87712b99b3eb57396cc8621db8900ac983c712236f48fb70ad28760be3f6a', // SubWallet
          'e0c2e199712878ed272e2c170b585baa0ff0eb50b07521ca586ebf7aeeffc598', // Talisman
          'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
          '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // Rainbow
          '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
        ],
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

export interface WalletConnectResult {
  address: string;
  accounts: string[];
  chain: ConnectedChain;
}

/**
 * Connect via WalletConnect - opens modal with wallet selection.
 * Requests both Polkadot and EVM namespaces so the modal shows all supported wallets.
 * Returns the connected chain type so callers can route to the correct signing flow.
 */
export async function connectViaWalletConnectModal(): Promise<WalletConnectResult> {
  const client = await initWalletConnect();

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
      eip155: {
        methods: ['personal_sign', 'eth_sendTransaction', 'eth_signTypedData'],
        chains: [EVM_MAINNET_CHAIN_ID],
        events: ['chainChanged', 'accountsChanged'],
      },
    },
  });

  if (!uri) {
    throw new Error('Failed to generate WalletConnect URI');
  }

  if (walletConnectModal) {
    await walletConnectModal.openModal({
      uri,
      chains: [POLKADOT_RELAY_CHAIN_ID, POLKADOT_ASSET_HUB_CHAIN_ID, EVM_MAINNET_CHAIN_ID],
    });
  }

  const onConnect = approval()
    .then((sessionData: SessionTypes.Struct) => {
      session = sessionData;

      if (walletConnectModal) {
        walletConnectModal.closeModal();
      }

      // Try Polkadot accounts first (primary chain for ChopDot)
      const polkadotAccounts = sessionData.namespaces.polkadot?.accounts || [];
      const polkadotAddresses = polkadotAccounts
        .map((acc) => {
          const parts = acc.split(':');
          return parts.length >= 3 ? parts.slice(2).join(':') : '';
        })
        .filter((addr): addr is string => addr.length > 0);

      if (polkadotAddresses.length > 0) {
        return {
          address: polkadotAddresses[0]!,
          accounts: polkadotAddresses,
          chain: 'polkadot' as ConnectedChain,
        };
      }

      // Fall back to EVM accounts (e.g. MetaMask, Rainbow, Trust)
      const evmAccounts = sessionData.namespaces.eip155?.accounts || [];
      const evmAddresses = evmAccounts
        .map((acc) => {
          // format: "eip155:1:0xABC..."
          const parts = acc.split(':');
          return parts.length >= 3 ? parts.slice(2).join(':') : '';
        })
        .filter((addr): addr is string => addr.length > 0);

      if (evmAddresses.length > 0) {
        return {
          address: evmAddresses[0]!,
          accounts: evmAddresses,
          chain: 'evm' as ConnectedChain,
        };
      }

      throw new Error('No accounts found in WalletConnect session');
    })
    .catch((error: unknown) => {
      if (walletConnectModal) {
        walletConnectModal.closeModal();
      }
      console.error('[WalletConnect] Connection failed:', error);
      throw error;
    });

  return onConnect;
}

/**
 * Sign a message using EVM personal_sign via WalletConnect.
 */
export async function signEvmMessage(
  address: string,
  message: string
): Promise<string> {
  if (!signClient || !session) {
    throw new Error('WalletConnect session not found');
  }

  const hexMessage = `0x${Array.from(new TextEncoder().encode(message)).map(b => b.toString(16).padStart(2, '0')).join('')}`;

  const signature = await signClient.request<string>({
    topic: session.topic,
    chainId: EVM_MAINNET_CHAIN_ID,
    request: {
      method: 'personal_sign',
      params: [hexMessage, address],
    },
  });

  return signature;
}

export async function connectNovaWallet(): Promise<{ uri: string; onConnect: Promise<WalletConnectResult> }> {
  const client = await initWalletConnect();

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
      eip155: {
        methods: ['personal_sign', 'eth_sendTransaction', 'eth_signTypedData'],
        chains: [EVM_MAINNET_CHAIN_ID],
        events: ['chainChanged', 'accountsChanged'],
      },
    },
  });

  if (!uri) {
    throw new Error('Failed to generate WalletConnect URI');
  }

  const onConnect = approval()
    .then((sessionData: SessionTypes.Struct) => {
      session = sessionData;

      const polkadotAccounts = sessionData.namespaces.polkadot?.accounts || [];
      const polkadotAddresses = polkadotAccounts
        .map((acc) => {
          const parts = acc.split(':');
          return parts.length >= 3 ? parts.slice(2).join(':') : '';
        })
        .filter((addr): addr is string => addr.length > 0);

      if (polkadotAddresses.length > 0) {
        return {
          address: polkadotAddresses[0]!,
          accounts: polkadotAddresses,
          chain: 'polkadot' as ConnectedChain,
        };
      }

      const evmAccounts = sessionData.namespaces.eip155?.accounts || [];
      const evmAddresses = evmAccounts
        .map((acc) => {
          const parts = acc.split(':');
          return parts.length >= 3 ? parts.slice(2).join(':') : '';
        })
        .filter((addr): addr is string => addr.length > 0);

      if (evmAddresses.length > 0) {
        return {
          address: evmAddresses[0]!,
          accounts: evmAddresses,
          chain: 'evm' as ConnectedChain,
        };
      }

      throw new Error('No accounts found in WalletConnect session');
    })
    .catch((error: unknown) => {
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

/**
 * Sign a message via WalletConnect
 */
export async function signMessage(
  address: string,
  message: string
): Promise<{ signature: string }> {
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
        address,
        message,
      },
    },
  });

  return { signature: response as string };
}
