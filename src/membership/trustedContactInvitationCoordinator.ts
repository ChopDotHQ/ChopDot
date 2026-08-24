import type {KeyValueStorage} from '../environment/livePayerSync.ts';
import type {
  AccountMessageSigner,
  AccountMessageVerifier,
  GroupKeyHandoffV1,
  PendingMembershipAcceptance,
} from './groupKeyHandoff.ts';
import {
  createGroupKeyHandoff,
  createMembershipAcceptance,
  openGroupKeyHandoff,
  verifyProductAccountSignature,
} from './groupKeyHandoff.ts';
import {
  createMembershipDeliveryAcknowledgement,
  MembershipDeliveryOutbox,
  type MembershipDeliveryAcknowledgement,
  type MembershipDeliveryTarget,
} from './membershipDeliveryOutbox.ts';
import type {MembershipGrant, MembershipRole} from './membershipLifecycle.ts';
import {
  createCausalSignedMembershipEvent,
  createSignedMembershipState,
  membershipEventGroupId,
  type MembershipEventV1,
  type MembershipGroupFrontierV1,
  type MembershipKeyEnvelopeBindingV1,
  type MembershipKeyEnvelopeResolver,
  type SignedMembershipEventV1,
  type SignedMembershipState,
  type SignedMembershipTransition,
} from './signedMembershipEvents.ts';
import {
  replaySignedMembershipJournal,
  SignedMembershipEventJournal,
  type MembershipReplayResult,
} from './signedMembershipJournal.ts';
import {
  createOriginBoundRecipientBootstrap,
  createRecipientBoundBootstrap,
  verifyRecipientBoundBootstrap,
  type RecipientBoundBootstrap,
  type RecipientBoundBootstrapV1,
  type RecipientBoundBootstrapV2,
} from './recipientBoundBootstrap.ts';
import type {CanonicalEventV1} from '../core/moneyEventKernel.ts';
import type {MembershipKeyEnvelopeRecordV1} from './membershipKeyEnvelopeRegistry.ts';

const ROUTE_STORAGE_KEY = 'chopdot-trusted-contact-invitation-routes-v1';
const FRONTIER_ANCHOR_STORAGE_KEY = 'chopdot-trusted-membership-frontier-anchors-v1';

export interface TrustedContactAccount {
  contactId: string;
  participantId: string;
  accountPublicKeyHex: string;
}

/**
 * Provider-neutral trust edge. A host room or peer string never supplies
 * account authority; this resolver must return an already trusted binding.
 */
export interface TrustedContactAccountResolver {
  resolve(input: {selectedRoomId: string; contactId: string}): Promise<TrustedContactAccount | null>;
}

/** External trust edge used by a fresh link/QR recipient; never sourced from the URL itself. */
export interface TrustedGroupOrganizerResolver {
  resolve(input: {
    groupId: string;
    organizerId: string;
    organizerAccountPublicKeyHex: string;
  }): Promise<MembershipGrant | null>;
}

export interface MembershipEventDelivery {
  send(roomId: string, event: SignedMembershipEventV1): Promise<{
    messageId: string;
    acknowledgement?: MembershipDeliveryAcknowledgement;
  }>;
}

export interface PendingAcceptanceRecord {
  roomId: string;
  pending: PendingMembershipAcceptance;
  event: SignedMembershipEventV1;
}

/**
 * CryptoKey-aware storage edge. A real implementation should use a storage
 * surface capable of retaining a non-extractable CryptoKey, such as IndexedDB.
 */
export interface PendingAcceptanceVault {
  load(invitationId: string): Promise<PendingAcceptanceRecord | null>;
  save(invitationId: string, record: PendingAcceptanceRecord): Promise<void>;
  remove(invitationId: string): Promise<void>;
}

export interface ProtectedGroupKeySink {
  save(input: {
    groupId: string;
    participantId: string;
    accountPublicKeyHex: string;
    keyVersion: number;
    groupKeyEnvelopeId: string;
    groupKey: Uint8Array;
  }): Promise<void>;
  /**
   * Production sinks should expose an account-bound existence check so a
   * recreated coordinator can distinguish restored access from a lost pending
   * key. Older/test sinks may omit it, in which case restart readiness remains
   * unknown rather than being assumed.
   */
  has?(input: {
    groupId: string;
    participantId: string;
    accountPublicKeyHex: string;
    keyVersion: number;
    groupKeyEnvelopeId: string;
  }): Promise<boolean>;
  /** Durable account-opened envelope used only in a V2 grant acknowledgement. */
  acknowledgedRecord?(input: {
    groupId: string;
    participantId: string;
    accountPublicKeyHex: string;
    keyVersion: number;
  }): Promise<MembershipKeyEnvelopeRecordV1 | null>;
}

export interface TrustedContactInvitationCoordinatorOptions {
  actor: {
    participantId: string;
    accountPublicKeyHex: string;
    signer: AccountMessageSigner;
  };
  organizerRoots: MembershipGrant[];
  storage: KeyValueStorage;
  contacts: TrustedContactAccountResolver;
  trustedOrganizers?: TrustedGroupOrganizerResolver;
  delivery: MembershipEventDelivery;
  pendingAcceptances: PendingAcceptanceVault;
  protectedKeys: ProtectedGroupKeySink;
  /** Required before any removal, role transfer, or future-key rotation. */
  keyEnvelopes?: MembershipKeyEnvelopeResolver;
  verifier?: AccountMessageVerifier;
}

export interface ReceiveMembershipResult extends SignedMembershipTransition {
  groupKeyStored?: boolean;
  membershipActive?: boolean;
  deliveryAcknowledgement?: MembershipDeliveryAcknowledgement;
}

interface InvitationRouteBinding {
  invitationId: string;
  roomId: string;
  remoteParticipantId: string;
  remoteAccountPublicKeyHex: string;
}

export class TrustedContactInvitationCoordinator {
  private readonly journal: SignedMembershipEventJournal;
  private readonly outbox: MembershipDeliveryOutbox;
  private readonly routes: InvitationRouteStore;
  private readonly frontierAnchors: TrustedMembershipFrontierAnchorStore;
  private readonly verifier: AccountMessageVerifier;
  private readonly resolvedOrganizerRoots: MembershipGrant[] = [];
  private readonly readyInvitations = new Set<string>();
  private stateValue: SignedMembershipState;

