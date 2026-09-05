import type {VerifiedContactRepository} from '../contacts/verifiedContactRepository.ts';
import type {CanonicalEventV1, CanonicalVerifier} from '../core/moneyEventKernel.ts';
import {projectCanonicalEvents} from '../core/moneyEventKernel.ts';
import type {MembershipAuthorityCommandV1} from '../core/authority/productionAuthority.ts';
import type {KeyValueStorage} from '../environment/livePayerSync.ts';
import type {AccountMessageSigner, AccountMessageVerifier} from './groupKeyHandoff.ts';
import type {MembershipGrant} from './membershipLifecycle.ts';
import {
  DurableMembershipKeyEnvelopeRegistry,
  type MembershipKeyEnvelopeRecordV1,
} from './membershipKeyEnvelopeRegistry.ts';
import {
  verifyMembershipDeliveryAcknowledgement,
  type MembershipDeliveryAcknowledgement,
  type MembershipDeliveryAcknowledgementV2,
  type PendingMembershipDelivery,
} from './membershipDeliveryOutbox.ts';
import {
  decodeRecipientBoundBootstrap,
  recipientBoundBootstrapUrl,
  type RecipientBoundBootstrapV2,
} from './recipientBoundBootstrap.ts';
import type {SignedMembershipEventV1} from './signedMembershipEvents.ts';
import {
  TrustedContactInvitationCoordinator,
  type MembershipEventDelivery,
  type PendingAcceptanceVault,
} from './trustedContactInvitationCoordinator.ts';

const INVITATION_STORE_KEY = 'chopdot-production-membership-organizer-invitations-v1';
const ACKNOWLEDGEMENT_STORE_KEY = 'chopdot-production-membership-organizer-acknowledgements-v1';
const RECIPIENT_ENVELOPE_STORE_KEY = 'chopdot-production-membership-recipient-envelopes-v1';
const DEFAULT_INVITATION_LIFETIME_MS = 24 * 60 * 60 * 1_000;
const MAX_INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1_000;

export type ProductionMembershipOrganizerStatus =
  | 'ready_to_invite'
  | 'pending'
  | 'ready_to_grant'
  | 'accepted'
  | 'grant_failed';

export interface OrganizerGroupOriginSource {
  /** Return the accepted, signed GROUP_CREATED event for this exact group. */
  readGroupOrigin(groupId: string): Promise<CanonicalEventV1 | null>;
}

export interface ProductionMembershipOrganizerCoordinatorOptions {
  actor: {
    participantId: string;
    accountPublicKeyHex: string;
    signer: AccountMessageSigner;
  };
  organizerRoots: MembershipGrant[];
  storage: KeyValueStorage;
  verifiedContacts: Pick<VerifiedContactRepository, 'list'>;
  groupOrigins: OrganizerGroupOriginSource;
  /** Sole durable group-key store. The coordinator never creates a parallel secret store. */
  keyEnvelopes: DurableMembershipKeyEnvelopeRegistry;
  delivery: MembershipEventDelivery;
  pendingAcceptances: PendingAcceptanceVault;
  verifyCanonical: CanonicalVerifier;
  verifyAccount?: AccountMessageVerifier;
  baseUrl: string;
  now?: () => string;
}

export interface CreatedProductionMembershipInvitation {
  invitationId: string;
  url: string;
  bootstrap: RecipientBoundBootstrapV2;
  event: SignedMembershipEventV1;
}

export interface ProductionMembershipOrganizerEntryAdapter {
  getStatus(): ProductionMembershipOrganizerStatus;
  subscribe(listener: () => void): () => void;
  createInvitation(route: 'join_link' | 'qr'): Promise<{url: string}>;
  finishAdding(): Promise<void>;
}

interface OrganizerInvitationRecordV1 {
  v: 1;
  requestId: string;
  invitationId: string;
  invitationEventId: string;
  groupId: string;
  contactRecordId: string;
  recipientId: string;
  recipientAccountPublicKeyHex: string;
  roomId: string;
  route: 'join_link' | 'qr';
  createdAt: string;
  expiresAt: string;
  url: string;
}

/**
 * Organizer production boundary.
 *
 * Contact proof only selects an already verified account. It cannot create a
 * membership, grant organizer authority, or authorize a canonical group
 * mutation. The latter becomes available only after the invited account signs
 * acceptance, the organizer signs the encrypted key handoff, and that account
 * signs delivery acknowledgement for that exact grant event.
 */
