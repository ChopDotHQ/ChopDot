import type { FormEvent } from 'react';
import type { PanelMode } from '../SignInThemes';

export interface EmailCredentials {
    email: string;
    password?: string;
}

interface EmailLoginPanelProps {
    // Data
    email: string;
    password?: string; // Optional if we are doing something else, but here it's login
    rememberEmail: boolean;
    loading: boolean;
    panelMode: PanelMode;

    // Handlers
    onEmailChange: (value: string) => void;
    onPasswordChange: (value: string) => void;
    onRememberEmailChange: (checked: boolean) => void;
    onSubmit: (e: FormEvent<HTMLFormElement>) => void;
    onForgotPassword: () => void;
    onCancel: () => void;
}

export const EmailLoginPanel = ({
    email,
    password = '',
    rememberEmail,
    loading,
    panelMode,
    onEmailChange,
    onPasswordChange,
    onRememberEmailChange,
    onSubmit,
    onForgotPassword,
    onCancel,
}: EmailLoginPanelProps) => {
    // Style Logic
    const containerClasses =
        panelMode === 'dark'
            ? 'bg-black/40 border-white/10'
            : 'bg-white/60 border-black/5';

    const inputClasses =
        panelMode === 'dark'
            ? 'bg-white/10 border-white/20 text-white placeholder:text-white/60'
            : 'bg-white border-black/10 text-[#0f0f11] placeholder:text-secondary/70';

    const labelClasses = panelMode === 'dark' ? 'text-white/80' : 'text-[#111111]';

    return (
        <form
            onSubmit={onSubmit}
            className={`space-y-3 rounded-2xl border px-4 py-4 ${containerClasses}`}
        >
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
                    value={email}
                    onChange={(event) => onEmailChange(event.target.value)}
                    disabled={loading}
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
                    value={password}
                    onChange={(event) => onPasswordChange(event.target.value)}
                    disabled={loading}
                />
            </div>
            <div className="space-y-2">
                <label
                    className={`flex items-center gap-2 text-xs ${panelMode === 'dark' ? 'text-white/70' : 'text-secondary/80'}`}
                >
                    <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-[var(--accent)]"
                        checked={rememberEmail}
                        onChange={(event) => onRememberEmailChange(event.target.checked)}
                        disabled={loading}
                    />
                    Remember this email on this device
                </label>
                <p className={`text-[11px] ${panelMode === 'dark' ? 'text-white/60' : 'text-secondary/70'}`}>
                    Passwords are saved by your browser or device password manager.
                </p>
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
                    onClick={onForgotPassword}
                    className="w-full rounded-xl border border-border/0 px-4 py-2 text-sm font-semibold text-[var(--accent)] transition-colors hover:bg-muted/10 disabled:opacity-60"
                    disabled={loading}
                >
                    Forgot password?
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="w-full rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted/10"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
};
