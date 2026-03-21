import { triggerHaptic } from './haptics';

export async function copyWithToast(
  text: string,
  successMessage: string,
  showToast: (msg: string) => void
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
    triggerHaptic('light');
    return true;
  } catch {
    showToast('Failed to copy');
    return false;
  }
}
