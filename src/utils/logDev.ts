/**
 * Dev-only logging utility
 * 
 * Only logs when import.meta.env.DEV is true.
 * Useful for data layer debugging without cluttering production logs.
 */

/**
 * Log a message only in development mode
 * 
 * @param message - Message to log
 * @param data - Optional data to log
 */
export function logDev(message: string, data?: unknown): void {
  if (import.meta.env.DEV) {
    if (data !== undefined) {
      console.log(`[DataLayer] ${message}`, data);
    } else {
      console.log(`[DataLayer] ${message}`);
    }
  }
}

/**
 * Log a warning only in development mode
 * 
 * @param message - Warning message
 * @param data - Optional data to log
 */
export function warnDev(message: string, data?: unknown): void {
  if (import.meta.env.DEV) {
    if (data !== undefined) {
      console.warn(`[DataLayer] ${message}`, data);
    } else {
      console.warn(`[DataLayer] ${message}`);
    }
  }
}

/**
 * Log timing information for a method call (dev only)
 * 
 * @param method - Method name
 * @param durationMs - Duration in milliseconds
 * @param params - Optional parameters to log
 */
export function logTiming(method: string, durationMs: number, params?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    const logData: Record<string, unknown> = { method, ms: durationMs.toFixed(2) };
    if (params) {
      Object.assign(logData, params);
    }
    console.log(`[DL][timing]`, logData);
  }
}

