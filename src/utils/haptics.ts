/**
 * Haptic feedback utility for ChopDot
 * Provides tactile feedback on supported devices (iOS, Android)
 */

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

interface HapticPattern {
  duration: number[];
  intensity?: number;
}

const HAPTIC_PATTERNS: Record<HapticType, HapticPattern> = {
  light: { duration: [10] },
  medium: { duration: [20] },
  heavy: { duration: [30] },
  success: { duration: [10, 50, 10] },
  warning: { duration: [20, 50, 20] },
  error: { duration: [20, 50, 20, 50, 20] },
  selection: { duration: [5] },
};

/**
 * Trigger haptic feedback
 * @param type - Type of haptic feedback
 */
export const triggerHaptic = (type: HapticType = 'light'): void => {
  // Check if Vibration API is supported
  if (!navigator.vibrate) {
    return;
  }

  const pattern = HAPTIC_PATTERNS[type];
  
  try {
    navigator.vibrate(pattern.duration);
  } catch (error) {
    // Silently fail if vibration is not supported or blocked
    // This is expected on desktop and some mobile browsers
  }
};

/**
 * Cancel any ongoing vibration
 */
export const cancelHaptic = (): void => {
  if (navigator.vibrate) {
    navigator.vibrate(0);
  }
};

/**
 * Check if haptic feedback is supported on this device
 */
export const isHapticSupported = (): boolean => {
  return 'vibrate' in navigator;
};

// Convenience exports for common haptic patterns
export const haptics = {
  light: () => triggerHaptic('light'),
  medium: () => triggerHaptic('medium'),
  heavy: () => triggerHaptic('heavy'),
  success: () => triggerHaptic('success'),
  warning: () => triggerHaptic('warning'),
  error: () => triggerHaptic('error'),
  selection: () => triggerHaptic('selection'),
};
