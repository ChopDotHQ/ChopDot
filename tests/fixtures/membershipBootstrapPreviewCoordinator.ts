import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import type {KeyValueStorage} from '../../src/environment/livePayerSync.ts';
import type {AccountMessageSigner} from '../../src/membership/groupKeyHandoff.ts';
import type {MembershipGrant} from '../../src/membership/membershipLifecycle.ts';
import {
  bootstrapFromUrl,
  recipientBoundBootstrapQrText,
  recipientBoundBootstrapUrl,
} from '../../src/membership/recipientBoundBootstrap.ts';
import {createSignedMembershipEvent, type SignedMembershipEventV1} from '../../src/membership/signedMembershipEvents.ts';
import {
  TrustedContactInvitationCoordinator,
  type MembershipEventDelivery,
  type PendingAcceptanceRecord,
  type PendingAcceptanceVault,
  type ProtectedGroupKeySink,
  type TrustedContactAccount,
  type TrustedContactAccountResolver,
  type TrustedGroupOrganizerResolver,
} from '../../src/membership/trustedContactInvitationCoordinator.ts';
import type {
  MembershipBootstrapPreviewAdapter,
  MembershipBootstrapRoute,
  MembershipBootstrapState,
} from '../../src/components/membership/membershipBootstrapPreviewAdapter.ts';
import {projectMembershipInvitationStatus} from '../../src/components/membership/membershipInvitationView.ts';

const groupId = 'zurich-dinner';
const invitationId = 'invite-nina';
const leoRoom = 'mina-leo-room';
const ninaRoom = 'mina-nina-return';
const normalExpiry = '2099-08-13T12:00:00.000Z';

class MemoryStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();
  read(key: string) { return this.values.get(key) ?? null; }
  write(key: string, value: string) { this.values.set(key, value); }
  remove(key: string) { this.values.delete(key); }
}

class PendingVault implements PendingAcceptanceVault {
  private readonly values = new Map<string, PendingAcceptanceRecord>();
  async load(id: string) { return this.values.get(id) ?? null; }
  async save(id: string, record: PendingAcceptanceRecord) { this.values.set(id, record); }
  async remove(id: string) { this.values.delete(id); }
}

class KeySink implements ProtectedGroupKeySink {
  async save(_value: Parameters<ProtectedGroupKeySink['save']>[0]) {}
}

class Contacts implements TrustedContactAccountResolver {
  constructor(private readonly values: Map<string, TrustedContactAccount>) {}
  async resolve(input: {selectedRoomId: string; contactId: string}) {
    return this.values.get(`${input.selectedRoomId}:${input.contactId}`) ?? null;
  }
}

