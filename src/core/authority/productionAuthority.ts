import type {Action} from '../../state/store.ts';
import type {AppState, GroupMode, WalletPaymentReceipt} from '../../types.ts';
import type {MembershipGrant} from '../../membership/membershipLifecycle.ts';
import {canonicalShareId, createCanonicalEvent, projectCanonicalEvents, type AdjustmentKind, type CanonicalEventType, type CanonicalEventV1, type CanonicalGroupStateV1, type CanonicalSigner, type CanonicalVerifier} from '../moneyEventKernel.ts';
import type {ModeWorkflowCommandV1} from '../modeWorkflows.ts';
import {assertConservation, assertMoney, moneyToDisplayNumber, type MoneyAllocationV1, type MoneyV1} from '../money.ts';

export type ProductionAuthorityAction = Extract<Action, {type:
  | 'CREATE_GROUP'
  | 'ADD_EXPENSE'
  | 'SEND_REQUEST'
  | 'MARK_PAID'
  | 'CONFIRM_RECEIVED'
  | 'RECORD_MATCHED_PAYMENT'
  | 'SAVE_RECORD'
}>;

export interface AuthorityIdentity {
  participantId: string;
  publicKeyHex: string;
  signer: CanonicalSigner;
}

export interface AuthorityIdentityResolver {
  resolve(participantId: string, expectedPublicKeyHex?: string): Promise<AuthorityIdentity>;
}

export interface AuthorityJournalStore {
  listGroupIds(): Promise<string[]>;
  read(groupId: string): Promise<PersistedAuthorityGroupV1 | null>;
  compareAndSwap(groupId: string, expectedFrontierHash: string | null, value: PersistedAuthorityGroupV1): Promise<boolean>;
  clear(): Promise<void>;
}

interface AuthorityExpenseMetadataV1 {
  date: string;
  splitIdByParticipant: Record<string, string>;
  walletPaymentByParticipant: Record<string, WalletPaymentReceipt>;
  requestCapabilityByParticipant: Record<string, string>;
}

export interface FinalizedPaymentVerificationRequestV1 {
  reference: string;
  payerId: string;
  receiverId: string;
  payerAddress: string;
  receiverAddress: string;
  amount: MoneyV1;
}

export type FinalizedPaymentVerifier = (request: FinalizedPaymentVerificationRequestV1) => Promise<WalletPaymentReceipt>;

export interface AcceptedMembershipGrantResolver {
  resolve(groupId: string, participantId: string): Promise<MembershipGrant | null>;
}

export type MembershipAuthorityCommandV1 =
  | {groupId: string; type: 'add'; grant: MembershipGrant}
  | {groupId: string; type: 'remove'; participantId: string; nextKeyVersion: number; groupKeyEnvelopeIds: Record<string, string>}
  | {groupId: string; type: 'roles'; roles: Record<string, 'organizer' | 'member'>; nextKeyVersion: number; groupKeyEnvelopeIds: Record<string, string>}
  | {groupId: string; type: 'rotate_key'; nextKeyVersion: number; groupKeyEnvelopeIds: Record<string, string>};

export interface MembershipAuthorityMutationResolver {
  /** ProductionAuthority supplies the signature-verified current frontier so a
   * resolver can reject stale ceremonies without re-entering an outer queue. */
  authorize(
    command: MembershipAuthorityCommandV1,
    actorId: string,
    currentState?: CanonicalGroupStateV1,
  ): Promise<boolean>;
}

export interface AuthorityGroupAccessProvisioner {
  provision(input: {
    groupId: string;
    organizerId: string;
    organizerAccountPublicKeyHex: string;
    eventId: string;
    acceptedAt: string;
    signer: CanonicalSigner;
  }): Promise<{keyVersion: number; groupKeyEnvelopeId: string}>;
}

export interface CanonicalAuthorityEventEnvelopeV1 {
  v: 1;
  kind: 'chopdot-authority-event';
  event: CanonicalEventV1;
}

export interface CanonicalAuthorityEventAckV1 {
  v: 1;
  kind: 'chopdot-authority-ack';
  groupId: string;
  eventId: string;
  acknowledgingParticipantId: string;
  occurredAt: string;
}

export interface PersistedAuthorityGroupV1 {
  v: 1;
  groupId: string;
  mode: GroupMode;
  events: CanonicalEventV1[];
  expenses: Record<string, AuthorityExpenseMetadataV1>;
  stateHash: string;
  frontierHash: string;
}

export interface AuthorityAppendResult {
  state: AppState;
  event: CanonicalEventV1;
  canonicalState: CanonicalGroupStateV1;
  stateHash: string;
  frontierHash: string;
}

/** A named-mode command proposal. Acceptance still occurs only after signing, canonical replay, and durable CAS. */
export type ModeAuthorityCommandV1 = {groupId: string} & ModeWorkflowCommandV1;

export interface ExpenseCorrectionAuthorityCommandV1 {
  groupId: string;
  expenseId: string;
  reason: string;
  total: MoneyV1;
  allocations: MoneyAllocationV1[];
}

export interface CloseoutSuccessorAuthorityCommandV1 {
  groupId: string;
  recordId: string;
  predecessorRecordId: string;
  reason: string;
}

interface ShareAdjustmentAuthorityCommandBaseV1 {
  groupId: string;
  shareId: string;
  delta: MoneyV1;
  reason: string;
}

export type ShareAdjustmentAuthorityCommandV1 = ShareAdjustmentAuthorityCommandBaseV1 & (
  | {kind: Exclude<AdjustmentKind, 'correction' | 'reversal'>; reversesAdjustmentEventId?: never}
  | {kind: 'reversal'; reversesAdjustmentEventId: string}
);

interface ProductionAuthorityOptions {
  journal: AuthorityJournalStore;
  identities: AuthorityIdentityResolver;
  verify: CanonicalVerifier;
  verifyFinalizedPayment?: FinalizedPaymentVerifier;
  memberships?: AcceptedMembershipGrantResolver;
  membershipChanges?: MembershipAuthorityMutationResolver;
  groupAccess?: AuthorityGroupAccessProvisioner;
  now?: () => string;
  randomId?: () => string;
}

export type AuthorityAcceptResult = AuthorityAppendResult & {outcome: 'applied' | 'duplicate'};

export interface AuthorityRecoveryImportResult {
  state: AppState;
  canonicalState: CanonicalGroupStateV1;
  stateHash: string;
  frontierHash: string;
  importedEventIds: string[];
  outcome: 'applied' | 'duplicate';
}

/**
 * The sole production boundary for shared money transitions.
 *
 * A legacy Action is only a command proposal. It does not reach the UI
 * projection until the corresponding exact-money ChopEventV1 is signed,
 * replayed, accepted on the current frontier, and durably written. The
 * number-valued AppState fields below are therefore presentation projections,
 * never the authority input for a later transition.
 */
export class ProductionAuthority {
  constructor(private readonly options: ProductionAuthorityOptions) {}

  async hydrate(base: AppState): Promise<AppState> {
    let state = structuredClone(base);
    for (const groupId of (await this.options.journal.listGroupIds()).sort()) {
      const record = await this.requiredRecord(groupId);
      const projection = await this.verifyRecord(record);
      state = projectGroup(state, record, projection.state);
    }
    return state;
  }

