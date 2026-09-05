import type {MembershipAuthorityCommandV1} from '../core/authority/productionAuthority.ts';
import type {CanonicalGroupStateV1} from '../core/moneyEventKernel.ts';
import type {KeyValueStorage} from '../environment/livePayerSync.ts';
import {
  createGroupKeyHandoff,
  createMembershipAcceptance,
  openGroupKeyHandoff,
  verifyMembershipAcceptance,
  verifyProductAccountSignature,
  type AccountMessageSigner,
  type AccountMessageVerifier,
  type GroupKeyHandoffV1,
  type MembershipAcceptanceV1,
} from './groupKeyHandoff.ts';
import {
  membershipKeyEnvelopeRecordDigest,
  type DurableMembershipKeyEnvelopeRegistry,
  type MembershipKeyEnvelopeRecordV1,
} from './membershipKeyEnvelopeRegistry.ts';
import {createSignedMembershipEvent} from './signedMembershipEvents.ts';
import type {PendingAcceptanceVault} from './trustedContactInvitationCoordinator.ts';

const PROPOSAL_DOMAIN = 'chopdot:membership-removal-proposal:v1';
const ACK_DOMAIN = 'chopdot:membership-removal-key-ack:v1';
const DEFAULT_EXPIRY_MS = 24 * 60 * 60 * 1_000;

export interface MembershipRemovalProposalV1 {
  v: 1;
  kind: 'chopdot.membership-removal-proposal.v1';
  proposalId: string;
  groupId: string;
  participantId: string;
  organizerId: string;
  organizerAccountPublicKeyHex: string;
  expectedVersion: number;
  expectedEventId: string;
  currentKeyVersion: number;
  nextKeyVersion: number;
  remaining: Array<{participantId: string; accountPublicKeyHex: string; role: 'organizer' | 'member'}>;
  createdAt: string;
  expiresAt: string;
  signatureHex: string;
}

export interface MembershipRemovalAcceptanceV1 {
  v: 1;
  kind: 'chopdot.membership-removal-acceptance.v1';
  proposalId: string;
  acceptance: MembershipAcceptanceV1;
}

export interface MembershipRemovalHandoffV1 {
  v: 1;
  kind: 'chopdot.membership-removal-handoff.v1';
  proposalId: string;
  handoff: GroupKeyHandoffV1;
}

export interface MembershipRemovalKeyAcknowledgementV1 {
  v: 1;
  kind: 'chopdot.membership-removal-key-ack.v1';
  proposalId: string;
  groupId: string;
  participantId: string;
  recipientAccountPublicKeyHex: string;
  nextKeyVersion: number;
  recordDigest: string;
  record: MembershipKeyEnvelopeRecordV1;
  acknowledgedAt: string;
  signatureHex: string;
}

export type MembershipRemovalMessageV1 =
  | MembershipRemovalProposalV1
  | MembershipRemovalAcceptanceV1
  | MembershipRemovalHandoffV1
  | MembershipRemovalKeyAcknowledgementV1;

interface RemovalRecordV1 {
  v: 1;
  roomId: string;
  proposal: MembershipRemovalProposalV1;
  organizerEnvelopeId?: string;
  acceptances: Record<string, MembershipAcceptanceV1>;
  handoffs: Record<string, GroupKeyHandoffV1>;
  acknowledgements: Record<string, MembershipRemovalKeyAcknowledgementV1>;
}

export type MembershipRemovalStatus = 'waiting_for_members' | 'ready_to_remove' | 'removed';

/**
 * Multi-party future-key ceremony. No canonical removal command exists until
 * every remaining account has opened, persisted, and signed the exact same
 * next-key version. All persisted handoffs are ciphertext; the next group key
 * exists in plaintext only while wrapping/opening it.
 */
