import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import type {KeyValueStorage} from '../../src/environment/livePayerSync.ts';
import type {AccountMessageSigner} from '../../src/membership/groupKeyHandoff.ts';
import type {MembershipGrant} from '../../src/membership/membershipLifecycle.ts';
import {
  TrustedContactInvitationCoordinator,
  type MembershipEventDelivery,
  type PendingAcceptanceRecord,
  type PendingAcceptanceVault,
  type ProtectedGroupKeySink,
  type TrustedContactAccount,
  type TrustedContactAccountResolver,
} from '../../src/membership/trustedContactInvitationCoordinator.ts';
import {projectMembershipInvitationStatus, type MembershipInvitationUiStatus} from '../../src/components/membership/membershipInvitationView.ts';

const groupId = 'zurich-dinner';
const invitationId = 'invite-leo';
const roomId = 'friends-room';
const expiresAt = '2099-08-13T12:00:00.000Z';

class MemoryStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();
  read(key: string) { return this.values.get(key) ?? null; }
  write(key: string, value: string) { this.values.set(key, value); }
  remove(key: string) { this.values.delete(key); }
}

class MemoryPendingAcceptanceVault implements PendingAcceptanceVault {
  private readonly values = new Map<string, PendingAcceptanceRecord>();
  async load(id: string) { return this.values.get(id) ?? null; }
  async save(id: string, record: PendingAcceptanceRecord) { this.values.set(id, record); }
  async remove(id: string) { this.values.delete(id); }
}

class MemoryProtectedKeySink implements ProtectedGroupKeySink {
  async save(_value: Parameters<ProtectedGroupKeySink['save']>[0]) {}
}

class StaticContacts implements TrustedContactAccountResolver {
  constructor(private readonly contacts: Map<string, TrustedContactAccount>) {}
  async resolve(input: {selectedRoomId: string; contactId: string}) {
    return this.contacts.get(`${input.selectedRoomId}:${input.contactId}`) ?? null;
  }
}

export interface MembershipInvitationPreviewCeremony {
  statusFor(actor: 'mina' | 'leo'): MembershipInvitationUiStatus;
  invite(): Promise<void>;
  accept(): Promise<void>;
  decline(): Promise<void>;
  grant(): Promise<void>;
  retryGrant(): Promise<void>;
}

export async function createMembershipInvitationPreviewCeremony(input: {
  failFirstGrant: boolean;
}): Promise<MembershipInvitationPreviewCeremony> {
  await cryptoWaitReady();
  const minaPair = sr25519PairFromSeed(new Uint8Array(32).fill(11));
  const leoPair = sr25519PairFromSeed(new Uint8Array(32).fill(22));
  const account = (pair: typeof minaPair) => `0x${bytesToHex(pair.publicKey)}`;
  const signer = (pair: typeof minaPair): AccountMessageSigner => ({
    signBytes: async data => sr25519Sign(data, pair),
  });
  const minaAccount = account(minaPair);
  const leoAccount = account(leoPair);
  const organizer: MembershipGrant = {
    groupId,
    participantId: 'mina',
    accountPublicKeyHex: minaAccount,
    role: 'organizer',
    acceptedAt: '2026-08-12T12:00:00.000Z',
    invitationId: 'group-created',
    keyVersion: 1,
    groupKeyEnvelopeId: 'mina-envelope-v1',
  };
  const contacts = new StaticContacts(new Map([
    [`${roomId}:leo`, {contactId: 'leo', participantId: 'leo', accountPublicKeyHex: leoAccount}],
    [`${roomId}:mina`, {contactId: 'mina', participantId: 'mina', accountPublicKeyHex: minaAccount}],
  ]));
  let mina: TrustedContactInvitationCoordinator;
  let leo: TrustedContactInvitationCoordinator;
  const minaDelivery: MembershipEventDelivery = {
    async send(selectedRoomId, event) {
      const result = await leo.receive({roomId: selectedRoomId, peer: 'local-mina', event});
      if (result.outcome === 'rejected') throw new Error(result.reason);
      return {messageId: `mina-${event.eventId}`};
    },
  };
  const leoDelivery: MembershipEventDelivery = {
    async send(selectedRoomId, event) {
      const result = await mina.receive({roomId: selectedRoomId, peer: 'local-leo', event});
      if (result.outcome === 'rejected') throw new Error(result.reason);
      return {messageId: `leo-${event.eventId}`};
    },
  };
  mina = new TrustedContactInvitationCoordinator({
    actor: {participantId: 'mina', accountPublicKeyHex: minaAccount, signer: signer(minaPair)},
    organizerRoots: [organizer], storage: new MemoryStorage(), contacts, delivery: minaDelivery,
    pendingAcceptances: new MemoryPendingAcceptanceVault(), protectedKeys: new MemoryProtectedKeySink(),
  });
  leo = new TrustedContactInvitationCoordinator({
    actor: {participantId: 'leo', accountPublicKeyHex: leoAccount, signer: signer(leoPair)},
    organizerRoots: [organizer], storage: new MemoryStorage(), contacts, delivery: leoDelivery,
    pendingAcceptances: new MemoryPendingAcceptanceVault(), protectedKeys: new MemoryProtectedKeySink(),
  });
  let shouldFailGrant = input.failFirstGrant;

  const statusFor = (actor: 'mina' | 'leo') => projectMembershipInvitationStatus({
    state: actor === 'mina' ? mina.state : leo.state,
    invitationId,
    groupId,
    participantId: 'leo',
  });
  const grant = async () => {
    if (shouldFailGrant) {
      shouldFailGrant = false;
      throw new Error('Local preview grant failure.');
    }
    await mina.grantAcceptedInvitation({
      invitationId,
      eventId: 'event-grant-leo',
      groupKeyEnvelopeId: 'leo-envelope-v1',
      keyVersion: 1,
      groupKey: new Uint8Array(32).fill(7),
      createdAt: '2026-08-12T12:03:00.000Z',
      expiresAt,
    });
    await mina.flush();
  };

  return {
    statusFor,
    async invite() {
      await mina.inviteExistingContact({
        selectedRoomId: roomId,
        contactId: 'leo',
        recipientAccountPublicKeyHex: leoAccount,
        groupId,
        invitationId,
        eventId: 'event-invite-leo',
        role: 'member',
        createdAt: '2026-08-12T12:01:00.000Z',
        expiresAt,
      });
      await mina.flush();
    },
    async accept() {
      await leo.acceptInvitation({
        invitationId,
        eventId: 'event-accept-leo',
        nonce: 'nonce-leo',
        acceptedAt: '2026-08-12T12:02:00.000Z',
      });
      await leo.flush();
    },
    async decline() {
      await leo.declineInvitation({
        invitationId,
        eventId: 'event-decline-leo',
        declinedAt: '2026-08-12T12:02:00.000Z',
      });
      await leo.flush();
    },
    grant,
    retryGrant: grant,
  };
}

function bytesToHex(value: Uint8Array): string {
  return Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('');
}
