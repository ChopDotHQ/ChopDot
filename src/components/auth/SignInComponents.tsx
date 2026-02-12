import { CSSProperties, type ReactNode, useId, type MouseEvent } from 'react';
import { Loader2 } from 'lucide-react';
import type { PanelMode, PanelTheme, WalletOptionTheme } from './SignInThemes';
import { defaultPanelTheme, defaultOptionTheme, ghostOptionTheme } from './SignInThemes';

export const ChopDotMark = ({
  size = 48,
  useBlackAndWhite = false,
  useWhite = false,
}: {
  size?: number;
  useBlackAndWhite?: boolean;
  useWhite?: boolean;
}) => {
  const maskId = useId();
  let fillColor: string;
  if (useWhite) {
    fillColor = '#FFFFFF';
  } else if (useBlackAndWhite) {
    fillColor = '#000000';
  } else {
    fillColor = 'var(--accent)';
  }
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
      <circle cx="128" cy="128" r="96" fill={fillColor} mask={`url(#${maskId})`} />
    </svg>
  );
};

export const WalletLogo = ({
  src,
  alt,
  className = '',
  useGrayscale = false,
}: {
  src: string;
  alt: string;
  className?: string;
  useGrayscale?: boolean;
}) => (
  <img
    src={src}
    alt={alt}
    className={`h-8 w-8 object-contain ${className}`}
    style={useGrayscale ? {
      filter: 'grayscale(75%) contrast(0.9) brightness(0.95)',
      opacity: 0.9,
    } : undefined}
    draggable={false}
  />
);

export const WalletPanel = ({
  children,
  theme = defaultPanelTheme,
  useGlassmorphism = false,
  mode = 'dark',
}: {
  children: ReactNode;
  theme?: PanelTheme;
  useGlassmorphism?: boolean;
  mode?: PanelMode;
}) => {
  if (useGlassmorphism) {
    return (
      <div
        className={`glass-panel rounded-2xl border px-6 py-8 sm:px-8 sm:py-8 space-y-4 transition-all duration-300 ${
          mode === 'dark' ? 'glass-panel-dark' : 'glass-panel-light'
        }`}
        style={{
          backdropFilter: 'blur(16px) saturate(120%)',
          WebkitBackdropFilter: 'blur(16px) saturate(120%)',
        }}
      >
        {children}
      </div>
    );
  }
  return (
    <div
      className="rounded-2xl border px-6 py-8 sm:px-8 sm:py-8 space-y-4 transition-colors"
      style={{
        background: theme.background,
        borderColor: theme.borderColor,
        boxShadow: theme.shadow,
        backdropFilter: theme.backdropFilter,
        WebkitBackdropFilter: theme.backdropFilter,
      }}
    >
      {children}
    </div>
  );
};