  async append(base: AppState, action: ProductionAuthorityAction, actorId = base.currentUserId): Promise<AuthorityAppendResult> {
    if (!actorId) throw new Error('A participant must be selected before changing shared group truth.');
    if (!base.users[actorId]) throw new Error('The selected participant is missing.');

    const groupId = groupIdForProductionAuthorityAction(base, action);
    const existing = await this.options.journal.read(groupId);
    if (action.type === 'CREATE_GROUP' && existing) throw new Error('This group already has an authority journal.');
    if (action.type !== 'CREATE_GROUP' && !existing) {
      throw new Error('This legacy group is not backed by a signed authority journal and is read-only until migrated.');
    }

    const record = existing ?? emptyRecord(action);
    const current = existing
      ? await this.verifyRecord(existing)
      : {state: emptyCanonicalState(groupId), stateHash: '', frontierHash: '', duplicates: [], conflicts: [], rejected: []};
    const expectedKey = current.state.members[actorId]?.accountPublicKeyHex ?? base.users[actorId]?.accountPublicKeyHex;
    const identity = await this.options.identities.resolve(actorId, expectedKey);
    if (identity.participantId !== actorId) throw new Error('The authority signer does not belong to this participant.');

    const occurredAt = this.options.now?.() ?? new Date().toISOString();
    const eventId = safeId(`event-${this.options.randomId?.() ?? crypto.randomUUID()}`);
    const commandId = safeId(`command-${this.options.randomId?.() ?? crypto.randomUUID()}`);
    const trustedAction = await this.verifyAction(base, action, actorId, current.state, record);
    const initialGroupAccess = trustedAction.type === 'CREATE_GROUP'
      ? await this.options.groupAccess?.provision({
        groupId,
        organizerId: actorId,
        organizerAccountPublicKeyHex: identity.publicKeyHex,
        eventId,
        acceptedAt: occurredAt,
        signer: identity.signer,
      })
      : undefined;
    const command = await commandFor(
      base,
      trustedAction,
      actorId,
      identity.publicKeyHex,
      current.state,
      record,
      this.options.memberships,
      initialGroupAccess,
      eventId,
      occurredAt,
    );
    const event = await createCanonicalEvent({
      eventId,
      commandId,
      groupId,
      eventType: command.eventType,
      expectedVersion: current.state.version,
      parentEventId: current.state.currentEventId,
      actorId,
      actorAccountPublicKeyHex: identity.publicKeyHex,
      actorRole: command.actorRole,
      occurredAt,
      payload: command.payload,
    }, identity.signer);

    const next = await projectCanonicalEvents([...record.events, event], this.options.verify);
    const issue = [...next.rejected, ...next.conflicts].find(row => row.eventId === event.eventId);
    if (issue || !next.state.eventIds.includes(event.eventId)) {
      throw new Error(issue?.reason ?? 'This action is no longer valid on the accepted group frontier.');
    }

    const updated = updateMetadata(record, trustedAction, next.state);
    const persisted: PersistedAuthorityGroupV1 = {
      ...updated,
      events: [...record.events, event],
      stateHash: next.stateHash,
      frontierHash: next.frontierHash,
    };
    // Durability precedes projection: a visible transition can never outrun
    // the signed journal from which it must be rebuilt.
    const stored = await this.options.journal.compareAndSwap(groupId, existing?.frontierHash ?? null, persisted);
    if (!stored) throw new Error('The group changed on another device. Refresh and try this action again.');
    return {
      state: projectGroup(base, persisted, next.state),
      event,
      canonicalState: next.state,
      stateHash: next.stateHash,
      frontierHash: next.frontierHash,
    };
  }

  async appendMode(base: AppState, command: ModeAuthorityCommandV1, actorId = base.currentUserId): Promise<AuthorityAppendResult> {
    if (!actorId) throw new Error('A participant must be selected before changing shared group truth.');
    if (!base.users[actorId]) throw new Error('The selected participant is missing.');
    const groupId = required(command.groupId, 'Group identifier');
    const existing = await this.options.journal.read(groupId);
    if (!existing) throw new Error('This group is not backed by a signed authority journal.');
    const current = await this.verifyRecord(existing);
    const member = current.state.members[actorId];
    if (!member || member.active === false) throw new Error('This participant is not a member of the accepted group.');
    const identity = await this.options.identities.resolve(actorId, member.accountPublicKeyHex);
    if (identity.participantId !== actorId || identity.publicKeyHex !== member.accountPublicKeyHex) {
      throw new Error('The authority signer does not belong to this accepted participant.');
    }
    const occurredAt = this.options.now?.() ?? new Date().toISOString();
    const event = await createCanonicalEvent({
      eventId: safeId(`event-${this.options.randomId?.() ?? crypto.randomUUID()}`),
      commandId: safeId(`command-${this.options.randomId?.() ?? crypto.randomUUID()}`),
      groupId,
      eventType: command.eventType,
      expectedVersion: current.state.version,
      parentEventId: current.state.currentEventId,
      actorId,
      actorAccountPublicKeyHex: identity.publicKeyHex,
      actorRole: member.role,
      occurredAt,
      payload: structuredClone(command.payload),
    }, identity.signer);
    const next = await projectCanonicalEvents([...existing.events, event], this.options.verify);
    const issue = [...next.rejected, ...next.conflicts].find(row => row.eventId === event.eventId);
    if (issue || !next.state.eventIds.includes(event.eventId)) {
      throw new Error(issue?.reason ?? 'This named-mode action is no longer valid on the accepted group frontier.');
    }
    const persisted: PersistedAuthorityGroupV1 = {
      ...existing,
      mode: next.state.mode ?? existing.mode,
      events: [...existing.events, event],
      stateHash: next.stateHash,
      frontierHash: next.frontierHash,
    };
    const stored = await this.options.journal.compareAndSwap(groupId, existing.frontierHash, persisted);
    if (!stored) throw new Error('The group changed on another device. Refresh and try this action again.');
    return {
      state: projectGroup(base, persisted, next.state),
      event,
      canonicalState: next.state,
      stateHash: next.stateHash,
      frontierHash: next.frontierHash,
    };
  }

