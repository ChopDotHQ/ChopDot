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
import {
  applyModeWorkflowEventV1,
  applyCanonicalExpenseCorrectionToModeStateV1,
  hasOutstandingModeWorkV1,
  initialModeStateV1,
  isModeWorkflowEventTypeV1,
  type CanonicalModeStateV1,
  type ModeWorkflowEventPayloadV1,
  type ModeWorkflowEventTypeV1,
} from './modeWorkflows.ts';

export type ParticipantRole = 'organizer' | 'member';
export type ShareStatus = 'open' | 'requested' | 'marked_paid' | 'cleared' | 'received' | 'waived' | 'disputed';
export type AdjustmentKind = 'correction' | 'refund' | 'fee' | 'waiver' | 'partial_payment' | 'dispute';
export type CanonicalGroupModeV1 = 'normal_pot' | 'trip' | 'couple' | 'spend_card' | 'savings_circle' | 'emergency_pot' | 'community_fund';

export interface ShareRequestMetadataV1 {
  requestId: string;
  createdAt: string;
  expiresAt: string;
  capabilityHash: string;
}

export interface FinalizedPaymentEvidenceV1 {
  reference: string;
  network: string;
  asset: string;
  payerId: string;
  receiverId: string;
  amount: MoneyV1;
  finality: 'finalized';
}

export interface CanonicalMemberV1 {
  participantId: string;
  accountPublicKeyHex: string;
  role: ParticipantRole;
  active?: boolean;
  acceptedAt?: string;
  invitationId?: string;
  keyVersion?: number;
  groupKeyEnvelopeId?: string;
}
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
  request?: ShareRequestMetadataV1;
  clearedEvidence?: FinalizedPaymentEvidenceV1;
  adjustments: Array<{eventId: string; kind: AdjustmentKind; delta: MoneyV1; reason: string}>;
}
export interface CanonicalGroupStateV1 {
  v: 1;
  groupId: string;
  name: string;
  mode?: CanonicalGroupModeV1;
  version: number;
  currentEventId: string | null;
  organizerId: string;
  groupKeyVersion?: number;
  members: Record<string, CanonicalMemberV1>;
  expenses: Record<string, CanonicalExpenseV1>;
  shares: Record<string, CanonicalShareV1>;
  closed: null | {recordId: string; eventId: string; total: MoneyV1; currencyTotals: Record<string, MoneyV1>};
  successorRecords: Array<{recordId: string; predecessorRecordId: string; eventId: string; reason: string}>;
  /** Named-mode state is a projection of the same signed group frontier. */
  modeState?: CanonicalModeStateV1;
  eventIds: string[];
}

export type ChopEventPayloadV1 =
  | {name: string; mode?: CanonicalGroupModeV1; organizerId: string; members: CanonicalMemberV1[]}
  | {expenseId: string; description: string; paidBy: string; total: MoneyV1; allocations: MoneyAllocationV1[]}
  | {shareId: string; request?: ShareRequestMetadataV1}
  | {shareId: string; evidence: FinalizedPaymentEvidenceV1}
  | {expenseId: string; reason: string; total: MoneyV1; allocations: MoneyAllocationV1[]}
  | {shareId: string; kind: AdjustmentKind; delta: MoneyV1; reason: string}
  | {recordId: string}
  | {recordId: string; predecessorRecordId: string; reason: string}
  | {member: CanonicalMemberV1}
  | {participantId: string; nextKeyVersion: number; groupKeyEnvelopeIds: Record<string, string>}
  | {roles: Record<string, ParticipantRole>; nextKeyVersion: number; groupKeyEnvelopeIds: Record<string, string>}
  | {nextKeyVersion: number; groupKeyEnvelopeIds: Record<string, string>}
  | ModeWorkflowEventPayloadV1;

export type CanonicalEventType =
  | 'GROUP_CREATED'
  | 'EXPENSE_ADDED'
  | 'SHARE_REQUESTED'
  | 'SHARE_MARKED_PAID'
  | 'SHARE_CLEARED'
  | 'SHARE_RECEIVED'
  | 'EXPENSE_CORRECTED'
  | 'SHARE_ADJUSTED'
  | 'GROUP_CLOSED'
  | 'SUCCESSOR_RECORD_CREATED'
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED'
  | 'MEMBERSHIP_ROLES_CHANGED'
  | 'GROUP_KEY_ROTATED'
  | ModeWorkflowEventTypeV1;

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

/**
 * A share belongs to one expense and one participant. Keeping both identities
 * in the key prevents a later receipt from colliding with an earlier share.
 */
