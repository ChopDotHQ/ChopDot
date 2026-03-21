import { Loader2 } from 'lucide-react';
import type { PanelMode, PanelTheme, WalletOptionTheme } from './SignInThemes';
import { WalletPanel, WalletOption } from './WalletOption';

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
                <p className="text-sm font-semibold text-foreground">Signature pending in wallet</p>
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
            <button type="button" onClick={onRetry} className="text-xs font-semibold underline underline-offset-2" disabled={loading}>
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
            theme={{ ...walletTheme, ...emailTheme }}
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
          <button type="button" onClick={onSwitchToDesktop} className="text-xs font-semibold text-[var(--accent)] underline underline-offset-4">
            Switch to desktop wallet view
          </button>
        </div>
      </div>
    </WalletPanel>
  );
};
