import { useState } from 'react';
import useClientDevice from '../../../hooks/useClientDevice';
// Utility moved locally

// Actually isFlagEnabled was just defined in SignInScreen, let's export it or move it.
// Checking SignInThemes... it's not there. It was defined locally in SignInScreen line 92.
// I'll make it a utility inside the hook file or just inline it for now.

const isFlagEnabled = (value?: string) => value === '1' || value?.toLowerCase() === 'true';

export type LoginViewOverride = 'auto' | 'desktop' | 'mobile';

export function useLoginState() {
    const device = useClientDevice();

    // UI State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // View Modes
    const [viewModeOverride, setViewModeOverride] = useState<LoginViewOverride>('auto');
    const enableMobileUi = isFlagEnabled(import.meta.env.VITE_ENABLE_MOBILE_WC_UI ?? '0');

    const resolvedViewMode: 'desktop' | 'mobile' =
        viewModeOverride === 'auto' ? (device.isMobile ? 'mobile' : 'desktop') : viewModeOverride;
    const isMobileWalletFlow = enableMobileUi && resolvedViewMode === 'mobile';

    // Email Panel State
    const [authPanelView, setAuthPanelView] = useState<'login' | 'signup'>('login');
    const [showEmailLogin, setShowEmailLogin] = useState(false);

    // Dev Tools
    // Allow UI toggle for WC Modal in dev/localhost
    const isDev = import.meta.env.MODE === 'development' ||
        (typeof window !== 'undefined' && (
            window.location.hostname === 'localhost' ||
            window.location.hostname.includes('127.0.0.1') ||
            window.location.hostname.includes('10.')
        ));

    const [wcModalEnabled, setWcModalEnabled] = useState(() => {
        // Check localStorage for saved preference
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('chopdot.wcModal.enabled');
            if (saved !== null) {
                return saved === 'true';
            }
            return true; // Default enabled
        }
        return true;
    });

    const enableWcModal = isDev
        ? wcModalEnabled
        : isFlagEnabled(import.meta.env.VITE_ENABLE_WC_MODAL ?? '1');

    // Actions
    const openEmailLoginDrawer = (source: string) => {
        setLoading(false);
        setError(null);
        setAuthPanelView('login');
        if (import.meta.env.DEV) {
            console.log('[SignInScreen] Opening email drawer', { source });
        }
        // Open on next frame to avoid edge-cases with click-outside handlers.
        requestAnimationFrame(() => setShowEmailLogin(true));
    };

    return {
        // State
        loading, setLoading,
        error, setError,
        viewModeOverride, setViewModeOverride,
        authPanelView, setAuthPanelView,
        showEmailLogin, setShowEmailLogin,
        wcModalEnabled, setWcModalEnabled,

        // Computed
        device,
        isDev,
        enableMobileUi,
        resolvedViewMode,
        isMobileWalletFlow,
        enableWcModal,

        // Actions
        openEmailLoginDrawer
    };
}