export class MembershipRemovalCoordinator {
  private readonly participantId: string;
  private readonly accountPublicKeyHex: string;
  private readonly storageKey: string;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly options: {
    actor: {participantId: string; accountPublicKeyHex: string; signer: AccountMessageSigner};
    storage: KeyValueStorage;
    keyEnvelopes: DurableMembershipKeyEnvelopeRegistry;
    pendingAcceptances: PendingAcceptanceVault;
    authority: {readCanonicalGroup(groupId: string): Promise<CanonicalGroupStateV1 | null>};
    roomForGroup(groupId: string): string | null;
    delivery: {send(roomId: string, message: MembershipRemovalMessageV1): Promise<unknown>};
    verifier?: AccountMessageVerifier;
    now?: () => string;
  }) {
    this.participantId = required(options.actor.participantId, 'Participant is required.');
    this.accountPublicKeyHex = normalizeAccount(options.actor.accountPublicKeyHex);
    if (!this.accountPublicKeyHex) throw new Error('A Product Account is required for membership removal.');
    this.storageKey = `chopdot-membership-removal-v1:${this.accountPublicKeyHex}`;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async begin(input: {proposalId: string; groupId: string; participantId: string; roomId: string; expiresAt?: string}) {
    const proposalId = safeId(input.proposalId);
    const existing = this.records()[proposalId];
    if (existing) {
      if (existing.proposal.groupId !== input.groupId || existing.proposal.participantId !== input.participantId || existing.roomId !== input.roomId) {
        throw new Error('Removal proposal identifier is already in use.');
      }
      await this.retry(proposalId);
      return structuredClone(existing.proposal);
    }
    const state = await this.requireOrganizerState(input.groupId);
    const target = state.members[required(input.participantId, 'Choose a member to remove.')];
    if (!target || target.active === false || target.role === 'organizer') throw new Error('Choose an active non-organizer member to remove.');
    const roomId = required(input.roomId, 'Choose the group conversation first.');
    if (this.options.roomForGroup(state.groupId) !== roomId) throw new Error('Removal must use the explicitly bound group conversation.');
    const currentKeyVersion = currentKeyVersionOf(state);
    const nextKeyVersion = currentKeyVersion + 1;
    const createdAt = this.now();
    const expiresAt = canonicalTimestamp(input.expiresAt ?? new Date(Date.parse(createdAt) + DEFAULT_EXPIRY_MS).toISOString());
    if (Date.parse(expiresAt) <= Date.parse(createdAt)) throw new Error('Removal proposal expiry is invalid.');
    const remaining = Object.values(state.members)
      .filter(member => member.active !== false && member.participantId !== target.participantId)
      .map(member => ({participantId: member.participantId, accountPublicKeyHex: normalizeAccount(member.accountPublicKeyHex), role: member.role}))
      .sort((left, right) => left.participantId.localeCompare(right.participantId));
    if (remaining.some(member => !member.accountPublicKeyHex)) throw new Error('Every remaining member needs an account-bound identity.');
    const nextKey = crypto.getRandomValues(new Uint8Array(32));
    try {
      const organizerRecord = await this.options.keyEnvelopes.stageRecipientBinding({
        groupId: state.groupId,
        keyVersion: nextKeyVersion,
        groupKey: nextKey,
        acknowledgedAt: createdAt,
        signer: this.options.actor.signer,
      });
      const unsigned = canonicalProposalUnsigned({
        v: 1,
        kind: 'chopdot.membership-removal-proposal.v1',
        proposalId,
        groupId: state.groupId,
        participantId: target.participantId,
        organizerId: this.participantId,
        organizerAccountPublicKeyHex: this.accountPublicKeyHex,
        expectedVersion: state.version,
        expectedEventId: required(state.currentEventId ?? '', 'Current group frontier is unavailable.'),
        currentKeyVersion,
        nextKeyVersion,
        remaining,
        createdAt,
        expiresAt,
      });
      const signature = await this.options.actor.signer.signBytes(signingBytes(PROPOSAL_DOMAIN, unsigned));
      assertSignature(signature);
      const proposal: MembershipRemovalProposalV1 = {...unsigned, signatureHex: bytesToHex(signature)};
      const ownAck = await this.createAcknowledgement(proposal, organizerRecord);
      this.remember({
        v: 1, roomId, proposal, organizerEnvelopeId: organizerRecord.binding.groupKeyEnvelopeId,
        acceptances: {}, handoffs: {}, acknowledgements: {[this.participantId]: ownAck},
      });
      await this.options.delivery.send(roomId, proposal);
      this.notify();
      return structuredClone(proposal);
    } finally {
      nextKey.fill(0);
    }
  }

  async receive(roomIdValue: string, message: MembershipRemovalMessageV1): Promise<void> {
    const roomId = required(roomIdValue, 'Conversation is required.');
    assertMembershipRemovalMessage(message);
    if (message.kind === 'chopdot.membership-removal-proposal.v1') await this.receiveProposal(roomId, message);
    else if (message.kind === 'chopdot.membership-removal-acceptance.v1') await this.receiveAcceptance(roomId, message);
    else if (message.kind === 'chopdot.membership-removal-handoff.v1') await this.receiveHandoff(roomId, message);
    else await this.receiveAcknowledgement(roomId, message);
    this.notify();
  }

  async retry(proposalIdValue: string): Promise<void> {
    const record = this.requireRecord(proposalIdValue);
    this.assertNotExpired(record.proposal);
    if (record.proposal.organizerId === this.participantId) {
      const pending = record.proposal.remaining.filter(member => member.participantId !== this.participantId && !record.acknowledgements[member.participantId]);
      if (pending.some(member => !record.acceptances[member.participantId])) {
        await this.options.delivery.send(record.roomId, record.proposal);
      }
      for (const member of pending) {
        const handoff = record.handoffs[member.participantId];
        if (handoff) await this.options.delivery.send(record.roomId, {v: 1, kind: 'chopdot.membership-removal-handoff.v1', proposalId: record.proposal.proposalId, handoff});
      }
    } else {
      const acknowledgement = record.acknowledgements[this.participantId];
      if (acknowledgement) await this.options.delivery.send(record.roomId, acknowledgement);
      else {
        const acceptance = record.acceptances[this.participantId];
        if (acceptance) await this.options.delivery.send(record.roomId, {v: 1, kind: 'chopdot.membership-removal-acceptance.v1', proposalId: record.proposal.proposalId, acceptance});
      }
    }
  }

  async command(proposalIdValue: string): Promise<MembershipAuthorityCommandV1 | null> {
    const record = this.requireRecord(proposalIdValue);
    this.assertNotExpired(record.proposal);
    if (record.proposal.organizerId !== this.participantId) return null;
    const command = await this.commandFromAcknowledgements(record);
    if (!command) return null;
    const state = await this.options.authority.readCanonicalGroup(record.proposal.groupId);
    return this.commandMatchesState(record, command, state) ? command : null;
  }

  async authorize(command: MembershipAuthorityCommandV1, actorId: string, currentState?: CanonicalGroupStateV1): Promise<boolean> {
    if (command.type !== 'remove' || actorId.trim() !== this.participantId) return false;
    for (const record of Object.values(this.records())) {
      this.assertNotExpired(record.proposal);
      if (record.proposal.organizerId !== this.participantId) continue;
      const expected = await this.commandFromAcknowledgements(record);
      if (!expected || stableSerialize(expected) !== stableSerialize(command)) continue;
      const state = currentState ?? await this.options.authority.readCanonicalGroup(record.proposal.groupId);
      if (this.commandMatchesState(record, expected, state)) return true;
    }
    return false;
  }

  private async commandFromAcknowledgements(
    record: RemovalRecordV1,
  ): Promise<Extract<MembershipAuthorityCommandV1, {type: 'remove'}> | null> {
    const groupKeyEnvelopeIds: Record<string, string> = {};
    for (const member of record.proposal.remaining) {
      const acknowledgement = record.acknowledgements[member.participantId];
      if (!acknowledgement || !await this.verifyAcknowledgement(record.proposal, acknowledgement)) return null;
      if (!await this.options.keyEnvelopes.resolve({
        groupId: record.proposal.groupId,
        keyVersion: record.proposal.nextKeyVersion,
        binding: acknowledgement.record.binding,
      })) return null;
      groupKeyEnvelopeIds[member.participantId] = acknowledgement.record.binding.groupKeyEnvelopeId;
    }
    const command: MembershipAuthorityCommandV1 = {
      groupId: record.proposal.groupId,
      type: 'remove',
      participantId: record.proposal.participantId,
      nextKeyVersion: record.proposal.nextKeyVersion,
      groupKeyEnvelopeIds,
    };
    return command;
  }

  private commandMatchesState(
    record: RemovalRecordV1,
    command: Extract<MembershipAuthorityCommandV1, {type: 'remove'}>,
    state: CanonicalGroupStateV1 | null,
  ): boolean {
    if (!state || state.groupId !== record.proposal.groupId) return false;
    const stillPending = Boolean(state.version === record.proposal.expectedVersion
      && state.currentEventId === record.proposal.expectedEventId
      && currentKeyVersionOf(state) === record.proposal.currentKeyVersion);
    const alreadyAccepted = Boolean(state.members[record.proposal.participantId]?.active === false
      && state.groupKeyVersion === record.proposal.nextKeyVersion
      && record.proposal.remaining.every(member => state.members[member.participantId]?.active !== false
        && state.members[member.participantId]?.keyVersion === record.proposal.nextKeyVersion
        && state.members[member.participantId]?.groupKeyEnvelopeId === command.groupKeyEnvelopeIds[member.participantId]));
    return stillPending || alreadyAccepted;
  }

  status(proposalIdValue: string): {status: MembershipRemovalStatus; acknowledged: number; required: number} {
    const record = this.requireRecord(proposalIdValue);
    const requiredCount = record.proposal.remaining.length;
    const acknowledged = record.proposal.remaining.filter(member => Boolean(record.acknowledgements[member.participantId])).length;
    return {status: acknowledged === requiredCount ? 'ready_to_remove' : 'waiting_for_members', acknowledged, required: requiredCount};
  }

  private async receiveProposal(roomId: string, proposal: MembershipRemovalProposalV1): Promise<void> {
    await this.verifyProposal(proposal, roomId);
    const intended = proposal.remaining.find(member => member.participantId === this.participantId && member.accountPublicKeyHex === this.accountPublicKeyHex);
    if (!intended) return;
    const existing = this.records()[proposal.proposalId];
    if (existing) {
      if (stableSerialize(existing.proposal) !== stableSerialize(proposal) || existing.roomId !== roomId) throw new Error('Removal proposal identifier is already in use.');
      await this.retry(proposal.proposalId);
      return;
    }
    const pending = await createMembershipAcceptance({
      invitationId: rotationInvitationId(proposal.proposalId, this.participantId),
      groupId: proposal.groupId,
      recipientId: this.participantId,
      recipientAccountPublicKeyHex: this.accountPublicKeyHex,
      nonce: `rotation-${crypto.randomUUID()}`,
      expiresAt: proposal.expiresAt,
      signer: this.options.actor.signer,
    });
    const event = await createSignedMembershipEvent({
      eventId: `rotation-accept-${proposal.proposalId}-${this.participantId}`,
      actorId: this.participantId,
      actorAccountPublicKeyHex: this.accountPublicKeyHex,
      occurredAt: this.now(),
      event: {type: 'INVITATION_ACCEPTED', acceptance: pending.acceptance},
      signer: this.options.actor.signer,
    });
    await this.options.pendingAcceptances.save(pending.acceptance.invitationId, {roomId, pending, event});
    this.remember({v: 1, roomId, proposal, acceptances: {[this.participantId]: pending.acceptance}, handoffs: {}, acknowledgements: {}});
    await this.options.delivery.send(roomId, {v: 1, kind: 'chopdot.membership-removal-acceptance.v1', proposalId: proposal.proposalId, acceptance: pending.acceptance});
  }

  private async receiveAcceptance(roomId: string, message: MembershipRemovalAcceptanceV1): Promise<void> {
    const record = this.requireRecord(message.proposalId);
    if (record.roomId !== roomId || record.proposal.organizerId !== this.participantId) throw new Error('Removal acceptance arrived through another conversation.');
    this.assertNotExpired(record.proposal);
    const acceptance = message.acceptance;
    const intended = record.proposal.remaining.find(member => member.participantId === acceptance.recipientId);
    if (!intended || intended.participantId === this.participantId
      || intended.accountPublicKeyHex !== normalizeAccount(acceptance.recipientAccountPublicKeyHex)
      || acceptance.invitationId !== rotationInvitationId(record.proposal.proposalId, intended.participantId)
      || acceptance.groupId !== record.proposal.groupId
      || !await verifyMembershipAcceptance(acceptance, this.verifier())) throw new Error('Removal key acceptance is invalid.');
    const prior = record.acceptances[intended.participantId];
    if (prior && stableSerialize(prior) !== stableSerialize(acceptance)) throw new Error('Removal acceptance conflicts with an earlier response.');
    record.acceptances[intended.participantId] = structuredClone(acceptance);
    let handoff = record.handoffs[intended.participantId];
    if (!handoff) {
      const ownAck = record.acknowledgements[this.participantId];
      if (!ownAck) throw new Error('Organizer next-key access is unavailable.');
      const groupKey = await this.options.keyEnvelopes.open(ownAck.record.binding);
      try {
        handoff = await createGroupKeyHandoff({
          acceptance,
          verifyRecipient: this.verifier(),
          groupKeyEnvelopeId: `rotation-handoff:${record.proposal.proposalId}:${intended.participantId}`,
          organizerId: this.participantId,
          organizerAccountPublicKeyHex: this.accountPublicKeyHex,
          role: intended.role,
          keyVersion: record.proposal.nextKeyVersion,
          groupKey,
          createdAt: this.now(),
          expiresAt: record.proposal.expiresAt,
          signer: this.options.actor.signer,
        });
      } finally {
        groupKey.fill(0);
      }
      record.handoffs[intended.participantId] = handoff;
    }
    this.remember(record);
    await this.options.delivery.send(roomId, {v: 1, kind: 'chopdot.membership-removal-handoff.v1', proposalId: record.proposal.proposalId, handoff});
  }

  private async receiveHandoff(roomId: string, message: MembershipRemovalHandoffV1): Promise<void> {
    const record = this.requireRecord(message.proposalId);
    if (record.roomId !== roomId || record.proposal.organizerId === this.participantId) throw new Error('Removal key handoff arrived through another conversation.');
    this.assertNotExpired(record.proposal);
    const pending = await this.options.pendingAcceptances.load(rotationInvitationId(record.proposal.proposalId, this.participantId));
    if (!pending || message.handoff.recipientId !== this.participantId
      || normalizeAccount(message.handoff.recipientAccountPublicKeyHex) !== this.accountPublicKeyHex
      || message.handoff.keyVersion !== record.proposal.nextKeyVersion) throw new Error('Removal key handoff is not for this account.');
    const groupKey = await openGroupKeyHandoff({
      pending: pending.pending,
      handoff: message.handoff,
      expectedOrganizerAccountPublicKeyHex: record.proposal.organizerAccountPublicKeyHex,
      verifyOrganizer: this.verifier(),
      now: this.now(),
    });
    try {
      const durable = await this.options.keyEnvelopes.stageRecipientBinding({
        groupId: record.proposal.groupId,
        keyVersion: record.proposal.nextKeyVersion,
        groupKey,
        acknowledgedAt: this.now(),
        signer: this.options.actor.signer,
      });
      const acknowledgement = await this.createAcknowledgement(record.proposal, durable);
      record.handoffs[this.participantId] = structuredClone(message.handoff);
      record.acknowledgements[this.participantId] = acknowledgement;
      this.remember(record);
      await this.options.pendingAcceptances.remove(pending.pending.acceptance.invitationId);
      await this.options.delivery.send(roomId, acknowledgement);
    } finally {
      groupKey.fill(0);
    }
  }

  private async receiveAcknowledgement(roomId: string, acknowledgement: MembershipRemovalKeyAcknowledgementV1): Promise<void> {
    const record = this.requireRecord(acknowledgement.proposalId);
    if (record.roomId !== roomId || record.proposal.organizerId !== this.participantId) throw new Error('Removal acknowledgement arrived through another conversation.');
    if (!await this.verifyAcknowledgement(record.proposal, acknowledgement)) throw new Error('Removal key acknowledgement is invalid.');
    const prior = record.acknowledgements[acknowledgement.participantId];
    if (prior && stableSerialize(prior) !== stableSerialize(acknowledgement)) throw new Error('Removal acknowledgement conflicts with an earlier response.');
    await this.options.keyEnvelopes.importAcknowledged(acknowledgement.record);
    record.acknowledgements[acknowledgement.participantId] = structuredClone(acknowledgement);
    this.remember(record);
  }

  private async createAcknowledgement(proposal: MembershipRemovalProposalV1, record: MembershipKeyEnvelopeRecordV1): Promise<MembershipRemovalKeyAcknowledgementV1> {
    const unsigned = canonicalAckUnsigned({
      v: 1,
      kind: 'chopdot.membership-removal-key-ack.v1',
      proposalId: proposal.proposalId,
      groupId: proposal.groupId,
      participantId: this.participantId,
      recipientAccountPublicKeyHex: this.accountPublicKeyHex,
      nextKeyVersion: proposal.nextKeyVersion,
      recordDigest: await membershipKeyEnvelopeRecordDigest(record),
      record: structuredClone(record),
      acknowledgedAt: this.now(),
    });
    const signature = await this.options.actor.signer.signBytes(signingBytes(ACK_DOMAIN, unsigned));
    assertSignature(signature);
    return {...unsigned, signatureHex: bytesToHex(signature)};
  }

  private async verifyAcknowledgement(proposal: MembershipRemovalProposalV1, value: MembershipRemovalKeyAcknowledgementV1): Promise<boolean> {
    try {
      const {signatureHex, ...raw} = value;
      const unsigned = canonicalAckUnsigned(raw);
      const intended = proposal.remaining.find(member => member.participantId === unsigned.participantId);
      return Boolean(intended
        && intended.accountPublicKeyHex === unsigned.recipientAccountPublicKeyHex
        && unsigned.proposalId === proposal.proposalId
        && unsigned.groupId === proposal.groupId
        && unsigned.nextKeyVersion === proposal.nextKeyVersion
        && unsigned.recordDigest === await membershipKeyEnvelopeRecordDigest(unsigned.record)
        && unsigned.record.binding.participantId === intended.participantId
        && unsigned.record.binding.recipientAccountPublicKeyHex === intended.accountPublicKeyHex
        && unsigned.record.binding.keyVersion === proposal.nextKeyVersion
        && await this.verifier()(intended.accountPublicKeyHex, signingBytes(ACK_DOMAIN, unsigned), hexToBytes(signatureHex)));
    } catch {
      return false;
    }
  }

  private async verifyProposal(proposal: MembershipRemovalProposalV1, roomId: string): Promise<void> {
    const {signatureHex, ...raw} = proposal;
    const unsigned = canonicalProposalUnsigned(raw);
    if (!await this.verifier()(unsigned.organizerAccountPublicKeyHex, signingBytes(PROPOSAL_DOMAIN, unsigned), hexToBytes(signatureHex))) {
      throw new Error('Removal proposal signature is invalid.');
    }
    this.assertNotExpired(proposal);
    if (this.options.roomForGroup(proposal.groupId) !== roomId) throw new Error('Removal proposal arrived through another conversation.');
    const state = await this.options.authority.readCanonicalGroup(proposal.groupId);
    const organizer = state?.members[proposal.organizerId];
    const target = state?.members[proposal.participantId];
    if (!state || state.version !== proposal.expectedVersion || state.currentEventId !== proposal.expectedEventId
      || currentKeyVersionOf(state) !== proposal.currentKeyVersion || proposal.nextKeyVersion !== proposal.currentKeyVersion + 1
      || state.organizerId !== proposal.organizerId || !organizer || organizer.active === false || organizer.role !== 'organizer'
      || normalizeAccount(organizer.accountPublicKeyHex) !== proposal.organizerAccountPublicKeyHex
      || !target || target.active === false || target.role === 'organizer') throw new Error('Removal proposal does not match the accepted group frontier.');
    const expected = Object.values(state.members)
      .filter(member => member.active !== false && member.participantId !== proposal.participantId)
      .map(member => ({participantId: member.participantId, accountPublicKeyHex: normalizeAccount(member.accountPublicKeyHex), role: member.role}))
      .sort((left, right) => left.participantId.localeCompare(right.participantId));
    if (stableSerialize(expected) !== stableSerialize(proposal.remaining)) throw new Error('Removal proposal does not bind every remaining member.');
  }

  private async requireOrganizerState(groupIdValue: string): Promise<CanonicalGroupStateV1> {
    const state = await this.options.authority.readCanonicalGroup(required(groupIdValue, 'Group is required.'));
    const organizer = state?.members[this.participantId];
    if (!state || state.organizerId !== this.participantId || !organizer || organizer.active === false || organizer.role !== 'organizer'
      || normalizeAccount(organizer.accountPublicKeyHex) !== this.accountPublicKeyHex) throw new Error('Only the accepted group organizer can remove a member.');
    return state;
  }

  private records(): Record<string, RemovalRecordV1> {
    const raw = this.options.storage.read(this.storageKey);
    if (!raw) return {};
    try {
      const value = JSON.parse(raw) as Record<string, RemovalRecordV1>;
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid');
      return structuredClone(value);
    } catch {
      throw new Error('Membership removal state is corrupt.');
    }
  }

  private requireRecord(proposalIdValue: string): RemovalRecordV1 {
    const record = this.records()[safeId(proposalIdValue)];
    if (!record) throw new Error('Removal proposal is unavailable.');
    assertMembershipRemovalMessage(record.proposal);
    return record;
  }

  private remember(record: RemovalRecordV1): void {
    const records = this.records();
    records[record.proposal.proposalId] = structuredClone(record);
    this.options.storage.write(this.storageKey, stableSerialize(records));
  }

  private assertNotExpired(proposal: MembershipRemovalProposalV1): void {
    if (Date.parse(this.now()) >= Date.parse(proposal.expiresAt)) throw new Error('Removal proposal has expired.');
  }

  private verifier(): AccountMessageVerifier { return this.options.verifier ?? verifyProductAccountSignature; }
  private now(): string { return canonicalTimestamp(this.options.now?.() ?? new Date().toISOString()); }
  private notify(): void { this.listeners.forEach(listener => listener()); }
}

