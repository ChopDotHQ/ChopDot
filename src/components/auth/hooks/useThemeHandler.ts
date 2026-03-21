import { useState, useEffect } from 'react';
import { useTheme } from '../../../utils/useTheme';
import { POLKADOT_BACKGROUNDS } from '../SignInThemes';

export type PanelMode = 'light' | 'dark';
export type LoginVariant = 'default' | 'polkadot-second-age-glass';

export const useThemeHandler = () => {
    const { brandVariant } = useTheme();

    // Background rotation state
    const [backgroundIndex, setBackgroundIndex] = useState(0);

    // Login variant state - defaults to Polkadot Second Age if brand variant is set, otherwise default
    const [loginVariant, setLoginVariant] = useState<LoginVariant>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('chopdot.loginVariant') as LoginVariant;
            if (saved && (saved === 'default' || saved === 'polkadot-second-age-glass')) {
                return saved;
            }
        }
        return brandVariant === 'polkadot-second-age' ? 'polkadot-second-age-glass' : 'default';
    });

    // Panel Mode (Dark/Light) Logic
    const getInitialPanelMode = () => {
        if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark' as PanelMode;
        }
        return 'light' as PanelMode;
    };
    const [panelMode, setPanelMode] = useState<PanelMode>(getInitialPanelMode);

    // Sync with brand variant changes
    useEffect(() => {
        const saved = localStorage.getItem('chopdot.loginVariant');
        if (!saved && brandVariant === 'polkadot-second-age' && loginVariant === 'default') {
            setLoginVariant('polkadot-second-age-glass');
            localStorage.setItem('chopdot.loginVariant', 'polkadot-second-age-glass');
        }
    }, [brandVariant]);

    // Save variant preference
    useEffect(() => {
        localStorage.setItem('chopdot.loginVariant', loginVariant);
    }, [loginVariant]);

    // System Theme Listener
    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (event: MediaQueryListEvent) => {
            setPanelMode(event.matches ? 'dark' : 'light');
        };
        // set initial in case matchMedia differs
        setPanelMode(media.matches ? 'dark' : 'light');

        if (media.addEventListener) {
            media.addEventListener('change', handleChange);
        } else {
            media.addListener(handleChange);
        }
        return () => {
            if (media.removeEventListener) {
                media.removeEventListener('change', handleChange);
            } else {
                media.removeListener(handleChange);
            }
        };
    }, []);

    // Background Rotation Logic
    useEffect(() => {
        if (loginVariant === 'polkadot-second-age-glass') {
            // Reset to index 0 when switching to dark mode
            if (panelMode === 'dark') {
                setBackgroundIndex(0);
                return; // Don't rotate in dark mode
            }

            // Rotate every 15s in light mode
            const interval = setInterval(() => {
                setBackgroundIndex((prev) => (prev + 1) % POLKADOT_BACKGROUNDS.length);
            }, 15000);

            return () => clearInterval(interval);
        }
    }, [loginVariant, panelMode]);

    return {
        panelMode, setPanelMode,
        loginVariant, setLoginVariant,
        backgroundIndex, setBackgroundIndex,
        brandVariant // Pass through for convenience if needed
    };
};
