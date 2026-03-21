import type { FormEvent, InputHTMLAttributes } from 'react';
import { ChopDotMark, WalletPanel } from '../SignInComponents';
import { AuthFooter } from '../AuthFooter';
import type { PanelMode, LoginVariant } from '../../auth/hooks/useThemeHandler';
import {
    defaultPanelTheme,
    frostedPanelThemes,
    polkadotSecondAgePanelThemes,
} from '../../auth/SignInThemes';

interface SignupInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    panelMode: PanelMode;
    inputClasses: string;
}

const SignupInput = ({ label, panelMode, inputClasses, className, ...props }: SignupInputProps) => (
    <div className="space-y-2">
        <label htmlFor={props.id} className={`text-sm font-semibold ${panelMode === 'dark' ? 'text-white/70' : 'text-secondary/80'}`}>
            {label}
        </label>
        <input
            {...props}
            className={`w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 ${inputClasses} ${className || ''}`}
        />
    </div>
);

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

    const handleBackToLogin = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent potential form submission if button type is ambiguous
        onBackToLogin();
    };

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

                        <SignupInput
                            id="signup-email"
                            label="Email"
                            type="email"
                            autoComplete="email"
                            required
                            value={signupForm.email}
                            onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
                            disabled={loading}
                            panelMode={panelMode}
                            inputClasses={inputClasses}
                        />

                        <SignupInput
                            id="signup-password"
                            label="Password"
                            type="password"
                            autoComplete="new-password"
                            required
                            value={signupForm.password}
                            onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                            disabled={loading}
                            panelMode={panelMode}
                            inputClasses={inputClasses}
                        />

                        <SignupInput
                            id="signup-confirm-password"
                            label="Confirm Password"
                            type="password"
                            autoComplete="new-password"
                            required
                            value={signupForm.confirmPassword}
                            onChange={(e) => setSignupForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            disabled={loading}
                            panelMode={panelMode}
                            inputClasses={inputClasses}
                        />

                        <SignupInput
                            id="signup-username"
                            label="Username (optional)"
                            type="text"
                            autoComplete="username"
                            value={signupForm.username}
                            onChange={(e) => setSignupForm(prev => ({ ...prev, username: e.target.value }))}
                            disabled={loading}
                            panelMode={panelMode}
                            inputClasses={inputClasses}
                        />

                        <label className="flex items-center gap-2 text-xs text-muted/80 cursor-pointer">
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
                                I agree to the <a href="/terms" target="_blank" rel="noreferrer" className={`underline hover:text-[var(--accent)] transition-colors ${panelMode === 'dark' ? 'text-white' : 'text-foreground'}`}>Terms of Service</a> and <a href="/privacy" target="_blank" rel="noreferrer" className={`underline hover:text-[var(--accent)] transition-colors ${panelMode === 'dark' ? 'text-white' : 'text-foreground'}`}>Privacy Policy</a>
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

                        <div className="pt-2 space-y-3">
                            <button
                                type="submit"
                                className="w-full rounded-xl bg-[var(--accent)] border border-transparent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                                disabled={loading}
                            >
                                {loading ? 'Creating account…' : 'Create account'}
                            </button>
                            <button
                                type="button"
                                onClick={handleBackToLogin}
                                className="w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-white/5 disabled:opacity-60"
                                style={{ color: panelMode === 'dark' ? 'white' : 'inherit' }}
                            >
                                Back to login
                            </button>
                        </div>
                    </form>
                </WalletPanel>
                <AuthFooter panelMode={panelMode} loginVariant={loginVariant} />
            </div>
        </div>
    );
};
