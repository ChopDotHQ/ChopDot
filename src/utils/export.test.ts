import { describe, expect, it } from 'vitest';
import { buildPotExpensesCSVContent, buildPotsSummaryCSVContent, buildSettlementsHistoryCSVContent } from './export';

describe('buildPotExpensesCSVContent', () => {
  it('builds expense rows with owner split and receipt status', () => {
    const csv = buildPotExpensesCSVContent(
      'Trip',
      [
        {
          id: 'e1',
          amount: 30,
          currency: 'USD',
          paidBy: 'owner',
          memo: 'Lunch',
          date: '2026-01-01T00:00:00.000Z',
          split: [{ memberId: 'owner', amount: 10 }],
          attestations: [],
          hasReceipt: true,
        },
      ],
      [{ id: 'owner', name: 'You', role: 'Owner', status: 'active' }],
      'owner',
    );

    expect(csv).toContain('Date,Memo,Amount,Currency,Paid By,Your Split,Receipt');
    expect(csv).toContain('Lunch,30.00,USD,You,10.00');
    expect(csv).toContain('✓ Yes');
  });
});

describe('buildPotsSummaryCSVContent', () => {
  it('builds summary rows', () => {
    const csv = buildPotsSummaryCSVContent([
      {
        id: 'p1',
        name: 'Trip',
        type: 'expense',
        baseCurrency: 'USD',
        members: [{ id: 'owner', name: 'You', role: 'Owner', status: 'active' }],
        expenses: [],
      },
    ]);

    expect(csv).toContain('Pot Name,Type,Members,Total Expenses,Expense Count,Currency,Your Balance');
    expect(csv).toContain('Trip,expense,1,0.00,0,USD,0.00');
  });
});

describe('buildSettlementsHistoryCSVContent', () => {
  it('includes headers and settlement rows sorted by date desc', () => {
    const csv = buildSettlementsHistoryCSVContent([
      {
        id: '1',
        method: 'cash',
        personName: 'Alice',
        amount: 10,
        currency: 'USD',
        date: '2026-01-01T00:00:00.000Z',
      },
      {
        id: '2',
        method: 'usdc',
        personName: 'Bob',
        amount: 2.5,
        currency: 'USDC',
        date: '2026-01-02T00:00:00.000Z',
        txHash: '0xabc',
        potNames: ['Trip'],
      },
    ]);

    const lines = csv.split('\n');
    expect(lines[0]).toContain('Date,Person,Method,Amount,Currency,Pots,Tx Hash');
    expect(lines[1]).toContain('Bob,USDC,2.500000,USDC,Trip,0xabc');
    expect(lines[2]).toContain('Alice,Cash,10.000000,USD');
  });

  it('escapes cells that contain commas', () => {
    const csv = buildSettlementsHistoryCSVContent([
      {
        id: '1',
        method: 'paypal',
        personName: 'Doe, John',
        amount: 12.34,
        currency: 'USD',
        date: '2026-01-01T00:00:00.000Z',
        potNames: ['A, B'],
      },
    ]);

    expect(csv).toContain('"Doe, John"');
    expect(csv).toContain('"A, B"');
  });
});
