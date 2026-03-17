import { ReactNode } from 'react';
import { WalletPanel, WalletOption, WalletOptionProps } from '../SignInComponents';
import type { PanelTheme, PanelMode, WalletOptionTheme } from '../SignInThemes';

type OptionGroup = 'social' | 'email' | 'wallet';

interface GroupedWalletOptionProps extends WalletOptionProps {
    group?: OptionGroup;
}

export interface WalletLoginPanelProps {
    panelTheme: PanelTheme;
    panelMode: PanelMode;
    useGlassmorphism: boolean;
    walletOptions: GroupedWalletOptionProps[];
    onGuestLogin: () => void;
    guestTheme: Partial<WalletOptionTheme>;
    loading: boolean;
    keepSignedIn: boolean;
    onKeepSignedInChange: (checked: boolean) => void;
    headerContent?: ReactNode;
    errorAlert?: ReactNode;
    footerContent?: ReactNode;
    mobileToggle?: ReactNode;
    signatureWaitingBanner?: ReactNode;
}

const GroupDivider = ({ label, panelMode, useGlassmorphism }: { label: string; panelMode: PanelMode; useGlassmorphism: boolean }) => {
    const textClass = useGlassmorphism
        ? (panelMode === 'dark' ? 'text-white/40' : 'text-black/30')
        : (panelMode === 'dark' ? 'text-white/30' : 'text-muted-foreground/50');
    const lineClass = useGlassmorphism
        ? (panelMode === 'dark' ? 'border-white/10' : 'border-black/10')
        : 'border-border/40';

    return (
        <div className="flex items-center gap-3 py-1">
            <div className={`flex-1 border-t ${lineClass}`} />
            <span className={`text-xs font-medium uppercase tracking-wider ${textClass}`}>{label}</span>
            <div className={`flex-1 border-t ${lineClass}`} />
        </div>
    );
};

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
    const socialOptions = walletOptions.filter((o) => o.group === 'social');
    const emailOptions = walletOptions.filter((o) => o.group === 'email');
    const walletOnlyOptions = walletOptions.filter((o) => o.group === 'wallet');
    const ungrouped = walletOptions.filter((o) => !o.group);

    const renderOptions = (options: GroupedWalletOptionProps[]) =>
        options.map((option, index) => (
            <WalletOption
                key={option.title + index}
                {...option}
                disabled={loading || option.disabled}
            />
        ));

    return (
        <div className="flex-1 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-sm space-y-6">
                {headerContent}

                {signatureWaitingBanner}

                <WalletPanel theme={panelTheme} useGlassmorphism={useGlassmorphism} mode={panelMode}>
                    <div className="space-y-3">
                        {socialOptions.length > 0 && renderOptions(socialOptions)}

                        {emailOptions.length > 0 && (
                            <>
                                <GroupDivider label="or" panelMode={panelMode} useGlassmorphism={useGlassmorphism} />
                                {renderOptions(emailOptions)}
                            </>
                        )}

                        {walletOnlyOptions.length > 0 && (
                            <>
                                <GroupDivider label="or connect a wallet" panelMode={panelMode} useGlassmorphism={useGlassmorphism} />
                                {renderOptions(walletOnlyOptions)}
                            </>
                        )}

                        {ungrouped.length > 0 && renderOptions(ungrouped)}
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
