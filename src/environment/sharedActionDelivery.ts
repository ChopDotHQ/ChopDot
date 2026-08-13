import type {AppState} from '../types.ts';
import type {KeyValueStorage} from './livePayerSync.ts';
import {
  assertSharedActionEnvelope,
  type HostSessionConfig,
  type SharedAction,
  type SharedActionEnvelope,
} from './hostSessionSync.ts';

const OUTBOX_KEY = 'chopdot-shared-action-outbox-v1';
const PROCESSED_EVENTS_KEY = 'chopdot-processed-shared-events-v1';
const DEFERRED_EVENTS_KEY = 'chopdot-deferred-shared-events-v1';

export type ProcessedEventOutcome = 'local' | 'applied' | 'rejected';

export interface PendingSharedActionDelivery {
  deliveryId: string;
  session: HostSessionConfig;
  envelope: SharedActionEnvelope;
  queuedAt: string;
}

export interface ProcessedEventRecord {
  eventId: string;
  outcome: ProcessedEventOutcome;
}

export interface DeferredSharedEventRecord {
  eventId: string;
  envelope: SharedActionEnvelope;
  signerHex?: string;
  receivedAt: string;
}

/**
 * Persistent delivery for ordinary shared actions. This is deliberately a
 * transport queue, not application state: the reducer and authority checks
 * remain the only place an action can change money truth.
 */
export class SharedActionOutbox {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly storageKey = OUTBOX_KEY,
  ) {}

  enqueue(input: {
    session: HostSessionConfig;
    envelope: SharedActionEnvelope;
    queuedAt?: string;
  }): PendingSharedActionDelivery {
    const deliveryId = sharedDeliveryId(input.envelope.eventId, input.session);
    const items = this.list();
    const existing = items.find(item => item.deliveryId === deliveryId);
    if (existing) return existing;
    const pending: PendingSharedActionDelivery = {
      deliveryId,
      session: input.session,
      envelope: input.envelope,
      queuedAt: input.queuedAt ?? new Date().toISOString(),
    };
    items.push(pending);
    this.writeAll(items);
    return pending;
  }

  list(): PendingSharedActionDelivery[] {
    const stored = this.storage.read(this.storageKey);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored) as unknown;
      return Array.isArray(parsed) ? parsed.filter(isPendingSharedActionDelivery) : [];
    } catch {
      return [];
    }
  }

  async flush(
    publish: (item: PendingSharedActionDelivery) => Promise<boolean>,
  ): Promise<{published: string[]; pending: string[]}> {
    const snapshot = this.list();
    const published = new Set<string>();
    for (const item of snapshot) {
      let accepted = false;
      try {
        accepted = await publish(item);
      } catch {
        accepted = false;
      }
      if (accepted) published.add(item.deliveryId);
    }

    // Re-read before removal so an action queued while this flush was awaiting
    // network I/O cannot be overwritten by the older snapshot.
    const retained = this.list().filter(item => !published.has(item.deliveryId));
    this.writeAll(retained);
    return {
      published: Array.from(published),
      pending: retained.map(item => item.deliveryId),
    };
  }

  clear(): void {
    this.storage.remove(this.storageKey);
  }

  private writeAll(items: PendingSharedActionDelivery[]): void {
    if (items.length === 0) {
      this.storage.remove(this.storageKey);
      return;
    }
    this.storage.write(this.storageKey, JSON.stringify(items));
  }
}

/** Restart-safe duplicate suppression for terminally handled shared events. */
export class ProcessedEventLedger {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly storageKey = PROCESSED_EVENTS_KEY,
  ) {}

  has(eventId: string): boolean {
    return this.list().some(record => record.eventId === eventId);
  }

  record(eventId: string, outcome: ProcessedEventOutcome): void {
    if (!eventId || this.has(eventId)) return;
    // Event IDs cannot be evicted safely until a signed checkpoint or compacted
    // snapshot makes replay before that boundary impossible.
    const records = [...this.list(), {eventId, outcome}];
    this.storage.write(this.storageKey, JSON.stringify(records));
  }

  list(): ProcessedEventRecord[] {
    const stored = this.storage.read(this.storageKey);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored) as unknown;
      return Array.isArray(parsed) ? parsed.filter(isProcessedEventRecord) : [];
    } catch {
      return [];
    }
  }

  clear(): void {
    this.storage.remove(this.storageKey);
  }
}

/**
 * Device-local persistence for verified envelopes whose causal prerequisites
 * have not arrived yet. The first record for an event ID is authoritative: a
 * later packet cannot replace deferred content by reusing the same ID.
 */