  async appendExpenseCorrection(
    base: AppState,
    command: ExpenseCorrectionAuthorityCommandV1,
    actorId = base.currentUserId,
  ): Promise<AuthorityAppendResult> {
    if (!actorId) throw new Error('A participant must be selected before correcting an expense.');
    if (!base.users[actorId]) throw new Error('The selected participant is missing.');
    const groupId = required(command.groupId, 'Group identifier');
    const existing = await this.options.journal.read(groupId);
    if (!existing) throw new Error('This group is not backed by a signed authority journal.');
    const current = await this.verifyRecord(existing);
    const member = current.state.members[actorId];
    if (!member || member.active === false) throw new Error('This participant is not a member of the accepted group.');
    const identity = await this.options.identities.resolve(actorId, member.accountPublicKeyHex);
    if (identity.participantId !== actorId || identity.publicKeyHex !== member.accountPublicKeyHex) {
      throw new Error('The authority signer does not belong to this accepted participant.');
    }
    const event = await createCanonicalEvent({
      eventId: safeId(`event-${this.options.randomId?.() ?? crypto.randomUUID()}`),
      commandId: safeId(`command-${this.options.randomId?.() ?? crypto.randomUUID()}`),
      groupId,
      eventType: 'EXPENSE_CORRECTED',
      expectedVersion: current.state.version,
      parentEventId: current.state.currentEventId,
      actorId,
      actorAccountPublicKeyHex: identity.publicKeyHex,
      actorRole: member.role,
      occurredAt: this.options.now?.() ?? new Date().toISOString(),
      payload: {
        expenseId: required(command.expenseId, 'Expense identifier'),
        reason: required(command.reason, 'Correction reason'),
        total: structuredClone(command.total),
        allocations: structuredClone(command.allocations),
      },
    }, identity.signer);
    const next = await projectCanonicalEvents([...existing.events, event], this.options.verify);
    const issue = [...next.rejected, ...next.conflicts].find(row => row.eventId === event.eventId);
    if (issue || !next.state.eventIds.includes(event.eventId)) {
      throw new Error(issue?.reason ?? 'This expense correction is no longer valid on the accepted group frontier.');
    }
    const persisted: PersistedAuthorityGroupV1 = {
      ...existing,
      events: [...existing.events, event],
      stateHash: next.stateHash,
      frontierHash: next.frontierHash,
    };
    if (!await this.options.journal.compareAndSwap(groupId, existing.frontierHash, persisted)) {
      throw new Error('The group changed on another device. Refresh and try this correction again.');
    }
    return {
      state: projectGroup(base, persisted, next.state),
      event,
      canonicalState: next.state,
      stateHash: next.stateHash,
      frontierHash: next.frontierHash,
    };
  }

  async appendCloseoutSuccessor(
    base: AppState,
    command: CloseoutSuccessorAuthorityCommandV1,
    actorId = base.currentUserId,
  ): Promise<AuthorityAcceptResult> {
    if (!actorId) throw new Error('A participant must be selected before creating a successor record.');
    if (!base.users[actorId]) throw new Error('The selected participant is missing.');
    const groupId = required(command.groupId, 'Group identifier');
    const existing = await this.options.journal.read(groupId);
    if (!existing) throw new Error('This group is not backed by a signed authority journal.');
    const current = await this.verifyRecord(existing);
    if (!current.state.closed) throw new Error('Only a closed group can create a successor record.');
    const member = current.state.members[actorId];
    if (!member || member.active === false || actorId !== current.state.organizerId || member.role !== 'organizer') {
      throw new Error('Only the current organizer may create a successor record.');
    }
    const predecessorRecordId = required(command.predecessorRecordId, 'Predecessor record identifier');
    if (predecessorRecordId !== current.state.closed.recordId) {
      throw new Error('The successor must identify the exact closed record.');
    }
    const recordId = required(command.recordId, 'Successor record identifier');
    const reason = required(command.reason, 'Successor reason');
    if (recordId === predecessorRecordId) throw new Error('This successor record already exists.');
    const durableSuccessor = current.state.successorRecords.find(record => record.recordId === recordId);
    if (durableSuccessor) {
      const durableEvent = existing.events.find(candidate => candidate.eventId === durableSuccessor.eventId);
      const payload = durableEvent?.payload as {recordId?: string; predecessorRecordId?: string; reason?: string} | undefined;
      const exactRetry = durableEvent?.eventType === 'SUCCESSOR_RECORD_CREATED'
        && durableEvent.actorId === actorId
        && durableEvent.actorAccountPublicKeyHex === member.accountPublicKeyHex
        && payload?.recordId === recordId
        && payload.predecessorRecordId === predecessorRecordId
        && payload.reason === reason;
      if (!exactRetry) throw new Error('This successor record identifier is already used by different content.');
      return {
        state: projectGroup(base, existing, current.state),
        event: durableEvent,
        canonicalState: structuredClone(current.state),
        stateHash: current.stateHash,
        frontierHash: current.frontierHash,
        outcome: 'duplicate',
      };
    }
    const identity = await this.options.identities.resolve(actorId, member.accountPublicKeyHex);
    if (identity.participantId !== actorId || identity.publicKeyHex !== member.accountPublicKeyHex) {
      throw new Error('The authority signer does not belong to the current organizer.');
    }
    const event = await createCanonicalEvent({
      eventId: safeId(`event-${this.options.randomId?.() ?? crypto.randomUUID()}`),
      commandId: safeId(`command-${this.options.randomId?.() ?? crypto.randomUUID()}`),
      groupId,
      eventType: 'SUCCESSOR_RECORD_CREATED',
      expectedVersion: current.state.version,
      parentEventId: current.state.currentEventId,
      actorId,
      actorAccountPublicKeyHex: identity.publicKeyHex,
      actorRole: 'organizer',
      occurredAt: this.options.now?.() ?? new Date().toISOString(),
      payload: {recordId, predecessorRecordId, reason},
    }, identity.signer);
    const next = await projectCanonicalEvents([...existing.events, event], this.options.verify);
    const issue = [...next.rejected, ...next.conflicts].find(row => row.eventId === event.eventId);
    if (issue || !next.state.eventIds.includes(event.eventId)) {
      throw new Error(issue?.reason ?? 'This successor record is no longer valid on the accepted group frontier.');
    }
    const persisted: PersistedAuthorityGroupV1 = {
      ...existing,
      events: [...existing.events, event],
      stateHash: next.stateHash,
      frontierHash: next.frontierHash,
    };
    if (!await this.options.journal.compareAndSwap(groupId, existing.frontierHash, persisted)) {
      throw new Error('The group changed on another device. Refresh and try this successor again.');
    }
    return {
      state: projectGroup(base, persisted, next.state),
      event,
      canonicalState: next.state,
      stateHash: next.stateHash,
      frontierHash: next.frontierHash,
      outcome: 'applied',
    };
  }

