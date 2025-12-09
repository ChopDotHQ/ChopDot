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

  async getPots(options?: ListOptions): Promise<Pot[]> {
    const supabase = this.ensureReady();
    const userId = await this.getCurrentUserId();
    
    // With current RLS policies, users can only read pots they created
    // Future enhancement: implement shared pots via different approach
    let query = supabase
      .from('pots')
      .select(POT_COLUMNS.join(','))
      .eq('created_by', userId)
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
    
    // Auto-seeding disabled - users should create their own pots
    // Previously this would seed sample pots, but now we return empty results
    // if the user has no pots yet
    
    return rows.map((row) => this.mapRow(row));
  }

  async getPot(id: string): Promise<Pot | null> {
    const supabase = this.ensureReady();
    const userId = await this.getCurrentUserId();
    
    // With current RLS policies, users can only read pots they created
    const { data, error } = await supabase
      .from('pots')
      .select(POT_COLUMNS.join(','))
      .eq('id', id)
      .eq('created_by', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`[SupabaseSource] Failed to fetch pot ${id}: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return this.mapRow(data as unknown as SupabasePotRow);
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
    const ownerId = await this.getCurrentUserId();
    const existing = await this.findExistingPot(sanitized.id, ownerId);

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
      // Always include created_by (required by Supabase, even on updates)
      created_by: existing?.created_by ?? ownerId,
    };

    if (!existing) {
      await this.ensureUserRecord(ownerId);
    }

    const { error } = await supabase
      .from('pots')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      throw new Error(`[SupabaseSource] Failed to save pot ${sanitized.id}: ${error.message}`);
    }

    if (!existing && ownerId) {
      await this.ensureOwnerMembership(sanitized.id, ownerId);
    }
  }

  async deletePot(id: string): Promise<void> {
    const supabase = this.ensureReady();
    const userId = await this.getCurrentUserId();
    const { error } = await supabase
      .from('pots')
      .delete()
      .eq('id', id)
      .eq('created_by', userId);
    if (error) {
      throw new Error(`[SupabaseSource] Failed to delete pot ${id}: ${error.message}`);
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
    const supabase = this.ensureReady();
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw new AuthError('Failed to resolve Supabase session', error);
    }

    const userId = data.session?.user?.id;
    if (!userId) {
      throw new AuthError('Authentication required to modify pots');
    }
    return userId;
  }

  private async findExistingPot(id: string, ownerId: string): Promise<Pick<SupabasePotRow, 'id' | 'created_by' | 'archived_at'> | null> {
    const supabase = this.ensureReady();
    const { data, error } = await supabase
      .from('pots')
      .select('id, created_by, archived_at')
      .eq('id', id)
      .eq('created_by', ownerId)
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

      // eslint-disable-next-line no-bitwise
      buffer[6] = (value6 & 0x0f) | 0x40;
      // eslint-disable-next-line no-bitwise
      buffer[8] = (value8 & 0x3f) | 0x80;
      const hex = Array.from(buffer, (b) => b.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const rand = Math.random() * 16 | 0;
      const value = char === 'x' ? rand : ((rand & 0x3) | 0x8);
      return value.toString(16);
    });
  }

  private mapRow(row: SupabasePotRow): Pot {
    const metadata = (row.metadata ?? {}) as Record<string, unknown>;

    const basePot: Pot = {
      id: row.id,
      name: row.name ?? (metadata.name as string) ?? 'Untitled Pot',
      type: ((row.pot_type ?? metadata.type ?? 'expense') === 'savings' ? 'savings' : 'expense') as Pot['type'],
      baseCurrency: ((row.base_currency ?? metadata.baseCurrency ?? 'USD') === 'DOT' ? 'DOT' : 'USD') as Pot['baseCurrency'],
      members: Array.isArray(metadata.members) && metadata.members.length > 0 ? (metadata.members as Pot['members']) : [{ ...DEFAULT_MEMBER }],
      expenses: Array.isArray(metadata.expenses) ? (metadata.expenses as Pot['expenses']) : [],
      history: Array.isArray(metadata.history) ? (metadata.history as Pot['history']) : [],
      budget: (row.budget ?? metadata.budget ?? null) as Pot['budget'],
      budgetEnabled: (row.budget_enabled ?? metadata.budgetEnabled ?? false) as Pot['budgetEnabled'],
      checkpointEnabled: (row.checkpoint_enabled ?? metadata.checkpointEnabled ?? true) as Pot['checkpointEnabled'],
      archived: !!row.archived_at || Boolean(metadata.archived),
      mode: (metadata.mode as Pot['mode']) ?? 'casual',
      confirmationsEnabled: metadata.confirmationsEnabled as boolean | undefined,
      currentCheckpoint: metadata.currentCheckpoint as Pot['currentCheckpoint'],
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
        members: [{ ...DEFAULT_MEMBER }],
        expenses: [],
        history: [],
      };
    }

    return parsed.data;
  }
}
