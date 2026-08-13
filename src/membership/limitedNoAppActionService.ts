import type {KeyValueStorage} from '../environment/livePayerSync.ts';
import type {AccountMessageSigner, AccountMessageVerifier} from './groupKeyHandoff.ts';
import {
  applyLimitedNoAppRequest,
  applyLimitedNoAppResponse,
  createLimitedNoAppActionState,
  createSignedLimitedNoAppResponse,
  type LimitedNoAppActionState,
  type LimitedNoAppResponseDecision,
  type SignedLimitedNoAppActionV1,
  type SignedLimitedNoAppResponseV1,
} from './limitedNoAppAction.ts';

const JOURNAL_KEY = 'chopdot-limited-no-app-journal-v1';
const OUTBOX_KEY = 'chopdot-limited-no-app-outbox-v1';

export interface VerifiedLimitedActionOrganizerResolver {
  verify(input: {
    groupId: string;
    organizerId: string;
    organizerAccountPublicKeyHex: string;
  }): Promise<boolean>;
}

export interface LimitedNoAppResponseDelivery {
  send(response: SignedLimitedNoAppResponseV1): Promise<{messageId: string}>;
}

export type LimitedNoAppEntryOutcome =
  | {status: 'ready'; requestId: string}
  | {status: 'wrong_account' | 'expired' | 'untrusted_organizer' | 'invalid'};

type StoredLimitedRecord =
  | {kind: 'request'; id: string; value: SignedLimitedNoAppActionV1}
  | {kind: 'response'; id: string; value: SignedLimitedNoAppResponseV1};

interface PendingLimitedResponse {
  deliveryId: string;
  response: SignedLimitedNoAppResponseV1;
}

/**
 * Durable action-only service. It deliberately has no membership coordinator,
 * group-key sink, roster, or history API, so a limited response cannot become
 * membership authority by composition.
 */
export class LimitedNoAppActionService {
  private stateValue: LimitedNoAppActionState = createLimitedNoAppActionState();
  private readonly accountPublicKeyHex: string;

  constructor(private readonly options: {
    actor: {participantId: string; accountPublicKeyHex: string; signer: AccountMessageSigner};
    storage: KeyValueStorage;
    organizerAuthority: VerifiedLimitedActionOrganizerResolver;
    delivery: LimitedNoAppResponseDelivery;
    verifier?: AccountMessageVerifier;
  }) {
    this.accountPublicKeyHex = normalizeAccountKey(options.actor.accountPublicKeyHex);
    if (!options.actor.participantId.trim() || !this.accountPublicKeyHex) {
      throw new Error('A signed Product Account is required.');
    }
  }

  get state(): LimitedNoAppActionState {
    return this.stateValue;
  }

  async enter(request: SignedLimitedNoAppActionV1, now = new Date().toISOString()): Promise<LimitedNoAppEntryOutcome> {
    if (!isTimestamp(now)) return {status: 'invalid'};
    if (
      request.recipientId !== this.options.actor.participantId.trim()
      || normalizeAccountKey(request.recipientAccountPublicKeyHex) !== this.accountPublicKeyHex
    ) return {status: 'wrong_account'};
    if (Date.parse(now) >= Date.parse(request.expiresAt)) return {status: 'expired'};
    if (!await this.options.organizerAuthority.verify({
      groupId: request.groupId,
      organizerId: request.organizerId,
      organizerAccountPublicKeyHex: request.organizerAccountPublicKeyHex,
    })) return {status: 'untrusted_organizer'};
    const transition = await applyLimitedNoAppRequest(this.stateValue, request, this.options.verifier);
    if (transition.outcome === 'rejected') return {status: 'invalid'};
    this.append({kind: 'request', id: request.requestId, value: request});
    this.stateValue = transition.state;
    return {status: 'ready', requestId: request.requestId};
  }

  async restore(now = new Date().toISOString()): Promise<{restored: string[]; rejected: string[]}> {
    if (!isTimestamp(now)) throw new Error('Limited action time is invalid.');
    let state = createLimitedNoAppActionState();
    const restored: string[] = [];
    const rejected: string[] = [];
    for (const record of this.records()) {
      if (record.kind === 'request') {
        const outcome = await this.enterAgainst(state, record.value, now);
        if (outcome.transition) state = outcome.transition.state;
        if (outcome.status === 'ready') restored.push(record.id);
        else rejected.push(record.id);
      } else {
        const transition = await applyLimitedNoAppResponse(state, record.value, this.options.verifier);
        if (transition.outcome === 'rejected') rejected.push(record.id);
        else state = transition.state;
      }
    }
    this.stateValue = state;
    return {restored, rejected};
  }

