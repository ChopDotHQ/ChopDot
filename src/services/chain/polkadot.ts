import type { PolkadotChainConfig } from './config';
import { POLKADOT_RELAY_CHAIN, POLKADOT_ASSET_HUB } from './config';
import { normalizeToPolkadot, isValidSs58Any } from './address';
import { encodeAddress, decodeAddress } from '@polkadot/util-crypto';

type SendDotParams = {
  from: string;
  to: string;
  amountDot: number;
  onStatus?: (s: 'submitted' | 'inBlock' | 'finalized', ctx?: { txHash?: string; blockHash?: string }) => void;
  forceBrowserExtension?: boolean; // If true, use browser extension even if WalletConnect session exists
};

type SendDotResult = {
  txHash: string;
  finalizedBlock?: string;
};

let apiPromise: Promise<any> | null = null;

async function getApi(config: PolkadotChainConfig) {
  // Always create new API instance for now (could optimize later)
  const { ApiPromise, WsProvider } = await import('@polkadot/api');
  const provider = new WsProvider(config.wsEndpoint);
  const api = await ApiPromise.create({ provider });
  return api;
}

function toPlanckString(amountDot: number, decimals: number): string {
  // Convert decimal number to planck string using BigInt without float rounding issues
  const s = amountDot.toString();
  const [intPart, fracPartRaw = ''] = s.split('.');
  const fracPart = fracPartRaw.slice(0, decimals); // trim extra precision
  const paddedFrac = (fracPart + '0'.repeat(decimals)).slice(0, decimals);
  const combined = `${intPart}${paddedFrac}`.replace(/^0+(?=\d)/, '');
  const asBigInt = BigInt(combined.length ? combined : '0');
  return asBigInt.toString();
}