export class ProductionMembershipOrganizerCoordinator {
  private readonly coordinator: TrustedContactInvitationCoordinator;
  private readonly invitations: OrganizerInvitationStore;
  private readonly acknowledgements: OrganizerAcknowledgementStore;
  private readonly recipientEnvelopes: OrganizerRecipientEnvelopeStore;
  private readonly listeners = new Set<() => void>();
  private readonly accountPublicKeyHex: string;

  constructor(private readonly options: ProductionMembershipOrganizerCoordinatorOptions) {
    this.accountPublicKeyHex = normalizeAccount(options.actor.accountPublicKeyHex);
    if (!options.actor.participantId.trim() || !this.accountPublicKeyHex) {
      throw new Error('A signed organizer Product Account is required.');
    }
    this.invitations = new OrganizerInvitationStore(options.storage, this.accountPublicKeyHex);
    this.acknowledgements = new OrganizerAcknowledgementStore(options.storage, this.accountPublicKeyHex);
    this.recipientEnvelopes = new OrganizerRecipientEnvelopeStore(options.storage, this.accountPublicKeyHex);
    const delivery: MembershipEventDelivery = {
      send: async (roomId, event) => {
        const result = await options.delivery.send(roomId, event);
        if (result.acknowledgement) {
          await this.prepareAcknowledgement(result.acknowledgement);
        }
        return result;
      },
    };
    this.coordinator = new TrustedContactInvitationCoordinator({
      actor: {
        participantId: options.actor.participantId.trim(),
        accountPublicKeyHex: this.accountPublicKeyHex,
        signer: options.actor.signer,
      },
      organizerRoots: options.organizerRoots,
      storage: options.storage,
      // A contact record selects a recipient only in createInvitation below.
      // Inbound chat metadata is never promoted into contact authority.
      contacts: {async resolve() { return null; }},
      delivery,
      pendingAcceptances: options.pendingAcceptances,
      protectedKeys: {async save() { throw new Error('Organizer entry cannot receive member group access.'); }},
      verifier: options.verifyAccount,
    });
  }

  get state() {
    return this.coordinator.state;
  }

  async restore(now = this.now()): Promise<void> {
    await this.coordinator.restore(now);
    await this.reconcileDurableDeliveryAcknowledgements();
    await this.validateStoredAcknowledgements();
    await this.validateImportedRecipientEnvelopes();
    this.notify();
  }

  async createInvitation(input: {
    requestId: string;
    contactRecordId: string;
    roomId: string;
    groupId: string;
    route: 'join_link' | 'qr';
    expiresAt?: string;
  }): Promise<CreatedProductionMembershipInvitation> {
    const requestId = safeId(required(input.requestId, 'Invitation request identifier is required.'));
    const existing = this.invitations.findByRequest(requestId);
    if (existing) {
      this.assertSameInvitationRequest(existing, input);
      const event = this.coordinator.state.events[existing.invitationEventId];
      if (!event || event.event.type !== 'INVITATION_CREATED') throw new Error('Stored invitation proof is incomplete.');
      const bootstrap = bootstrapFromStoredUrl(existing.url);
      return {invitationId: existing.invitationId, url: existing.url, bootstrap, event};
    }

    const groupId = required(input.groupId, 'Group is required.');
    const roomId = required(input.roomId, 'Choose a conversation first.');
    const contactRecordId = required(input.contactRecordId, 'Choose a verified contact first.');
    const contact = (await this.options.verifiedContacts.list(this.accountPublicKeyHex))
      .find(record => record.recordId === contactRecordId);
    if (
      !contact
      || contact.localParticipantId !== this.options.actor.participantId.trim()
      || normalizeAccount(contact.localAccountPublicKeyHex) !== this.accountPublicKeyHex
      || !contact.remoteParticipantId.trim()
      || !normalizeAccount(contact.remoteAccountPublicKeyHex)
    ) throw new Error('Choose a verified contact before inviting this person.');

    const organizerRoot = this.organizerRoot(groupId);
    const origin = await this.options.groupOrigins.readGroupOrigin(groupId);
    await this.assertOrganizerOrigin(origin, organizerRoot);
    const createdAt = this.now();
    const expiresAt = canonicalExpiry(input.expiresAt, createdAt);
    const invitationId = safeId(`invite-${requestId}`);
    const invitationEventId = safeId(`invite-event-${requestId}`);
    const created = await this.coordinator.createOriginBoundBootstrapInvitation({
      returnRoomId: roomId,
      recipientId: contact.remoteParticipantId,
      recipientAccountPublicKeyHex: contact.remoteAccountPublicKeyHex,
      groupId,
      invitationId,
      eventId: invitationEventId,
      role: 'member',
      route: input.route,
      createdAt,
      expiresAt,
      organizerGroupEvent: origin!,
    });
    const url = recipientBoundBootstrapUrl(this.options.baseUrl, created.bootstrap);
    this.invitations.remember({
      v: 1,
      requestId,
      invitationId,
      invitationEventId,
      groupId,
      contactRecordId,
      recipientId: contact.remoteParticipantId,
      recipientAccountPublicKeyHex: normalizeAccount(contact.remoteAccountPublicKeyHex),
      roomId,
      route: input.route,
      createdAt,
      expiresAt,
      url,
    });
    this.notify();
    return {invitationId, url, bootstrap: created.bootstrap, event: created.event};
  }

