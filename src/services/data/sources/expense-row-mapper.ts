import type { Expense } from '../types';
import type { SupabaseExpenseRow } from '../types/supabase';
import { fromMinorAmount } from '../utils/amounts';
import { isUuid } from './supabase-utils';

export function mapExpenseRow(row: SupabaseExpenseRow, splitsOverride?: Expense['split']): Expense {
  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  const memo = (metadata.memo as string | undefined)
    ?? (metadata.description as string | undefined)
    ?? row.description
    ?? '';
  const paidByFromMetadata = typeof metadata.paidBy === 'string' ? metadata.paidBy : undefined;
  const splitFromMetadata = Array.isArray(metadata.split)
    ? (metadata.split as Array<{ memberId: string; amount: number }>)
    : [];
  const amountFromRow = fromMinorAmount(row.amount_minor, row.currency_code);
  const splitTotal = splitFromMetadata.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);

  return {
    id: row.id,
    potId: row.pot_id,
    amount: amountFromRow > 0 ? amountFromRow : splitTotal,
    currency: row.currency_code ?? 'USD',
    paidBy: paidByFromMetadata ?? row.paid_by ?? row.creator_id,
    memo,
    date: row.expense_date ?? row.created_at ?? new Date().toISOString(),
    split: splitsOverride ?? splitFromMetadata,
    attestations: (metadata.attestations as Expense['attestations']) ?? [],
    hasReceipt: (metadata.hasReceipt as boolean | undefined) ?? false,
    receiptUrl: metadata.receiptUrl as string | undefined,
  };
}

export function normalizeExpenseId(expense: Expense): Expense {
  if (isUuid(expense.id)) {
    return expense;
  }

  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  const newId = cryptoObj?.randomUUID
    ? cryptoObj.randomUUID()
    : `expense-${Math.random().toString(36).slice(2, 10)}`;

  return {
    ...expense,
    id: newId,
    legacyId: expense.id,
  } as Expense & { legacyId: string };
}
