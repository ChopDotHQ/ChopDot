import { CHAIN_CONFIG, resolveChainKey, getActiveChain, getActiveChainConfig, type ChainConfig, type ChainKey } from './config';
import { normalizeToPolkadot, isValidSs58Any } from './address';
import { encodeAddress, decodeAddress } from '@polkadot/util-crypto';

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
    try {
      const provider = new WsProvider(endpoint);
      const api = await ApiPromise.create({ provider });
      const duration = performance.now() - startTime;
      currentRpcEndpoint = endpoint; // Track which endpoint succeeded
      
      // RPC telemetry: log successful connection
      if (import.meta.env.DEV) {
        console.log('[RPC Telemetry]', {
          endpoint,
          attempt: attemptIndex,
          success: true,
          durationMs: duration.toFixed(2),
          isFallback: attemptIndex > 1,
        });
      }
      
      console.info('[Chain Service] Connected to Asset Hub RPC:', endpoint);

      provider.on('error', (err) => {
        console.error('[Chain Service] Provider error', endpoint, err);
      });

      provider.on('disconnected', () => {
        console.warn('[Chain Service] Provider disconnected', endpoint);
        apiPromise = null;
        currentRpcEndpoint = null; // Clear on disconnect
      });

      return api;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      // RPC telemetry: log fallback event
      if (import.meta.env.DEV) {
        console.warn('[RPC Telemetry]', {
          endpoint,
          attempt: attemptIndex,
          success: false,
          durationMs: duration.toFixed(2),
          error: error instanceof Error ? error.message : String(error),
          willFallback: attemptIndex < config.rpc.length,
        });
      }
      
      console.error('[Chain Service] Failed to connect to', endpoint, error);
      lastError = error;
    }
  }

  throw new Error(
    `Failed to connect to any Asset Hub RPC endpoint${lastError instanceof Error ? `: ${lastError.message}` : ''}`
  );
};

const getApi = async () => {
  if (!apiPromise) {
    apiPromise = createApi(getConfig());
  }
  return apiPromise;
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

  const getCurrentChain = () => currentChainKey;

  const isValidPolkadotAddress = (address: string): boolean => {
    if (!address || typeof address !== 'string') return false;
    try {
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
    const api = await getApi();
    const normalized = normalizeToPolkadot(address);
    const accountData = await api.query.system.account(normalized);
    return accountData.data.free.toString();
  };

  const signAndSendExtrinsic = async ({ from, buildTx, onStatus, forceBrowserExtension = false }: SignAndSendParams): Promise<SendDotResult> => {
    try {
      const config = getConfig();
      const api = await getApi();

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