  async receive(input: {roomId: string; peer: string; event: SignedMembershipEventV1; now?: string}) {
    const result = await this.coordinator.receive(input);
    this.notify();
    return result;
  }

  async finishAdding(invitationIdValue: string): Promise<{
    grantEvent: SignedMembershipEventV1;
    deliveryPending: boolean;
    command: MembershipAuthorityCommandV1 | null;
  }> {
    const invitation = this.requireInvitation(invitationIdValue);
    const lifecycleInvitation = this.coordinator.state.lifecycle.invitations[invitation.invitationId];
    const acceptance = this.coordinator.state.pendingAcceptances[invitation.invitationId];
    if (!lifecycleInvitation || !acceptance) throw new Error('Wait for this person to accept the invitation.');
    if (Date.parse(this.now()) >= Date.parse(lifecycleInvitation.expiresAt)) throw new Error('This invitation has expired.');
    const root = this.organizerRoot(invitation.groupId);
    const groupKey = await this.openCurrentOrganizerEnvelope(invitation.groupId);
    let grantEvent: SignedMembershipEventV1;
    try {
      grantEvent = await this.coordinator.grantAcceptedInvitation({
        invitationId: invitation.invitationId,
        eventId: safeId(`grant-event-${invitation.invitationId}`),
        groupKeyEnvelopeId: safeId(`grant-envelope-${invitation.invitationId}-v${root.keyVersion}`),
        keyVersion: root.keyVersion,
        groupKey,
        createdAt: this.now(),
        expiresAt: lifecycleInvitation.expiresAt,
      });
    } finally {
      groupKey.fill(0);
    }
    await this.retryDeliveries();
    const command = await this.membershipAuthorityCommand(invitation.invitationId);
    this.notify();
    return {grantEvent, deliveryPending: this.coordinator.isDeliveryPending(grantEvent.eventId), command};
  }

  async retryDeliveries(): Promise<{delivered: string[]; pending: string[]}> {
    try {
      return await this.coordinator.flush();
    } finally {
      await this.reconcileDurableDeliveryAcknowledgements();
      this.notify();
    }
  }

  async acknowledgeDelivery(acknowledgement: MembershipDeliveryAcknowledgement): Promise<boolean> {
    await this.prepareAcknowledgement(acknowledgement);
    try {
      return await this.coordinator.acknowledgeDelivery(acknowledgement);
    } finally {
      await this.reconcileDurableDeliveryAcknowledgements();
      this.notify();
    }
  }

  async membershipAuthorityCommand(invitationIdValue: string): Promise<MembershipAuthorityCommandV1 | null> {
    const invitation = this.requireInvitation(invitationIdValue);
    const grantEvent = this.grantEvent(invitation.invitationId);
    const grant = this.coordinator.state.lifecycle.memberships[`${invitation.groupId}:${invitation.recipientId}`];
    if (!grantEvent || !grant || grant.role !== 'member' || grant.invitationId !== invitation.invitationId) return null;
    const acknowledgement = this.acknowledgements.get(deliveryId(invitation.roomId, grantEvent.eventId));
    if (!acknowledgement || acknowledgement.v !== 2
      || !await this.verifyAcknowledgement(invitation, grantEvent, acknowledgement)) return null;
    const recipientRecord = this.exportAcknowledgedMemberEnvelope(invitation.invitationId);
    if (!recipientRecord
      || stableSerialize(recipientRecord) !== stableSerialize(acknowledgement.groupKeyEnvelopeRecord)
      || !await this.options.keyEnvelopes.resolve({
      groupId: invitation.groupId,
      keyVersion: recipientRecord.binding.keyVersion,
      binding: recipientRecord.binding,
    })) return null;
    return {groupId: invitation.groupId, type: 'add', grant: {
      ...structuredClone(grant),
      keyVersion: recipientRecord.binding.keyVersion,
      groupKeyEnvelopeId: recipientRecord.binding.groupKeyEnvelopeId,
    }};
  }

