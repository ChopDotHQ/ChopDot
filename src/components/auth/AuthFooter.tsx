import type { PanelMode, LoginVariant } from './hooks/useThemeHandler';

interface AuthFooterProps {
    panelMode: PanelMode;
    loginVariant: LoginVariant;
}

export const AuthFooter = ({ panelMode, loginVariant }: AuthFooterProps) => {
    const useGlassmorphism = loginVariant === 'polkadot-second-age-glass';
    // Note: internal logic in legacy code named this 'isDarkText' but it tracks if the mode is dark (implying white text)
    // We'll simplify the variable naming here.
    const isDarkMode = panelMode === 'dark';

    // Styles
    const linkStyle = useGlassmorphism && panelMode === 'light'
        ? { color: '#1C1917' }
        : (panelMode === 'dark' ? { color: '#FFFFFF' } : undefined);

    const textStyle = useGlassmorphism && panelMode === 'light'
        ? { color: '#57534E' }
        : (panelMode === 'dark' ? { color: 'rgba(255, 255, 255, 0.7)' } : undefined);

    // Class logic
    const linkClasses = `font-medium underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 rounded-sm px-0.5 ${isDarkMode ? 'text-white' : (useGlassmorphism ? '' : 'text-foreground')
        }`;

    const footerTextClasses = `text-center text-xs ${isDarkMode ? 'text-white/70' : (useGlassmorphism ? '' : 'text-secondary/80')
        }`;

    return (
        <div className="space-y-3">
            <p className={footerTextClasses} style={textStyle}>
                By continuing, you agree to ChopDot&apos;s{' '}
                <a
                    href="/terms"
                    className={linkClasses}
                    style={linkStyle}
                >
                    Terms of Service
                </a>{' '}
                and{' '}
                <a
                    href="/privacy"
                    className={linkClasses}
                    style={linkStyle}
                >
                    Privacy Policy
                </a>
                .
            </p>
        </div>
    );
};