  constructor(private readonly options: TrustedContactInvitationCoordinatorOptions) {
    const account = normalizeAccountKey(options.actor.accountPublicKeyHex);
    if (!options.actor.participantId.trim() || !account) throw new Error('A signed Product Account is required.');
    this.options.actor.participantId = options.actor.participantId.trim();
    this.options.actor.accountPublicKeyHex = account;
    this.journal = new SignedMembershipEventJournal(options.storage);
    this.outbox = new MembershipDeliveryOutbox(options.storage);
    this.routes = new InvitationRouteStore(options.storage);
    this.frontierAnchors = new TrustedMembershipFrontierAnchorStore(options.storage);
    this.verifier = options.verifier ?? verifyProductAccountSignature;
    this.stateValue = this.initialState();
  }

  get state(): SignedMembershipState {
    return this.stateValue;
  }

  async restore(now = new Date().toISOString()): Promise<MembershipReplayResult & {readyInvitationIds: string[]}> {
    const replay = await replaySignedMembershipJournal(this.initialState(), this.journal, this.verifier, this.options.keyEnvelopes);
    this.stateValue = replay.state;
    await this.restorePendingGroupAccess(now);
    return {...replay, state: this.stateValue, readyInvitationIds: [...this.readyInvitations].sort()};
  }

  async inviteExistingContact(input: {
    selectedRoomId: string;
    contactId: string;
    recipientAccountPublicKeyHex: string;
    groupId: string;
    invitationId: string;
    eventId: string;
    role: Exclude<MembershipRole, 'limited'>;
    createdAt: string;
    expiresAt: string;
  }): Promise<SignedMembershipEventV1> {
    const roomId = required(input.selectedRoomId, 'Choose a conversation first.');
    const contact = await this.options.contacts.resolve({selectedRoomId: roomId, contactId: input.contactId});
    const expectedAccount = normalizeAccountKey(input.recipientAccountPublicKeyHex);
    if (
      !contact
      || contact.contactId !== input.contactId
      || !contact.participantId.trim()
      || normalizeAccountKey(contact.accountPublicKeyHex) !== expectedAccount
      || !expectedAccount
    ) throw new Error('This contact does not match the approved Product Account.');

    const event = await this.createCausalEvent({
      eventId: input.eventId,
      actorId: this.options.actor.participantId,
      actorAccountPublicKeyHex: this.options.actor.accountPublicKeyHex,
      occurredAt: input.createdAt,
      event: {
        type: 'INVITATION_CREATED',
        invitation: {
          invitationId: input.invitationId,
          groupId: input.groupId,
          inviterId: this.options.actor.participantId,
          inviteeId: contact.participantId,
          inviteeAccountPublicKeyHex: expectedAccount,
          role: input.role,
          route: 'existing_friend',
          status: 'invited',
          createdAt: input.createdAt,
          expiresAt: input.expiresAt,
        },
      },
      signer: this.options.actor.signer,
    });
    await this.acceptLocal(event);
    this.routes.bind({
      invitationId: input.invitationId,
      roomId,
      remoteParticipantId: contact.participantId,
      remoteAccountPublicKeyHex: expectedAccount,
    });
    this.enqueueDelivery({target: deliveryTarget(roomId, contact.participantId, expectedAccount), event, queuedAt: input.createdAt});
    return event;
  }

  async createBootstrapInvitation(input: {
    returnRoomId: string;
    recipientId: string;
    recipientAccountPublicKeyHex: string;
    groupId: string;
    invitationId: string;
    eventId: string;
    role: Exclude<MembershipRole, 'limited'>;
    route: 'join_link' | 'qr';
    createdAt: string;
    expiresAt: string;
  }): Promise<{event: SignedMembershipEventV1; bootstrap: RecipientBoundBootstrapV1}> {
    const prepared = await this.prepareBootstrapInvitation(input);
    const bootstrap = await createRecipientBoundBootstrap({
      invitationEvent: prepared.event,
      returnRoomId: prepared.roomId,
      signer: this.options.actor.signer,
    });
    await this.rememberBootstrapInvitation(prepared);
    return {event: prepared.event, bootstrap};
  }

  /**
   * Production bootstrap path. The signed canonical group origin is carried so
   * a fresh recipient can verify organizer authority without treating the URL,
   * chat room, or prior contact proof as group authority.
   */
  async createOriginBoundBootstrapInvitation(input: {
    returnRoomId: string;
    recipientId: string;
    recipientAccountPublicKeyHex: string;
    groupId: string;
    invitationId: string;
    eventId: string;
    role: Exclude<MembershipRole, 'limited'>;
    route: 'join_link' | 'qr';
    createdAt: string;
    expiresAt: string;
    organizerGroupEvent: CanonicalEventV1;
  }): Promise<{event: SignedMembershipEventV1; bootstrap: RecipientBoundBootstrapV2}> {
    const prepared = await this.prepareBootstrapInvitation(input);
    const bootstrap = await createOriginBoundRecipientBootstrap({
      invitationEvent: prepared.event,
      organizerGroupEvent: input.organizerGroupEvent,
      returnRoomId: prepared.roomId,
      signer: this.options.actor.signer,
    });
    await this.rememberBootstrapInvitation(prepared);
    return {event: prepared.event, bootstrap};
  }

