import { useRef, useEffect } from 'react';
import { AlertCircle, ChevronRight, Loader2, Wallet } from 'lucide-react';
import { useAccount } from '../../contexts/AccountContext';
import { triggerHaptic } from '../../utils/haptics';
import { ChopDotMark } from '../auth/ChopDotMark';
import { EmailLoginDrawer } from '../auth/EmailLoginDrawer';
import { WalletConnectQROverlay } from '../auth/WalletConnectQROverlay';
import { WalletLoginPanel } from '../auth/panels/WalletLoginPanel';
import { SignupPanel } from '../auth/panels/SignupPanel';
import { AuthFooter } from '../auth/AuthFooter';
import { BottomSheet } from '../BottomSheet';
import { useLoginState } from '../auth/hooks/useLoginState';
import { useWalletAuth } from '../auth/hooks/useWalletAuth';
import { useThemeHandler } from '../auth/hooks/useThemeHandler';
import { useEmailAuth } from '../auth/hooks/useEmailAuth';
import { useSignInHandlers } from '../auth/hooks/useSignInHandlers';
import { getBaseWalletOptionConfigs, type OptionGroup } from '../auth/wallet-options';
import {
  type WalletOptionTheme,
  emailOptionTheme,
  defaultPanelTheme,
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
    analytics?: { track?: (event: string, payload?: Record<string, unknown>) => void };
  }
}

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

const trackEvent = (name: string, payload?: Record<string, unknown>) => {
  try { window?.analytics?.track?.(name, payload); } catch { /* noop */ }
};

