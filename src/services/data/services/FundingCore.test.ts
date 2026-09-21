import { describe, expect, it, vi } from 'vitest';
import { getExpenseFunding, validateExpenseFunding, validateLegacyExpenseWrite } from '../../../domain/expenseFunding';
import { computeBalances } from '../../settlement/calc';
import { ExpenseRepository, type ExpenseDataSource } from '../repositories/ExpenseRepository';
import type { PotRepository } from '../repositories/PotRepository';
import type { Expense, Pot } from '../types';
import type { CreateExpenseDTO, UpdateExpenseDTO } from '../types/dto';
import { ExpenseService } from './ExpenseService';

const members = ['A', 'B', 'C'];
function expense(overrides: Record<string, unknown> = {}): Expense {
  return {
    id: 'e1', potId: 'p1', amount: 100, currency: 'CHF', paidBy: 'A', memo: 'Dinner',
    split: [{ memberId: 'A', amount: 20 }, { memberId: 'B', amount: 40 }, { memberId: 'C', amount: 40 }],
    ...overrides,
  };
}
function native(): Expense {
  return expense({ funding: [{ memberId: 'A', amount: 70 }, { memberId: 'B', amount: 30 }] });
}
function pot(expenses: Expense[] = []): Pot {
  return {
    id: 'p1', name: 'Research fixture', type: 'expense', baseCurrency: 'CHF', mode: 'casual',
    members: members.map(id => ({ id, name: id })), expenses, history: [],
    budgetEnabled: false, checkpointEnabled: false, archived: false,
  };
}
function harness(initial?: Expense) {
  const saved = new Map<string, Expense>();
  if (initial) saved.set(initial.id, structuredClone(initial));
  const saveExpense = vi.fn(async (_potId: string, next: Expense): Promise<void> => {
    saved.set(next.id, structuredClone(next));
  });
  const source: ExpenseDataSource = {
    listExpenses: async () => [...saved.values()].map(value => structuredClone(value)),
    getExpense: async (_potId, id) => {
      const value = saved.get(id);
      return value ? structuredClone(value) : null;
    },
    saveExpense,
    deleteExpense: async (_potId, id) => { saved.delete(id); },
  };
  const repository = new ExpenseRepository(source);
  const potRepository = {
    get: vi.fn(async () => pot()), update: vi.fn(async () => pot()), invalidate: vi.fn(),
  };
  const service = new ExpenseService(repository, potRepository as unknown as PotRepository);
  return { service, repository, saved, saveExpense, potRepository };
}

// These tests import the application functions and actual repository/service.
// Only the external data source is replaced with an explicit in-memory store.
describe('Funding core: input and attribution regressions', () => {
  it.each([NaN, Infinity, -Infinity, 0, -20, '70', null])('rejects invalid contribution %s', bad => {
    const value = expense({ funding: [{ memberId: 'A', amount: bad }, { memberId: 'B', amount: 30 }] });
    expect(validateExpenseFunding(value, members).success).toBe(false);
    expect(() => computeBalances(pot([value]))).toThrow();
  });

  it.each([[], null, {}, 'legacy'])('never interprets malformed explicit funding as absent: %j', funding => {
    expect(validateExpenseFunding(expense({ funding }), members).success).toBe(false);
  });

  it('rejects offsetting negative funding despite a conserving sum', () => {
    expect(validateExpenseFunding(expense({ funding: [
      { memberId: 'A', amount: 120 }, { memberId: 'B', amount: -20 },
    ] }), members).success).toBe(false);
  });

  it('does not hide unequal tiny values under a fixed tolerance', () => {
    expect(validateExpenseFunding(expense({ amount: 1e-10, funding: [
      { memberId: 'A', amount: 2e-10 },
    ] }), members)).toMatchObject({ success: false, code: 'FUND-001' });
  });

  it('conserves decimal input values without epsilon or input rounding', () => {
    const value = expense({ amount: 0.3, funding: [
      { memberId: 'A', amount: 0.1 }, { memberId: 'B', amount: 0.2 },
    ] });
    expect(validateExpenseFunding(value, members).success).toBe(true);
    expect(validateExpenseFunding({ ...value, amount: 0.1 + 0.2 }, members).success).toBe(false);
  });

  it('rejects an outsider rather than discarding their credit', () => {
    const value = expense({ funding: [{ memberId: 'outside', amount: 100 }] });
    expect(validateExpenseFunding(value, members)).toMatchObject({ success: false, code: 'FUND-003' });
    expect(() => computeBalances(pot([value]))).toThrow();
  });

  it('rejects explicit cross-currency contribution or native calculation', () => {
    const value = expense({ funding: [{ memberId: 'A', amount: 100, currency: 'EUR' }] });
    expect(validateExpenseFunding(value, members)).toMatchObject({ success: false, code: 'FUND-002' });
    expect(() => computeBalances(pot([{ ...native(), currency: 'EUR' }]))).toThrow(/currencies/);
  });

  it('preserves each contributor and each balance, not only zero-sum', () => {
    const value = native();
    const original = structuredClone(value);
    expect(computeBalances(pot([value]))).toEqual([
      { memberId: 'A', net: 50 }, { memberId: 'B', net: -10 }, { memberId: 'C', net: -40 },
    ]);
    const read = getExpenseFunding(value, members);
    read[0]!.amount = 1;
    expect(value).toEqual(original);
  });

  it('keeps legacy and equivalent one-contribution calculations equal', () => {
    const legacy = expense();
    const one = expense({ funding: [{ memberId: 'A', amount: 100 }] });
    expect(computeBalances(pot([one]))).toEqual(computeBalances(pot([legacy])));
  });

  it('requires explicit native allocations and rejects a missing cent', () => {
    expect(() => computeBalances(pot([expense({ ...native(), split: undefined })]))).toThrow(/explicit/);
    const value = expense({ amount: 10, funding: [{ memberId: 'A', amount: 10 }],
      split: members.map(memberId => ({ memberId, amount: 3.33 })) });
    expect(() => computeBalances(pot([value]))).toThrow(/exactly/);
    value.split![0]!.amount = 3.34;
    expect(computeBalances(pot([value]))).toEqual([
      { memberId: 'A', net: 6.66 }, { memberId: 'B', net: -3.33 }, { memberId: 'C', net: -3.33 },
    ]);
  });

  it('preserves attribution across a deterministic funding matrix and permutations', () => {
    for (let paidA = 1; paidA < 60; paidA += 1) {
      const value = expense({ amount: 60,
        funding: [{ memberId: 'B', amount: 60 - paidA }, { memberId: 'A', amount: paidA }],
        split: [{ memberId: 'C', amount: 30 }, { memberId: 'A', amount: 10 }, { memberId: 'B', amount: 20 }],
      });
      expect(computeBalances(pot([value]))).toEqual([
        { memberId: 'A', net: paidA - 10 }, { memberId: 'B', net: 40 - paidA }, { memberId: 'C', net: -30 },
      ]);
    }
  });
});