  private async prepareBootstrapInvitation(input: {
    returnRoomId: string;
    recipientId: string;
    recipientAccountPublicKeyHex: string;
    groupId: string;
    invitationId: string;
    eventId: string;
    role: Exclude<MembershipRole, 'limited'>;
    route: 'join_link' | 'qr';
    createdAt: string;
    expiresAt: string;
  }): Promise<{
    roomId: string;
    recipientId: string;
    recipientAccountPublicKeyHex: string;
    event: SignedMembershipEventV1;
  }> {
    const roomId = required(input.returnRoomId, 'Invitation return route is required.');
    const recipientId = required(input.recipientId, 'Invited person is required.');
    const recipientAccountPublicKeyHex = normalizeAccountKey(input.recipientAccountPublicKeyHex);
    if (!recipientAccountPublicKeyHex) throw new Error('The invited Product Account is required.');
    const event = await this.createCausalEvent({
      eventId: input.eventId,
      actorId: this.options.actor.participantId,
      actorAccountPublicKeyHex: this.options.actor.accountPublicKeyHex,
      occurredAt: input.createdAt,
      event: {
        type: 'INVITATION_CREATED',
        invitation: {
          invitationId: input.invitationId,
          groupId: input.groupId,
          inviterId: this.options.actor.participantId,
          inviteeId: recipientId,
          inviteeAccountPublicKeyHex: recipientAccountPublicKeyHex,
          role: input.role,
          route: input.route,
          status: 'invited',
          createdAt: input.createdAt,
          expiresAt: input.expiresAt,
        },
      },
      signer: this.options.actor.signer,
    });
    return {roomId, recipientId, recipientAccountPublicKeyHex, event};
  }

  private async rememberBootstrapInvitation(input: {
    roomId: string;
    recipientId: string;
    recipientAccountPublicKeyHex: string;
    event: SignedMembershipEventV1;
  }): Promise<void> {
    if (input.event.event.type !== 'INVITATION_CREATED') throw new Error('Invitation bootstrap is invalid.');
    await this.acceptLocal(input.event);
    this.routes.bind({
      invitationId: input.event.event.invitation.invitationId,
      roomId: input.roomId,
      remoteParticipantId: input.recipientId,
      remoteAccountPublicKeyHex: input.recipientAccountPublicKeyHex,
    });
  }

  async importBootstrapInvitation(input: {
    bootstrap: RecipientBoundBootstrap;
    now?: string;
  }): Promise<SignedMembershipTransition> {
    if (!await verifyRecipientBoundBootstrap({
      bootstrap: input.bootstrap,
      expectedRecipientAccountPublicKeyHex: this.options.actor.accountPublicKeyHex,
      now: input.now,
      verifier: this.verifier,
    })) return rejected(this.stateValue, 'Invitation bootstrap could not be verified.');
    const event = input.bootstrap.invitationEvent;
    if (event.event.type !== 'INVITATION_CREATED') return rejected(this.stateValue, 'Invitation bootstrap is invalid.');
    const invitation = event.event.invitation;
    if (
      invitation.inviteeId !== this.options.actor.participantId
      || normalizeAccountKey(invitation.inviteeAccountPublicKeyHex ?? '') !== this.options.actor.accountPublicKeyHex
    ) return rejected(this.stateValue, 'This invitation is not for this Product Account.');
    const trustedRoot = await this.resolveTrustedOrganizerRoot({
      groupId: invitation.groupId,
      organizerId: invitation.inviterId,
      organizerAccountPublicKeyHex: event.actorAccountPublicKeyHex,
    });
    if (!trustedRoot) return rejected(this.stateValue, 'The group organizer could not be trusted.');
    if (!this.hasOrganizerRoot(trustedRoot)) {
      this.resolvedOrganizerRoots.push(trustedRoot);
      const replay = await replaySignedMembershipJournal(this.initialState(), this.journal, this.verifier, this.options.keyEnvelopes);
      this.stateValue = replay.state;
    }
    // A verified bootstrap may be this account's first observation of an
    // established group. The organizer signature commits to the exact prior
    // frontier; retaining that commitment lets the recipient verify this
    // invitation and its successors without importing unrelated invitations.
    // This anchor grants neither membership nor a group key.
    if (event.causal && event.causal.expectedVersion > 0 && !this.stateValue.groupFrontiers[invitation.groupId]) {
      const hasObservedGroupEvent = Object.values(this.stateValue.events)
        .some(candidate => membershipEventGroupId(candidate.event, this.stateValue) === invitation.groupId);
      if (hasObservedGroupEvent) {
        return rejected(this.stateValue, 'Invitation bootstrap does not extend the observed group frontier.');
      }
      const anchor: MembershipGroupFrontierV1 = {
        groupId: invitation.groupId,
        version: event.causal.expectedVersion,
        lastEventId: event.causal.parentEventId,
        frontierHash: event.causal.expectedFrontierHash,
      };
      this.frontierAnchors.bind(anchor);
      this.stateValue = {
        ...this.stateValue,
        groupFrontiers: {...this.stateValue.groupFrontiers, [anchor.groupId]: anchor},
      };
    }
    const transition = await this.journal.accept(this.stateValue, event, this.verifier, this.options.keyEnvelopes);
    if (transition.outcome === 'rejected' || transition.outcome === 'deferred') return transition;
    this.routes.bind({
      invitationId: invitation.invitationId,
      roomId: input.bootstrap.returnRoute.roomId,
      remoteParticipantId: event.actorId,
      remoteAccountPublicKeyHex: event.actorAccountPublicKeyHex,
    });
    this.stateValue = transition.state;
    return transition;
  }

  async acceptInvitation(input: {
    invitationId: string;
    eventId: string;
    nonce: string;
    acceptedAt: string;
  }): Promise<SignedMembershipEventV1> {
    const invitation = this.stateValue.lifecycle.invitations[input.invitationId];
    const route = this.routes.get(input.invitationId);
    if (!invitation || !route) throw new Error('Invitation is not available on this device.');
    if (
      invitation.inviteeId !== this.options.actor.participantId
      || normalizeAccountKey(invitation.inviteeAccountPublicKeyHex ?? '') !== this.options.actor.accountPublicKeyHex
    ) throw new Error('This invitation is not for this Product Account.');

    const existing = await this.options.pendingAcceptances.load(input.invitationId);
    if (existing) {
      this.assertPendingRecord(existing, route);
      const transition = await this.journal.accept(this.stateValue, existing.event, this.verifier, this.options.keyEnvelopes);
      this.requireAccepted(transition);
      this.stateValue = transition.state;
      this.enqueueDelivery({target: deliveryTarget(route.roomId, route.remoteParticipantId, route.remoteAccountPublicKeyHex), event: existing.event});
      return existing.event;
    }
    if (this.stateValue.pendingAcceptances[input.invitationId]) {
      throw new Error('Invitation acceptance needs to be resumed on the device that created it.');
    }

    const pending = await createMembershipAcceptance({
      invitationId: invitation.invitationId,
      groupId: invitation.groupId,
      recipientId: this.options.actor.participantId,
      recipientAccountPublicKeyHex: this.options.actor.accountPublicKeyHex,
      nonce: input.nonce,
      expiresAt: invitation.expiresAt,
      signer: this.options.actor.signer,
    });
    const event = await this.createCausalEvent({
      eventId: input.eventId,
      actorId: this.options.actor.participantId,
      actorAccountPublicKeyHex: this.options.actor.accountPublicKeyHex,
      occurredAt: input.acceptedAt,
      event: {type: 'INVITATION_ACCEPTED', acceptance: pending.acceptance},
      signer: this.options.actor.signer,
    });
    const record = {roomId: route.roomId, pending, event};
    await this.options.pendingAcceptances.save(input.invitationId, record);
    try {
      await this.acceptLocal(event);
    } catch (reason) {
      await this.options.pendingAcceptances.remove(input.invitationId);
      throw reason;
    }
    this.enqueueDelivery({target: deliveryTarget(route.roomId, route.remoteParticipantId, route.remoteAccountPublicKeyHex), event, queuedAt: input.acceptedAt});
    return event;
  }

