import {
  canonicalBytes,
  canonicalHash,
  canonicalJson,
  bytesToHex,
  cloneJson,
  domainSeparatedCanonicalBytes,
  hexToBytes,
  isRecord,
} from './canonical.ts';
import {
  addMoney,
  assertConservation,
  assertMoney,
  moneyEquals,
  moneyFromMinorUnits,
  type MoneyAllocationV1,
  type MoneyV1,
} from './money.ts';

export type ParticipantRole = 'organizer' | 'member';
export type ShareStatus = 'open' | 'requested' | 'marked_paid' | 'received' | 'waived' | 'disputed';
export type AdjustmentKind = 'correction' | 'refund' | 'fee' | 'waiver' | 'partial_payment' | 'dispute';

export interface CanonicalMemberV1 {participantId: string; accountPublicKeyHex: string; role: ParticipantRole}
export interface CanonicalExpenseV1 {
  expenseId: string;
  description: string;
  paidBy: string;
  originalTotal: MoneyV1;
  total: MoneyV1;
  revisions: Array<{eventId: string; reason: string; previousTotal: MoneyV1; nextTotal: MoneyV1}>;
}
export interface CanonicalShareV1 {
  shareId: string;
  expenseId: string;
  participantId: string;
  originalAmount: MoneyV1;
  amount: MoneyV1;
  status: ShareStatus;
  adjustments: Array<{eventId: string; kind: AdjustmentKind; delta: MoneyV1; reason: string}>;
}
export interface CanonicalGroupStateV1 {
  v: 1;
  groupId: string;
  name: string;
  version: number;
  currentEventId: string | null;
  organizerId: string;
  members: Record<string, CanonicalMemberV1>;
  expenses: Record<string, CanonicalExpenseV1>;
  shares: Record<string, CanonicalShareV1>;
  closed: null | {recordId: string; eventId: string; total: MoneyV1; currencyTotals: Record<string, MoneyV1>};
  successorRecords: Array<{recordId: string; predecessorRecordId: string; eventId: string; reason: string}>;
  eventIds: string[];
}

export type ChopEventPayloadV1 =
  | {name: string; organizerId: string; members: CanonicalMemberV1[]}
  | {expenseId: string; description: string; paidBy: string; total: MoneyV1; allocations: MoneyAllocationV1[]}
  | {shareId: string}
  | {shareId: string; exactFinalizedPayment?: boolean}
  | {expenseId: string; reason: string; total: MoneyV1; allocations: MoneyAllocationV1[]}
  | {shareId: string; kind: AdjustmentKind; delta: MoneyV1; reason: string}
  | {recordId: string}
  | {recordId: string; predecessorRecordId: string; reason: string};

export type CanonicalEventType =
  | 'GROUP_CREATED'
  | 'EXPENSE_ADDED'
  | 'SHARE_REQUESTED'
  | 'SHARE_MARKED_PAID'
  | 'SHARE_RECEIVED'
  | 'EXPENSE_CORRECTED'
  | 'SHARE_ADJUSTED'
  | 'GROUP_CLOSED'
  | 'SUCCESSOR_RECORD_CREATED';

export interface CanonicalEventInput {
  eventId: string;
  commandId: string;
  groupId: string;
  eventType: CanonicalEventType;
  expectedVersion: number;
  parentEventId: string | null;
  actorId: string;
  actorAccountPublicKeyHex: string;
  actorRole: ParticipantRole;
  occurredAt: string;
  acceptedAt?: string;
  eventVersion?: 1;
  keyVersion?: number;
  visibility?: 'group_encrypted';
  payload: ChopEventPayloadV1;
}

export interface CanonicalEventV1 extends Omit<CanonicalEventInput, 'acceptedAt' | 'eventVersion' | 'keyVersion' | 'visibility'> {
  v: 1;
  acceptedAt: string;
  eventVersion: 1;
  keyVersion: number;
  visibility: 'group_encrypted';
  payloadHash: string;
  signatureHex: string;
}

/** Public v1 names. CanonicalEvent* aliases remain for source compatibility. */
export type ChopEventInputV1 = CanonicalEventInput;
export type ChopEventV1 = CanonicalEventV1;
export type ChopEventTypeV1 = CanonicalEventType;

