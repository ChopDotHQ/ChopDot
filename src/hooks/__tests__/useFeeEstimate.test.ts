// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFeeEstimate } from '../useFeeEstimate';

const mockEstimateFee = vi.fn();
const mockGetConfig = vi.fn();

vi.mock('../../services/chain', () => ({
  getChain: vi.fn(async () => ({
    estimateFee: mockEstimateFee,
    getConfig: mockGetConfig,
  })),
}));

describe('useFeeEstimate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfig.mockReturnValue({ decimals: 10 });
  });

  it('estimates fee for DOT pot', async () => {
    mockEstimateFee.mockResolvedValue('150000000'); // 0.015 DOT at 10 decimals

    const { result } = renderHook(() =>
      useFeeEstimate({
        fromAddress: '5GrwvaEF...',
        toAddress: '5FHneW46...',
        totalAmount: 1.5,
        isDotPot: true,
        dotPriceUsd: null,
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.feeLoading).toBe(false);
    });

    expect(result.current.feeEstimate).toBe(0.015);
    expect(result.current.feeError).toBe(false);
  });

  it('converts fiat to DOT before estimating', async () => {
    mockEstimateFee.mockResolvedValue('100000000');

    const { result } = renderHook(() =>
      useFeeEstimate({
        fromAddress: '5GrwvaEF...',
        toAddress: '5FHneW46...',
        totalAmount: 50,
        isDotPot: false,
        dotPriceUsd: 5.0,
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.feeLoading).toBe(false);
    });

    expect(mockEstimateFee).toHaveBeenCalledWith(
      expect.objectContaining({ amountDot: 10 })
    );
  });

  it('returns null when disabled', () => {
    const { result } = renderHook(() =>
      useFeeEstimate({
        fromAddress: '5GrwvaEF...',
        toAddress: '5FHneW46...',
        totalAmount: 1,
        isDotPot: true,
        dotPriceUsd: null,
        enabled: false,
      })
    );

    expect(result.current.feeEstimate).toBeNull();
    expect(result.current.feeLoading).toBe(false);
  });

  it('uses fallback fee on chain error', async () => {
    mockEstimateFee.mockRejectedValue(new Error('RPC timeout'));

    const { result } = renderHook(() =>
      useFeeEstimate({
        fromAddress: '5GrwvaEF...',
        toAddress: '5FHneW46...',
        totalAmount: 1,
        isDotPot: true,
        dotPriceUsd: null,
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.feeLoading).toBe(false);
    });

    expect(result.current.feeEstimate).toBe(0.0025);
  });
});
