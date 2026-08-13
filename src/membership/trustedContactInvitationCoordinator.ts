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
import {MembershipDeliveryOutbox} from './membershipDeliveryOutbox.ts';
import type {MembershipGrant, MembershipRole} from './membershipLifecycle.ts';
import {
  createSignedMembershipEvent,
  createSignedMembershipState,
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
  createRecipientBoundBootstrap,
  verifyRecipientBoundBootstrap,
  type RecipientBoundBootstrapV1,
} from './recipientBoundBootstrap.ts';

const ROUTE_STORAGE_KEY = 'chopdot-trusted-contact-invitation-routes-v1';

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
  send(roomId: string, event: SignedMembershipEventV1): Promise<{messageId: string}>;
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
  verifier?: AccountMessageVerifier;
}

export interface ReceiveMembershipResult extends SignedMembershipTransition {
  groupKeyStored?: boolean;
  membershipActive?: boolean;
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
    this.verifier = options.verifier ?? verifyProductAccountSignature;
    this.stateValue = createSignedMembershipState(options.organizerRoots);
  }

  get state(): SignedMembershipState {
    return this.stateValue;
  }

  async restore(now = new Date().toISOString()): Promise<MembershipReplayResult & {readyInvitationIds: string[]}> {
    const replay = await replaySignedMembershipJournal(this.initialState(), this.journal, this.verifier);
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

    const event = await createSignedMembershipEvent({
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
    const transition = await this.journal.accept(this.stateValue, event, this.verifier);
    this.requireAccepted(transition);
    this.stateValue = transition.state;
    this.routes.bind({
      invitationId: input.invitationId,
      roomId,
      remoteParticipantId: contact.participantId,
      remoteAccountPublicKeyHex: expectedAccount,
    });
    this.outbox.enqueue({target: {kind: 'chat_room', roomId}, event, queuedAt: input.createdAt});
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
    const roomId = required(input.returnRoomId, 'Invitation return route is required.');
    const recipientId = required(input.recipientId, 'Invited person is required.');
    const recipientAccountPublicKeyHex = normalizeAccountKey(input.recipientAccountPublicKeyHex);
    if (!recipientAccountPublicKeyHex) throw new Error('The invited Product Account is required.');
    const event = await createSignedMembershipEvent({
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
    const bootstrap = await createRecipientBoundBootstrap({
      invitationEvent: event,
      returnRoomId: roomId,
      signer: this.options.actor.signer,
    });
    const transition = await this.journal.accept(this.stateValue, event, this.verifier);
    this.requireAccepted(transition);
    this.stateValue = transition.state;
    this.routes.bind({
      invitationId: input.invitationId,
      roomId,
      remoteParticipantId: recipientId,
      remoteAccountPublicKeyHex: recipientAccountPublicKeyHex,
    });
    return {event, bootstrap};
  }

  async importBootstrapInvitation(input: {
    bootstrap: RecipientBoundBootstrapV1;
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
      const replay = await replaySignedMembershipJournal(this.initialState(), this.journal, this.verifier);
      this.stateValue = replay.state;
    }
    const transition = await this.journal.accept(this.stateValue, event, this.verifier);
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
      const transition = await this.journal.accept(this.stateValue, existing.event, this.verifier);
      this.requireAccepted(transition);
      this.stateValue = transition.state;
      this.outbox.enqueue({target: {kind: 'chat_room', roomId: route.roomId}, event: existing.event});
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
    const event = await createSignedMembershipEvent({
      eventId: input.eventId,
      actorId: this.options.actor.participantId,
      actorAccountPublicKeyHex: this.options.actor.accountPublicKeyHex,
      occurredAt: input.acceptedAt,
      event: {type: 'INVITATION_ACCEPTED', acceptance: pending.acceptance},
      signer: this.options.actor.signer,
    });
    const record = {roomId: route.roomId, pending, event};
    await this.options.pendingAcceptances.save(input.invitationId, record);
    const transition = await this.journal.accept(this.stateValue, event, this.verifier);
    if (transition.outcome === 'rejected' || transition.outcome === 'deferred') {
      await this.options.pendingAcceptances.remove(input.invitationId);
      this.requireAccepted(transition);
    }
    this.stateValue = transition.state;
    this.outbox.enqueue({target: {kind: 'chat_room', roomId: route.roomId}, event, queuedAt: input.acceptedAt});
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
      this.outbox.enqueue({target: {kind: 'chat_room', roomId: route.roomId}, event: existing});
      return existing;
    }

    const event = await createSignedMembershipEvent({
      eventId: input.eventId,
      actorId: this.options.actor.participantId,
      actorAccountPublicKeyHex: this.options.actor.accountPublicKeyHex,
      occurredAt: input.declinedAt,
      event: {type: 'INVITATION_DECLINED', invitationId: input.invitationId},
      signer: this.options.actor.signer,
    });
    const transition = await this.journal.accept(this.stateValue, event, this.verifier);
    this.requireAccepted(transition);
    this.stateValue = transition.state;
    this.outbox.enqueue({target: {kind: 'chat_room', roomId: route.roomId}, event, queuedAt: input.declinedAt});
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
      this.outbox.enqueue({target: {kind: 'chat_room', roomId: route.roomId}, event: existing});
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
    const event = await createSignedMembershipEvent({
      eventId: input.eventId,
      actorId: this.options.actor.participantId,
      actorAccountPublicKeyHex: this.options.actor.accountPublicKeyHex,
      occurredAt: input.createdAt,
      event: {type: 'MEMBERSHIP_GRANTED', handoff, groupKeyEnvelopeId: input.groupKeyEnvelopeId},
      signer: this.options.actor.signer,
    });
    const transition = await this.journal.accept(this.stateValue, event, this.verifier);
    this.requireAccepted(transition);
    this.stateValue = transition.state;
    this.outbox.enqueue({target: {kind: 'chat_room', roomId: route.roomId}, event, queuedAt: input.createdAt});
    return event;
  }

  async receive(input: {
    roomId: string;
    peer: string;
    event: SignedMembershipEventV1;
    now?: string;
  }): Promise<ReceiveMembershipResult> {
    const roomId = required(input.roomId, 'Invitation delivery route is invalid.');
    const invitationId = eventInvitationId(input.event);
    if (!invitationId) return rejected(this.stateValue, 'Membership action is invalid.');
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
    } else {
      const route = this.routes.get(invitationId);
      if (!route || route.roomId !== roomId) {
        return rejected(this.stateValue, 'Membership action arrived through another delivery route.');
      }
    }

    const transition = await this.journal.accept(this.stateValue, input.event, this.verifier);
    if (transition.outcome === 'rejected') return transition;
    this.stateValue = transition.state;
    const replay = await replaySignedMembershipJournal(this.initialState(), this.journal, this.verifier);
    this.stateValue = replay.state;

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
    return {
      ...transition,
      state: this.stateValue,
      groupKeyStored: this.readyInvitations.has(invitationId),
      membershipActive,
    };
  }

  flush(): Promise<{delivered: string[]; pending: string[]}> {
    return this.outbox.flush(async item => {
      await this.options.delivery.send(item.target.roomId, item.event);
      return true;
    });
  }

  pendingDeliveryCount(): number {
    return this.outbox.list().length;
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

  private initialState(): SignedMembershipState {
    return createSignedMembershipState([...this.options.organizerRoots, ...this.resolvedOrganizerRoots]);
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
    if (transition.outcome === 'rejected' || transition.outcome === 'deferred') {
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
    try {
      const groupKey = await openGroupKeyHandoff({
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
  }
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

function rejected(state: SignedMembershipState, reason: string): ReceiveMembershipResult {
  return {state, outcome: 'rejected', reason};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}