describe('Funding core: storage boundaries', () => {
  it.each([native().funding, []])('rejects native creation before metadata or storage effects', async funding => {
    const h = harness();
    const input = expense({ funding }) as CreateExpenseDTO;
    await expect(h.service.addExpense('p1', input)).rejects.toThrow(/FUNDING_WRITE_UNSUPPORTED/);
    expect(h.saveExpense).not.toHaveBeenCalled();
    expect(h.potRepository.update).not.toHaveBeenCalled();
    expect(h.saved.size).toBe(0);
  });

  it('also protects callers using the repository directly', async () => {
    const h = harness();
    await expect(h.repository.create('p1', native() as CreateExpenseDTO)).rejects.toThrow(/FUNDING_WRITE_UNSUPPORTED/);
    expect(h.saveExpense).not.toHaveBeenCalled();
  });

  it('rejects amount-only changes to existing native funding without effects', async () => {
    const initial = native();
    const h = harness(initial);
    await expect(h.service.updateExpense('p1', 'e1', { amount: 120 })).rejects.toThrow(/FUNDING_WRITE_UNSUPPORTED/);
    expect(h.saved.get('e1')).toEqual(initial);
    expect(h.saveExpense).not.toHaveBeenCalled();
    expect(h.potRepository.update).not.toHaveBeenCalled();
  });

  it('cannot erase native funding to bypass the unsupported-storage guard', async () => {
    const initial = native();
    const h = harness(initial);
    const edit = { amount: 120, funding: undefined } as UpdateExpenseDTO;
    await expect(h.repository.update('p1', 'e1', edit)).rejects.toThrow(/FUNDING_WRITE_UNSUPPORTED/);
    expect(h.saved.get('e1')).toEqual(initial);
    expect(h.saveExpense).not.toHaveBeenCalled();
  });

  it('checks legacy amount and payer edits against the complete proposed record', async () => {
    const h = harness(expense());
    await expect(h.service.updateExpense('p1', 'e1', { amount: 120 })).rejects.toThrow(/SPLIT-003/);
    await expect(h.service.updateExpense('p1', 'e1', { amount: NaN })).rejects.toThrow(/FUNDING_AMOUNT/);
    await expect(h.service.updateExpense('p1', 'e1', { paidBy: 'outside' })).rejects.toThrow(/FUND-003/);
    expect(h.saveExpense).not.toHaveBeenCalled();
    expect(h.potRepository.update).not.toHaveBeenCalled();
  });

  it('legacy creation and editing still round-trip through the actual repository', async () => {
    const h = harness();
    const created = await h.service.addExpense('p1', expense() as CreateExpenseDTO);
    const stored = await h.repository.get('p1', created.id);
    expect(getExpenseFunding(stored, members)).toEqual([{ memberId: 'A', amount: 100 }]);
    expect(computeBalances(pot([stored]))).toEqual(computeBalances(pot([expense()])));
    const changed = await h.service.updateExpense('p1', created.id, { amount: 120,
      split: [{ memberId: 'A', amount: 24 }, { memberId: 'B', amount: 48 }, { memberId: 'C', amount: 48 }],
    });
    expect(getExpenseFunding(changed, members)).toEqual([{ memberId: 'A', amount: 120 }]);
    expect(h.saveExpense).toHaveBeenCalledTimes(2);
  });

  it('does not promote a valid native read to permission to persist it', () => {
    expect(validateExpenseFunding(native(), members).success).toBe(true);
    expect(validateLegacyExpenseWrite(native(), members)).toMatchObject({ success: false, code: 'FUNDING_WRITE_UNSUPPORTED' });
  });
});