  async declineInvitation(input: {
    invitationId: string;
    eventId: string;
    declinedAt: string;
  }): Promise<SignedMembershipEventV1> {
    const invitation = this.stateValue.lifecycle.invitations[input.invitationId];
    const route = this.routes.get(input.invitationId);
    if (!invitation || !route) throw new Error('Invitation is not available on this device.');
    if (
      invitation.inviteeId !== this.options.actor.participantId
      || normalizeAccountKey(invitation.inviteeAccountPublicKeyHex ?? '') !== this.options.actor.accountPublicKeyHex
    ) throw new Error('This invitation is not for this Product Account.');
    if (this.stateValue.pendingAcceptances[input.invitationId]) {
      throw new Error('An accepted invitation cannot be declined.');
    }

    const existing = Object.values(this.stateValue.events).find(event =>
      event.event.type === 'INVITATION_DECLINED'
      && event.event.invitationId === input.invitationId
      && event.actorId === this.options.actor.participantId
      && normalizeAccountKey(event.actorAccountPublicKeyHex) === this.options.actor.accountPublicKeyHex);
    if (existing) {
      this.enqueueDelivery({target: deliveryTarget(route.roomId, route.remoteParticipantId, route.remoteAccountPublicKeyHex), event: existing});
      return existing;
    }

    const event = await this.createCausalEvent({
      eventId: input.eventId,
      actorId: this.options.actor.participantId,
      actorAccountPublicKeyHex: this.options.actor.accountPublicKeyHex,
      occurredAt: input.declinedAt,
      event: {type: 'INVITATION_DECLINED', invitationId: input.invitationId},
      signer: this.options.actor.signer,
      groupId: invitation.groupId,
    });
    await this.acceptLocal(event);
    this.enqueueDelivery({target: deliveryTarget(route.roomId, route.remoteParticipantId, route.remoteAccountPublicKeyHex), event, queuedAt: input.declinedAt});
    return event;
  }

  async grantAcceptedInvitation(input: {
    invitationId: string;
    eventId: string;
    groupKeyEnvelopeId: string;
    keyVersion: number;
    groupKey: Uint8Array;
    createdAt: string;
    expiresAt: string;
  }): Promise<SignedMembershipEventV1> {
    const route = this.routes.get(input.invitationId);
    const invitation = this.stateValue.lifecycle.invitations[input.invitationId];
    const acceptance = this.stateValue.pendingAcceptances[input.invitationId];
    if (!route || !invitation || !acceptance) throw new Error('A verified invitation acceptance is required.');

    const existing = Object.values(this.stateValue.events).find(event =>
      event.event.type === 'MEMBERSHIP_GRANTED' && event.event.handoff.invitationId === input.invitationId);
    if (existing) {
      this.enqueueDelivery({target: deliveryTarget(route.roomId, route.remoteParticipantId, route.remoteAccountPublicKeyHex), event: existing});
      return existing;
    }

    const handoff = await createGroupKeyHandoff({
      acceptance,
      verifyRecipient: this.verifier,
      groupKeyEnvelopeId: input.groupKeyEnvelopeId,
      organizerId: this.options.actor.participantId,
      organizerAccountPublicKeyHex: this.options.actor.accountPublicKeyHex,
      role: invitation.role as Exclude<MembershipRole, 'limited'>,
      keyVersion: input.keyVersion,
      groupKey: input.groupKey,
      createdAt: input.createdAt,
      expiresAt: input.expiresAt,
      signer: this.options.actor.signer,
    });
    const event = await this.createCausalEvent({
      eventId: input.eventId,
      actorId: this.options.actor.participantId,
      actorAccountPublicKeyHex: this.options.actor.accountPublicKeyHex,
      occurredAt: input.createdAt,
      event: {type: 'MEMBERSHIP_GRANTED', handoff, groupKeyEnvelopeId: input.groupKeyEnvelopeId},
      signer: this.options.actor.signer,
    });
    await this.acceptLocal(event);
    this.enqueueDelivery({target: deliveryTarget(route.roomId, route.remoteParticipantId, route.remoteAccountPublicKeyHex), event, queuedAt: input.createdAt});
    return event;
  }

  async revokeInvitation(input: {
    invitationId: string;
    eventId: string;
    revokedAt: string;
  }): Promise<SignedMembershipEventV1> {
    const invitation = this.stateValue.lifecycle.invitations[input.invitationId];
    const route = this.routes.get(input.invitationId);
    if (!invitation || !route) throw new Error('Invitation is not available on this device.');
    const event = await this.createCausalEvent({
      eventId: input.eventId,
      actorId: this.options.actor.participantId,
      actorAccountPublicKeyHex: this.options.actor.accountPublicKeyHex,
      occurredAt: input.revokedAt,
      event: {type: 'INVITATION_REVOKED', invitationId: input.invitationId},
      signer: this.options.actor.signer,
      groupId: invitation.groupId,
    });
    await this.acceptLocal(event);
    this.enqueueDelivery({target: deliveryTarget(route.roomId, route.remoteParticipantId, route.remoteAccountPublicKeyHex), event, queuedAt: input.revokedAt});
    return event;
  }