  async appendShareAdjustment(
    base: AppState,
    command: ShareAdjustmentAuthorityCommandV1,
    actorId = base.currentUserId,
  ): Promise<AuthorityAppendResult> {
    if (String(command.kind) === 'correction') {
      throw new Error('Legacy correction events are replay-only; use the reviewed expense-correction command.');
    }
    if (!actorId) throw new Error('A participant must be selected before adjusting a share.');
    if (!base.users[actorId]) throw new Error('The selected participant is missing.');
    const groupId = required(command.groupId, 'Group identifier');
    const existing = await this.options.journal.read(groupId);
    if (!existing) throw new Error('This group is not backed by a signed authority journal.');
    const current = await this.verifyRecord(existing);
    const member = current.state.members[actorId];
    if (!member || member.active === false) throw new Error('This participant is not a member of the accepted group.');
    const identity = await this.options.identities.resolve(actorId, member.accountPublicKeyHex);
    if (identity.participantId !== actorId || identity.publicKeyHex !== member.accountPublicKeyHex) {
      throw new Error('The authority signer does not belong to this accepted participant.');
    }
    const event = await createCanonicalEvent({
      eventId: safeId(`event-${this.options.randomId?.() ?? crypto.randomUUID()}`),
      commandId: safeId(`command-${this.options.randomId?.() ?? crypto.randomUUID()}`),
      groupId,
      eventType: 'SHARE_ADJUSTED',
      expectedVersion: current.state.version,
      parentEventId: current.state.currentEventId,
      actorId,
      actorAccountPublicKeyHex: identity.publicKeyHex,
      actorRole: member.role,
      occurredAt: this.options.now?.() ?? new Date().toISOString(),
      payload: {
        shareId: required(command.shareId, 'Share identifier'),
        kind: command.kind,
        delta: structuredClone(command.delta),
        reason: required(command.reason, 'Adjustment reason'),
        ...(command.kind === 'reversal'
          ? {reversesAdjustmentEventId: required(command.reversesAdjustmentEventId, 'Reversed adjustment identifier')}
          : {}),
      },
    }, identity.signer);
    const next = await projectCanonicalEvents([...existing.events, event], this.options.verify);
    const issue = [...next.rejected, ...next.conflicts].find(row => row.eventId === event.eventId);
    if (issue || !next.state.eventIds.includes(event.eventId)) {
      throw new Error(issue?.reason ?? 'This share adjustment is no longer valid on the accepted group frontier.');
    }
    const persisted: PersistedAuthorityGroupV1 = {
      ...existing,
      events: [...existing.events, event],
      stateHash: next.stateHash,
      frontierHash: next.frontierHash,
    };
    if (!await this.options.journal.compareAndSwap(groupId, existing.frontierHash, persisted)) {
      throw new Error('The group changed on another device. Refresh and try this adjustment again.');
    }
    return {
      state: projectGroup(base, persisted, next.state),
      event,
      canonicalState: next.state,
      stateHash: next.stateHash,
      frontierHash: next.frontierHash,
    };
  }

  async appendMembership(
    base: AppState,
    command: MembershipAuthorityCommandV1,
    actorId = base.currentUserId,
  ): Promise<AuthorityAppendResult> {
    if (!actorId || !base.users[actorId]) throw new Error('A current organizer must be selected.');
    const groupId = required(command.groupId, 'Group identifier');
    const existing = await this.options.journal.read(groupId);
    if (!existing) throw new Error('This group is not backed by a signed authority journal.');
    const current = await this.verifyRecord(existing);
    const actor = current.state.members[actorId];
    if (!actor || actor.active === false || actor.role !== 'organizer' || actorId !== current.state.organizerId) {
      throw new Error('Only the current organizer may change accepted membership.');
    }
    if (!this.options.membershipChanges || !await this.options.membershipChanges.authorize(
      command,
      actorId,
      structuredClone(current.state),
    )) {
      throw new Error('The signed membership lifecycle does not authorize this group change.');
    }
    if (command.type === 'add') {
      const accepted = await this.options.memberships?.resolve(groupId, command.grant.participantId);
      if (!accepted || !sameGrant(accepted, command.grant) || accepted.role !== 'member') {
        throw new Error('This person has not completed the signed membership acceptance.');
      }
    }
    const identity = await this.options.identities.resolve(actorId, actor.accountPublicKeyHex);
    if (identity.participantId !== actorId || identity.publicKeyHex !== actor.accountPublicKeyHex) {
      throw new Error('The authority signer does not belong to the current organizer.');
    }
    const mapped = membershipCommandEvent(command);
    const event = await createCanonicalEvent({
      eventId: safeId(`event-${this.options.randomId?.() ?? crypto.randomUUID()}`),
      commandId: safeId(`command-${this.options.randomId?.() ?? crypto.randomUUID()}`),
      groupId,
      eventType: mapped.eventType,
      expectedVersion: current.state.version,
      parentEventId: current.state.currentEventId,
      actorId,
      actorAccountPublicKeyHex: identity.publicKeyHex,
      actorRole: 'organizer',
      occurredAt: this.options.now?.() ?? new Date().toISOString(),
      payload: mapped.payload,
    }, identity.signer);
    const next = await projectCanonicalEvents([...existing.events, event], this.options.verify);
    const issue = [...next.rejected, ...next.conflicts].find(row => row.eventId === event.eventId);
    if (issue || !next.state.eventIds.includes(event.eventId)) throw new Error(issue?.reason ?? 'Membership changed on another device.');
    const persisted = {...existing, events: [...existing.events, event], stateHash: next.stateHash, frontierHash: next.frontierHash};
    if (!await this.options.journal.compareAndSwap(groupId, existing.frontierHash, persisted)) {
      throw new Error('The group changed on another device. Refresh and try this action again.');
    }
    return {state: projectGroup(base, persisted, next.state), event, canonicalState: next.state, stateHash: next.stateHash, frontierHash: next.frontierHash};
  }

  async readCanonicalGroup(groupId: string): Promise<CanonicalGroupStateV1 | null> {
    const record = await this.options.journal.read(groupId);
    if (!record) return null;
    return structuredClone((await this.verifyRecord(record)).state);
  }

  async readAcceptedEvents(groupId: string): Promise<CanonicalEventV1[]> {
    const record = await this.options.journal.read(groupId);
    if (!record) return [];
    await this.verifyRecord(record);
    return structuredClone(record.events);
  }

  async readGroupOrigin(groupId: string): Promise<CanonicalEventV1 | null> {
    const events = await this.readAcceptedEvents(groupId);
    return events.find(event => event.eventType === 'GROUP_CREATED' && event.expectedVersion === 0) ?? null;
  }

  /**
   * Atomically imports a recovery checkpoint into the same production journal.
   * The complete merged event set is signature-checked and deterministically
   * replayed before the first durable write, so a bad later event can never
   * leave a partially restored group behind.
   */
  async importRecoveredEvents(base: AppState, recoveredEvents: CanonicalEventV1[]): Promise<AuthorityRecoveryImportResult> {
    if (recoveredEvents.length === 0) throw new Error('Recovered group history is empty.');
    const events = structuredClone(recoveredEvents);
    const groupId = required(events[0]?.groupId ?? '', 'Recovered group identifier');
    if (events.some(event => event.groupId !== groupId)) throw new Error('Recovered history mixes group aggregates.');
    const incoming = new Map<string, CanonicalEventV1>();
    for (const event of events) {
      const prior = incoming.get(event.eventId);
      if (prior && JSON.stringify(prior) !== JSON.stringify(event)) {
        throw new Error('Recovered history reuses an event identifier with different content.');
      }
      incoming.set(event.eventId, event);
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const existing = await this.options.journal.read(groupId);
      if (existing) await this.verifyRecord(existing);
      const origin = [...(existing?.events ?? []), ...incoming.values()]
        .find(event => event.eventType === 'GROUP_CREATED' && event.expectedVersion === 0);
      if (!origin) throw new Error('Recovered history does not contain a signed group origin.');
      const record = existing ?? emptyRecordFromEvent(origin);
      const merged = new Map(record.events.map(event => [event.eventId, event]));
      for (const event of incoming.values()) {
        const prior = merged.get(event.eventId);
        if (prior && JSON.stringify(prior) !== JSON.stringify(event)) {
          throw new Error('Recovered history conflicts with an accepted event identifier.');
        }
        merged.set(event.eventId, event);
      }
      const projection = await projectCanonicalEvents([...merged.values()], this.options.verify);
      if (projection.rejected.length || projection.conflicts.length) {
        throw new Error(projection.rejected[0]?.reason ?? projection.conflicts[0]?.reason ?? 'Recovered history is invalid.');
      }
      if ([...incoming.keys()].some(eventId => !projection.state.eventIds.includes(eventId))) {
        throw new Error('Recovered history does not belong to one accepted group frontier.');
      }
      const byId = new Map([...merged.values()].map(event => [event.eventId, event]));
      const acceptedEvents = projection.state.eventIds.map(eventId => {
        const event = byId.get(eventId);
        if (!event) throw new Error('Recovered history replay omitted an accepted event.');
        return event;
      });
      const rebuilt = rebuildMetadata({...record, events: acceptedEvents}, projection.state);
      const persisted: PersistedAuthorityGroupV1 = {
        ...rebuilt,
        events: acceptedEvents,
        stateHash: projection.stateHash,
        frontierHash: projection.frontierHash,
      };
      const importedEventIds = [...incoming.keys()].filter(eventId => !record.events.some(event => event.eventId === eventId));
      if (importedEventIds.length === 0) {
        return {
          outcome: 'duplicate',
          state: projectGroup(base, record, projection.state),
          canonicalState: projection.state,
          stateHash: projection.stateHash,
          frontierHash: projection.frontierHash,
          importedEventIds: [],
        };
      }
      if (!await this.options.journal.compareAndSwap(groupId, existing?.frontierHash ?? null, persisted)) continue;
      return {
        outcome: 'applied',
        state: projectGroup(base, persisted, projection.state),
        canonicalState: projection.state,
        stateHash: projection.stateHash,
        frontierHash: projection.frontierHash,
        importedEventIds,
      };
    }
    throw new Error('The group changed repeatedly while restoring this recovery checkpoint.');
  }

