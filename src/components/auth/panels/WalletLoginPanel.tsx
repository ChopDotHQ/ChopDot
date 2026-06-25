import { ReactNode, useEffect, useState } from 'react';
import { ChevronRight, Link2, Mail, ShieldCheck, UserRound, Wallet } from 'lucide-react';
import { WalletPanel, WalletOptionProps } from '../SignInComponents';
import type { PanelTheme, PanelMode, WalletOptionTheme } from '../SignInThemes';

type OptionGroup = 'social' | 'email' | 'wallet';

interface GroupedWalletOptionProps extends WalletOptionProps {
    id?: string;
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

const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 001 12c0 1.94.46 3.77 1.18 5.42l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

interface RowButtonProps {
    icon: ReactNode;
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    panelMode: PanelMode;
    useGlassmorphism: boolean;
    trailing?: ReactNode;
}

const RowButton = ({ icon, label, onClick, disabled, panelMode, useGlassmorphism, trailing }: RowButtonProps) => {
    const isDark = panelMode === 'dark';
    const bg = useGlassmorphism
        ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.65)')
        : (isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF');
    const hoverBg = useGlassmorphism
        ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.85)')
        : (isDark ? 'rgba(255,255,255,0.09)' : '#F7F7F7');
    const border = useGlassmorphism
        ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)')
        : (isDark ? 'rgba(255,255,255,0.08)' : '#E8E8E8');
    const textColour = isDark ? '#FAFAF9' : '#1C1917';
    const iconColour = isDark ? 'text-white/60' : 'text-neutral-400';

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="flex w-full items-center gap-2.5 rounded-xl px-4 py-3.5 border text-[15px] font-medium transition-all duration-150 active:scale-[0.99] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            style={{ background: bg, borderColor: border, color: textColour }}
            onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = bg; }}
        >
            <span className={`flex-shrink-0 ${iconColour}`}>{icon}</span>
            <span className="flex-1 text-left">{label}</span>
            {trailing && <span className={`flex-shrink-0 ${iconColour}`}>{trailing}</span>}
        </button>
    );
};

const EXTENSION_SOURCES: Record<string, string[]> = {
    polkadot: ['polkadot-js', 'polkadot{.js}'],
    subwallet: ['subwallet-js', 'subwallet'],
    talisman: ['talisman'],
};

const getInjectedWalletSources = (): Set<string> => {
    if (typeof window === 'undefined') return new Set();
    const injected = (window as typeof window & { injectedWeb3?: Record<string, unknown> }).injectedWeb3 ?? {};
    return new Set(Object.keys(injected).map((source) => source.toLowerCase()));
};

const getWalletReadiness = (option: GroupedWalletOptionProps, availableSources: Set<string>) => {
    if (option.id === 'walletconnect') {
        return {
            label: 'Mobile handoff',
            description: 'Use a mobile wallet and return after signing.',
            className: 'bg-[var(--accent)]/10 text-[var(--accent)]',
        };
    }

    const sources = option.id ? EXTENSION_SOURCES[option.id] : undefined;
    if (!sources) {
        return {
            label: 'Optional',
            description: 'You can continue without this.',
            className: 'bg-muted/30 text-secondary',
        };
    }

    const available = sources.some((source) => availableSources.has(source));
    return available
        ? {
            label: 'Available',
            description: 'Installed in this browser.',
            className: 'bg-[var(--success)]/10 text-[var(--success)]',
        }
        : {
            label: 'Setup needed',
            description: 'Install or unlock this wallet first.',
            className: 'bg-muted/30 text-secondary',
        };
};

interface EntryStepProps {
    icon: ReactNode;
    title: string;
    body: string;
    subtleText: string;
}

const EntryStep = ({ icon, title, body, subtleText }: EntryStepProps) => (
    <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
            {icon}
        </span>
        <span className="min-w-0">
            <span className="block text-[13px] font-semibold leading-tight">{title}</span>
            <span className={`block text-[12px] leading-snug ${subtleText}`}>{body}</span>
        </span>
    </div>
);