  async respond(input: {
    requestId: string;
    responseId: string;
    decision: LimitedNoAppResponseDecision;
    respondedAt: string;
  }): Promise<SignedLimitedNoAppResponseV1> {
    const request = this.stateValue.requests[input.requestId];
    if (!request) throw new Error('Limited action is not available.');
    const existing = this.stateValue.responses[input.requestId];
    if (existing) {
      if (existing.decision !== input.decision) {
        throw new Error('This limited action already has another response.');
      }
      this.enqueue(existing);
      return existing;
    }
    const response = await createSignedLimitedNoAppResponse({
      request,
      responseId: input.responseId,
      recipientId: this.options.actor.participantId,
      recipientAccountPublicKeyHex: this.accountPublicKeyHex,
      decision: input.decision,
      respondedAt: input.respondedAt,
      signer: this.options.actor.signer,
      verifier: this.options.verifier,
    });
    const transition = await applyLimitedNoAppResponse(this.stateValue, response, this.options.verifier);
    if (transition.outcome === 'rejected') throw new Error(transition.reason ?? 'Limited response was rejected.');
    this.append({kind: 'response', id: response.responseId, value: response});
    this.stateValue = transition.state;
    this.enqueue(response);
    return response;
  }

  async flush(): Promise<{delivered: string[]; pending: string[]}> {
    const snapshot = this.pending();
    const delivered = new Set<string>();
    for (const item of snapshot) {
      try {
        await this.options.delivery.send(item.response);
        delivered.add(item.deliveryId);
      } catch {
        // Exact signed response remains durable for retry.
      }
    }
    const retained = this.pending().filter(item => !delivered.has(item.deliveryId));
    this.writePending(retained);
    return {delivered: [...delivered], pending: retained.map(item => item.deliveryId)};
  }

  private async enterAgainst(state: LimitedNoAppActionState, request: SignedLimitedNoAppActionV1, now: string) {
    if (
      request.recipientId !== this.options.actor.participantId.trim()
      || normalizeAccountKey(request.recipientAccountPublicKeyHex) !== this.accountPublicKeyHex
    ) return {status: 'wrong_account' as const};
    if (Date.parse(now) >= Date.parse(request.expiresAt)) return {status: 'expired' as const};
    if (!await this.options.organizerAuthority.verify({
      groupId: request.groupId,
      organizerId: request.organizerId,
      organizerAccountPublicKeyHex: request.organizerAccountPublicKeyHex,
    })) return {status: 'untrusted_organizer' as const};
    const transition = await applyLimitedNoAppRequest(state, request, this.options.verifier);
    return transition.outcome === 'rejected'
      ? {status: 'invalid' as const}
      : {status: 'ready' as const, transition};
  }

  private append(record: StoredLimitedRecord): void {
    const records = this.records();
    const existing = records.find(candidate => candidate.kind === record.kind && candidate.id === record.id);
    if (existing) {
      if (stableSerialize(existing) !== stableSerialize(record)) throw new Error('Limited action identifier is already in use.');
      return;
    }
    this.options.storage.write(JOURNAL_KEY, JSON.stringify([...records, record]));
    if (!this.records().some(candidate => stableSerialize(candidate) === stableSerialize(record))) {
      throw new Error('Limited action could not be persisted.');
    }
  }

  private records(): StoredLimitedRecord[] {
    const raw = this.options.storage.read(JOURNAL_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isStoredRecord);
    } catch { return []; }
  }

  private enqueue(response: SignedLimitedNoAppResponseV1): void {
    const deliveryId = `limited:${response.requestId}:${response.responseId}`;
    const items = this.pending();
    const existing = items.find(item => item.deliveryId === deliveryId);
    if (existing) {
      if (stableSerialize(existing.response) !== stableSerialize(response)) throw new Error('Limited delivery identifier is already in use.');
      return;
    }
    this.writePending([...items, {deliveryId, response}]);
  }

  private pending(): PendingLimitedResponse[] {
    const raw = this.options.storage.read(OUTBOX_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed.filter(isPendingResponse) : [];
    } catch { return []; }
  }

  private writePending(items: PendingLimitedResponse[]): void {
    if (items.length === 0) {
      this.options.storage.remove(OUTBOX_KEY);
      if (this.options.storage.read(OUTBOX_KEY)) throw new Error('Limited delivery state could not be persisted.');
      return;
    }
    this.options.storage.write(OUTBOX_KEY, JSON.stringify(items));
    const persisted = this.pending();
    if (stableSerialize(persisted) !== stableSerialize(items)) {
      throw new Error('Limited delivery state could not be persisted.');
    }
  }
}

function isStoredRecord(value: unknown): value is StoredLimitedRecord {
  return isRecord(value)
    && (value.kind === 'request' || value.kind === 'response')
    && typeof value.id === 'string'
    && isRecord(value.value);
}

function isPendingResponse(value: unknown): value is PendingLimitedResponse {
  return isRecord(value) && typeof value.deliveryId === 'string' && isRecord(value.response);
}

function normalizeAccountKey(value: string): string {
  const normalized = value.trim().toLowerCase();
  return /^0x[0-9a-f]{64}$/u.test(normalized) ? normalized : '';
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
