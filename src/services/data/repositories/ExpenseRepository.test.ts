import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExpenseRepository } from './ExpenseRepository';
import { NotFoundError } from '../errors';
import type { Pot } from '../types';
import type { DataSource } from './PotRepository';

function potWithExpenses(expenses: Pot['expenses'] = []): Pot {
  return {
    id: 'pot-1',
    name: 'Trip',
    type: 'expense',
    baseCurrency: 'USD',
    members: [{ id: 'owner', name: 'You', role: 'Owner', status: 'active' }],
    expenses,
    history: [],
    budgetEnabled: false,
    checkpointEnabled: false,
    mode: 'casual',
    archived: false,
  };
}

describe('ExpenseRepository', () => {
  let source: DataSource;

  beforeEach(() => {
    source = {
      getPots: vi.fn(),
      getPot: vi.fn().mockResolvedValue(potWithExpenses()),
      savePots: vi.fn(),
      savePot: vi.fn(),
      deletePot: vi.fn(),
      exportPot: vi.fn(),
      importPot: vi.fn(),
    };
  });

  it('lists expenses and caches by pot', async () => {
    const repo = new ExpenseRepository(source, 10_000);
    await repo.list('pot-1');
    await repo.list('pot-1');
    expect(source.getPot).toHaveBeenCalledTimes(1);
  });

  it('throws not-found errors for missing pot/expense', async () => {
    const repo = new ExpenseRepository(source, 10_000);
    (source.getPot as any).mockResolvedValueOnce(null);
    await expect(repo.list('missing')).rejects.toBeInstanceOf(NotFoundError);

    (source.getPot as any).mockResolvedValueOnce(potWithExpenses([]));
    await expect(repo.get('pot-1', 'exp-404')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('creates and updates expenses', async () => {
    const repo = new ExpenseRepository(source, 10_000);
    (source.getPot as any).mockResolvedValueOnce(potWithExpenses([]));
    const created = await repo.create('pot-1', {
      potId: 'pot-1',
      amount: 12,
      currency: 'USD',
      paidBy: 'owner',
      memo: 'Lunch',
    } as any);
    expect(created.amount).toBe(12);
    expect(source.savePot).toHaveBeenCalled();

    (source.getPot as any).mockResolvedValueOnce(
      potWithExpenses([{ ...created, id: 'e1' } as any])
    );
    const updated = await repo.update('pot-1', 'e1', { amount: 20 });
    expect(updated.amount).toBe(20);
  });

  it('remove is idempotent when expense is missing', async () => {
    const repo = new ExpenseRepository(source, 10_000);
    (source.getPot as any).mockResolvedValueOnce(potWithExpenses([]));
    await repo.remove('pot-1', 'missing');
    expect(source.savePot).not.toHaveBeenCalled();
  });
});