export function assertMembershipRemovalMessage(value: unknown): asserts value is MembershipRemovalMessageV1 {
  if (!value || typeof value !== 'object') throw new Error('Membership removal message is invalid.');
  const row = value as {kind?: string};
  if (row.kind === 'chopdot.membership-removal-proposal.v1') {
    const proposal = value as MembershipRemovalProposalV1;
    const {signatureHex, ...unsigned} = proposal;
    canonicalProposalUnsigned(unsigned);
    canonicalSignature(signatureHex);
    return;
  }
  if (row.kind === 'chopdot.membership-removal-acceptance.v1') {
    const message = value as MembershipRemovalAcceptanceV1;
    if (message.v !== 1 || !safeId(message.proposalId) || message.acceptance?.v !== 1) throw new Error('Membership removal message is invalid.');
    return;
  }
  if (row.kind === 'chopdot.membership-removal-handoff.v1') {
    const message = value as MembershipRemovalHandoffV1;
    if (message.v !== 1 || !safeId(message.proposalId) || message.handoff?.v !== 1) throw new Error('Membership removal message is invalid.');
    return;
  }
  if (row.kind === 'chopdot.membership-removal-key-ack.v1') {
    const message = value as MembershipRemovalKeyAcknowledgementV1;
    const {signatureHex, ...unsigned} = message;
    canonicalAckUnsigned(unsigned);
    canonicalSignature(signatureHex);
    return;
  }
  throw new Error('Membership removal message is invalid.');
}

