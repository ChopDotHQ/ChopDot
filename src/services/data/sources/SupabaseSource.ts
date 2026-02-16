import type { DataSource, ListOptions } from '../repositories/PotRepository';
import type { ExpenseListOptions } from '../repositories/ExpenseRepository';
import type { Expense, ExpenseSummary, Pot } from '../types';
import { PotSchema, isBaseCurrency } from '../../../schema/pot';
import { getSupabase } from '../../../utils/supabase-client';
import { LocalStorageSource } from './LocalStorageSource';
import type { SupabaseExpenseRow, SupabaseExpenseSplitRow, SupabasePotRow } from '../types/supabase';
import { AuthError, ValidationError } from '../errors';
import { fromMinorAmount, toMinorAmount } from '../utils/amounts';

/**
 * SupabaseSource
 *
 * Skeleton implementation of the DataSource interface backed by Supabase.
 * Methods currently throw to make it clear they still need implementation.
 * This allows us to land the feature-flag plumbing without silently falling
 * back to localStorage.
 */
const DEFAULT_MEMBER = {
  id: 'owner',
  name: 'You',
  role: 'Owner',
  status: 'active',
} as const;

const POT_COLUMNS = [
  'id',
  'name',
  'created_by',
  'metadata',
  'base_currency',
  'pot_type',
  'checkpoint_enabled',
  'budget_enabled',
  'budget',
  'goal_amount',
  'goal_description',
  'last_edit_at',
  'archived_at',
  'created_at',
];

export class SupabaseSource implements DataSource {
  private client = getSupabase();
  private ensuredUsers = new Set<string>();
  private ensuredMembership = new Set<string>();
  private guestSource = new LocalStorageSource();
  private static readonly AUTH_TOKEN_KEY = 'chopdot_auth_token';
  private static readonly GUEST_TOKEN = 'guest_session';

  /**
   * Returns true when Supabase is configured (URL + anon key).
   * DataContext uses this to decide whether to fall back to local storage.
   */
  isConfigured(): boolean {
    return !!this.client;
  }

  private ensureReady() {
    if (!this.client) {
      throw new Error('[SupabaseSource] Supabase client not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }
    return this.client;
  }

  private isGuestSession(): boolean {
    if (typeof window === 'undefined') return false;
    const localToken = window.localStorage.getItem(SupabaseSource.AUTH_TOKEN_KEY);
    const sessionToken = window.sessionStorage.getItem(SupabaseSource.AUTH_TOKEN_KEY);
    return localToken === SupabaseSource.GUEST_TOKEN || sessionToken === SupabaseSource.GUEST_TOKEN;
  }

  private async getOptionalUserId(context: string): Promise<string | null> {
    if (this.isGuestSession()) {
      return null;
    }
    const supabase = this.ensureReady();
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw new AuthError(`[SupabaseSource] Failed to resolve Supabase session (${context})`, error);
    }

    const userId = data.session?.user?.id;
    return userId ?? null;
  }

  private async requireAuthenticatedUser(context: string): Promise<string> {
    const userId = await this.getOptionalUserId(context);
    if (!userId) {
      throw new AuthError(`[SupabaseSource] Authentication required (${context})`);
    }
    return userId;
  }

  async getPots(options?: ListOptions): Promise<Pot[]> {
    const supabase = this.ensureReady();
    const userId = await this.getOptionalUserId('read pots');
    if (!userId) {
      return this.guestSource.getPots(options);
    }
    // Rely on RLS to scope pots to those the user can access (created or member)
    let query = supabase
      .from('pots')
      .select(POT_COLUMNS.join(','))
      .order('created_at', { ascending: false });

    // Apply pagination if options provided
    if (options) {
      const limit = options.limit ?? 20; // Default limit
      const offset = options.offset ?? 0;
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`[SupabaseSource] Failed to fetch pots: ${error.message}`);
    }

    const rows = (data ?? []) as unknown as SupabasePotRow[];
    const potMembersByPotId = await this.fetchMembersByPotId(rows.map((row) => row.id));

    // Auto-seeding disabled - users should create their own pots
    // Previously this would seed sample pots, but now we return empty results
    // if the user has no pots yet

    return rows.map((row) => this.mapRow(row, potMembersByPotId.get(row.id) ?? null, []));
  }