  /**
   * Import the invited account's signed, account-opened envelope record after
   * it receives the handoff. This record, not the transport handoff identifier,
   * is the access binding placed in canonical MEMBER_ADDED.
   */
  async importAcknowledgedMemberEnvelope(
    invitationIdValue: string,
    record: MembershipKeyEnvelopeRecordV1,
  ): Promise<void> {
    const invitation = this.requireInvitation(invitationIdValue);
    if (record.binding.participantId !== invitation.recipientId
      || normalizeAccount(record.binding.recipientAccountPublicKeyHex) !== invitation.recipientAccountPublicKeyHex
      || record.envelope.groupId !== invitation.groupId
      || record.binding.keyVersion !== this.organizerRoot(invitation.groupId).keyVersion) {
      throw new Error('Acknowledged member envelope does not match this invitation.');
    }
    await this.options.keyEnvelopes.importAcknowledged(record);
    if (!await this.options.keyEnvelopes.resolve({
      groupId: invitation.groupId,
      keyVersion: record.binding.keyVersion,
      binding: record.binding,
    })) throw new Error('Acknowledged member envelope could not be verified.');
    this.recipientEnvelopes.bind(invitation.invitationId, record.binding.groupKeyEnvelopeId);
    this.notify();
  }

  /** Exact encrypted recipient record for recovery/checkpoint composition; contains no plaintext group key. */
  exportAcknowledgedMemberEnvelope(invitationIdValue: string): MembershipKeyEnvelopeRecordV1 | null {
    const invitationId = required(invitationIdValue, 'Invitation is required.');
    const envelopeId = this.recipientEnvelopes.get(invitationId);
    return envelopeId ? this.options.keyEnvelopes.export(envelopeId) : null;
  }

  /** Exact current organizer envelope for recovery export; contains ciphertext and signed acknowledgement only. */
  exportCurrentOrganizerEnvelope(groupIdValue: string): MembershipKeyEnvelopeRecordV1 | null {
    const root = this.organizerRoot(required(groupIdValue, 'Group is required.'));
    return this.options.keyEnvelopes.export(root.groupKeyEnvelopeId);
  }

  /** Account-bound opening seam used for handoff/recovery; only the current organizer account can open it. */
  async openCurrentOrganizerEnvelope(groupIdValue: string): Promise<Uint8Array> {
    const root = this.organizerRoot(required(groupIdValue, 'Group is required.'));
    const groupKey = await this.options.keyEnvelopes.open({
      participantId: root.participantId,
      recipientAccountPublicKeyHex: root.accountPublicKeyHex,
      keyVersion: root.keyVersion,
      groupKeyEnvelopeId: root.groupKeyEnvelopeId,
    });
    if (!(groupKey instanceof Uint8Array) || groupKey.byteLength !== 32) {
      throw new Error('Protected group access is unavailable on this device.');
    }
    return groupKey;
  }

  /** AcceptedMembershipGrantResolver seam for ProductionAuthority. */
  async resolve(groupId: string, participantId: string): Promise<MembershipGrant | null> {
    const invitation = this.invitations.list().find(record =>
      record.groupId === groupId.trim() && record.recipientId === participantId.trim());
    if (!invitation) return null;
    const command = await this.membershipAuthorityCommand(invitation.invitationId);
    return command?.type === 'add' ? command.grant : null;
  }

  /** MembershipAuthorityMutationResolver seam for ProductionAuthority. */
  async authorize(command: MembershipAuthorityCommandV1, actorId: string): Promise<boolean> {
    if (command.type !== 'add' || actorId.trim() !== this.options.actor.participantId.trim()) return false;
    const expected = await this.membershipAuthorityCommand(command.grant.invitationId);
    return Boolean(expected && stableSerialize(expected) === stableSerialize(command));
  }