  /**
   * Accept a canonical event received from another participant. The event's
   * own signature and causal frontier are the authority; legacy action
   * envelopes are intentionally not accepted here.
   */
  async accept(base: AppState, envelope: CanonicalAuthorityEventEnvelopeV1): Promise<AuthorityAcceptResult> {
    assertCanonicalAuthorityEventEnvelope(envelope);
    const {event} = envelope;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const existing = await this.options.journal.read(event.groupId);
      if (!existing && (event.eventType !== 'GROUP_CREATED' || event.expectedVersion !== 0)) {
        throw new Error('The authority event depends on group history that has not arrived yet.');
      }
      if (existing?.events.some(candidate => candidate.eventId === event.eventId)) {
        const projection = await this.verifyRecord(existing);
        if (!projection.state.eventIds.includes(event.eventId)) throw new Error('The authority event conflicts with the accepted group frontier.');
        return {
          outcome: 'duplicate',
          state: projectGroup(base, existing, projection.state), event,
          canonicalState: projection.state, stateHash: projection.stateHash, frontierHash: projection.frontierHash,
        };
      }
      const record = existing ?? emptyRecordFromEvent(event);
      const current = existing ? await this.verifyRecord(existing) : null;
      if (current && event.expectedVersion > current.state.version) {
        throw new Error('The authority event depends on group history that has not arrived yet.');
      }
      // Verify the received event independently before allowing it into the
      // encrypted journal, then replay the complete set deterministically.
      const standalone = await projectCanonicalEvents([event], this.options.verify);
      if (event.eventType === 'GROUP_CREATED' && !standalone.state.eventIds.includes(event.eventId)) {
        throw new Error(standalone.rejected[0]?.reason ?? standalone.conflicts[0]?.reason ?? 'The authority event is invalid.');
      }
      const events = [...record.events, event];
      const next = await projectCanonicalEvents(events, this.options.verify);
      const rejected = next.rejected.find(issue => issue.eventId === event.eventId);
      if (rejected) throw new Error(rejected.reason);
      if (!next.state.eventIds.includes(event.eventId)) {
        throw new Error('The authority event conflicts with the accepted group frontier.');
      }
      const rebuilt = rebuildMetadata({...record, events}, next.state);
      const persisted: PersistedAuthorityGroupV1 = {...rebuilt, events, stateHash: next.stateHash, frontierHash: next.frontierHash};
      const stored = await this.options.journal.compareAndSwap(event.groupId, existing?.frontierHash ?? null, persisted);
      if (!stored) continue;
      return {
        outcome: 'applied', state: projectGroup(base, persisted, next.state), event,
        canonicalState: next.state, stateHash: next.stateHash, frontierHash: next.frontierHash,
      };
    }
    throw new Error('The group changed repeatedly while receiving this event.');
  }

  clear(): Promise<void> {
    return this.options.journal.clear();
  }

  async memberAccountPublicKey(groupId: string, participantId: string): Promise<string | null> {
    const record = await this.options.journal.read(groupId);
    if (!record) return null;
    return (await this.verifyRecord(record)).state.members[participantId]?.accountPublicKeyHex ?? null;
  }

  private async requiredRecord(groupId: string): Promise<PersistedAuthorityGroupV1> {
    const record = await this.options.journal.read(groupId);
    if (!record) throw new Error(`Authority journal ${groupId} disappeared during hydration.`);
    return record;
  }

  private async verifyRecord(record: PersistedAuthorityGroupV1) {
    assertRecordShape(record);
    const projection = await projectCanonicalEvents(record.events, this.options.verify);
    if (projection.rejected.length) throw new Error(`Authority journal ${record.groupId} contains rejected events.`);
    if (projection.stateHash !== record.stateHash || projection.frontierHash !== record.frontierHash) {
      throw new Error(`Authority journal ${record.groupId} failed its corruption check.`);
    }
    return projection;
  }

  private async verifyAction(
    base: AppState,
    action: ProductionAuthorityAction,
    actorId: string,
    canonical: CanonicalGroupStateV1,
    record: PersistedAuthorityGroupV1,
  ): Promise<ProductionAuthorityAction> {
    if (action.type !== 'RECORD_MATCHED_PAYMENT') return action;
    const verify = this.options.verifyFinalizedPayment;
    if (!verify) throw new Error('Finalized payment verification is unavailable. Nothing was recorded.');
    const shareId = canonicalShareForLegacySplit(record, action.payload.splitId);
    const share = canonical.shares[shareId];
    const expense = share ? canonical.expenses[share.expenseId] : undefined;
    if (!share || !expense) throw new Error('The requested payment item is missing.');
    if (actorId !== share.participantId || action.payload.userId !== share.participantId) throw new Error('Only the payer may attach finalized payment evidence.');
    if (action.payload.receiverUserId !== expense.paidBy) throw new Error('Finalized payment receiver does not match this share.');
    const payerAddress = base.users[share.participantId]?.walletAddress;
    const receiverAddress = base.users[expense.paidBy]?.walletAddress;
    if (!payerAddress || !receiverAddress) throw new Error('Both payment wallets must be bound before recording finalized payment.');
    const verified = await verify({
      reference: action.payload.receipt.txHash,
      payerId: share.participantId,
      receiverId: expense.paidBy,
      payerAddress,
      receiverAddress,
      amount: share.amount,
    });
    if (
      !sameAddress(verified.from, payerAddress)
      || !sameAddress(verified.to, receiverAddress)
      || verified.txHash.toLowerCase() !== action.payload.receipt.txHash.toLowerCase()
      || !verified.amountBaseUnits.trim()
      || !verified.blockNumber.trim()
    ) throw new Error('Finalized payment verification did not match the exact payer, receiver, or reference.');
    return {...action, payload: {...action.payload, receipt: structuredClone(verified)}};
  }
}

