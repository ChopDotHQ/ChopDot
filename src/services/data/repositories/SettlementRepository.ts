/**
 * Settlement Repository
 *
 * HTTP client for the ChopDot API settlement endpoints.
 * All persistence goes through the backend, which uses Prisma + Postgres.
 *
 * API base: VITE_API_URL (defaults to http://localhost:3001)
 *
 * Endpoints consumed:
 *   GET    /api/pots/:potId/settlements
 *   POST   /api/pots/:potId/settlements          { legs: [...] }
 *   PATCH  /api/pots/:potId/settlements/:id/pay  { method, reference }
 *   PATCH  /api/pots/:potId/settlements/:id/confirm
 */

import type { SettlementLeg, SettlementLegStatus } from "../../../types/app";
import { getSupabase } from "../../../utils/supabase-client";

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001";

// ─── Wire shape from backend ──────────────────────────────────────────────────

interface WireLeg {
  id: string;
  potId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  currency: string;
  status: string;
  method?: string;
  reference?: string;
  createdAt: string;
  paidAt?: string;
  confirmedAt?: string;
}

function wireToLeg(w: WireLeg): SettlementLeg {
  return {
    id: w.id,
    potId: w.potId,
    fromMemberId: w.fromMemberId,
    toMemberId: w.toMemberId,
    amount: w.amount,
    currency: w.currency,
    status: w.status as SettlementLegStatus,
    method: w.method as SettlementLeg["method"],
    reference: w.reference,
    createdAt: w.createdAt,
    paidAt: w.paidAt,
    confirmedAt: w.confirmedAt,
  };
}

// ─── Auth header helper ───────────────────────────────────────────────────────

async function authHeaders(): Promise<HeadersInit> {
  const client = getSupabase();
  if (!client) return {};
  const { data } = await client.auth.getSession();
  const userId = data.session?.user?.id;
  return userId ? { "x-user-id": userId } : {};
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[SettlementRepository] ${res.status} ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ─── Repository class ─────────────────────────────────────────────────────────

export class SettlementRepository {
  // TTL/cache params kept for DataContext interface compatibility
  constructor(_ttl: number = 300_000, _maxCacheSize: number = 100) {}

  /** Fetch all settlement legs for a pot, newest first */
  async listByPot(potId: string): Promise<SettlementLeg[]> {
    const rows = await apiFetch<WireLeg[]>(`/api/pots/${potId}/settlements`);
    return rows.map(wireToLeg);
  }

  /** Create new settlement legs (propose a chapter) */
  async create(leg: {
    potId: string;
    fromMemberId: string;
    toMemberId: string;
    amount: number;
    currency: string;
  }): Promise<SettlementLeg> {
    // The backend endpoint accepts an array; we wrap single legs
    const rows = await apiFetch<WireLeg[]>(`/api/pots/${leg.potId}/settlements`, {
      method: "POST",
      body: JSON.stringify({
        legs: [
          {
            fromMemberId: leg.fromMemberId,
            toMemberId: leg.toMemberId,
            amount: leg.amount,
            currency: leg.currency,
          },
        ],
      }),
    });
    const first = rows[0];
    if (!first) throw new Error("[SettlementRepository] create returned empty array");
    return wireToLeg(first);
  }

  /** Payer marks a leg as paid — pending → paid */
  async markPaid(
    id: string,
    potId: string,
    method: SettlementLeg["method"],
    reference?: string,
  ): Promise<SettlementLeg> {
    const row = await apiFetch<WireLeg>(
      `/api/pots/${potId}/settlements/${id}/pay`,
      {
        method: "PATCH",
        body: JSON.stringify({ method, reference }),
      },
    );
    return wireToLeg(row);
  }

  /** Receiver confirms receipt — paid → confirmed */
  async confirmReceipt(id: string, potId: string): Promise<SettlementLeg> {
    const row = await apiFetch<WireLeg>(
      `/api/pots/${potId}/settlements/${id}/confirm`,
      { method: "PATCH" },
    );
    return wireToLeg(row);
  }

  /** @deprecated kept for DataContext interface compat */
  invalidate(): void {}

  /** @deprecated kept for DataContext interface compat */
  async list(): Promise<unknown[]> {
    return [];
  }
}
