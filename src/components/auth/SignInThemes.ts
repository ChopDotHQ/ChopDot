import type { CSSProperties } from 'react';

export type PanelMode = 'dark' | 'light';

export interface PanelTheme {
  background: string;
  borderColor: string;
  shadow: string;
  backdropFilter?: string;
}

export interface WalletOptionTheme {
  background: string;
  hoverBackground?: string;
  borderColor: string;
  iconBackground?: string;
  iconBorderColor?: string;
  iconShadow?: string;
  titleColor?: string;
  subtitleColor?: string;
  shadow?: string;
  borderStyle?: 'solid' | 'dashed' | 'none';
}

export const defaultPanelTheme: PanelTheme = {
  background: 'rgba(10,10,15,0.55)',
  borderColor: 'rgba(255,255,255,0.08)',
  shadow: '0 0 65px rgba(230,0,122,0.4), 0 38px 120px rgba(0,0,0,0.65)',
  backdropFilter: 'blur(30px)',
};

export const defaultOptionTheme: WalletOptionTheme = {
  background: 'linear-gradient(135deg, #05060c 0%, #111b36 100%)',
  hoverBackground: 'linear-gradient(135deg, #080914 0%, #152144 100%)',
  borderColor: 'rgba(255,255,255,0.18)',
  iconBackground: 'linear-gradient(145deg, #1f1c2d, #0f0c18)',
  iconBorderColor: 'rgba(255,255,255,0.25)',
  iconShadow: '0 8px 20px rgba(0,0,0,0.35)',
  titleColor: '#ffffff',
  subtitleColor: 'rgba(255,255,255,0.8)',
  shadow: '0 15px 35px rgba(0,0,0,0.4)',
  borderStyle: 'solid',
};

export const ghostOptionTheme: WalletOptionTheme = {
  background: 'transparent',
  hoverBackground: 'rgba(255,255,255,0.05)',
  borderColor: 'rgba(255,255,255,0.3)',
  iconBackground: 'transparent',
  iconBorderColor: 'transparent',
  titleColor: '#ffffff',
  subtitleColor: 'rgba(255,255,255,0.7)',
  borderStyle: 'dashed',
};

export const emailOptionTheme: Partial<WalletOptionTheme> = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(255,240,249,0.92) 100%)',
  hoverBackground: '#ffffff',
  borderColor: 'rgba(0,0,0,0.08)',
  iconBackground: '#ffffff',
  iconBorderColor: 'rgba(0,0,0,0.05)',
  titleColor: '#111111',
  subtitleColor: '#5a5a66',
  shadow: '0 12px 30px rgba(0,0,0,0.08)',
};

export const sceneBackgroundStyles: Record<PanelMode, CSSProperties> = {
  dark: {
    backgroundColor: '#050105',
    color: '#ffffff',
    backgroundImage:
      'radial-gradient(rgba(230,0,122,0.15) 1.2px, transparent 1.2px), radial-gradient(rgba(230,0,122,0.07) 1.2px, transparent 1.2px)',
    backgroundSize: '48px 48px, 48px 48px',
    backgroundPosition: '0 0, 24px 24px',
  },
  light: {
    backgroundColor: '#fdf7ff',
    color: '#0f0f11',
    backgroundImage:
      'radial-gradient(rgba(230,0,122,0.06) 1px, transparent 1px), radial-gradient(rgba(230,0,122,0.03) 1px, transparent 1px)',
    backgroundSize: '52px 52px, 52px 52px',
    backgroundPosition: '0 0, 26px 26px',
  },
};

export const frostedPanelThemes: Record<PanelMode, PanelTheme> = {
  dark: {
    background: 'rgba(10,10,15,0.55)',
    borderColor: 'rgba(255,255,255,0.08)',
    shadow: '0 0 65px rgba(230,0,122,0.4), 0 38px 120px rgba(0,0,0,0.65)',
    backdropFilter: 'blur(30px)',
  },
  light: {
    background: 'linear-gradient(150deg, rgba(255,255,255,0.55), rgba(255,240,249,0.85))',
    borderColor: 'rgba(255,255,255,0.35)',
    shadow: '0 0 60px rgba(230,0,122,0.2), 0 25px 90px rgba(0,0,0,0.08)',
    backdropFilter: 'blur(28px)',
  },
};