export class DeferredSharedEventInbox {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly storageKey = DEFERRED_EVENTS_KEY,
  ) {}

  defer(input: {
    envelope: SharedActionEnvelope;
    signerHex?: string;
    receivedAt?: string;
  }): DeferredSharedEventRecord {
    assertSharedActionEnvelope(input.envelope);
    const items = this.list();
    const existing = items.find(item => item.eventId === input.envelope.eventId);
    if (existing) return existing;
    const pending: DeferredSharedEventRecord = {
      eventId: input.envelope.eventId,
      envelope: input.envelope,
      ...(input.signerHex ? {signerHex: input.signerHex} : {}),
      receivedAt: input.receivedAt ?? new Date().toISOString(),
    };
    if (!isDeferredSharedEventRecord(pending)) {
      throw new Error('Deferred shared event is invalid.');
    }
    items.push(pending);
    this.writeAll(items);
    const persisted = this.list().find(item => item.eventId === pending.eventId);
    if (!persisted) throw new Error('Deferred shared event could not be persisted.');
    return persisted;
  }

  list(): DeferredSharedEventRecord[] {
    const stored = this.storage.read(this.storageKey);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored) as unknown;
      return Array.isArray(parsed) ? parsed.filter(isDeferredSharedEventRecord) : [];
    } catch {
      return [];
    }
  }

  remove(eventId: string): void {
    // Re-read before removal so an independently deferred event cannot be
    // overwritten by a stale snapshot.
    this.writeAll(this.list().filter(item => item.eventId !== eventId));
  }

  clear(): void {
    this.storage.remove(this.storageKey);
  }

  private writeAll(items: DeferredSharedEventRecord[]): void {
    if (items.length === 0) {
      this.storage.remove(this.storageKey);
      return;
    }
    this.storage.write(this.storageKey, JSON.stringify(items));
  }
}

export function restoreDeferredSharedEvents(
  inbox: DeferredSharedEventInbox,
  processedEventIds: ReadonlySet<string>,
): Map<string, {envelope: SharedActionEnvelope; signerHex?: string}> {
  const restored = new Map<string, {envelope: SharedActionEnvelope; signerHex?: string}>();
  for (const record of inbox.list()) {
    if (processedEventIds.has(record.eventId)) {
      inbox.remove(record.eventId);
      continue;
    }
    restored.set(record.eventId, {
      envelope: record.envelope,
      ...(record.signerHex ? {signerHex: record.signerHex} : {}),
    });
  }
  return restored;
}

export function resolveSharedActionSessions(
  state: AppState,
  action: SharedAction,
  querySession: HostSessionConfig | null,
): HostSessionConfig[] {
  const sessions = new Map<string, HostSessionConfig>();
  if (querySession) sessions.set(sharedSessionKey(querySession), querySession);

  for (const groupId of sharedActionGroupIds(state, action)) {
    const session = state.groups[groupId]?.liveSession;
    if (session) sessions.set(sharedSessionKey(session), session);
  }

  return Array.from(sessions.values());
}

export function sharedSessionKey(session: HostSessionConfig): string {
  return `${session.roomId}:${session.secret}`;
}

function sharedDeliveryId(eventId: string, session: HostSessionConfig): string {
  return `${eventId}:${sharedSessionKey(session)}`;
}

function sharedActionGroupIds(state: AppState, action: SharedAction): string[] {
  switch (action.type) {
    case 'ADD_USER':
      return Object.values(state.groups)
        .filter(group => group.memberIds.includes(action.payload.user.id))
        .map(group => group.id);
    case 'SET_WALLET_ADDRESS':
      return Object.values(state.groups)
        .filter(group => group.memberIds.includes(action.payload.userId))
        .map(group => group.id);
    case 'CREATE_GROUP':
      return [action.payload.group.id];
    case 'ADD_EXPENSE':
      return [action.payload.expense.groupId];
    case 'SEND_REQUEST':
    case 'MARK_PAID':
    case 'CONFIRM_RECEIVED':
    case 'RECORD_MATCHED_PAYMENT': {
      const split = state.splits[action.payload.splitId];
      const groupId = split ? state.expenses[split.expenseId]?.groupId : undefined;
      return groupId ? [groupId] : [];
    }
    case 'SAVE_RECORD':
      return [action.payload.groupId];
  }
}

function isPendingSharedActionDelivery(value: unknown): value is PendingSharedActionDelivery {
  if (!isRecord(value)) return false;
  if (
    typeof value.deliveryId !== 'string'
    || !value.deliveryId
    || !isRecord(value.session)
    || typeof value.session.roomId !== 'string'
    || !value.session.roomId
    || typeof value.session.secret !== 'string'
    || !value.session.secret
    || typeof value.queuedAt !== 'string'
    || Number.isNaN(Date.parse(value.queuedAt))
  ) return false;
  try {
    assertSharedActionEnvelope(value.envelope);
    return value.deliveryId === sharedDeliveryId(value.envelope.eventId, value.session as HostSessionConfig);
  } catch {
    return false;
  }
}

function isProcessedEventRecord(value: unknown): value is ProcessedEventRecord {
  return isRecord(value)
    && typeof value.eventId === 'string'
    && Boolean(value.eventId)
    && ['local', 'applied', 'rejected'].includes(String(value.outcome));
}

function isDeferredSharedEventRecord(value: unknown): value is DeferredSharedEventRecord {
  if (
    !isRecord(value)
    || typeof value.eventId !== 'string'
    || !value.eventId
    || typeof value.receivedAt !== 'string'
    || Number.isNaN(Date.parse(value.receivedAt))
    || (value.signerHex !== undefined && !/^0x[0-9a-f]{64}$/iu.test(String(value.signerHex)))
  ) return false;
  try {
    assertSharedActionEnvelope(value.envelope);
    return value.eventId === value.envelope.eventId;
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
