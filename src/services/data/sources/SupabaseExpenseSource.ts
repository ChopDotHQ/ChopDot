import type { SupabaseClient } from '@supabase/supabase-js';
import type { Expense, ExpenseSummary } from '../types';
import type { ExpenseListOptions } from '../repositories/ExpenseRepository';
import type { SupabaseExpenseRow, SupabaseExpenseSplitRow } from '../types/supabase';
import { getOptionalUserId, requireAuthenticatedUser } from './supabase-auth-helper';
import { isUuid, stripUndefined } from './supabase-utils';
import { mapExpenseRow, normalizeExpenseId } from './expense-row-mapper';
import { fromMinorAmount, toMinorAmount } from '../utils/amounts';
import type { LocalStorageSource } from './LocalStorageSource';

export class SupabaseExpenseSource {
  constructor(
    private client: SupabaseClient,
    private guestSource: LocalStorageSource,
  ) {}

  async listExpenses(potId: string, options?: ExpenseListOptions): Promise<Expense[]> {
    const userId = await getOptionalUserId(this.client, 'read expenses');
    if (!userId) {
      return this.guestSource.listExpenses(potId, options);
    }

    const selectColumns = [
      'id', 'pot_id', 'creator_id', 'paid_by', 'amount_minor',
      'currency_code', 'description', 'expense_date', 'created_at',
      'legacy_id', 'metadata',
    ].join(',');

    const buildQuery = () =>
      this.client
        .from('expenses')
        .select(selectColumns)
        .eq('pot_id', potId)
        .order('expense_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

    const fetchPage = async (offset: number, limit: number) => {
      const { data, error } = await buildQuery().range(offset, offset + limit - 1);
      if (error) {
        throw new Error(`[SupabaseSource] Failed to fetch expenses: ${error.message}`);
      }
      return (data ?? []) as unknown as SupabaseExpenseRow[];
    };

    let rows: SupabaseExpenseRow[] = [];
    if (options && (options.limit !== undefined || options.offset !== undefined)) {
      const limit = options.limit ?? 50;
      const offset = options.offset ?? 0;
      rows = await fetchPage(offset, limit);
    } else {
      const pageSize = 200;
      let offset = 0;
      while (true) {
        const page = await fetchPage(offset, pageSize);
        rows = rows.concat(page);
        if (page.length < pageSize) break;
        offset += pageSize;
      }
    }

    const splitsByExpenseId = await this.fetchExpenseSplits(rows.map((row) => row.id));
    return rows.map((row) => mapExpenseRow(row, splitsByExpenseId.get(row.id)));
  }

  async getExpense(potId: string, expenseId: string): Promise<Expense | null> {
    const userId = await getOptionalUserId(this.client, 'read expense');
    if (!userId) {
      return this.guestSource.getExpense(potId, expenseId);
    }

    if (!isUuid(expenseId) || !isUuid(potId)) {
      return this.guestSource.getExpense(potId, expenseId);
    }

    const { data, error } = await this.client
      .from('expenses')
      .select('id,pot_id,creator_id,paid_by,amount_minor,currency_code,description,expense_date,created_at,legacy_id,metadata')
      .eq('id', expenseId)
      .eq('pot_id', potId)
      .maybeSingle();

    if (error) {
      throw new Error(`[SupabaseSource] Failed to fetch expense ${expenseId}: ${error.message}`);
    }
    if (!data) {
      return null;
    }

    const splitMap = await this.fetchExpenseSplits([expenseId]);
    return mapExpenseRow(data as SupabaseExpenseRow, splitMap.get(expenseId));
  }

  async saveExpense(potId: string, expense: Expense): Promise<void> {
    const userId = await getOptionalUserId(this.client, 'modify expense');

    if (!userId) {
      await this.guestSource.saveExpense(potId, expense);
      return;
    }

    const normalized = normalizeExpenseId(expense);

    const { data: existing, error: existingError } = await this.client
      .from('expenses')
      .select('id, creator_id')
      .eq('id', normalized.id)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      throw new Error(`[SupabaseSource] Failed to inspect expense ${normalized.id}: ${existingError.message}`);
    }

    const creatorId = (existing as { creator_id?: string } | null)?.creator_id ?? userId;
    const legacyId = (normalized as { legacyId?: string; legacy_id?: string }).legacyId
      ?? (normalized as { legacy_id?: string }).legacy_id;
    const resolvedPaidBy = normalized.paidBy === 'owner' ? userId : (normalized.paidBy || userId);
    const payload = {
      id: normalized.id,
      pot_id: potId,
      creator_id: creatorId,
      paid_by: resolvedPaidBy,
      amount_minor: toMinorAmount(expense.amount),
      currency_code: expense.currency ?? 'USD',
      description: expense.memo ?? (expense as any).description ?? '',
      expense_date: expense.date ? new Date(expense.date).toISOString() : null,
      legacy_id: legacyId ?? null,
      metadata: stripUndefined({
        split: expense.split ?? [],
        attestations: expense.attestations ?? [],
        hasReceipt: expense.hasReceipt ?? false,
        receiptUrl: expense.receiptUrl,
        memo: expense.memo,
        description: (expense as any).description,
      }),
    };

    const { error } = await this.client
      .from('expenses')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      throw new Error(`[SupabaseSource] Failed to save expense ${expense.id}: ${error.message}`);
    }

