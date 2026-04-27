import { useCallback, useState } from 'react';
import { useAuth, type AuthMethod, type OAuthProvider } from '../../../contexts/AuthContext';
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
          throw new Error('Polkadot wallet login is not available in this version.');
        }
        case 'rainbow': {
          throw new Error('WalletConnect is not available in MVP');
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
  }, [login, getWalletAuthMessage, setLoading, setError, onLoginSuccess]);

  const loginWithExtension = useCallback(async ({
    walletDisplayName: _walletDisplayName,
    notFoundMessage,
  }: {
    sources?: string[];
    walletDisplayName: string;
    notFoundMessage: string;
    }) => {
    try {
      triggerHaptic('light');
      setLoading(true);
      setError(null);

      throw new Error(notFoundMessage);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Wallet extension not available in this version');
      console.error('[Login] Extension login failed:', error);
      const friendlyError = error.message?.includes('not found') ? notFoundMessage : error.message;
      setError(friendlyError);
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const completeExtensionLogin = useCallback(async (selectedAccount: PendingExtensionAccount) => {
    try {
      triggerHaptic('light');
      setLoading(true);
      setError(null);

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
  }, [getWalletAuthMessage, login, onLoginSuccess, pendingExtensionWalletName, setError, setLoading]);

  const cancelExtensionAccountSelection = useCallback(() => {
    setPendingExtensionAccounts([]);
    setPendingExtensionWalletName(null);
    setLoading(false);
  }, [setLoading]);

  const handleWalletConnectModal = useCallback(async () => {
    setError('WalletConnect is not available in MVP');
  }, [setError]);

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