export interface CanonicalSigner {sign(bytes: Uint8Array): Promise<Uint8Array>}
export type CanonicalVerifier = (bytes: Uint8Array, signature: Uint8Array, publicKeyHex: string) => Promise<boolean>;
export interface ProjectionIssue {eventId: string; reason: string}
export interface CanonicalProjectionResult {
  state: CanonicalGroupStateV1;
  stateHash: string;
  frontierHash: string;
  duplicates: ProjectionIssue[];
  conflicts: ProjectionIssue[];
  rejected: ProjectionIssue[];
}

export interface CanonicalFrontierV1 {
  readonly v: 1;
  readonly groupId: string;
  readonly version: number;
  readonly currentEventId: string | null;
  readonly eventIds: readonly string[];
}

export type ChopFrontierV1 = CanonicalFrontierV1;

export async function createCanonicalEvent(input: CanonicalEventInput, signer: CanonicalSigner): Promise<CanonicalEventV1> {
  const normalized = cloneJson({
    ...input,
    acceptedAt: input.acceptedAt ?? input.occurredAt,
    eventVersion: input.eventVersion ?? 1,
    keyVersion: input.keyVersion ?? 1,
    visibility: input.visibility ?? 'group_encrypted',
  }) as CanonicalEventV1;
  assertInput(normalized);
  const payloadHash = await canonicalHash(normalized.payload);
  const unsigned = {v: 1 as const, ...normalized, payloadHash};
  const signature = await signer.sign(canonicalEventSigningBytes(unsigned));
  if (!(signature instanceof Uint8Array) || signature.byteLength < 16) throw new Error('Canonical event signature is invalid.');
  return {...unsigned, signatureHex: bytesToHex(signature)};
}

export function canonicalEventSigningBytes(event: Omit<CanonicalEventV1, 'signatureHex'>): Uint8Array {
  return domainSeparatedCanonicalBytes('chopdot:money-event:v1', event);
}

export async function projectCanonicalEvents(
  input: CanonicalEventV1[],
  verify: CanonicalVerifier,
  seed?: CanonicalGroupStateV1,
): Promise<CanonicalProjectionResult> {
  const duplicates: ProjectionIssue[] = [];
  const conflicts: ProjectionIssue[] = [];
  const rejected: ProjectionIssue[] = [];
  const byId = new Map<string, CanonicalEventV1>();
  const validated: CanonicalEventV1[] = [];
  const compactedEventIds = new Set(seed?.eventIds ?? []);

  for (const candidate of input) {
    let event: CanonicalEventV1;
    try {
      event = cloneJson(candidate);
      await assertCanonicalEvent(event, verify);
    } catch (reason) {
      rejected.push({eventId: isRecord(candidate) && typeof candidate.eventId === 'string' ? candidate.eventId : 'unknown', reason: message(reason)});
      continue;
    }
    if (compactedEventIds.has(event.eventId)) {
      duplicates.push({eventId: event.eventId, reason: 'already represented by the verified checkpoint'});
      continue;
    }
    validated.push(event);
  }

  // Validate identity reuse as a set so input arrival order cannot select
  // which signed content becomes authoritative.
  for (const events of groupBy(validated, event => event.eventId).values()) {
    const unique = uniqueCanonicalEvents(events);
    if (unique.length > 1) {
      for (const event of unique) rejected.push({eventId: event.eventId, reason: 'event ID reused with different content'});
      continue;
    }
    byId.set(unique[0].eventId, unique[0]);
    for (let index = 1; index < events.length; index += 1) {
      duplicates.push({eventId: unique[0].eventId, reason: 'exact duplicate'});
    }
  }

  for (const events of groupBy([...byId.values()], event => event.commandId).values()) {
    if (events.length < 2) continue;
    for (const event of events) {
      byId.delete(event.eventId);
      rejected.push({eventId: event.eventId, reason: 'command ID reused with different content'});
    }
  }

  const groupIds = [...new Set(validated.map(event => event.groupId))];
  if (seed) groupIds.push(seed.groupId);
  if (new Set(groupIds).size !== 1) throw new Error('Projection requires exactly one group aggregate.');
  if (!seed && groupIds.length === 0) throw new Error('Projection requires exactly one group aggregate.');
  let state = seed ? cloneJson(seed) : emptyState(groupIds[0]);
  assertSeedState(state);
  const remaining = new Map(byId);

  while (true) {
    const candidates = [...remaining.values()]
      .filter(event => event.expectedVersion === state.version && event.parentEventId === state.currentEventId)
      .sort((left, right) => left.eventId.localeCompare(right.eventId));
    if (candidates.length === 0) break;
    const valid: Array<{event: CanonicalEventV1; state: CanonicalGroupStateV1}> = [];
    for (const event of candidates) {
      try {
        valid.push({event, state: applyEvent(state, event)});
      } catch (reason) {
        rejected.push({eventId: event.eventId, reason: message(reason)});
        remaining.delete(event.eventId);
      }
    }
    if (valid.length === 0) continue;
    const winner = valid[0];
    state = winner.state;
    remaining.delete(winner.event.eventId);
    for (const loser of valid.slice(1)) {
      conflicts.push({eventId: loser.event.eventId, reason: `conflicts with ${winner.event.eventId} at version ${winner.event.expectedVersion}`});
      remaining.delete(loser.event.eventId);
    }
  }

  for (const event of [...remaining.values()].sort((left, right) => left.eventId.localeCompare(right.eventId))) {
    conflicts.push({eventId: event.eventId, reason: 'causal parent or expected version is not on the accepted frontier'});
  }
  duplicates.sort(compareProjectionIssues);
  conflicts.sort(compareProjectionIssues);
  rejected.sort(compareProjectionIssues);
  return {
    state,
    stateHash: await canonicalStateHash(state),
    frontierHash: await canonicalFrontierHash(state),
    duplicates,
    conflicts,
    rejected,
  };
}

