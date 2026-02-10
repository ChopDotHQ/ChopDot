import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PotRepository, type DataSource } from '../repositories/PotRepository';
import { ExpenseRepository } from '../repositories/ExpenseRepository';
import { MemberRepository } from '../repositories/MemberRepository';
import { SettlementRepository } from '../repositories/SettlementRepository';
import { PotService } from './PotService';
import { ExpenseService } from './ExpenseService';
import { MemberService } from './MemberService';
import { SettlementService } from './SettlementService';
import { runActionWithRecovery } from '../../../utils/actionRecovery';
import type { Pot } from '../types';

function createInMemorySource(): DataSource {
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
  };
}

describe('Action flows (fail -> recover -> pass)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates pot, adds members, fills with expenses, and suggests settlements', async () => {
    const source = createInMemorySource();
    const potRepo = new PotRepository(source);
    const expenseRepo = new ExpenseRepository(source);
    const memberRepo = new MemberRepository(source);
    const settlementRepo = new SettlementRepository();

    const pots = new PotService(potRepo);
    const expenses = new ExpenseService(expenseRepo, potRepo);
    const members = new MemberService(memberRepo);
    const settlements = new SettlementService(settlementRepo, potRepo);

    let potName = '';
    const created = await runActionWithRecovery(
      () => pots.createPot({ name: potName, type: 'expense', baseCurrency: 'USD', budgetEnabled: false }),
      [{ label: 'set valid pot name', run: () => { potName = 'Road Trip'; } }]
    );
    expect(created.value.name).toBe('Road Trip');
    expect(created.recoveredWith).toEqual(['set valid pot name']);

    const potId = created.value.id;
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy
      .mockReturnValueOnce(1_700_000_000_001)
      .mockReturnValueOnce(1_700_000_000_002)
      .mockReturnValueOnce(1_700_000_000_003)
      .mockReturnValueOnce(1_700_000_000_004);

    const alice = await members.addMember(potId, { potId, name: 'Alice' });
    const bob = await members.addMember(potId, { potId, name: 'Bob' });

    let amount = 0;
    await runActionWithRecovery(
      () => expenses.addExpense(potId, {
        potId,
        amount,
        currency: 'USD',
        paidBy: 'owner',
        memo: 'Dinner',
        split: [
          { memberId: 'owner', amount: 20 },
          { memberId: alice.id, amount: 20 },
          { memberId: bob.id, amount: 20 },
        ],
      }),
      [{ label: 'set positive amount', run: () => { amount = 60; } }]
    );

    await expenses.addExpense(potId, {
      potId,
      amount: 30,
      currency: 'USD',
      paidBy: alice.id,
      memo: 'Taxi',
      split: [
        { memberId: 'owner', amount: 15 },
        { memberId: alice.id, amount: 15 },
      ],
    });

    const listed = await expenses.listExpenses(potId);
    expect(listed.length).toBe(2);

    const suggestions = await settlements.suggest(potId);
    expect(suggestions.length).toBeGreaterThan(0);
  });
});