export const WalletLoginPanel = ({
    panelTheme,
    panelMode,
    useGlassmorphism,
    walletOptions,
    onGuestLogin,
    guestTheme: _guestTheme,
    loading,
    keepSignedIn,
    onKeepSignedInChange,
    headerContent,
    errorAlert,
    footerContent,
    mobileToggle,
    signatureWaitingBanner,
}: WalletLoginPanelProps) => {
    const [walletsExpanded, setWalletsExpanded] = useState(false);
    const [availableWalletSources, setAvailableWalletSources] = useState<Set<string>>(() => getInjectedWalletSources());
    const isDark = panelMode === 'dark';

    const socialOptions = walletOptions.filter((o) => o.group === 'social');
    const emailOptions = walletOptions.filter((o) => o.group === 'email');
    const walletOnlyOptions = walletOptions.filter((o) => o.group === 'wallet');

    const subtleText = isDark ? 'text-white/50' : 'text-neutral-500';

    useEffect(() => {
        setAvailableWalletSources(getInjectedWalletSources());
    }, [walletsExpanded]);

    return (
        <div className="flex-1 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-sm space-y-6">
                {headerContent}

                {signatureWaitingBanner}

                <WalletPanel theme={panelTheme} useGlassmorphism={useGlassmorphism} mode={panelMode}>
                    <div className="rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-4 py-3 space-y-2" data-testid="auth-entry-promise">
                        <p className="text-[15px] font-semibold">Start with the group record, not the wallet</p>
                        <p className={`text-[13px] leading-snug ${subtleText}`}>
                            Use guest mode to create pots, record payments, confirm receipt, and close rounds. Connect a wallet later only when the group wants saved receipts or payment records.
                        </p>
                    </div>

                    <div className="space-y-3" data-testid="auth-entry-steps">
                        <EntryStep
                            icon={<UserRound className="h-4 w-4" />}
                            title="Starting a pot?"
                            body="Continue as guest and set up the group record first."
                            subtleText={subtleText}
                        />
                        <EntryStep
                            icon={<Link2 className="h-4 w-4" />}
                            title="Joining someone else's pot?"
                            body="Open their link on your own phone or browser profile so your actions stay separate."
                            subtleText={subtleText}
                        />
                        <EntryStep
                            icon={<ShieldCheck className="h-4 w-4" />}
                            title="Need a wallet later?"
                            body="Connect one after the group flow makes sense."
                            subtleText={subtleText}
                        />
                    </div>

                    <div className="space-y-2">
                        {/* Email */}
                        {emailOptions.map((opt) => (
                            <RowButton
                                key={opt.title}
                                icon={<Mail className="h-5 w-5" />}
                                label={opt.title ?? 'Email'}
                                onClick={opt.onClick}
                                disabled={loading || opt.disabled}
                                panelMode={panelMode}
                                useGlassmorphism={useGlassmorphism}
                            />
                        ))}

                        {/* Wallet accordion */}
                        {walletOnlyOptions.length > 0 && (
                            <div>
                                <RowButton
                                    icon={<Wallet className="h-5 w-5" />}
                                    label="Sign in with wallets"
                                    onClick={() => setWalletsExpanded((prev) => !prev)}
                                    panelMode={panelMode}
                                    useGlassmorphism={useGlassmorphism}
                                    trailing={
                                        <ChevronRight
                                            className={`h-4 w-4 transition-transform duration-200 ${walletsExpanded ? 'rotate-90' : ''}`}
                                        />
                                    }
                                />

                                {walletsExpanded && (
                                    <div
                                        className={`mt-1.5 ml-2 pl-3 space-y-1 border-l-2 ${
                                            useGlassmorphism
                                                ? (isDark ? 'border-white/10' : 'border-black/6')
                                                : (isDark ? 'border-white/8' : 'border-neutral-200')
                                        }`}
                                        data-testid="auth-wallet-options"
                                    >
                                        <p className={`px-1 pb-1 text-[12px] leading-snug ${subtleText}`}>
                                            Wallets are optional for coordination. Use them later for saved receipts or payment records.
                                        </p>
                                        {walletOnlyOptions.map((option, index) => {
                                            const textColour = isDark ? '#FAFAF9' : '#1C1917';
                                            const bg = useGlassmorphism
                                                ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.45)')
                                                : (isDark ? 'rgba(255,255,255,0.03)' : '#F9F9F9');
                                            const hoverBg = useGlassmorphism
                                                ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.7)')
                                                : (isDark ? 'rgba(255,255,255,0.07)' : '#F0F0F0');
                                            const readiness = getWalletReadiness(option, availableWalletSources);

                                            return (
                                                <button
                                                    key={(option.title ?? '') + index}
                                                    type="button"
                                                    onClick={option.onClick}
                                                    disabled={loading || option.disabled}
                                                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150 active:scale-[0.99] disabled:opacity-50 focus:outline-none"
                                                    style={{ background: bg, color: textColour }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.background = bg; }}
                                                >
                                                    {option.iconSrc ? (
                                                        <img src={option.iconSrc} alt="" className="h-5 w-5 rounded object-contain flex-shrink-0" style={{ maxHeight: 20, maxWidth: 20 }} draggable={false} />
                                                    ) : (
                                                        <Wallet className="h-5 w-5 flex-shrink-0 opacity-40" />
                                                    )}
                                                    <span className="flex-1 text-left">
                                                        <span className="block">{option.title ?? ''}</span>
                                                        <span className={`block text-[11px] leading-snug ${subtleText}`}>
                                                            {readiness.description}
                                                        </span>
                                                    </span>
                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${readiness.className}`}>
                                                        {readiness.label}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Google */}
                        {socialOptions.map((opt) => (
                            <RowButton
                                key={opt.title}
                                icon={<GoogleIcon />}
                                label={opt.title ?? 'Google'}
                                onClick={opt.onClick}
                                disabled={loading || opt.disabled}
                                panelMode={panelMode}
                                useGlassmorphism={useGlassmorphism}
                            />
                        ))}
                    </div>

                    {/* Guest */}
                    <RowButton
                        icon={<UserRound className="h-5 w-5" />}
                        label="Continue as guest"
                        onClick={onGuestLogin}
                        disabled={loading}
                        panelMode={panelMode}
                        useGlassmorphism={useGlassmorphism}
                    />
                    <p className={`text-[12px] leading-snug ${subtleText}`} data-testid="auth-guest-boundary">
                        Guest mode is enough for private coordination on this device. Wallets are optional for saved receipts and payment records.
                    </p>

                    <div
                        className="rounded-2xl border border-dashed px-4 py-3 space-y-2"
                        style={{
                            borderColor: useGlassmorphism
                                ? (isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)')
                                : (isDark ? 'rgba(255,255,255,0.12)' : '#E8E8E8'),
                        }}
                        data-testid="auth-friend-pilot-guide"
                    >
                        <p className="text-[13px] font-semibold">Trying ChopDot with friends?</p>
                        <div className={`space-y-1 text-[12px] leading-snug ${subtleText}`}>
                            <p>Everyone starts from their own device, takes only their own action, and uses the receipt to see what the group agreed happened.</p>
                        </div>
                    </div>

                    {/* Remember me */}
                    <label className={`flex items-center justify-end gap-2 text-[13px] cursor-pointer pt-0.5 ${subtleText}`}>
                        <span>Remember me</span>
                        <input
                            type="checkbox"
                            className="h-3.5 w-3.5 accent-[var(--accent)] cursor-pointer rounded"
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