export function canonicalStateBytes(state: CanonicalGroupStateV1): Uint8Array {
  return canonicalBytes(state);
}

export async function canonicalStateHash(state: CanonicalGroupStateV1): Promise<string> {
  return canonicalHash(state);
}

export function canonicalFrontier(state: CanonicalGroupStateV1): CanonicalFrontierV1 {
  assertSeedState(state);
  return {
    v: 1,
    groupId: state.groupId,
    version: state.version,
    currentEventId: state.currentEventId,
    eventIds: [...state.eventIds],
  };
}

export function canonicalFrontierBytes(state: CanonicalGroupStateV1): Uint8Array {
  return domainSeparatedCanonicalBytes('chopdot:event-frontier:v1', canonicalFrontier(state));
}

export function canonicalFrontierHash(state: CanonicalGroupStateV1): Promise<string> {
  return canonicalHash(['chopdot:event-frontier:v1', canonicalFrontier(state)]);
}

async function assertCanonicalEvent(event: CanonicalEventV1, verify: CanonicalVerifier): Promise<void> {
  if (!isRecord(event) || event.v !== 1 || typeof event.payloadHash !== 'string' || typeof event.signatureHex !== 'string') {
    throw new Error('Canonical event is invalid.');
  }
  const {signatureHex, ...unsigned} = event;
  assertInput(unsigned);
  if (event.payloadHash !== await canonicalHash(event.payload)) throw new Error('Canonical event payload digest does not match.');
  const valid = await verify(canonicalEventSigningBytes(unsigned), hexToBytes(signatureHex), event.actorAccountPublicKeyHex);
  if (!valid) throw new Error('Canonical event signature is invalid.');
}

