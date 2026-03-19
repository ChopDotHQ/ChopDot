import { CSSProperties, type ReactNode, type MouseEvent } from 'react';
import { Loader2 } from 'lucide-react';
import type { PanelMode, PanelTheme, WalletOptionTheme } from './SignInThemes';
import { defaultPanelTheme, defaultOptionTheme, ghostOptionTheme } from './SignInThemes';
import { ChopDotMark } from './ChopDotMark';

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
    style={useGrayscale ? { filter: 'grayscale(75%) contrast(0.9) brightness(0.95)', opacity: 0.9 } : undefined}
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
        style={{ backdropFilter: 'blur(16px) saturate(120%)', WebkitBackdropFilter: 'blur(16px) saturate(120%)' }}
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
  const variantClasses = isGhost ? 'justify-center text-sm font-semibold' : 'text-left';
  const contentAlignment = isGhost && !iconSrc ? 'text-center' : 'text-left';
  const resolvedTheme = { ...(isGhost ? ghostOptionTheme : defaultOptionTheme), ...theme };
  const buttonStyle: CSSProperties = {
    background: resolvedTheme.background,
    borderColor: resolvedTheme.borderColor,
    boxShadow: resolvedTheme.shadow,
  };
  const titleStyle: CSSProperties = resolvedTheme.titleColor ? { color: resolvedTheme.titleColor } : {};
  const subtitleStyle: CSSProperties = resolvedTheme.subtitleColor ? { color: resolvedTheme.subtitleColor } : {};
  const borderClass = resolvedTheme.borderStyle === 'none' ? 'border-0' : 'border';
  const borderStyleClass = resolvedTheme.borderStyle === 'dashed' ? 'border-dashed' : '';
  const handleMouseEnter = !isGhost && resolvedTheme.hoverBackground
    ? (event: MouseEvent<HTMLButtonElement>) => { event.currentTarget.style.background = resolvedTheme.hoverBackground as string; }
    : undefined;
  const handleMouseLeave = !isGhost && resolvedTheme.hoverBackground
    ? (event: MouseEvent<HTMLButtonElement>) => { event.currentTarget.style.background = resolvedTheme.background as string; }
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
      onClick={(event) => { event.stopPropagation(); onClick?.(event); }}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} ${borderClass} ${borderStyleClass} ${glassClass} transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]`}
      style={{
        ...buttonStyle,
        ...(shouldUseGlassmorphism && { backdropFilter: 'blur(8px) saturate(150%)', WebkitBackdropFilter: 'blur(8px) saturate(150%)' }),
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {iconSrc && (
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border p-1.5"
          style={{ background: resolvedTheme.iconBackground, borderColor: resolvedTheme.iconBorderColor, boxShadow: resolvedTheme.iconShadow }}
        >
          {shouldUseGlassmorphism && useMarkForIcon ? (
            <div className="h-7 w-7 flex items-center justify-center">
              <ChopDotMark size={28} useWhite={panelMode === 'dark'} useBlackAndWhite={panelMode === 'light'} />
            </div>
          ) : (
            <div className="h-9 w-9 flex items-center justify-center rounded-full overflow-hidden">
              <WalletLogo src={iconSrc} alt={iconAlt ?? ''} className="h-full w-full object-cover" useGrayscale={shouldUseGlassmorphism && !useMarkForIcon} />
            </div>
          )}
        </div>
      )}
      <div className={`flex-1 ${contentAlignment} leading-tight`}>
        <p
          className={`text-base ${isGhost ? 'font-semibold' : 'font-medium'}`}
          style={{ color: resolvedTheme.titleColor || (title === 'Polkadot.js' ? '#FAFAF9' : (panelMode === 'dark' ? '#FAFAF9' : '#1C1917')), ...titleStyle }}
        >
          {title}
        </p>
        {subtitle && (
          <p
            className="text-sm"
            style={{ color: resolvedTheme.subtitleColor || (title === 'Polkadot.js' ? 'rgba(250, 250, 249, 0.95)' : (panelMode === 'dark' ? 'rgba(250, 250, 249, 0.85)' : '#57534E')), ...subtitleStyle }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {loading && <Loader2 className="h-5 w-5 animate-spin text-white/80" />}
    </button>
  );
};