  async removeMember(input: {
    groupId: string;
    participantId: string;
    eventId: string;
    nextKeyVersion: number;
    groupKeyEnvelopes: Record<string, MembershipKeyEnvelopeBindingV1>;
    removedAt: string;
  }): Promise<SignedMembershipEventV1> {
    return this.publishGroupMembershipEvent({
      groupId: input.groupId,
      eventId: input.eventId,
      occurredAt: input.removedAt,
      event: {
        type: 'MEMBERSHIP_REMOVED',
        groupId: input.groupId,
        participantId: input.participantId,
        nextKeyVersion: input.nextKeyVersion,
        groupKeyEnvelopes: input.groupKeyEnvelopes,
      },
    });
  }

  async changeMembershipRoles(input: {
    groupId: string;
    eventId: string;
    roles: Record<string, 'organizer' | 'member'>;
    nextKeyVersion: number;
    groupKeyEnvelopes: Record<string, MembershipKeyEnvelopeBindingV1>;
    changedAt: string;
  }): Promise<SignedMembershipEventV1> {
    return this.publishGroupMembershipEvent({
      groupId: input.groupId,
      eventId: input.eventId,
      occurredAt: input.changedAt,
      event: {
        type: 'MEMBERSHIP_ROLES_CHANGED',
        groupId: input.groupId,
        roles: input.roles,
        nextKeyVersion: input.nextKeyVersion,
        groupKeyEnvelopes: input.groupKeyEnvelopes,
      },
    });
  }

  async rotateGroupKey(input: {
    groupId: string;
    eventId: string;
    nextKeyVersion: number;
    groupKeyEnvelopes: Record<string, MembershipKeyEnvelopeBindingV1>;
    rotatedAt: string;
  }): Promise<SignedMembershipEventV1> {
    return this.publishGroupMembershipEvent({
      groupId: input.groupId,
      eventId: input.eventId,
      occurredAt: input.rotatedAt,
      event: {
        type: 'GROUP_KEY_ROTATED',
        groupId: input.groupId,
        nextKeyVersion: input.nextKeyVersion,
        groupKeyEnvelopes: input.groupKeyEnvelopes,
      },
    });
  }

  async receive(input: {
    roomId: string;
    peer: string;
    event: SignedMembershipEventV1;
    now?: string;
  }): Promise<ReceiveMembershipResult> {
    const roomId = required(input.roomId, 'Invitation delivery route is invalid.');
    const invitationId = eventInvitationId(input.event);
    const groupScoped = isGroupLifecycleEvent(input.event.event);
    if (!invitationId && !groupScoped) return rejected(this.stateValue, 'Membership action is invalid.');
    const now = input.now ?? new Date().toISOString();
    if (!isTimestamp(now)) return rejected(this.stateValue, 'Membership action time is invalid.');
    if (
      input.event.event.type === 'MEMBERSHIP_GRANTED'
      && Date.parse(now) >= Date.parse(input.event.event.handoff.expiresAt)
    ) return rejected(this.stateValue, 'Protected group access has expired.');

    if (input.event.event.type === 'INVITATION_CREATED') {
      const invitation = input.event.event.invitation;
      const trustedOrganizer = await this.options.contacts.resolve({
        selectedRoomId: roomId,
        contactId: invitation.inviterId,
      });
      if (
        !trustedOrganizer
        || trustedOrganizer.participantId !== invitation.inviterId
        || normalizeAccountKey(trustedOrganizer.accountPublicKeyHex) !== normalizeAccountKey(input.event.actorAccountPublicKeyHex)
        || invitation.inviteeId !== this.options.actor.participantId
        || normalizeAccountKey(invitation.inviteeAccountPublicKeyHex ?? '') !== this.options.actor.accountPublicKeyHex
      ) return rejected(this.stateValue, 'Invitation does not match trusted contact accounts.');
    } else if (groupScoped) {
      if (!this.routes.matchesRemote({
        roomId,
        participantId: input.event.actorId,
        accountPublicKeyHex: input.event.actorAccountPublicKeyHex,
      })) return rejected(this.stateValue, 'Group membership action arrived through an unverified sender route.');
    } else {
      const route = this.routes.get(invitationId);
      if (!route || route.roomId !== roomId) {
        return rejected(this.stateValue, 'Membership action arrived through another delivery route.');
      }
    }

    const transition = await this.journal.accept(this.stateValue, input.event, this.verifier, this.options.keyEnvelopes);
    if (transition.outcome === 'rejected') return transition;
    const replay = await replaySignedMembershipJournal(this.initialState(), this.journal, this.verifier, this.options.keyEnvelopes);
    this.stateValue = replay.state;
    const replayConflict = replay.conflicts.find(item => item.event.eventId === input.event.eventId);
    const replayRejected = replay.rejected.find(item => item.event.eventId === input.event.eventId);
    const applied = Boolean(this.stateValue.events[input.event.eventId]);

    if (input.event.event.type === 'INVITATION_CREATED') {
      this.routes.bind({
        invitationId,
        roomId,
        remoteParticipantId: input.event.actorId,
        remoteAccountPublicKeyHex: normalizeAccountKey(input.event.actorAccountPublicKeyHex),
      });
    }

    // A grant may have arrived before its acceptance prerequisite. Replaying
    // after every accepted inbound event and then scanning applied grants makes
    // that ordering converge without granting from transport order alone.
    await this.restorePendingGroupAccess(now);
    const membership = Object.values(this.stateValue.lifecycle.memberships)
      .find(candidate => candidate.invitationId === invitationId
        && candidate.participantId === this.options.actor.participantId
        && normalizeAccountKey(candidate.accountPublicKeyHex) === this.options.actor.accountPublicKeyHex);
    const membershipActive = Boolean(membership && this.readyInvitations.has(invitationId));
    const outcome = applied ? (transition.outcome === 'idempotent' ? 'idempotent' : 'applied')
      : replayConflict ? 'conflict'
        : replayRejected ? 'rejected'
          : transition.outcome;
    let deliveryAcknowledgement: MembershipDeliveryAcknowledgement | undefined;
    if (['applied', 'idempotent', 'deferred'].includes(outcome)) {
      const acknowledgementInput = {
        deliveryId: `chat_room:${roomId}:${input.event.eventId}`,
        event: input.event,
        recipientId: this.options.actor.participantId,
        recipientAccountPublicKeyHex: this.options.actor.accountPublicKeyHex,
        receivedAt: now,
        signer: this.options.actor.signer,
      };
      if (input.event.event.type !== 'MEMBERSHIP_GRANTED') {
        deliveryAcknowledgement = await createMembershipDeliveryAcknowledgement(acknowledgementInput);
      } else if (this.readyInvitations.has(invitationId)) {
        // A production durable sink must return the exact account-opened record
        // before a grant can be acknowledged. Falling back to V1 after the sink
        // advertises V2 support would let transport success outrun protected-key
        // durability. Legacy sinks that have no record API retain V1 behavior.
        if (this.options.protectedKeys.acknowledgedRecord) {
          const durableRecord = await this.options.protectedKeys.acknowledgedRecord({
            groupId: input.event.event.handoff.groupId,
            participantId: input.event.event.handoff.recipientId,
            accountPublicKeyHex: input.event.event.handoff.recipientAccountPublicKeyHex,
            keyVersion: input.event.event.handoff.keyVersion,
          });
          if (durableRecord) {
            deliveryAcknowledgement = await createMembershipDeliveryAcknowledgement({
              ...acknowledgementInput,
              groupKeyEnvelopeRecord: durableRecord,
            });
          }
        } else {
          deliveryAcknowledgement = await createMembershipDeliveryAcknowledgement(acknowledgementInput);
        }
      }
    }
    return {
      ...transition,
      outcome,
      reason: replayConflict?.reason ?? replayRejected?.reason ?? transition.reason,
      state: this.stateValue,
      groupKeyStored: this.readyInvitations.has(invitationId),
      membershipActive,
      ...(deliveryAcknowledgement ? {deliveryAcknowledgement} : {}),
    };
  }