  status(invitationId?: string): ProductionMembershipOrganizerStatus {
    const record = invitationId ? this.invitations.get(invitationId) : this.invitations.list().at(-1) ?? null;
    if (!record) return 'ready_to_invite';
    const invitation = this.coordinator.state.lifecycle.invitations[record.invitationId];
    if (!invitation || ['declined', 'revoked', 'expired'].includes(invitation.status)) return 'grant_failed';
    const grantEvent = this.grantEvent(record.invitationId);
    if (grantEvent) {
      return this.acknowledgements.get(deliveryId(record.roomId, grantEvent.eventId))
        && this.recipientEnvelopes.get(record.invitationId) ? 'accepted' : 'pending';
    }
    if (this.coordinator.state.pendingAcceptances[record.invitationId]) return 'ready_to_grant';
    return 'pending';
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  createEntryAdapter(input: {
    requestId: string;
    contactRecordId: string;
    roomId: string;
    groupId: string;
    expiresAt?: string;
  }): ProductionMembershipOrganizerEntryAdapter {
    let invitationId = this.invitations.findByRequest(safeId(input.requestId))?.invitationId ?? '';
    return {
      getStatus: () => this.status(invitationId || undefined),
      subscribe: listener => this.subscribe(listener),
      createInvitation: async route => {
        const result = await this.createInvitation({...input, route});
        invitationId = result.invitationId;
        return {url: result.url};
      },
      finishAdding: async () => {
        if (!invitationId) throw new Error('Create the invitation first.');
        await this.finishAdding(invitationId);
      },
    };
  }

  private now(): string {
    const now = this.options.now?.() ?? new Date().toISOString();
    if (Number.isNaN(Date.parse(now))) throw new Error('Current time is invalid.');
    return new Date(now).toISOString();
  }

  private organizerRoot(groupId: string): MembershipGrant {
    const root = this.options.organizerRoots.find(candidate =>
      candidate.groupId === groupId
      && candidate.participantId === this.options.actor.participantId.trim()
      && normalizeAccount(candidate.accountPublicKeyHex) === this.accountPublicKeyHex
      && candidate.role === 'organizer');
    if (!root) throw new Error('Only the accepted group organizer can invite a member.');
    return root;
  }

  private async assertOrganizerOrigin(origin: CanonicalEventV1 | null, root: MembershipGrant): Promise<void> {
    if (!origin || origin.eventType !== 'GROUP_CREATED' || origin.groupId !== root.groupId
      || origin.actorId !== root.participantId || normalizeAccount(origin.actorAccountPublicKeyHex) !== this.accountPublicKeyHex) {
      throw new Error('The signed group origin is unavailable.');
    }
    let projection: Awaited<ReturnType<typeof projectCanonicalEvents>>;
    try {
      projection = await projectCanonicalEvents([origin], this.options.verifyCanonical);
    } catch {
      throw new Error('The signed group origin could not be verified.');
    }
    if (projection.rejected.length || projection.conflicts.length || projection.state.version !== 1
      || projection.state.currentEventId !== origin.eventId || projection.state.organizerId !== root.participantId) {
      throw new Error('The signed group origin could not be verified.');
    }
  }

  private async rememberVerifiedAcknowledgement(value: MembershipDeliveryAcknowledgement): Promise<void> {
    const invitation = this.invitations.list().find(record => deliveryId(record.roomId, value.eventId) === value.deliveryId);
    const event = invitation ? this.coordinator.state.events[value.eventId] : null;
    if (!invitation || !event || !await this.verifyAcknowledgement(invitation, event, value)) {
      throw new Error('Membership delivery acknowledgement is invalid.');
    }
    this.acknowledgements.remember(value);
  }

  private async reconcileDurableDeliveryAcknowledgements(): Promise<void> {
    for (const acknowledgement of this.coordinator.deliveryAcknowledgements()) {
      await this.prepareAcknowledgement(acknowledgement);
      await this.rememberVerifiedAcknowledgement(acknowledgement);
    }
  }

  private async prepareAcknowledgement(value: MembershipDeliveryAcknowledgement): Promise<void> {
    const invitation = this.invitations.list().find(record => deliveryId(record.roomId, value.eventId) === value.deliveryId);
    const event = invitation ? this.coordinator.state.events[value.eventId] : null;
    if (!invitation || !event || !await this.verifyAcknowledgement(invitation, event, value)) {
      throw new Error('Membership delivery acknowledgement is invalid.');
    }
    if (event.event.type === 'MEMBERSHIP_GRANTED') {
      if (value.v !== 2) throw new Error('Membership grant acknowledgement is missing durable group access.');
      this.assertV2GrantContext(invitation, event, value);
      await this.importAcknowledgedMemberEnvelope(invitation.invitationId, value.groupKeyEnvelopeRecord);
    }
  }

  private assertV2GrantContext(
    invitation: OrganizerInvitationRecordV1,
    event: SignedMembershipEventV1,
    acknowledgement: MembershipDeliveryAcknowledgementV2,
  ): void {
    if (event.event.type !== 'MEMBERSHIP_GRANTED'
      || acknowledgement.eventId !== event.eventId
      || acknowledgement.invitationId !== invitation.invitationId
      || acknowledgement.groupId !== invitation.groupId
      || acknowledgement.recipientId !== invitation.recipientId
      || acknowledgement.recipientAccountPublicKeyHex !== invitation.recipientAccountPublicKeyHex
      || acknowledgement.keyVersion !== event.event.handoff.keyVersion
      || event.event.handoff.invitationId !== invitation.invitationId
      || event.event.handoff.groupId !== invitation.groupId
      || event.event.handoff.recipientId !== invitation.recipientId
      || event.event.handoff.recipientAccountPublicKeyHex !== invitation.recipientAccountPublicKeyHex) {
      throw new Error('Membership grant acknowledgement does not match this invitation.');
    }
  }

  private async verifyAcknowledgement(
    invitation: OrganizerInvitationRecordV1,
    event: SignedMembershipEventV1,
    acknowledgement: MembershipDeliveryAcknowledgement,
  ): Promise<boolean> {
    const pending: PendingMembershipDelivery = {
      deliveryId: deliveryId(invitation.roomId, event.eventId),
      target: {
        kind: 'chat_room',
        roomId: invitation.roomId,
        recipientId: invitation.recipientId,
        recipientAccountPublicKeyHex: invitation.recipientAccountPublicKeyHex,
      },
      event,
      queuedAt: event.occurredAt,
    };
    return verifyMembershipDeliveryAcknowledgement(pending, acknowledgement, this.options.verifyAccount);
  }

  private async validateStoredAcknowledgements(): Promise<void> {
    for (const acknowledgement of this.acknowledgements.list()) {
      const invitation = this.invitations.list().find(record => deliveryId(record.roomId, acknowledgement.eventId) === acknowledgement.deliveryId);
      const event = invitation ? this.coordinator.state.events[acknowledgement.eventId] : null;
      if (!invitation || !event || !await this.verifyAcknowledgement(invitation, event, acknowledgement)) {
        throw new Error('Stored membership delivery acknowledgements are corrupt.');
      }
    }
  }

  private async validateImportedRecipientEnvelopes(): Promise<void> {
    for (const [invitationId, envelopeId] of this.recipientEnvelopes.entries()) {
      const invitation = this.invitations.get(invitationId);
      const record = this.options.keyEnvelopes.export(envelopeId);
      if (!invitation || !record || record.binding.participantId !== invitation.recipientId
        || record.binding.recipientAccountPublicKeyHex !== invitation.recipientAccountPublicKeyHex
        || !await this.options.keyEnvelopes.resolve({
          groupId: invitation.groupId,
          keyVersion: record.binding.keyVersion,
          binding: record.binding,
        })) throw new Error('Stored acknowledged member envelopes are corrupt.');
    }
  }

  private grantEvent(invitationId: string): SignedMembershipEventV1 | null {
    return Object.values(this.coordinator.state.events).find(event =>
      event.event.type === 'MEMBERSHIP_GRANTED' && event.event.handoff.invitationId === invitationId) ?? null;
  }

  private requireInvitation(invitationIdValue: string): OrganizerInvitationRecordV1 {
    const invitation = this.invitations.get(required(invitationIdValue, 'Invitation is required.'));
    if (!invitation) throw new Error('Organizer invitation is unavailable on this device.');
    return invitation;
  }

  private assertSameInvitationRequest(
    existing: OrganizerInvitationRecordV1,
    input: {contactRecordId: string; roomId: string; groupId: string; route: 'join_link' | 'qr'},
  ): void {
    if (existing.contactRecordId !== input.contactRecordId.trim()
      || existing.roomId !== input.roomId.trim()
      || existing.groupId !== input.groupId.trim()
      || existing.route !== input.route) {
      throw new Error('Invitation request identifier is already in use.');
    }
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }
}

class OrganizerInvitationStore {
  constructor(private readonly storage: KeyValueStorage, private readonly accountPublicKeyHex: string) {}

