/**
 * LOGIN SCREEN
 * 
 * Authentication screen supporting multiple sign-in methods:
 * - Polkadot.js (direct connection)
 * - Other wallets via WalletConnect (SubWallet, Talisman, MetaMask, Rainbow, etc.)
 */

import { useState, useEffect, useRef, ReactNode, CSSProperties, useId, MouseEvent, FormEvent } from 'react';
import { AlertCircle, Loader2, X, ChevronDown } from 'lucide-react';
import { useAuth, AuthMethod } from '../../contexts/AuthContext';
import { useAccount } from '../../contexts/AccountContext';
import {
  signPolkadotMessage,
  generateSignInMessage,
} from '../../utils/walletAuth';
import { triggerHaptic } from '../../utils/haptics';
import QRCodeLib from 'qrcode';
import useClientDevice from '../../hooks/useClientDevice';
import { getSupabase } from '../../utils/supabase-client';

declare global {
  interface Window {
    analytics?: {
      track?: (event: string, payload?: Record<string, unknown>) => void;
    };
  }
}
import { walletConnectLinks } from '../../config/wallet-connect-links';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

const ChopDotMark = ({ size = 48 }: { size?: number }) => {
  const maskId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      role="img"
      aria-hidden="true"
    >
      <defs>
        <mask id={maskId}>
          <rect x="0" y="0" width="256" height="256" fill="white" />
          <rect
            x="-64"
            y="112"
            width="384"
            height="32"
            fill="black"
            transform="rotate(-35 128 128)"
          />
        </mask>
      </defs>
      <circle cx="128" cy="128" r="96" fill="var(--accent)" mask={`url(#${maskId})`} />
    </svg>
  );
};

const WalletLogo = ({
  src,
  alt,
  className = '',
}: {
  src: string;
  alt: string;
  className?: string;
}) => (
  <img
    src={src}
    alt={alt}
    className={`h-8 w-8 object-contain ${className}`}
    draggable={false}
  />
);

interface PanelTheme {
  background: string;
  borderColor: string;
  shadow: string;
  backdropFilter?: string;
}

const defaultPanelTheme: PanelTheme = {
  background: 'rgba(10,10,15,0.55)',
  borderColor: 'rgba(255,255,255,0.08)',
  shadow: '0 0 65px rgba(230,0,122,0.4), 0 38px 120px rgba(0,0,0,0.65)',
  backdropFilter: 'blur(30px)',
};

const WalletPanel = ({
  children,
  theme = defaultPanelTheme,
}: {
  children: ReactNode;
  theme?: PanelTheme;
}) => (
  <div
    className="rounded-2xl border px-6 py-8 sm:px-8 sm:py-8 space-y-4 transition-colors"
    style={{
      background: theme.background,
      borderColor: theme.borderColor,
      boxShadow: theme.shadow,
      backdropFilter: theme.backdropFilter,
    }}
  >
    {children}
  </div>
);

interface WalletOptionTheme {
  background: string;
  hoverBackground?: string;
  borderColor: string;
  iconBackground?: string;
  iconBorderColor?: string;
  iconShadow?: string;
  titleColor?: string;
  subtitleColor?: string;
  shadow?: string;
  borderStyle?: 'solid' | 'dashed' | 'none';
}

const defaultOptionTheme: WalletOptionTheme = {
  background: 'linear-gradient(135deg, #05060c 0%, #111b36 100%)',
  hoverBackground: 'linear-gradient(135deg, #080914 0%, #152144 100%)',
  borderColor: 'rgba(255,255,255,0.18)',
  iconBackground: 'linear-gradient(145deg, #1f1c2d, #0f0c18)',
  iconBorderColor: 'rgba(255,255,255,0.25)',
  iconShadow: '0 8px 20px rgba(0,0,0,0.35)',
  titleColor: '#ffffff',
  subtitleColor: 'rgba(255,255,255,0.8)',
  shadow: '0 15px 35px rgba(0,0,0,0.4)',
  borderStyle: 'solid',
};

