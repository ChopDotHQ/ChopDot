import type {KeyValueStorage} from '../environment/livePayerSync.ts';
import {
  createCanonicalEvent,
  projectCanonicalEvents,
  type CanonicalEventType,
  type CanonicalEventV1,
  type CanonicalGroupStateV1,
  type CanonicalMemberV1,
  type CanonicalSigner,
  type CanonicalVerifier,
} from '../core/moneyEventKernel.ts';
import {allocateMoneyEvenly, moneyFromDecimal, moneyToDecimal, type MoneyV1} from '../core/money.ts';

export interface DinnerJourneyParticipant {
  participantId: string;
  name: string;
  accountPublicKeyHex: string;
  role: 'organizer' | 'member';
}

export interface DinnerJourneyDelivery {
  load(groupId: string): Promise<CanonicalEventV1[]>;
  publish(event: CanonicalEventV1): Promise<void>;
  subscribe(groupId: string, listener: (event: CanonicalEventV1) => void): () => void;
}

type PendingIntent =
  | {id: string; kind: 'mark_paid'; shareId: string; createdAt: string}
  | {id: string; kind: 'confirm_received'; shareId: string; createdAt: string}
  | {id: string; kind: 'close'; recordId: string; createdAt: string};

interface PersistedJourneyV1 {
  v: 1;
  events: CanonicalEventV1[];
  pending: PendingIntent[];
}

export interface DinnerJourneySnapshot {
  status: 'empty' | 'ready_to_request' | 'waiting' | 'payment_requested' | 'sending' | 'marked_paid' | 'needs_confirmation' | 'ready_to_close' | 'closed' | 'unavailable';
  actorId: string;
  actorName: string;
  actorRole: 'organizer' | 'member';
  groupId: string;
  groupName: string;
  description: string;
  total?: MoneyV1;
  ownShare?: MoneyV1;
  members: Array<{participantId: string; name: string; amount?: MoneyV1; status: string}>;
  recordId?: string;
  pendingCount: number;
  error?: string;
}

export interface DinnerJourneyServiceOptions {
  groupId: string;
  actor: DinnerJourneyParticipant;
  participants: DinnerJourneyParticipant[];
  signer: CanonicalSigner;
  verify: CanonicalVerifier;
  storage: KeyValueStorage;
  delivery: DinnerJourneyDelivery;
  now?: () => string;
  randomId?: () => string;
}

const EMPTY_STATE = (groupId: string): CanonicalGroupStateV1 => ({
  v: 1,
  groupId,
  name: '',
  version: 0,
  currentEventId: null,
  organizerId: '',
  members: {},
  expenses: {},
  shares: {},
  closed: null,
  successorRecords: [],
  eventIds: [],
});

export class DinnerJourneyService {
  private readonly storageKey: string;
  private readonly listeners = new Set<() => void>();
  private readonly options: DinnerJourneyServiceOptions;
  private events: CanonicalEventV1[] = [];
  private pending: PendingIntent[] = [];
  private state: CanonicalGroupStateV1;
  private error?: string;
  private unsubscribe?: () => void;
  private initialized = false;
  private receiveQueue: Promise<void> = Promise.resolve();

  constructor(options: DinnerJourneyServiceOptions) {
    this.options = options;
    this.storageKey = `chopdot-dinner-journey-v1:${options.groupId}:${options.actor.participantId}`;
    this.state = EMPTY_STATE(options.groupId);
  }