export const frostedWalletThemes: Record<PanelMode, Partial<WalletOptionTheme>> = {
  dark: {
    background: 'rgba(15,15,22,0.72)',
    hoverBackground: 'rgba(21,21,30,0.8)',
    borderColor: 'rgba(255,255,255,0.08)',
    iconBackground: 'rgba(255,255,255,0.12)',
    iconBorderColor: 'rgba(255,255,255,0.2)',
    titleColor: '#ffffff',
    subtitleColor: 'rgba(255,255,255,0.78)',
    shadow: 'none',
  },
  light: {
    background: 'rgba(255,255,255,0.9)',
    hoverBackground: '#ffffff',
    borderColor: 'rgba(0,0,0,0.04)',
    iconBackground: '#ffffff',
    iconBorderColor: 'rgba(0,0,0,0.04)',
    titleColor: '#1c1c22',
    subtitleColor: '#5a5a66',
    shadow: 'none',
  },
};

export const frostedGuestThemes: Record<PanelMode, Partial<WalletOptionTheme>> = {
  dark: {
    background: 'rgba(255,255,255,0.12)',
    hoverBackground: 'rgba(255,255,255,0.2)',
    borderColor: 'rgba(255,255,255,0.45)',
    titleColor: '#ffffff',
    subtitleColor: 'rgba(255,255,255,0.72)',
    borderStyle: 'solid',
  },
  light: {
    background: '#ffffff',
    hoverBackground: '#f5f5f8',
    borderColor: 'rgba(0,0,0,0.05)',
    titleColor: '#111111',
    subtitleColor: '#6b7280',
    borderStyle: 'solid',
  },
};

export const frostedWalletOverrides: Record<string, Partial<WalletOptionTheme>> = {
  // No special overrides - all wallets use the same base theme
};

export const polkadotSecondAgePanelThemes: Record<PanelMode, PanelTheme> = {
  dark: {
    background: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadow: '0 10px 40px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.7), inset 0 -1px 20px rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(16px) saturate(120%)',
  },
  light: {
    background: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadow: '0 10px 40px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.7), inset 0 -1px 20px rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(16px) saturate(120%)',
  },
};

export const polkadotSecondAgeWalletThemes: Record<PanelMode, Partial<WalletOptionTheme>> = {
  dark: {
    background: 'rgba(28, 25, 23, 0.4)',
    hoverBackground: 'rgba(40, 36, 33, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    iconBackground: 'rgba(255, 255, 255, 0.1)',
    iconBorderColor: 'rgba(255, 255, 255, 0.2)',
    titleColor: '#FAFAF9',
    subtitleColor: 'rgba(250, 250, 249, 0.85)',
    shadow: '0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.3), inset 0 -1px 10px rgba(255, 255, 255, 0.08)',
  },
  light: {
    background: 'rgba(255, 255, 255, 0.5)',
    hoverBackground: 'rgba(255, 255, 255, 0.7)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
    iconBackground: 'rgba(0, 0, 0, 0.05)',
    iconBorderColor: 'rgba(0, 0, 0, 0.1)',
    titleColor: '#1C1917',
    subtitleColor: '#57534E',
    shadow: '0 4px 16px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.7), inset 0 -1px 10px rgba(255, 255, 255, 0.15)',
  },
};

