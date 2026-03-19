// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDotPrice } from '../useDotPrice';

vi.mock('../../services/prices/coingecko', () => ({
  getDotPrice: vi.fn(),
}));

const { getDotPrice } = await import('../../services/prices/coingecko');
const getDotPriceMock = getDotPrice as ReturnType<typeof vi.fn>;

describe('useDotPrice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_ENABLE_PRICE_API', '1');
  });

  it('fetches price when enabled', async () => {
    getDotPriceMock.mockResolvedValue(7.5);
    const { result } = renderHook(() => useDotPrice({ enabled: true }));

    await waitFor(() => {
      expect(result.current.dotPrice).toBe(7.5);
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('does not fetch when disabled', () => {
    const { result } = renderHook(() => useDotPrice({ enabled: false }));
    expect(getDotPriceMock).not.toHaveBeenCalled();
    expect(result.current.dotPrice).toBeNull();
  });

  it('handles fetch failure gracefully', async () => {
    getDotPriceMock.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useDotPrice({ enabled: true }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.dotPrice).toBeNull();
  });
});