  async start(): Promise<void> {
    if (this.initialized) return;
    this.restore();
    this.unsubscribe = this.options.delivery.subscribe(this.options.groupId, event => {
      this.receiveQueue = this.receiveQueue
        .then(() => this.receive(event))
        .catch(reason => {
          this.error = errorMessage(reason);
          this.notify();
        });
    });
    await this.sync();
    this.initialized = true;
    await this.flush();
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.initialized = false;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async reconnect(): Promise<void> {
    await this.sync();
    await this.flush();
  }

  getCanonicalState(): CanonicalGroupStateV1 {
    return structuredClone(this.state);
  }

  getAcceptedEvents(): CanonicalEventV1[] {
    return structuredClone(this.events);
  }

  getSnapshot(): DinnerJourneySnapshot {
    const {actor, participants, groupId} = this.options;
    const expense = Object.values(this.state.expenses)[0];
    const total = expense?.total;
    const ownShare = this.state.shares[`share-${actor.participantId}`]?.amount;
    const pendingCount = this.pending.length;
    const members = participants.map(participant => {
      const share = this.state.shares[`share-${participant.participantId}`];
      return {
        participantId: participant.participantId,
        name: participant.name,
        ...(share ? {amount: share.amount, status: displayShareStatus(share.status, participant.role)} : {status: participant.role === 'organizer' ? 'Paid the bill' : 'Not asked yet'}),
      };
    });

    if (this.error) return {status: 'unavailable', actorId: actor.participantId, actorName: actor.name, actorRole: actor.role, groupId, groupName: this.state.name || 'Dinner', description: expense?.description ?? '', members, pendingCount, error: this.error};
    if (!this.state.organizerId) return {status: 'empty', actorId: actor.participantId, actorName: actor.name, actorRole: actor.role, groupId, groupName: 'Zurich Dinner', description: '', members, pendingCount};
    if (this.state.closed) return {status: 'closed', actorId: actor.participantId, actorName: actor.name, actorRole: actor.role, groupId, groupName: this.state.name, description: expense?.description ?? '', total, ownShare, members, recordId: this.state.closed.recordId, pendingCount};

    const requiredShares = Object.values(this.state.shares).filter(share => share.participantId !== this.state.organizerId);
    const marked = requiredShares.filter(share => share.status === 'marked_paid');
    const allReceived = requiredShares.length > 0 && requiredShares.every(share => ['received', 'waived'].includes(share.status));
    const own = this.state.shares[`share-${actor.participantId}`];
    let status: DinnerJourneySnapshot['status'];
    if (actor.role === 'organizer') {
      if (allReceived) status = 'ready_to_close';
      else if (marked.length) status = 'needs_confirmation';
      else if (requiredShares.some(share => share.status === 'requested')) status = 'waiting';
      else status = 'ready_to_request';
    } else if (pendingCount) status = 'sending';
    else if (own?.status === 'requested') status = 'payment_requested';
    else if (own?.status === 'marked_paid') status = 'marked_paid';
    else status = 'waiting';
    return {status, actorId: actor.participantId, actorName: actor.name, actorRole: actor.role, groupId, groupName: this.state.name, description: expense?.description ?? '', total, ownShare, members, pendingCount};
  }

  async createDinner(input: {groupName: string; description: string; totalDecimal: string; currency: string}): Promise<void> {
    if (this.options.actor.role !== 'organizer') throw new Error('Only the organizer may start the dinner.');
    await this.sync();
    if (this.state.version !== 0) throw new Error('This dinner already exists.');
    const members: CanonicalMemberV1[] = this.options.participants.map(({participantId, accountPublicKeyHex, role}) => ({participantId, accountPublicKeyHex, role}));
    await this.publishEvent('GROUP_CREATED', {name: input.groupName, organizerId: this.options.actor.participantId, members});
    const total = moneyFromDecimal(input.totalDecimal, input.currency);
    const allocations = allocateMoneyEvenly(total, members.map(member => member.participantId));
    await this.publishEvent('EXPENSE_ADDED', {expenseId: 'expense-dinner', description: input.description, paidBy: this.options.actor.participantId, total, allocations});
    for (const participant of this.options.participants.filter(person => person.role === 'member')) {
      await this.publishEvent('SHARE_REQUESTED', {shareId: `share-${participant.participantId}`});
    }
  }

  async markPaid(): Promise<void> {
    if (this.options.actor.role !== 'member') throw new Error('Only a requested member may mark their share paid.');
    this.enqueue({id: this.id('mark-paid'), kind: 'mark_paid', shareId: `share-${this.options.actor.participantId}`, createdAt: this.now()});
    await this.flush();
  }

  async confirmReceived(participantId: string): Promise<void> {
    if (this.options.actor.role !== 'organizer') throw new Error('Only the receiver may confirm receipt.');
    this.enqueue({id: this.id(`confirm-${participantId}`), kind: 'confirm_received', shareId: `share-${participantId}`, createdAt: this.now()});
    await this.flush();
  }

  async close(): Promise<void> {
    if (this.options.actor.role !== 'organizer') throw new Error('Only the organizer may close the record.');
    this.enqueue({id: this.id('close'), kind: 'close', recordId: `record-${this.options.groupId}`, createdAt: this.now()});
    await this.flush();
  }

  async flush(): Promise<void> {
    await this.sync();
    for (const intent of [...this.pending]) {
      if (intentSatisfied(this.state, intent)) {
        this.removeIntent(intent.id);
        continue;
      }
      try {
        if (intent.kind === 'mark_paid') await this.publishEvent('SHARE_MARKED_PAID', {shareId: intent.shareId}, intent.id, intent.createdAt);
        else if (intent.kind === 'confirm_received') await this.publishEvent('SHARE_RECEIVED', {shareId: intent.shareId}, intent.id, intent.createdAt);
        else await this.publishEvent('GROUP_CLOSED', {recordId: intent.recordId}, intent.id, intent.createdAt);
        this.removeIntent(intent.id);
      } catch (reason) {
        this.error = deliveryError(reason) ? undefined : errorMessage(reason);
        this.persist();
        this.notify();
        break;
      }
    }
  }

  private async publishEvent(eventType: CanonicalEventType, payload: CanonicalEventV1['payload'], commandId = this.id(eventType.toLowerCase()), occurredAt = this.now()): Promise<void> {
    await this.sync();
    const event = await createCanonicalEvent({
      eventId: `event-${commandId}`,
      commandId,
      groupId: this.options.groupId,
      eventType,
      expectedVersion: this.state.version,
      parentEventId: this.state.currentEventId,
      actorId: this.options.actor.participantId,
      actorAccountPublicKeyHex: this.options.actor.accountPublicKeyHex,
      actorRole: this.options.actor.role,
      occurredAt,
      payload,
    }, this.options.signer);
    const preflight = await projectCanonicalEvents([...this.events, event], this.options.verify);
    if (!preflight.state.eventIds.includes(event.eventId)) {
      const issue = [...preflight.rejected, ...preflight.conflicts].find(row => row.eventId === event.eventId);
      throw new Error(issue?.reason ?? 'This action is no longer available.');
    }
    await this.options.delivery.publish(event);
    await this.receiveQueue;
    if (!this.state.eventIds.includes(event.eventId)) await this.receive(event);
  }

  private async sync(): Promise<void> {
    try {
      const remote = await this.options.delivery.load(this.options.groupId);
      if (this.events.length === 0 && remote.length === 0) {
        this.state = EMPTY_STATE(this.options.groupId);
        this.error = undefined;
        this.persist();
        this.notify();
        return;
      }
      await this.project([...this.events, ...remote]);
      this.error = undefined;
    } catch (reason) {
      if (!deliveryError(reason)) this.error = errorMessage(reason);
    }
  }

  private async receive(event: CanonicalEventV1): Promise<void> {
    if (event.groupId !== this.options.groupId) return;
    await this.project([...this.events, event]);
  }

  private async project(events: CanonicalEventV1[]): Promise<void> {
    const projection = await projectCanonicalEvents(events, this.options.verify);
    if (projection.rejected.length) throw new Error(projection.rejected[0].reason);
    const acceptedIds = new Set(projection.state.eventIds);
    this.events = uniqueEvents(events).filter(event => acceptedIds.has(event.eventId));
    this.state = projection.state;
    this.error = undefined;
    this.persist();
    this.notify();
  }

  private enqueue(intent: PendingIntent): void {
    if (!this.pending.some(existing => existing.kind === intent.kind && ('shareId' in existing ? existing.shareId === ('shareId' in intent ? intent.shareId : '') : existing.kind === 'close'))) {
      this.pending.push(intent);
      this.persist();
      this.notify();
    }
  }

  private removeIntent(id: string): void {
    this.pending = this.pending.filter(intent => intent.id !== id);
    this.persist();
    this.notify();
  }

  private restore(): void {
    const raw = this.options.storage.read(this.storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as PersistedJourneyV1;
      if (parsed.v !== 1 || !Array.isArray(parsed.events) || !Array.isArray(parsed.pending)) throw new Error('invalid');
      this.events = parsed.events;
      this.pending = parsed.pending;
    } catch {
      this.error = 'This dinner could not be restored safely.';
    }
  }

  private persist(): void {
    this.options.storage.write(this.storageKey, JSON.stringify({v: 1, events: this.events, pending: this.pending} satisfies PersistedJourneyV1));
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  private now(): string { return this.options.now?.() ?? new Date().toISOString(); }
  private id(label: string): string { return `${label}-${this.options.randomId?.() ?? crypto.randomUUID()}`; }
}

export class MemoryDinnerJourneyDelivery implements DinnerJourneyDelivery {
  private readonly events = new Map<string, CanonicalEventV1[]>();
  private readonly listeners = new Map<string, Set<(event: CanonicalEventV1) => void>>();
  private online = true;

  setOnline(online: boolean): void { this.online = online; }
  async load(groupId: string): Promise<CanonicalEventV1[]> {
    if (!this.online) throw new Error('delivery_offline');
    return structuredClone(this.events.get(groupId) ?? []);
  }
  async publish(event: CanonicalEventV1): Promise<void> {
    if (!this.online) throw new Error('delivery_offline');
    const rows = this.events.get(event.groupId) ?? [];
    if (!rows.some(row => row.eventId === event.eventId)) rows.push(structuredClone(event));
    this.events.set(event.groupId, rows);
    for (const listener of this.listeners.get(event.groupId) ?? []) listener(structuredClone(event));
  }
  subscribe(groupId: string, listener: (event: CanonicalEventV1) => void): () => void {
    const listeners = this.listeners.get(groupId) ?? new Set();
    listeners.add(listener);
    this.listeners.set(groupId, listeners);
    return () => listeners.delete(listener);
  }
}

export class MemoryKeyValueStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();
  read(key: string): string | null { return this.values.get(key) ?? null; }
  write(key: string, value: string): void { this.values.set(key, value); }
  remove(key: string): void { this.values.delete(key); }
}

function uniqueEvents(events: CanonicalEventV1[]): CanonicalEventV1[] {
  const byId = new Map<string, CanonicalEventV1>();
  for (const event of events) if (!byId.has(event.eventId)) byId.set(event.eventId, event);
  return [...byId.values()];
}

function intentSatisfied(state: CanonicalGroupStateV1, intent: PendingIntent): boolean {
  if (intent.kind === 'close') return state.closed?.recordId === intent.recordId;
  const share = state.shares[intent.shareId];
  if (!share) return false;
  if (intent.kind === 'mark_paid') return ['marked_paid', 'received'].includes(share.status);
  return share.status === 'received';
}

function displayShareStatus(status: string, role: 'organizer' | 'member'): string {
  if (role === 'organizer') return 'Paid the bill';
  if (status === 'open') return 'Not asked yet';
  if (status === 'requested') return 'Payment requested';
  if (status === 'marked_paid') return 'Marked paid';
  if (status === 'received') return 'Received';
  if (status === 'waived') return 'Waived';
  return 'Needs review';
}

function deliveryError(reason: unknown): boolean {
  return reason instanceof Error && reason.message === 'delivery_offline';
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'This dinner is unavailable.';
}

export function displayMoney(value: MoneyV1 | undefined): string {
  if (!value) return '';
  return `${value.currency} ${moneyToDecimal(value)}`;
}
