export type HostKind = 'web' | 'mobile-browser' | 'embedded-webview' | 'telegram-mini-app';

type TelegramBackButton = {
  show?: () => void;
  hide?: () => void;
  onClick?: (callback: () => void) => void;
  offClick?: (callback: () => void) => void;
};

type TelegramCloudStorage = {
  setItem?: (key: string, value: string, callback?: (error: string | null, success?: boolean) => void) => void;
  removeItem?: (key: string, callback?: (error: string | null, success?: boolean) => void) => void;
};

type TelegramWebApp = {
  initData?: string;
  initDataUnsafe?: {
    start_param?: string;
    user?: {
      id?: number;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
  };
  platform?: string;
  colorScheme?: 'light' | 'dark';
  viewportHeight?: number;
  viewportStableHeight?: number;
  safeAreaInset?: { top: number; right: number; bottom: number; left: number };
  contentSafeAreaInset?: { top: number; right: number; bottom: number; left: number };
  BackButton?: TelegramBackButton;
  MainButton?: unknown;
  CloudStorage?: TelegramCloudStorage;
  ready?: () => void;
  expand?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  onEvent?: (eventType: string, callback: (...args: unknown[]) => void) => void;
  offEvent?: (eventType: string, callback: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export interface EnvironmentCapabilities {
  host: HostKind;
  canUseClipboard: boolean;
  canUseShareSheet: boolean;
  canUseLocalStorage: boolean;
  canUseTelegramCloudStorage: boolean;
  isStandalone: boolean;
  userAgent: string;
  launchStartParam: string | null;
  telegramPlatform: string | null;
  viewportStableHeight: number | null;
}

export function getEnvironmentCapabilities(): EnvironmentCapabilities {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      host: 'web',
      canUseClipboard: false,
      canUseShareSheet: false,
      canUseLocalStorage: false,
      canUseTelegramCloudStorage: false,
      isStandalone: false,
      userAgent: '',
      launchStartParam: null,
      telegramPlatform: null,
      viewportStableHeight: null,
    };
  }

  const userAgent = navigator.userAgent;
  const telegram = getTelegramWebApp();
  const isMobile = /Android|iPhone|iPad|iPod/i.test(userAgent);
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  const maybeEmbedded = Boolean(telegram) || /FBAN|FBAV|Instagram|Line|Telegram|MicroMessenger/i.test(userAgent);

  return {
    host: telegram ? 'telegram-mini-app' : maybeEmbedded ? 'embedded-webview' : isMobile ? 'mobile-browser' : 'web',
    canUseClipboard: Boolean(navigator.clipboard?.writeText),
    canUseShareSheet: Boolean(navigator.share),
    canUseLocalStorage: canAccessLocalStorage(),
    canUseTelegramCloudStorage: Boolean(telegram?.CloudStorage?.setItem),
    isStandalone,
    userAgent,
    launchStartParam: getLaunchParameters().startParam,
    telegramPlatform: telegram?.platform ?? null,
    viewportStableHeight: typeof telegram?.viewportStableHeight === 'number' ? telegram.viewportStableHeight : null,
  };
}

export function initializeHostEnvironment(theme: 'light' | 'dark' = 'light') {
  const telegram = getTelegramWebApp();
  if (!telegram) {
    return;
  }

  telegram.ready?.();
  telegram.expand?.();
  telegram.setHeaderColor?.(theme === 'dark' ? '#030712' : '#ffffff');
  telegram.setBackgroundColor?.(theme === 'dark' ? '#030712' : '#f9fafb');
}

export function configureHostBackButton(isVisible: boolean, onBack: () => void): () => void {
  const backButton = getTelegramWebApp()?.BackButton;
  if (!backButton) {
    return () => {};
  }

  if (!isVisible) {
    backButton.hide?.();
    return () => {};
  }

  backButton.show?.();
  backButton.onClick?.(onBack);

  return () => {
    backButton.offClick?.(onBack);
  };
}

export function getLaunchParameters(): { startParam: string | null; source: 'telegram' | 'url' | 'none' } {
  if (typeof window === 'undefined') {
    return { startParam: null, source: 'none' };
  }

  const telegramStartParam = getTelegramWebApp()?.initDataUnsafe?.start_param;
  if (telegramStartParam) {
    return { startParam: telegramStartParam, source: 'telegram' };
  }

  const params = new URLSearchParams(window.location.search);
  const urlStartParam = params.get('tgWebAppStartParam') || params.get('startapp');
  if (urlStartParam) {
    return { startParam: urlStartParam, source: 'url' };
  }

  return { startParam: null, source: 'none' };
}

export function getTelegramViewport() {
  const telegram = getTelegramWebApp();
  return {
    height: telegram?.viewportHeight ?? null,
    stableHeight: telegram?.viewportStableHeight ?? null,
    safeAreaInset: telegram?.safeAreaInset ?? null,
    contentSafeAreaInset: telegram?.contentSafeAreaInset ?? null,
  };
}

export function getTelegramUserDisplayName(): string | null {
  const user = getTelegramWebApp()?.initDataUnsafe?.user;
  if (!user) {
    return null;
  }

  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return name || user.username || null;
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

export const appStorage = {
  read(key: string): string | null {
    if (!getEnvironmentCapabilities().canUseLocalStorage) {
      return null;
    }

    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  write(key: string, value: string): 'saved' | 'memory-only' {
    if (!getEnvironmentCapabilities().canUseLocalStorage) {
      mirrorToTelegramCloudStorage(key, value);
      return 'memory-only';
    }

    try {
      window.localStorage.setItem(key, value);
      mirrorToTelegramCloudStorage(key, value);
      return 'saved';
    } catch {
      mirrorToTelegramCloudStorage(key, value);
      return 'memory-only';
    }
  },

  remove(key: string): void {
    if (!getEnvironmentCapabilities().canUseLocalStorage) {
      removeFromTelegramCloudStorage(key);
      return;
    }

    try {
      window.localStorage.removeItem(key);
      removeFromTelegramCloudStorage(key);
    } catch {
      // Storage can be blocked in embedded hosts. Memory state still works.
      removeFromTelegramCloudStorage(key);
    }
  },
};

function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.Telegram?.WebApp ?? null;
}

function mirrorToTelegramCloudStorage(key: string, value: string) {
  try {
    getTelegramWebApp()?.CloudStorage?.setItem?.(key, value);
  } catch {
    // Telegram CloudStorage is an optional host mirror, not product truth.
  }
}

function removeFromTelegramCloudStorage(key: string) {
  try {
    getTelegramWebApp()?.CloudStorage?.removeItem?.(key);
  } catch {
    // Telegram CloudStorage is an optional host mirror, not product truth.
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
