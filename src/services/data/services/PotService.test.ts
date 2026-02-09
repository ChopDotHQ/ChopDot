import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PotService } from './PotService';
import { ValidationError } from '../errors';
import type { Pot } from '../types';

function createPot(overrides: Partial<Pot> = {}): Pot {
  return {
    id: 'pot-1',
    name: 'Trip',
    type: 'expense',
    baseCurrency: 'USD',
    members: [{ id: 'owner', name: 'You', role: 'Owner', status: 'active' }],
    expenses: [],
    history: [],
    budgetEnabled: false,
    checkpointEnabled: false,
    mode: 'casual',
    archived: false,
    ...overrides,
  };
}

describe('PotService', () => {
  const repository = {
    create: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    export: vi.fn(),
    import: vi.fn(),
  };

  const service = new PotService(repository as any);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createPot validates name and type', async () => {
    await expect(service.createPot({ name: '', type: 'expense' } as any)).rejects.toBeInstanceOf(ValidationError);
    await expect(service.createPot({ name: 'x', type: 'invalid' } as any)).rejects.toBeInstanceOf(ValidationError);
  });

  it('createPot delegates to repository', async () => {
    const pot = createPot();
    repository.create.mockResolvedValue(pot);

    const result = await service.createPot({ name: 'Trip', type: 'expense', baseCurrency: 'USD', budgetEnabled: false });

    expect(repository.create).toHaveBeenCalledWith({ name: 'Trip', type: 'expense', baseCurrency: 'USD', budgetEnabled: false });
    expect(result).toEqual(pot);
  });

  it('delegates get/list/update/delete/export/import actions', async () => {
    const pot = createPot();
    repository.get.mockResolvedValue(pot);
    repository.list.mockResolvedValue([pot]);
    repository.update.mockResolvedValue({ ...pot, name: 'Updated' });
    repository.export.mockResolvedValue(pot);
    repository.import.mockResolvedValue(pot);

    await expect(service.getPot('pot-1')).resolves.toEqual(pot);
    await expect(service.listPots({ limit: 1 })).resolves.toEqual([pot]);
    await expect(service.updatePot('pot-1', { name: 'Updated' })).resolves.toEqual({ ...pot, name: 'Updated' });
    await expect(service.deletePot('pot-1')).resolves.toBeUndefined();
    await expect(service.exportPot('pot-1')).resolves.toEqual(pot);
    await expect(service.importPot(pot)).resolves.toEqual(pot);

    expect(repository.remove).toHaveBeenCalledWith('pot-1');
  });

  it('checkpointHint returns hash and latest checkpoint hash', async () => {
    repository.get.mockResolvedValue(
      createPot({
        history: [
          { id: 'h1', when: 1, type: 'remark_checkpoint', message: 'a', potHash: 'old' },
          { id: 'h2', when: 2, type: 'remark_checkpoint', message: 'b', potHash: 'new' },
        ],
      })
    );

    const result = await service.checkpointHint('pot-1');

    expect(result.hash).toMatch(/^hash_pot-1_/);
    expect(result.lastCheckpointHash).toBe('new');
  });
});
