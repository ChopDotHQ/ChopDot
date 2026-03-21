import type { Pot } from '../types';
import type { SupabasePotRow } from '../types/supabase';
import { PotSchema, isBaseCurrency } from '../../../schema/pot';
import { stripUndefined } from './supabase-utils';

export const DEFAULT_MEMBER = {
  id: 'owner',
  name: 'You',
  role: 'Owner',
  status: 'active',
} as const;

export const POT_COLUMNS = [
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

export function buildPotMetadata(pot: Pot, lastEditAt: string): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    id: pot.id,
    name: pot.name,
    type: pot.type,
    baseCurrency: pot.baseCurrency,
    members: pot.members ?? [],
    history: pot.history ?? [],
    closeouts: pot.closeouts ?? [],
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

  return stripUndefined(metadata);
}

export function mapPotRow(
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
        evmAddress: typeof member.evmAddress === 'string' ? member.evmAddress : undefined,
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

  const rawCloseouts = Array.isArray(metadata.closeouts) ? (metadata.closeouts as Array<Record<string, unknown>>) : [];
  const closeoutsFromMetadata: Pot['closeouts'] = rawCloseouts.map((closeout) => {
    const participantMemberIds = Array.isArray(closeout.participantMemberIds)
      ? (closeout.participantMemberIds as string[]).map((id) => mapMemberId(id))
      : [];
    const legs = Array.isArray(closeout.legs)
      ? (closeout.legs as Array<Record<string, unknown>>).map((leg) => ({
        ...(leg as any),
        fromMemberId: typeof leg.fromMemberId === 'string' ? mapMemberId(leg.fromMemberId) : leg.fromMemberId,
        toMemberId: typeof leg.toMemberId === 'string' ? mapMemberId(leg.toMemberId) : leg.toMemberId,
      }))
      : [];
    return {
      ...(closeout as any),
      createdByMemberId:
        typeof closeout.createdByMemberId === 'string'
          ? mapMemberId(closeout.createdByMemberId)
          : closeout.createdByMemberId,
      participantMemberIds,
      legs,
    };
  }) as unknown as Pot['closeouts'];

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
    closeouts: closeoutsFromMetadata,
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