  flush(): Promise<{delivered: string[]; pending: string[]}> {
    return this.outbox.flush(async item => {
      const result = await this.options.delivery.send(item.target.roomId, item.event);
      return result.acknowledgement;
    }, this.verifier);
  }

  deliveryAcknowledgements(): MembershipDeliveryAcknowledgement[] {
    return this.outbox.acknowledgements();
  }

  acknowledgeDelivery(acknowledgement: MembershipDeliveryAcknowledgement): Promise<boolean> {
    return this.outbox.acknowledge(acknowledgement, this.verifier);
  }

  pendingDeliveryCount(): number {
    return this.outbox.list().length;
  }

  isDeliveryPending(eventId: string): boolean {
    const normalized = eventId.trim();
    return Boolean(normalized && this.outbox.list().some(item => item.event.eventId === normalized));
  }

  private enqueueDelivery(input: Parameters<MembershipDeliveryOutbox['enqueue']>[0]): void {
    const deliveryId = `${input.target.kind}:${input.target.roomId.trim()}:${input.event.eventId}`;
    if (this.outbox.hasAcknowledged(deliveryId)) return;
    this.outbox.enqueue(input);
  }

  isMembershipActive(input: {invitationId: string; groupId: string; participantId: string}): boolean {
    const membership = this.stateValue.lifecycle.memberships[`${input.groupId.trim()}:${input.participantId.trim()}`];
    return Boolean(
      membership
      && membership.invitationId === input.invitationId.trim()
      && normalizeAccountKey(membership.accountPublicKeyHex) === this.options.actor.accountPublicKeyHex
      && this.readyInvitations.has(input.invitationId.trim()),
    );
  }

  private createCausalEvent(input: {
    eventId: string;
    actorId: string;
    actorAccountPublicKeyHex: string;
    occurredAt: string;
    event: MembershipEventV1;
    signer: AccountMessageSigner;
    groupId?: string;
  }): Promise<SignedMembershipEventV1> {
    return createCausalSignedMembershipEvent(this.stateValue, input);
  }

  private async acceptLocal(event: SignedMembershipEventV1): Promise<void> {
    const transition = await this.journal.accept(this.stateValue, event, this.verifier, this.options.keyEnvelopes);
    this.requireAccepted(transition);
    this.stateValue = transition.state;
  }

  private async publishGroupMembershipEvent(input: {
    groupId: string;
    eventId: string;
    occurredAt: string;
    event: Extract<MembershipEventV1, {type: 'MEMBERSHIP_REMOVED' | 'MEMBERSHIP_ROLES_CHANGED' | 'GROUP_KEY_ROTATED'}>;
  }): Promise<SignedMembershipEventV1> {
    const routes = this.groupDeliveryRoutes(input.groupId);
    const event = await this.createCausalEvent({
      eventId: input.eventId,
      actorId: this.options.actor.participantId,
      actorAccountPublicKeyHex: this.options.actor.accountPublicKeyHex,
      occurredAt: input.occurredAt,
      event: input.event,
      signer: this.options.actor.signer,
      groupId: input.groupId,
    });
    await this.acceptLocal(event);
    for (const route of routes) {
      this.enqueueDelivery({
        target: deliveryTarget(route.roomId, route.remoteParticipantId, route.remoteAccountPublicKeyHex),
        event,
        queuedAt: input.occurredAt,
      });
    }
    return event;
  }

  private groupDeliveryRoutes(groupIdValue: string): InvitationRouteBinding[] {
    const groupId = required(groupIdValue, 'Group delivery route is invalid.');
    const routes = new Map<string, InvitationRouteBinding>();
    for (const membership of Object.values(this.stateValue.lifecycle.memberships)) {
      if (membership.groupId !== groupId || membership.participantId === this.options.actor.participantId) continue;
      const route = this.routes.get(membership.invitationId)
        ?? this.routes.forRemote(membership.participantId, membership.accountPublicKeyHex);
      if (!route) throw new Error(`No verified delivery route exists for ${membership.participantId}.`);
      routes.set(`${route.remoteParticipantId}:${route.remoteAccountPublicKeyHex}`, route);
    }
    if (routes.size === 0) throw new Error('No verified member delivery route is available.');
    return [...routes.values()].sort((left, right) => left.remoteParticipantId.localeCompare(right.remoteParticipantId));
  }

