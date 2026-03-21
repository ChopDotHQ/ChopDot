import type { WalletOptionTheme, PanelMode } from './SignInThemes';

export const POLKADOT_JS_LOGO = '/assets/Logos/Polkadot Js Logo.png';
export const WALLETCONNECT_LOGO = '/assets/Logos/Wallet Connect Logo.png';
export const SUBWALLET_LOGO = '/assets/Logos/Subwallet Logo.png';
export const TALISMAN_LOGO = '/assets/Logos/Talisman Wallet Logo.png';
export const EMAIL_LOGIN_LOGO = '/assets/Logos/choptdot_whitebackground.png';

type WalletIntegrationKind = 'official-extension' | 'browser-extension' | 'walletconnect' | 'email' | 'oauth';
export type OptionGroup = 'social' | 'email' | 'wallet';

export interface WalletOptionConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: { src: string; alt: string };
  integrationKind: WalletIntegrationKind;
  showsLoadingIndicator?: boolean;
  themeOverride?: Partial<WalletOptionTheme>;
  group: OptionGroup;
}

export interface WalletOptionRenderable {
  title: string;
  subtitle: string;
  iconSrc: string;
  iconAlt: string;
  onClick: (e?: React.MouseEvent) => void;
  loading: boolean | undefined;
  theme: Partial<WalletOptionTheme> | undefined;
  useMarkForIcon: boolean;
  panelMode: PanelMode;
  useGlassmorphism: boolean;
  group: OptionGroup;
}

export function getBaseWalletOptionConfigs(): WalletOptionConfig[] {
  return [
    {
      id: 'email',
      title: 'Email & password',
      subtitle: '',
      icon: { src: EMAIL_LOGIN_LOGO, alt: 'Email login icon' },
      integrationKind: 'email',
      group: 'email',
    },
    {
      id: 'polkadot',
      title: 'Polkadot.js',
      subtitle: 'Browser extension',
      icon: { src: POLKADOT_JS_LOGO, alt: 'Polkadot.js logo' },
      integrationKind: 'official-extension',
      showsLoadingIndicator: true,
      group: 'wallet',
    },
    {
      id: 'subwallet',
      title: 'SubWallet',
      subtitle: 'Browser extension',
      icon: { src: SUBWALLET_LOGO, alt: 'SubWallet logo' },
      integrationKind: 'browser-extension',
      showsLoadingIndicator: true,
      group: 'wallet',
    },
    {
      id: 'talisman',
      title: 'Talisman',
      subtitle: 'Browser extension',
      icon: { src: TALISMAN_LOGO, alt: 'Talisman logo' },
      integrationKind: 'browser-extension',
      showsLoadingIndicator: true,
      group: 'wallet',
    },
    {
      id: 'walletconnect',
      title: 'WalletConnect',
      subtitle: 'MetaMask, Rainbow, Trust & more',
      icon: { src: WALLETCONNECT_LOGO, alt: 'WalletConnect logo' },
      integrationKind: 'walletconnect',
      group: 'wallet',
    },
    {
      id: 'google',
      title: 'Google',
      subtitle: '',
      icon: { src: '', alt: 'Google' },
      integrationKind: 'oauth',
      showsLoadingIndicator: true,
      group: 'social',
    },
  ];
}