export function isProductionAuthorityAction(action: Action): action is ProductionAuthorityAction {
  return [
    'CREATE_GROUP',
    'ADD_EXPENSE',
    'SEND_REQUEST',
    'MARK_PAID',
    'CONFIRM_RECEIVED',
    'RECORD_MATCHED_PAYMENT',
    'SAVE_RECORD',
  ].includes(action.type);
}

async function commandFor(
  base: AppState,
  action: ProductionAuthorityAction,
  actorId: string,
  actorPublicKeyHex: string,
  canonical: CanonicalGroupStateV1,
  record: PersistedAuthorityGroupV1,
  memberships?: AcceptedMembershipGrantResolver,
  initialGroupAccess?: {keyVersion: number; groupKeyEnvelopeId: string},
  creationEventId?: string,
  creationAcceptedAt?: string,
): Promise<{eventType: CanonicalEventType; actorRole: 'organizer' | 'member'; payload: CanonicalEventV1['payload']}> {
  if (action.type === 'CREATE_GROUP') {
    const {group} = action.payload;
    if (group.liveSession) throw new Error('Reusable transport secrets cannot enter the authority journal.');
    if (!group.memberIds.includes(actorId)) throw new Error('The organizer must be a group member.');
    const members = [] as Array<{participantId: string; accountPublicKeyHex: string; role: 'organizer' | 'member'}>;
    for (const participantId of [...new Set(group.memberIds)]) {
      const user = base.users[participantId];
      if (!user) throw new Error(`Group participant ${participantId} is missing.`);
      const accountPublicKeyHex = participantId === actorId ? actorPublicKeyHex : user.accountPublicKeyHex;
      if (!accountPublicKeyHex) {
        throw new Error(`${user.name || 'A participant'} must accept with a participant-held account before joining.`);
      }
      if (participantId !== actorId) {
        const grant = await memberships?.resolve(group.id, participantId);
        if (!grant || !acceptedGrantMatches(grant, group.id, participantId, accountPublicKeyHex)) {
          throw new Error(`${user.name || 'A participant'} has not accepted membership for this group yet.`);
        }
      }
      members.push({
        participantId,
        accountPublicKeyHex,
        role: participantId === actorId ? 'organizer' : 'member',
        ...(participantId === actorId && initialGroupAccess ? {
          active: true,
          acceptedAt: required(creationAcceptedAt, 'Group acceptance time'),
          invitationId: `group-origin:${required(creationEventId, 'Group origin event')}`,
          keyVersion: initialGroupAccess.keyVersion,
          groupKeyEnvelopeId: required(initialGroupAccess.groupKeyEnvelopeId, 'Group access envelope'),
        } : {}),
      });
    }
    const mode = group.mode ?? 'normal_pot';
    return {eventType: 'GROUP_CREATED', actorRole: 'organizer', payload: {name: group.name, mode, organizerId: actorId, members}};
  }

  const member = canonical.members[actorId];
  if (!member || member.accountPublicKeyHex !== actorPublicKeyHex) throw new Error('This participant does not hold the accepted group authority key.');

  if (action.type === 'ADD_EXPENSE') {
    const {expense, splits, exact} = action.payload;
    if (expense.paidByUserId !== actorId) throw new Error('Only the payer may add this reviewed expense.');
    if (!exact) throw new Error('A reviewed expense must enter shared authority as exact minor-unit money.');
    assertMoney(exact.total);
    assertConservation(exact.total, exact.allocations);
    const splitParticipants = [...new Set(splits.map(split => split.userId))].sort();
    const allocationParticipants = exact.allocations.map(row => row.participantId).sort();
    if (splitParticipants.length !== splits.length
      || JSON.stringify(splitParticipants) !== JSON.stringify(allocationParticipants)) {
      throw new Error('Exact allocations do not match the reviewed participants.');
    }
    return {
      eventType: 'EXPENSE_ADDED',
      actorRole: member.role,
      payload: {
        expenseId: expense.id,
        description: expense.description,
        paidBy: actorId,
        total: structuredClone(exact.total),
        allocations: structuredClone(exact.allocations),
      },
    };
  }

  if (action.type === 'SAVE_RECORD') {
    return {eventType: 'GROUP_CLOSED', actorRole: member.role, payload: {recordId: action.payload.recordId}};
  }
  const shareId = canonicalShareForLegacySplit(record, action.payload.splitId);
  if (action.type === 'SEND_REQUEST') {
    const {requestId, createdAt, expiresAt, capabilityHash} = action.payload;
    if (!requestId?.trim() || !createdAt || !expiresAt || !capabilityHash?.trim()) {
      throw new Error('A signed, expiring payment request is required before sharing this link.');
    }
    return {eventType: 'SHARE_REQUESTED', actorRole: member.role, payload: {shareId, request: {requestId, createdAt, expiresAt, capabilityHash}}};
  }
  if (action.type === 'MARK_PAID') {
    if (action.payload.userId !== actorId) throw new Error('A participant may mark only their own share paid.');
    return {eventType: 'SHARE_MARKED_PAID', actorRole: member.role, payload: {shareId}};
  }
  if (action.type === 'CONFIRM_RECEIVED') {
    if (action.payload.currentUserId !== actorId) throw new Error('Only the active receiver may confirm receipt.');
    return {eventType: 'SHARE_RECEIVED', actorRole: member.role, payload: {shareId}};
  }
  if (action.type === 'RECORD_MATCHED_PAYMENT') {
    if (action.payload.userId !== actorId) throw new Error('Only the payer may attach finalized payment evidence.');
    const share = canonical.shares[shareId];
    if (!share) throw new Error('The requested share is missing.');
    return {
      eventType: 'SHARE_CLEARED',
      actorRole: member.role,
      payload: {shareId, evidence: {
        reference: action.payload.receipt.txHash,
        network: action.payload.receipt.chainId,
        asset: share.amount.currency,
        payerId: action.payload.userId,
        receiverId: action.payload.receiverUserId,
        amount: share.amount,
        finality: 'finalized',
      }},
    };
  }
  throw new Error('Shared authority action is unsupported.');
}

export function groupIdForProductionAuthorityAction(state: AppState, action: ProductionAuthorityAction): string {
  if (action.type === 'CREATE_GROUP') return required(action.payload.group.id, 'Group identifier');
  if (action.type === 'ADD_EXPENSE') return required(action.payload.expense.groupId, 'Group identifier');
  if (action.type === 'SAVE_RECORD') return required(action.payload.groupId, 'Group identifier');
  const split = state.splits[action.payload.splitId];
  const expense = split ? state.expenses[split.expenseId] : undefined;
  if (!split || !expense) throw new Error('The shared payment item is missing.');
  return expense.groupId;
}