  private initialState(): SignedMembershipState {
    const state = createSignedMembershipState([...this.options.organizerRoots, ...this.resolvedOrganizerRoots]);
    return {...state, groupFrontiers: {...state.groupFrontiers, ...this.frontierAnchors.list()}};
  }

  private hasOrganizerRoot(root: MembershipGrant): boolean {
    return [...this.options.organizerRoots, ...this.resolvedOrganizerRoots].some(candidate =>
      candidate.groupId === root.groupId
      && candidate.participantId === root.participantId
      && normalizeAccountKey(candidate.accountPublicKeyHex) === normalizeAccountKey(root.accountPublicKeyHex)
      && candidate.role === 'organizer');
  }

  private async resolveTrustedOrganizerRoot(input: {
    groupId: string;
    organizerId: string;
    organizerAccountPublicKeyHex: string;
  }): Promise<MembershipGrant | null> {
    const existing = [...this.options.organizerRoots, ...this.resolvedOrganizerRoots]
      .find(candidate => organizerRootMatches(candidate, input));
    if (existing) return existing;
    const resolved = await this.options.trustedOrganizers?.resolve(input) ?? null;
    return resolved && organizerRootMatches(resolved, input) ? resolved : null;
  }

  private requireAccepted(transition: SignedMembershipTransition): void {
    if (transition.outcome === 'rejected' || transition.outcome === 'deferred' || transition.outcome === 'conflict') {
      throw new Error(transition.reason ?? 'Membership action was rejected.');
    }
  }

  private assertPendingRecord(record: PendingAcceptanceRecord, route: InvitationRouteBinding): void {
    if (
      record.roomId !== route.roomId
      || record.event.event.type !== 'INVITATION_ACCEPTED'
      || record.event.event.acceptance.invitationId !== route.invitationId
      || normalizeAccountKey(record.event.actorAccountPublicKeyHex) !== this.options.actor.accountPublicKeyHex
    ) throw new Error('Stored invitation acceptance is invalid.');
  }

  private async storeGrantedGroupKey(handoff: GroupKeyHandoffV1, now: string): Promise<boolean> {
    const keyRef = {
      groupId: handoff.groupId,
      participantId: handoff.recipientId,
      accountPublicKeyHex: handoff.recipientAccountPublicKeyHex,
      keyVersion: handoff.keyVersion,
      groupKeyEnvelopeId: handoff.groupKeyEnvelopeId,
    };
    if (this.readyInvitations.has(handoff.invitationId)) return true;
    if (this.options.protectedKeys.has && await this.options.protectedKeys.has(keyRef)) {
      this.readyInvitations.add(handoff.invitationId);
      return true;
    }
    const record = await this.options.pendingAcceptances.load(handoff.invitationId);
    if (!record) return false;
    let groupKey: Uint8Array | undefined;
    try {
      groupKey = await openGroupKeyHandoff({
        pending: record.pending,
        handoff,
        expectedOrganizerAccountPublicKeyHex: handoff.organizerAccountPublicKeyHex,
        verifyOrganizer: this.verifier,
        now,
      });
      await this.options.protectedKeys.save({
        ...keyRef,
        groupKey,
      });
      await this.options.pendingAcceptances.remove(handoff.invitationId);
      this.readyInvitations.add(handoff.invitationId);
      return true;
    } catch {
      return false;
    } finally {
      groupKey?.fill(0);
    }
  }

  private async restorePendingGroupAccess(now: string): Promise<void> {
    const grants = Object.values(this.stateValue.events)
      .filter((event): event is SignedMembershipEventV1 & {event: {type: 'MEMBERSHIP_GRANTED'; handoff: GroupKeyHandoffV1; groupKeyEnvelopeId: string}} =>
        event.event.type === 'MEMBERSHIP_GRANTED'
        && event.event.handoff.recipientId === this.options.actor.participantId)
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt) || left.eventId.localeCompare(right.eventId));
    for (const event of grants) await this.storeGrantedGroupKey(event.event.handoff, now);
  }
}

/**
 * A bootstrap anchor is a trusted organizer's commitment to the group
 * frontier immediately before the recipient's invitation. It is deliberately
 * separate from the append-only event log because it is not an authority
 * event and cannot grant group access.
 */
class TrustedMembershipFrontierAnchorStore {
  constructor(private readonly storage: KeyValueStorage) {}

  bind(value: MembershipGroupFrontierV1): void {
    const anchor = canonicalFrontierAnchor(value);
    const anchors = this.list();
    const existing = anchors[anchor.groupId];
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(anchor)) {
        throw new Error('Group membership frontier is already anchored elsewhere.');
      }
      return;
    }
    this.storage.write(FRONTIER_ANCHOR_STORAGE_KEY, JSON.stringify({...anchors, [anchor.groupId]: anchor}));
    if (JSON.stringify(this.list()[anchor.groupId]) !== JSON.stringify(anchor)) {
      throw new Error('Group membership frontier could not be persisted.');
    }
  }

  list(): Record<string, MembershipGroupFrontierV1> {
    const stored = this.storage.read(FRONTIER_ANCHOR_STORAGE_KEY);
    if (!stored) return {};
    try {
      const parsed = JSON.parse(stored) as unknown;
      if (!isRecord(parsed)) throw new Error('Invalid frontier anchors.');
      const result: Record<string, MembershipGroupFrontierV1> = {};
      for (const [key, value] of Object.entries(parsed)) {
        const anchor = canonicalFrontierAnchor(value as MembershipGroupFrontierV1);
        if (key !== anchor.groupId || result[key]) throw new Error('Invalid frontier anchor key.');
        result[key] = anchor;
      }
      return result;
    } catch {
      throw new Error('Trusted membership frontier anchors are corrupt.');
    }
  }
}

