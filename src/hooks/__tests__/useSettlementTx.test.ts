// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettlementTx } from '../useSettlementTx';

const mockSendDot = vi.fn();

vi.mock('../../services/chain', () => ({
  getChain: vi.fn(async () => ({
    sendDot: mockSendDot,
  })),
}));

vi.mock('../useTxToasts', () => ({
  pushTxToast: vi.fn(),
  updateTxToast: vi.fn(),
}));

vi.mock('../../utils/platformFee', () => ({
  formatDOT: (n: number) => `${n.toFixed(4)} DOT`,
}));

describe('useSettlementTx', () => {
  const mockAccount = {
    address0: '5GrwvaEF...',
    balanceHuman: '100.0',
    status: 'connected',
    refreshBalance: vi.fn().mockResolvedValue(undefined),
  };

  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends DOT settlement for a DOT pot', async () => {
    mockSendDot.mockResolvedValue({ txHash: '0xabc123' });

    const { result } = renderHook(() =>
      useSettlementTx({ account: mockAccount, onShowToast: mockShowToast })
    );

    let settlement: Awaited<ReturnType<typeof result.current.sendDotSettlement>>;
    await act(async () => {
      settlement = await result.current.sendDotSettlement({
        fromAddress: '5GrwvaEF...',
        toAddress: '5FHneW46...',
        totalAmount: 1.5,
        isDotPot: true,
        dotPriceUsd: null,
        feeEstimate: 0.002,
      });
    });

    expect(settlement!.txHash).toBe('0xabc123');
    expect(settlement!.amountDot).toBe(1.5);
    expect(mockAccount.refreshBalance).toHaveBeenCalled();
  });

  it('converts fiat to DOT for non-DOT pot', async () => {
    mockSendDot.mockResolvedValue({ txHash: '0xdef456' });

    const { result } = renderHook(() =>
      useSettlementTx({ account: mockAccount, onShowToast: mockShowToast })
    );

    let settlement: Awaited<ReturnType<typeof result.current.sendDotSettlement>>;
    await act(async () => {
      settlement = await result.current.sendDotSettlement({
        fromAddress: '5GrwvaEF...',
        toAddress: '5FHneW46...',
        totalAmount: 50,
        isDotPot: false,
        dotPriceUsd: 5.0,
        feeEstimate: 0.002,
      });
    });

    expect(settlement!.amountDot).toBe(10);
    expect(mockSendDot).toHaveBeenCalledWith(
      expect.objectContaining({ amountDot: 10 })
    );
  });

  it('throws when price unavailable for fiat pot', async () => {
    const { result } = renderHook(() =>
      useSettlementTx({ account: mockAccount, onShowToast: mockShowToast })
    );

    await expect(
      act(async () => {
        await result.current.sendDotSettlement({
          fromAddress: '5GrwvaEF...',
          toAddress: '5FHneW46...',
          totalAmount: 50,
          isDotPot: false,
          dotPriceUsd: null,
          feeEstimate: 0.002,
        });
      })
    ).rejects.toThrow('DOT_PRICE_UNAVAILABLE');

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('Unable to convert'),
      'error'
    );
  });

  it('throws when balance insufficient', async () => {
    const lowBalanceAccount = { ...mockAccount, balanceHuman: '0.001' };

    const { result } = renderHook(() =>
      useSettlementTx({ account: lowBalanceAccount, onShowToast: mockShowToast })
    );

    await expect(
      act(async () => {
        await result.current.sendDotSettlement({
          fromAddress: '5GrwvaEF...',
          toAddress: '5FHneW46...',
          totalAmount: 50,
          isDotPot: true,
          dotPriceUsd: null,
          feeEstimate: 0.002,
        });
      })
    ).rejects.toThrow('INSUFFICIENT_BALANCE');

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('Insufficient balance'),
      'error'
    );
  });
});