export async function createMembershipBootstrapPreviewCeremony(
  route: Exclude<MembershipBootstrapRoute, 'limited'>,
): Promise<MembershipBootstrapPreviewAdapter> {
  await cryptoWaitReady();
  const pairs = {
    mina: sr25519PairFromSeed(new Uint8Array(32).fill(11)),
    leo: sr25519PairFromSeed(new Uint8Array(32).fill(22)),
    nina: sr25519PairFromSeed(new Uint8Array(32).fill(33)),
  };
  const account = (pair: typeof pairs.mina) => `0x${bytesToHex(pair.publicKey)}`;
  const accounts = {mina: account(pairs.mina), leo: account(pairs.leo), nina: account(pairs.nina)};
  const signers = {
    mina: signer(pairs.mina),
    leo: signer(pairs.leo),
    nina: signer(pairs.nina),
  };
  const organizer: MembershipGrant = {
    groupId,
    participantId: 'mina',
    accountPublicKeyHex: accounts.mina,
    role: 'organizer',
    acceptedAt: '2026-08-12T12:00:00.000Z',
    invitationId: 'group-created',
    keyVersion: 1,
    groupKeyEnvelopeId: 'mina-envelope-v1',
  };
  const contacts = new Contacts(new Map([
    [`${leoRoom}:leo`, {contactId: 'leo', participantId: 'leo', accountPublicKeyHex: accounts.leo}],
    [`${leoRoom}:mina`, {contactId: 'mina', participantId: 'mina', accountPublicKeyHex: accounts.mina}],
  ]));
  const trustedOrganizer: TrustedGroupOrganizerResolver = {
    async resolve(input) {
      return input.groupId === organizer.groupId
        && input.organizerId === organizer.participantId
        && input.organizerAccountPublicKeyHex === organizer.accountPublicKeyHex
        ? organizer
        : null;
    },
  };
  const coordinators = {} as Record<'mina' | 'leo' | 'nina', TrustedContactInvitationCoordinator>;
  const delivery = (sender: 'mina' | 'leo' | 'nina'): MembershipEventDelivery => ({
    async send(roomId, event) {
      const recipient = roomId === leoRoom
        ? sender === 'mina' ? 'leo' : 'mina'
        : roomId === ninaRoom
          ? sender === 'mina' ? 'nina' : 'mina'
          : null;
      if (!recipient) throw new Error('Local preview delivery is unavailable.');
      const received = await coordinators[recipient].receive({roomId, peer: `local-${sender}`, event});
      if (received.outcome === 'rejected') throw new Error(received.reason);
      return {messageId: `${sender}-${event.eventId}`};
    },
  });
  const make = (
    id: 'mina' | 'leo' | 'nina',
    organizerRoots: MembershipGrant[],
    organizerResolver?: TrustedGroupOrganizerResolver,
  ) => new TrustedContactInvitationCoordinator({
    actor: {participantId: id, accountPublicKeyHex: accounts[id], signer: signers[id]},
    organizerRoots,
    storage: new MemoryStorage(),
    contacts,
    trustedOrganizers: organizerResolver,
    delivery: delivery(id),
    pendingAcceptances: new PendingVault(),
    protectedKeys: new KeySink(),
  });
  coordinators.mina = make('mina', [organizer]);
  coordinators.leo = make('leo', [organizer]);
  // Nina is intentionally fresh: organizer trust comes from a resolver outside the URL.
  coordinators.nina = make('nina', [], trustedOrganizer);

  await addLeoAsExistingFriend(coordinators.mina, coordinators.leo, accounts.leo);
  const expiresAt = route === 'expired' ? '2026-08-12T12:05:00.000Z' : normalExpiry;
  const created = await coordinators.mina.createBootstrapInvitation({
    returnRoomId: ninaRoom,
    recipientId: 'nina',
    recipientAccountPublicKeyHex: accounts.nina,
    groupId,
    invitationId,
    eventId: 'event-invite-nina',
    role: 'member',
    route: 'join_link',
    createdAt: '2026-08-12T12:04:00.000Z',
    expiresAt,
  });
  const canonicalUrl = recipientBoundBootstrapUrl('https://chopdotproof02.dot/join', created.bootstrap);
  const qrText = recipientBoundBootstrapQrText('https://chopdotproof02.dot/join', created.bootstrap);
  if (canonicalUrl !== qrText) throw new Error('Link and QR must carry one invitation URL.');
  const decoded = bootstrapFromUrl(route === 'qr' ? qrText : canonicalUrl);
  let state: MembershipBootstrapState;
  if (route === 'forwarded') {
    const result = await coordinators.leo.importBootstrapInvitation({bootstrap: decoded, now: '2026-08-12T12:04:30.000Z'});
    if (result.outcome !== 'rejected') throw new Error('A forwarded invitation was accepted by the wrong person.');
    state = 'wrong_person';
  } else if (route === 'expired') {
    const result = await coordinators.nina.importBootstrapInvitation({bootstrap: decoded, now: expiresAt});
    if (result.outcome !== 'rejected') throw new Error('An expired invitation was accepted.');
    state = 'expired';
  } else {
    const result = await coordinators.nina.importBootstrapInvitation({bootstrap: decoded, now: '2026-08-12T12:04:30.000Z'});
    if (result.outcome === 'rejected' || result.outcome === 'deferred') throw new Error(result.reason);
    state = 'decision';
  }

  const syncState = (): MembershipBootstrapState => {
    if (state === 'wrong_person' || state === 'expired' || state === 'declined') return state;
    const projected = projectMembershipInvitationStatus({
      state: coordinators.mina.state,
      invitationId,
      groupId,
      participantId: 'nina',
    });
    return projected === 'ready_to_grant'
      ? 'accepted_pending_grant'
      : projected === 'accepted'
        ? 'joined'
        : 'decision';
  };
  return {
    route,
    canonicalUrl,
    qrText,
    getState: () => syncState(),
    async accept() {
      if (syncState() !== 'decision') throw new Error('This invitation action is no longer available.');
      await coordinators.nina.acceptInvitation({
        invitationId,
        eventId: 'event-accept-nina',
        nonce: 'nonce-nina',
        acceptedAt: '2026-08-12T12:05:00.000Z',
      });
      await coordinators.nina.flush();
      state = syncState();
    },
    async decline() {
      if (syncState() !== 'decision') throw new Error('This invitation action is no longer available.');
      const event = await createSignedMembershipEvent({
        eventId: 'event-decline-nina',
        actorId: 'nina',
        actorAccountPublicKeyHex: accounts.nina,
        occurredAt: '2026-08-12T12:05:00.000Z',
        event: {type: 'INVITATION_DECLINED', invitationId},
        signer: signers.nina,
      });
      const local = await coordinators.nina.receive({roomId: ninaRoom, peer: 'local-nina', event});
      const remote = await coordinators.mina.receive({roomId: ninaRoom, peer: 'local-nina', event});
      if (local.outcome === 'rejected' || remote.outcome === 'rejected') throw new Error(local.reason ?? remote.reason);
      state = 'declined';
    },
    async grant() {
      if (syncState() !== 'accepted_pending_grant') throw new Error('Nina must accept before being added.');
      await coordinators.mina.grantAcceptedInvitation({
        invitationId,
        eventId: 'event-grant-nina',
        groupKeyEnvelopeId: 'nina-envelope-v1',
        keyVersion: 1,
        groupKey: new Uint8Array(32).fill(8),
        createdAt: '2026-08-12T12:06:00.000Z',
        expiresAt: normalExpiry,
      });
      await coordinators.mina.flush();
      state = syncState();
    },
    async openLimitedAction() { throw new Error('Membership invitations cannot open limited actions.'); },
  };
}

