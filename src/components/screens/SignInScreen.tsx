/**
 * LOGIN SCREEN
 * 
 * Authentication screen supporting multiple sign-in methods:
 * - Polkadot.js (direct connection)
 * - Other wallets via WalletConnect (SubWallet, Talisman, MetaMask, Rainbow, etc.)
 */

import { useRef, useEffect } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { useAuth, AuthMethod } from '../../contexts/AuthContext';
import { useAccount } from '../../contexts/AccountContext';
import {
  signPolkadotMessage,
} from '../../utils/walletAuth';
import { triggerHaptic } from '../../utils/haptics';
// QRCodeLib removed



import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from '../ui/drawer';
import {
  ChopDotMark,
  MobileWalletConnectPanel,
  ViewModeToggle,
  LoginVariantToggle,
  WalletConnectModalToggle,
} from '../auth/SignInComponents';
import { WalletLoginPanel } from '../auth/panels/WalletLoginPanel';
import { EmailLoginPanel } from '../auth/panels/EmailLoginPanel';
import { useLoginState } from '../auth/hooks/useLoginState';
import { useWalletAuth } from '../auth/hooks/useWalletAuth';
import { useThemeHandler } from '../auth/hooks/useThemeHandler';
import { useEmailAuth } from '../auth/hooks/useEmailAuth';
import { SignupPanel } from '../auth/panels/SignupPanel';
import { AuthFooter } from '../auth/AuthFooter';
import {

  type WalletOptionTheme,
  defaultPanelTheme,
  emailOptionTheme,
  sceneBackgroundStyles,
  frostedPanelThemes,
  frostedWalletThemes,
  frostedGuestThemes,
  frostedWalletOverrides,
  polkadotSecondAgePanelThemes,
  polkadotSecondAgeWalletThemes,
  polkadotSecondAgeGuestThemes,
  polkadotSecondAgeWalletOverrides,
  getPolkadotSecondAgeEmailOverride,
  getPolkadotSecondAgeSceneBackgroundStyles,
} from '../auth/SignInThemes';

declare global {
  interface Window {
    analytics?: {
      track?: (event: string, payload?: Record<string, unknown>) => void;
    };
  }
}

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

// LoginViewOverride removed


type WalletIntegrationKind = 'official-extension' | 'browser-extension' | 'walletconnect' | 'email';

interface WalletOptionConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: {
    src: string;
    alt: string;
  };
  integrationKind: WalletIntegrationKind;
  handler: (e?: React.MouseEvent) => void;
  showsLoadingIndicator?: boolean;
  themeOverride?: Partial<WalletOptionTheme>;
}

const POLKADOT_JS_LOGO = '/assets/Logos/Polkadot Js Logo.png';
const WALLETCONNECT_LOGO = '/assets/Logos/Wallet Connect Logo.png';
const SUBWALLET_LOGO = '/assets/Logos/Subwallet Logo.png';
const TALISMAN_LOGO = '/assets/Logos/Talisman Wallet Logo.png';
const EMAIL_LOGIN_LOGO = '/assets/Logos/choptdot_whitebackground.png';
// SignInThemes import removed isFlagEnabled, assuming unused here or handled in hook.
// isFlagEnabled was previously defined here.
// LoginViewOverride appears unused now.

const trackEvent = (name: string, payload?: Record<string, unknown>) => {
  try {
    window?.analytics?.track?.(name, payload);
  } catch (err) {
    console.debug(`[analytics] ${name}`, payload);
  }
};