function emptyRecord(action: ProductionAuthorityAction): PersistedAuthorityGroupV1 {
  if (action.type !== 'CREATE_GROUP') throw new Error('Only a signed group creation can open an authority journal.');
  return {
    v: 1,
    groupId: action.payload.group.id,
    mode: action.payload.group.mode ?? 'normal_pot',
    events: [],
    expenses: {},
    stateHash: '',
    frontierHash: '',
  };
}

function emptyRecordFromEvent(event: CanonicalEventV1): PersistedAuthorityGroupV1 {
  if (event.eventType !== 'GROUP_CREATED') throw new Error('Only a signed group creation can open an authority journal.');
  const payload = event.payload as {mode?: GroupMode};
  return {v: 1, groupId: event.groupId, mode: payload.mode ?? 'normal_pot', events: [], expenses: {}, stateHash: '', frontierHash: ''};
}

function updateMetadata(record: PersistedAuthorityGroupV1, action: ProductionAuthorityAction, state: CanonicalGroupStateV1): PersistedAuthorityGroupV1 {
  if (action.type === 'ADD_EXPENSE') {
    const splitIdByParticipant = Object.fromEntries(action.payload.splits.map(split => [split.userId, canonicalShareId(action.payload.expense.id, split.userId)]));
    return {
      ...record,
      expenses: {...record.expenses, [action.payload.expense.id]: {
        date: action.payload.expense.date,
        splitIdByParticipant,
        walletPaymentByParticipant: {},
        requestCapabilityByParticipant: {},
      }},
    };
  }
  if (action.type === 'SEND_REQUEST') {
    const share = state.shares[canonicalShareForLegacySplit(record, action.payload.splitId)];
    const metadata = share ? record.expenses[share.expenseId] : undefined;
    if (!share || !metadata) throw new Error('Payment request metadata does not match the authority projection.');
    return {
      ...record,
      expenses: {...record.expenses, [share.expenseId]: {
        ...metadata,
        requestCapabilityByParticipant: {
          ...metadata.requestCapabilityByParticipant,
          ...(action.payload.requestEntryCapability ? {[share.participantId]: action.payload.requestEntryCapability} : {}),
        },
      }},
    };
  }
  if (action.type !== 'RECORD_MATCHED_PAYMENT') return record;
  const share = state.shares[canonicalShareForLegacySplit(record, action.payload.splitId)];
  const metadata = share ? record.expenses[share.expenseId] : undefined;
  if (!share || !metadata) throw new Error('Finalized payment metadata does not match the authority projection.');
  return {
    ...record,
    expenses: {...record.expenses, [share.expenseId]: {
      ...metadata,
      walletPaymentByParticipant: {...metadata.walletPaymentByParticipant, [share.participantId]: structuredClone(action.payload.receipt)},
    }},
  };
}

function rebuildMetadata(record: PersistedAuthorityGroupV1, state: CanonicalGroupStateV1): PersistedAuthorityGroupV1 {
  const expenses: Record<string, AuthorityExpenseMetadataV1> = {};
  for (const expense of Object.values(state.expenses)) {
    const existing = record.expenses[expense.expenseId];
    const event = record.events.find(candidate => candidate.eventType === 'EXPENSE_ADDED'
      && (candidate.payload as {expenseId?: string}).expenseId === expense.expenseId);
    expenses[expense.expenseId] = {
      date: existing?.date ?? event?.occurredAt ?? new Date(0).toISOString(),
      splitIdByParticipant: Object.fromEntries(
        Object.values(state.shares)
          .filter(share => share.expenseId === expense.expenseId)
          .map(share => [share.participantId, canonicalShareId(expense.expenseId, share.participantId)]),
      ),
      walletPaymentByParticipant: Object.fromEntries(Object.entries(existing?.walletPaymentByParticipant ?? {})
        .filter(([participantId, receipt]) => state.shares[canonicalShareId(expense.expenseId, participantId)]?.clearedEvidence?.reference === receipt.txHash)),
      requestCapabilityByParticipant: Object.fromEntries(Object.entries(existing?.requestCapabilityByParticipant ?? {})
        .filter(([participantId]) => Boolean(state.shares[canonicalShareId(expense.expenseId, participantId)]?.request))),
    };
  }
  return {...record, mode: state.mode ?? record.mode, expenses};
}

function projectGroup(base: AppState, record: PersistedAuthorityGroupV1, canonical: CanonicalGroupStateV1): AppState {
  const state = structuredClone(base);
  const previousExpenseIds = new Set(Object.values(state.expenses).filter(expense => expense.groupId === canonical.groupId).map(expense => expense.id));
  for (const expenseId of previousExpenseIds) delete state.expenses[expenseId];
  for (const [splitId, split] of Object.entries(state.splits)) if (previousExpenseIds.has(split.expenseId)) delete state.splits[splitId];
  for (const [recordId, saved] of Object.entries(state.savedRecords)) if (saved.groupId === canonical.groupId) delete state.savedRecords[recordId];

  state.groups[canonical.groupId] = {
    id: canonical.groupId,
    name: canonical.name,
    memberIds: Object.values(canonical.members).filter(member => member.active !== false).map(member => member.participantId),
    mode: canonical.mode ?? record.mode,
    ...(canonical.closed ? {closedRecordId: canonical.closed.recordId, closedAt: record.events.find(event => event.eventId === canonical.closed?.eventId)?.occurredAt} : {}),
  };
  for (const member of Object.values(canonical.members)) {
    const user = state.users[member.participantId];
    if (!user) {
      state.users[member.participantId] = {id: member.participantId, name: member.participantId, accountPublicKeyHex: member.accountPublicKeyHex};
    } else if (!user.accountPublicKeyHex) {
      state.users[member.participantId] = {...user, accountPublicKeyHex: member.accountPublicKeyHex};
    }
  }

  for (const expense of Object.values(canonical.expenses)) {
    const metadata = record.expenses[expense.expenseId];
    if (!metadata) throw new Error(`Authority expense ${expense.expenseId} is missing projection metadata.`);
    state.expenses[expense.expenseId] = {
      id: expense.expenseId,
      groupId: canonical.groupId,
      description: expense.description,
      amount: moneyToDisplayNumber(expense.total),
      currency: expense.total.currency,
      paidByUserId: expense.paidBy,
      date: metadata.date,
    };
    for (const share of Object.values(canonical.shares).filter(value => value.expenseId === expense.expenseId)) {
      const id = metadata.splitIdByParticipant[share.participantId] ?? canonicalShareId(expense.expenseId, share.participantId);
      const walletPayment = metadata.walletPaymentByParticipant[share.participantId];
      if (walletPayment && share.clearedEvidence?.reference !== walletPayment.txHash) {
        throw new Error(`Authority payment metadata for ${id} failed its signed reference check.`);
      }
      state.splits[id] = {
        id,
        expenseId: expense.expenseId,
        userId: share.participantId,
        amount: moneyToDisplayNumber(share.amount),
        status: legacyStatus(share.status, share.participantId === expense.paidBy),
        ...(share.request ? {
          requestId: share.request.requestId,
          requestCreatedAt: share.request.createdAt,
          requestExpiresAt: share.request.expiresAt,
          requestCapabilityHash: share.request.capabilityHash,
        } : {}),
        ...(metadata.requestCapabilityByParticipant[share.participantId]
          ? {requestEntryCapability: metadata.requestCapabilityByParticipant[share.participantId]}
          : {}),
        ...(walletPayment ? {walletPayment: structuredClone(walletPayment)} : {}),
      };
    }
  }

  if (canonical.closed) {
    const groupSplits = Object.values(state.splits).filter(split => state.expenses[split.expenseId]?.groupId === canonical.groupId);
    state.savedRecords[canonical.closed.recordId] = {
      id: canonical.closed.recordId,
      groupId: canonical.groupId,
      dateSaved: state.groups[canonical.groupId].closedAt ?? new Date(0).toISOString(),
      totalAmount: moneyToDisplayNumber(canonical.closed.total),
      openAmount: 0,
      splits: structuredClone(groupSplits),
    };
  }
  return state;
}

