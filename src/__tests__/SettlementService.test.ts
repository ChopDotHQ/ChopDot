import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  deriveChapterStatus,
  SettlementService,
} from '../services/data/services/SettlementService';
import type { SettlementLeg } from '../types/app';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeLeg(status: SettlementLeg['status'], id = '1'): SettlementLeg {
  return {
    id,
    potId: 'pot-1',
    fromMemberId: 'alice',
    toMemberId: 'bob',
    amount: 10,
    currency: 'CHF',
    status,
    createdAt: new Date().toISOString(),
  };
}

// ─── deriveChapterStatus ──────────────────────────────────────────────────────

describe('deriveChapterStatus', () => {
  it('returns active when there are no legs', () => {
    expect(deriveChapterStatus([])).toBe('active');
  });

  it('returns active when all legs are pending', () => {
    const legs = [makeLeg('pending', '1'), makeLeg('pending', '2')];
    expect(deriveChapterStatus(legs)).toBe('active');
  });

  it('returns completed when every leg is confirmed', () => {
    const legs = [makeLeg('confirmed', '1'), makeLeg('confirmed', '2')];
    expect(deriveChapterStatus(legs)).toBe('completed');
  });

  it('returns partially_settled when at least one leg is paid', () => {
    const legs = [makeLeg('pending', '1'), makeLeg('paid', '2')];
    expect(deriveChapterStatus(legs)).toBe('partially_settled');
  });

  it('returns partially_settled when at least one leg is confirmed but not all', () => {
    const legs = [makeLeg('pending', '1'), makeLeg('confirmed', '2')];
    expect(deriveChapterStatus(legs)).toBe('partially_settled');
  });

  it('returns partially_settled when mix of paid and confirmed', () => {
    const legs = [makeLeg('paid', '1'), makeLeg('confirmed', '2')];
    expect(deriveChapterStatus(legs)).toBe('partially_settled');
  });

  it('returns active for a single pending leg', () => {
    expect(deriveChapterStatus([makeLeg('pending')])).toBe('active');
  });

  it('returns completed for a single confirmed leg', () => {
    expect(deriveChapterStatus([makeLeg('confirmed')])).toBe('completed');
  });
});

// ─── SettlementService ────────────────────────────────────────────────────────

function makeRepoMock() {
  return {
    create: vi.fn(),
    createBatch: vi.fn(),
    listByPot: vi.fn(),
    markPaid: vi.fn(),
    confirmReceipt: vi.fn(),
    invalidate: vi.fn(),
    list: vi.fn(),
  };
}

function makePotRepoMock() {
  return {
    get: vi.fn(),
  };
}

describe('SettlementService.proposeChapter', () => {
  let repo: ReturnType<typeof makeRepoMock>;
  let potRepo: ReturnType<typeof makePotRepoMock>;
  let service: SettlementService;

  beforeEach(() => {
    repo = makeRepoMock();
    potRepo = makePotRepoMock();
    service = new SettlementService(repo as any, potRepo as any);
  });

  it('delegates to createBatch with all legs and returns results', async () => {
    const legs = [makeLeg('pending', 'leg-1'), makeLeg('pending', 'leg-2')];
    repo.createBatch.mockResolvedValueOnce(legs);

    const input = [
      { fromMemberId: 'alice', toMemberId: 'bob', amount: 10, currency: 'CHF' },
      { fromMemberId: 'carol', toMemberId: 'bob', amount: 5, currency: 'CHF' },
    ];
    const result = await service.proposeChapter('pot-1', input);

    expect(repo.createBatch).toHaveBeenCalledOnce();
    expect(repo.createBatch).toHaveBeenCalledWith('pot-1', input);
    expect(result).toEqual(legs);
  });

  it('returns an empty array when no legs are provided', async () => {
    repo.createBatch.mockResolvedValueOnce([]);
    const result = await service.proposeChapter('pot-1', []);
    expect(result).toEqual([]);
  });

  it('propagates errors from the repository', async () => {
    repo.createBatch.mockRejectedValueOnce(new Error('DB error'));
    await expect(
      service.proposeChapter('pot-1', [
        { fromMemberId: 'alice', toMemberId: 'bob', amount: 10, currency: 'CHF' },
      ]),
    ).rejects.toThrow('DB error');
  });
});

describe('SettlementService.markPaid', () => {
  let repo: ReturnType<typeof makeRepoMock>;
  let service: SettlementService;

  beforeEach(() => {
    repo = makeRepoMock();
    service = new SettlementService(repo as any, makePotRepoMock() as any);
  });

  it('delegates to repository.markPaid and returns the result', async () => {
    const paidLeg = makeLeg('paid');
    repo.markPaid.mockResolvedValueOnce(paidLeg);

    const result = await service.markPaid('leg-1', 'pot-1', 'bank', 'ref-123');

    expect(repo.markPaid).toHaveBeenCalledWith('leg-1', 'pot-1', 'bank', 'ref-123');
    expect(result).toEqual(paidLeg);
  });

  it('works without an optional reference', async () => {
    const paidLeg = makeLeg('paid');
    repo.markPaid.mockResolvedValueOnce(paidLeg);

    await service.markPaid('leg-1', 'pot-1', 'cash', undefined);

    expect(repo.markPaid).toHaveBeenCalledWith('leg-1', 'pot-1', 'cash', undefined);
  });
});

describe('SettlementService.confirmReceipt', () => {
  let repo: ReturnType<typeof makeRepoMock>;
  let service: SettlementService;

  beforeEach(() => {
    repo = makeRepoMock();
    service = new SettlementService(repo as any, makePotRepoMock() as any);
  });

  it('delegates to repository.confirmReceipt and returns the result', async () => {
    const confirmedLeg = makeLeg('confirmed');
    repo.confirmReceipt.mockResolvedValueOnce(confirmedLeg);

    const result = await service.confirmReceipt('leg-1', 'pot-1');

    expect(repo.confirmReceipt).toHaveBeenCalledWith('leg-1', 'pot-1');
    expect(result).toEqual(confirmedLeg);
  });
});

describe('SettlementService.chapterStatus', () => {
  it('proxies through to deriveChapterStatus', () => {
    const service = new SettlementService(makeRepoMock() as any, makePotRepoMock() as any);
    expect(service.chapterStatus([])).toBe('active');
    expect(service.chapterStatus([makeLeg('confirmed')])).toBe('completed');
  });
});
