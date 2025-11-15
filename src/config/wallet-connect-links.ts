export interface WalletConnectLink {
  id: string;
  label: string;
  description?: string;
  icon: string;
  deepLink?: (uri: string) => string;
  universalLink?: (uri: string) => string;
}

const encode = (uri: string) => encodeURIComponent(uri);

export const walletConnectLinks: WalletConnectLink[] = [
  {
    id: 'subwallet',
    label: 'SubWallet',
    description: 'Best for Polkadot mobile',
    icon: '/assets/Logos/Subwallet Logo.png',
    deepLink: (uri) => `subwallet://wc?uri=${encode(uri)}`,
    universalLink: (uri) => `https://link.walletconnect.org/?uri=${encode(uri)}`,
  },
  {
    id: 'talisman',
    label: 'Talisman',
    description: 'Companion app',
    icon: '/assets/Logos/Talisman Wallet Logo.png',
    deepLink: (uri) => `talisman://wc?uri=${encode(uri)}`,
    universalLink: (uri) => `https://link.walletconnect.org/?uri=${encode(uri)}`,
  },
  {
    id: 'nova',
    label: 'Nova Wallet',
    description: 'Polkadot-focused wallet',
    icon: '/assets/Logos/Nova Wallet Logo.svg',
    deepLink: (uri) => `novawallet://wc?uri=${encode(uri)}`,
    universalLink: (uri) => `https://link.walletconnect.org/?uri=${encode(uri)}`,
  },
  {
    id: 'rainbow',
    label: 'Rainbow',
    description: 'Multi-chain wallet',
    icon: '/assets/Logos/Rainbow Logo.jpeg',
    deepLink: (uri) => `rainbow://wc?uri=${encode(uri)}`,
    universalLink: (uri) => `https://link.walletconnect.org/?uri=${encode(uri)}`,
  },
  {
    id: 'ledger',
    label: 'Ledger Live',
    description: 'Hardware-secured',
    icon: '/assets/Logos/Ledger Logo.png',
    deepLink: (uri) => `ledgerlive://wc?uri=${encode(uri)}`,
    universalLink: (uri) => `https://link.walletconnect.org/?uri=${encode(uri)}`,
  },
  {
    id: 'other',
    label: 'Other Wallet',
    description: 'Open in WalletConnect chooser',
    icon: '/assets/Logos/Wallet Connect Logo.png',
    universalLink: (uri) => `https://link.walletconnect.org/?uri=${encode(uri)}`,
  },
  {
    id: 'copy',
    label: 'Copy URI',
    description: 'Use with any wallet',
    icon: '/assets/Logos/walletconnect.png',
  },
];
