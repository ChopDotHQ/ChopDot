// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { computeBalances, suggestSettlements, Balance } from './calc';
import { Pot } from '../../schema/pot';
import Decimal from 'decimal.js';

// Mock Pot helper
const createMockPot = (members: string[], expenses: any[]): Pot => ({
  id: 'test-pot',
  name: 'Test Pot',
  type: 'expense',
  baseCurrency: 'USD',
  members: members.map(id => ({ id, name: id })),
  expenses: expenses.map((e, i) => ({
    id: `exp-${i}`,
    description: 'test',
    amount: e.amount,
    paidBy: e.paidBy,
    split: e.split,
    createdAt: Date.now(),
  })),
  history: [],
  budgetEnabled: false,
  checkpointEnabled: false,
  archived: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
} as unknown as Pot);

describe('Settlement Logic (Decimal Precision)', () => {
  it('handles basic even split', () => {
    // A pays 30, split equally A, B, C
    // A pays 30. Cost per person 10.
    // A net: +20, B net: -10, C net: -10
    const pot = createMockPot(['A', 'B', 'C'], [
      { amount: 30, paidBy: 'A' }
    ]);
    const balances = computeBalances(pot);
    
    const balA = balances.find(b => b.memberId === 'A')?.net || 0;
    const balB = balances.find(b => b.memberId === 'B')?.net || 0;
    const balC = balances.find(b => b.memberId === 'C')?.net || 0;

    expect(balA).toBe(20);
    expect(balB).toBe(-10);
    expect(balC).toBe(-10);
  });

  it('handles 3-way split with repeating decimal (100 / 3)', () => {
    // A pays 100, split A, B, C
    // Each owes 33.3333333333...
    // A net: 100 - 33.333... = 66.666...
    // B net: -33.333...
    // C net: -33.333...
    const pot = createMockPot(['A', 'B', 'C'], [
      { amount: 100, paidBy: 'A' }
    ]);
    const balances = computeBalances(pot);
    
    // Sum should be effectively 0
    const sum = balances.reduce((acc, b) => acc + b.net, 0);
    expect(Math.abs(sum)).toBeLessThan(1e-9); // Standard float epsilon check
  });

  it('handles floating point addition error (0.1 + 0.2)', () => {
    // A pays 0.1, B pays 0.2. Total 0.3.
    // Split A, B. Each owes 0.15.
    // A paid 0.1, owes 0.15 -> net -0.05
    // B paid 0.2, owes 0.15 -> net +0.05
    const pot = createMockPot(['A', 'B'], [
      { amount: 0.1, paidBy: 'A' },
      { amount: 0.2, paidBy: 'B' }
    ]);
    const balances = computeBalances(pot);
    
    const balA = balances.find(b => b.memberId === 'A')?.net || 0;
    const balB = balances.find(b => b.memberId === 'B')?.net || 0;

    expect(balA).toBe(-0.05);
    expect(balB).toBe(0.05);
  });

  it('resolves circular debt', () => {
    // A pays 10 for B
    // B pays 10 for C
    // C pays 10 for A
    // Net should be 0 for all
    const pot = createMockPot(['A', 'B', 'C'], [
      { amount: 10, paidBy: 'A', split: [{ memberId: 'B', amount: 10 }] },
      { amount: 10, paidBy: 'B', split: [{ memberId: 'C', amount: 10 }] },
      { amount: 10, paidBy: 'C', split: [{ memberId: 'A', amount: 10 }] },
    ]);
    const balances = computeBalances(pot);
    
    balances.forEach(b => {
      expect(Math.abs(b.net)).toBeLessThan(1e-9);
    });
  });

  it('handles crypto precision (small DOT amounts)', () => {
    // 1 Planck = 1e-10 DOT
    // A pays 0.0000000003 DOT (3 Planck)
    // Split 3 ways: A, B, C
    // Each owes 0.0000000001
    // A net: +0.0000000002
    // B net: -0.0000000001
    // C net: -0.0000000001
    const amount = 0.0000000003;
    const pot = createMockPot(['A', 'B', 'C'], [
      { amount, paidBy: 'A' }
    ]);
    const balances = computeBalances(pot);
    
    const balB = balances.find(b => b.memberId === 'B')?.net || 0;
    
    // In standard JS math, this might have artifacts, but check logic
    expect(balB).toBeCloseTo(-0.0000000001, 10);
  });
});
