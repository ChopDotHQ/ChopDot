import { resolveChainKey, getActiveChain, getActiveChainConfig, type ChainConfig, type ChainKey } from './config';
import { normalizeToPolkadot, isValidSs58Any } from './address';
// Lazy import to avoid pulling in Polkadot code eagerly
// import { encodeAddress, decodeAddress } from '@polkadot/util-crypto';

type SendDotParams = {
  from: string;
  to: string;
  amountDot: number;
  onStatus?: (s: 'submitted' | 'inBlock' | 'finalized', ctx?: { txHash?: string; blockHash?: string }) => void;
  forceBrowserExtension?: boolean;
};

type SendDotResult = {
  txHash: string;
  finalizedBlock?: string;
};

type SignAndSendParams = {
  from: string;
  buildTx: (ctx: { api: any; config: ChainConfig }) => any;
  onStatus?: (s: 'submitted' | 'inBlock' | 'finalized', ctx?: { txHash?: string; blockHash?: string }) => void;
  forceBrowserExtension?: boolean;
};

const DEFAULT_CHAIN: ChainKey = getActiveChain();

let apiPromise: Promise<any> | null = null;
let currentChainKey: ChainKey = DEFAULT_CHAIN;
let currentRpcEndpoint: string | null = null;
let isCreatingApi = false; // Lock to prevent concurrent API creation

const getConfig = (): ChainConfig => {
  return getActiveChainConfig(); // Always respects VITE_CHAIN_NETWORK
};

