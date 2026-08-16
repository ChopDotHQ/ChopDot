/**
 * RUNTIME FEATURE FLAGS
 */

export type FlagKey = 'DEMO_MODE' | 'SERVICE_FEE_CAP_BPS';
type FlagValue = boolean | number;

const DEFAULTS: Record<FlagKey, FlagValue> = {
  DEMO_MODE: false,
  SERVICE_FEE_CAP_BPS: 250,
};

const cache = new Map<FlagKey, FlagValue>();
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach(fn => { try { fn(); } catch { /**/ } });
}

export function getFlag<T = unknown>(key: FlagKey): T {
  if (key === 'DEMO_MODE' && import.meta.env.MODE === 'production') {
    return true as unknown as T;
  }
  if (cache.has(key)) return cache.get(key) as T;
  try {
    const stored = localStorage.getItem(`flag_${key}`);
    if (stored !== null) {
      const parsed = JSON.parse(stored) as FlagValue;
      cache.set(key, parsed);
      return parsed as T;
    }
  } catch { /**/ }
  cache.set(key, DEFAULTS[key]);
  return DEFAULTS[key] as T;
}

export function setFlag<T>(key: FlagKey, value: T): void {
  cache.set(key, value as unknown as FlagValue);
  try { localStorage.setItem(`flag_${key}`, JSON.stringify(value)); } catch { /**/ }
  notify();
}

export function resetFlags(): void {
  cache.clear();
  (Object.keys(DEFAULTS) as FlagKey[]).forEach(k => {
    try { localStorage.removeItem(`flag_${k}`); } catch { /**/ }
  });
  notify();
}

export function subscribe(listener: () => void): () => void {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}
