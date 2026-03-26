import type { SupabaseClient } from '@supabase/supabase-js';
import type { Pot } from '../types';
import type { ListOptions } from '../repositories/PotRepository';
import type { SupabasePotRow } from '../types/supabase';
import { PotSchema } from '../../../schema/pot';
import { ValidationError } from '../errors';
import { getOptionalUserId } from './supabase-auth-helper';
import { isUuid, isRlsError, formatSupabaseError } from './supabase-utils';
import { mapPotRow, buildPotMetadata, POT_COLUMNS } from './pot-row-mapper';
import type { LocalStorageSource } from './LocalStorageSource';
import { UpdatePotDTOSchema, type UpdatePotDTO } from '../types/dto';

export class SupabasePotSource {
  private ensuredUsers = new Set<string>();
  private ensuredMembership = new Set<string>();

  constructor(
    private client: SupabaseClient,
    private guestSource: LocalStorageSource,
  ) {}

  async getPots(options?: ListOptions): Promise<Pot[]> {
    const userId = await getOptionalUserId(this.client, 'read pots');
    if (!userId) {
      return this.guestSource.getPots(options);
    }
    let query = this.client
      .from('pots')
      .select(POT_COLUMNS.join(','))
      .order('created_at', { ascending: false });

    if (options) {
      const limit = options.limit ?? 20;
      const offset = options.offset ?? 0;
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`[SupabaseSource] Failed to fetch pots: ${error.message}`);
    }

