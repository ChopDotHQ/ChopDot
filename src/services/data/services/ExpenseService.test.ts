import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExpenseService } from './ExpenseService';
import { ValidationError } from '../errors';

describe('ExpenseService', () => {
  const repository = {
    create: vi.fn(),
    update: vi.fn(),
    list: vi.fn(),
    remove: vi.fn(),
  };

  const potRepository = {
    get: vi.fn(),
    update: vi.fn(),
    invalidate: vi.fn(),
  };

  const service = new ExpenseService(repository as any, potRepository as any);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('addExpense validates required fields', async () => {
    await expect(service.addExpense('pot-1', { amount: 0, paidBy: 'owner', memo: 'x', potId: 'pot-1' } as any)).rejects.toBeInstanceOf(ValidationError);
    await expect(service.addExpense('pot-1', { amount: 10, paidBy: '', memo: 'x', potId: 'pot-1' } as any)).rejects.toBeInstanceOf(ValidationError);
    await expect(service.addExpense('pot-1', { amount: 10, paidBy: 'owner', memo: '', potId: 'pot-1' } as any)).rejects.toBeInstanceOf(ValidationError);
  });

  it('addExpense updates pot metadata and creates expense', async () => {
    const expense = { id: 'e1', amount: 10 };
    potRepository.get.mockResolvedValue({ id: 'pot-1', lastCheckpoint: { hash: 'h1' } });
    repository.create.mockResolvedValue(expense);

    const result = await service.addExpense('pot-1', { amount: 10, paidBy: 'owner', memo: 'Lunch', potId: 'pot-1' } as any);

    expect(result).toEqual(expense);
    expect(potRepository.update).toHaveBeenCalledTimes(1);
    const updateArg = potRepository.update.mock.calls[0]?.[1];
    expect(updateArg.lastEditAt).toEqual(expect.any(String));
    expect(updateArg).toHaveProperty('lastCheckpoint', undefined);
    expect(repository.create).toHaveBeenCalledWith('pot-1', expect.objectContaining({ memo: 'Lunch' }));
  });

  it('addExpense does not force lastCheckpoint field when no checkpoint exists', async () => {
    const expense = { id: 'e2', amount: 20 };
    potRepository.get.mockResolvedValue({ id: 'pot-2' });
    repository.create.mockResolvedValue(expense);

    await service.addExpense('pot-2', { amount: 20, paidBy: 'owner', memo: 'Coffee', potId: 'pot-2' } as any);

    const updateArg = potRepository.update.mock.calls[0]?.[1] ?? {};
    expect(updateArg.lastEditAt).toEqual(expect.any(String));
    expect(Object.prototype.hasOwnProperty.call(updateArg, 'lastCheckpoint')).toBe(false);
  });

  it('updateExpense validates, updates metadata, and delegates update', async () => {
    potRepository.get.mockResolvedValue({ id: 'pot-1', lastCheckpoint: { hash: 'h1' } });
    repository.update.mockResolvedValue({ id: 'e1', amount: 12 });

    await expect(service.updateExpense('pot-1', 'e1', { amount: 0 })).rejects.toBeInstanceOf(ValidationError);

    const result = await service.updateExpense('pot-1', 'e1', { amount: 12 });
    expect(result).toEqual({ id: 'e1', amount: 12 });
    expect(potRepository.update).toHaveBeenCalledWith('pot-1', expect.objectContaining({ lastEditAt: expect.any(String) }));
    expect(repository.update).toHaveBeenCalledWith('pot-1', 'e1', { amount: 12 });
  });

  it('listExpenses and removeExpense delegate to repository', async () => {
    repository.list.mockResolvedValue([{ id: 'e1' }]);

    await expect(service.listExpenses('pot-1')).resolves.toEqual([{ id: 'e1' }]);
    await expect(service.removeExpense('pot-1', 'e1')).resolves.toBeUndefined();

    expect(repository.remove).toHaveBeenCalledWith('pot-1', 'e1');
  });
});
