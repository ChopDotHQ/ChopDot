import { useCallback, useState } from 'react';
import { useAuth, type AuthMethod, type OAuthProvider } from '../../../contexts/AuthContext';
import { useAccount } from '../../../contexts/AccountContext';
import { signPolkadotMessage } from '../../../utils/walletAuth';
import { triggerHaptic } from '../../../utils/haptics';

interface UseSignInHandlersProps {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  onLoginSuccess?: () => void;
  getWalletAuthMessage: (addr: string) => Promise<string>;
}

interface PendingExtensionAccount {
  address: string;
  name?: string;
  source?: string;
}

export function useSignInHandlers({
  setLoading,
  setError,
  onLoginSuccess,
  getWalletAuthMessage,
}: UseSignInHandlersProps) {
  const { login, loginWithOAuth: loginWithOAuthAction, loginAsGuest: loginAsGuestAction } = useAuth();
  const account = useAccount();
  const [pendingExtensionAccounts, setPendingExtensionAccounts] = useState<PendingExtensionAccount[]>([]);
  const [pendingExtensionWalletName, setPendingExtensionWalletName] = useState<string | null>(null);

  const handleOAuthLogin = useCallback(async (provider: OAuthProvider) => {
    try {
      setLoading(true);
      setError(null);
      triggerHaptic('light');
      await loginWithOAuthAction(provider);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to sign in with ${provider}`;
      console.error(`${provider} login failed:`, err);
      setError(msg);
      triggerHaptic('error');
      setLoading(false);
    }
  }, [loginWithOAuthAction, setLoading, setError]);

  const handleGuestLogin = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      triggerHaptic('light');
      await loginAsGuestAction();
      triggerHaptic('medium');
      onLoginSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to continue as guest';
      console.error('Guest login failed:', err);
      setError(msg);
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  }, [loginAsGuestAction, setLoading, setError, onLoginSuccess]);

  const handleWalletLogin = useCallback(async (method: AuthMethod) => {
    try {
      setLoading(true);
      setError(null);
      triggerHaptic('light');

      let address: string;
      let signature: string;

      switch (method) {
        case 'polkadot': {
          const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp');
          const extensions = await web3Enable('ChopDot');
          const polkadotJsExtension = extensions.find(ext =>
            ext.name === 'polkadot-js' || ext.name.toLowerCase().includes('polkadot.js')
          );
          if (!polkadotJsExtension) throw new Error('Polkadot.js extension not found. Please install Polkadot.js browser extension.');

          const accounts = await web3Accounts();
          const polkadotJsAccount = accounts.find(acc => acc.meta.source === 'polkadot-js');
          if (!polkadotJsAccount) throw new Error('No Polkadot.js account found. Please create an account in Polkadot.js extension.');

          address = polkadotJsAccount.address;
          try {
            await Promise.race([
              account.connectExtension(address),
              new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 15000)),
            ]);
          } catch (e) {
            console.warn('[Login] AccountContext connection issue (continuing anyway):', e);
          }

          const message = await getWalletAuthMessage(address);
          signature = await signPolkadotMessage(address, message);
          break;
        }
        case 'rainbow': {
          const walletConnectModule = await import('../../../services/chain/walletconnect');
          const { connectViaWalletConnectModal, createWalletConnectSigner } = walletConnectModule;
          const { address: wcAddress } = await connectViaWalletConnectModal();
          await account.syncWalletConnectSession();

          const { stringToHex } = await import('@polkadot/util');
          const signer = createWalletConnectSigner(wcAddress);
          const message = await getWalletAuthMessage(wcAddress);
          const { signature: sig } = await signer.signRaw({ address: wcAddress, data: stringToHex(message) });
          address = wcAddress;
          signature = sig;
          break;
        }
        default:
          throw new Error('Unsupported wallet type');
      }

      const chain = method === 'polkadot' ? 'polkadot' : 'evm';
      await login(method, { type: 'wallet', address, signature, chain });
      triggerHaptic('medium');
      onLoginSuccess?.();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Failed to connect wallet');
      console.error('Wallet login failed:', error);

      let friendlyError = 'Failed to connect wallet';
      if (error.message?.includes('Polkadot.js extension not found')) {
        friendlyError = 'Polkadot.js extension not found. Please install the Polkadot.js browser extension.';
      } else if (error.message?.includes('No Polkadot.js account')) {
        friendlyError = 'No Polkadot.js account found. Please create an account in your Polkadot.js extension.';
      } else if (error.message?.includes('WalletConnect')) {
        friendlyError = 'WalletConnect connection failed. Please try again or use Polkadot.js.';
      } else if ((err as Record<string, unknown>)?.code === 4001 || error.message?.includes('User rejected')) {
        friendlyError = 'Connection cancelled. Please try again if you want to connect your wallet.';
      } else if (error.message) {
        friendlyError = error.message;
      }
      setError(friendlyError);
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  }, [login, account, getWalletAuthMessage, setLoading, setError, onLoginSuccess]);

  const loginWithExtension = useCallback(async ({
    sources,
    walletDisplayName,
    notFoundMessage,
  }: {
    sources: string[];
    walletDisplayName: string;
    notFoundMessage: string;
    }) => {
    try {
      triggerHaptic('light');
      setLoading(true);
      setError(null);

      const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp');
      await web3Enable('ChopDot');
      const accounts = await web3Accounts();
      const matchedAccounts = accounts.filter((acc) => {
        const metaSource = (acc.meta.source || '').toLowerCase();
        return sources.some((source) => metaSource === source || metaSource === source.replace('-js', ''));
      });
      if (matchedAccounts.length === 0) throw new Error(notFoundMessage);

      if (matchedAccounts.length > 1) {
        setPendingExtensionAccounts(
          matchedAccounts.map((matchedAccount) => ({
            address: matchedAccount.address,
            name: matchedAccount.meta.name,
            source: matchedAccount.meta.source,
          })),
        );
        setPendingExtensionWalletName(walletDisplayName);
        return;
      }

      const matchedAccount = matchedAccounts[0];
      if (!matchedAccount) throw new Error(notFoundMessage);

      const address = matchedAccount.address;
      try {
        await account.connectExtension(address, false, matchedAccount.meta.source);
      } catch (connectionError) {
        console.warn(`[Login] ${walletDisplayName} auto-connect issue (continuing anyway):`, connectionError);
      }

      const message = await getWalletAuthMessage(address);
      const signature = await signPolkadotMessage(address, message);
      await login('polkadot', { type: 'wallet', address, signature, chain: 'polkadot' });
      triggerHaptic('medium');
      onLoginSuccess?.();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(`Failed to connect ${walletDisplayName}`);
      console.error(`[Login] ${walletDisplayName} login failed:`, error);
      const friendlyError = error.message?.includes('not found') ? notFoundMessage : error.message;
      setError(friendlyError);
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  }, [login, account, getWalletAuthMessage, setLoading, setError, onLoginSuccess]);

  const completeExtensionLogin = useCallback(async (selectedAccount: PendingExtensionAccount) => {
    try {
      triggerHaptic('light');
      setLoading(true);
      setError(null);

      try {
        await account.connectExtension(selectedAccount.address, false, selectedAccount.source);
      } catch (connectionError) {
        console.warn(
          `[Login] ${pendingExtensionWalletName || 'extension'} account connect issue (continuing anyway):`,
          connectionError,
        );
      }

      const message = await getWalletAuthMessage(selectedAccount.address);
      const signature = await signPolkadotMessage(selectedAccount.address, message);
      await login('polkadot', { type: 'wallet', address: selectedAccount.address, signature, chain: 'polkadot' });
      triggerHaptic('medium');
      setPendingExtensionAccounts([]);
      setPendingExtensionWalletName(null);
      onLoginSuccess?.();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(`Failed to connect ${pendingExtensionWalletName || 'wallet'}`);
      console.error('[Login] Extension account login failed:', error);
      setError(error.message || 'Failed to connect wallet');
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  }, [account, getWalletAuthMessage, login, onLoginSuccess, pendingExtensionWalletName, setError, setLoading]);

  const cancelExtensionAccountSelection = useCallback(() => {
    setPendingExtensionAccounts([]);
    setPendingExtensionWalletName(null);
    setLoading(false);
  }, [setLoading]);

  const handleWalletConnectModal = useCallback(async () => {
    try {
      triggerHaptic('light');
      setLoading(true);
      setError(null);

      const walletConnectModule = await import('../../../services/chain/walletconnect');
      const { connectViaWalletConnectModal, createWalletConnectSigner, signEvmMessage } = walletConnectModule;
      const { address, chain } = await connectViaWalletConnectModal();

      if (chain === 'evm') {
        const message = await getWalletAuthMessage(address);
        const signature = await signEvmMessage(address, message);
        await login('ethereum', { type: 'wallet', address, signature, chain: 'evm' });
      } else {
        const { stringToHex } = await import('@polkadot/util');
        await account.syncWalletConnectSession();
        await new Promise((resolve) => setTimeout(resolve, 400));
        const signer = createWalletConnectSigner(address);
        const message = await getWalletAuthMessage(address);
        const { signature } = await signer.signRaw({ address, data: stringToHex(message) });
        await login('rainbow', { type: 'wallet', address, signature, chain: 'polkadot' });
      }

      triggerHaptic('medium');
      onLoginSuccess?.();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Failed to connect with WalletConnect');
      const isUserCancel = error.message?.includes('User rejected') || error.message?.includes('cancelled') || error.message?.includes('Rejected');
      if (isUserCancel) {
        setError(null);
        triggerHaptic('light');
      } else {
        setError(error.message || 'Failed to connect with WalletConnect');
        triggerHaptic('error');
      }
    } finally {
      setLoading(false);
    }
  }, [login, account, getWalletAuthMessage, setLoading, setError, onLoginSuccess]);

  return {
    handleOAuthLogin,
    handleGuestLogin,
    handleWalletLogin,
    loginWithExtension,
    pendingExtensionAccounts,
    pendingExtensionWalletName,
    completeExtensionLogin,
    cancelExtensionAccountSelection,
    handleWalletConnectModal,
  };
}