function applyEvent(previous: CanonicalGroupStateV1, event: CanonicalEventV1): CanonicalGroupStateV1 {
  const state = cloneJson(previous);
  if (event.eventType === 'GROUP_CREATED') {
    if (state.version !== 0 || state.organizerId) throw new Error('Group already exists.');
    const payload = event.payload as Extract<ChopEventPayloadV1, {organizerId: string}>;
    if (!payload.name.trim() || payload.organizerId !== event.actorId || event.actorRole !== 'organizer') throw new Error('Group organizer authority is invalid.');
    const members: Record<string, CanonicalMemberV1> = {};
    for (const member of payload.members) {
      assertMember(member);
      if (members[member.participantId]) throw new Error('Group member is duplicated.');
      members[member.participantId] = cloneJson(member);
    }
    const organizer = members[payload.organizerId];
    if (!organizer || organizer.role !== 'organizer' || organizer.accountPublicKeyHex !== event.actorAccountPublicKeyHex) throw new Error('Group organizer binding is invalid.');
    state.name = payload.name.trim();
    state.organizerId = payload.organizerId;
    state.members = members;
    return advance(state, event);
  }

  assertActor(state, event);
  if (state.closed && event.eventType === 'SUCCESSOR_RECORD_CREATED') {
    const payload = event.payload as {recordId: string; predecessorRecordId: string; reason: string};
    if (
      event.actorId !== state.organizerId
      || payload.predecessorRecordId !== state.closed.recordId
      || !payload.recordId.trim()
      || payload.recordId === state.closed.recordId
      || !payload.reason.trim()
      || state.successorRecords.some(record => record.recordId === payload.recordId)
    ) throw new Error('Successor record authority is invalid.');
    state.successorRecords.push({
      recordId: payload.recordId.trim(),
      predecessorRecordId: payload.predecessorRecordId,
      eventId: event.eventId,
      reason: payload.reason.trim(),
    });
    return advance(state, event);
  }
  if (state.closed) throw new Error('Closed records cannot be changed.');

  if (event.eventType === 'EXPENSE_ADDED') {
    const payload = event.payload as Extract<ChopEventPayloadV1, {expenseId: string; paidBy: string; total: MoneyV1}>;
    if (event.actorId !== payload.paidBy || !state.members[payload.paidBy] || state.expenses[payload.expenseId]) throw new Error('Expense authority is invalid.');
    assertMoney(payload.total);
    assertConservation(payload.total, payload.allocations);
    for (const row of payload.allocations) if (!state.members[row.participantId]) throw new Error('Expense allocation member is invalid.');
    state.expenses[payload.expenseId] = {
      expenseId: payload.expenseId, description: payload.description.trim(), paidBy: payload.paidBy,
      originalTotal: cloneJson(payload.total), total: cloneJson(payload.total), revisions: [],
    };
    for (const row of payload.allocations) {
      const shareId = `share-${row.participantId}`;
      if (state.shares[shareId]) throw new Error('Expense share identifier conflicts.');
      state.shares[shareId] = {shareId, expenseId: payload.expenseId, participantId: row.participantId, originalAmount: cloneJson(row.amount), amount: cloneJson(row.amount), status: 'open', adjustments: []};
    }
    return advance(state, event);
  }

  if (event.eventType === 'SHARE_REQUESTED') {
    const share = shareFor(state, (event.payload as {shareId: string}).shareId);
    const expense = state.expenses[share.expenseId];
    if (event.actorId !== expense.paidBy || share.participantId === expense.paidBy || share.status !== 'open') throw new Error('Share request authority or state is invalid.');
    share.status = 'requested';
    return advance(state, event);
  }

  if (event.eventType === 'SHARE_MARKED_PAID') {
    const share = shareFor(state, (event.payload as {shareId: string}).shareId);
    if (event.actorId !== share.participantId || share.status !== 'requested') throw new Error('Only the requested payer may mark this share paid.');
    share.status = 'marked_paid';
    return advance(state, event);
  }

  if (event.eventType === 'SHARE_RECEIVED') {
    const payload = event.payload as {shareId: string; exactFinalizedPayment?: boolean};
    const share = shareFor(state, payload.shareId);
    const expense = state.expenses[share.expenseId];
    if (event.actorId !== expense.paidBy) throw new Error('Only the receiver may confirm this share.');
    if (share.status !== 'marked_paid' && !payload.exactFinalizedPayment) throw new Error('Share must be marked paid before receiver confirmation.');
    if (!['open', 'requested', 'marked_paid'].includes(share.status) && payload.exactFinalizedPayment) throw new Error('Exact payment cannot clear this share state.');
    share.status = 'received';
    return advance(state, event);
  }

  if (event.eventType === 'EXPENSE_CORRECTED') {
    const payload = event.payload as Extract<ChopEventPayloadV1, {expenseId: string; reason: string; total: MoneyV1}>;
    const expense = state.expenses[payload.expenseId];
    if (!expense || event.actorId !== expense.paidBy || !payload.reason.trim()) throw new Error('Expense correction authority is invalid.');
    const shares = Object.values(state.shares).filter(share => share.expenseId === expense.expenseId);
    if (shares.some(share => !['open', 'requested'].includes(share.status))) throw new Error('Paid or received expenses require an explicit adjustment.');
    assertConservation(payload.total, payload.allocations);
    if (payload.allocations.some(row => !state.members[row.participantId])) throw new Error('Correction allocation member is invalid.');
    expense.revisions.push({eventId: event.eventId, reason: payload.reason.trim(), previousTotal: cloneJson(expense.total), nextTotal: cloneJson(payload.total)});
    expense.total = cloneJson(payload.total);
    const nextParticipants = new Set(payload.allocations.map(row => row.participantId));
    for (const share of shares) if (!nextParticipants.has(share.participantId)) delete state.shares[share.shareId];
    for (const row of payload.allocations) {
      const shareId = `share-${row.participantId}`;
      const existing = state.shares[shareId];
      state.shares[shareId] = existing
        ? {...existing, amount: cloneJson(row.amount)}
        : {shareId, expenseId: expense.expenseId, participantId: row.participantId, originalAmount: cloneJson(row.amount), amount: cloneJson(row.amount), status: 'open', adjustments: []};
    }
    return advance(state, event);
  }

  if (event.eventType === 'SHARE_ADJUSTED') {
    const payload = event.payload as Extract<ChopEventPayloadV1, {shareId: string; kind: AdjustmentKind}>;
    const share = shareFor(state, payload.shareId);
    const expense = state.expenses[share.expenseId];
    if (event.actorId !== expense.paidBy || !payload.reason.trim()) throw new Error('Share adjustment authority is invalid.');
    assertMoney(payload.delta, {allowNegative: true});
    if (payload.delta.currency !== share.amount.currency || payload.delta.exponent !== share.amount.exponent) throw new Error('Share adjustment currency is invalid.');
    const next = BigInt(share.amount.minorUnits) + BigInt(payload.delta.minorUnits);
    if (next < 0n) throw new Error('Share adjustment cannot make a negative share.');
    share.amount = moneyFromMinorUnits(next, share.amount.currency, share.amount.exponent);
    share.adjustments.push({eventId: event.eventId, kind: payload.kind, delta: cloneJson(payload.delta), reason: payload.reason.trim()});
    if (payload.kind === 'waiver') {
      if (next !== 0n) throw new Error('A waiver must clear the exact remaining share.');
      share.status = 'waived';
    } else if (payload.kind === 'dispute') {
      share.status = 'disputed';
    }
    return advance(state, event);
  }

  const payload = event.payload as {recordId: string};
  if (event.actorId !== state.organizerId || !payload.recordId.trim()) throw new Error('Close authority is invalid.');
  const open = Object.values(state.shares).filter(share => {
    const expense = state.expenses[share.expenseId];
    return share.participantId !== expense.paidBy && !['received', 'waived'].includes(share.status);
  });
  if (open.length) throw new Error('Every required share must be received or waived before close.');
  const totals = currencyTotals(state);
  const currencies = Object.keys(totals);
  const total = currencies.length === 1 ? totals[currencies[0]] : moneyFromMinorUnits(0n, 'XXX', 0);
  state.closed = {recordId: payload.recordId.trim(), eventId: event.eventId, total, currencyTotals: totals};
  return advance(state, event);
}