export function SignInScreen({ onLoginSuccess }: LoginScreenProps) {
  const account = useAccount();

  const {
    loading, setLoading,
    error, setError,
    authPanelView, setAuthPanelView,
    showEmailLogin, setShowEmailLogin,
    device, isMobileWalletFlow, enableWcModal, openEmailLoginDrawer,
  } = useLoginState();

  const { panelMode, loginVariant, backgroundIndex } = useThemeHandler();

  const {
    showWalletConnectQR, setShowWalletConnectQR,
    walletConnectQRCode, setWalletConnectQRCode,
    setIsWaitingForWalletConnect: _setIsWaitingForWalletConnect,
    isWaitingForSignature,
    getWalletAuthMessage,
    startWalletConnectSession: startWalletConnectSessionHook,
  } = useWalletAuth({ setLoading, setError, onLoginSuccess, isMobileWalletFlow, enableWcModal });

  const {
    emailCredentials, setEmailCredentials,
    keepSignedIn, handleKeepSignedInChange,
    rememberEmail, setRememberEmail,
    handleEmailLogin, handlePasswordRecovery,
    signupForm, setSignupForm,
    signupFeedback, setSignupFeedback,
    handleSignupSubmit,
  } = useEmailAuth({ setLoading, setError, onLoginSuccess, setShowEmailLogin });

  const {
    handleOAuthLogin,
    handleGuestLogin,
    handleWalletLogin,
    loginWithExtension,
    pendingExtensionAccounts,
    pendingExtensionWalletName,
    completeExtensionLogin,
    cancelExtensionAccountSelection,
    handleWalletConnectModal,
  } = useSignInHandlers({ setLoading, setError, onLoginSuccess, getWalletAuthMessage });

  const hasTrackedMobilePanelRef = useRef(false);

  useEffect(() => {
    if (authPanelView === 'login') {
      setSignupForm({ email: '', password: '', confirmPassword: '', username: '', acceptTerms: false });
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

  const startWalletConnectSession = async ({ openQrModal = true }: { openQrModal?: boolean } = {}): Promise<string | null> =>
    startWalletConnectSessionHook(handleWalletConnectModal, openQrModal);

  const buildHandlerMap = (): Record<string, (e?: React.MouseEvent) => void> => ({
    email: (e?: React.MouseEvent) => { e?.stopPropagation(); e?.preventDefault(); openEmailLoginDrawer('desktop-option'); },
    polkadot: () => handleWalletLogin('polkadot'),
    subwallet: () => loginWithExtension({ sources: ['subwallet-js', 'subwallet'], walletDisplayName: 'SubWallet', notFoundMessage: 'SubWallet extension not found. Please install SubWallet browser extension.' }),
    talisman: () => loginWithExtension({ sources: ['talisman'], walletDisplayName: 'Talisman', notFoundMessage: 'Talisman extension not found. Please install Talisman browser extension.' }),
    walletconnect: () => startWalletConnectSession({ openQrModal: true }),
    google: () => handleOAuthLogin('google'),
  });

  const renderErrorAlert = () =>
    error ? (
      <div className="flex items-start gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2">
        <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
        <p className="text-sm text-destructive leading-snug">{error}</p>
      </div>
    ) : null;

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

    const resolvedPanelTheme = useGlassmorphism
      ? (polkadotSecondAgePanelThemes[panelMode] ?? defaultPanelTheme)
      : (frostedPanelThemes[panelMode] ?? defaultPanelTheme);
    const variationWalletTheme = useGlassmorphism ? polkadotSecondAgeWalletThemes[panelMode] : frostedWalletThemes[panelMode];
    const variationGuestTheme = useGlassmorphism ? polkadotSecondAgeGuestThemes[panelMode] : frostedGuestThemes[panelMode];

    const handlerMap = buildHandlerMap();

    const desktopWalletOptions = getBaseWalletOptionConfigs().map((option) => {
      let overrideTheme: Partial<WalletOptionTheme> = {};
      if (useGlassmorphism && option.id === 'email') {
        overrideTheme = getPolkadotSecondAgeEmailOverride(panelMode);
      } else {
        overrideTheme = useGlassmorphism
          ? (polkadotSecondAgeWalletOverrides[option.id] ?? frostedWalletOverrides[option.id] ?? {})
          : (frostedWalletOverrides[option.id] ?? {});
      }
      const finalTheme: Partial<WalletOptionTheme> = {
        ...variationWalletTheme,
        ...(option.themeOverride ?? (option.id === 'email' ? emailOptionTheme : {})),
        ...overrideTheme,
      };

      return {
        title: option.title,
        subtitle: option.subtitle,
        iconSrc: option.icon.src,
        iconAlt: option.icon.alt,
        onClick: handlerMap[option.id] ?? (() => {}),
        loading: option.showsLoadingIndicator && loading,
        theme: finalTheme,
        useMarkForIcon: option.id === 'email',
        panelMode,
        useGlassmorphism,
        group: option.group as OptionGroup,
      };
    });

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
        headerContent={
          <div className="flex flex-col items-center gap-3 text-center">
            <ChopDotMark size={52} useWhite={useGlassmorphism && panelMode === 'dark'} useBlackAndWhite={useGlassmorphism && panelMode === 'light'} />
            <p
              className={useGlassmorphism ? (panelMode === 'dark' ? 'text-sm font-medium text-white/90' : 'text-sm font-medium') : (panelMode === 'dark' ? 'text-sm font-medium text-white/90' : 'text-sm font-medium text-secondary/80')}
              style={useGlassmorphism ? (panelMode === 'dark' ? { color: 'rgba(255, 255, 255, 0.9)' } : { color: '#1C1917' }) : undefined}
            >
              Sign in to ChopDot
            </p>
          </div>
        }
        errorAlert={renderErrorAlert()}
        footerContent={<AuthFooter panelMode={panelMode} loginVariant={loginVariant} />}
        mobileToggle={undefined}
        signatureWaitingBanner={isWaitingForSignature ? (
          <div className="rounded-2xl border-2 border-[var(--accent)] bg-[var(--accent)]/15 p-5 space-y-3 shadow-lg animate-pulse">
            <div className="flex items-start gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)] flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="text-lg font-bold text-foreground">Signature Approval Required</p>
                <p className="text-sm text-muted leading-relaxed">
                  <strong>Action needed:</strong> Go back to your wallet app and approve the signature request.
                </p>
                <div className="flex items-center gap-2 text-xs text-muted/80">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Waiting for your approval...</span>
                </div>
              </div>
            </div>
          </div>
        ) : undefined}
      />
    );
  };

  const useGlassmorphism = loginVariant === 'polkadot-second-age-glass';
  const containerTextColor = useGlassmorphism ? 'text-[#1C1917]' : (panelMode === 'dark' ? 'text-white' : 'text-[#0f0f11]');

  return (
    <div
      className={`flex min-h-screen w-full flex-col overflow-auto transition-colors duration-200 ${containerTextColor}`}
      style={{
        minHeight: '100dvh',
        ...(useGlassmorphism
          ? getPolkadotSecondAgeSceneBackgroundStyles(panelMode, backgroundIndex)
          : (sceneBackgroundStyles[panelMode] ?? sceneBackgroundStyles.dark)),
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {renderPanelLayout()}

      <EmailLoginDrawer
        open={showEmailLogin && authPanelView === 'login'}
        onOpenChange={(open) => { setShowEmailLogin(open); if (!open) setEmailCredentials({ email: rememberEmail ? emailCredentials.email : '', password: '' }); setError(null); }}
        isMobile={device.isMobile}
        email={emailCredentials.email} password={emailCredentials.password}
        rememberEmail={rememberEmail} loading={loading} panelMode={panelMode} error={error}
        onEmailChange={(v) => setEmailCredentials((prev) => ({ ...prev, email: v }))}
        onPasswordChange={(v) => setEmailCredentials((prev) => ({ ...prev, password: v }))}
        onRememberEmailChange={setRememberEmail} onSubmit={handleEmailLogin} onForgotPassword={handlePasswordRecovery}
        onCancel={() => { setShowEmailLogin(false); setEmailCredentials({ email: rememberEmail ? emailCredentials.email : '', password: '' }); }}
        onCreateAccount={() => { triggerHaptic('light'); setShowEmailLogin(false); setAuthPanelView('signup'); }}
      />

      {showWalletConnectQR && walletConnectQRCode && (
        <WalletConnectQROverlay
          qrCode={walletConnectQRCode}
          isConnecting={account.status === 'connecting'}
          onClose={() => { setShowWalletConnectQR(false); setWalletConnectQRCode(null); }}
        />
      )}

      <BottomSheet
        isOpen={pendingExtensionAccounts.length > 0}
        onClose={cancelExtensionAccountSelection}
        title="Choose account"
        maxWidth="520px"
      >
        <div className="mx-auto w-full max-w-md space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Select an account</h3>
            <p className="text-sm text-secondary">
              {pendingExtensionWalletName
                ? `Choose which ${pendingExtensionWalletName} account to sign in with.`
                : 'Choose which account to sign in with.'}
            </p>
          </div>

          <div className="space-y-3">
            {pendingExtensionAccounts.map((accountOption) => (
              <button
                key={accountOption.address}
                type="button"
                onClick={() => void completeExtensionLogin(accountOption)}
                disabled={loading}
                className="w-full rounded-2xl border border-border bg-background px-4 py-4 text-left transition-all duration-150 hover:bg-muted/40 active:scale-[0.99] disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-muted/60 p-3">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-medium truncate">
                      {accountOption.name || 'Unnamed account'}
                    </div>
                    <p className="mt-1 font-mono text-sm text-secondary">
                      {accountOption.address.slice(0, 12)}...{accountOption.address.slice(-10)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-secondary" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