    await this.client
      .from('expense_splits')
      .delete()
      .eq('expense_id', expense.id);

    const splits = (expense.split ?? []).filter((split) => split.amount > 0);
    if (splits.length > 0) {
      const splitRows = splits.map((split) => ({
        expense_id: expense.id,
        member_id: split.memberId === 'owner' ? userId : split.memberId,
        amount_minor: toMinorAmount(split.amount),
      }));
      const { error: splitError } = await this.client
        .from('expense_splits')
        .insert(splitRows);
      if (splitError) {
        throw new Error(`[SupabaseSource] Failed to save expense splits: ${splitError.message}`);
      }
    }
  }

  async deleteExpense(potId: string, expenseId: string): Promise<void> {
    const userId = await getOptionalUserId(this.client, 'delete expense');
    if (!userId) {
      await this.guestSource.deleteExpense(potId, expenseId);
      return;
    }
    const { error } = await this.client
      .from('expenses')
      .delete()
      .eq('id', expenseId)
      .eq('pot_id', potId);
    if (error) {
      throw new Error(`[SupabaseSource] Failed to delete expense ${expenseId}: ${error.message}`);
    }
  }

  async getExpenseSummaries(
    potIds: string[],
    userId: string,
  ): Promise<Record<string, ExpenseSummary>> {
    const resolvedUserId = userId || (await requireAuthenticatedUser(this.client, 'read expense summaries'));
    const uuidPotIds = potIds.filter((id) => isUuid(id));
    if (uuidPotIds.length === 0) {
      return {};
    }

    const { data: expenseRows, error } = await this.client
      .from('expenses')
      .select('id, pot_id, amount_minor, paid_by')
      .in('pot_id', uuidPotIds);

    if (error) {
      throw new Error(`[SupabaseSource] Failed to load expense summaries: ${error.message}`);
    }

    const totals: Record<string, ExpenseSummary> = {};
    const expenseIdToPotId = new Map<string, string>();
    for (const row of (expenseRows ?? []) as Array<{ id: string; pot_id: string; amount_minor: number | string; paid_by: string | null }>) {
      const potId = row.pot_id;
      const amount = fromMinorAmount(row.amount_minor);
      expenseIdToPotId.set(row.id, potId);
      if (!totals[potId]) {
        totals[potId] = {
          potId,
          totalExpenses: 0,
          myExpenses: 0,
          myShare: 0,
        };
      }
      totals[potId].totalExpenses += amount;
      if (row.paid_by === resolvedUserId) {
        totals[potId].myExpenses += amount;
      }
    }

    const expenseIds = Array.from(expenseIdToPotId.keys());
    if (expenseIds.length === 0) {
      return totals;
    }

    const { data: splitRows, error: splitError } = await this.client
      .from('expense_splits')
      .select('expense_id, member_id, amount_minor')
      .in('expense_id', expenseIds)
      .eq('member_id', resolvedUserId);

    if (splitError) {
      throw new Error(`[SupabaseSource] Failed to load expense splits summary: ${splitError.message}`);
    }

    for (const split of (splitRows ?? []) as SupabaseExpenseSplitRow[]) {
      const potId = expenseIdToPotId.get(split.expense_id);
      if (!potId || !totals[potId]) continue;
      totals[potId].myShare += fromMinorAmount(split.amount_minor);
    }

    return totals;
  }

  private async fetchExpenseSplits(expenseIds: string[]): Promise<Map<string, Expense['split']>> {
    const result = new Map<string, Expense['split']>();
    if (expenseIds.length === 0) {
      return result;
    }

    const { data, error } = await this.client
      .from('expense_splits')
      .select('expense_id, member_id, amount_minor')
      .in('expense_id', expenseIds);

    if (error) {
      console.warn('[SupabaseSource] Failed to fetch expense splits', error.message);
      return result;
    }

    const rows = (data ?? []) as SupabaseExpenseSplitRow[];
    for (const row of rows) {
      const list = result.get(row.expense_id) ?? [];
      list.push({
        memberId: row.member_id,
        amount: fromMinorAmount(row.amount_minor),
      });
      result.set(row.expense_id, list);
    }

    return result;
  }
}
