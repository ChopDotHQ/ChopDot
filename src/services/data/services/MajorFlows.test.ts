import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PotRepository, type DataSource } from '../repositories/PotRepository';
import { ExpenseRepository, type ExpenseDataSource } from '../repositories/ExpenseRepository';
import { MemberRepository } from '../repositories/MemberRepository';
import { SettlementRepository } from '../repositories/SettlementRepository';
import { PotService } from './PotService';
import { ExpenseService } from './ExpenseService';
import { MemberService } from './MemberService';
import { SettlementService } from './SettlementService';
import type { Expense, Pot } from '../types';

function createInMemorySource(): DataSource & ExpenseDataSource {
  const pots = new Map<string, Pot>();

  return {
    async getPots(options) {
      const all = Array.from(pots.values());
      if (!options || (options.limit === undefined && options.offset === undefined)) return all;
      const offset = options.offset ?? 0;
      const limit = options.limit ?? all.length;
      return all.slice(offset, offset + limit);
    },
    async getPot(id) {
      return pots.get(id) ?? null;
    },
    async savePots(nextPots) {
      pots.clear();
      nextPots.forEach((pot) => pots.set(pot.id, pot));
    },
    async savePot(pot) {
      pots.set(pot.id, pot);
    },
    async deletePot(id) {
      pots.delete(id);
    },
    async exportPot(id) {
      const pot = pots.get(id);
      if (!pot) throw new Error('Pot not found');
      return pot;
    },
    async importPot(pot) {
      pots.set(pot.id, pot);
      return pot;
    },
    async listExpenses(potId, options) {
      const pot = pots.get(potId);
      if (!pot) throw new Error('Pot not found');
      const expenses = [...(pot.expenses ?? [])] as Expense[];
      if (!options || (options.limit === undefined && options.offset === undefined)) {
        return expenses;
      }
      const offset = options.offset ?? 0;
      const limit = options.limit ?? expenses.length;
      return expenses.slice(offset, offset + limit);
    },
    async getExpense(potId, expenseId) {
      const pot = pots.get(potId);
      if (!pot) throw new Error('Pot not found');
      return ((pot.expenses ?? []) as Expense[]).find((expense) => expense.id === expenseId) ?? null;
    },
    async saveExpense(potId, expense) {
      const pot = pots.get(potId);
      if (!pot) throw new Error('Pot not found');
      const expenses = (pot.expenses ?? []) as Expense[];
      const index = expenses.findIndex((item) => item.id === expense.id);
      const next = [...expenses];
      if (index >= 0) {
        next[index] = expense;
      } else {
        next.push(expense);
      }
      pots.set(potId, { ...pot, expenses: next });
    },
    async deleteExpense(potId, expenseId) {
      const pot = pots.get(potId);
      if (!pot) throw new Error('Pot not found');
      const expenses = (pot.expenses ?? []) as Expense[];
      pots.set(potId, { ...pot, expenses: expenses.filter((expense) => expense.id !== expenseId) });
    },
  };
}

describe('Major MVP service flows', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('covers expense pot lifecycle: settings, members, expenses, settlements, archive', async () => {
    const source = createInMemorySource();
    const potRepo = new PotRepository(source);
    const expenseRepo = new ExpenseRepository(source);
    const memberRepo = new MemberRepository(source);
    const settlementRepo = new SettlementRepository();

    const pots = new PotService(potRepo);
    const expenses = new ExpenseService(expenseRepo, potRepo);
    const members = new MemberService(memberRepo, potRepo as any);
    const settlements = new SettlementService(settlementRepo, potRepo);

    const created = await pots.createPot({
      name: 'Trip Fund',
      type: 'expense',
      baseCurrency: 'USD',
      budgetEnabled: false,
    });

    const potId = created.id;

    const updated = await pots.updatePot(potId, {
      name: 'Road Trip Fund',
      baseCurrency: 'USDC',
      budgetEnabled: true,
      budget: 500,
    });

    expect(updated.name).toBe('Road Trip Fund');
    expect(updated.baseCurrency).toBe('USDC');
    expect(updated.budgetEnabled).toBe(true);
    expect(updated.budget).toBe(500);

    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy
      .mockReturnValueOnce(1_700_000_000_001)
      .mockReturnValueOnce(1_700_000_000_002);

    const alice = await members.addMember(potId, { potId, name: 'Alice' });
    const bob = await members.addMember(potId, { potId, name: 'Bob' });

    await members.updateMember(potId, alice.id, { name: 'Alice Liddell', verified: true });

    const expenseA = await expenses.addExpense(potId, {
      potId,
      amount: 90,
      currency: 'USDC',
      paidBy: 'owner',
      memo: 'Hotel',
      split: [
        { memberId: 'owner', amount: 30 },
        { memberId: alice.id, amount: 30 },
        { memberId: bob.id, amount: 30 },
      ],
    });

    await expenses.addExpense(potId, {
      potId,
      amount: 30,
      currency: 'USDC',
      paidBy: alice.id,
      memo: 'Fuel',
      split: [
        { memberId: 'owner', amount: 15 },
        { memberId: alice.id, amount: 15 },
      ],
    });

    const listedExpenses = await expenses.listExpenses(potId);
    expect(listedExpenses.length).toBe(2);

    const suggestions = await settlements.suggest(potId);
    expect(suggestions.every((s) => s.to === 'owner')).toBe(true);
    expect(suggestions.reduce((sum, s) => sum + Number(s.amount), 0)).toBe(45);

    await settlements.recordOnchainSettlement(potId, {
      id: 'usdc-1',
      when: Date.now(),
      type: 'onchain_settlement',
      fromMemberId: alice.id,
      toMemberId: 'owner',
      fromAddress: 'addr1',
      toAddress: 'addr2',
      amountUsdc: '15.000000',
      assetId: 1337,
      txHash: '0xusdc',
      status: 'finalized',
    });

    const withHistory = await pots.getPot(potId);
    expect(withHistory.history?.some((entry: any) => entry.type === 'onchain_settlement' && entry.amountUsdc === '15.000000')).toBe(true);

    await expenses.removeExpense(potId, expenseA.id);
    await members.removeMember(potId, bob.id);

    const afterRemovals = await pots.getPot(potId);
    expect(afterRemovals.members.some((m) => m.id === bob.id)).toBe(false);
    expect((afterRemovals.expenses ?? []).length).toBe(1);

    const exported = await pots.exportPot(potId);
    const imported = await pots.importPot(exported);
    expect(imported.id).toBe(exported.id);

    const archived = await pots.updatePot(potId, { archived: true });
    expect(archived.archived).toBe(true);
  });

  it('covers savings pot creation flow with goals', async () => {
    const source = createInMemorySource();
    const potRepo = new PotRepository(source);
    const pots = new PotService(potRepo);

    const created = await pots.createPot({
      name: 'House Deposit',
      type: 'savings',
      baseCurrency: 'USD',
      goalAmount: 25000,
      goalDescription: 'First home deposit',
      budgetEnabled: false,
    });

    expect(created.type).toBe('savings');
    expect(created.goalAmount).toBe(25000);
    expect(created.goalDescription).toBe('First home deposit');
    expect(created.contributions).toEqual([]);
  });
});
