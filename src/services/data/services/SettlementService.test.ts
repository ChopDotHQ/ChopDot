import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../utils/settlements', () => ({
  calculatePotSettlements: vi.fn(),
}));

import { calculatePotSettlements } from '../../../utils/settlements';
import { SettlementService } from './SettlementService';
import { SettlementRepository } from '../repositories/SettlementRepository';

describe('SettlementService', () => {
  const potRepository = {
    get: vi.fn(),
    update: vi.fn(),
  };

  const service = new SettlementService(new SettlementRepository(), potRepository as any);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('suggest maps youOwe and owedToYou to settlement suggestions', async () => {
    potRepository.get.mockResolvedValue({
      id: 'pot-1',
      name: 'Trip',
      members: [
        { id: 'owner', name: 'You' },
        { id: 'alice', name: 'Alice' },
        { id: 'bob', name: 'Bob' },
      ],
    });

    vi.mocked(calculatePotSettlements).mockReturnValue({
      youOwe: [{ id: 'alice', name: 'Alice', totalAmount: 10, breakdown: [{ potName: 'Trip', amount: 10 }], trustScore: 0 }],
      owedToYou: [{ id: 'bob', name: 'Bob', totalAmount: 5, breakdown: [{ potName: 'Trip', amount: 5 }], trustScore: 0 }],
      byPerson: new Map(),
    } as any);

    const result = await service.suggest('pot-1');

    expect(result).toEqual([
      { from: 'owner', to: 'alice', amount: '10' },
      { from: 'bob', to: 'owner', amount: '5' },
    ]);
  });

  it('recordOnchainSettlement appends history and updates pot', async () => {
    const entry = {
      id: 'h1',
      when: Date.now(),
      type: 'onchain_settlement' as const,
      fromMemberId: 'owner',
      toMemberId: 'alice',
      fromAddress: 'addr1',
      toAddress: 'addr2',
      amountDot: '1.0',
      txHash: '0x123',
      status: 'submitted' as const,
    };

    potRepository.get.mockResolvedValue({
      id: 'pot-1',
      history: [{ id: 'h0', when: 1, type: 'remark_checkpoint', message: 'x', potHash: 'p1' }],
    });

    await service.recordOnchainSettlement('pot-1', entry);

    expect(potRepository.update).toHaveBeenCalledWith('pot-1', {
      history: [
        { id: 'h0', when: 1, type: 'remark_checkpoint', message: 'x', potHash: 'p1' },
        entry,
      ],
    });
  });

  it('recordOnchainSettlement supports USDC entries', async () => {
    const entry = {
      id: 'h2',
      when: Date.now(),
      type: 'onchain_settlement' as const,
      fromMemberId: 'owner',
      toMemberId: 'alice',
      fromAddress: 'addr1',
      toAddress: 'addr2',
      amountUsdc: '12.345600',
      assetId: 1337,
      txHash: '0x456',
      status: 'finalized' as const,
    };

    potRepository.get.mockResolvedValue({
      id: 'pot-1',
      history: [],
    });

    await service.recordOnchainSettlement('pot-1', entry);

    expect(potRepository.update).toHaveBeenCalledWith('pot-1', {
      history: [entry],
    });
  });
});