export const polkadotSecondAgeGuestThemes: Record<PanelMode, Partial<WalletOptionTheme>> = {
  dark: {
    background: 'rgba(255, 255, 255, 0.08)',
    hoverBackground: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    titleColor: '#FAFAF9',
    subtitleColor: 'rgba(250, 250, 249, 0.8)',
    borderStyle: 'solid',
    shadow: '0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  },
  light: {
    background: 'rgba(0, 0, 0, 0.04)',
    hoverBackground: 'rgba(0, 0, 0, 0.06)',
    borderColor: 'rgba(0, 0, 0, 0.15)',
    titleColor: '#1C1917',
    subtitleColor: '#57534E',
    borderStyle: 'solid',
    shadow: '0 2px 8px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
  },
};

export const getPolkadotSecondAgeEmailOverride = (panelMode: PanelMode): Partial<WalletOptionTheme> => {
  if (panelMode === 'dark') {
    return {
      background: 'rgba(28, 25, 23, 0.4)',
      hoverBackground: 'rgba(40, 36, 33, 0.6)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      iconBackground: 'rgba(255, 255, 255, 0.1)',
      iconBorderColor: 'rgba(255, 255, 255, 0.2)',
      titleColor: '#FAFAF9',
      subtitleColor: 'rgba(250, 250, 249, 0.85)',
      shadow: '0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.3), inset 0 -1px 10px rgba(255, 255, 255, 0.08)',
    };
  }
  return {
    background: 'rgba(255, 255, 255, 0.5)',
    hoverBackground: 'rgba(255, 255, 255, 0.7)',
    borderColor: 'rgba(0, 0, 0, 0.15)',
    iconBackground: 'transparent',
    iconBorderColor: 'transparent',
    titleColor: '#000000',
    subtitleColor: '#4A4A4A',
    shadow: '0 4px 16px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.7), inset 0 -1px 10px rgba(255, 255, 255, 0.15)',
  };
};

export const polkadotSecondAgeWalletOverrides: Record<string, Partial<WalletOptionTheme>> = {
  // Email override is now handled dynamically via getPolkadotSecondAgeEmailOverride
  // Polkadot.js uses the same base theme as other wallets - no special override
};

export const POLKADOT_BACKGROUNDS = [
  '/assets/background-polka-a.png',
  '/assets/background-polka-b.png',
  '/assets/background-polka-c.png',
  '/assets/background-polka-d.png',
];

const POLKADOT_BACKGROUNDS_INVERTED = [
  '/assets/background-polka-a_inverted.png',
  '/assets/background-polka-b.png',
  '/assets/background-polka-c.png',
  '/assets/background-polka-d.png',
];

export const getPolkadotSecondAgeSceneBackgroundStyles = (
  panelMode: PanelMode,
  backgroundIndex: number
): CSSProperties => {
  const backgrounds = panelMode === 'dark' ? POLKADOT_BACKGROUNDS_INVERTED : POLKADOT_BACKGROUNDS;
  const backgroundImage = backgrounds[backgroundIndex % backgrounds.length];

  return {
    backgroundColor: panelMode === 'dark' ? '#050505' : '#F5F5F5',
    color: panelMode === 'dark' ? '#FAFAF9' : '#1C1917',
    backgroundImage: `url('${backgroundImage}'), ${
      panelMode === 'dark'
        ? `radial-gradient(ellipse at 20% 50%, rgba(255, 255, 255, 0.08) 0%, transparent 50%),
           radial-gradient(ellipse at 80% 80%, rgba(255, 255, 255, 0.06) 0%, transparent 50%),
           radial-gradient(ellipse at 40% 20%, rgba(255, 255, 255, 0.04) 0%, transparent 50%),
           linear-gradient(135deg, #050505 0%, #0A0A0A 50%, #050505 100%)`
        : `radial-gradient(ellipse at 20% 50%, rgba(0, 0, 0, 0.03) 0%, transparent 50%),
           radial-gradient(ellipse at 80% 80%, rgba(0, 0, 0, 0.02) 0%, transparent 50%),
           radial-gradient(ellipse at 40% 20%, rgba(0, 0, 0, 0.01) 0%, transparent 50%),
           linear-gradient(135deg, #F5F5F5 0%, #FAFAF9 50%, #F5F5F5 100%)`
    }`,
    backgroundSize: 'cover, 100% 100%, 100% 100%, 100% 100%, 100% 100%',
    backgroundPosition: 'center, 0% 0%, 100% 100%, 50% 50%, 0% 0%',
    backgroundRepeat: 'no-repeat, no-repeat, no-repeat, no-repeat, no-repeat',
    transition: 'background-image 2s ease-in-out',
  };
};