  remember(value: OrganizerInvitationRecordV1): void {
    const record = canonicalInvitationRecord(value);
    const rows = this.list();
    const existing = rows.find(candidate => candidate.requestId === record.requestId || candidate.invitationId === record.invitationId);
    if (existing) {
      if (stableSerialize(existing) !== stableSerialize(record)) throw new Error('Invitation identifier is already in use.');
      return;
    }
    this.write([...rows, record]);
  }

  get(invitationId: string): OrganizerInvitationRecordV1 | null {
    return this.list().find(record => record.invitationId === invitationId.trim()) ?? null;
  }

  findByRequest(requestId: string): OrganizerInvitationRecordV1 | null {
    return this.list().find(record => record.requestId === requestId.trim()) ?? null;
  }

  list(): OrganizerInvitationRecordV1[] {
    const value = this.storage.read(this.key());
    if (!value) return [];
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed)) throw new Error('not an array');
      return parsed.map(candidate => canonicalInvitationRecord(candidate as OrganizerInvitationRecordV1));
    } catch {
      throw new Error('Organizer invitation records are corrupt.');
    }
  }

  private write(rows: OrganizerInvitationRecordV1[]): void {
    this.storage.write(this.key(), JSON.stringify(rows));
    if (this.list().length !== rows.length) throw new Error('Organizer invitation could not be stored safely.');
  }

  private key(): string { return `${INVITATION_STORE_KEY}:${this.accountPublicKeyHex}`; }
}