const createApi = async (config: ChainConfig) => {
  const { ApiPromise, WsProvider } = await import('@polkadot/api');

  let lastError: unknown;

  let attemptIndex = 0;
  for (const endpoint of config.rpc) {
    attemptIndex++;
    const startTime = performance.now();
    // Declare provider and api outside try block so they're accessible in catch
    let provider: any = null;
    let api: any = null;
    
    try {
      console.log(`[Chain Service] Attempting to connect to RPC ${attemptIndex}/${config.rpc.length}: ${endpoint}`);
      
      try {
        // Remove timeout parameter - let WsProvider use its default timeout
        // This allows more time for WebSocket connections to establish
        provider = new WsProvider(endpoint);
        
        // Log provider state immediately after creation
        console.log(`[Chain Service] Provider created for ${endpoint}, checking connection state...`);
        
        // Add connection event listeners for diagnostics BEFORE creating API
        provider.on('connecting', () => {
          console.log(`[Chain Service] 🔄 WebSocket connecting to ${endpoint}...`);
        });
        
        provider.on('connected', () => {
          console.log(`[Chain Service] ✅ WebSocket connected to ${endpoint}`);
        });
        
        provider.on('disconnected', () => {
          console.log(`[Chain Service] ⚠️ WebSocket disconnected from ${endpoint}`);
        });
        
        provider.on('error', (err: unknown) => {
          console.error(`[Chain Service] ❌ WebSocket error for ${endpoint}:`, err);
        });
        
        // Create API - ApiPromise.create() should resolve quickly
        // In @polkadot/api v14+, it resolves immediately but connection happens via api.isReady
        console.log(`[Chain Service] Creating ApiPromise for ${endpoint}...`);
        console.log(`[Chain Service] Provider state before create:`, {
          isConnected: (provider as any).isConnected,
          hasSubscriptions: (provider as any).hasSubscriptions,
        });
        
        // Create API - ApiPromise.create() should resolve immediately
        // In @polkadot/api v14.3.1, it resolves quickly but connection happens via api.isReady
        console.log(`[Chain Service] Creating ApiPromise for ${endpoint}...`);
        const createStartTime = performance.now();
        
        // Check WebSocket support first
        if (typeof WebSocket === 'undefined') {
          throw new Error('WebSocket not supported in this browser');
        }
        
        // ApiPromise.create() should resolve immediately - wrap with timeout to detect hangs
        // If it takes > 2 seconds, something is wrong
        const createPromise = ApiPromise.create({ provider });
        const createTimeout = new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error(`ApiPromise.create() hung for ${endpoint} - WebSocket may be blocked`)), 2000)
        );
        
        api = await Promise.race([createPromise, createTimeout]);
        const createDuration = performance.now() - createStartTime;
        
        if (createDuration > 100) {
          console.warn(`[Chain Service] ⚠️ ApiPromise.create() took ${createDuration.toFixed(2)}ms (unusually slow)`);
        } else {
          console.log(`[Chain Service] ✅ ApiPromise created for ${endpoint} (took ${createDuration.toFixed(2)}ms)`);
        }
        
        // Check if API object was created correctly
        if (!api || typeof api.isReady === 'undefined') {
          throw new Error(`ApiPromise.create() returned invalid API object for ${endpoint}`);
        }
        
        // Wait for API to be ready (ensures WebSocket connection is fully established)
        // This is where the actual connection happens
        console.log(`[Chain Service] Waiting for API to be ready for ${endpoint}...`);
        const readyTimeoutPromise = new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error(`API ready timeout for ${endpoint} (connection not established)`)), 30000) // 30 seconds for connection
        );
        
        await Promise.race([api.isReady, readyTimeoutPromise]);
        console.log(`[Chain Service] ✅ API is ready for ${endpoint}`);
        
      const duration = performance.now() - startTime;
      currentRpcEndpoint = endpoint; // Track which endpoint succeeded
      
      // RPC telemetry: log successful connection
        console.log('[RPC Telemetry]', {
          endpoint,
          attempt: attemptIndex,
          success: true,
          durationMs: duration.toFixed(2),
          isFallback: attemptIndex > 1,
        });
      
        console.info('[Chain Service] ✅ Connected to Asset Hub RPC:', endpoint);

        provider.on('error', (err: unknown) => {
        console.error('[Chain Service] Provider error', endpoint, err);
          // Reset API promise on error to force reconnection
          apiPromise = null;
          currentRpcEndpoint = null;
      });

      provider.on('disconnected', () => {
        console.warn('[Chain Service] Provider disconnected', endpoint);
        apiPromise = null;
        currentRpcEndpoint = null; // Clear on disconnect
      });

      return api;
      } catch (innerError) {
        // Handle errors from ApiPromise.create() or api.isReady
        console.error(`[Chain Service] ❌ Inner error for ${endpoint}:`, innerError);
        // Clean up API if it was created
        if (api) {
          try {
            await api.disconnect();
          } catch (disconnectError) {
            // Ignore disconnect errors
          }
        }
        throw innerError;
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      
      // RPC telemetry: log fallback event
        console.warn('[RPC Telemetry]', {
          endpoint,
          attempt: attemptIndex,
          success: false,
          durationMs: duration.toFixed(2),
          error: error instanceof Error ? error.message : String(error),
          willFallback: attemptIndex < config.rpc.length,
        });
      
      console.error(`[Chain Service] ❌ Failed to connect to ${endpoint}:`, error);
      lastError = error;
      
      // Clean up failed provider and API to prevent connection leaks
      try {
        if (api) {
          await api.disconnect();
        }
      } catch (apiCleanupError) {
        // Ignore API cleanup errors
      }
      
      try {
        if (provider && typeof provider.disconnect === 'function') {
          provider.disconnect();
        }
      } catch (providerCleanupError) {
        // Ignore provider cleanup errors
        console.warn(`[Chain Service] Failed to cleanup provider for ${endpoint}:`, providerCleanupError);
      }
    }
  }

  // Provide helpful error message for WebSocket blocking
  const isWebSocketBlocked = lastError instanceof Error && 
    lastError.message.includes('ApiPromise.create() hung');
  
  let errorMsg: string;
  if (isWebSocketBlocked) {
    errorMsg = `WebSocket connections are being blocked. This prevents connecting to Polkadot RPC endpoints. ` +
      `Possible causes: browser extensions (ad blockers, privacy tools), firewall, antivirus, or network restrictions. ` +
      `Try: disabling extensions, using incognito mode, or checking firewall settings.`;
    console.error('[Chain Service] ❌ WebSocket Blocking Detected');
    console.error('[Chain Service] Troubleshooting steps:');
    console.error('  1. Disable browser extensions (especially ad blockers)');
    console.error('  2. Try incognito/private browsing mode');
    console.error('  3. Check firewall/antivirus settings');
    console.error('  4. Try a different network');
  } else {
    errorMsg = `Failed to connect to any Asset Hub RPC endpoint${lastError instanceof Error ? `: ${lastError.message}` : ''}`;
  }
  
  console.error('[Chain Service]', errorMsg);
  throw new Error(errorMsg);
};