function advance(state: CanonicalGroupStateV1, event: CanonicalEventV1): CanonicalGroupStateV1 {
  state.version += 1;
  state.currentEventId = event.eventId;
  state.eventIds.push(event.eventId);
  return state;
}

function emptyState(groupId: string): CanonicalGroupStateV1 {
  return {v: 1, groupId, name: '', version: 0, currentEventId: null, organizerId: '', members: {}, expenses: {}, shares: {}, closed: null, successorRecords: [], eventIds: []};
}

function assertSeedState(state: CanonicalGroupStateV1): void {
  if (
    state.v !== 1
    || !state.groupId.trim()
    || !Number.isSafeInteger(state.version)
    || state.version < 0
    || state.version !== state.eventIds.length
    || (state.version === 0) !== (state.currentEventId === null)
    || (state.version > 0 && state.currentEventId !== state.eventIds.at(-1))
    || new Set(state.eventIds).size !== state.eventIds.length
  ) throw new Error('Canonical seed state is invalid.');
}

function assertInput(input: CanonicalEventInput): void {
  if (!isRecord(input) || !input.eventId?.trim() || !input.commandId?.trim() || !input.groupId?.trim()) throw new Error('Canonical event identity is invalid.');
  if (!/^[0-9a-z_-]+$/iu.test(input.eventId) || !/^[0-9a-z_-]+$/iu.test(input.commandId)) throw new Error('Canonical event identity is invalid.');
  if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 0) throw new Error('Canonical expected version is invalid.');
  if ((input.expectedVersion === 0) !== (input.parentEventId === null)) throw new Error('Canonical causal parent is invalid.');
  if (input.parentEventId !== null && !input.parentEventId.trim()) throw new Error('Canonical causal parent is invalid.');
  if (!input.actorId?.trim() || !/^0x[0-9a-f]{64}$/iu.test(input.actorAccountPublicKeyHex) || !['organizer', 'member'].includes(input.actorRole)) throw new Error('Canonical actor is invalid.');
  if (Number.isNaN(Date.parse(input.occurredAt))) throw new Error('Canonical event time is invalid.');
  if (!input.acceptedAt || Number.isNaN(Date.parse(input.acceptedAt))) throw new Error('Canonical acceptance time is invalid.');
  if (input.eventVersion !== 1 || !Number.isSafeInteger(input.keyVersion) || input.keyVersion! < 1 || input.visibility !== 'group_encrypted') throw new Error('Canonical event metadata is invalid.');
  if (!['GROUP_CREATED','EXPENSE_ADDED','SHARE_REQUESTED','SHARE_MARKED_PAID','SHARE_RECEIVED','EXPENSE_CORRECTED','SHARE_ADJUSTED','GROUP_CLOSED','SUCCESSOR_RECORD_CREATED'].includes(input.eventType)) throw new Error('Canonical event type is invalid.');
}

