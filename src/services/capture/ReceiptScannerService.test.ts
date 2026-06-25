import { describe, expect, it } from 'vitest';
import {
  parseReceiptText,
  receiptScanToItems,
  receiptScanToPaymentRef,
} from './ReceiptScannerService';

const sampleReceipt = [
  'Zurich Trattoria',
  '24.06.2026',
  'Pasta 38.00',
  'Salad 22.00',
  'Wine 60.00',
  'Total CHF 120.00',
].join('\n');

describe('ReceiptScannerService', () => {
  it('reconstructs merchant, date, total, and item rows from receipt text', () => {
    const scan = parseReceiptText(sampleReceipt);

    expect(scan.merchantName).toBe('Zurich Trattoria');
    expect(scan.date).toBe('24.06.2026');
    expect(scan.total).toBe(120);
    expect(scan.confidence).toBe('high');
    expect(scan.items).toEqual([
      { label: 'Pasta', amount: 38 },
      { label: 'Salad', amount: 22 },
      { label: 'Wine', amount: 60 },
    ]);
  });

  it('turns a scan into payment and split rows without treating it as confirmed payment', () => {
    const scan = parseReceiptText(sampleReceipt);
    const payment = receiptScanToPaymentRef(scan, 'CHF');
    const items = receiptScanToItems(scan, ['mina', 'leo', 'nina']);

    expect(payment.kind).toBe('receipt');
    expect(payment.status).toBe('observed');
    expect(payment.display).toBe('Zurich Trattoria · 120.00 CHF');
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({
      label: 'Pasta',
      amount: 38,
      assignedMemberIds: ['mina', 'leo', 'nina'],
    });
  });

  it('falls back to one total row when item rows are not readable', () => {
    const scan = parseReceiptText(['Zurich Trattoria', '24.06.2026', 'Total CHF 120.00'].join('\n'));
    const items = receiptScanToItems(scan, ['mina', 'leo']);

    expect(scan.confidence).toBe('medium');
    expect(items).toEqual([
      expect.objectContaining({
        label: 'Zurich Trattoria receipt',
        amount: 120,
        assignedMemberIds: ['mina', 'leo'],
      }),
    ]);
  });
});