    const rows = (data ?? []) as unknown as SupabasePotRow[];
    const potMembersByPotId = await this.fetchMembersByPotId(rows.map((row) => row.id));
    // Don't pass [] as expensesOverride — let mapPotRow read from metadata.expenses
    // (expenses stored in the normalized table are handled via getExpenseSummaries)
    return rows.map((row) => mapPotRow(row, potMembersByPotId.get(row.id) ?? null));
  }

  async getPot(id: string): Promise<Pot | null> {
    const userId = await getOptionalUserId(this.client, 'read pot');
    if (!userId) {
      return this.guestSource.getPot(id);
    }
    if (!isUuid(id)) {
      return null;
    }

    const { data, error } = await this.client
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
    return mapPotRow(potRow, potMembersByPotId.get(potRow.id) ?? null);
  }

  async savePots(pots: Pot[]): Promise<void> {
    const userId = await getOptionalUserId(this.client, 'modify pots');
    if (!userId) {
      await this.guestSource.savePots(pots);
      return;
    }
    for (const pot of pots) {
      await this.savePot(pot);
    }
  }

  async savePot(pot: Pot): Promise<void> {
    const userId = await getOptionalUserId(this.client, 'modify pots');
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
    const metadata = buildPotMetadata(sanitized, lastEditAt);
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
    }

    const { error } = existing
      ? await this.client
          .from('pots')
          .update(payload)
          .eq('id', sanitized.id)
      : await this.client
          .from('pots')
          .insert(payload);

    if (error) {
      if (isRlsError(error)) {
        throw new Error(
          `[SupabaseSource] Failed to save pot ${sanitized.id}: access denied by Supabase RLS. Please sign out and sign back in, then retry. ${formatSupabaseError(error)}`,
        );
      }
      throw new Error(`[SupabaseSource] Failed to save pot ${sanitized.id}: ${error.message}`);
    }

    if (!existing) {
      try {
        await this.ensureOwnerMembership(sanitized.id, actorId);
      } catch (membershipError) {
        console.warn('[SupabaseSource] Owner membership sync skipped:', membershipError);
      }
    }
  }

  async updatePotSettings(id: string, updates: UpdatePotDTO): Promise<Pot> {
    const userId = await getOptionalUserId(this.client, 'modify pots');
    if (!userId) {
      throw new ValidationError('Pot settings update requires the authenticated Supabase source');
    }

    const existing = await this.findPotRow(id);
    if (!existing) {
      throw new ValidationError(`Pot with id "${id}" not found`);
    }

    const validation = UpdatePotDTOSchema.safeParse(updates);
    if (!validation.success) {
      throw new ValidationError('Invalid pot settings', validation.error.issues);
    }

    const sanitized = validation.data;
    const nextName = typeof sanitized.name === 'string' ? sanitized.name.trim() : undefined;
    const nextLastEditAt = new Date().toISOString();
    const existingMetadata = (existing.metadata ?? {}) as Record<string, unknown>;
    const metadata: Record<string, unknown> = {
      ...existingMetadata,
      ...(nextName ? { name: nextName } : {}),
      ...(sanitized.baseCurrency ? { baseCurrency: sanitized.baseCurrency } : {}),
      ...('budgetEnabled' in sanitized ? { budgetEnabled: sanitized.budgetEnabled ?? false } : {}),
      ...('budget' in sanitized ? { budget: sanitized.budget ?? null } : {}),
      ...('checkpointEnabled' in sanitized ? { checkpointEnabled: sanitized.checkpointEnabled ?? true } : {}),
      ...('archived' in sanitized ? { archived: sanitized.archived ?? false } : {}),
      ...('goalAmount' in sanitized ? { goalAmount: sanitized.goalAmount ?? null } : {}),
      ...('goalDescription' in sanitized ? { goalDescription: sanitized.goalDescription ?? null } : {}),
      lastEditAt: nextLastEditAt,
    };

    const payload: Record<string, unknown> = {
      metadata,
      last_edit_at: nextLastEditAt,
    };

    if (nextName) {
      payload.name = nextName;
    }
    if (sanitized.baseCurrency) {
      payload.base_currency = sanitized.baseCurrency;
    }
    if ('budgetEnabled' in sanitized) {
      payload.budget_enabled = sanitized.budgetEnabled ?? false;
    }
    if ('budget' in sanitized) {
      payload.budget = sanitized.budget ?? null;
    }
    if ('checkpointEnabled' in sanitized) {
      payload.checkpoint_enabled = sanitized.checkpointEnabled ?? true;
    }
    if ('goalAmount' in sanitized) {
      payload.goal_amount = sanitized.goalAmount ?? null;
    }
    if ('goalDescription' in sanitized) {
      payload.goal_description = sanitized.goalDescription ?? null;
    }
    if ('archived' in sanitized) {
      payload.archived_at = sanitized.archived ? (existing.archived_at ?? nextLastEditAt) : null;
    }

    const { error } = await this.client
      .from('pots')
      .update(payload)
      .eq('id', id);

    if (error) {
      if (isRlsError(error)) {
        throw new Error(
          `[SupabaseSource] Failed to update pot settings ${id}: access denied by Supabase RLS. Please sign out and sign back in, then retry. ${formatSupabaseError(error)}`,
        );
      }
      throw new Error(`[SupabaseSource] Failed to update pot settings ${id}: ${error.message}`);
    }

    const updated = await this.getPot(id);
    if (!updated) {
      throw new ValidationError(`Pot with id "${id}" not found after update`);
    }

    return updated;
  }

  async deletePot(id: string): Promise<void> {
    const userId = await getOptionalUserId(this.client, 'delete pot');
    if (!userId) {
      await this.guestSource.deletePot(id);
      return;
    }
    if (!isUuid(id)) {
      await this.guestSource.deletePot(id);
      return;
    }
    const { data, error } = await this.client
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

  async deleteMemberRow(potId: string, memberId: string): Promise<void> {
    const { error } = await this.client
      .from('pot_members')
      .delete()
      .eq('pot_id', potId)
      .eq('user_id', memberId);

    if (error) {
      throw new Error(`[SupabaseSource] Failed to remove member ${memberId} from pot ${potId}: ${error.message}`);
    }
  }

  /**
   * Upsert a membership row directly into pot_members for an existing user.
   * Called when adding someone who already has a Supabase UUID (e.g. "add existing contact").
   */
  async addMemberRow(potId: string, userId: string, name: string): Promise<void> {
    // Best-effort: keep the users display name current
    await this.client
      .from('users')
      .upsert({ id: userId, name }, { onConflict: 'id', ignoreDuplicates: true });

    const { error } = await this.client
      .from('pot_members')
      .upsert(
        { pot_id: potId, user_id: userId, role: 'member', status: 'active' },
        { onConflict: 'pot_id,user_id' },
      );

    if (error) {
      throw new Error(`[SupabaseSource] Failed to add member ${userId} to pot ${potId}: ${error.message}`);
    }
  }

  /**
   * Update the display name of a user in the public.users table.
   * Called when editing a member whose ID is a real Supabase UUID.
   */
  async updateMemberName(userId: string, name: string): Promise<void> {
    const { error } = await this.client
      .from('users')
      .update({ name })
      .eq('id', userId);

    if (error) {
      // Best-effort — log but don't throw (metadata is the primary store for wallet data)
      console.warn(`[SupabaseSource] Failed to update users.name for ${userId}:`, error.message);
    }
  }

  async fetchMembersByPotId(potIds: string[]): Promise<Map<string, Pot['members']>> {
    const result = new Map<string, Pot['members']>();
    if (potIds.length === 0) {
      return result;
    }

    const { data, error } = await this.client
      .from('pot_members')
      .select('pot_id, user_id, role, status, user:users(name)')
      .in('pot_id', potIds)
      .neq('status', 'removed');

    if (error) {
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

  private async findExistingPot(
    id: string,
  ): Promise<Pick<SupabasePotRow, 'id' | 'created_by' | 'archived_at'> | null> {
    const { data, error } = await this.client
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

  private async findPotRow(id: string): Promise<SupabasePotRow | null> {
    const { data, error } = await this.client
      .from('pots')
      .select(POT_COLUMNS.join(','))
      .eq('id', id)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`[SupabaseSource] Failed to inspect pot ${id}: ${error.message}`);
    }

    return (data as unknown as SupabasePotRow | null) ?? null;
  }

  private async ensureOwnerMembership(potId: string, userId: string): Promise<void> {
    const cacheKey = `${potId}:${userId}`;
    if (this.ensuredMembership.has(cacheKey)) {
      return;
    }
    const { error } = await this.client
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

    const { error } = await this.client
      .from('users')
      .upsert({ id: userId }, { onConflict: 'id' });

    if (error) {
      throw new Error(`[SupabaseSource] Failed to ensure app user record: ${error.message}`);
    }

    this.ensuredUsers.add(userId);
  }
}