function canonicalProposalUnsigned(value: Omit<MembershipRemovalProposalV1, 'signatureHex'>): Omit<MembershipRemovalProposalV1, 'signatureHex'> {
  if (value.v !== 1 || value.kind !== 'chopdot.membership-removal-proposal.v1') throw new Error('Removal proposal is invalid.');
  if (!Number.isSafeInteger(value.expectedVersion) || value.expectedVersion < 1
    || !Number.isSafeInteger(value.currentKeyVersion) || value.currentKeyVersion < 1
    || value.nextKeyVersion !== value.currentKeyVersion + 1 || !Array.isArray(value.remaining) || value.remaining.length === 0) throw new Error('Removal proposal is invalid.');
  const remaining = value.remaining.map(member => ({
    participantId: required(member.participantId, 'Remaining participant is invalid.'),
    accountPublicKeyHex: normalizeAccount(member.accountPublicKeyHex),
    role: member.role,
  })).sort((left, right) => left.participantId.localeCompare(right.participantId));
  if (remaining.some(member => !member.accountPublicKeyHex || !['organizer', 'member'].includes(member.role))) throw new Error('Removal proposal is invalid.');
  return {
    v: 1, kind: value.kind, proposalId: safeId(value.proposalId), groupId: required(value.groupId, 'Group is invalid.'),
    participantId: required(value.participantId, 'Removed participant is invalid.'), organizerId: required(value.organizerId, 'Organizer is invalid.'),
    organizerAccountPublicKeyHex: normalizeAccount(value.organizerAccountPublicKeyHex), expectedVersion: value.expectedVersion,
    expectedEventId: required(value.expectedEventId, 'Frontier is invalid.'), currentKeyVersion: value.currentKeyVersion,
    nextKeyVersion: value.nextKeyVersion, remaining, createdAt: canonicalTimestamp(value.createdAt), expiresAt: canonicalTimestamp(value.expiresAt),
  };
}

