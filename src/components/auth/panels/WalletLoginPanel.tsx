import { ReactNode } from 'react';
import { WalletPanel, WalletOption, WalletOptionProps } from '../SignInComponents';
import type { PanelTheme, PanelMode, WalletOptionTheme } from '../SignInThemes';

export interface WalletLoginPanelProps {
    // Appearance
    panelTheme: PanelTheme;
    panelMode: PanelMode;
    useGlassmorphism: boolean;

    // Data
    walletOptions: WalletOptionProps[];

    // Guest Option
    onGuestLogin: () => void;
    guestTheme: Partial<WalletOptionTheme>;
    loading: boolean;

    // Persistence
    keepSignedIn: boolean;
    onKeepSignedInChange: (checked: boolean) => void;

    // Slots
    headerContent?: ReactNode;
    errorAlert?: ReactNode;
    footerContent?: ReactNode;
    mobileToggle?: ReactNode;
    signatureWaitingBanner?: ReactNode;
}

export const WalletLoginPanel = ({
    panelTheme,
    panelMode,
    useGlassmorphism,
    walletOptions,
    onGuestLogin,
    guestTheme,
    loading,
    keepSignedIn,
    onKeepSignedInChange,
    headerContent,
    errorAlert,
    footerContent,
    mobileToggle,
    signatureWaitingBanner,
}: WalletLoginPanelProps) => {
    return (
        <div className="flex-1 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-sm space-y-6">
                {headerContent}

                {signatureWaitingBanner}

                <WalletPanel theme={panelTheme} useGlassmorphism={useGlassmorphism} mode={panelMode}>
                    <div className="space-y-3">
                        {walletOptions.map((option, index) => (
                            <div key={option.title + index} className="space-y-3">
                                <WalletOption
                                    {...option}
                                    disabled={loading || option.disabled}
                                />
                            </div>
                        ))}
                    </div>

                    <WalletOption
                        title="Continue as guest"
                        onClick={onGuestLogin}
                        disabled={loading}
                        variant="ghost"
                        theme={guestTheme}
                        panelMode={panelMode}
                        useGlassmorphism={useGlassmorphism}
                    />

                    <label className={`flex items-center justify-between gap-3 rounded-xl border border-border/60 px-4 py-3 text-sm ${useGlassmorphism && panelMode === 'dark' ? 'text-white' : ''}`}>
                        <span className={`font-semibold ${useGlassmorphism && panelMode === 'dark' ? 'text-white' : 'text-foreground'}`}>Keep me signed in</span>
                        <input
                            type="checkbox"
                            className="h-4 w-4 accent-[var(--accent)]"
                            checked={keepSignedIn}
                            onChange={(event) => onKeepSignedInChange(event.target.checked)}
                            disabled={loading}
                        />
                    </label>

                    {errorAlert}
                </WalletPanel>

                {footerContent}
                {mobileToggle}
            </div>
        </div>
    );
};
