/**
 * RUNTIME FEATURE FLAGS MODULE
 * 
 * Minimal feature flag system with localStorage persistence.
 * Provides type-safe getters/setters with safe defaults and pub/sub notifications.
 * 
 * Usage:
 * ```ts
 * import { getFlag, setFlag, subscribe } from './utils/flags';
 * 
 * // Get flag (returns default if not set)
 * const isEnabled = getFlag<boolean>('POLKADOT_APP_ENABLED'); // true
 * 
 * // Set flag (persists to localStorage and notifies subscribers)
 * setFlag('POLKADOT_APP_ENABLED', false);
 * 
 * // Subscribe to changes
 * const unsubscribe = subscribe(() => {
 *   console.log('Flags changed!');
 * });
 * ```
 * 
 * No side effects on import - all operations are lazy.
 */

// ============================================================================
// TYPES
// ============================================================================

export type FlagKey = 
  | 'POLKADOT_APP_ENABLED' 
  | 'IPFS_RECEIPTS_ENABLED' 
  | 'PUSH_ENABLED' 
  | 'SERVICE_FEE_CAP_BPS'
  | 'DEMO_MODE';

type FlagValue = boolean | number;

interface FlagConfig {
  defaultValue: FlagValue;
  validate: (value: unknown) => FlagValue;
}

// ============================================================================
// FLAG CONFIGURATION
// ============================================================================

const FLAG_CONFIGS: Record<FlagKey, FlagConfig> = {
  POLKADOT_APP_ENABLED: {
    defaultValue: true,
    validate: (value: unknown): boolean => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') return value.toLowerCase() === 'true';
      if (typeof value === 'number') return value !== 0;
      return true; // Default fallback
    },
  },
  IPFS_RECEIPTS_ENABLED: {
    defaultValue: false,
    validate: (value: unknown): boolean => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') return value.toLowerCase() === 'true';
      if (typeof value === 'number') return value !== 0;
      return false; // Default fallback
    },
  },
  PUSH_ENABLED: {
    defaultValue: false,
    validate: (value: unknown): boolean => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') return value.toLowerCase() === 'true';
      if (typeof value === 'number') return value !== 0;
      return false; // Default fallback
    },
  },
  SERVICE_FEE_CAP_BPS: {
    defaultValue: 250,
    validate: (value: unknown): number => {
      if (typeof value === 'number' && !isNaN(value) && value >= 0) {
        return Math.floor(value); // Ensure integer
      }
      if (typeof value === 'string') {
        const parsed = parseInt(value, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          return parsed;
        }
      }
      return 250; // Default fallback
    },
  },
  DEMO_MODE: {
    defaultValue: false,
    validate: (value: unknown): boolean => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') return value.toLowerCase() === 'true';
      if (typeof value === 'number') return value !== 0;
      return false;
    }
  }
};

// ============================================================================
// IN-MEMORY CACHE
// ============================================================================

const cache = new Map<FlagKey, FlagValue>();

// ============================================================================
// SUBSCRIBERS (PUB/SUB)
// ============================================================================

const subscribers = new Set<() => void>();

function notifySubscribers(): void {
  subscribers.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error('Flag subscriber error:', error);
    }
  });
}

// ============================================================================
// LOCALSTORAGE HELPERS
// ============================================================================

function getStorageKey(key: FlagKey): string {
  return `flag_${key}`;
}

function readFromStorage(key: FlagKey): FlagValue | null {
  try {
    const storageKey = getStorageKey(key);
    const stored = localStorage.getItem(storageKey);
    if (stored === null) return null;
    
    const parsed = JSON.parse(stored);
    const config = FLAG_CONFIGS[key];
    return config.validate(parsed);
  } catch (error) {
    console.warn(`Failed to read flag ${key} from localStorage:`, error);
    return null;
  }
}

function writeToStorage(key: FlagKey, value: FlagValue): void {
  try {
    const storageKey = getStorageKey(key);
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to write flag ${key} to localStorage:`, error);
  }
}

function removeFromStorage(key: FlagKey): void {
  try {
    const storageKey = getStorageKey(key);
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.warn(`Failed to remove flag ${key} from localStorage:`, error);
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get a feature flag value with type-safe defaults.
 * 
 * @param key - The flag key to retrieve
 * @returns The flag value (from cache → localStorage → default)
 * 
 * @example
 * const isEnabled = getFlag<boolean>('POLKADOT_APP_ENABLED'); // true
 * const feeCap = getFlag<number>('SERVICE_FEE_CAP_BPS'); // 250
 */
export function getFlag<T = unknown>(key: FlagKey): T {
  // Force DEMO_MODE in production builds, ignoring localStorage
  if (key === 'DEMO_MODE') {
    const isProd = import.meta.env.MODE === 'production';
    if (isProd) {
      cache.set('DEMO_MODE', true);
      return true as unknown as T;
    }
  }
  // Check cache first
  if (cache.has(key)) {
    return cache.get(key) as T;
  }

  // Try localStorage
  const stored = readFromStorage(key);
  if (stored !== null) {
    cache.set(key, stored);
    return stored as T;
  }

  // Use default
  const config = FLAG_CONFIGS[key];
  const defaultValue = config.defaultValue;
  cache.set(key, defaultValue);
  return defaultValue as T;
}

/**
 * Set a feature flag value.
 * Updates cache, persists to localStorage, and notifies subscribers.
 * 
 * @param key - The flag key to set
 * @param value - The new value (will be validated and coerced)
 * 
 * @example
 * setFlag('POLKADOT_APP_ENABLED', false);
 * setFlag('SERVICE_FEE_CAP_BPS', 300);
 */
export function setFlag<T>(key: FlagKey, value: T): void {
  const config = FLAG_CONFIGS[key];
  const validated = config.validate(value);

  // Update cache
  cache.set(key, validated);

  // Persist to localStorage
  writeToStorage(key, validated);

  // Notify subscribers
  notifySubscribers();
}

/**
 * Reset all known flags to defaults.
 * Clears cache, removes from localStorage, and notifies subscribers.
 * 
 * @example
 * resetFlags(); // All flags back to defaults
 */
export function resetFlags(): void {
  // Clear cache
  cache.clear();

  // Remove from localStorage
  const keys = Object.keys(FLAG_CONFIGS) as FlagKey[];
  keys.forEach((key) => {
    removeFromStorage(key);
  });

  // Notify subscribers
  notifySubscribers();
}

/**
 * Subscribe to flag changes.
 * Listener is called whenever any flag is updated via setFlag() or resetFlags().
 * 
 * @param listener - Callback function to invoke on changes
 * @returns Unsubscribe function
 * 
 * @example
 * const unsubscribe = subscribe(() => {
 *   console.log('Flags changed!');
 * });
 * 
 * // Later:
 * unsubscribe();
 */
export function subscribe(listener: () => void): () => void {
  subscribers.add(listener);
  
  // Return unsubscribe function
  return () => {
    subscribers.delete(listener);
  };
}

/**
 * Get all current flag values (for debugging).
 * 
 * @returns Object with all flag keys and their current values
 * 
 * @example
 * const allFlags = getAllFlags();
 * // { POLKADOT_APP_ENABLED: true, IPFS_RECEIPTS_ENABLED: false, ... }
 */
export function getAllFlags(): Record<FlagKey, FlagValue> {
  const keys = Object.keys(FLAG_CONFIGS) as FlagKey[];
  const result = {} as Record<FlagKey, FlagValue>;
  
  keys.forEach((key) => {
    result[key] = getFlag(key);
  });
  
  return result;
}