export function canonicalShareId(expenseId: string, participantId: string): string {
  if (!expenseId.trim() || !participantId.trim()) throw new Error('Canonical share identity is invalid.');
  return `share:${encodeURIComponent(expenseId)}:${encodeURIComponent(participantId)}`;
}

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
    const mode = payload.mode ?? 'normal_pot';
    if (!isCanonicalGroupMode(mode)) throw new Error('Group mode policy is invalid.');
    state.name = payload.name.trim();
    state.mode = mode;
    state.modeState = initialModeStateV1(mode);
    state.organizerId = payload.organizerId;
    state.groupKeyVersion = Math.max(1, ...Object.values(members).map(member => member.keyVersion ?? 1));
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

  if (event.eventType === 'MEMBER_ADDED') {
    if (event.actorId !== state.organizerId) throw new Error('Only the organizer may add an accepted member.');
    const member = cloneJson((event.payload as {member: CanonicalMemberV1}).member);
    assertMember(member);
    if (member.role !== 'member' || member.active === false) throw new Error('New membership role is invalid.');
    if (!member.acceptedAt || Number.isNaN(Date.parse(member.acceptedAt)) || !member.invitationId?.trim()
      || !Number.isSafeInteger(member.keyVersion) || member.keyVersion! < 1 || !member.groupKeyEnvelopeId?.trim()) {
      throw new Error('Accepted membership evidence is incomplete.');
    }
    const existingMember = state.members[member.participantId];
    if ((existingMember && existingMember.active !== false) || Object.values(state.members).some(candidate =>
      candidate.active !== false && candidate.accountPublicKeyHex === member.accountPublicKeyHex)) {
      throw new Error('Accepted member is already active in this group.');
    }
    state.members[member.participantId] = {...member, active: true};
    state.groupKeyVersion = Math.max(state.groupKeyVersion ?? 1, member.keyVersion!);
    return advance(state, event);
  }

  if (event.eventType === 'MEMBER_REMOVED') {
    if (event.actorId !== state.organizerId) throw new Error('Only the organizer may remove a member.');
    const payload = event.payload as {participantId: string; nextKeyVersion: number; groupKeyEnvelopeIds: Record<string, string>};
    const target = state.members[payload.participantId];
    if (!target || target.active === false) throw new Error('Removed member is not active.');
    const remaining = activeMembers(state).filter(member => member.participantId !== payload.participantId);
    if (!remaining.some(member => member.role === 'organizer')) throw new Error('A group must retain an organizer.');
    applyRotatedKeyEvidence(state, payload.nextKeyVersion, payload.groupKeyEnvelopeIds, remaining);
    target.active = false;
    return advance(state, event);
  }

  if (event.eventType === 'MEMBERSHIP_ROLES_CHANGED') {
    if (event.actorId !== state.organizerId) throw new Error('Only the organizer may change group roles.');
    const payload = event.payload as {roles: Record<string, ParticipantRole>; nextKeyVersion: number; groupKeyEnvelopeIds: Record<string, string>};
    const members = activeMembers(state);
    const ids = members.map(member => member.participantId).sort();
    if (JSON.stringify(Object.keys(payload.roles).sort()) !== JSON.stringify(ids)
      || Object.values(payload.roles).some(role => !['organizer', 'member'].includes(role))
      || !Object.values(payload.roles).includes('organizer')) throw new Error('Group role transfer is invalid.');
    applyRotatedKeyEvidence(state, payload.nextKeyVersion, payload.groupKeyEnvelopeIds, members);
    for (const member of members) member.role = payload.roles[member.participantId];
    const organizerIds = members.filter(member => member.role === 'organizer').map(member => member.participantId).sort();
    state.organizerId = organizerIds[0];
    return advance(state, event);
  }

  if (event.eventType === 'GROUP_KEY_ROTATED') {
    if (event.actorId !== state.organizerId) throw new Error('Only the organizer may rotate protected group access.');
    const payload = event.payload as {nextKeyVersion: number; groupKeyEnvelopeIds: Record<string, string>};
    applyRotatedKeyEvidence(state, payload.nextKeyVersion, payload.groupKeyEnvelopeIds, activeMembers(state));
    return advance(state, event);
  }

  if (event.eventType === 'EXPENSE_ADDED') {
    const payload = event.payload as Extract<ChopEventPayloadV1, {expenseId: string; paidBy: string; total: MoneyV1}>;
    if (event.actorId !== payload.paidBy || !state.members[payload.paidBy] || state.expenses[payload.expenseId]) throw new Error('Expense authority is invalid.');
    assertMoney(payload.total);
    assertConservation(payload.total, payload.allocations);
    for (const row of payload.allocations) if (!state.members[row.participantId] || state.members[row.participantId].active === false) throw new Error('Expense allocation member is invalid.');
    state.expenses[payload.expenseId] = {
      expenseId: payload.expenseId, description: payload.description.trim(), paidBy: payload.paidBy,
      originalTotal: cloneJson(payload.total), total: cloneJson(payload.total), revisions: [],
    };
    for (const row of payload.allocations) {
      const shareId = canonicalShareId(payload.expenseId, row.participantId);
      if (state.shares[shareId]) throw new Error('Expense share identifier conflicts.');
      state.shares[shareId] = {shareId, expenseId: payload.expenseId, participantId: row.participantId, originalAmount: cloneJson(row.amount), amount: cloneJson(row.amount), status: 'open', adjustments: []};
    }
    return advance(state, event);
  }

  if (event.eventType === 'SHARE_REQUESTED') {
    const payload = event.payload as {shareId: string; request?: ShareRequestMetadataV1};
    const share = shareFor(state, payload.shareId);
    const expense = state.expenses[share.expenseId];
    if (
      event.actorId !== expense.paidBy
      || share.participantId === expense.paidBy
      || !['open', 'requested'].includes(share.status)
    ) throw new Error('Share request authority or state is invalid.');
    if (payload.request && !validShareRequest(payload.request, event.occurredAt)) throw new Error('Share request metadata is invalid.');
    share.status = 'requested';
    if (payload.request) share.request = cloneJson(payload.request);
    return advance(state, event);
  }

  if (event.eventType === 'SHARE_MARKED_PAID') {
    const share = shareFor(state, (event.payload as {shareId: string}).shareId);
    if (event.actorId !== share.participantId || share.status !== 'requested') throw new Error('Only the requested payer may mark this share paid.');
    share.status = 'marked_paid';
    return advance(state, event);
  }

  if (event.eventType === 'SHARE_CLEARED') {
    const payload = event.payload as {shareId: string; evidence: FinalizedPaymentEvidenceV1};
    const share = shareFor(state, payload.shareId);
    const expense = state.expenses[share.expenseId];
    const evidence = payload.evidence;
    if (![share.participantId, expense.paidBy].includes(event.actorId)) throw new Error('Only the payer or receiver may record cleared evidence.');
    if (!['requested', 'marked_paid'].includes(share.status)) throw new Error('Finalized payment cannot clear this share state.');
    if (
      !evidence
      || !evidence.reference?.trim()
      || !evidence.network?.trim()
      || !evidence.asset?.trim()
      || evidence.finality !== 'finalized'
      || evidence.payerId !== share.participantId
      || evidence.receiverId !== expense.paidBy
    ) throw new Error('Finalized payment evidence does not match this share.');
    assertMoney(evidence.amount);
    if (!moneyEquals(evidence.amount, share.amount) || evidence.asset !== share.amount.currency) throw new Error('Finalized payment amount or asset does not match this share.');
    share.status = 'cleared';
    share.clearedEvidence = cloneJson(evidence);
    return advance(state, event);
  }

  if (event.eventType === 'SHARE_RECEIVED') {
    const payload = event.payload as {shareId: string};
    const share = shareFor(state, payload.shareId);
    const expense = state.expenses[share.expenseId];
    if (event.actorId !== expense.paidBy) throw new Error('Only the receiver may confirm this share.');
    if (!['marked_paid', 'cleared'].includes(share.status)) throw new Error('Share must be marked paid or cleared before receiver confirmation.');
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
    if (payload.allocations.some(row => !state.members[row.participantId] || state.members[row.participantId].active === false)) throw new Error('Correction allocation member is invalid.');
    expense.revisions.push({eventId: event.eventId, reason: payload.reason.trim(), previousTotal: cloneJson(expense.total), nextTotal: cloneJson(payload.total)});
    expense.total = cloneJson(payload.total);
    const nextParticipants = new Set(payload.allocations.map(row => row.participantId));
    for (const share of shares) if (!nextParticipants.has(share.participantId)) delete state.shares[share.shareId];
    for (const row of payload.allocations) {
      const shareId = canonicalShareId(payload.expenseId, row.participantId);
      const existing = state.shares[shareId];
      state.shares[shareId] = existing
        ? {...existing, amount: cloneJson(row.amount)}
        : {shareId, expenseId: expense.expenseId, participantId: row.participantId, originalAmount: cloneJson(row.amount), amount: cloneJson(row.amount), status: 'open', adjustments: []};
    }
    state.modeState = applyCanonicalExpenseCorrectionToModeStateV1(state.modeState, {
      expenseId: payload.expenseId,
      correctionEventId: event.eventId,
      reason: payload.reason,
      total: payload.total,
    });
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

  if (isModeWorkflowEventTypeV1(event.eventType)) {
    state.modeState = applyModeWorkflowEventV1({
      mode: state.mode ?? 'normal_pot',
      organizerId: state.organizerId,
      members: state.members,
      expenses: state.expenses,
      shares: state.shares,
      modeState: state.modeState,
    }, {
      eventId: event.eventId,
      eventType: event.eventType,
      actorId: event.actorId,
      occurredAt: event.occurredAt,
      payload: event.payload as ModeWorkflowEventPayloadV1,
    });
    return advance(state, event);
  }

  const payload = event.payload as {recordId: string};
  if (hasOutstandingModeWorkV1(state.modeState)) throw new Error('Finish the pending Spend Card correction or settled follow-up before closing this group.');
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
  return {v: 1, groupId, name: '', mode: 'normal_pot', version: 0, currentEventId: null, organizerId: '', members: {}, expenses: {}, shares: {}, closed: null, successorRecords: [], eventIds: []};
}

