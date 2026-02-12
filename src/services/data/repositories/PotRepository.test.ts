import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PotRepository, type DataSource } from './PotRepository';
import { NotFoundError } from '../errors';
import type { Pot } from '../types';

function pot(id: string, name: string): Pot {
  return {
    id,
    name,
    type: 'expense',
    baseCurrency: 'USD',
    members: [{ id: 'owner', name: 'You', role: 'Owner', status: 'active' }],
    expenses: [],
    history: [],
    budgetEnabled: false,
    checkpointEnabled: false,
    mode: 'casual',
    archived: false,
  };
}

describe('PotRepository', () => {
  let source: DataSource;

  beforeEach(() => {
    source = {
      getPots: vi.fn().mockResolvedValue([pot('p1', 'Trip')]),
      getPot: vi.fn().mockResolvedValue(pot('p1', 'Trip')),
      savePots: vi.fn(),
      savePot: vi.fn(),
      deletePot: vi.fn(),
      exportPot: vi.fn().mockResolvedValue(pot('p1', 'Trip')),
      importPot: vi.fn().mockImplementation(async (p: Pot) => p),
    };
  });

  it('lists and caches full-list requests', async () => {
    const repo = new PotRepository(source, 60_000);
    const first = await repo.list();
    const second = await repo.list();

    expect(first.length).toBe(1);
    expect(second.length).toBe(1);
    expect(source.getPots).toHaveBeenCalledTimes(1);
  });

  it('does not reuse list cache for paginated requests', async () => {
    const repo = new PotRepository(source, 60_000);
    await repo.list({ limit: 1, offset: 0 });
    await repo.list({ limit: 1, offset: 0 });
    expect(source.getPots).toHaveBeenCalledTimes(2);
  });

  it('throws NotFoundError when pot is missing', async () => {
    (source.getPot as any).mockResolvedValueOnce(null);
    const repo = new PotRepository(source, 60_000);
    await expect(repo.get('missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('creates, updates, removes, exports, and imports pots', async () => {
    const repo = new PotRepository(source, 60_000);
    const created = await repo.create({
      name: 'Savings',
      type: 'savings',
      baseCurrency: 'USD',
      budgetEnabled: false,
    });
    expect(created.type).toBe('savings');
    expect(source.savePot).toHaveBeenCalled();

    (source.getPot as any).mockResolvedValueOnce(created);
    const updated = await repo.update(created.id, { name: 'Savings v2' });
    expect(updated.name).toBe('Savings v2');

    await repo.remove(created.id);
    expect(source.deletePot).toHaveBeenCalledWith(created.id);

    await expect(repo.export('p1')).resolves.toEqual(pot('p1', 'Trip'));
    await expect(repo.import(pot('p2', 'Imported'))).resolves.toEqual(pot('p2', 'Imported'));
  });
});
