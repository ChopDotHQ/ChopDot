import type { DataSource, ListOptions } from '../repositories/PotRepository';
import type { Pot } from '../types';
import { PotSchema } from '../../../schema/pot';
import { getSupabase } from '../../../utils/supabase-client';
import type { SupabasePotRow } from '../types/supabase';
import { AuthError, ValidationError } from '../errors';

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

  private async requireAuthenticatedUser(context: string): Promise<string> {
    const supabase = this.ensureReady();
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw new AuthError(`[SupabaseSource] Failed to resolve Supabase session (${context})`, error);
    }

    const userId = data.session?.user?.id;
    if (!userId) {
      throw new AuthError(`[SupabaseSource] Authentication required (${context})`);
    }
    return userId;
  }

  async getPots(options?: ListOptions): Promise<Pot[]> {
    const supabase = this.ensureReady();
    await this.requireAuthenticatedUser('read pots');
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
    
    return rows.map((row) => this.mapRow(row, potMembersByPotId.get(row.id) ?? null));
  }

  async getPot(id: string): Promise<Pot | null> {
    const supabase = this.ensureReady();
    await this.requireAuthenticatedUser('read pot');
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
    return this.mapRow(potRow, potMembersByPotId.get(potRow.id) ?? null);
  }

  async savePots(pots: Pot[]): Promise<void> {
    for (const pot of pots) {
      await this.savePot(pot);
    }
  }

  async savePot(pot: Pot): Promise<void> {
    const supabase = this.ensureReady();
    const validation = PotSchema.safeParse(pot);
    if (!validation.success) {
      throw new ValidationError('Invalid pot data', validation.error.issues);
    }

    const sanitized = validation.data;
    const lastEditAt = sanitized.lastEditAt ?? new Date().toISOString();
    const metadata = this.buildMetadata(sanitized, lastEditAt);
    const actorId = await this.getCurrentUserId();
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
    const userId = await this.getCurrentUserId();
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

    await this.savePot(validation.data);
    return validation.data;
  }

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
      expenses: pot.expenses ?? [],
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

  private mapRow(row: SupabasePotRow, membershipMembers: Pot['members'] | null): Pot {
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
    const expensesFromMetadata: Pot['expenses'] = rawExpenses.map((expense) => {
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

    const basePot: Pot = {
      id: row.id,
      name: row.name ?? (metadata.name as string) ?? 'Untitled Pot',
      type: ((row.pot_type ?? metadata.type ?? 'expense') === 'savings' ? 'savings' : 'expense') as Pot['type'],
      baseCurrency: ((row.base_currency ?? metadata.baseCurrency ?? 'USD') === 'DOT' ? 'DOT' : 'USD') as Pot['baseCurrency'],
      members: mergedMembers.length > 0 ? mergedMembers : [{ ...DEFAULT_MEMBER }],
      expenses: expensesFromMetadata,
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