export function SignInScreen({ onLoginSuccess }: LoginScreenProps) {
  const { login, loginAsGuest } = useAuth();
  const account = useAccount(); // Get AccountContext to auto-connect wallet


  // Custom Hook: Login State Management
  const {
    loading, setLoading,
    error, setError,
    viewModeOverride, setViewModeOverride,
    authPanelView, setAuthPanelView,
    showEmailLogin, setShowEmailLogin,
    wcModalEnabled, setWcModalEnabled,
    device,
    isDev,
    enableMobileUi,
    resolvedViewMode,
    isMobileWalletFlow,
    enableWcModal,
    openEmailLoginDrawer
  } = useLoginState();


  const {
    panelMode,
    loginVariant, setLoginVariant,
    backgroundIndex
  } = useThemeHandler();

  // Custom Hook: Wallet Logic
  const {
    showWalletConnectQR, setShowWalletConnectQR,
    walletConnectQRCode, setWalletConnectQRCode,
    setIsWaitingForWalletConnect,
    isWaitingForSignature, setIsWaitingForSignature,
    getWalletAuthMessage,
    startWalletConnectSession: startWalletConnectSessionHook
  } = useWalletAuth({
    setLoading,
    setError,
    onLoginSuccess,
    isMobileWalletFlow,
    enableWcModal
  });

  // Custom Hook: Email Auth
  const {
    emailCredentials, setEmailCredentials,
    keepSignedIn, handleKeepSignedInChange,
    rememberEmail, setRememberEmail,
    handleEmailLogin,
    handlePasswordRecovery,
    signupForm, setSignupForm,
    signupFeedback, setSignupFeedback,
    handleSignupSubmit
  } = useEmailAuth({
    setLoading,
    setError,
    onLoginSuccess,
    setShowEmailLogin
  });

  const hasTrackedMobilePanelRef = useRef(false);

  // Debug (Email Drawer)
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    console.log('[SignInScreen] Email drawer state', { showEmailLogin, authPanelView });
  }, [showEmailLogin, authPanelView]);



  // Theme logic moved to hook

  // Authentication Logic (moved to hooks)

  // Mobile Wallet Flow QR Toggle - logic moved to useWalletAuth hook

  // isMobileWalletFlow effect handled in hook





  useEffect(() => {
    if (!enableMobileUi && viewModeOverride === 'mobile') {
      setViewModeOverride('auto');
    }
  }, [enableMobileUi, viewModeOverride]);

  useEffect(() => {
    // When switching to desktop view we may need QR, but on mobile we now wait for explicit tap
    if (!enableMobileUi && showWalletConnectQR) {
      setShowWalletConnectQR(false);
    }
  }, [enableMobileUi, showWalletConnectQR]);

  useEffect(() => {
    if (authPanelView === 'login') {
      setSignupForm({
        email: '',
        password: '',
        confirmPassword: '',
        username: '',
        acceptTerms: false,
      });
      setSignupFeedback({ status: 'idle' });
    }
  }, [authPanelView]);

  useEffect(() => {
    if (isMobileWalletFlow && !hasTrackedMobilePanelRef.current) {
      hasTrackedMobilePanelRef.current = true;
      trackEvent('mobile_wallet_panel_opened', { os: device.os });
    }
    if (!isMobileWalletFlow && hasTrackedMobilePanelRef.current) {
      hasTrackedMobilePanelRef.current = false;
    }
  }, [isMobileWalletFlow, device.os]);

  const handleWalletLogin = async (method: AuthMethod) => {
    try {
      setLoading(true);
      setError(null);
      triggerHaptic('light');

      let address: string;
      let signature: string;

      // Connect to wallet based on method
      switch (method) {
        case 'polkadot': {
          // Connect specifically to Polkadot.js extension
          const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp');
          const extensions = await web3Enable('ChopDot');

          // Filter for Polkadot.js specifically
          const polkadotJsExtension = extensions.find(ext =>
            ext.name === 'polkadot-js' || ext.name.toLowerCase().includes('polkadot.js')
          );

          if (!polkadotJsExtension) {
            throw new Error('Polkadot.js extension not found. Please install Polkadot.js browser extension.');
          }

          const accounts = await web3Accounts();
          const polkadotJsAccount = accounts.find(acc =>
            acc.meta.source === 'polkadot-js'
          );

          if (!polkadotJsAccount) {
            throw new Error('No Polkadot.js account found. Please create an account in Polkadot.js extension.');
          }

          address = polkadotJsAccount.address;

          // Auto-connect to AccountContext for Polkadot.js
          // Don't wait for balance fetch - it can be slow, but we can sign immediately
          // Use a reasonable timeout (15 seconds) - allow connection setup to complete
          try {
            await Promise.race([
              account.connectExtension(address),
              new Promise<void>((_, reject) =>
                setTimeout(() => reject(new Error('Connection timeout')), 15000)
              )
            ]);
          } catch (e) {
            console.warn('[Login] AccountContext connection issue (continuing anyway):', e);
            // Continue anyway - the extension is connected, we can sign
            // The balance will be fetched later via polling
          }

          // Don't wait for AccountContext status - proceed immediately to signing
          // The extension connection is valid, AccountContext balance fetch can happen in background
          const message = await getWalletAuthMessage(address);
          signature = await signPolkadotMessage(address, message);
          break;
        }

        case 'rainbow': {
          // Use WalletConnect Modal v2 if enabled, otherwise use legacy flow
          console.log('[LoginScreen] Rainbow case - enableWcModal:', enableWcModal, 'wcModalEnabled:', wcModalEnabled, 'isDev:', isDev);
          if (enableWcModal) {
            // Use the new WC Modal v2 (wallet grid/search/QR)
            console.log('[LoginScreen] Using WC Modal v2 for desktop WalletConnect');
            // Import WalletConnect modal service dynamically
            const walletConnectModule = await import('../../services/chain/walletconnect');
            const { connectViaWalletConnectModal } = walletConnectModule;

            // Open WalletConnect Modal v2
            const { address: wcAddress } = await connectViaWalletConnectModal();

            // Sync AccountContext with the WalletConnect session
            await account.syncWalletConnectSession();

            // Sign message via WalletConnect (modal session)
            const signerModule = await import('../../services/chain/walletconnect').catch((err) => {
              console.error('[LoginScreen] WC signer import failed (modal session):', err);
              throw new Error('WalletConnect is unavailable right now. Please retry.');
            });
            const utilModule = await import('@polkadot/util').catch((err) => {
              console.error('[LoginScreen] util import failed (modal session):', err);
              throw new Error('WalletConnect is unavailable right now. Please retry.');
            });
            const { createWalletConnectSigner } = signerModule;
            const { stringToHex } = utilModule;
            const signer = createWalletConnectSigner(wcAddress);
            const message = await getWalletAuthMessage(wcAddress);
            const { signature: sig } = await signer.signRaw({
              address: wcAddress,
              data: stringToHex(message),
            });

            address = wcAddress;
            signature = sig;
            break;
          }

          // Legacy WalletConnect flow (QR code only)
          // Use WalletConnect - this will show a modal with available wallets
          // User can select SubWallet, Talisman, MetaMask, Rainbow, etc.
          // The AccountContext handles the WalletConnect connection and QR code display
          await account.connectWalletConnect();

          // Wait for connection to complete (user selects wallet and connects)
          // Poll for connection status (max 60 seconds)
          let attempts = 0;
          const maxAttempts = 60;
          let connectedAddress: string | undefined;
          let connectedSignature: string | undefined;

          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));

            if (account.status === 'connected' && account.address0) {
              connectedAddress = account.address0;

              // Sign message via WalletConnect (guarded import)
              const signerModule = await import('../../services/chain/walletconnect').catch((err) => {
                console.error('[LoginScreen] WC signer import failed (legacy WC loop):', err);
                throw new Error('WalletConnect is unavailable right now. Please retry.');
              });
              const utilModule = await import('@polkadot/util').catch((err) => {
                console.error('[LoginScreen] util import failed (legacy WC loop):', err);
                throw new Error('WalletConnect is unavailable right now. Please retry.');
              });
              const { createWalletConnectSigner } = signerModule;
              const { stringToHex } = utilModule;
              const signer = createWalletConnectSigner(connectedAddress);
              const message = await getWalletAuthMessage(connectedAddress);
              const { signature: sig } = await signer.signRaw({
                address: connectedAddress,
                data: stringToHex(message),
              });
              connectedSignature = sig;
              break;
            }

            attempts++;
          }

          if (!connectedAddress || !connectedSignature) {
            throw new Error('WalletConnect connection timed out. Please select your wallet and try again.');
          }

          address = connectedAddress;
          signature = connectedSignature;
          break;
        }

        default:
          throw new Error('Unsupported wallet type');
      }

      // Login with signature
      const chain = method === 'polkadot' ? 'polkadot' : 'evm';
      await login(method, {
        type: 'wallet',
        address,
        signature,
        chain,
      });

      triggerHaptic('medium');
      onLoginSuccess?.();
    } catch (err: any) {
      console.error('Wallet login failed:', err);

      // User-friendly error messages
      let friendlyError = 'Failed to connect wallet';

      if (err.message?.includes('Polkadot.js extension not found')) {
        friendlyError = 'Polkadot.js extension not found. Please install the Polkadot.js browser extension.';
      } else if (err.message?.includes('No Polkadot.js account')) {
        friendlyError = 'No Polkadot.js account found. Please create an account in your Polkadot.js extension.';
      } else if (err.message?.includes('WalletConnect')) {
        friendlyError = 'WalletConnect connection failed. Please try again or use Polkadot.js.';
      } else if (err.code === 4001 || err.message?.includes('User rejected')) {
        friendlyError = 'Connection cancelled. Please try again if you want to connect your wallet.';
      } else if (err.message?.includes('No accounts found')) {
        friendlyError = 'No accounts found in your wallet. Please create an account first.';
      } else if (err.message) {
        friendlyError = err.message;
      }

      setError(friendlyError);
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  const handleWalletConnectModal = async () => {
    try {
      triggerHaptic('light');
      setLoading(true);
      setError(null);
      setIsWaitingForSignature(false); // Will be set to true after connection

      console.log('[LoginScreen] Opening WalletConnect Modal v2...');

      // Import WalletConnect modal service dynamically
      const walletConnectModule = await import('../../services/chain/walletconnect');
      const { connectViaWalletConnectModal } = walletConnectModule;

      // Open WalletConnect Modal v2 - shows wallet grid/search/QR
      // This opens the polished modal with wallet grid/search/QR like ether.fi
      const { address } = await connectViaWalletConnectModal();

      console.log('[LoginScreen] ✅ WalletConnect connection via modal! Address:', address);

      // Set waiting for signature state - keep user in wallet app
      setIsWaitingForSignature(true);

      // Sync AccountContext with the WalletConnect session
      // The session is already established by connectViaWalletConnectModal
      // We need to update AccountContext so the app shows "Connected" status after login
      await account.syncWalletConnectSession();
      console.log('[LoginScreen] AccountContext synced with WalletConnect session');

      // Sign message via WalletConnect (modal session, guarded import)
      const signerModule = await import('../../services/chain/walletconnect').catch((err) => {
        console.error('[LoginScreen] WC signer import failed (modal session):', err);
        throw new Error('WalletConnect is unavailable right now. Please retry.');
      });
      const utilModule = await import('@polkadot/util').catch((err) => {
        console.error('[LoginScreen] util import failed (modal session):', err);
        throw new Error('WalletConnect is unavailable right now. Please retry.');
      });
      const { createWalletConnectSigner } = signerModule;
      const { stringToHex } = utilModule;
      const signer = createWalletConnectSigner(address);
      const message = await getWalletAuthMessage(address);

      console.log('[LoginScreen] Requesting signature from WalletConnect...');
      console.log('[LoginScreen] 💡 Stay in your wallet app until you approve the signature');

      // Small delay to ensure wallet app is ready for signature request
      await new Promise((resolve) => setTimeout(resolve, 400));

      // Request signature - this should trigger the wallet app to show the prompt
      // Keep isWaitingForSignature true until signature is received
      const { signature } = await signer.signRaw({
        address,
        data: stringToHex(message),
      });

      console.log('[LoginScreen] Signature received, logging in...');

      // Clear waiting state before login (login might redirect)
      setIsWaitingForSignature(false);

      // Login with signature
      await login('rainbow', {
        type: 'wallet',
        address,
        signature,
        chain: 'polkadot',
      });

      triggerHaptic('medium');
      onLoginSuccess?.();

    } catch (err: any) {
      console.error('[LoginScreen] WalletConnect modal flow failed:', err);

      // Handle user rejection gracefully
      if (err?.message?.includes('User rejected') ||
        err?.message?.includes('cancelled') ||
        err?.message?.includes('Rejected')) {
        setError(null); // Don't show error for user cancellation
        triggerHaptic('light');
      } else {
        setError(err.message || 'Failed to connect with WalletConnect modal');
        triggerHaptic('error');
      }
    } finally {
      setLoading(false);
      setIsWaitingForSignature(false);
    }
  };


  const handleGuestLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      triggerHaptic('light');

      await loginAsGuest();

      triggerHaptic('medium');
      onLoginSuccess?.();
    } catch (err: any) {
      console.error('Guest login failed:', err);
      setError(err.message || 'Failed to continue as guest');
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };







  interface ExtensionLoginArgs {
    sources: string[];
    walletDisplayName: string;
    notFoundMessage: string;
  }

  const loginWithExtension = async ({ sources, walletDisplayName, notFoundMessage }: ExtensionLoginArgs) => {
    try {
      triggerHaptic('light');
      setLoading(true);
      setError(null);

      const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp');
      await web3Enable('ChopDot');
      const accounts = await web3Accounts();

      const matchedAccount = accounts.find((acc) => {
        const metaSource = (acc.meta.source || '').toLowerCase();
        return sources.some((source) => metaSource === source || metaSource === source.replace('-js', ''));
      });

      if (!matchedAccount) {
        throw new Error(notFoundMessage);
      }

      const address = matchedAccount.address;

      try {
        await account.connectExtension(address);
      } catch (connectionError) {
        console.warn(`[Login] ${walletDisplayName} auto-connect issue (continuing anyway):`, connectionError);
      }

      const message = await getWalletAuthMessage(address);
      const signature = await signPolkadotMessage(address, message);

      await login('polkadot', {
        type: 'wallet',
        address,
        signature,
        chain: 'polkadot',
      });

      triggerHaptic('medium');
      onLoginSuccess?.();
    } catch (err: any) {
      console.error(`[Login] ${walletDisplayName} login failed:`, err);
      let friendlyError = `Failed to connect ${walletDisplayName}`;
      if (err.message?.includes('not found')) {
        friendlyError = notFoundMessage;
      } else if (err.message) {
        friendlyError = err.message;
      }
      setError(friendlyError);
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  /* 
   * WalletConnect Session Handler
   * Delegates to useWalletAuth hook
   */
  const startWalletConnectSession = async ({
    openQrModal = true,
  }: {
    openQrModal?: boolean;
  } = {}): Promise<string | null> => {
    // Delegate to hook
    // Note: handleWalletConnectModal is passed here because it depends on UI state/modal logic potentially?
    // Actually handleWalletConnectModal is defined below. 
    // We should pass a wrapper or move handleWalletConnectModal to hook if it has no UI deps.
    // For now, pass it as a callback.
    return startWalletConnectSessionHook(
      handleWalletConnectModal,
      openQrModal
    );
  };

  const renderErrorAlert = () => {
    if (!error) {
      return null;
    }

    return (
      <div className="flex items-start gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2">
        <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
        <p className="text-sm text-destructive leading-snug">{error}</p>
      </div>
    );
  };

  // Email login form JSX - rendered directly (not via function call) to prevent keyboard dismissal
  // This fixes the Safari keyboard issue where typing one letter dismisses the keyboard
  // Key fix: Render JSX directly ({emailLoginForm}) instead of calling a function ({renderEmailLoginForm()})
  // React reconciles inputs by their stable IDs, maintaining focus even when JSX is recreated
  /* Style variables moved to EmailLoginPanel */


  const emailLoginForm = (
    <EmailLoginPanel
      email={emailCredentials.email}
      password={emailCredentials.password}
      rememberEmail={rememberEmail}
      loading={loading}
      panelMode={panelMode}
      onEmailChange={(value) =>
        setEmailCredentials((prev) => ({ ...prev, email: value }))
      }
      onPasswordChange={(value) =>
        setEmailCredentials((prev) => ({ ...prev, password: value }))
      }
      onRememberEmailChange={setRememberEmail}
      onSubmit={handleEmailLogin}
      onForgotPassword={handlePasswordRecovery}
      onCancel={() => {
        setShowEmailLogin(false);
        setEmailCredentials({ email: rememberEmail ? emailCredentials.email : '', password: '' });
      }}
    />
  );





  const renderPanelLayout = () => {
    const useGlassmorphism = loginVariant === 'polkadot-second-age-glass';

    if (authPanelView === 'signup') {
      return (
        <SignupPanel
          signupForm={signupForm}
          signupFeedback={signupFeedback}
          loading={loading}
          setSignupForm={setSignupForm}
          onSignupSubmit={handleSignupSubmit}
          onBackToLogin={() => setAuthPanelView('login')}
          panelMode={panelMode}
          loginVariant={loginVariant}
        />
      );
    }

    const walletOptionConfigs: WalletOptionConfig[] = [
      {
        id: 'email',
        title: 'Email & password',
        subtitle: 'Sign in with your ChopDot account',
        icon: {
          src: EMAIL_LOGIN_LOGO,
          alt: 'Email login icon',
        },
        integrationKind: 'email',
        handler: (e?: React.MouseEvent) => {
          e?.stopPropagation();
          e?.preventDefault();
          openEmailLoginDrawer('desktop-option');
        },
        themeOverride: emailOptionTheme,
      },
      {
        id: 'polkadot',
        title: 'Polkadot.js',
        subtitle: 'Browser extension',
        icon: {
          src: POLKADOT_JS_LOGO,
          alt: 'Polkadot.js logo',
        },
        integrationKind: 'official-extension',
        handler: () => handleWalletLogin('polkadot'),
        showsLoadingIndicator: true,
        // No themeOverride - uses the same base theme as other wallets
      },
      {
        id: 'subwallet',
        title: 'SubWallet',
        subtitle: 'Browser extension',
        icon: {
          src: SUBWALLET_LOGO,
          alt: 'SubWallet logo',
        },
        integrationKind: 'browser-extension',
        handler: () =>
          loginWithExtension({
            sources: ['subwallet-js', 'subwallet'],
            walletDisplayName: 'SubWallet',
            notFoundMessage: 'SubWallet extension not found. Please install SubWallet browser extension.',
          }),
        showsLoadingIndicator: true,
      },
      {
        id: 'talisman',
        title: 'Talisman',
        subtitle: 'Browser extension',
        icon: {
          src: TALISMAN_LOGO,
          alt: 'Talisman logo',
        },
        integrationKind: 'browser-extension',
        handler: () =>
          loginWithExtension({
            sources: ['talisman'],
            walletDisplayName: 'Talisman',
            notFoundMessage: 'Talisman extension not found. Please install Talisman browser extension.',
          }),
        showsLoadingIndicator: true,
      },
      {
        id: 'walletconnect',
        title: 'WalletConnect',
        subtitle: 'Scan with mobile wallets',
        icon: {
          src: WALLETCONNECT_LOGO,
          alt: 'WalletConnect logo',
        },
        integrationKind: 'walletconnect',
        handler: () => startWalletConnectSession({ openQrModal: true }),
      },
    ];

    const resolvedPanelTheme = useGlassmorphism
      ? (polkadotSecondAgePanelThemes[panelMode] ?? defaultPanelTheme)
      : (frostedPanelThemes[panelMode] ?? defaultPanelTheme);
    const variationWalletTheme = useGlassmorphism
      ? polkadotSecondAgeWalletThemes[panelMode]
      : frostedWalletThemes[panelMode];
    const variationGuestTheme = useGlassmorphism
      ? polkadotSecondAgeGuestThemes[panelMode]
      : frostedGuestThemes[panelMode];

    const appliedWalletOptions = walletOptionConfigs.map((option) => {
      let overrideTheme: Partial<WalletOptionTheme> = {};
      if (useGlassmorphism && option.id === 'email') {
        // Use dynamic email theme based on panelMode
        overrideTheme = getPolkadotSecondAgeEmailOverride(panelMode);
      } else {
        overrideTheme = useGlassmorphism
          ? (polkadotSecondAgeWalletOverrides[option.id] ?? frostedWalletOverrides[option.id] ?? {})
          : (frostedWalletOverrides[option.id] ?? {});
      }
      const baseThemeOverride = option.themeOverride;

      const finalThemeOverride: Partial<WalletOptionTheme> = {
        ...variationWalletTheme,
        ...baseThemeOverride,
        ...overrideTheme,
      };

      return {
        ...option,
        themeOverride: finalThemeOverride,
      };
    });

    if (isMobileWalletFlow) {
      return (
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-sm space-y-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <ChopDotMark size={52} useWhite={useGlassmorphism && panelMode === 'dark'} useBlackAndWhite={useGlassmorphism && panelMode === 'light'} />
              <p
                className={
                  useGlassmorphism
                    ? (panelMode === 'dark' ? 'text-sm font-medium text-white/90' : 'text-sm font-medium')
                    : (panelMode === 'dark' ? 'text-sm font-medium text-white/90' : 'text-sm font-medium text-secondary/80')
                }
                style={useGlassmorphism ? (panelMode === 'dark' ? { color: 'rgba(255, 255, 255, 0.9)' } : { color: '#1C1917' }) : undefined}
              >Sign in to ChopDot</p>
            </div>

            <MobileWalletConnectPanel
              loading={loading}
              errorMessage={error}
              onRetry={async () => await startWalletConnectSession({ openQrModal: false })}
              onSwitchToDesktop={() => {
                // Only switch views; do not auto-trigger WalletConnect
                setViewModeOverride('desktop');
                setShowWalletConnectQR(false);
                setIsWaitingForWalletConnect(false);
                setIsWaitingForSignature(false);
                setLoading(false);
              }}
              mode={panelMode}
              panelTheme={resolvedPanelTheme}
              walletTheme={variationWalletTheme}
              guestTheme={variationGuestTheme}
              useGlassmorphism={useGlassmorphism}
              onGuestLogin={handleGuestLogin}
              onEmailOptionToggle={() => openEmailLoginDrawer('mobile-option')}
              keepSignedIn={keepSignedIn}
              onKeepSignedInChange={handleKeepSignedInChange}
              emailTheme={useGlassmorphism ? getPolkadotSecondAgeEmailOverride(panelMode) : emailOptionTheme}
              waitingForSignature={isWaitingForSignature}
              onOpenModal={enableWcModal ? handleWalletConnectModal : undefined}
              walletConnectIconSrc={WALLETCONNECT_LOGO}
              walletConnectIconAlt="WalletConnect logo"
              emailIconSrc={EMAIL_LOGIN_LOGO}
              emailIconAlt="Email login icon"
            />
            <AuthFooter panelMode={panelMode} loginVariant={loginVariant} />
          </div>
        </div>
      );
    }

    // Desktop / Default View
    const desktopWalletOptions = appliedWalletOptions.map((option) => ({
      title: option.title,
      subtitle: option.subtitle,
      iconSrc: option.icon.src,
      iconAlt: option.icon.alt,
      onClick: option.handler,
      loading: option.showsLoadingIndicator && loading,
      theme: option.themeOverride,
      useMarkForIcon: option.id === 'email',
      // Pass other required props for WalletOption that might be missing from Config
      panelMode,
      useGlassmorphism,
    }));

    const headerContent = (
      <div className="flex flex-col items-center gap-3 text-center">
        <ChopDotMark size={52} useWhite={useGlassmorphism && panelMode === 'dark'} useBlackAndWhite={useGlassmorphism && panelMode === 'light'} />
        <p
          className={
            useGlassmorphism
              ? (panelMode === 'dark' ? 'text-sm font-medium text-white/90' : 'text-sm font-medium')
              : (panelMode === 'dark' ? 'text-sm font-medium text-white/90' : 'text-sm font-medium text-secondary/80')
          }
          style={useGlassmorphism ? (panelMode === 'dark' ? { color: 'rgba(255, 255, 255, 0.9)' } : { color: '#1C1917' }) : undefined}
        >
          Sign in to ChopDot
        </p>
      </div>
    );

    const mobileToggle = enableMobileUi && resolvedViewMode === 'desktop' ? (
      <div className="text-center">
        <button
          type="button"
          onClick={() => setViewModeOverride('mobile')}
          className={`text-xs font-semibold underline underline-offset-4 ${useGlassmorphism ? '' : 'text-[var(--accent)]'
            }`}
          style={useGlassmorphism ? (panelMode === 'dark' ? { color: '#FFFFFF' } : { color: '#1C1917' }) : undefined}
        >
          Switch to mobile wallets view
        </button>
      </div>
    ) : undefined;

    const signatureWaitingBanner = isWaitingForSignature ? (
      <div className="rounded-2xl border-2 border-[var(--accent)] bg-[var(--accent)]/15 p-5 space-y-3 shadow-lg animate-pulse">
        <div className="flex items-start gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)] flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="text-lg font-bold text-foreground">
              ⚠️ Signature Approval Required
            </p>
            <p className="text-sm text-muted leading-relaxed">
              <strong>Action needed:</strong> Go back to your wallet app (Nova Wallet) and approve the signature request. The app will automatically continue once you approve.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted/80">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Waiting for your approval...</span>
            </div>
          </div>
        </div>
      </div>
    ) : undefined;

    return (
      <WalletLoginPanel
        panelTheme={resolvedPanelTheme}
        panelMode={panelMode}
        useGlassmorphism={useGlassmorphism}
        walletOptions={desktopWalletOptions}
        onGuestLogin={handleGuestLogin}
        guestTheme={variationGuestTheme}
        loading={loading}
        keepSignedIn={keepSignedIn}
        onKeepSignedInChange={handleKeepSignedInChange}
        headerContent={headerContent}
        errorAlert={renderErrorAlert()}
        footerContent={<AuthFooter panelMode={panelMode} loginVariant={loginVariant} />}
        mobileToggle={mobileToggle}
        signatureWaitingBanner={signatureWaitingBanner}
      />
    );
  };

  const useGlassmorphism = loginVariant === 'polkadot-second-age-glass';
  // For glassmorphism, always use dark text for readability on light backgrounds
  const containerTextColor = useGlassmorphism
    ? 'text-[#1C1917]'
    : (panelMode === 'dark' ? 'text-white' : 'text-[#0f0f11]');

  return (
    <div
      className={`min-h-full flex flex-col overflow-auto transition-colors duration-200 ${containerTextColor}`}
      style={{
        ...(loginVariant === 'polkadot-second-age-glass'
          ? getPolkadotSecondAgeSceneBackgroundStyles(panelMode, backgroundIndex)
          : (sceneBackgroundStyles[panelMode] ?? sceneBackgroundStyles.dark)),
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {isDev && <LoginVariantToggle value={loginVariant} onChange={setLoginVariant} mode={panelMode} />}
      {enableMobileUi && !device.isMobile && (
        <ViewModeToggle value={viewModeOverride} onChange={setViewModeOverride} resolvedView={resolvedViewMode} mode={panelMode} />
      )}
      {isDev && (
        <WalletConnectModalToggle enabled={wcModalEnabled} onChange={setWcModalEnabled} mode={panelMode} />
      )}
      {renderPanelLayout()}

      <Drawer
        open={showEmailLogin && authPanelView === 'login'}
        onOpenChange={(open) => {
          setShowEmailLogin(open);
          if (!open) {
            setEmailCredentials({ email: rememberEmail ? emailCredentials.email : '', password: '' });
          }
          setError(null);
        }}
        direction={device.isMobile ? 'bottom' : 'right'}
        autoFocus={!device.isMobile}
      >
        <DrawerContent className="p-0">
          <div className="flex items-start justify-between gap-4 px-4 pt-4">
            <div className="space-y-1">
              <DrawerTitle asChild>
                <h2 className="text-base font-semibold text-foreground">Email & password</h2>
              </DrawerTitle>
              <DrawerDescription className="text-xs text-muted-foreground">
                Sign in with your ChopDot account
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <button
                type="button"
                onClick={() => triggerHaptic('light')}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted/40 active:scale-95 transition-transform"
                aria-label="Close"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </DrawerClose>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3 space-y-4">
            {emailLoginForm}
            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setShowEmailLogin(false);
                setAuthPanelView('signup');
              }}
              className="text-xs font-semibold underline underline-offset-4 text-[var(--accent)]"
            >
              Need an account? Create one
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* WalletConnect QR Code Modal */}
      {showWalletConnectQR && walletConnectQRCode && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-[60] animate-fadeIn"
            onClick={() => {
              triggerHaptic('light');
              setShowWalletConnectQR(false);
              setWalletConnectQRCode(null);
            }}
          />

          {/* QR Modal */}
          <div className="fixed inset-x-0 bottom-0 z-[60] animate-slideUp">
            <div className="bg-card rounded-t-[24px] max-h-[90vh] flex flex-col" style={{ boxShadow: 'var(--shadow-elev)' }}>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-4 border-b border-border/50">
                <h2 className="text-section">Scan QR Code</h2>
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setShowWalletConnectQR(false);
                    setWalletConnectQRCode(null);
                  }}
                  className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <X className="w-4 h-4 text-muted" />
                </button>
              </div>

              {/* QR Code Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="flex flex-col items-center space-y-4">
                  <p className="text-body text-center text-secondary mb-2">
                    Scan this QR code with your mobile wallet to connect
                  </p>

                  {/* QR Code */}
                  <div className="w-64 h-64 bg-white rounded-xl p-4 flex items-center justify-center shadow-lg">
                    <img
                      src={walletConnectQRCode}
                      alt="WalletConnect QR Code"
                      className="w-full h-full"
                    />
                  </div>

                  <p className="text-micro text-secondary text-center max-w-xs">
                    Open Nova Wallet, MetaMask mobile, or another WalletConnect-compatible wallet and scan this code
                  </p>

                  {account.status === 'connecting' && (
                    <div className="flex items-center gap-2 text-caption text-secondary">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Waiting for connection...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
