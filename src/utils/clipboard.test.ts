import { describe, it, expect, vi, beforeEach } from 'vitest';
import { copyWithToast } from './clipboard';

vi.mock('./haptics', () => ({
  triggerHaptic: vi.fn(),
}));

describe('copyWithToast', () => {
  const showToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('copies text and shows success toast', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    const result = await copyWithToast('hello', 'Copied!', showToast);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello');
    expect(showToast).toHaveBeenCalledWith('Copied!');
    expect(result).toBe(true);
  });

  it('shows failure toast when clipboard throws', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });

    const result = await copyWithToast('hello', 'Copied!', showToast);

    expect(showToast).toHaveBeenCalledWith('Failed to copy');
    expect(result).toBe(false);
  });
});