function canonicalAckUnsigned(value: Omit<MembershipRemovalKeyAcknowledgementV1, 'signatureHex'>): Omit<MembershipRemovalKeyAcknowledgementV1, 'signatureHex'> {
  if (value.v !== 1 || value.kind !== 'chopdot.membership-removal-key-ack.v1' || value.record?.v !== 1
    || !Number.isSafeInteger(value.nextKeyVersion) || value.nextKeyVersion < 2 || !/^0x[0-9a-f]{64}$/u.test(value.recordDigest)) throw new Error('Removal acknowledgement is invalid.');
  return {
    v: 1, kind: value.kind, proposalId: safeId(value.proposalId), groupId: required(value.groupId, 'Group is invalid.'),
    participantId: required(value.participantId, 'Participant is invalid.'), recipientAccountPublicKeyHex: normalizeAccount(value.recipientAccountPublicKeyHex),
    nextKeyVersion: value.nextKeyVersion, recordDigest: value.recordDigest.toLowerCase(), record: structuredClone(value.record), acknowledgedAt: canonicalTimestamp(value.acknowledgedAt),
  };
}

function currentKeyVersionOf(state: CanonicalGroupStateV1): number {
  const value = state.groupKeyVersion ?? state.members[state.organizerId]?.keyVersion;
  if (!Number.isSafeInteger(value) || Number(value) < 1) throw new Error('Current group key version is unavailable.');
  return Number(value);
}