  async getPot(id: string): Promise<Pot | null> {
    const supabase = this.ensureReady();
    const userId = await this.getOptionalUserId('read pot');
    if (!userId) {
      return this.guestSource.getPot(id);
    }
    if (!this.isUuid(id)) {
      return null;
    }

    const { data, error } = await supabase
      .from('pots')
      .select(POT_COLUMNS.join(','))
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`[SupabaseSource] Failed to fetch pot ${id}: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    const potRow = data as unknown as SupabasePotRow;
    const potMembersByPotId = await this.fetchMembersByPotId([potRow.id]);
    const expenses = await this.listExpenses(potRow.id);
    return this.mapRow(potRow, potMembersByPotId.get(potRow.id) ?? null, expenses);
  }

  async savePots(pots: Pot[]): Promise<void> {
    const userId = await this.getOptionalUserId('modify pots');
    if (!userId) {
      await this.guestSource.savePots(pots);
      return;
    }
    for (const pot of pots) {
      await this.savePot(pot);
    }
  }

  async savePot(pot: Pot): Promise<void> {
    const supabase = this.ensureReady();
    const userId = await this.getOptionalUserId('modify pots');
    if (!userId) {
      await this.guestSource.savePot(pot);
      return;
    }
    const validation = PotSchema.safeParse(pot);
    if (!validation.success) {
      throw new ValidationError('Invalid pot data', validation.error.issues);
    }

    const sanitized = validation.data;
    const lastEditAt = sanitized.lastEditAt ?? new Date().toISOString();
    const metadata = this.buildMetadata(sanitized, lastEditAt);
    const actorId = userId;
    const existing = await this.findExistingPot(sanitized.id);

    const payload: Record<string, unknown> = {
      id: sanitized.id,
      name: sanitized.name,
      metadata,
      base_currency: sanitized.baseCurrency,
      pot_type: sanitized.type,
      checkpoint_enabled: sanitized.checkpointEnabled ?? true,
      budget_enabled: sanitized.budgetEnabled ?? false,
      budget: sanitized.budget ?? null,
      goal_amount: sanitized.goalAmount ?? null,
      goal_description: sanitized.goalDescription ?? null,
      last_edit_at: lastEditAt,
      archived_at: sanitized.archived ? (existing?.archived_at ?? new Date().toISOString()) : null,
    };

    if (!existing) {
      await this.ensureUserRecord(actorId);
      payload.created_by = actorId;
    }

    const { error } = await supabase
      .from('pots')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      throw new Error(`[SupabaseSource] Failed to save pot ${sanitized.id}: ${error.message}`);
    }

    if (!existing) {
      await this.ensureOwnerMembership(sanitized.id, actorId);
    }
  }

  async deletePot(id: string): Promise<void> {
    const supabase = this.ensureReady();
    const userId = await this.getOptionalUserId('delete pot');
    if (!userId) {
      await this.guestSource.deletePot(id);
      return;
    }
    if (!this.isUuid(id)) {
      await this.guestSource.deletePot(id);
      return;
    }
    const { data, error } = await supabase
      .from('pots')
      .delete()
      .eq('id', id)
      .eq('created_by', userId)
      .select('id');
    if (error) {
      throw new Error(`[SupabaseSource] Failed to delete pot ${id}: ${error.message}`);
    }
    if (!data || data.length === 0) {
      throw new Error(
        `[SupabaseSource] No pot deleted. Make sure you are the creator and have permission to delete this pot.`,
      );
    }
  }

  async listExpenses(potId: string, options?: ExpenseListOptions): Promise<Expense[]> {
    const supabase = this.ensureReady();
    const userId = await this.getOptionalUserId('read expenses');
    if (!userId) {
      return this.guestSource.listExpenses(potId, options);
    }

    const selectColumns = [
      'id',
      'pot_id',
      'creator_id',
      'paid_by',
      'amount_minor',
      'currency_code',
      'description',
      'expense_date',
      'created_at',
      'legacy_id',
      'metadata',
    ].join(',');

    const buildQuery = () =>
      supabase
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
    return rows.map((row) => this.mapExpenseRow(row, splitsByExpenseId.get(row.id)));
  }

  async getExpense(potId: string, expenseId: string): Promise<Expense | null> {
    const supabase = this.ensureReady();
    const userId = await this.getOptionalUserId('read expense');
    if (!userId) {
      return this.guestSource.getExpense(potId, expenseId);
    }

    if (!this.isUuid(expenseId) || !this.isUuid(potId)) {
      return this.guestSource.getExpense(potId, expenseId);
    }

    const { data, error } = await supabase
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
    return this.mapExpenseRow(data as SupabaseExpenseRow, splitMap.get(expenseId));
  }

  async saveExpense(potId: string, expense: Expense): Promise<void> {
    const supabase = this.ensureReady();
    const userId = await this.getOptionalUserId('modify expense');

    if (!userId) {
      await this.guestSource.saveExpense(potId, expense);
      return;
    }

    const normalizedExpense = this.normalizeExpenseId(expense);

    const { data: existing, error: existingError } = await supabase
      .from('expenses')
      .select('id, creator_id')
      .eq('id', normalizedExpense.id)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      throw new Error(`[SupabaseSource] Failed to inspect expense ${normalizedExpense.id}: ${existingError.message}`);
    }

    const creatorId = (existing as { creator_id?: string } | null)?.creator_id ?? userId;
    const legacyId = (normalizedExpense as { legacyId?: string; legacy_id?: string }).legacyId
      ?? (normalizedExpense as { legacy_id?: string }).legacy_id;
    const resolvedPaidBy = normalizedExpense.paidBy === 'owner' ? userId : (normalizedExpense.paidBy || userId);
    const payload = {
      id: normalizedExpense.id,
      pot_id: potId,
      creator_id: creatorId,
      paid_by: resolvedPaidBy,
      amount_minor: toMinorAmount(expense.amount),
      currency_code: expense.currency ?? 'USD',
      description: expense.memo ?? (expense as any).description ?? '',
      expense_date: expense.date ? new Date(expense.date).toISOString() : null,
      legacy_id: legacyId ?? null,
      metadata: this.stripUndefined({
        split: expense.split ?? [],
        attestations: expense.attestations ?? [],
        hasReceipt: expense.hasReceipt ?? false,
        receiptUrl: expense.receiptUrl,
        memo: expense.memo,
        description: (expense as any).description,
      }),
    };

    const { error } = await supabase
      .from('expenses')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      throw new Error(`[SupabaseSource] Failed to save expense ${expense.id}: ${error.message}`);
    }

    await supabase
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
      const { error: splitError } = await supabase
        .from('expense_splits')
        .insert(splitRows);
      if (splitError) {
        throw new Error(`[SupabaseSource] Failed to save expense splits: ${splitError.message}`);
      }
    }
  }

  async deleteExpense(potId: string, expenseId: string): Promise<void> {
    const supabase = this.ensureReady();
    const userId = await this.getOptionalUserId('delete expense');
    if (!userId) {
      await this.guestSource.deleteExpense(potId, expenseId);
      return;
    }
    const { error } = await supabase
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
    const supabase = this.ensureReady();
    const resolvedUserId = userId || (await this.requireAuthenticatedUser('read expense summaries'));
    if (potIds.length === 0) {
      return {};
    }

    const { data: expenseRows, error } = await supabase
      .from('expenses')
      .select('id, pot_id, amount_minor, paid_by')
      .in('pot_id', potIds);

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

    const { data: splitRows, error: splitError } = await supabase
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

  async exportPot(id: string): Promise<Pot> {
    const pot = await this.getPot(id);
    if (!pot) {
      throw new ValidationError(`Pot with id "${id}" not found`);
    }
    return pot;
  }

  async importPot(pot: Pot): Promise<Pot> {
    const validation = PotSchema.safeParse(pot);
    if (!validation.success) {
      throw new ValidationError('Invalid pot data', validation.error.issues);
    }

    const sanitized = validation.data;
    await this.savePot(sanitized);

    const normalizedExpenses = (sanitized.expenses ?? []).map((expense) => this.normalizeExpenseId(expense));
    for (const expense of normalizedExpenses) {
      await this.saveExpense(sanitized.id, expense);
    }

    return {
      ...sanitized,
      expenses: normalizedExpenses,
    };
  }

  // Note: getCurrentUserId kept for potential future use but currently unused
  // @ts-expect-error - Intentionally unused, kept for future use
  private async getCurrentUserId(): Promise<string> {
    return this.requireAuthenticatedUser('modify pots');
  }

  private async findExistingPot(
    id: string,
  ): Promise<Pick<SupabasePotRow, 'id' | 'created_by' | 'archived_at'> | null> {
    const supabase = this.ensureReady();
    const { data, error } = await supabase
      .from('pots')
      .select('id, created_by, archived_at')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`[SupabaseSource] Failed to inspect pot ${id}: ${error.message}`);
    }

    return (data as Pick<SupabasePotRow, 'id' | 'created_by' | 'archived_at'>) ?? null;
  }

  private async ensureOwnerMembership(potId: string, userId: string): Promise<void> {
    const cacheKey = `${potId}:${userId}`;
    if (this.ensuredMembership.has(cacheKey)) {
      return;
    }
    const supabase = this.ensureReady();
    const { error } = await supabase
      .from('pot_members')
      .upsert(
        {
          pot_id: potId,
          user_id: userId,
          role: 'owner',
          status: 'active',
        },
        { onConflict: 'pot_id,user_id' },
      );

    if (error) {
      throw new Error(`[SupabaseSource] Failed to register owner membership: ${error.message}`);
    }

    this.ensuredMembership.add(cacheKey);
  }

  private async ensureUserRecord(userId: string): Promise<void> {
    if (this.ensuredUsers.has(userId)) {
      return;
    }

    const supabase = this.ensureReady();
    const { error } = await supabase
      .from('users')
      .upsert({ id: userId }, { onConflict: 'id' });

    if (error) {
      throw new Error(`[SupabaseSource] Failed to ensure app user record: ${error.message}`);
    }

    this.ensuredUsers.add(userId);
  }

  private buildMetadata(pot: Pot, lastEditAt: string): Record<string, unknown> {
    const metadata: Record<string, unknown> = {
      id: pot.id,
      name: pot.name,
      type: pot.type,
      baseCurrency: pot.baseCurrency,
      members: pot.members ?? [],
      history: pot.history ?? [],
      budget: pot.budget ?? null,
      budgetEnabled: pot.budgetEnabled ?? false,
      checkpointEnabled: pot.checkpointEnabled ?? true,
      archived: pot.archived ?? false,
      mode: pot.mode,
      confirmationsEnabled: pot.confirmationsEnabled,
      currentCheckpoint: pot.currentCheckpoint,
      lastCheckpoint: pot.lastCheckpoint,
      lastEditAt,
      contributions: pot.contributions,
      totalPooled: pot.totalPooled,
      yieldRate: pot.yieldRate,
      defiProtocol: pot.defiProtocol,
      goalAmount: pot.goalAmount,
      goalDescription: pot.goalDescription,
      lastBackupCid: pot.lastBackupCid,
    };

    return this.stripUndefined(metadata);
  }

  private stripUndefined(input: Record<string, unknown>): Record<string, unknown> {
    return Object.entries(input).reduce<Record<string, unknown>>((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {});
  }

  private async fetchMembersByPotId(potIds: string[]): Promise<Map<string, Pot['members']>> {
    const supabase = this.ensureReady();
    const result = new Map<string, Pot['members']>();
    if (potIds.length === 0) {
      return result;
    }

    const { data, error } = await supabase
      .from('pot_members')
      .select('pot_id, user_id, role, status, user:users(name)')
      .in('pot_id', potIds)
      .neq('status', 'removed');

    if (error) {
      // Member hydration is best-effort; pot reads still work without it.
      console.warn('[SupabaseSource] Failed to fetch pot members', error.message);
      return result;
    }

    const rows = (data ?? []) as Array<{
      pot_id: string;
      user_id: string;
      role: string;
      status: string;
      user?: { name: string | null } | { name: string | null }[] | null;
    }>;

    for (const row of rows) {
      const name =
        (Array.isArray(row.user) ? row.user[0]?.name : row.user?.name) ??
        row.user_id;
      const member: Pot['members'][number] = {
        id: row.user_id,
        name,
        role: row.role === 'owner' ? 'Owner' : 'Member',
        status: row.status,
      };
      const list = result.get(row.pot_id) ?? [];
      list.push(member);
      result.set(row.pot_id, list);
    }

    return result;
  }

  private async fetchExpenseSplits(expenseIds: string[]): Promise<Map<string, Expense['split']>> {
    const supabase = this.ensureReady();
    const result = new Map<string, Expense['split']>();
    if (expenseIds.length === 0) {
      return result;
    }

    const { data, error } = await supabase
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

  private mapExpenseRow(row: SupabaseExpenseRow, splitsOverride?: Expense['split']): Expense {
    const metadata = (row.metadata ?? {}) as Record<string, unknown>;
    const memo = (metadata.memo as string | undefined)
      ?? (metadata.description as string | undefined)
      ?? row.description
      ?? '';
    const splitFromMetadata = Array.isArray(metadata.split)
      ? (metadata.split as Array<{ memberId: string; amount: number }>)
      : [];

    return {
      id: row.id,
      potId: row.pot_id,
      amount: fromMinorAmount(row.amount_minor),
      currency: row.currency_code ?? 'USD',
      paidBy: row.paid_by ?? row.creator_id,
      memo,
      date: row.expense_date ?? row.created_at ?? new Date().toISOString(),
      split: splitsOverride ?? splitFromMetadata,
      attestations: (metadata.attestations as Expense['attestations']) ?? [],
      hasReceipt: (metadata.hasReceipt as boolean | undefined) ?? false,
      receiptUrl: metadata.receiptUrl as string | undefined,
    };
  }

  private normalizeExpenseId(expense: Expense): Expense {
    if (this.isUuid(expense.id)) {
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

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  private mapRow(
    row: SupabasePotRow,
    membershipMembers: Pot['members'] | null,
    expensesOverride?: Pot['expenses'],
  ): Pot {
    const metadata = (row.metadata ?? {}) as Record<string, unknown>;
    const ownerUserId = row.created_by;

    const mapMemberId = (id: string): string => {
      if (id === 'owner') return ownerUserId;
      return id;
    };

    const mapAttestations = (attestations: unknown): unknown => {
      if (!Array.isArray(attestations)) return attestations;
      if (attestations.length === 0) return attestations;
      const first = attestations[0];
      if (typeof first === 'string') {
        return (attestations as string[]).map((id) => mapMemberId(id));
      }
      if (typeof first === 'object' && first !== null) {
        return (attestations as Array<Record<string, unknown>>).map((entry) => {
          const memberId = typeof entry.memberId === 'string' ? mapMemberId(entry.memberId) : entry.memberId;
          return { ...entry, memberId };
        });
      }
      return attestations;
    };

    const rawMembers = Array.isArray(metadata.members) ? (metadata.members as Array<Record<string, unknown>>) : [];
    const membersFromMetadata: Pot['members'] = rawMembers
      .filter((member) => typeof member?.id === 'string')
      .map((member) => {
        const id = mapMemberId(member.id as string);
        const name =
          typeof member.name === 'string' && member.name.trim().length > 0
            ? member.name
            : id;
        return {
          ...(member as any),
          id,
          name,
        };
      });

    const rawExpenses = Array.isArray(metadata.expenses) ? (metadata.expenses as Array<Record<string, unknown>>) : [];
    const baseExpenses = expensesOverride ?? (rawExpenses as unknown as Pot['expenses']);
    const expenses: Pot['expenses'] = (baseExpenses ?? []).map((expense) => {
      const paidBy = typeof expense.paidBy === 'string' ? mapMemberId(expense.paidBy) : expense.paidBy;
      const split = Array.isArray(expense.split)
        ? (expense.split as Array<Record<string, unknown>>).map((s) => ({
          ...s,
          memberId: typeof s.memberId === 'string' ? mapMemberId(s.memberId) : s.memberId,
        }))
        : expense.split;
      const attestations = mapAttestations(expense.attestations);
      return {
        ...(expense as any),
        paidBy,
        split,
        attestations,
      };
    }) as unknown as Pot['expenses'];

    const rawHistory = Array.isArray(metadata.history) ? (metadata.history as Array<Record<string, unknown>>) : [];
    const historyFromMetadata: Pot['history'] = rawHistory.map((entry) => {
      if (!entry || typeof entry !== 'object') return entry as any;
      if (entry.type === 'onchain_settlement') {
        const fromMemberId = typeof entry.fromMemberId === 'string' ? mapMemberId(entry.fromMemberId) : entry.fromMemberId;
        const toMemberId = typeof entry.toMemberId === 'string' ? mapMemberId(entry.toMemberId) : entry.toMemberId;
        return { ...(entry as any), fromMemberId, toMemberId };
      }
      return entry as any;
    }) as unknown as Pot['history'];

    const currentCheckpoint = (() => {
      const checkpoint = metadata.currentCheckpoint as Record<string, unknown> | undefined;
      if (!checkpoint || typeof checkpoint !== 'object') return checkpoint as any;
      const createdBy = typeof checkpoint.createdBy === 'string' ? mapMemberId(checkpoint.createdBy) : checkpoint.createdBy;
      const bypassedBy = typeof checkpoint.bypassedBy === 'string' ? mapMemberId(checkpoint.bypassedBy) : checkpoint.bypassedBy;
      const confirmations = checkpoint.confirmations as Record<string, unknown> | undefined;
      if (!confirmations || typeof confirmations !== 'object' || Array.isArray(confirmations)) return checkpoint as any;
      const mappedConfirmations: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(confirmations)) {
        mappedConfirmations[mapMemberId(key)] = value;
      }
      return { ...(checkpoint as any), createdBy, bypassedBy, confirmations: mappedConfirmations } as any;
    })();

    const mergedMembers = (() => {
      const merged = new Map<string, Pot['members'][number]>();

      const add = (member: Pot['members'][number]) => {
        const existing = merged.get(member.id);
        if (!existing) {
          merged.set(member.id, member);
          return;
        }
        const existingName = existing.name ?? '';
        const existingLooksPlaceholder =
          existingName === 'You' || existingName === 'Member' || existingName === existing.id;
        merged.set(member.id, {
          ...existing,
          ...member,
          // Prefer a non-placeholder name when available.
          name: existingLooksPlaceholder && member.name && member.name !== existingName ? member.name : existingName,
        });
      };

      for (const m of membersFromMetadata) add(m);
      if (Array.isArray(membershipMembers)) {
        for (const m of membershipMembers) add(m);
      }

      if (!merged.has(ownerUserId)) {
        add({
          id: ownerUserId,
          name: ownerUserId,
          role: 'Owner',
          status: 'active',
        });
      }

      return Array.from(merged.values());
    })();

    const rawBaseCurrency =
      typeof row.base_currency === 'string'
        ? row.base_currency
        : typeof metadata.baseCurrency === 'string'
          ? metadata.baseCurrency
          : 'USD';
    const baseCurrency = isBaseCurrency(rawBaseCurrency) ? rawBaseCurrency : 'USD';

    const basePot: Pot = {
      id: row.id,
      name: row.name ?? (metadata.name as string) ?? 'Untitled Pot',
      type: ((row.pot_type ?? metadata.type ?? 'expense') === 'savings' ? 'savings' : 'expense') as Pot['type'],
      baseCurrency,
      members: mergedMembers.length > 0 ? mergedMembers : [{ ...DEFAULT_MEMBER }],
      expenses,
      history: historyFromMetadata,
      budget: (row.budget ?? metadata.budget ?? null) as Pot['budget'],
      budgetEnabled: (row.budget_enabled ?? metadata.budgetEnabled ?? false) as Pot['budgetEnabled'],
      checkpointEnabled: (row.checkpoint_enabled ?? metadata.checkpointEnabled ?? true) as Pot['checkpointEnabled'],
      archived: !!row.archived_at || Boolean(metadata.archived),
      mode: (metadata.mode as Pot['mode']) ?? 'casual',
      confirmationsEnabled: metadata.confirmationsEnabled as boolean | undefined,
      currentCheckpoint: currentCheckpoint as Pot['currentCheckpoint'],
      lastCheckpoint: metadata.lastCheckpoint as Pot['lastCheckpoint'],
      lastEditAt: row.last_edit_at ? new Date(row.last_edit_at).toISOString() : (metadata.lastEditAt as string | undefined),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      contributions: Array.isArray(metadata.contributions) ? (metadata.contributions as Pot['contributions']) : undefined,
      totalPooled: (metadata.totalPooled as number | undefined) ?? undefined,
      yieldRate: (metadata.yieldRate as number | undefined) ?? undefined,
      defiProtocol: metadata.defiProtocol as string | undefined,
      goalAmount: row.goal_amount ?? (metadata.goalAmount as number | undefined),
      goalDescription: row.goal_description ?? (metadata.goalDescription as string | undefined),
      lastBackupCid: metadata.lastBackupCid as string | undefined,
    };

    const parsed = PotSchema.safeParse({
      ...basePot,
      // Ensure members/expenses arrays are copies to avoid mutations.
      members: [...basePot.members],
      expenses: [...basePot.expenses],
      history: [...basePot.history],
    });

    if (!parsed.success) {
      console.warn('[SupabaseSource] Failed to parse pot metadata', row.id, parsed.error.issues);
      return {
        ...basePot,
        members: basePot.members.length > 0 ? basePot.members : [{ ...DEFAULT_MEMBER }],
        expenses: [],
        history: [],
      };
    }

    return parsed.data;
  }

  // Remove a membership row (used when a member leaves a pot).
  async deleteMemberRow(potId: string, memberId: string): Promise<void> {
    const supabase = this.ensureReady();
    const { error } = await supabase
      .from('pot_members')
      .delete()
      .eq('pot_id', potId)
      .eq('user_id', memberId);

    if (error) {
      throw new Error(`[SupabaseSource] Failed to remove member ${memberId} from pot ${potId}: ${error.message}`);
    }
  }
}