class OrganizerAcknowledgementStore {
  constructor(private readonly storage: KeyValueStorage, private readonly accountPublicKeyHex: string) {}

  remember(value: MembershipDeliveryAcknowledgement): void {
    const rows = this.list();
    const existing = rows.find(candidate => candidate.deliveryId === value.deliveryId);
    if (existing) {
      // Each acknowledgement is verified against the same target/event before
      // reaching this store. A recipient may sign a fresh acknowledgement for
      // an exact delivery retry; retain the first valid receipt idempotently.
      return;
    }
    const serialized = JSON.stringify([...rows, structuredClone(value)]);
    this.storage.write(this.key(), serialized);
    if (this.storage.read(this.key()) !== serialized) {
      throw new Error('Organizer acknowledgement could not be stored safely.');
    }
  }

  get(deliveryIdValue: string): MembershipDeliveryAcknowledgement | null {
    return this.list().find(value => value.deliveryId === deliveryIdValue) ?? null;
  }

  list(): MembershipDeliveryAcknowledgement[] {
    const value = this.storage.read(this.key());
    if (!value) return [];
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed)) throw new Error('not an array');
      return parsed.map(candidate => structuredClone(candidate as MembershipDeliveryAcknowledgement));
    } catch {
      throw new Error('Organizer acknowledgement records are corrupt.');
    }
  }

  private key(): string { return `${ACKNOWLEDGEMENT_STORE_KEY}:${this.accountPublicKeyHex}`; }
}

class OrganizerRecipientEnvelopeStore {
  constructor(private readonly storage: KeyValueStorage, private readonly accountPublicKeyHex: string) {}

  bind(invitationIdValue: string, envelopeIdValue: string): void {
    const invitationId = required(invitationIdValue, 'Invitation is required.');
    const envelopeId = required(envelopeIdValue, 'Group access envelope is required.');
    if (!/^sha256:[0-9a-f]{64}$/u.test(envelopeId)) throw new Error('Group access envelope identifier is invalid.');
    const values = Object.fromEntries(this.entries());
    const existing = values[invitationId];
    if (existing && existing !== envelopeId) throw new Error('Invitation already has another acknowledged group envelope.');
    this.storage.write(this.key(), JSON.stringify({...values, [invitationId]: envelopeId}));
  }

  get(invitationId: string): string | null {
    return Object.fromEntries(this.entries())[invitationId.trim()] ?? null;
  }

