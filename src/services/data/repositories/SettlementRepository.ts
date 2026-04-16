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
 *
 * Features:
 *   - In-memory TTL cache for reads (configurable, defaults to 5 min)
 *   - Offline mutation queue: failed mutations are persisted to localStorage
 *     and replayed on the next successful online request
 */

import type { SettlementLeg, SettlementLegStatus } from "../../../types/app";
import { getSupabase } from "../../../utils/supabase-client";

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001";

const QUEUE_STORAGE_KEY = "chopdot:settlement_mutation_queue";

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

// ─── Idempotency key cache ────────────────────────────────────────────────────

/**
 * In-memory cache of idempotency keys keyed by a canonical batch signature.
 * Retries of the same logical batch reuse the key; cleared after success so a
 * genuinely new batch gets a fresh key.
 */
const _idempotencyCache = new Map<string, string>();

function batchCacheKey(
  potId: string,
  legs: Array<{ fromMemberId: string; toMemberId: string; amount: number }>,
): string {
  const sorted = [...legs].sort((a, b) =>
    `${a.fromMemberId}:${a.toMemberId}:${a.amount}`.localeCompare(
      `${b.fromMemberId}:${b.toMemberId}:${b.amount}`,
    ),
  );
  return `${potId}:${sorted.map(l => `${l.fromMemberId}:${l.toMemberId}:${l.amount}`).join("|")}`;
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ─── Offline mutation queue ───────────────────────────────────────────────────

interface QueuedMutation {
  id: string;
  path: string;
  method: string;
  body?: string;
  enqueuedAt: number;
}

function loadQueue(): QueuedMutation[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedMutation[]): void {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Storage may be unavailable (e.g. private mode quota)
  }
}

function enqueue(mutation: Omit<QueuedMutation, "id" | "enqueuedAt">): void {
  const queue = loadQueue();
  queue.push({ ...mutation, id: crypto.randomUUID(), enqueuedAt: Date.now() });
  saveQueue(queue);
}

async function flushQueue(): Promise<void> {
  const queue = loadQueue();
  if (queue.length === 0) return;

  const failed: QueuedMutation[] = [];
  for (const item of queue) {
    try {
      await apiFetch(item.path, { method: item.method, body: item.body });
    } catch {
      failed.push(item);
    }
  }
  saveQueue(failed);
}

// ─── Cache entry ──────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

// ─── Repository class ─────────────────────────────────────────────────────────

export class SettlementRepository {
  private readonly ttl: number;
  private readonly maxCacheSize: number;
  private readonly cache = new Map<string, CacheEntry<SettlementLeg[]>>();

  constructor(ttl: number = 300_000, maxCacheSize: number = 100) {
    this.ttl = ttl;
    this.maxCacheSize = maxCacheSize;
  }

  // ─── Cache helpers ──────────────────────────────────────────────────────────

  private getCached(key: string): SettlementLeg[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  private setCached(key: string, value: SettlementLeg[]): void {
    // Evict oldest entry when at capacity
    if (!this.cache.has(key) && this.cache.size >= this.maxCacheSize) {
      this.cache.delete(this.cache.keys().next().value!);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + this.ttl });
  }

  private invalidateCache(potId: string): void {
    this.cache.delete(potId);
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /** Fetch all settlement legs for a pot, newest first. Results are cached. */
  async listByPot(potId: string): Promise<SettlementLeg[]> {
    const cached = this.getCached(potId);
    if (cached) return cached;

    // Flush any queued offline mutations before reading
    await flushQueue();

    const rows = await apiFetch<WireLeg[]>(`/api/pots/${potId}/settlements`);
    const legs = rows.map(wireToLeg);
    this.setCached(potId, legs);
    return legs;
  }

  /** Create a batch of settlement legs (propose a chapter). Clears the cache. */
  async createBatch(
    potId: string,
    legs: Array<{
      fromMemberId: string;
      toMemberId: string;
      amount: number;
      currency: string;
    }>,
    idempotencyKey?: string,
  ): Promise<SettlementLeg[]> {
    this.invalidateCache(potId);

    // Auto-generate and cache an idempotency key per batch signature so retries
    // reuse the same key without the caller needing to manage it.
    const cacheKey = batchCacheKey(potId, legs);
    let resolvedKey = idempotencyKey ?? _idempotencyCache.get(cacheKey);
    if (!resolvedKey) {
      resolvedKey = generateIdempotencyKey();
      _idempotencyCache.set(cacheKey, resolvedKey);
    }

    const extraHeaders: HeadersInit = { "x-idempotency-key": resolvedKey };
    try {
      const rows = await apiFetch<WireLeg[]>(`/api/pots/${potId}/settlements`, {
        method: "POST",
        body: JSON.stringify({ legs }),
        headers: extraHeaders,
      });
      // Clear cache entry after success — next distinct batch gets a fresh key
      _idempotencyCache.delete(cacheKey);
      return rows.map(wireToLeg);
    } catch (err) {
      // Queue for offline replay — store the full request (key preserved in cache for retry)
      enqueue({
        path: `/api/pots/${potId}/settlements`,
        method: "POST",
        body: JSON.stringify({ legs }),
      });
      throw err;
    }
  }

  /** @deprecated Use createBatch for multi-leg proposals */
  async create(leg: {
    potId: string;
    fromMemberId: string;
    toMemberId: string;
    amount: number;
    currency: string;
  }): Promise<SettlementLeg> {
    const rows = await this.createBatch(leg.potId, [
      { fromMemberId: leg.fromMemberId, toMemberId: leg.toMemberId, amount: leg.amount, currency: leg.currency },
    ]);
    const first = rows[0];
    if (!first) throw new Error("[SettlementRepository] create returned empty array");
    return first;
  }

  /** Payer marks a leg as paid — pending → paid */
  async markPaid(
    id: string,
    potId: string,
    method: SettlementLeg["method"],
    reference?: string,
  ): Promise<SettlementLeg> {
    this.invalidateCache(potId);
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
    this.invalidateCache(potId);
    const row = await apiFetch<WireLeg>(
      `/api/pots/${potId}/settlements/${id}/confirm`,
      { method: "PATCH" },
    );
    return wireToLeg(row);
  }

  /** @deprecated kept for DataContext interface compat */
  invalidate(): void {
    this.cache.clear();
  }

  /** @deprecated kept for DataContext interface compat */
  async list(): Promise<unknown[]> {
    return [];
  }
}
