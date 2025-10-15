/**
 * WEB3AUTH INTEGRATION
 * 
 * Provides passwordless social login with automatic MPC wallet creation.
 * Uses Web3Auth SDK to enable Google OAuth → Polkadot wallet flow.
 * 
 * Features:
 * - Singleton pattern (initialize once)
 * - Google OAuth integration
 * - Automatic Polkadot address generation
 * - Message signing capability
 * - TypeScript strict mode
 * - Lazy loading (packages loaded only when needed)
 * 
 * Setup:
 * 1. Install packages: npm install @web3auth/modal @web3auth/base @web3auth/base-provider
 * 2. Install Polkadot: npm install @polkadot/keyring @polkadot/util @polkadot/util-crypto
 * 3. Get client ID from https://dashboard.web3auth.io
 * 4. Add VITE_WEB3AUTH_CLIENT_ID to .env
 * 5. Configure allowed origins in Web3Auth dashboard
 * 
 * @module utils/web3auth
 */

// ============================================================================
// TYPE DEFINITIONS (imported dynamically to avoid bundle errors)
// ============================================================================

export interface SocialAuthResult {
  success: boolean;
  address?: string;
  email?: string;
  name?: string;
  profileImage?: string;
  provider: 'google';
  error?: string;
}

export interface Web3AuthUserInfo {
  email?: string;
  name?: string;
  profileImage?: string;
  verifier?: string;
  verifierId?: string;
}

// ============================================================================
// FEATURE DETECTION
// ============================================================================

/**
 * Check if Web3Auth packages are available
 * Returns false if packages aren't installed (graceful degradation)
 */