function canonicalFrontierAnchor(value: MembershipGroupFrontierV1): MembershipGroupFrontierV1 {
  if (!isRecord(value)) throw new Error('Invalid group membership frontier.');
  const keys = Object.keys(value).sort();
  if (keys.join(',') !== ['frontierHash', 'groupId', 'lastEventId', 'version'].sort().join(',')) {
    throw new Error('Invalid group membership frontier.');
  }
  const groupId = required(value.groupId, 'Invalid group membership frontier.');
  const lastEventId = value.lastEventId === null
    ? null
    : required(value.lastEventId, 'Invalid group membership frontier.');
  const frontierHash = typeof value.frontierHash === 'string' ? value.frontierHash.toLowerCase() : '';
  if (
    !Number.isSafeInteger(value.version)
    || value.version <= 0
    || lastEventId === null
    || !/^0x[0-9a-f]{64}$/u.test(frontierHash)
  ) throw new Error('Invalid group membership frontier.');
  return {groupId, version: value.version, lastEventId, frontierHash};
}

class InvitationRouteStore {
  constructor(private readonly storage: KeyValueStorage) {}

  bind(binding: InvitationRouteBinding): void {
    const canonical = canonicalBinding(binding);
    const bindings = this.list();
    const existing = bindings[canonical.invitationId];
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(canonical)) {
        throw new Error('Invitation is already bound to another delivery route.');
      }
      return;
    }
    const updated = {...bindings, [canonical.invitationId]: canonical};
    this.storage.write(ROUTE_STORAGE_KEY, JSON.stringify(updated));
    if (JSON.stringify(this.get(canonical.invitationId)) !== JSON.stringify(canonical)) {
      throw new Error('Invitation delivery route could not be persisted.');
    }
  }

  get(invitationId: string): InvitationRouteBinding | null {
    return this.list()[invitationId.trim()] ?? null;
  }

  matchesRemote(input: {roomId: string; participantId: string; accountPublicKeyHex: string}): boolean {
    const account = normalizeAccountKey(input.accountPublicKeyHex);
    return Object.values(this.list()).some(binding => binding.roomId === input.roomId.trim()
      && binding.remoteParticipantId === input.participantId.trim()
      && binding.remoteAccountPublicKeyHex === account);
  }

  forRemote(participantIdValue: string, accountPublicKeyHexValue: string): InvitationRouteBinding | null {
    const participantId = participantIdValue.trim();
    const account = normalizeAccountKey(accountPublicKeyHexValue);
    return Object.values(this.list()).find(binding => binding.remoteParticipantId === participantId
      && binding.remoteAccountPublicKeyHex === account) ?? null;
  }

  private list(): Record<string, InvitationRouteBinding> {
    const value = this.storage.read(ROUTE_STORAGE_KEY);
    if (!value) return {};
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!isRecord(parsed)) return {};
      const result: Record<string, InvitationRouteBinding> = {};
      for (const candidate of Object.values(parsed)) {
        try {
          const binding = canonicalBinding(candidate as InvitationRouteBinding);
          if (!result[binding.invitationId]) result[binding.invitationId] = binding;
        } catch {
          // A corrupt sibling cannot erase valid route bindings.
        }
      }
      return result;
    } catch {
      return {};
    }
  }
}

function canonicalBinding(value: InvitationRouteBinding): InvitationRouteBinding {
  const result = {
    invitationId: required(value.invitationId, 'Invitation delivery route is invalid.'),
    roomId: required(value.roomId, 'Invitation delivery route is invalid.'),
    remoteParticipantId: required(value.remoteParticipantId, 'Invitation delivery route is invalid.'),
    remoteAccountPublicKeyHex: normalizeAccountKey(value.remoteAccountPublicKeyHex),
  };
  if (!result.remoteAccountPublicKeyHex) throw new Error('Invitation delivery route is invalid.');
  return result;
}

function eventInvitationId(event: SignedMembershipEventV1): string {
  switch (event.event.type) {
    case 'INVITATION_CREATED': return event.event.invitation.invitationId;
    case 'INVITATION_ACCEPTED': return event.event.acceptance.invitationId;
    case 'MEMBERSHIP_GRANTED': return event.event.handoff.invitationId;
    case 'INVITATION_DECLINED':
    case 'INVITATION_REVOKED': return event.event.invitationId;
    case 'MEMBERSHIP_REMOVED':
    case 'MEMBERSHIP_ROLES_CHANGED':
    case 'GROUP_KEY_ROTATED': return '';
  }
}

function isGroupLifecycleEvent(event: MembershipEventV1): event is Extract<MembershipEventV1, {
  type: 'MEMBERSHIP_REMOVED' | 'MEMBERSHIP_ROLES_CHANGED' | 'GROUP_KEY_ROTATED';
}> {
  return ['MEMBERSHIP_REMOVED', 'MEMBERSHIP_ROLES_CHANGED', 'GROUP_KEY_ROTATED'].includes(event.type);
}

function normalizeAccountKey(value: string): string {
  const normalized = value.trim().toLowerCase();
  return /^0x[0-9a-f]{64}$/u.test(normalized) ? normalized : '';
}

function organizerRootMatches(
  root: MembershipGrant,
  expected: {groupId: string; organizerId: string; organizerAccountPublicKeyHex: string},
): boolean {
  return root.groupId === expected.groupId
    && root.participantId === expected.organizerId
    && root.role === 'organizer'
    && normalizeAccountKey(root.accountPublicKeyHex) === normalizeAccountKey(expected.organizerAccountPublicKeyHex)
    && Boolean(root.invitationId.trim())
    && Boolean(root.groupKeyEnvelopeId.trim())
    && Number.isSafeInteger(root.keyVersion)
    && root.keyVersion > 0
    && !Number.isNaN(Date.parse(root.acceptedAt));
}

function required(value: string, message: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(message);
  return normalized;
}

function deliveryTarget(
  roomId: string,
  recipientId: string,
  recipientAccountPublicKeyHex: string,
): MembershipDeliveryTarget {
  return {
    kind: 'chat_room',
    roomId: required(roomId, 'Invitation delivery route is invalid.'),
    recipientId: required(recipientId, 'Invitation recipient is invalid.'),
    recipientAccountPublicKeyHex: normalizeAccountKey(recipientAccountPublicKeyHex),
  };
}

function rejected(state: SignedMembershipState, reason: string): ReceiveMembershipResult {
  return {state, outcome: 'rejected', reason};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}
