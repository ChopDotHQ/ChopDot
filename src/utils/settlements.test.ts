
import { describe, expect, it } from 'vitest';
import { calculatePotSettlements, calculateSettlements } from './settlements';

const mockMember = (id: string, name: string) => ({
  id,
  name,
  role: 'Member' as const,
  status: 'active' as const,
});

const mockExpense = (overrides: Record<string, unknown>) => ({
  id: 'expense-1',
  amount: 0,
  currency: 'USD',
  paidBy: 'owner',
  memo: 'Expense',
  date: '2026-01-01',
  split: [],
  attestations: [],
  hasReceipt: false,
  ...overrides,
});

describe('Settlement Logic', () => {
  it('handles simple 2-person split correctly', () => {
    const pot = {
      id: 'pot1',
      name: 'Test Pot',
      baseCurrency: 'USD',
      members: [mockMember('A', 'Alice'), mockMember('B', 'Bob')],
      expenses: [
        mockExpense({
          id: 'exp1',
          amount: 100,
          paidBy: 'A',
          memo: 'Lunch',
          split: [
            { memberId: 'A', amount: 50 },
            { memberId: 'B', amount: 50 },
          ],
        }),
      ],
    };

    const result = calculatePotSettlements(pot, 'B');
    expect(result.youOwe).toHaveLength(1);
    expect(result.youOwe[0]?.id).toBe('A');
    expect(result.youOwe[0]?.totalAmount).toBe(50);
  });

  it('handles 3-way floating point splits without drifting', () => {
    const pot = {
      id: 'pot2',
      name: 'Split Pot',
      baseCurrency: 'USD',
      members: [mockMember('A', 'Alice'), mockMember('B', 'Bob'), mockMember('C', 'Charlie')],
      expenses: [
        mockExpense({
          id: 'exp2',
          amount: 10,
          paidBy: 'A',
          memo: 'Dinner',
          split: [
            { memberId: 'A', amount: 3.34 },
            { memberId: 'B', amount: 3.33 },
            { memberId: 'C', amount: 3.33 },
          ],
        }),
      ],
    };

    const resultB = calculatePotSettlements(pot, 'B');
    const resultC = calculatePotSettlements(pot, 'C');
    const resultA = calculatePotSettlements(pot, 'A');

    expect(resultB.youOwe[0]?.totalAmount).toBeCloseTo(3.33, 2);
    expect(resultC.youOwe[0]?.totalAmount).toBeCloseTo(3.33, 2);
    expect(resultA.owedToYou.find((person) => person.id === 'B')?.totalAmount).toBeCloseTo(3.33, 2);
    expect(resultA.owedToYou.find((person) => person.id === 'C')?.totalAmount).toBeCloseTo(3.33, 2);
  });

  it('nets multiple expenses with mixed payers correctly inside one pot', () => {
    const pot = {
      id: 'pot3',
      name: 'Road Trip',
      baseCurrency: 'USD',
      members: [mockMember('owner', 'You'), mockMember('alice', 'Alice'), mockMember('bob', 'Bob')],
      expenses: [
        mockExpense({
          id: 'hotel',
          amount: 90,
          paidBy: 'owner',
          split: [
            { memberId: 'owner', amount: 30 },
            { memberId: 'alice', amount: 30 },
            { memberId: 'bob', amount: 30 },
          ],
        }),
        mockExpense({
          id: 'fuel',
          amount: 30,
          paidBy: 'alice',
          split: [
            { memberId: 'owner', amount: 15 },
            { memberId: 'alice', amount: 15 },
          ],
        }),
      ],
    };

    const result = calculatePotSettlements(pot, 'owner');
    expect(result.owedToYou.find((person) => person.id === 'bob')?.totalAmount).toBeCloseTo(30, 2);
    expect(result.owedToYou.find((person) => person.id === 'alice')?.totalAmount).toBeCloseTo(15, 2);
  });

  it('aggregates across multiple pots and ignores archived pots', () => {
    const activePot = {
      id: 'pot-active',
      name: 'Trip',
      baseCurrency: 'USD',
      archived: false,
      members: [mockMember('owner', 'You'), mockMember('alice', 'Alice')],
      expenses: [
        mockExpense({
          id: 'trip-1',
          amount: 40,
          paidBy: 'owner',
          split: [
            { memberId: 'owner', amount: 20 },
            { memberId: 'alice', amount: 20 },
          ],
        }),
      ],
    };

    const archivedPot = {
      id: 'pot-archived',
      name: 'Old Pot',
      baseCurrency: 'USD',
      archived: true,
      members: [mockMember('owner', 'You'), mockMember('alice', 'Alice')],
      expenses: [
        mockExpense({
          id: 'archived-1',
          amount: 50,
          paidBy: 'owner',
          split: [
            { memberId: 'owner', amount: 25 },
            { memberId: 'alice', amount: 25 },
          ],
        }),
      ],
    };

    const people = [
      { id: 'alice', name: 'Alice', balance: 0, trustScore: 95, paymentPreference: 'Bank', potCount: 2 },
    ];

    const result = calculateSettlements([activePot, archivedPot], people, 'owner');
    expect(result.owedToYou).toHaveLength(1);
    expect(result.owedToYou[0]?.totalAmount).toBeCloseTo(20, 2);
  });

  it('keeps the balance invariant after edit/delete style changes', () => {
    const beforeDelete = {
      id: 'pot-edit',
      name: 'House',
      baseCurrency: 'USD',
      members: [mockMember('owner', 'You'), mockMember('alice', 'Alice')],
      expenses: [
        mockExpense({
          id: 'rent',
          amount: 100,
          paidBy: 'owner',
          split: [
            { memberId: 'owner', amount: 50 },
            { memberId: 'alice', amount: 50 },
          ],
        }),
        mockExpense({
          id: 'utilities',
          amount: 20,
          paidBy: 'alice',
          split: [
            { memberId: 'owner', amount: 10 },
            { memberId: 'alice', amount: 10 },
          ],
        }),
      ],
    };

    const afterEdit = {
      ...beforeDelete,
      expenses: beforeDelete.expenses.map((expense) =>
        expense.id === 'utilities'
          ? {
              ...expense,
              amount: 30,
              split: [
                { memberId: 'owner', amount: 15 },
                { memberId: 'alice', amount: 15 },
              ],
            }
          : expense,
      ),
    };

    const afterDelete = {
      ...afterEdit,
      expenses: afterEdit.expenses.filter((expense) => expense.id !== 'utilities'),
    };

    const beforeResult = calculatePotSettlements(beforeDelete, 'owner');
    const editedResult = calculatePotSettlements(afterEdit, 'owner');
    const deletedResult = calculatePotSettlements(afterDelete, 'owner');

    expect(beforeResult.owedToYou[0]?.totalAmount).toBeCloseTo(40, 2);
    expect(editedResult.owedToYou[0]?.totalAmount).toBeCloseTo(35, 2);
    expect(deletedResult.owedToYou[0]?.totalAmount).toBeCloseTo(50, 2);
  });

  it('drops negligible DOT balances below the settlement threshold', () => {
    const tinyAmount = 0.0000000001;
    const pot = {
      id: 'pot-dot',
      name: 'Crypto Pot',
      baseCurrency: 'DOT',
      members: [mockMember('A', 'Alice'), mockMember('B', 'Bob')],
      expenses: [
        mockExpense({
          id: 'exp3',
          amount: tinyAmount,
          currency: 'DOT',
          paidBy: 'A',
          memo: 'Gas',
          split: [
            { memberId: 'A', amount: tinyAmount / 2 },
            { memberId: 'B', amount: tinyAmount / 2 },
          ],
        }),
      ],
    };

    const result = calculatePotSettlements(pot, 'B');
    expect(result.youOwe).toHaveLength(0);
  });
});
