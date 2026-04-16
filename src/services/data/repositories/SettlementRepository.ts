/**
 * Settlement Repository
 *
 * Data access layer for settlement legs.
 * Persists and retrieves typed settlement legs from Supabase `settlements` table.
 *
 * Column mapping:
 *   id, pot_id, from_member_id, to_member_id,
 *   amount_minor (cents), currency_code, status,
 *   tx_hash (repurposed for method+reference JSON), created_at
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SettlementLeg, SettlementLegStatus } from '../../../types/app';
import { getSupabase } from '../../../utils/supabase-client';

// Supabase row shape for the settlements table
interface SettlementRow {
  id: string;
  pot_id: string;
  from_member_id: string;
  to_member_id: string;
  amount_minor: number;
  currency_code: string;
  status: string;
  tx_hash: string | null;
  created_at: string;
}

/** Parse method/reference packed into tx_hash as JSON */
function unpackTxHash(txHash: string | null): {
  method?: SettlementLeg['method'];
  reference?: string;
  paidAt?: string;
  confirmedAt?: string;
} {
  if (!txHash) return {};
  try {
    return JSON.parse(txHash) as ReturnType<typeof unpackTxHash>;
  } catch {
    return {};
  }
}

function rowToLeg(row: SettlementRow): SettlementLeg {
  const packed = unpackTxHash(row.tx_hash);
  return {
    id: row.id,
    potId: row.pot_id,
    fromMemberId: row.from_member_id,
    toMemberId: row.to_member_id,
    // amount_minor is in cents for fiat (amount * 100)
    amount: row.amount_minor / 100,
    currency: row.currency_code,
    status: (row.status as SettlementLegStatus) ?? 'pending',
    method: packed.method,
    reference: packed.reference,
    createdAt: row.created_at,
    paidAt: packed.paidAt,
    confirmedAt: packed.confirmedAt,
  };
}

export class SettlementRepository {
  private client: SupabaseClient | null;

  // TTL and cache size params kept for interface compatibility with DataContext
  constructor(_ttl: number = 300_000, _maxCacheSize: number = 100) {
    this.client = getSupabase();
  }

  private get db(): SupabaseClient {
    if (!this.client) throw new Error('[SettlementRepository] Supabase not configured');
    return this.client;
  }

  /** Fetch all settlement legs for a pot, newest first */
  async listByPot(potId: string): Promise<SettlementLeg[]> {
    const { data, error } = await this.db
      .from('settlements')
      .select('id, pot_id, from_member_id, to_member_id, amount_minor, currency_code, status, tx_hash, created_at')
      .eq('pot_id', potId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`[SettlementRepository] listByPot failed: ${error.message}`);
    return (data ?? []).map(row => rowToLeg(row as SettlementRow));
  }

  /** Create a new settlement leg with status = pending */
  async create(leg: {
    potId: string;
    fromMemberId: string;
    toMemberId: string;
    amount: number;
    currency: string;
  }): Promise<SettlementLeg> {
    const { data, error } = await this.db
      .from('settlements')
      .insert({
        pot_id: leg.potId,
        from_member_id: leg.fromMemberId,
        to_member_id: leg.toMemberId,
        amount_minor: Math.round(leg.amount * 100),
        currency_code: leg.currency,
        status: 'pending',
        tx_hash: null,
      })
      .select('id, pot_id, from_member_id, to_member_id, amount_minor, currency_code, status, tx_hash, created_at')
      .single();

    if (error) throw new Error(`[SettlementRepository] create failed: ${error.message}`);
    return rowToLeg(data as SettlementRow);
  }

  /** Mark a leg as paid — payer side */
  async markPaid(id: string, method: SettlementLeg['method'], reference?: string): Promise<SettlementLeg> {
    const paidAt = new Date().toISOString();
    const packed = JSON.stringify({ method, reference, paidAt });

    const { data, error } = await this.db
      .from('settlements')
      .update({ status: 'paid', tx_hash: packed })
      .eq('id', id)
      .select('id, pot_id, from_member_id, to_member_id, amount_minor, currency_code, status, tx_hash, created_at')
      .single();

    if (error) throw new Error(`[SettlementRepository] markPaid failed: ${error.message}`);
    return rowToLeg(data as SettlementRow);
  }

  /** Confirm receipt — counterparty side */
  async confirmReceipt(id: string): Promise<SettlementLeg> {
    // Fetch current tx_hash to preserve method/reference/paidAt
    const { data: existing, error: fetchErr } = await this.db
      .from('settlements')
      .select('tx_hash')
      .eq('id', id)
      .single();

    if (fetchErr) throw new Error(`[SettlementRepository] confirmReceipt fetch failed: ${fetchErr.message}`);

    const current = unpackTxHash((existing as { tx_hash: string | null }).tx_hash);
    const confirmedAt = new Date().toISOString();
    const packed = JSON.stringify({ ...current, confirmedAt });

    const { data, error } = await this.db
      .from('settlements')
      .update({ status: 'confirmed', tx_hash: packed })
      .eq('id', id)
      .select('id, pot_id, from_member_id, to_member_id, amount_minor, currency_code, status, tx_hash, created_at')
      .single();

    if (error) throw new Error(`[SettlementRepository] confirmReceipt failed: ${error.message}`);
    return rowToLeg(data as SettlementRow);
  }

  /** @deprecated Use listByPot. Kept for interface compatibility. */
  invalidate(): void {}

  /** @deprecated Use listByPot. Kept for interface compatibility. */
  async list(): Promise<unknown[]> {
    return [];
  }
}