const ghostOptionTheme: WalletOptionTheme = {
  background: 'transparent',
  hoverBackground: 'rgba(255,255,255,0.05)',
  borderColor: 'rgba(255,255,255,0.3)',
  iconBackground: 'transparent',
  iconBorderColor: 'transparent',
  titleColor: '#ffffff',
  subtitleColor: 'rgba(255,255,255,0.7)',
  borderStyle: 'dashed',
};

const polkadotOptionTheme: Partial<WalletOptionTheme> = {
  background: 'linear-gradient(140deg, #2a0b25 0%, #422b62 100%)',
  hoverBackground: 'linear-gradient(140deg, #361132 0%, #513277 100%)',
  borderColor: 'rgba(230,0,122,0.35)',
};

const emailOptionTheme: Partial<WalletOptionTheme> = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(255,240,249,0.92) 100%)',
  hoverBackground: '#ffffff',
  borderColor: 'rgba(0,0,0,0.08)',
  iconBackground: '#ffffff',
  iconBorderColor: 'rgba(0,0,0,0.05)',
  titleColor: '#111111',
  subtitleColor: '#5a5a66',
  shadow: '0 12px 30px rgba(0,0,0,0.08)',
};

type PanelMode = 'dark' | 'light';
type LoginViewOverride = 'auto' | 'desktop' | 'mobile';


const sceneBackgroundStyles: Record<PanelMode, CSSProperties> = {
  dark: {
    backgroundColor: '#050105',
    color: '#ffffff',
    backgroundImage:
      'radial-gradient(rgba(230,0,122,0.15) 1.2px, transparent 1.2px), radial-gradient(rgba(230,0,122,0.07) 1.2px, transparent 1.2px)',
    backgroundSize: '48px 48px, 48px 48px',
    backgroundPosition: '0 0, 24px 24px',
  },
  light: {
    backgroundColor: '#fdf7ff',
    color: '#0f0f11',
    backgroundImage:
      'radial-gradient(rgba(230,0,122,0.06) 1px, transparent 1px), radial-gradient(rgba(230,0,122,0.03) 1px, transparent 1px)',
    backgroundSize: '52px 52px, 52px 52px',
    backgroundPosition: '0 0, 26px 26px',
  },
};

const frostedPanelThemes: Record<PanelMode, PanelTheme> = {
  dark: {
    background: 'rgba(10,10,15,0.55)',
    borderColor: 'rgba(255,255,255,0.08)',
    shadow: '0 0 65px rgba(230,0,122,0.4), 0 38px 120px rgba(0,0,0,0.65)',
    backdropFilter: 'blur(30px)',
  },
  light: {
    background: 'linear-gradient(150deg, rgba(255,255,255,0.55), rgba(255,240,249,0.85))',
    borderColor: 'rgba(255,255,255,0.35)',
    shadow: '0 0 60px rgba(230,0,122,0.2), 0 25px 90px rgba(0,0,0,0.08)',
    backdropFilter: 'blur(28px)',
  },
};

const frostedWalletThemes: Record<PanelMode, Partial<WalletOptionTheme>> = {
  dark: {
    background: 'rgba(15,15,22,0.72)',
    hoverBackground: 'rgba(21,21,30,0.8)',
    borderColor: 'rgba(255,255,255,0.08)',
    iconBackground: 'rgba(255,255,255,0.12)',
    iconBorderColor: 'rgba(255,255,255,0.2)',
    titleColor: '#ffffff',
    subtitleColor: 'rgba(255,255,255,0.78)',
    shadow: 'none',
  },
  light: {
    background: 'rgba(255,255,255,0.9)',
    hoverBackground: '#ffffff',
    borderColor: 'rgba(0,0,0,0.04)',
    iconBackground: '#ffffff',
    iconBorderColor: 'rgba(0,0,0,0.04)',
    titleColor: '#1c1c22',
    subtitleColor: '#5a5a66',
    shadow: 'none',
  },
};

