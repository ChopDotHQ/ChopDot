/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { CaptureLinkService } from './CaptureLinkService';
import { CaptureLinkError } from './types';

describe('CaptureLinkService', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('mints and consumes a confirm token once', () => {
    const service = new CaptureLinkService();
    const token = service.mintConfirmToken({
      potId: 'pot_1',
      chapterId: 'chapter_1',
      legId: 'leg_1',
      receiverId: 'owner',
      ttlMs: 60_000,
    });

    const payload = service.consumeConfirmToken(token);
    expect(payload.legId).toBe('leg_1');
    expect(() => service.consumeConfirmToken(token)).toThrow(/already used/i);
  });

  it('mints and resolves pay tokens', () => {
    const service = new CaptureLinkService();
    const token = service.mintPayToken({
      potId: 'pot_1',
      chapterId: 'chapter_1',
      legId: 'leg_alice',
      fromMemberId: 'alice',
      toMemberId: 'owner',
      amount: 30,
      currency: 'CHF',
    });

    const resolved = service.resolveToken(token);
    expect(resolved.type).toBe('pay');
    if (resolved.type === 'pay') {
      expect(resolved.payload.fromMemberId).toBe('alice');
    }
  });

  it('throws expired error for stale tokens', () => {
    const service = new CaptureLinkService();
    const token = service.mintPayToken({
      potId: 'pot_1',
      chapterId: 'chapter_1',
      legId: 'leg_1',
      fromMemberId: 'alice',
      toMemberId: 'owner',
      amount: 10,
      currency: 'CHF',
      ttlMs: -1,
    });

    expect(() => service.resolveToken(token)).toThrow(CaptureLinkError);
  });
});
