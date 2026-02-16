import type { FormEvent } from 'react';
import { ChopDotMark, WalletPanel } from '../SignInComponents';
import { AuthFooter } from '../AuthFooter';
import type { PanelMode, LoginVariant } from '../../auth/hooks/useThemeHandler';
import {

    defaultPanelTheme,
    frostedPanelThemes,
    polkadotSecondAgePanelThemes,
} from '../../auth/SignInThemes';

interface SignupPanelProps {
    // State
    signupForm: {
        email: string;
        password: string;
        confirmPassword: string;
        username: string;
        acceptTerms: boolean;
    };
    signupFeedback: {
        status: 'idle' | 'success' | 'error';
        message?: string;
    };
    loading: boolean;

    // Handlers
    setSignupForm: React.Dispatch<React.SetStateAction<{
        email: string;
        password: string;
        confirmPassword: string;
        username: string;
        acceptTerms: boolean;
    }>>;
    onSignupSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
    onBackToLogin: () => void;

    // Theme
    panelMode: PanelMode;
    loginVariant: LoginVariant;
}

export const SignupPanel = ({
    signupForm,
    signupFeedback,
    loading,
    setSignupForm,
    onSignupSubmit,
    onBackToLogin,
    panelMode,
    loginVariant,
}: SignupPanelProps) => {
    const useGlassmorphism = loginVariant === 'polkadot-second-age-glass';

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
                    <form onSubmit={onSignupSubmit} className="space-y-3">
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
                                className={`rounded-xl border px-3 py-2 text-sm ${signupFeedback.status === 'error'
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
                            onClick={onBackToLogin}
                            className="w-full rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted/10"
                        >
                            Back to login
                        </button>
                    </form>
                </WalletPanel>
                <AuthFooter panelMode={panelMode} loginVariant={loginVariant} />
            </div>
        </div>
    );
};