export interface WalletOptionProps {
  title: string;
  subtitle?: string;
  iconSrc?: string;
  iconAlt?: string;
  onClick?: (e?: React.MouseEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'default' | 'ghost';
  theme?: Partial<WalletOptionTheme>;
  panelMode?: PanelMode;
  useGlassmorphism?: boolean;
  useMarkForIcon?: boolean;
}

export const WalletOption = ({
  title,
  subtitle,
  iconSrc,
  iconAlt,
  onClick,
  disabled,
  loading,
  variant = 'default',
  theme,
  panelMode = 'dark',
  useGlassmorphism = false,
  useMarkForIcon = false,
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
  const titleStyle: CSSProperties = resolvedTheme.titleColor
    ? { color: resolvedTheme.titleColor }
    : {};
  const subtitleStyle: CSSProperties = resolvedTheme.subtitleColor
    ? { color: resolvedTheme.subtitleColor }
    : {};
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

  const bgStr = typeof resolvedTheme.background === 'string' ? resolvedTheme.background : '';
  const detectedGlassmorphism = bgStr.includes('rgba') &&
    (bgStr.includes('0.2') || bgStr.includes('0.3') || bgStr.includes('0.25') || bgStr.includes('0.17'));
  const shouldUseGlassmorphism = useGlassmorphism || detectedGlassmorphism;

  const isPolkadotButton = title === 'Polkadot.js';
  const glassClass = shouldUseGlassmorphism
    ? (isPolkadotButton
        ? 'glass-button glass-button-dark'
        : (panelMode === 'dark' ? 'glass-button glass-button-dark' : 'glass-button glass-button-light'))
    : '';

  return (
    <button
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} ${borderClass} ${borderStyleClass} ${glassClass} transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]`}
      style={{
        ...buttonStyle,
        ...(shouldUseGlassmorphism && {
          backdropFilter: 'blur(8px) saturate(150%)',
          WebkitBackdropFilter: 'blur(8px) saturate(150%)',
        }),
      }}
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
          {shouldUseGlassmorphism && useMarkForIcon ? (
            <div className="h-7 w-7 flex items-center justify-center">
              <ChopDotMark size={28} useWhite={panelMode === 'dark'} useBlackAndWhite={panelMode === 'light'} />
            </div>
          ) : (
            <div className="h-9 w-9 flex items-center justify-center rounded-full overflow-hidden">
              <WalletLogo
                src={iconSrc}
                alt={iconAlt ?? ''}
                className="h-full w-full object-cover"
                useGrayscale={shouldUseGlassmorphism && !useMarkForIcon}
              />
            </div>
          )}
        </div>
      )}
      <div className={`flex-1 ${contentAlignment} leading-tight`}>
        <p
          className={`text-base ${isGhost ? 'font-semibold' : 'font-medium'}`}
          style={{
            color: resolvedTheme.titleColor || (title === 'Polkadot.js' ? '#FAFAF9' : (panelMode === 'dark' ? '#FAFAF9' : '#1C1917')),
            ...titleStyle,
          }}
        >
          {title}
        </p>
        {subtitle && (
          <p
            className="text-sm"
            style={{
              color: resolvedTheme.subtitleColor || (title === 'Polkadot.js' ? 'rgba(250, 250, 249, 0.95)' : (panelMode === 'dark' ? 'rgba(250, 250, 249, 0.85)' : '#57534E')),
              ...subtitleStyle,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {loading && <Loader2 className="h-5 w-5 animate-spin text-white/80" />}
    </button>
  );
};

type ViewModeOption = 'auto' | 'desktop' | 'mobile';

export const ViewModeToggle = ({
  value,
  onChange,
  resolvedView,
  mode,
}: {
  value: ViewModeOption;
  onChange: (value: ViewModeOption) => void;
  resolvedView: 'desktop' | 'mobile';
  mode: PanelMode;
}) => {
  const options: { id: ViewModeOption; label: string }[] = [
    { id: 'auto', label: `Auto (${resolvedView})` },
    { id: 'desktop', label: 'Desktop' },
    { id: 'mobile', label: 'Mobile' },
  ];
  const isDark = mode === 'dark';

  return (
    <div className="fixed top-4 right-4 z-[80]">
      <div className={`flex items-center gap-2 rounded-full border ${isDark ? 'border-white/20 bg-black/60 text-white' : 'border-black/20 bg-white/90 text-black'} px-3 py-2 shadow-lg backdrop-blur-lg`}>
        <span className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${isDark ? 'text-white/70' : 'text-black/70'}`}>Login view</span>
        <div className={`flex rounded-full ${isDark ? 'bg-white/10' : 'bg-black/10'} p-0.5`}>
          {options.map((option) => {
            const isActive = value === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onChange(option.id)}
                className={`px-3 py-1 text-[11px] font-medium rounded-full transition-colors ${
                  isActive
                    ? (isDark ? 'bg-white text-black' : 'bg-black text-white')
                    : (isDark ? 'text-white/70 hover:text-white' : 'text-black/70 hover:text-black')
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

export const LoginVariantToggle = ({
  value,
  onChange,
  mode,
}: {
  value: 'default' | 'polkadot-second-age-glass';
  onChange: (value: 'default' | 'polkadot-second-age-glass') => void;
  mode: PanelMode;
}) => {
  const isDark = mode === 'dark';
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[80] pointer-events-auto">
      <div className={`flex items-center gap-2 rounded-full border ${isDark ? 'border-white/20 bg-black/60 text-white' : 'border-black/20 bg-white/90 text-black'} px-3 py-2 shadow-lg backdrop-blur-lg`}>
        <span className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${isDark ? 'text-white/70' : 'text-black/70'}`}>Style</span>
        <div className="flex rounded-full bg-muted/50 p-0.5">
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onChange('default');
            }}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
              value === 'default'
                ? (isDark ? 'bg-white/20 text-white' : 'bg-black/10 text-black')
                : (isDark ? 'text-white/60' : 'text-black/60')
            }`}
          >
            Default
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onChange('polkadot-second-age-glass');
            }}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
              value === 'polkadot-second-age-glass'
                ? (isDark ? 'bg-white/20 text-white' : 'bg-black/10 text-black')
                : (isDark ? 'text-white/60' : 'text-black/60')
            }`}
          >
            PSA Glass
          </button>
        </div>
      </div>
    </div>
  );
};

