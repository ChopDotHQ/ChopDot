// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { waitFor } from '@testing-library/dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CaptureLinkService } from '../services/capture/CaptureLinkService';
import { useCaptureLinkFlow } from './useCaptureLinkFlow';
import { useUrlSync } from './useUrlSync';

describe('capture link auth handoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/pots');
    window.localStorage.removeItem('chopdot_capture_link_tokens');
  });

  it('resolves a remote pay link after guest login when no local token exists', async () => {
    window.history.replaceState({}, '', '/pay?t=remote_pay_token');

    const resolveTokenRemote = vi.fn().mockResolvedValue({
      type: 'pay',
      token: 'remote_pay_token',
      payload: {
        chapterId: 'chapter-1',
        potId: 'pot-1',
        legId: 'leg-1',
        fromMemberId: 'alice',
        toMemberId: 'owner',
        amount: 42,
        currency: 'CHF',
        exp: Date.now() + 60_000,
      },
    });
    const reset = vi.fn();
    const setCurrentPotId = vi.fn();
    const showToast = vi.fn();

    renderHook(() =>
      useCaptureLinkFlow({
        captureLinkService: { resolveTokenRemote } as unknown as CaptureLinkService,
        authLoading: false,
        isAuthenticated: true,
        reset,
        setCurrentPotId,
        showToast,
      }),
    );

    await waitFor(() => {
      expect(resolveTokenRemote).toHaveBeenCalledWith('remote_pay_token');
      expect(setCurrentPotId).toHaveBeenCalledWith('pot-1');
      expect(reset).toHaveBeenCalledWith({
        type: 'capture-handoff',
        potId: 'pot-1',
        legId: 'leg-1',
        captureToken: 'remote_pay_token',
        actingMemberId: 'alice',
      });
    });
    expect(showToast).not.toHaveBeenCalled();
  });

  it('does not let URL sync turn a remote-only capture link into a local invalid-link screen', async () => {
    window.history.replaceState({}, '', '/pay?t=remote_pay_token');
    const reset = vi.fn();

    renderHook(() =>
      useUrlSync({
        screen: { type: 'pots-home' },
        stackLength: 1,
        reset,
      }),
    );

    await waitFor(() => {
      expect(reset).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'capture-link-error' }),
      );
    });
  });
});