function assertActor(state: CanonicalGroupStateV1, event: CanonicalEventV1): void {
  const member = state.members[event.actorId];
  if (!member || member.accountPublicKeyHex !== event.actorAccountPublicKeyHex || member.role !== event.actorRole) throw new Error('Canonical actor is not authorized for this group.');
}

function assertMember(member: CanonicalMemberV1): void {
  if (!member.participantId?.trim() || !/^0x[0-9a-f]{64}$/iu.test(member.accountPublicKeyHex) || !['organizer', 'member'].includes(member.role)) throw new Error('Group member binding is invalid.');
}

function shareFor(state: CanonicalGroupStateV1, shareId: string): CanonicalShareV1 {
  const share = state.shares[shareId];
  if (!share) throw new Error('Expense share is missing.');
  return share;
}

function currencyTotals(state: CanonicalGroupStateV1): Record<string, MoneyV1> {
  const totals: Record<string, MoneyV1> = {};
  for (const expense of Object.values(state.expenses)) {
    const key = `${expense.total.currency}:${expense.total.exponent}`;
    totals[key] = totals[key] ? addMoney(totals[key], expense.total) : cloneJson(expense.total);
  }
  return Object.fromEntries(Object.entries(totals).map(([key, value]) => [key.split(':')[0], value]));
}

function message(reason: unknown): string {return reason instanceof Error ? reason.message : String(reason)}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) grouped.set(key(row), [...(grouped.get(key(row)) ?? []), row]);
  return grouped;
}

function uniqueCanonicalEvents(events: CanonicalEventV1[]): CanonicalEventV1[] {
  return [...new Map(events.map(event => [canonicalJson(event), event])).values()]
    .sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));
}

function compareProjectionIssues(left: ProjectionIssue, right: ProjectionIssue): number {
  return left.eventId.localeCompare(right.eventId) || left.reason.localeCompare(right.reason);
}