function canonicalShareForLegacySplit(record: PersistedAuthorityGroupV1, splitId: string): string {
  for (const [expenseId, metadata] of Object.entries(record.expenses)) {
    const participantId = Object.entries(metadata.splitIdByParticipant).find(([, value]) => value === splitId)?.[0];
    if (participantId) return canonicalShareId(expenseId, participantId);
  }
  throw new Error('The payment item is not part of the signed authority journal.');
}

function legacyStatus(status: CanonicalGroupStateV1['shares'][string]['status'], payerOwnShare: boolean): AppState['splits'][string]['status'] {
  if (payerOwnShare) return 'confirmed';
  if (status === 'requested') return 'request_sent';
  if (status === 'received' || status === 'waived') return 'confirmed';
  if (status === 'cleared') return 'cleared';
  if (status === 'marked_paid') return 'marked_paid';
  return 'open';
}

function emptyCanonicalState(groupId: string): CanonicalGroupStateV1 {
  return {v: 1, groupId, name: '', mode: 'normal_pot', version: 0, currentEventId: null, organizerId: '', members: {}, expenses: {}, shares: {}, closed: null, successorRecords: [], eventIds: []};
}

export function createCanonicalAuthorityEventEnvelope(event: CanonicalEventV1): CanonicalAuthorityEventEnvelopeV1 {
  const envelope: CanonicalAuthorityEventEnvelopeV1 = {v: 1, kind: 'chopdot-authority-event', event: structuredClone(event)};
  assertCanonicalAuthorityEventEnvelope(envelope);
  return envelope;
}

export function assertCanonicalAuthorityEventEnvelope(value: unknown): asserts value is CanonicalAuthorityEventEnvelopeV1 {
  if (!value || typeof value !== 'object') throw new Error('Canonical authority event envelope is invalid.');
  const row = value as Partial<CanonicalAuthorityEventEnvelopeV1>;
  const event = row.event as Partial<CanonicalEventV1> | undefined;
  if (
    row.v !== 1 || row.kind !== 'chopdot-authority-event' || !event
    || event.v !== 1 || typeof event.eventId !== 'string' || !event.eventId
    || typeof event.groupId !== 'string' || !event.groupId
    || typeof event.signatureHex !== 'string' || !/^0x[0-9a-f]+$/iu.test(event.signatureHex)
  ) throw new Error('Canonical authority event envelope is invalid.');
}

export function isCanonicalAuthorityEventEnvelope(value: unknown): value is CanonicalAuthorityEventEnvelopeV1 {
  try { assertCanonicalAuthorityEventEnvelope(value); return true; } catch { return false; }
}

export function isCanonicalAuthorityEventAck(value: unknown): value is CanonicalAuthorityEventAckV1 {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<CanonicalAuthorityEventAckV1>;
  return row.v === 1 && row.kind === 'chopdot-authority-ack'
    && typeof row.groupId === 'string' && Boolean(row.groupId)
    && typeof row.eventId === 'string' && Boolean(row.eventId)
    && typeof row.acknowledgingParticipantId === 'string' && Boolean(row.acknowledgingParticipantId)
    && typeof row.occurredAt === 'string' && !Number.isNaN(Date.parse(row.occurredAt));
}

function acceptedGrantMatches(grant: MembershipGrant, groupId: string, participantId: string, publicKeyHex: string): boolean {
  return grant.groupId === groupId
    && grant.participantId === participantId
    && grant.role === 'member'
    && grant.keyVersion >= 1
    && Boolean(grant.invitationId.trim())
    && Boolean(grant.groupKeyEnvelopeId.trim())
    && !Number.isNaN(Date.parse(grant.acceptedAt))
    && grant.accountPublicKeyHex.toLowerCase() === publicKeyHex.toLowerCase();
}

function sameGrant(left: MembershipGrant, right: MembershipGrant): boolean {
  return left.groupId === right.groupId
    && left.participantId === right.participantId
    && left.accountPublicKeyHex.toLowerCase() === right.accountPublicKeyHex.toLowerCase()
    && left.role === right.role
    && left.acceptedAt === right.acceptedAt
    && left.invitationId === right.invitationId
    && left.keyVersion === right.keyVersion
    && left.groupKeyEnvelopeId === right.groupKeyEnvelopeId;
}

function membershipCommandEvent(command: MembershipAuthorityCommandV1): {
  eventType: CanonicalEventType;
  payload: CanonicalEventV1['payload'];
} {
  if (command.type === 'add') return {eventType: 'MEMBER_ADDED', payload: {member: {
    participantId: command.grant.participantId,
    accountPublicKeyHex: command.grant.accountPublicKeyHex,
    role: command.grant.role,
    active: true,
    acceptedAt: command.grant.acceptedAt,
    invitationId: command.grant.invitationId,
    keyVersion: command.grant.keyVersion,
    groupKeyEnvelopeId: command.grant.groupKeyEnvelopeId,
  }}};
  if (command.type === 'remove') return {eventType: 'MEMBER_REMOVED', payload: {
    participantId: command.participantId,
    nextKeyVersion: command.nextKeyVersion,
    groupKeyEnvelopeIds: structuredClone(command.groupKeyEnvelopeIds),
  }};
  if (command.type === 'roles') return {eventType: 'MEMBERSHIP_ROLES_CHANGED', payload: {
    roles: structuredClone(command.roles),
    nextKeyVersion: command.nextKeyVersion,
    groupKeyEnvelopeIds: structuredClone(command.groupKeyEnvelopeIds),
  }};
  return {eventType: 'GROUP_KEY_ROTATED', payload: {
    nextKeyVersion: command.nextKeyVersion,
    groupKeyEnvelopeIds: structuredClone(command.groupKeyEnvelopeIds),
  }};
}

function sameAddress(left: string, right: string): boolean {
  return /^0x[0-9a-f]{40}$/iu.test(left) && /^0x[0-9a-f]{40}$/iu.test(right) && left.toLowerCase() === right.toLowerCase();
}

function assertRecordShape(record: PersistedAuthorityGroupV1): void {
  if (record.v !== 1 || !record.groupId.trim() || !Array.isArray(record.events) || !record.stateHash || !record.frontierHash || !record.expenses) {
    throw new Error('Authority journal record is invalid.');
  }
  if (record.events.some(event => event.groupId !== record.groupId)) throw new Error('Authority journal mixes group aggregates.');
}

function safeId(value: string): string {
  return value.replace(/[^0-9a-z_-]/giu, '-');
}

function required(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}