const getApi = async (timeoutMs: number = 120000): Promise<any> => {
  // Prevent concurrent API creation - wait if one is already being created
  if (isCreatingApi && apiPromise) {
    console.log('[Chain Service] API creation already in progress, waiting...');
    return apiPromise;
  }
  
  if (!apiPromise) {
    isCreatingApi = true;
    apiPromise = createApi(getConfig())
      .then((api) => {
        isCreatingApi = false;
        return api;
      })
      .catch((error) => {
        isCreatingApi = false;
        apiPromise = null; // Clear on error so we can retry
        throw error;
      });
  }
  
  // Add timeout to API connection promise
  // Use 120 seconds default to allow all 4 endpoints to be tried (4 × 30s = 120s max)
  return Promise.race([
    apiPromise,
    new Promise<any>((_, reject) => 
      setTimeout(() => reject(new Error(`API connection timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

const toPlanckString = (amountDot: number, decimals: number): string => {
  const s = amountDot.toString();
  const [intPart, fracPartRaw = ''] = s.split('.');
  const fracPart = fracPartRaw.slice(0, decimals);
  const paddedFrac = (fracPart + '0'.repeat(decimals)).slice(0, decimals);
  const combined = `${intPart}${paddedFrac}`.replace(/^0+(?=\d)/, '');
  const asBigInt = BigInt(combined.length ? combined : '0');
  return asBigInt.toString();
};

export const polkadotChainService = (() => {
  const setChain = (chain: 'relay' | 'assethub') => {
    const resolved = resolveChainKey(chain);
    if (currentChainKey !== resolved) {
      currentChainKey = resolved;
      apiPromise = null;
    }
  };

  const getCurrentChain = (): 'assethub' => {
    // Always return 'assethub' to match adapter interface
    return currentChainKey === 'westend' ? 'assethub' : currentChainKey;
  };

  const isValidPolkadotAddress = async (address: string): Promise<boolean> => {
    if (!address || typeof address !== 'string') return false;
    try {
      const { encodeAddress, decodeAddress } = await import('@polkadot/util-crypto');
      const config = getConfig();
      const publicKey = decodeAddress(address);
      const encoded = encodeAddress(publicKey, config.ss58);
      return encoded === address;
    } catch (_) {
      return false;
    }
  };

  const isValidSs58 = (address: string): boolean => isValidSs58Any(address);

  const getFreeBalance = async (address: string): Promise<string> => {
    try {
      console.log('[Chain] Getting API connection...');
      // Use 120 second timeout to allow all RPC endpoints to be tried (4 × 30s = 120s max)
      const api = await getApi(120000);
      
      // Wait for API to be ready before querying (critical!)
      console.log('[Chain] Waiting for API to be ready...');
      await api.isReady;
      console.log('[Chain] API is ready, querying balance...');
      
    const normalized = normalizeToPolkadot(address);
    const accountData = await api.query.system.account(normalized);
      const balance = accountData.data.free.toString();
      
      console.log('[Chain] Balance query successful:', { address: normalized.slice(0, 10) + '...', balance });
      return balance;
    } catch (error) {
      console.error('[Chain] getFreeBalance error:', error);
      throw error;
    }
  };

  const signAndSendExtrinsic = async ({ from, buildTx, onStatus, forceBrowserExtension = false }: SignAndSendParams): Promise<SendDotResult> => {
    try {
      const config = getConfig();
      const api = await getApi();
      await api.isReady; // Ensure API is ready before using it

      const { getWalletConnectSession } = await import('./walletconnect');
      const wcSession = getWalletConnectSession();
      let useWalletConnect = false;

      if (forceBrowserExtension || wcSession) {
        try {
          const { web3Enable, web3Accounts, web3FromAddress } = await import('@polkadot/extension-dapp');
          const exts = await web3Enable('ChopDot');

          if (exts.length > 0) {
            const accounts = await web3Accounts();
            const normalizedFrom = normalizeToPolkadot(from);
            const matchingAccount = accounts.find(acc => normalizeToPolkadot(acc.address) === normalizedFrom);

            if (matchingAccount) {
              try {
                const injector = await web3FromAddress(from);
                if (injector?.signer) {
                  api.setSigner(injector.signer);
                } else if (wcSession && !forceBrowserExtension) {
                  useWalletConnect = true;
                } else {
                  throw new Error('NO_ACCOUNT');
                }
              } catch (e: any) {
                if (wcSession && !forceBrowserExtension) {
                  useWalletConnect = true;
                } else {
                  throw new Error('NO_ACCOUNT');
                }
              }
            } else if (wcSession) {
              useWalletConnect = true;
            } else {
              throw new Error('NO_ACCOUNT');
            }
          } else if (wcSession && !forceBrowserExtension) {
            useWalletConnect = true;
          } else {
            throw new Error('NO_WALLET');
          }
        } catch (e: any) {
          if (wcSession && !forceBrowserExtension) {
            useWalletConnect = true;
          } else {
            throw e;
          }
        }
      } else {
        const { web3Enable, web3FromAddress } = await import('@polkadot/extension-dapp');
        const exts = await web3Enable('ChopDot');
        if (!exts || exts.length === 0) throw new Error('NO_WALLET');

        const injector = await web3FromAddress(from);
        if (!injector) throw new Error('NO_ACCOUNT');

        api.setSigner(injector.signer);
      }

      const tx = buildTx({ api, config });

      if (useWalletConnect && wcSession) {
        const { signAndSendTransaction } = await import('./walletconnect');
        const currentSession = getWalletConnectSession();
        if (!currentSession || currentSession.topic !== wcSession.topic) {
          throw new Error('WalletConnect session expired. Please reconnect.');
        }

        try {
          api.setSigner(null as any);
        } catch {
          // ignore signer clearing errors
        }

        const txHex = tx.toHex();
        onStatus?.('submitted');

        try {
          const { txHash } = await signAndSendTransaction(from, txHex);
          onStatus?.('inBlock', { txHash });
          return { txHash };
        } catch (err: any) {
          if (err?.message === 'USER_REJECTED') {
            throw new Error('USER_REJECTED');
          }
          throw new Error(err?.message || 'Transaction failed via WalletConnect');
        }
      }

      return await new Promise<SendDotResult>((resolve, reject) => {
        let unsub: any;
        let isResolved = false;
        const statusCallback = onStatus;

        const cleanup = () => {
          if (unsub && typeof unsub === 'function') {
            try {
              unsub();
            } catch (e) {
              console.warn('[Chain Service] Error unsubscribing:', e);
            }
            unsub = null;
          }
        };

        tx.signAndSend(from, (result: any) => {
          const { status, dispatchError, txHash } = result;

          if (dispatchError) {
            if (!isResolved) {
              isResolved = true;
              cleanup();
              if (dispatchError.isModule) {
                reject(new Error('CHAIN_ERROR'));
              } else {
                reject(new Error(dispatchError.toString()));
              }
            }
            return;
          }

          if (status?.isBroadcast) {
            statusCallback?.('submitted');
          }
          if (status?.isInBlock && !isResolved) {
            const hash = txHash?.toString?.() || tx.hash.toString();
            statusCallback?.('inBlock', { txHash: hash, blockHash: status.asInBlock.toString() });
            isResolved = true;
            resolve({ txHash: hash });
          }
          if (status?.isFinalized) {
            statusCallback?.('finalized', { blockHash: status.asFinalized.toString() });
            cleanup();
          }
        })
          .then((u: any) => {
            unsub = u;
          })
          .catch((err: any) => {
            cleanup();
            if (!isResolved) {
              isResolved = true;
              if (String(err?.message || err).includes('Cancelled')) {
                reject(new Error('USER_REJECTED'));
              } else {
                reject(err);
              }
            }
          });
      });
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg === 'NO_WALLET') throw new Error('No wallet extension found');
      if (msg === 'NO_ACCOUNT') throw new Error('No Substrate account selected');
      if (msg === 'USER_REJECTED') throw new Error('User rejected the request');
      if (/InsufficientBalance|balance/i.test(msg)) throw new Error('Insufficient balance');
      if (/ECONNREFUSED|websocket|connect/i.test(msg)) throw new Error('RPC connection failed');
      throw new Error(typeof e === 'string' ? e : 'Transaction failed');
    }
  };

  const sendDot = async ({ from, to, amountDot, onStatus, forceBrowserExtension = false }: SendDotParams): Promise<SendDotResult> => {
    const config = getConfig();
    return signAndSendExtrinsic({
      from,
      onStatus,
      forceBrowserExtension,
      buildTx: ({ api }) => {
        const value = toPlanckString(amountDot, config.decimals);
        const toNorm = normalizeToPolkadot(to);
        return api.tx.balances.transferKeepAlive(toNorm, value);
      },
    });
  };

  const estimateFee = async ({ from, to, amountDot }: { from: string; to: string; amountDot: number }): Promise<string> => {
    try {
      const config = getConfig();
      const api = await getApi();
      const value = toPlanckString(amountDot, config.decimals);
      const toNorm = normalizeToPolkadot(to);
      const tx = api.tx.balances.transferKeepAlive(toNorm, value);

      try {
        const info = await api.rpc.payment.queryInfo(tx, from);
        return info.partialFee.toString();
      } catch {
        return '10000000'; // 0.01 DOT as conservative fallback
      }
    } catch {
      return '10000000';
    }
  };

  const buildSubscanUrl = (txHash: string) => `${getConfig().subscanExtrinsicBase}/${txHash}`;

  const getCurrentRpc = (): string | null => currentRpcEndpoint;

  return {
    setChain,
    getCurrentChain,
    getConfig,
    getCurrentRpc,
    getFreeBalance,
    isValidPolkadotAddress,
    isValidSs58,
    normalizeToPolkadot,
    sendDot,
    estimateFee,
    signAndSendExtrinsic,
    buildSubscanUrl,
    toPlanckString: (amountDot: number) => toPlanckString(amountDot, getConfig().decimals),
  };
})();

export type PolkadotChainService = typeof polkadotChainService;