function isCanonicalGroupMode(value: unknown): value is CanonicalGroupModeV1 {
  return ['normal_pot','trip','couple','spend_card','savings_circle','emergency_pot','community_fund'].includes(String(value));
}

function validShareRequest(value: ShareRequestMetadataV1, occurredAt: string): boolean {
  return Boolean(
    value.requestId?.trim()
    && value.capabilityHash?.trim()
    && !Number.isNaN(Date.parse(value.createdAt))
    && !Number.isNaN(Date.parse(value.expiresAt))
    && Date.parse(value.createdAt) >= Date.parse(occurredAt) - 1_000
    && Date.parse(value.expiresAt) > Date.parse(value.createdAt),
  );
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
  if (!['GROUP_CREATED','EXPENSE_ADDED','SHARE_REQUESTED','SHARE_MARKED_PAID','SHARE_CLEARED','SHARE_RECEIVED','EXPENSE_CORRECTED','SHARE_ADJUSTED','GROUP_CLOSED','SUCCESSOR_RECORD_CREATED','MEMBER_ADDED','MEMBER_REMOVED','MEMBERSHIP_ROLES_CHANGED','GROUP_KEY_ROTATED'].includes(input.eventType) && !isModeWorkflowEventTypeV1(input.eventType)) throw new Error('Canonical event type is invalid.');
}