export const WalletConnectModalToggle = ({
  enabled,
  onChange,
  mode,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  mode: PanelMode;
}) => {
  const isDark = mode === 'dark';
  return (
    <div className="fixed top-4 left-4 z-[80]">
      <div className={`flex items-center gap-2 rounded-full border ${isDark ? 'border-white/20 bg-black/60 text-white' : 'border-black/20 bg-white/90 text-black'} px-3 py-2 shadow-lg backdrop-blur-lg`}>
        <span className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${isDark ? 'text-white/70' : 'text-black/70'}`}>WC Modal</span>
        <div className={`flex rounded-full ${isDark ? 'bg-white/10' : 'bg-black/10'} p-0.5`}>
          <button
            type="button"
            onClick={() => {
              const newValue = !enabled;
              onChange(newValue);
              localStorage.setItem('chopdot.wcModal.enabled', String(newValue));
            }}
            className={`px-3 py-1 text-[11px] font-medium rounded-full transition-colors ${
              enabled
                ? (isDark ? 'bg-white text-black' : 'bg-black text-white')
                : (isDark ? 'text-white/70 hover:text-white' : 'text-black/70 hover:text-black')
            }`}
          >
            {enabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const MobileWalletConnectPanel = ({
  loading,
  errorMessage,
  onRetry,
  onSwitchToDesktop,
  mode,
  panelTheme,
  walletTheme,
  guestTheme,
  useGlassmorphism = false,
  onGuestLogin,
  onEmailOptionToggle,
  keepSignedIn,
  onKeepSignedInChange,
  emailTheme,
  waitingForSignature,
  onOpenModal,
  walletConnectIconSrc,
  walletConnectIconAlt,
  emailIconSrc,
  emailIconAlt,
}: {
  loading: boolean;
  errorMessage: string | null;
  onRetry: () => Promise<string | null>;
  onSwitchToDesktop: () => void;
  mode: PanelMode;
  panelTheme: PanelTheme;
  walletTheme: Partial<WalletOptionTheme>;
  guestTheme: Partial<WalletOptionTheme>;
  useGlassmorphism?: boolean;
  onGuestLogin: () => Promise<void>;
  onEmailOptionToggle: () => void;
  keepSignedIn: boolean;
  onKeepSignedInChange: (checked: boolean) => void;
  emailTheme: Partial<WalletOptionTheme>;
  waitingForSignature: boolean;
  onOpenModal?: () => Promise<void>;
  walletConnectIconSrc: string;
  walletConnectIconAlt: string;
  emailIconSrc: string;
  emailIconAlt: string;
}) => {
  const textPrimary = mode === 'dark' ? 'text-white' : 'text-[#111111]';
  const textSecondary = mode === 'dark' ? 'text-white/70' : 'text-secondary/80';

  return (
    <WalletPanel theme={panelTheme} useGlassmorphism={useGlassmorphism} mode={mode}>
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <p className={`text-base font-semibold ${textPrimary}`}>Open your wallet</p>
          <p className={`text-sm ${textSecondary}`}>
            Tap your wallet below. After approving the connection, stay inside your wallet until you confirm the signature.
          </p>
          {waitingForSignature && (
            <div className="mt-3 rounded-xl border-2 border-[var(--accent)] bg-[var(--accent)]/10 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)] flex-shrink-0" />
                <p className="text-sm font-semibold text-foreground">
                  Signature pending in wallet
                </p>
              </div>
              <p className="text-xs text-muted leading-relaxed pl-6">
                Go back to your wallet app and approve the signature request. Stay in your wallet until confirmed.
              </p>
            </div>
          )}
        </div>

        {onOpenModal && (
          <WalletOption
            title="WalletConnect"
            subtitle="Nova, Subwallet, Talisman"
            iconSrc={walletConnectIconSrc}
            iconAlt={walletConnectIconAlt}
            onClick={onOpenModal}
            disabled={loading}
            theme={walletTheme}
            panelMode={mode}
            useGlassmorphism={useGlassmorphism}
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
          <WalletOption
            title="Email & password"
            subtitle="Sign in with your ChopDot account"
            iconSrc={emailIconSrc}
            iconAlt={emailIconAlt}
            onClick={onEmailOptionToggle}
            disabled={loading}
            useMarkForIcon
            theme={{
              ...walletTheme,
              ...emailTheme,
            }}
            panelMode={mode}
            useGlassmorphism={useGlassmorphism}
          />
        </div>

        <WalletOption
          title="Continue as guest"
          onClick={onGuestLogin}
          disabled={loading}
          variant="ghost"
          theme={guestTheme}
          panelMode={mode}
          useGlassmorphism={useGlassmorphism}
        />

        <label className={`flex items-center justify-between gap-3 rounded-xl border border-border/60 px-4 py-3 text-sm ${useGlassmorphism && mode === 'dark' ? 'text-white' : ''}`}>
          <span className={`font-semibold ${useGlassmorphism && mode === 'dark' ? 'text-white' : 'text-foreground'}`}>Keep me signed in</span>
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--accent)]"
            checked={keepSignedIn}
            onChange={(event) => onKeepSignedInChange(event.target.checked)}
            disabled={loading}
          />
        </label>

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
