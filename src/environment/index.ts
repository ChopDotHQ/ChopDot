export type HostKind = 'web' | 'mobile-browser' | 'embedded-webview';

export interface EnvironmentCapabilities {
  host: HostKind;
  canUseClipboard: boolean;
  canUseShareSheet: boolean;
  canUseLocalStorage: boolean;
  isStandalone: boolean;
  userAgent: string;
}

export function getEnvironmentCapabilities(): EnvironmentCapabilities {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      host: 'web',
      canUseClipboard: false,
      canUseShareSheet: false,
      canUseLocalStorage: false,
      isStandalone: false,
      userAgent: '',
    };
  }

  const userAgent = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(userAgent);
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  const maybeEmbedded = /FBAN|FBAV|Instagram|Line|Telegram|MicroMessenger/i.test(userAgent);

  return {
    host: maybeEmbedded ? 'embedded-webview' : isMobile ? 'mobile-browser' : 'web',
    canUseClipboard: Boolean(navigator.clipboard?.writeText),
    canUseShareSheet: Boolean(navigator.share),
    canUseLocalStorage: canAccessLocalStorage(),
    isStandalone,
    userAgent,
  };
}

export async function copyText(text: string): Promise<'copied' | 'ready'> {
  const capabilities = getEnvironmentCapabilities();

  if (!capabilities.canUseClipboard) {
    return 'ready';
  }

  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'ready';
  }
}

function canAccessLocalStorage(): boolean {
  try {
    const key = '__chopdot_storage_check__';
    window.localStorage.setItem(key, '1');
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