function assertActor(state: CanonicalGroupStateV1, event: CanonicalEventV1): void {
  const member = state.members[event.actorId];
  if (!member || member.active === false || member.accountPublicKeyHex !== event.actorAccountPublicKeyHex || member.role !== event.actorRole) throw new Error('Canonical actor is not authorized for this group.');
}

function assertMember(member: CanonicalMemberV1): void {
  if (!member.participantId?.trim() || !/^0x[0-9a-f]{64}$/iu.test(member.accountPublicKeyHex) || !['organizer', 'member'].includes(member.role)) throw new Error('Group member binding is invalid.');
}

function activeMembers(state: CanonicalGroupStateV1): CanonicalMemberV1[] {
  return Object.values(state.members).filter(member => member.active !== false);
}

function applyRotatedKeyEvidence(
  state: CanonicalGroupStateV1,
  nextKeyVersion: number,
  groupKeyEnvelopeIds: Record<string, string>,
  recipients: CanonicalMemberV1[],
): void {
  const current = state.groupKeyVersion ?? 1;
  if (!Number.isSafeInteger(nextKeyVersion) || nextKeyVersion !== current + 1) {
    throw new Error('Group key rotation version is invalid.');
  }
  const recipientIds = recipients.map(member => member.participantId).sort();
  if (!groupKeyEnvelopeIds || typeof groupKeyEnvelopeIds !== 'object' || Array.isArray(groupKeyEnvelopeIds)
    || JSON.stringify(Object.keys(groupKeyEnvelopeIds).sort()) !== JSON.stringify(recipientIds)
    || recipientIds.some(participantId => !groupKeyEnvelopeIds[participantId]?.trim())) {
    throw new Error('Future protected group access is incomplete.');
  }
  for (const member of recipients) {
    member.keyVersion = nextKeyVersion;
    member.groupKeyEnvelopeId = groupKeyEnvelopeIds[member.participantId].trim();
  }
  state.groupKeyVersion = nextKeyVersion;
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
