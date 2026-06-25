import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CaptureLinkResolveResult,
  CaptureLinkTokenRecord,
  CaptureLinkType,
  ConfirmTokenPayload,
  PayTokenPayload,
  SpendTokenPayload,
} from './types';
import { CaptureLinkError } from './types';

const STORAGE_KEY = 'chopdot_capture_link_tokens';

function randomToken(): string {
  return `cap_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function readStore(): CaptureLinkTokenRecord[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as CaptureLinkTokenRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(records: CaptureLinkTokenRecord[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function findRecord(store: CaptureLinkTokenRecord[], token: string): CaptureLinkTokenRecord | undefined {
  return store.find((record) => record.token === token);
}

function assertRecordUsable(record: CaptureLinkTokenRecord | undefined): CaptureLinkTokenRecord {
  if (!record) {
    throw new CaptureLinkError('not_found', 'Invalid or expired link');
  }

  if (record.consumedAt) {
    throw new CaptureLinkError('consumed', 'This link was already used');
  }

  if (Date.now() >= record.payload.exp) {
    throw new CaptureLinkError('expired', 'Link expired — ask the organiser for a new one');
  }

  return record;
}

function toResolveResult(record: CaptureLinkTokenRecord): CaptureLinkResolveResult {
  switch (record.type) {
    case 'pay':
      return { type: 'pay', payload: record.payload as PayTokenPayload, token: record.token };
    case 'spend':
      return { type: 'spend', payload: record.payload as SpendTokenPayload, token: record.token };
    case 'confirm':
      return { type: 'confirm', payload: record.payload as ConfirmTokenPayload, token: record.token };
    default: {
      const _exhaustive: never = record.type;
      throw new CaptureLinkError('not_found', `Unknown link type: ${String(_exhaustive)}`);
    }
  }
}

function markLocalConsumed(token: string): void {
  const store = readStore();
  const index = store.findIndex((record) => record.token === token);
  if (index === -1) {
    return;
  }

  const record = store[index];
  if (!record) {
    return;
  }

  const nextStore = [...store];
  nextStore[index] = {
    ...record,
    consumedAt: new Date().toISOString(),
  };
  writeStore(nextStore);
}

type DbCaptureRow = {
  token: string;
  type: CaptureLinkType;
  payload: PayTokenPayload | SpendTokenPayload | ConfirmTokenPayload;
  consumed_at: string | null;
  expires_at: string;
};

export class CaptureLinkService {
  constructor(private readonly supabase: SupabaseClient | null = null) {}

  mintPayToken(input: {
    potId: string;
    chapterId: string;
    legId: string;
    fromMemberId: string;
    toMemberId: string;
    toMemberName?: string;
    amount: number;
    currency: string;
    ttlMs?: number;
  }): string {
    const token = randomToken();
    const exp = Date.now() + (input.ttlMs ?? 60 * 60 * 1000);
    const payload: PayTokenPayload = {
      chapterId: input.chapterId,
      potId: input.potId,
      legId: input.legId,
      fromMemberId: input.fromMemberId,
      toMemberId: input.toMemberId,
      toMemberName: input.toMemberName,
      amount: input.amount,
      currency: input.currency,
      exp,
    };

    const record: CaptureLinkTokenRecord = {
      token,
      type: 'pay',
      payload,
    };

    const store = readStore();
    store.push(record);
    writeStore(store);
    return token;
  }

  mintSpendToken(input: {
    potId: string;
    chapterId: string;
    spendSessionId: string;
    payerId: string;
    spendCardId?: string;
    ttlMs?: number;
  }): string {
    const token = randomToken();
    const exp = Date.now() + (input.ttlMs ?? 60 * 60 * 1000);
    const payload: SpendTokenPayload = {
      chapterId: input.chapterId,
      potId: input.potId,
      spendSessionId: input.spendSessionId,
      payerId: input.payerId,
      spendCardId: input.spendCardId,
      exp,
    };

    const record: CaptureLinkTokenRecord = {
      token,
      type: 'spend',
      payload,
    };

    const store = readStore();
    store.push(record);
    writeStore(store);
    return token;
  }

  mintConfirmToken(input: {
    potId: string;
    chapterId: string;
    legId: string;
    receiverId: string;
    receiverName?: string;
    ttlMs?: number;
  }): string {
    const token = randomToken();
    const exp = Date.now() + (input.ttlMs ?? 24 * 60 * 60 * 1000);
    const payload: ConfirmTokenPayload = {
      chapterId: input.chapterId,
      potId: input.potId,
      legId: input.legId,
      receiverId: input.receiverId,
      receiverName: input.receiverName,
      exp,
    };

    const record: CaptureLinkTokenRecord = {
      token,
      type: 'confirm',
      payload,
    };

    const store = readStore();
    store.push(record);
    writeStore(store);
    return token;
  }

  resolveToken(token: string): CaptureLinkResolveResult {
    const store = readStore();
    const record = assertRecordUsable(findRecord(store, token));
    return toResolveResult(record);
  }

  consumeConfirmToken(token: string): ConfirmTokenPayload {
    const store = readStore();
    const index = store.findIndex((record) => record.token === token && record.type === 'confirm');
    const record = assertRecordUsable(index === -1 ? undefined : store[index]);

    if (record.type !== 'confirm') {
      throw new CaptureLinkError('not_found', 'Invalid confirm link');
    }

    markLocalConsumed(token);
    return record.payload as ConfirmTokenPayload;
  }

  consumePayToken(token: string): PayTokenPayload {
    const store = readStore();
    const index = store.findIndex((record) => record.token === token && record.type === 'pay');
    const record = assertRecordUsable(index === -1 ? undefined : store[index]);

    if (record.type !== 'pay') {
      throw new CaptureLinkError('not_found', 'Invalid pay link');
    }

    markLocalConsumed(token);
    return record.payload as PayTokenPayload;
  }

  async mintPayTokenRemote(input: Parameters<CaptureLinkService['mintPayToken']>[0]): Promise<string> {
    const local = this.mintPayToken(input);
    if (!this.supabase) {
      return local;
    }

    try {
      const remote = await this.insertRemoteToken('pay', input.potId, input, input.ttlMs ?? 60 * 60 * 1000);
      return remote ?? local;
    } catch {
      return local;
    }
  }

  async mintConfirmTokenRemote(input: Parameters<CaptureLinkService['mintConfirmToken']>[0]): Promise<string> {
    const local = this.mintConfirmToken(input);
    if (!this.supabase) {
      return local;
    }

    try {
      const remote = await this.insertRemoteToken('confirm', input.potId, input, input.ttlMs ?? 24 * 60 * 60 * 1000);
      return remote ?? local;
    } catch {
      return local;
    }
  }

  async resolveTokenRemote(token: string): Promise<CaptureLinkResolveResult> {
    if (!this.supabase) {
      return this.resolveToken(token);
    }

    try {
      const row = await this.fetchRemoteToken(token);
      if (row) {
        return this.resolveFromRow(row);
      }
    } catch {
      // Fall through to local store (guest demo / same device).
    }

    return this.resolveToken(token);
  }

  async consumeConfirmTokenRemote(token: string): Promise<ConfirmTokenPayload> {
    if (!this.supabase) {
      return this.consumeConfirmToken(token);
    }

    try {
      const consumed = await this.consumeRemoteToken(token, 'confirm');
      if (consumed && consumed.type === 'confirm') {
        return consumed.payload as ConfirmTokenPayload;
      }
    } catch (error) {
      if (error instanceof CaptureLinkError && error.code !== 'not_found') {
        throw error;
      }
    }

    return this.consumeConfirmToken(token);
  }

  private async insertRemoteToken(
    type: CaptureLinkType,
    potId: string,
    payload: Omit<PayTokenPayload, 'exp'> | Omit<SpendTokenPayload, 'exp'> | Omit<ConfirmTokenPayload, 'exp'>,
    ttlMs: number,
  ): Promise<string | null> {
    if (!this.supabase) {
      return null;
    }

    const token = randomToken();
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();
    const payloadWithExp = {
      ...payload,
      exp: Date.parse(expiresAt),
    };

    const { error } = await this.supabase.from('capture_link_tokens').insert({
      token,
      type,
      pot_id: potId,
      payload: payloadWithExp,
      expires_at: expiresAt,
    });

    if (error) {
      return null;
    }

    return token;
  }

  private async fetchRemoteToken(token: string): Promise<DbCaptureRow | null> {
    if (!this.supabase) {
      return null;
    }

    const { data, error } = await this.supabase
      .from('capture_link_tokens')
      .select('token,type,payload,consumed_at,expires_at')
      .eq('token', token)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data as DbCaptureRow;
  }

  private resolveFromRow(row: DbCaptureRow): CaptureLinkResolveResult {
    if (row.consumed_at) {
      throw new CaptureLinkError('consumed', 'This link was already used');
    }

    if (Date.now() >= Date.parse(row.expires_at)) {
      throw new CaptureLinkError('expired', 'Link expired — ask the organiser for a new one');
    }

    const record: CaptureLinkTokenRecord = {
      token: row.token,
      type: row.type,
      payload: row.payload,
    };

    return toResolveResult(record);
  }

  private async consumeRemoteToken(
    token: string,
    expectedType: CaptureLinkType,
  ): Promise<CaptureLinkResolveResult | null> {
    if (!this.supabase) {
      return null;
    }

    const row = await this.fetchRemoteToken(token);
    if (!row || row.type !== expectedType) {
      return null;
    }

    const resolved = this.resolveFromRow(row);

    const { error } = await this.supabase
      .from('capture_link_tokens')
      .update({ consumed_at: new Date().toISOString() })
      .eq('token', token)
      .is('consumed_at', null);

    if (error) {
      throw new CaptureLinkError('not_found', 'Could not consume link');
    }

    return resolved;
  }
}

export const captureLinkService = new CaptureLinkService();

export function createCaptureLinkService(supabase: SupabaseClient | null): CaptureLinkService {
  return new CaptureLinkService(supabase);
}
