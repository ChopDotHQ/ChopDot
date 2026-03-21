import { useState, useEffect, type FormEvent } from 'react';
import { toast } from 'sonner';
import { getSupabase } from '../../../utils/supabase-client';
import { getAuthPersistence, setAuthPersistence } from '../../../utils/authPersistence';
import { getRememberedEmail, setRememberedEmail as saveRememberedEmail } from '../../../utils/rememberedEmail';
import { triggerHaptic } from '../../../utils/haptics';
import { useAuth } from '../../../contexts/AuthContext';

interface UseEmailAuthProps {
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    onLoginSuccess?: () => void;
    setShowEmailLogin: (show: boolean) => void;
}

export const useEmailAuth = ({
    setLoading,
    setError,
    onLoginSuccess,
    setShowEmailLogin,
}: UseEmailAuthProps) => {
    const { login } = useAuth();

    // Email form state
    const initialRememberedEmail = getRememberedEmail();
    const [emailCredentials, setEmailCredentials] = useState({ email: initialRememberedEmail, password: '' });
    const [keepSignedIn, setKeepSignedIn] = useState(() => getAuthPersistence() === 'local');
    const [rememberEmail, setRememberEmail] = useState(Boolean(initialRememberedEmail));

    // Signup form state
    const [signupForm, setSignupForm] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        username: '',
        acceptTerms: false,
    });
    const [signupFeedback, setSignupFeedback] = useState<{ status: 'idle' | 'success' | 'error'; message?: string }>({
        status: 'idle',
    });

    // Effect to update remembered email storage
    useEffect(() => {
        saveRememberedEmail(emailCredentials.email.trim(), rememberEmail);
    }, [emailCredentials.email, rememberEmail]);

    const handleEmailLogin = async (event?: FormEvent<HTMLFormElement>) => {
        event?.preventDefault();
        setLoading(false); // Reset in case switching
        const trimmedEmail = emailCredentials.email.trim();

        if (!trimmedEmail || !emailCredentials.password) {
            setError('Please enter both email and password.');
            triggerHaptic('error');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            await login('email', {
                type: 'email',
                email: trimmedEmail,
                password: emailCredentials.password,
            });
            saveRememberedEmail(trimmedEmail, rememberEmail);
            triggerHaptic('medium');
            setShowEmailLogin(false);
            setEmailCredentials({ email: rememberEmail ? trimmedEmail : '', password: '' });
            onLoginSuccess?.();
        } catch (err: any) {
            console.error('Email login failed:', err);
            setError(err.message || 'Failed to login with email and password');
            triggerHaptic('error');
        } finally {
            setLoading(false);
        }
    };

    const handleKeepSignedInChange = (nextKeepSignedIn: boolean) => {
        setKeepSignedIn(nextKeepSignedIn);
        setAuthPersistence(nextKeepSignedIn ? 'local' : 'session');
        toast.message('Applying sign-in setting…');
        window.setTimeout(() => window.location.reload(), 75);
    };

    const handlePasswordRecovery = async () => {
        const trimmedEmail = emailCredentials.email.trim();
        if (!trimmedEmail) {
            toast.error('Enter your email first.');
            return;
        }
        const supabase = getSupabase();
        if (!supabase) {
            toast.error('Supabase auth is not configured.');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) {
                console.warn('[useEmailAuth] Password recovery request failed:', error.message);
            }
            // Always show success to avoid account enumeration
            toast.success("If an account exists, you'll receive a password reset email shortly.");
            triggerHaptic('light');
        } catch (err: any) {
            console.warn('[useEmailAuth] Password recovery request failed:', err?.message || err);
            toast.success("If an account exists, you'll receive a password reset email shortly.");
        } finally {
            setLoading(false);
        }
    };

    const handleSignupSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        triggerHaptic('light');

        if (!signupForm.email.trim() || !signupForm.password || !signupForm.confirmPassword) {
            setSignupFeedback({ status: 'error', message: 'Fill out every field to continue.' });
            triggerHaptic('error');
            return;
        }
        if (signupForm.password.length < 8) {
            setSignupFeedback({ status: 'error', message: 'Password must be at least 8 characters.' });
            triggerHaptic('error');
            return;
        }
        if (signupForm.password !== signupForm.confirmPassword) {
            setSignupFeedback({ status: 'error', message: 'Passwords do not match.' });
            triggerHaptic('error');
            return;
        }
        if (!signupForm.acceptTerms) {
            setSignupFeedback({ status: 'error', message: 'Please accept the terms to create an account.' });
            triggerHaptic('error');
            return;
        }

        const supabase = getSupabase();
        if (!supabase) {
            setSignupFeedback({ status: 'error', message: 'Supabase auth is not configured.' });
            triggerHaptic('error');
            return;
        }

        try {
            setLoading(true);
            setSignupFeedback({ status: 'idle' });
            const { data, error } = await supabase.auth.signUp({
                email: signupForm.email.trim(),
                password: signupForm.password,
                options: {
                    emailRedirectTo: window.location.origin,
                    data: signupForm.username ? { username: signupForm.username } : undefined,
                },
            });

            if (error) throw error;

            if (data.user) {
                if (data.session) {
                    // Auto-confirmed
                    setSignupFeedback({
                        status: 'success',
                        message: 'Account created successfully! Signing you in...',
                    });
                    triggerHaptic('medium');
                    setTimeout(() => {
                        onLoginSuccess?.();
                    }, 1500);
                } else {
                    // Confirmation required
                    setSignupFeedback({
                        status: 'success',
                        message: 'Check your email to confirm your account, then sign in here.',
                    });
                    triggerHaptic('medium');
                }
            } else {
                setSignupFeedback({
                    status: 'success',
                    message: 'Check your email to confirm your account, then sign in here.',
                });
                triggerHaptic('medium');
            }
        } catch (err: any) {
            console.error('[Signup] Signup failed:', err);
            setSignupFeedback({ status: 'error', message: err.message || 'Unable to create account.' });
            triggerHaptic('error');
        } finally {
            setLoading(false);
        }
    };

    return {
        emailCredentials, setEmailCredentials,
        keepSignedIn, handleKeepSignedInChange,
        rememberEmail, setRememberEmail,
        handleEmailLogin,
        handlePasswordRecovery,
        signupForm, setSignupForm,
        signupFeedback, setSignupFeedback,
        handleSignupSubmit
    };
};