async function addLeoAsExistingFriend(
  mina: TrustedContactInvitationCoordinator,
  leo: TrustedContactInvitationCoordinator,
  leoAccount: string,
) {
  await mina.inviteExistingContact({
    selectedRoomId: leoRoom,
    contactId: 'leo',
    recipientAccountPublicKeyHex: leoAccount,
    groupId,
    invitationId: 'invite-leo',
    eventId: 'event-invite-leo',
    role: 'member',
    createdAt: '2026-08-12T12:01:00.000Z',
    expiresAt: normalExpiry,
  });
  await mina.flush();
  await leo.acceptInvitation({
    invitationId: 'invite-leo',
    eventId: 'event-accept-leo',
    nonce: 'nonce-leo',
    acceptedAt: '2026-08-12T12:02:00.000Z',
  });
  await leo.flush();
  await mina.grantAcceptedInvitation({
    invitationId: 'invite-leo',
    eventId: 'event-grant-leo',
    groupKeyEnvelopeId: 'leo-envelope-v1',
    keyVersion: 1,
    groupKey: new Uint8Array(32).fill(7),
    createdAt: '2026-08-12T12:03:00.000Z',
    expiresAt: normalExpiry,
  });
  await mina.flush();
}

function signer(pair: ReturnType<typeof sr25519PairFromSeed>): AccountMessageSigner {
  return {signBytes: async data => sr25519Sign(data, pair)};
}

function bytesToHex(value: Uint8Array): string {
  return Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('');
}
