/**
 * LOGIN SCREEN
 * 
 * Authentication screen supporting multiple sign-in methods:
 * - Polkadot.js (direct connection)
 * - Other wallets via WalletConnect (SubWallet, Talisman, MetaMask, Rainbow, etc.)
 */

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { useAuth, AuthMethod } from '../../contexts/AuthContext';
import { useAccount } from '../../contexts/AccountContext';
import {
  signPolkadotMessage,
  requestWalletNonce,
  buildWalletAuthMessage,
} from '../../utils/walletAuth';
import { triggerHaptic } from '../../utils/haptics';
import QRCodeLib from 'qrcode';
import useClientDevice from '../../hooks/useClientDevice';
import { getSupabase } from '../../utils/supabase-client';
import { getAuthPersistence, setAuthPersistence } from '../../utils/authPersistence';
import { getRememberedEmail, setRememberedEmail } from '../../utils/rememberedEmail';
import { toast } from 'sonner';
import { useTheme } from '../../utils/useTheme';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from '../ui/drawer';
import {
  ChopDotMark,
  WalletPanel,
  WalletOption,
  MobileWalletConnectPanel,
  ViewModeToggle,
  LoginVariantToggle,
  WalletConnectModalToggle,
} from '../auth/SignInComponents';
import {
  type PanelMode,
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
  POLKADOT_BACKGROUNDS,
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

type LoginViewOverride = 'auto' | 'desktop' | 'mobile';
type LoginVariant = 'default' | 'polkadot-second-age-glass';

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
const isFlagEnabled = (value?: string) => value === '1' || value?.toLowerCase() === 'true';

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
  const { brandVariant } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backgroundIndex, setBackgroundIndex] = useState(0);

  // Login variant state - defaults to Polkadot Second Age if brand variant is set, otherwise default
  const [loginVariant, setLoginVariant] = useState<LoginVariant>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chopdot.loginVariant') as LoginVariant;
      if (saved && (saved === 'default' || saved === 'polkadot-second-age-glass')) {
        return saved;
      }
    }
    return brandVariant === 'polkadot-second-age' ? 'polkadot-second-age-glass' : 'default';
  });

  // Sync with brand variant changes (only on initial load, not when user manually toggles)
  useEffect(() => {
    // Only auto-switch if user hasn't manually set a preference
    const saved = localStorage.getItem('chopdot.loginVariant');
    if (!saved && brandVariant === 'polkadot-second-age' && loginVariant === 'default') {
      setLoginVariant('polkadot-second-age-glass');
      localStorage.setItem('chopdot.loginVariant', 'polkadot-second-age-glass');
    }
  }, [brandVariant]); // Remove loginVariant from dependencies to prevent interference

  // Save variant preference
  useEffect(() => {
    localStorage.setItem('chopdot.loginVariant', loginVariant);
  }, [loginVariant]);
  const [showWalletConnectQR, setShowWalletConnectQR] = useState(false);
  const [walletConnectQRCode, setWalletConnectQRCode] = useState<string | null>(null);
  const [isWaitingForWalletConnect, setIsWaitingForWalletConnect] = useState(false);
  const [isWaitingForSignature, setIsWaitingForSignature] = useState(false);
  const walletConnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const enableMobileUi = isFlagEnabled(import.meta.env.VITE_ENABLE_MOBILE_WC_UI ?? '0');
  // Allow UI toggle for WC Modal in dev/localhost
  const isDev = import.meta.env.MODE === 'development' || window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1') || window.location.hostname.includes('10.');
  const [wcModalEnabled, setWcModalEnabled] = useState(() => {
    // Check localStorage for saved preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chopdot.wcModal.enabled');
      if (saved !== null) {
        return saved === 'true';
      }
      // Default to enabled for testing (can be toggled off via UI)
      return true;
    }
    return true; // Default enabled
  });
  // Default to WC Modal enabled (can be overridden by env var or dev toggle)
  // In dev/localhost, use toggle state; otherwise default to enabled unless env var says otherwise
  const enableWcModal = isDev 
    ? wcModalEnabled 
    : isFlagEnabled(import.meta.env.VITE_ENABLE_WC_MODAL ?? '1'); // Default to '1' (enabled)
  const device = useClientDevice();
  const [viewModeOverride, setViewModeOverride] = useState<LoginViewOverride>('auto');
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const initialRememberedEmail = getRememberedEmail();
  const [emailCredentials, setEmailCredentials] = useState({ email: initialRememberedEmail, password: '' });
  const [authPanelView, setAuthPanelView] = useState<'login' | 'signup'>('login');
  const [keepSignedIn, setKeepSignedIn] = useState(() => getAuthPersistence() === 'local');
  const [rememberEmail, setRememberEmail] = useState(Boolean(initialRememberedEmail));
  const [signupForm, setSignupForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    acceptTerms: false,
  });
  const [signupFeedback, setSignupFeedback] = useState<{ status: 'idle' | 'success' | 'error'; message?: string }>({
    status: 'idle',
  });
  const hasTrackedMobilePanelRef = useRef(false);

  const openEmailLoginDrawer = (source: string) => {
    setLoading(false);
    setError(null);
    setAuthPanelView('login');
    if (import.meta.env.DEV) {
      console.log('[SignInScreen] Opening email drawer', { source });
    }
    // Open on next frame to avoid edge-cases with click-outside handlers.
    requestAnimationFrame(() => setShowEmailLogin(true));
  };

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    console.log('[SignInScreen] Email drawer state', { showEmailLogin, authPanelView });
  }, [showEmailLogin, authPanelView]);

  // Debug: Check Supabase configuration on mount
  useEffect(() => {
    const supabase = getSupabase();
    if (supabase) {
      console.log('[SignInScreen] Supabase client configured');
    } else {
      console.error('[SignInScreen] Supabase client NOT configured - check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    }
  }, []);
  const getInitialPanelMode = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark' as PanelMode;
    }
    return 'light' as PanelMode;
  };
  const [panelMode, setPanelMode] = useState<PanelMode>(getInitialPanelMode);
  const resolvedViewMode: 'desktop' | 'mobile' =
    viewModeOverride === 'auto' ? (device.isMobile ? 'mobile' : 'desktop') : viewModeOverride;
  const isMobileWalletFlow = enableMobileUi && resolvedViewMode === 'mobile';

  const getWalletAuthMessage = async (addr: string) => {
    const nonce = await requestWalletNonce(addr);
    return buildWalletAuthMessage(nonce);
  };

  // Listen for WalletConnect connection completion
  useEffect(() => {
    console.log('[LoginScreen] Account status changed:', {
      status: account.status,
      address0: account.address0,
      isWaitingForWalletConnect,
      showWalletConnectQR,
    });

    if (!isWaitingForWalletConnect) {
      return;
    }

    // Check if connection completed
    if (account.status === 'connected' && account.address0) {
      console.log('[LoginScreen] ✅ WalletConnect connection detected! Address:', account.address0);
      
      // Clear timeout
      if (walletConnectTimeoutRef.current) {
        clearTimeout(walletConnectTimeoutRef.current);
        walletConnectTimeoutRef.current = null;
      }

      // Close QR modal immediately
      setShowWalletConnectQR(false);
      setWalletConnectQRCode(null);
      setIsWaitingForWalletConnect(false);
      setIsWaitingForSignature(true);

      // Proceed with login
      (async () => {
        try {
          setLoading(true);
          const address = account.address0!;
          console.log('[LoginScreen] Signing message for address:', address);

          // Wait longer for Nova/SubWallet to surface the signature prompt
          // Mobile wallets need time to process the connection and show the UI
          // 800ms gives enough time for the wallet app to be ready
          await new Promise((resolve) => setTimeout(resolve, 300));

          // Sign message via WalletConnect (guarded import)
          const signerModule = await import('../../services/chain/walletconnect').catch((err) => {
            console.error('[LoginScreen] WC signer import failed:', err);
            throw new Error('WalletConnect is unavailable right now. Please retry.');
          });
          const utilModule = await import('@polkadot/util').catch((err) => {
            console.error('[LoginScreen] util import failed:', err);
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
          
          console.log('[LoginScreen] ✅ Login successful!');
          triggerHaptic('medium');
          onLoginSuccess?.();
        } catch (err: any) {
          console.error('[LoginScreen] ❌ WalletConnect login failed:', err);
          setError(err.message || 'Failed to sign message with WalletConnect');
          triggerHaptic('error');
        } finally {
          setLoading(false);
          setIsWaitingForSignature(false);
        }
      })();
    }
  }, [account.status, account.address0, isWaitingForWalletConnect, showWalletConnectQR, login, onLoginSuccess]);

  // Set timeout for WalletConnect connection
  useEffect(() => {
    if (isWaitingForWalletConnect && showWalletConnectQR) {
      walletConnectTimeoutRef.current = setTimeout(() => {
        if (account.status !== 'connected') {
          console.warn('[LoginScreen] WalletConnect connection timeout');
          setShowWalletConnectQR(false);
          setWalletConnectQRCode(null);
          setIsWaitingForWalletConnect(false);
          setError('WalletConnect connection timed out. Please try again.');
          toast.warning('WalletConnect is taking too long. Please try again.');
          triggerHaptic('error');
        }
      }, 60000); // 60 seconds

      return () => {
        if (walletConnectTimeoutRef.current) {
          clearTimeout(walletConnectTimeoutRef.current);
        }
      };
    }
  }, [isWaitingForWalletConnect, showWalletConnectQR, account.status]);

  useEffect(() => {
    if (isMobileWalletFlow && showWalletConnectQR) {
      setShowWalletConnectQR(false);
    }
  }, [isMobileWalletFlow, showWalletConnectQR]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      setPanelMode(event.matches ? 'dark' : 'light');
    };
    // set initial in case matchMedia differs
    setPanelMode(media.matches ? 'dark' : 'light');
    if (media.addEventListener) {
      media.addEventListener('change', handleChange);
    } else {
      media.addListener(handleChange);
    }
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', handleChange);
      } else {
        media.removeListener(handleChange);
      }
    };
  }, []);

  // Rotate backgrounds for Polkadot Second Age variant
  // In dark mode, stay on inverted background (no rotation)
  // In light mode, rotate through regular backgrounds
  useEffect(() => {
    if (loginVariant === 'polkadot-second-age-glass') {
      // Reset to index 0 when switching to dark mode
      if (panelMode === 'dark') {
        setBackgroundIndex(0);
        return; // Don't rotate in dark mode
      }
      
      // Only rotate in light mode
      const interval = setInterval(() => {
        setBackgroundIndex((prevIndex) => (prevIndex + 1) % POLKADOT_BACKGROUNDS.length);
      }, 12000); // Change background every 12 seconds
      return () => clearInterval(interval);
    }
  }, [loginVariant, panelMode]);

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

  useEffect(() => {
    setRememberedEmail(emailCredentials.email.trim(), rememberEmail);
  }, [emailCredentials.email, rememberEmail]);

  const handleEmailLogin = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    // Reset loading if switching from another handler
    setLoading(false);
    const trimmedEmail = emailCredentials.email.trim();
    if (!trimmedEmail || !emailCredentials.password) {
      setError('Please enter both email and password.');
      triggerHaptic('error');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login('email', {
        type: 'email',
        email: trimmedEmail,
        password: emailCredentials.password,
      });
      setRememberedEmail(trimmedEmail, rememberEmail);
      triggerHaptic('medium');
      setShowEmailLogin(false);
      setEmailCredentials({ email: rememberEmail ? trimmedEmail : '', password: '' });
      onLoginSuccess?.();
    } catch (err: any) {
      console.error('Email login failed:', err);
      setError(err.message || 'Failed to login with email and password');
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  const handleKeepSignedInChange = (nextKeepSignedIn: boolean) => {
    setKeepSignedIn(nextKeepSignedIn);
    setAuthPersistence(nextKeepSignedIn ? 'local' : 'session');
    toast.message('Applying sign-in setting…');
    window.setTimeout(() => window.location.reload(), 75);
  };

  const handlePasswordRecovery = async () => {
    const trimmedEmail = emailCredentials.email.trim();
    if (!trimmedEmail) {
      toast.error('Enter your email first.');
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      toast.error('Supabase auth is not configured.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        // Avoid account enumeration: show the same success message even if user does not exist.
        console.warn('[SignInScreen] Password recovery request failed:', error.message);
      }
      toast.success("If an account exists, you'll receive a password reset email shortly.");
      triggerHaptic('light');
    } catch (err: any) {
      console.warn('[SignInScreen] Password recovery request failed:', err?.message || err);
      toast.success("If an account exists, you'll receive a password reset email shortly.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    triggerHaptic('light');
    if (!signupForm.email.trim() || !signupForm.password || !signupForm.confirmPassword) {
      setSignupFeedback({ status: 'error', message: 'Fill out every field to continue.' });
      triggerHaptic('error');
      return;
    }
    if (signupForm.password.length < 8) {
      setSignupFeedback({ status: 'error', message: 'Password must be at least 8 characters.' });
      triggerHaptic('error');
      return;
    }
    if (signupForm.password !== signupForm.confirmPassword) {
      setSignupFeedback({ status: 'error', message: 'Passwords do not match.' });
      triggerHaptic('error');
      return;
    }
    if (!signupForm.acceptTerms) {
      setSignupFeedback({ status: 'error', message: 'Please accept the terms to create an account.' });
      triggerHaptic('error');
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      setSignupFeedback({ status: 'error', message: 'Supabase auth is not configured.' });
      triggerHaptic('error');
      return;
    }
    try {
      setLoading(true);
      setSignupFeedback({ status: 'idle' });
      console.log('[Signup] Starting signup for:', signupForm.email.trim());
      const { data, error } = await supabase.auth.signUp({
        email: signupForm.email.trim(),
        password: signupForm.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: signupForm.username ? { username: signupForm.username } : undefined,
        },
      });
      console.log('[Signup] Result:', { data, error });
      if (error) {
        throw error;
      }
      
      // Check if user was created and session exists
      if (data.user) {
        console.log('[Signup] User created successfully:', data.user.id);
        
        // If session exists, user is auto-confirmed (no email verification needed)
        if (data.session) {
          console.log('[Signup] User auto-confirmed, logging in');
          setSignupFeedback({
            status: 'success',
            message: 'Account created successfully! Signing you in...',
          });
          triggerHaptic('medium');
          
          // Auto-login after successful signup
          setTimeout(() => {
            onLoginSuccess?.();
          }, 1500);
        } else {
          console.log('[Signup] Email confirmation required');
          setSignupFeedback({
            status: 'success',
            message: 'Check your email to confirm your account, then sign in here.',
          });
          triggerHaptic('medium');
        }
      } else {
        console.warn('[Signup] No user returned from signup');
        setSignupFeedback({
          status: 'success',
          message: 'Check your email to confirm your account, then sign in here.',
        });
        triggerHaptic('medium');
      }
    } catch (err: any) {
      console.error('[Signup] Signup failed:', err);
      setSignupFeedback({ status: 'error', message: err.message || 'Unable to create account.' });
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

  const startWalletConnectSession = async ({
    openQrModal = true,
    source,
  }: {
    openQrModal?: boolean;
    source?: string;
  } = {}): Promise<string | null> => {
    try {
      triggerHaptic('light');
      setLoading(true);
      setError(null);

      // Use WC Modal v2 if enabled, otherwise use legacy flow
      if (enableWcModal) {
        console.log('[LoginScreen] Using WC Modal v2 in startWalletConnectSession');
        // Use the new WC Modal v2 (wallet grid/search/QR)
        await handleWalletConnectModal();
        return null; // handleWalletConnectModal handles the full flow
      }

      // Legacy WalletConnect flow (QR code only)
      const result = (await account.connectWalletConnect()) as { uri?: string } | string | null | undefined;
      const uri = typeof result === 'string' ? result : result?.uri;

      if (!uri) {
        throw new Error('Failed to generate WalletConnect QR code');
      }

      const qrCodeDataUrl = await QRCodeLib.toDataURL(uri, {
        errorCorrectionLevel: 'M',
        width: 300,
        margin: 2,
      });

      setWalletConnectQRCode(qrCodeDataUrl);
      setShowWalletConnectQR(openQrModal);
      setIsWaitingForWalletConnect(true);
      if (source) {
        trackEvent('walletconnect_session_started', { source, isMobile: isMobileWalletFlow });
      }
      return uri;
    } catch (err: any) {
      console.error('WalletConnect login failed:', err);
      setShowWalletConnectQR(false);
      setWalletConnectQRCode(null);
      setIsWaitingForWalletConnect(false);
      setIsWaitingForSignature(false);

      let errorMessage = err.message || 'Failed to connect via WalletConnect';
      if (err.message?.includes('MetaMask') || err.message?.includes('does not support Polkadot')) {
        errorMessage = 'MetaMask mobile does not support Polkadot. Please use Nova Wallet, SubWallet, or Talisman for Polkadot connections.';
      }

      setError(errorMessage);
      triggerHaptic('error');
      return null;
    } finally {
      setLoading(false);
    }
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
  const containerClasses =
    panelMode === 'dark'
      ? 'border-white/10 bg-white/5'
      : 'border-black/5 bg-white shadow-[0_15px_35px_rgba(0,0,0,0.05)]';
  const inputClasses =
    panelMode === 'dark'
      ? 'bg-white/10 border-white/20 text-white placeholder:text-white/60'
      : 'bg-white border-black/10 text-[#0f0f11] placeholder:text-secondary/70';
  const labelClasses = panelMode === 'dark' ? 'text-white/80' : 'text-[#111111]';
  
  const emailLoginForm = (
    <form 
      onSubmit={handleEmailLogin} 
      className={`space-y-3 rounded-2xl border px-4 py-4 ${containerClasses}`}
    >
      <div className="space-y-1">
        <p className={`text-base font-semibold ${panelMode === 'dark' ? 'text-white' : 'text-[#111111]'}`}>
          Sign in with email
        </p>
        <p className={`text-sm ${panelMode === 'dark' ? 'text-white/70' : 'text-secondary/80'}`}>
          Enter the credentials you created when registering with email.
        </p>
      </div>
      <div className="space-y-2">
        <label htmlFor="email-login-email" className={`text-sm font-semibold ${labelClasses}`}>
          Email
        </label>
        <input
          id="email-login-email"
          type="email"
          autoComplete="email"
          required
          className={`w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 ${inputClasses}`}
          value={emailCredentials.email}
          onChange={(event) =>
            setEmailCredentials((prev) => ({
              ...prev,
              email: event.target.value,
            }))
          }
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="email-login-password" className={`text-sm font-semibold ${labelClasses}`}>
          Password
        </label>
        <input
          id="email-login-password"
          type="password"
          autoComplete="current-password"
          required
          className={`w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 ${inputClasses}`}
          value={emailCredentials.password}
          onChange={(event) =>
            setEmailCredentials((prev) => ({
              ...prev,
              password: event.target.value,
            }))
          }
        />
      </div>
      <div className="space-y-2">
        <label
          className={`flex items-center gap-2 text-xs ${panelMode === 'dark' ? 'text-white/70' : 'text-secondary/80'}`}
        >
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-[var(--accent)]"
            checked={rememberEmail}
            onChange={(event) => setRememberEmail(event.target.checked)}
            disabled={loading}
          />
          Remember this email on this device
        </label>
        <p className={`text-[11px] ${panelMode === 'dark' ? 'text-white/60' : 'text-secondary/70'}`}>
          Passwords are saved by your browser or device password manager.
        </p>
      </div>
      <div className="space-y-2">
        <button
          type="submit"
          className="w-full rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted/10 disabled:opacity-60"
          disabled={loading}
        >
          Continue with email
        </button>
        <button
          type="button"
          onClick={handlePasswordRecovery}
          className="w-full rounded-xl border border-border/0 px-4 py-2 text-sm font-semibold text-[var(--accent)] transition-colors hover:bg-muted/10 disabled:opacity-60"
          disabled={loading}
        >
          Forgot password?
        </button>
        <button
          type="button"
          onClick={() => {
            setShowEmailLogin(false);
            setEmailCredentials({ email: rememberEmail ? getRememberedEmail() : '', password: '' });
          }}
          className="w-full rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted/10"
        >
          Cancel
        </button>
      </div>
    </form>
  );

  const renderSignupPanel = () => {
    const resolvedPanelTheme = frostedPanelThemes[panelMode] ?? defaultPanelTheme;
    const inputClasses =
      panelMode === 'dark'
        ? 'bg-white/10 border-white/20 text-white placeholder:text-white/60'
        : 'bg-white border-black/10 text-[#0f0f11] placeholder:text-secondary/70';

    return (
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <ChopDotMark size={52} useWhite={panelMode === 'dark'} />
            <p className={panelMode === 'dark' ? 'text-sm font-medium text-white/90' : 'text-sm font-medium text-secondary/80'}>
              Create your ChopDot account
            </p>
          </div>
          <WalletPanel theme={resolvedPanelTheme}>
            <form onSubmit={handleSignupSubmit} className="space-y-3">
              <div className="space-y-1">
                <p className={`text-base font-semibold ${panelMode === 'dark' ? 'text-white' : 'text-[#111111]'}`}>
                  Sign up with email
                </p>
                <p className={`text-sm ${panelMode === 'dark' ? 'text-white/70' : 'text-secondary/80'}`}>
                  We&apos;ll send a confirmation link so you can verify your email.
                </p>
              </div>
              <div className="space-y-2">
                <label className={`text-sm font-semibold ${panelMode === 'dark' ? 'text-white/70' : 'text-secondary/80'}`}>
                  Email
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className={`w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 ${inputClasses}`}
                  value={signupForm.email}
                  onChange={(event) => setSignupForm((prev) => ({ ...prev, email: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className={`text-sm font-semibold ${panelMode === 'dark' ? 'text-white/70' : 'text-secondary/80'}`}>
                  Username (optional)
                </label>
                <input
                  type="text"
                  className={`w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 ${inputClasses}`}
                  value={signupForm.username}
                  onChange={(event) => setSignupForm((prev) => ({ ...prev, username: event.target.value }))}
                  placeholder="How friends see you"
                />
              </div>
              <div className="space-y-2">
                <label className={`text-sm font-semibold ${panelMode === 'dark' ? 'text-white/70' : 'text-secondary/80'}`}>
                  Password
                </label>
                <input
                  type="password"
                  minLength={8}
                  required
                  autoComplete="new-password"
                  className={`w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 ${inputClasses}`}
                  value={signupForm.password}
                  onChange={(event) => setSignupForm((prev) => ({ ...prev, password: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className={`text-sm font-semibold ${panelMode === 'dark' ? 'text-white/70' : 'text-secondary/80'}`}>
                  Confirm password
                </label>
                <input
                  type="password"
                  minLength={8}
                  required
                  autoComplete="new-password"
                  className={`w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 ${inputClasses}`}
                  value={signupForm.confirmPassword}
                  onChange={(event) => setSignupForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                />
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={signupForm.acceptTerms}
                  onChange={(event) => setSignupForm((prev) => ({ ...prev, acceptTerms: event.target.checked }))}
                  className="mt-1"
                />
                <span className={panelMode === 'dark' ? 'text-white/80' : 'text-secondary/80'}>
                  I agree to the{' '}
                  <a href="/terms" className="underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" className="underline">
                    Privacy Policy
                  </a>
                  .
                </span>
              </label>
              {signupFeedback.message && (
                <div
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    signupFeedback.status === 'error'
                      ? 'border-destructive text-destructive bg-destructive/10'
                      : 'border-emerald-500 text-emerald-600 bg-emerald-500/10'
                  }`}
                >
                  {signupFeedback.message}
                </div>
              )}
              <button
                type="submit"
                className="w-full rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted/10 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'Creating account…' : 'Create account'}
              </button>
              <button
                type="button"
                onClick={() => setAuthPanelView('login')}
                className="w-full rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted/10"
              >
                Back to login
              </button>
            </form>
          </WalletPanel>
          {renderFooterContent()}
        </div>
      </div>
    );
  };

  const renderFooterContent = () => {
    const useGlassmorphism = loginVariant === 'polkadot-second-age-glass';
    // For glassmorphism in dark mode, use white text. In light mode, use dark text.
    // For non-glassmorphism, use white text in dark mode.
    const isDarkText = useGlassmorphism ? (panelMode === 'dark') : (panelMode === 'dark');
    
    // Use inline styles for glassmorphism to ensure they override inherited colors
    const linkStyle = useGlassmorphism && panelMode === 'light' ? { color: '#1C1917' } : (panelMode === 'dark' ? { color: '#FFFFFF' } : undefined);
    const textStyle = useGlassmorphism && panelMode === 'light' ? { color: '#57534E' } : (panelMode === 'dark' ? { color: 'rgba(255, 255, 255, 0.7)' } : undefined);
    
    return (
      <div className="space-y-3">
        <a
          href="https://polkadot.com/get-started/wallets/"
          target="_blank"
          rel="noreferrer"
          className={`block text-center text-sm font-semibold ${
            isDarkText ? 'text-white' : (useGlassmorphism ? '' : 'text-[var(--accent)]')
          } transition-colors hover:text-[var(--accent)]/80 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25 rounded-xl py-2`}
          style={linkStyle}
        >
          Need a wallet? View recommended options
        </a>
        <p 
          className={`text-center text-xs ${isDarkText ? 'text-white/70' : (useGlassmorphism ? '' : 'text-secondary/80')}`}
          style={textStyle}
        >
          By continuing, you agree to ChopDot&apos;s{' '}
          <a
            href="/terms"
            className={`font-medium underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 rounded-sm px-0.5 ${
              isDarkText ? 'text-white' : (useGlassmorphism ? '' : 'text-foreground')
            }`}
            style={linkStyle}
          >
            Terms of Service
          </a>{' '}
          and{' '}
          <a
            href="/privacy"
            className={`font-medium underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 rounded-sm px-0.5 ${
              isDarkText ? 'text-white' : (useGlassmorphism ? '' : 'text-foreground')
            }`}
            style={linkStyle}
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    );
  };

  const renderPanelLayout = () => {
    const useGlassmorphism = loginVariant === 'polkadot-second-age-glass';

    if (authPanelView === 'signup') {
      const resolvedPanelTheme = useGlassmorphism
        ? (polkadotSecondAgePanelThemes[panelMode] ?? defaultPanelTheme)
        : (frostedPanelThemes[panelMode] ?? defaultPanelTheme);
      const inputClasses =
        panelMode === 'dark'
          ? 'bg-white/10 border-white/20 text-white placeholder:text-white/60'
          : 'bg-white border-black/10 text-[#0f0f11] placeholder:text-secondary/70';

      return (
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-sm space-y-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <ChopDotMark size={52} useWhite={useGlassmorphism && panelMode === 'dark'} useBlackAndWhite={useGlassmorphism && panelMode === 'light'} />
              <p className={
                useGlassmorphism 
                  ? (panelMode === 'dark' ? 'text-sm font-medium text-white/90' : 'text-sm font-medium text-[#1C1917]')
                  : (panelMode === 'dark' ? 'text-sm font-medium text-white/90' : 'text-sm font-medium text-secondary/80')
              }>
                Create your ChopDot account
              </p>
            </div>
            <WalletPanel theme={resolvedPanelTheme} useGlassmorphism={useGlassmorphism} mode={panelMode}>
              <form onSubmit={handleSignupSubmit} className="space-y-3">
                <div className="space-y-1">
                  <p className={`text-base font-semibold ${panelMode === 'dark' ? 'text-white' : 'text-[#111111]'}`}>
                    Sign up with email
                  </p>
                  <p className={`text-sm ${panelMode === 'dark' ? 'text-white/70' : 'text-secondary/80'}`}>
                    We&apos;ll send a confirmation link so you can verify your email.
                  </p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="signup-email" className={`text-sm font-semibold ${panelMode === 'dark' ? 'text-white/70' : 'text-secondary/80'}`}>
                    Email
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    required
                    className={`w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 ${inputClasses}`}
                    value={signupForm.email}
                    onChange={(event) =>
                      setSignupForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="signup-password" className={`text-sm font-semibold ${panelMode === 'dark' ? 'text-white/70' : 'text-secondary/80'}`}>
                    Password
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    className={`w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 ${inputClasses}`}
                    value={signupForm.password}
                    onChange={(event) =>
                      setSignupForm((prev) => ({ ...prev, password: event.target.value }))
                    }
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="signup-confirm-password" className={`text-sm font-semibold ${panelMode === 'dark' ? 'text-white/70' : 'text-secondary/80'}`}>
                    Confirm Password
                  </label>
                  <input
                    id="signup-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    className={`w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 ${inputClasses}`}
                    value={signupForm.confirmPassword}
                    onChange={(event) =>
                      setSignupForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                    }
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="signup-username" className={`text-sm font-semibold ${panelMode === 'dark' ? 'text-white/70' : 'text-secondary/80'}`}>
                    Username (optional)
                  </label>
                  <input
                    id="signup-username"
                    type="text"
                    autoComplete="username"
                    className={`w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 ${inputClasses}`}
                    value={signupForm.username}
                    onChange={(event) =>
                      setSignupForm((prev) => ({ ...prev, username: event.target.value }))
                    }
                    disabled={loading}
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-muted/80">
                  <input
                    type="checkbox"
                    checked={signupForm.acceptTerms}
                    onChange={(e) =>
                      setSignupForm((prev) => ({ ...prev, acceptTerms: e.target.checked }))
                    }
                    disabled={loading}
                    className="h-4 w-4 rounded border-gray-300 text-[var(--accent)] focus:ring-[var(--accent)]"
                  />
                  <span className={panelMode === 'dark' ? 'text-white/80' : 'text-secondary/80'}>
                    I agree to the <a href="/terms" target="_blank" rel="noreferrer" className={`underline ${panelMode === 'dark' ? 'text-white' : 'text-foreground'}`}>Terms of Service</a> and <a href="/privacy" target="_blank" rel="noreferrer" className={`underline ${panelMode === 'dark' ? 'text-white' : 'text-foreground'}`}>Privacy Policy</a>
                  </span>
                </label>
                {signupFeedback.message && (
                  <div
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      signupFeedback.status === 'error'
                        ? 'border-destructive text-destructive bg-destructive/10'
                        : 'border-emerald-500 text-emerald-600 bg-emerald-500/10'
                    }`}
                  >
                    {signupFeedback.message}
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted/10 disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? 'Creating account…' : 'Create account'}
                </button>
                <button
                  type="button"
                  onClick={() => setAuthPanelView('login')}
                  className="w-full rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted/10"
                >
                  Back to login
                </button>
              </form>
            </WalletPanel>
            {renderFooterContent()}
          </div>
        </div>
      );
    }
    void renderSignupPanel;

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
        handler: () => startWalletConnectSession({ openQrModal: true, source: 'desktop-qr' }),
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
              onRetry={async () => await startWalletConnectSession({ openQrModal: false, source: 'mobile-panel-retry' })}
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
            {renderFooterContent()}
          </div>
        </div>
      );
    }

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
              >
                Sign in to ChopDot
              </p>
            </div>
            
          {/* Prominent signature waiting banner - Desktop */}
          {isWaitingForSignature && (
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
          )}
          
          <WalletPanel theme={resolvedPanelTheme} useGlassmorphism={useGlassmorphism} mode={panelMode}>
            <div className="space-y-3">
              {appliedWalletOptions.map((option) => (
                <div key={option.id} className="space-y-3">
	                  <WalletOption
	                    title={option.title}
	                    subtitle={option.subtitle}
	                    iconSrc={option.icon.src}
                    iconAlt={option.icon.alt}
                    onClick={option.handler}
                    disabled={loading}
                    panelMode={panelMode}
                    useGlassmorphism={useGlassmorphism}
                    useMarkForIcon={option.id === 'email'}
	                    loading={option.showsLoadingIndicator && loading}
	                    theme={option.themeOverride}
	                  />
	                </div>
	              ))}
	            </div>

          <WalletOption
              title="Continue as guest"
              onClick={handleGuestLogin}
              disabled={loading}
              variant="ghost"
              theme={variationGuestTheme}
              panelMode={panelMode}
              useGlassmorphism={useGlassmorphism}
            />

            <label className={`flex items-center justify-between gap-3 rounded-xl border border-border/60 px-4 py-3 text-sm ${useGlassmorphism && panelMode === 'dark' ? 'text-white' : ''}`}>
              <span className={`font-semibold ${useGlassmorphism && panelMode === 'dark' ? 'text-white' : 'text-foreground'}`}>Keep me signed in</span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--accent)]"
                checked={keepSignedIn}
                onChange={(event) => handleKeepSignedInChange(event.target.checked)}
                disabled={loading}
              />
            </label>

            {renderErrorAlert()}
          </WalletPanel>

          {renderFooterContent()}
          {enableMobileUi && resolvedViewMode === 'desktop' && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setViewModeOverride('mobile')}
                className={`text-xs font-semibold underline underline-offset-4 ${
                  useGlassmorphism ? '' : 'text-[var(--accent)]'
                }`}
                style={useGlassmorphism ? (panelMode === 'dark' ? { color: '#FFFFFF' } : { color: '#1C1917' }) : undefined}
              >
                Switch to mobile wallets view
              </button>
            </div>
          )}
        </div>
      </div>
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
              setEmailCredentials({ email: rememberEmail ? getRememberedEmail() : '', password: '' });
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
