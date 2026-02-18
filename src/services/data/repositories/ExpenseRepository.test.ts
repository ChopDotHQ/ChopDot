import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExpenseRepository, type ExpenseDataSource } from './ExpenseRepository';
import { NotFoundError } from '../errors';
import type { Pot } from '../types';

describe('ExpenseRepository', () => {
  let source: ExpenseDataSource;

  beforeEach(() => {
    const existingPots = new Set<string>(['pot-1']);
    const expensesByPot = new Map<string, Pot['expenses']>();

    source = {
      listExpenses: vi.fn(async (potId: string) => {
        if (!existingPots.has(potId)) throw new NotFoundError('Pot', potId);
        return (expensesByPot.get(potId) ?? []).map((expense) => ({ ...expense }));
      }),
      getExpense: vi.fn(async (potId: string, expenseId: string) => {
        if (!existingPots.has(potId)) throw new NotFoundError('Pot', potId);
        return (expensesByPot.get(potId) ?? []).find((expense) => expense.id === expenseId) ?? null;
      }),
      saveExpense: vi.fn(async (potId: string, expense: Pot['expenses'][number]) => {
        if (!existingPots.has(potId)) throw new NotFoundError('Pot', potId);
        const expenses = expensesByPot.get(potId) ?? [];
        const index = expenses.findIndex((item) => item.id === expense.id);
        const next = [...expenses];
        if (index >= 0) {
          next[index] = expense;
        } else {
          next.push(expense);
        }
        expensesByPot.set(potId, next);
      }),
      deleteExpense: vi.fn(async (potId: string, expenseId: string) => {
        if (!existingPots.has(potId)) throw new NotFoundError('Pot', potId);
        const expenses = expensesByPot.get(potId) ?? [];
        expensesByPot.set(
          potId,
          expenses.filter((expense) => expense.id !== expenseId),
        );
      }),
    };
  });

  it('lists expenses and caches by pot', async () => {
    const repo = new ExpenseRepository(source, 10_000);
    await repo.list('pot-1');
    await repo.list('pot-1');
    expect(source.listExpenses).toHaveBeenCalledTimes(1);
  });

  it('throws not-found errors for missing pot/expense', async () => {
    const repo = new ExpenseRepository(source, 10_000);
    await expect(repo.list('missing')).rejects.toBeInstanceOf(NotFoundError);
    await expect(repo.get('pot-1', 'exp-404')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('creates and updates expenses', async () => {
    const repo = new ExpenseRepository(source, 10_000);
    const created = await repo.create('pot-1', {
      potId: 'pot-1',
      amount: 12,
      currency: 'USD',
      paidBy: 'owner',
      memo: 'Lunch',
    } as any);
    expect(created.amount).toBe(12);
    expect(source.saveExpense).toHaveBeenCalled();

    const updated = await repo.update('pot-1', created.id, { amount: 20 });
    expect(updated.amount).toBe(20);
  });

  it('remove is idempotent when expense is missing', async () => {
    const repo = new ExpenseRepository(source, 10_000);
    await repo.remove('pot-1', 'missing');
    expect(source.deleteExpense).toHaveBeenCalledWith('pot-1', 'missing');
  });
});