function rotationInvitationId(proposalId: string, participantId: string): string { return `rotation:${safeId(proposalId)}:${safeId(participantId)}`; }
function signingBytes(domain: string, value: unknown): Uint8Array { return new TextEncoder().encode(stableSerialize([domain, value])); }
function safeId(value: string): string { const result = required(value, 'Identifier is required.'); if (!/^[A-Za-z0-9._:@-]{1,240}$/u.test(result)) throw new Error('Identifier is invalid.'); return result; }
function required(value: string, message: string): string { if (typeof value !== 'string' || !value.trim()) throw new Error(message); return value.trim(); }
function normalizeAccount(value: unknown): string { if (typeof value !== 'string') return ''; const result = value.trim().toLowerCase(); return /^0x[0-9a-f]{64}$/u.test(result) ? result : ''; }
function canonicalTimestamp(value: string): string { if (Number.isNaN(Date.parse(value))) throw new Error('Timestamp is invalid.'); return new Date(value).toISOString(); }
function canonicalSignature(value: string): string { if (!/^0x[0-9a-f]{128}$/iu.test(value)) throw new Error('Signature is invalid.'); return value.toLowerCase(); }
function assertSignature(value: Uint8Array): void { if (!(value instanceof Uint8Array) || value.byteLength !== 64) throw new Error('Signature is invalid.'); }
function bytesToHex(value: Uint8Array): string { return `0x${Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('')}`; }
function hexToBytes(value: string): Uint8Array { const normalized = canonicalSignature(value).slice(2); return Uint8Array.from(normalized.match(/.{2}/gu) ?? [], byte => Number.parseInt(byte, 16)); }
function stableSerialize(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (value && typeof value === 'object') { const row = value as Record<string, unknown>; return `{${Object.keys(row).sort().map(key => `${JSON.stringify(key)}:${stableSerialize(row[key])}`).join(',')}}`; }
  throw new Error('Unsupported removal data.');
}