async function checkWeb3AuthAvailable(): Promise<boolean> {
  try {
    await import("@web3auth/modal");
    return true;
  } catch (error) {
    console.warn('[Web3Auth] Packages not installed. Run: npm install @web3auth/modal @web3auth/base @web3auth/base-provider');
    return false;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let web3authInstance: any = null;
let isInitializing = false;

/**
 * Initialize Web3Auth SDK (singleton pattern)
 * Only initializes once, subsequent calls return existing instance
 * Uses dynamic imports for graceful degradation
 */
export async function initWeb3Auth(): Promise<any> {
  // Return existing instance if already initialized
  if (web3authInstance) {
    return web3authInstance;
  }

  // Prevent concurrent initialization
  if (isInitializing) {
    // Wait for initialization to complete
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (web3authInstance) {
      return web3authInstance;
    }
  }

  isInitializing = true;

  try {
    // Check if packages are available
    const isAvailable = await checkWeb3AuthAvailable();
    if (!isAvailable) {
      throw new Error('Web3Auth packages not installed');
    }

    // Get client ID from environment
    const clientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID;
    if (!clientId) {
      throw new Error('VITE_WEB3AUTH_CLIENT_ID not found in environment variables. Add it to your .env file.');
    }

    // Dynamic imports to avoid bundle errors
    const { Web3Auth } = await import("@web3auth/modal");
    const { CHAIN_NAMESPACES, WEB3AUTH_NETWORK, WALLET_ADAPTERS } = await import("@web3auth/base");
    const { CommonPrivateKeyProvider } = await import("@web3auth/base-provider");

    // Configure Polkadot/Substrate chain
    const chainConfig = {
      chainNamespace: CHAIN_NAMESPACES.OTHER,
      chainId: "0x91b171bb158e2d3848fa23a9f1c25182", // Polkadot mainnet
      rpcTarget: "https://polkadot-rpc.dwellir.com",
      displayName: "Polkadot Mainnet",
      blockExplorerUrl: "https://polkadot.subscan.io",
      ticker: "DOT",
      tickerName: "Polkadot",
    };

    // Create private key provider for Polkadot
    const privateKeyProvider = new CommonPrivateKeyProvider({
      config: { chainConfig },
    });

    // Initialize Web3Auth
    const web3auth = new Web3Auth({
      clientId,
      web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
      chainConfig,
      privateKeyProvider,
      uiConfig: {
        appName: "ChopDot",
        mode: "light", // Will be synced with app theme in future
        loginMethodsOrder: ["google"], // Google only for MVP
        defaultLanguage: "en",
        modalZIndex: "2147483647", // Ensure modal appears above app
      },
    });

    await web3auth.initModal({
      modalConfig: {
        // Enable only Google login
        [WALLET_ADAPTERS.OPENLOGIN]: {
          label: "openlogin",
          loginMethods: {
            google: {
              name: "google",
              showOnModal: true,
            },
            // Disable other methods for MVP
            facebook: { showOnModal: false },
            twitter: { showOnModal: false },
            reddit: { showOnModal: false },
            discord: { showOnModal: false },
            twitch: { showOnModal: false },
            apple: { showOnModal: false },
            line: { showOnModal: false },
            github: { showOnModal: false },
            kakao: { showOnModal: false },
            linkedin: { showOnModal: false },
            weibo: { showOnModal: false },
            wechat: { showOnModal: false },
            email_passwordless: { showOnModal: false },
          },
        },
      },
    });

    web3authInstance = web3auth;
    return web3auth;
  } catch (error) {
    console.error('[Web3Auth] Initialization failed:', error);
    throw error;
  } finally {
    isInitializing = false;
  }
}

/**
 * Login with Google OAuth
 * Creates MPC wallet automatically in background
 * Gracefully handles missing packages
 */
export async function loginWithGoogle(): Promise<SocialAuthResult> {
  try {
    // Check if packages are available first
    const isAvailable = await checkWeb3AuthAvailable();
    if (!isAvailable) {
      return {
        success: false,
        provider: 'google',
        error: 'Web3Auth packages not installed. Please contact support.',
      };
    }

    const web3auth = await initWeb3Auth();

    // Check if already connected
    if (web3auth.connected) {
      console.warn('[Web3Auth] Already connected, logging out first');
      await web3auth.logout();
    }

    // Connect with Google
    const provider = await web3auth.connect();
    
    if (!provider) {
      return {
        success: false,
        provider: 'google',
        error: 'No provider returned from Web3Auth',
      };
    }

    // Get user info
    const userInfo = await web3auth.getUserInfo();
    
    // Get Polkadot address
    const address = await getPolkadotAddress(provider);

    return {
      success: true,
      address,
      email: userInfo.email,
      name: userInfo.name,
      profileImage: userInfo.profileImage,
      provider: 'google',
    };
  } catch (error: any) {
    console.error('[Web3Auth] Login failed:', error);
    
    // Handle user cancellation gracefully
    if (error.message?.includes('user closed popup') || error.message?.includes('Modal is closed')) {
      return {
        success: false,
        provider: 'google',
        error: 'Login cancelled',
      };
    }

    // Handle missing packages
    if (error.message?.includes('not installed')) {
      return {
        success: false,
        provider: 'google',
        error: 'Google login is not configured yet. Please use email login.',
      };
    }

    // Handle missing env var
    if (error.message?.includes('VITE_WEB3AUTH_CLIENT_ID')) {
      return {
        success: false,
        provider: 'google',
        error: 'Google login is not configured yet. Please use email login.',
      };
    }

    return {
      success: false,
      provider: 'google',
      error: error.message || 'Login failed',
    };
  }
}

/**
 * Get Polkadot address from Web3Auth provider
 * Derives address from private key using dynamic imports
 */
async function getPolkadotAddress(provider: any): Promise<string> {
  try {
    // Import Polkadot libraries dynamically
    const { Keyring } = await import('@polkadot/keyring');
    const { u8aToHex } = await import('@polkadot/util');
    const { cryptoWaitReady } = await import('@polkadot/util-crypto');

    // Wait for crypto to be ready
    await cryptoWaitReady();

    // Get private key from provider
    const privateKey = await provider.request({
      method: "private_key",
    }) as string;

    if (!privateKey) {
      throw new Error('Failed to retrieve private key from provider');
    }

    // Create keyring
    const keyring = new Keyring({ type: 'sr25519', ss58Format: 0 });
    
    // Convert private key to proper format
    const privateKeyBuffer = Buffer.from(privateKey, 'hex');
    
    // Add account from private key
    const account = keyring.addFromSeed(privateKeyBuffer);
    
    // Return SS58 formatted address
    return account.address;
  } catch (error) {
    console.error('[Web3Auth] Failed to derive Polkadot address:', error);
    throw error;
  }
}

/**
 * Sign a message using Web3Auth wallet
 * Used for authentication and attestations
 */
export async function signMessage(message: string): Promise<string> {
  try {
    // Check availability
    const isAvailable = await checkWeb3AuthAvailable();
    if (!isAvailable) {
      throw new Error('Web3Auth packages not installed');
    }

    const web3auth = await initWeb3Auth();

    if (!web3auth.connected) {
      throw new Error('Web3Auth not connected. Please login first.');
    }

    const provider = web3auth.provider;
    if (!provider) {
      throw new Error('No provider available');
    }

    // Import Polkadot utilities dynamically
    const { u8aToHex, stringToU8a } = await import('@polkadot/util');
    
    // Get private key
    const privateKey = await provider.request({
      method: "private_key",
    }) as string;

    if (!privateKey) {
      throw new Error('Failed to retrieve private key');
    }

    // Sign message using Polkadot crypto
    const { Keyring } = await import('@polkadot/keyring');
    const keyring = new Keyring({ type: 'sr25519' });
    const privateKeyBuffer = Buffer.from(privateKey, 'hex');
    const account = keyring.addFromSeed(privateKeyBuffer);
    
    const signature = account.sign(stringToU8a(message));
    
    return u8aToHex(signature);
  } catch (error) {
    console.error('[Web3Auth] Message signing failed:', error);
    throw error;
  }
}

/**
 * Logout from Web3Auth
 * Clears session and disconnects wallet
 */
export async function logout(): Promise<void> {
  try {
    if (!web3authInstance) {
      console.warn('[Web3Auth] No instance to logout from');
      return;
    }

    if (web3authInstance.connected) {
      await web3authInstance.logout();
    }

    // Reset instance after logout
    web3authInstance = null;
  } catch (error) {
    console.error('[Web3Auth] Logout failed:', error);
    throw error;
  }
}

/**
 * Get current user info
 * Returns null if not logged in
 */
export async function getUserInfo(): Promise<Web3AuthUserInfo | null> {
  try {
    if (!web3authInstance || !web3authInstance.connected) {
      return null;
    }

    const userInfo = await web3authInstance.getUserInfo();
    return userInfo as Web3AuthUserInfo;
  } catch (error) {
    console.error('[Web3Auth] Failed to get user info:', error);
    return null;
  }
}

/**
 * Check if Web3Auth is connected
 */
export function isConnected(): boolean {
  return web3authInstance?.connected ?? false;
}

/**
 * Reset Web3Auth instance
 * Use with caution - for testing/debugging only
 */
export function resetInstance(): void {
  web3authInstance = null;
  isInitializing = false;
}