  entries(): Array<[string, string]> {
    const value = this.storage.read(this.key());
    if (!value) return [];
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
      return Object.entries(parsed as Record<string, unknown>).map(([invitationId, envelopeId]) => {
        const id = required(invitationId, 'Invalid member envelope binding.');
        if (typeof envelopeId !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(envelopeId)) {
          throw new Error('Invalid member envelope binding.');
        }
        return [id, envelopeId];
      });
    } catch {
      throw new Error('Acknowledged member envelope bindings are corrupt.');
    }
  }

  private key(): string { return `${RECIPIENT_ENVELOPE_STORE_KEY}:${this.accountPublicKeyHex}`; }
}

function canonicalInvitationRecord(value: OrganizerInvitationRecordV1): OrganizerInvitationRecordV1 {
  const record: OrganizerInvitationRecordV1 = {
    v: 1,
    requestId: safeId(required(value.requestId, 'Invalid organizer invitation.')),
    invitationId: safeId(required(value.invitationId, 'Invalid organizer invitation.')),
    invitationEventId: safeId(required(value.invitationEventId, 'Invalid organizer invitation.')),
    groupId: required(value.groupId, 'Invalid organizer invitation.'),
    contactRecordId: required(value.contactRecordId, 'Invalid organizer invitation.'),
    recipientId: required(value.recipientId, 'Invalid organizer invitation.'),
    recipientAccountPublicKeyHex: normalizeAccount(value.recipientAccountPublicKeyHex),
    roomId: required(value.roomId, 'Invalid organizer invitation.'),
    route: value.route,
    createdAt: canonicalTimestamp(value.createdAt),
    expiresAt: canonicalTimestamp(value.expiresAt),
    url: required(value.url, 'Invalid organizer invitation.'),
  };
  if (value.v !== 1 || !record.recipientAccountPublicKeyHex || !['join_link', 'qr'].includes(record.route)
    || Date.parse(record.expiresAt) <= Date.parse(record.createdAt)) throw new Error('Invalid organizer invitation.');
  const bootstrap = bootstrapFromStoredUrl(record.url);
  if (bootstrap.invitationEvent.event.type !== 'INVITATION_CREATED'
    || bootstrap.invitationEvent.eventId !== record.invitationEventId
    || bootstrap.invitationEvent.event.invitation.invitationId !== record.invitationId
    || bootstrap.invitationEvent.event.invitation.groupId !== record.groupId
    || bootstrap.invitationEvent.event.invitation.inviteeId !== record.recipientId
    || bootstrap.invitationEvent.event.invitation.inviteeAccountPublicKeyHex !== record.recipientAccountPublicKeyHex) {
    throw new Error('Invalid organizer invitation.');
  }
  return record;
}

function bootstrapFromStoredUrl(value: string): RecipientBoundBootstrapV2 {
  const url = new URL(value);
  const encoded = new URLSearchParams(url.hash.replace(/^#/u, '')).get('chopdot-invite');
  if (!encoded) throw new Error('Stored invitation bootstrap is invalid.');
  const payload = decodeRecipientBoundBootstrap(decodeURIComponent(encoded));
  if (payload.v !== 2) throw new Error('Stored invitation is not origin-bound.');
  return payload;
}

function canonicalExpiry(value: string | undefined, createdAt: string): string {
  const created = Date.parse(createdAt);
  const expires = value ? Date.parse(value) : created + DEFAULT_INVITATION_LIFETIME_MS;
  if (!Number.isFinite(expires) || expires <= created || expires - created > MAX_INVITATION_LIFETIME_MS) {
    throw new Error('Invitation expiry must be within seven days.');
  }
  return new Date(expires).toISOString();
}

function canonicalTimestamp(value: string): string {
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error('Invalid timestamp.');
  return new Date(milliseconds).toISOString();
}

function deliveryId(roomId: string, eventId: string): string {
  return `chat_room:${roomId.trim()}:${eventId.trim()}`;
}

function normalizeAccount(value: string): string {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return /^0x[0-9a-f]{64}$/u.test(normalized) ? normalized : '';
}

function required(value: string, message: string): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) throw new Error(message);
  return normalized;
}

function safeId(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^0-9a-z_-]/gu, '-').replace(/-+/gu, '-');
  if (!normalized) throw new Error('Identifier is invalid.');
  return normalized;
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (value && typeof value === 'object') {
    const row = value as Record<string, unknown>;
    return `{${Object.keys(row).sort().map(key => `${JSON.stringify(key)}:${stableSerialize(row[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