export const polkadotChainService = (() => {
  let currentConfig: PolkadotChainConfig = POLKADOT_RELAY_CHAIN;
  
  const setChain = (chain: 'relay' | 'assethub') => {
    currentConfig = chain === 'assethub' ? POLKADOT_ASSET_HUB : POLKADOT_RELAY_CHAIN;
    // Reset API connection when switching chains
    apiPromise = null;
  };
  
  const getConfig = () => currentConfig;

  const isValidPolkadotAddress = (address: string): boolean => {
    if (!address || typeof address !== 'string') return false;
    try {
      // Ensure address decodes and matches SS58 prefix 0 when re-encoded
      const publicKey = decodeAddress(address);
      const encoded = encodeAddress(publicKey, currentConfig.ss58Prefix);
      return encoded === address;
    } catch (_) {
      return false;
    }
  };

  const isValidSs58 = (address: string): boolean => isValidSs58Any(address);

  const getFreeBalance = async (address: string): Promise<string> => {
    const config = getConfig();
    const api = await getApi(config);
    const normalized = normalizeToPolkadot(address);
    const accountData = await api.query.system.account(normalized);
    const free = accountData.data.free;
    return free.toString();
  };

  const sendDot = async ({ from, to, amountDot, onStatus, forceBrowserExtension = false }: SendDotParams): Promise<SendDotResult> => {
    try {
      const config = getConfig();
      const api = await getApi(config);

      // UX DECISION: If connected via WalletConnect (Nova Wallet), prefer browser extension signer
      // User has already authenticated via WalletConnect connection, so browser extension approval is sufficient
      // This provides faster, one-click approval in browser instead of requiring mobile approval
      // 
      // Only use WalletConnect signing if:
      // 1. forceBrowserExtension is false (user wants WalletConnect)
      // 2. AND no browser extension is available
      // 
      // Otherwise, use browser extension signer for better UX (faster approval)
      const { getWalletConnectSession } = await import('./walletconnect');
      const wcSession = getWalletConnectSession();
      let useWalletConnect = false;
      let useBrowserExtension = false;
      
      // Check if we should use browser extension (preferred for better UX)
      if (forceBrowserExtension || wcSession) {
        // Try browser extension first (faster, better UX)
        // IMPORTANT: Only use browser extension if it has the SAME address as the connected wallet
        try {
          const { web3Enable, web3Accounts, web3FromAddress } = await import('@polkadot/extension-dapp');
          const exts = await web3Enable('ChopDot');
          
          if (exts.length > 0) {
            // Check if any browser extension account matches the Nova Wallet address
            const accounts = await web3Accounts();
            const { normalizeToPolkadot } = await import('./address');
            const normalizedFrom = normalizeToPolkadot(from);
            const matchingAccount = accounts.find(acc => {
              const normalizedAcc = normalizeToPolkadot(acc.address);
              return normalizedAcc === normalizedFrom;
            });
            
            if (matchingAccount) {
              // Browser extension has matching address - use it for faster approval
              try {
                const injector = await web3FromAddress(from);
                if (injector && injector.signer) {
                  api.setSigner(injector.signer);
                  useBrowserExtension = true;
                } else {
                  // Injector not found - fall back to WalletConnect
                  if (wcSession && !forceBrowserExtension) {
                    useWalletConnect = true;
                  } else {
                    throw new Error('NO_ACCOUNT');
                  }
                }
              } catch (e: any) {
                // Error getting injector - fall back to WalletConnect
                if (wcSession && !forceBrowserExtension) {
                  useWalletConnect = true;
                } else {
                  throw new Error('NO_ACCOUNT');
                }
              }
            } else {
              // Browser extension exists but doesn't have matching address
              if (wcSession) {
                // Always fall back to WalletConnect if session exists (even if forceBrowserExtension is true)
                useWalletConnect = true;
              } else {
                throw new Error('NO_ACCOUNT');
              }
            }
          } else if (wcSession && !forceBrowserExtension) {
            // No browser extension but WalletConnect session exists - use WalletConnect
            useWalletConnect = true;
          } else {
            throw new Error('NO_WALLET');
          }
        } catch (e: any) {
          // Error checking for browser extension
          if (wcSession && !forceBrowserExtension) {
            useWalletConnect = true;
          } else {
            // Re-throw if we can't use WalletConnect
            throw e;
          }
        }
      } else {
        // No WalletConnect session - use browser extension
        const { web3Enable, web3FromAddress } = await import('@polkadot/extension-dapp');
        const exts = await web3Enable('ChopDot');
        if (!exts || exts.length === 0) {
          throw new Error('NO_WALLET');
        }

        const injector = await web3FromAddress(from);
        if (!injector) {
          throw new Error('NO_ACCOUNT');
        }

        api.setSigner(injector.signer);
        useBrowserExtension = true;
      }

      const value = toPlanckString(amountDot, config.dotDecimals);
      const toNorm = normalizeToPolkadot(to);
      
      // Create unsigned transaction (important for WalletConnect)
      const tx = api.tx.balances.transferKeepAlive(toNorm, value);

      // CRITICAL: Handle WalletConnect (Nova Wallet) transactions
      // Only use WalletConnect if we explicitly decided to use it above
      if (useWalletConnect && wcSession) {
        // SECURITY CHECK: Verify session is still valid
        const currentSession = getWalletConnectSession();
        if (!currentSession || currentSession.topic !== wcSession.topic) {
          console.error('[Chain Service] ❌ WalletConnect session expired or invalid!');
          throw new Error('WalletConnect session expired. Please reconnect.');
        }
        
        // SECURITY CHECK: Ensure no signer was accidentally set
        // If a signer exists, it means we might have taken the browser extension path
        // This would cause auto-signing instead of prompting Nova Wallet
        try {
          // Check if signer exists by trying to access it
          const hasSigner = (api as any).hasSigner || (api as any)._signer;
          if (hasSigner) {
            console.error('[Chain Service] ❌ SECURITY ERROR: Signer detected but WalletConnect session exists!');
            console.error('[Chain Service] ❌ This could cause auto-signing! Clearing signer...');
            console.error('[Chain Service] ❌ Session topic:', wcSession.topic);
            api.setSigner(null as any); // Clear signer
          }
        } catch (e) {
          // Ignore errors checking for signer - it might not be accessible
        }
        console.log('[Chain Service] 🔐 Sending transaction via WalletConnect (REQUIRES NOVA WALLET APPROVAL)');
        const { signAndSendTransaction } = await import('./walletconnect');
        
        // For WalletConnect, we need to send the UNSIGNED transaction
        // DO NOT sign the transaction here - WalletConnect will prompt Nova Wallet to sign
        // Get the unsigned transaction hex
        // Note: toHex() returns the SCALE-encoded extrinsic, which is what WalletConnect expects
        const txHex = tx.toHex();
        
        // Show submitted status - this means we're waiting for Nova Wallet approval
        onStatus?.('submitted');
        
        try {
          // Determine chain ID based on current config
          const currentChainId = config.name.includes('Asset Hub') 
            ? 'polkadot-asset-hub:91b171bb158e2d3848fa23a9f1c25182'
            : 'polkadot:91b171bb158e2d3848fa23a9f1c25182';
          
          // Send via WalletConnect - this MUST prompt Nova Wallet to sign
          const { txHash } = await signAndSendTransaction(from, txHex, currentChainId);
          
          // Return immediately with txHash - WalletConnect handles the submission
          // The transaction status will be updated asynchronously
          onStatus?.('inBlock', { txHash });
          
          return { txHash };
        } catch (err: any) {
          console.error('[Chain Service] ❌ WalletConnect transaction error:', err);
          if (err?.message === 'USER_REJECTED') {
            throw new Error('USER_REJECTED');
          }
          // Provide more context in error message
          throw new Error(err?.message || 'Transaction failed via WalletConnect');
        }
      } else {
        // Browser extension flow - this should only happen if NO WalletConnect session

      // Browser extension flow (Polkadot.js, SubWallet, etc.)
      return await new Promise<SendDotResult>((resolve, reject) => {
        let unsub: any;
        let isResolved = false;
        // Capture onStatus callback in outer scope
        const statusCallback = onStatus;
        
        // Cleanup function to ensure unsubscribe is called
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
        
        // Use original 'from' for injector matching; chain derives sender from signature
        tx.signAndSend(from, (result: any) => {
          const { status, dispatchError, txHash } = result;

          if (dispatchError) {
            if (!isResolved) {
              isResolved = true;
              cleanup();
              if (dispatchError.isModule) {
                // Module error from chain; surface generically
                reject(new Error('CHAIN_ERROR'));
              } else {
                reject(new Error(dispatchError.toString()));
              }
            }
            return;
          }

          if (status?.isBroadcast) {
            // submitted to network
            statusCallback?.('submitted');
          }
          if (status?.isInBlock && !isResolved) {
            // Provide tx hash early
            const hash = txHash?.toString?.() || tx.hash.toString();
            statusCallback?.('inBlock', { txHash: hash, blockHash: status.asInBlock.toString() });
            isResolved = true;
            // Don't cleanup here - wait for finalized
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
      }
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg === 'NO_WALLET') throw new Error('No wallet extension found');
      if (msg === 'NO_ACCOUNT') throw new Error('No Substrate account selected');
      if (msg === 'USER_REJECTED') throw new Error('User rejected the request');
      if (/InsufficientBalance|balance/.test(msg)) throw new Error('Insufficient balance');
      if (/ECONNREFUSED|websocket|connect/i.test(msg)) throw new Error('RPC connection failed');
      throw new Error(typeof e === 'string' ? e : 'Transaction failed');
    }
  };

  const estimateFee = async ({ from, to, amountDot }: { from: string; to: string; amountDot: number }): Promise<string> => {
    try {
      const config = getConfig();
      const api = await getApi(config);
      const value = toPlanckString(amountDot, config.dotDecimals);
      const toNorm = normalizeToPolkadot(to);
      const tx = api.tx.balances.transferKeepAlive(toNorm, value);
      
      // Try payment.queryInfo first, fallback if it fails
      try {
        // Use the tx directly, not toHex() - the API expects the extrinsic object
        const info = await api.rpc.payment.queryInfo(tx, from);
        return info.partialFee.toString();
      } catch (e) {
        // Fallback: estimate based on typical transfer fee (usually ~0.001-0.01 DOT)
        // Conservative estimate: ~0.01 DOT for Asset Hub, ~0.001 for Relay Chain
        const fallbackFee = config.name.includes('Asset Hub') ? '10000000' : '1000000'; // 0.01 or 0.001 DOT in planck
        return fallbackFee;
      }
    } catch (e) {
      // Very conservative fallback
      return '10000000'; // 0.01 DOT
    }
  };

  return {
    getConfig,
    setChain,
    getFreeBalance,
    isValidPolkadotAddress,
    isValidSs58,
    normalizeToPolkadot,
    sendDot,
    estimateFee,
    toPlanckString: (amountDot: number) => toPlanckString(amountDot, currentConfig.dotDecimals),
  };
})();

export type PolkadotChainService = typeof polkadotChainService;