const frostedGuestThemes: Record<PanelMode, Partial<WalletOptionTheme>> = {
  dark: {
    background: 'rgba(255,255,255,0.12)',
    hoverBackground: 'rgba(255,255,255,0.2)',
    borderColor: 'rgba(255,255,255,0.45)',
    titleColor: '#ffffff',
    subtitleColor: 'rgba(255,255,255,0.72)',
    borderStyle: 'solid',
  },
  light: {
    background: '#ffffff',
    hoverBackground: '#f5f5f8',
    borderColor: 'rgba(0,0,0,0.05)',
    titleColor: '#111111',
    subtitleColor: '#6b7280',
    borderStyle: 'solid',
  },
};

const frostedWalletOverrides: Record<string, Partial<WalletOptionTheme>> = {
  polkadot: {
    background: '#e6007a',
    hoverBackground: '#ff1d93',
    borderColor: '#e6007a',
    iconBackground: '#ffffff',
    iconBorderColor: 'rgba(0,0,0,0.05)',
    titleColor: '#ffffff',
    subtitleColor: 'rgba(255,255,255,0.9)',
    iconShadow: '0 4px 12px rgba(230,0,122,0.35)',
    shadow: '0 8px 24px rgba(230,0,122,0.25)',
  },
};


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
  handler: () => void;
  showsLoadingIndicator?: boolean;
  themeOverride?: Partial<WalletOptionTheme>;
}

interface WalletOptionProps {
  title: string;
  subtitle?: string;
  iconSrc?: string;
  iconAlt?: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'default' | 'ghost';
  theme?: Partial<WalletOptionTheme>;
}

const WalletOption = ({
  title,
  subtitle,
  iconSrc,
  iconAlt,
  onClick,
  disabled,
  loading,
  variant = 'default',
  theme,
}: WalletOptionProps) => {
  const isGhost = variant === 'ghost';
  const baseClasses =
    'group flex w-full items-center gap-4 rounded-xl p-4 transition-all active:scale-[0.995] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 disabled:opacity-60';
  const variantClasses =
    isGhost
      ? 'justify-center text-sm font-semibold'
      : 'text-left';
  const contentAlignment = isGhost && !iconSrc ? 'text-center' : 'text-left';
  const resolvedTheme = {
    ...(isGhost ? ghostOptionTheme : defaultOptionTheme),
    ...theme,
  };
  const buttonStyle: CSSProperties = {
    background: resolvedTheme.background,
    borderColor: resolvedTheme.borderColor,
    boxShadow: resolvedTheme.shadow,
  };
  const titleStyle = resolvedTheme.titleColor ? { color: resolvedTheme.titleColor } : undefined;
  const subtitleStyle = resolvedTheme.subtitleColor ? { color: resolvedTheme.subtitleColor } : undefined;
  const borderClass = resolvedTheme.borderStyle === 'none' ? 'border-0' : 'border';
  const borderStyleClass = resolvedTheme.borderStyle === 'dashed' ? 'border-dashed' : '';
  const handleMouseEnter = !isGhost && resolvedTheme.hoverBackground
    ? (event: MouseEvent<HTMLButtonElement>) => {
        event.currentTarget.style.background = resolvedTheme.hoverBackground as string;
      }
    : undefined;
  const handleMouseLeave = !isGhost && resolvedTheme.hoverBackground
    ? (event: MouseEvent<HTMLButtonElement>) => {
        event.currentTarget.style.background = resolvedTheme.background as string;
      }
    : undefined;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} ${borderClass} ${borderStyleClass}`}
      style={buttonStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {iconSrc && (
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border p-1.5"
          style={{
            background: resolvedTheme.iconBackground,
            borderColor: resolvedTheme.iconBorderColor,
            boxShadow: resolvedTheme.iconShadow,
          }}
        >
          <div className="h-9 w-9 flex items-center justify-center rounded-full overflow-hidden">
            <WalletLogo src={iconSrc} alt={iconAlt ?? ''} className="h-full w-full object-cover" />
          </div>
        </div>
      )}
      <div className={`flex-1 ${contentAlignment} leading-tight`}>
        <p
          className={`text-base ${isGhost ? 'font-semibold' : 'font-medium'} ${resolvedTheme.titleColor ? '' : 'text-foreground'}`}
          style={titleStyle}
        >
          {title}
        </p>
        {subtitle && (
          <p className={`text-sm ${resolvedTheme.subtitleColor ? '' : 'text-secondary/80'}`} style={subtitleStyle}>
            {subtitle}
          </p>
        )}
      </div>
      {loading && <Loader2 className="h-5 w-5 animate-spin text-white/80" />}
    </button>
  );
};

const POLKADOT_JS_LOGO = '/assets/Logos/Polkadot Js Logo.png';
const WALLETCONNECT_LOGO = '/assets/Logos/Wallet Connect Logo.png';
const SUBWALLET_LOGO = '/assets/Logos/Subwallet Logo.png';
const TALISMAN_LOGO = '/assets/Logos/Talisman Wallet Logo.png';
const EMAIL_LOGIN_LOGO = '/assets/Logos/choptdot_whitebackground.png';

const isFlagEnabled = (value?: string) => value === '1' || value?.toLowerCase() === 'true';

interface ViewModeToggleProps {
  value: LoginViewOverride;
  onChange: (value: LoginViewOverride) => void;
  resolvedView: 'desktop' | 'mobile';
}

const ViewModeToggle = ({ value, onChange, resolvedView }: ViewModeToggleProps) => {
  const options: { id: LoginViewOverride; label: string }[] = [
    { id: 'auto', label: `Auto (${resolvedView})` },
    { id: 'desktop', label: 'Desktop' },
    { id: 'mobile', label: 'Mobile' },
  ];

  return (
    <div className="fixed top-4 right-4 z-[80]">
      <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3 py-2 text-white shadow-lg backdrop-blur-lg">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70">Login view</span>
        <div className="flex rounded-full bg-white/10 p-0.5">
          {options.map((option) => {
            const isActive = value === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onChange(option.id)}
                className={`px-3 py-1 text-[11px] font-medium rounded-full transition-colors ${
                  isActive ? 'bg-white text-black' : 'text-white/70 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface WalletConnectModalToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

const WalletConnectModalToggle = ({ enabled, onChange }: WalletConnectModalToggleProps) => {
  return (
    <div className="fixed top-4 left-4 z-[80]">
      <div className="flex items-center gap-2 rounded-full border border-border/50 bg-background/95 backdrop-blur-sm px-3 py-2 shadow-lg">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/70">WC Modal</span>
        <div className="flex rounded-full bg-muted/50 p-0.5">
          <button
            type="button"
            onClick={() => {
              const newValue = !enabled;
              onChange(newValue);
              localStorage.setItem('chopdot.wcModal.enabled', String(newValue));
            }}
            className={`px-3 py-1 text-[11px] font-medium rounded-full transition-colors ${
              enabled 
                ? 'bg-[var(--accent)] text-white' 
                : 'text-foreground/70 hover:text-foreground'
            }`}
          >
            {enabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    </div>
  );
};

const trackEvent = (name: string, payload?: Record<string, unknown>) => {
  try {
    window?.analytics?.track?.(name, payload);
  } catch (err) {
    console.debug(`[analytics] ${name}`, payload);
  }
};

export function SignInScreen({ onLoginSuccess }: LoginScreenProps) {
  const { login, loginAsGuest, logout } = useAuth();
  const account = useAccount(); // Get AccountContext to auto-connect wallet
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWalletConnectQR, setShowWalletConnectQR] = useState(false);
  const [walletConnectQRCode, setWalletConnectQRCode] = useState<string | null>(null);
  const [walletConnectUri, setWalletConnectUri] = useState<string | null>(null);
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
  const [emailCredentials, setEmailCredentials] = useState({ email: '', password: '' });
  const [authPanelView, setAuthPanelView] = useState<'login' | 'signup'>('login');
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
      setWalletConnectUri(null);
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
          await new Promise((resolve) => setTimeout(resolve, 800));

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
          const message = generateSignInMessage(address);
          
          console.log('[LoginScreen] Requesting signature from WalletConnect...');
          console.log('[LoginScreen] 💡 Stay in your wallet app until you approve the signature');
          
          // Request signature - mobile wallets need time to surface the prompt
          const { signature } = await signer.signRaw({
            address,
            data: stringToHex(message),
          });
          
          console.log('[LoginScreen] Signature received, logging in...');
          // Login with signature
          await login('rainbow', {
            type: 'wallet',
            address,
            signature,
            message,
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
          setWalletConnectUri(null);
          setIsWaitingForWalletConnect(false);
          setError('WalletConnect connection timed out. Please try again.');
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
          const message = generateSignInMessage(address);
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
            const message = generateSignInMessage(wcAddress);
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
              const message = generateSignInMessage(connectedAddress);
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
      await login(method, {
        type: 'wallet',
        address,
        signature,
        message: generateSignInMessage(address),
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
      const message = generateSignInMessage(address);
      
      console.log('[LoginScreen] Requesting signature from WalletConnect...');
      console.log('[LoginScreen] 💡 Stay in your wallet app until you approve the signature');
      
      // Add delay to give wallet time to surface signature prompt
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      const { signature } = await signer.signRaw({
        address,
        data: stringToHex(message),
      });
      
      console.log('[LoginScreen] Signature received, logging in...');
      
      // Login with signature
      await login('rainbow', {
        type: 'wallet',
        address,
        signature,
        message,
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
      triggerHaptic('medium');
      setShowEmailLogin(false);
      setEmailCredentials({ email: '', password: '' });
      onLoginSuccess?.();
    } catch (err: any) {
      console.error('Email login failed:', err);
      setError(err.message || 'Failed to login with email and password');
      triggerHaptic('error');
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
      const { error } = await supabase.auth.signUp({
        email: signupForm.email.trim(),
        password: signupForm.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: signupForm.username ? { username: signupForm.username } : undefined,
        },
      });
      if (error) {
        throw error;
      }
      setSignupFeedback({
        status: 'success',
        message: 'Check your email to confirm your account, then sign in here.',
      });
      triggerHaptic('medium');
    } catch (err: any) {
      console.error('Signup failed:', err);
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

      const message = generateSignInMessage(address);
      const signature = await signPolkadotMessage(address, message);

      await login('polkadot', {
        type: 'wallet',
        address,
        signature,
        message,
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

      setWalletConnectUri(uri);
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
      setWalletConnectUri(null);
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

const MobileWalletConnectPanel = ({
  uri,
  loading,
  errorMessage,
  onRetry,
  onSwitchToDesktop,
  mode,
  panelTheme,
  walletTheme,
  guestTheme,
  onGuestLogin,
  onError,
  preferDeepLinks,
  onEmailOptionToggle,
  emailTheme,
  showEmailForm,
  renderEmailForm,
  onSignupLink,
  waitingForSignature,
  onOpenModal,
}: {
  uri: string | null;
  loading: boolean;
  errorMessage: string | null;
  onRetry: () => Promise<string | null>;
    onSwitchToDesktop: () => void;
    mode: PanelMode;
    panelTheme: PanelTheme;
    walletTheme: Partial<WalletOptionTheme>;
    guestTheme: Partial<WalletOptionTheme>;
    onGuestLogin: () => Promise<void>;
    onError: (message: string) => void;
    preferDeepLinks: boolean;
    onEmailOptionToggle: () => void;
    emailTheme: Partial<WalletOptionTheme>;
  showEmailForm: boolean;
  renderEmailForm?: () => ReactNode;
  onSignupLink: () => void;
  waitingForSignature: boolean;
  onOpenModal?: () => Promise<void>;
}) => {
    const [showSecondaryWallets, setShowSecondaryWallets] = useState(false);
    const textPrimary = mode === 'dark' ? 'text-white' : 'text-[#111111]';
    const textSecondary = mode === 'dark' ? 'text-white/70' : 'text-secondary/80';
    const walletLinks = walletConnectLinks.filter((link) => link.id !== 'copy');
    const primaryWalletIds: WalletOptionConfig['id'][] = ['subwallet', 'talisman', 'nova'];
    const primaryWallets = primaryWalletIds
      .map((id) => walletLinks.find((link) => link.id === id))
      .filter((link): link is (typeof walletLinks)[number] => Boolean(link));
    const secondaryWallets = walletLinks.filter((link) => !primaryWalletIds.includes(link.id));

    const handleWalletClick = async (linkId: string) => {
      const link = walletLinks.find((l) => l.id === linkId);
      if (!link) {
        return;
      }
      
      // Check if we're on a real mobile device (not desktop browser simulation)
      const isRealMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && 
                           !/Chrome|Firefox|Safari/.test(navigator.userAgent) || 
                           (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
      
      // On desktop, deep links won't work - suggest using QR code instead
      if (!isRealMobile && !preferDeepLinks) {
        onError('Mobile wallet links only work on real mobile devices. Please use "Switch to desktop wallet view" to scan the QR code, or test on your phone.');
        return;
      }
      
      let sessionUri = uri;
      if (!sessionUri) {
        sessionUri = await onRetry();
      }
      if (!sessionUri) {
        onError('Unable to start WalletConnect session. Please try again.');
        return;
      }
      const finalUri = sessionUri!;
      
      // Prefer deep links on mobile, skip universal links (they're unreliable)
      const target = link.deepLink?.(finalUri);
      if (!target) {
        onError('Unable to open this wallet. Please switch to desktop QR or test on a real mobile device.');
        return;
      }
      
      try {
        // Deep links must use window.location.href (can't open in popup)
        window.location.href = target;
        trackEvent('mobile_wallet_link_clicked', { walletId: link.id });
      } catch (err) {
        console.error('[MobileWalletConnect] Failed to open wallet link', err);
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(finalUri);
          onError('Could not open the wallet directly. WalletConnect link copied—paste it into your wallet app.');
        } else {
          onError('Could not open the wallet link. Please switch to the desktop QR view or test on a real mobile device.');
        }
      }
    };

    return (
      <WalletPanel theme={panelTheme}>
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <p className={`text-base font-semibold ${textPrimary}`}>Open your wallet</p>
            <p className={`text-sm ${textSecondary}`}>
              Tap your wallet below. After approving the connection, stay inside your wallet until you confirm the signature.
            </p>
          {waitingForSignature && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-[var(--accent)] dark:bg-white/10">
              <Loader2 className="h-3 w-3 animate-spin" />
              Waiting for signature in wallet…
            </div>
          )}
        </div>

        {onOpenModal && (
          <WalletOption
            title="WalletConnect (new picker)"
            subtitle="Search + QR like ether.fi"
            iconSrc={WALLETCONNECT_LOGO}
            iconAlt="WalletConnect logo"
            onClick={onOpenModal}
            disabled={loading}
            theme={walletTheme}
          />
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive space-y-2">
            <p>{errorMessage}</p>
            <button
                type="button"
                onClick={onRetry}
                className="text-xs font-semibold underline underline-offset-2"
                disabled={loading}
              >
                Try again
              </button>
            </div>
          )}

          <div className="space-y-3">
            {primaryWallets.map((link) => (
              <WalletOption
                key={link.id}
                title={link.label}
                subtitle={link.description}
                iconSrc={link.icon}
                iconAlt={`${link.label} icon`}
                onClick={() => handleWalletClick(link.id)}
                disabled={loading}
                theme={walletTheme}
              />
            ))}
          </div>

          {secondaryWallets.length > 0 && (
            <div
              className={`rounded-2xl border px-3 py-2 transition-colors ${
                mode === 'dark'
                  ? 'border-white/15 bg-white/5'
                  : 'border-black/5 bg-white/60'
              }`}
            >
              <button
                type="button"
                onClick={() => setShowSecondaryWallets((prev) => !prev)}
                className="w-full flex items-center justify-between text-sm font-semibold text-[var(--accent)]"
              >
                {showSecondaryWallets ? 'Hide more wallets' : 'More wallet options'}
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showSecondaryWallets ? 'rotate-180' : 'rotate-0'}`}
                />
              </button>
              {showSecondaryWallets && (
                <div className="mt-3 space-y-3">
                  {secondaryWallets.map((link) => (
                    <WalletOption
                      key={link.id}
                      title={link.label}
                      subtitle={link.description}
                      iconSrc={link.icon}
                      iconAlt={`${link.label} icon`}
                      onClick={() => handleWalletClick(link.id)}
                      disabled={loading}
                      theme={walletTheme}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <WalletOption
              title="Email & password"
              subtitle="Sign in with your ChopDot account"
              iconSrc={EMAIL_LOGIN_LOGO}
              iconAlt="Email login icon"
              onClick={onEmailOptionToggle}
              disabled={loading}
              theme={{
                ...walletTheme,
                ...emailTheme,
              }}
            />
            {showEmailForm && renderEmailForm?.()}
            <button
              type="button"
              onClick={onSignupLink}
              className="text-xs text-[var(--accent)] underline underline-offset-4"
            >
              Need an account? Create one
            </button>
          </div>

          <WalletOption
            title="Continue as guest"
            onClick={onGuestLogin}
            disabled={loading}
            variant="ghost"
            theme={guestTheme}
          />

          <div className="text-center space-y-2">
            <button
              type="button"
              onClick={onSwitchToDesktop}
              className="text-xs font-semibold text-[var(--accent)] underline underline-offset-4"
            >
              Switch to desktop wallet view
            </button>
          </div>
        </div>
      </WalletPanel>
    );
  };

  const renderEmailLoginForm = () => {
    const containerClasses =
      panelMode === 'dark'
        ? 'border-white/10 bg-white/5'
        : 'border-black/5 bg-white shadow-[0_15px_35px_rgba(0,0,0,0.05)]';
    const inputClasses =
      panelMode === 'dark'
        ? 'bg-white/10 border-white/20 text-white placeholder:text-white/60'
        : 'bg-white border-black/10 text-[#0f0f11] placeholder:text-secondary/70';
    const labelClasses = panelMode === 'dark' ? 'text-white/80' : 'text-[#111111]';
    return (
      <form onSubmit={handleEmailLogin} className={`space-y-3 rounded-2xl border px-4 py-4 ${containerClasses}`}>
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
          <button
            type="submit"
            className="w-full rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted/10 disabled:opacity-60"
            disabled={loading}
          >
            Continue with email
          </button>
          <button
            type="button"
            onClick={() => {
              setShowEmailLogin(false);
              setEmailCredentials({ email: '', password: '' });
            }}
            className="w-full rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted/10"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  };

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
            <ChopDotMark size={52} />
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

  const renderFooterContent = () => (
    <div className="space-y-3">
      <a
        href="https://polkadot.com/get-started/wallets/"
        target="_blank"
        rel="noreferrer"
        className={`block text-center text-sm font-semibold ${
          panelMode === 'dark' ? 'text-white' : 'text-[var(--accent)]'
        } transition-colors hover:text-[var(--accent)]/80 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25 rounded-xl py-2`}
      >
        Need a wallet? View recommended options
      </a>
      <p className={`text-center text-xs ${panelMode === 'dark' ? 'text-white/70' : 'text-secondary/80'}`}>
        By continuing, you agree to ChopDot&apos;s{' '}
        <a
          href="/terms"
          className={`font-medium underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 rounded-sm px-0.5 ${
            panelMode === 'dark' ? 'text-white' : 'text-foreground'
          }`}
        >
          Terms of Service
        </a>{' '}
        and{' '}
        <a
          href="/privacy"
          className={`font-medium underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 rounded-sm px-0.5 ${
            panelMode === 'dark' ? 'text-white' : 'text-foreground'
          }`}
        >
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );

  const renderPanelLayout = () => {
    if (authPanelView === 'signup') {
      return renderSignupPanel();
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
        handler: () => {
          // Ensure loading is cleared when toggling the email form
          setLoading(false);
          setShowEmailLogin((prev) => {
            setAuthPanelView('login');
            const next = !prev;
            if (!next) {
              setEmailCredentials({ email: '', password: '' });
            }
            setError(null);
            return next;
          });
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
        themeOverride: polkadotOptionTheme,
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

    const resolvedPanelTheme = frostedPanelThemes[panelMode] ?? defaultPanelTheme;
    const variationWalletTheme = frostedWalletThemes[panelMode];
    const variationGuestTheme = frostedGuestThemes[panelMode];

    const appliedWalletOptions = walletOptionConfigs.map((option) => {
      const overrideTheme = frostedWalletOverrides[option.id] ?? {};
      return {
        ...option,
        themeOverride: {
          ...variationWalletTheme,
          ...option.themeOverride,
          ...overrideTheme,
        },
      };
    });

    if (isMobileWalletFlow) {
      return (
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-sm space-y-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <ChopDotMark size={52} />
              <p className="text-sm font-medium text-white/90">Sign in to ChopDot</p>
            </div>
            <MobileWalletConnectPanel
              uri={walletConnectUri}
              loading={loading}
              errorMessage={error}
              onRetry={async () => await startWalletConnectSession({ openQrModal: false, source: 'mobile-panel-retry' })}
              onSwitchToDesktop={async () => {
                setViewModeOverride('desktop');
                await startWalletConnectSession({ openQrModal: true, source: 'mobile-panel-switch-desktop' });
              }}
              mode={panelMode}
              panelTheme={resolvedPanelTheme}
              walletTheme={variationWalletTheme}
              guestTheme={variationGuestTheme}
                onGuestLogin={handleGuestLogin}
              onError={(message) => setError(message)}
              preferDeepLinks={device.isMobile}
              onEmailOptionToggle={() =>
                setShowEmailLogin((prev) => {
                  const next = !prev;
                  if (!next) {
                    setEmailCredentials({ email: '', password: '' });
                  }
                  setError(null);
                  return next;
                })
              }
              emailTheme={emailOptionTheme}
              showEmailForm={showEmailLogin}
              renderEmailForm={renderEmailLoginForm}
              onSignupLink={() => {
                setShowEmailLogin(false);
                setAuthPanelView('signup');
              }}
              waitingForSignature={isWaitingForSignature}
              onOpenModal={enableWcModal ? handleWalletConnectModal : undefined}
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
            <ChopDotMark size={52} />
            <p className={panelMode === 'dark' ? 'text-sm font-medium text-white/90' : 'text-sm font-medium text-secondary/80'}>
              Sign in to ChopDot
            </p>
          </div>
          <WalletPanel theme={resolvedPanelTheme}>
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
                    loading={option.showsLoadingIndicator && loading}
                    theme={option.themeOverride}
                  />
                  {option.id === 'email' && showEmailLogin && renderEmailLoginForm()}
                  {option.id === 'email' && authPanelView === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowEmailLogin(false);
                        setAuthPanelView('signup');
                      }}
                      className="text-xs text-[var(--accent)] underline underline-offset-4 ml-1"
                    >
                      Need an account? Create one
                    </button>
                  )}
                </div>
              ))}
            </div>

            <WalletOption
              title="Continue as guest"
              onClick={handleGuestLogin}
              disabled={loading}
              variant="ghost"
              theme={variationGuestTheme}
            />

            {renderErrorAlert()}
          </WalletPanel>

          {renderFooterContent()}
          {enableMobileUi && resolvedViewMode === 'desktop' && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setViewModeOverride('mobile')}
                className="text-xs font-semibold text-[var(--accent)] underline underline-offset-4"
              >
                Switch to mobile wallets view
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`min-h-full flex flex-col overflow-auto transition-colors duration-200 ${
        panelMode === 'dark' ? 'text-white' : 'text-[#0f0f11]'
      }`}
      style={{
        ...(sceneBackgroundStyles[panelMode] ?? sceneBackgroundStyles.dark),
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {enableMobileUi && !device.isMobile && (
        <ViewModeToggle value={viewModeOverride} onChange={setViewModeOverride} resolvedView={resolvedViewMode} />
      )}
      {isDev && (
        <WalletConnectModalToggle enabled={wcModalEnabled} onChange={setWcModalEnabled} />
      )}
      {renderPanelLayout()}

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
              setWalletConnectUri(null);
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
                    setWalletConnectUri(null);
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
