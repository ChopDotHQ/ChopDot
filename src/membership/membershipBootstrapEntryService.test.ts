import assert from 'node:assert/strict';
import test from 'node:test';
import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import type {KeyValueStorage} from '../environment/livePayerSync.ts';
import type {AccountMessageSigner} from './groupKeyHandoff.ts';
import {
  MembershipBootstrapEntryService,
  type VerifiedOrganizerAuthorityResolver,
} from './membershipBootstrapEntryService.ts';
import type {MembershipGrant} from './membershipLifecycle.ts';
import {createRecipientBoundBootstrap} from './recipientBoundBootstrap.ts';
import {createSignedMembershipEvent} from './signedMembershipEvents.ts';
import type {
  MembershipEventDelivery,
  PendingAcceptanceRecord,
  PendingAcceptanceVault,
  ProtectedGroupKeySink,
} from './trustedContactInvitationCoordinator.ts';

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  read(key: string) { return this.values.get(key) ?? null; }
  write(key: string, value: string) { this.values.set(key, value); }
  remove(key: string) { this.values.delete(key); }
}

class PendingVault implements PendingAcceptanceVault {
  values = new Map<string, PendingAcceptanceRecord>();
  async load(id: string) { return this.values.get(id) ?? null; }
  async save(id: string, value: PendingAcceptanceRecord) { this.values.set(id, value); }
  async remove(id: string) { this.values.delete(id); }
}

const keySink: ProtectedGroupKeySink = {async save() {}};
const delivery = {async send(_roomId: string, event: {eventId: string}) { return {messageId: event.eventId}; }};

test('real entry re-resolves external organizer authority and rebuilds pending invitation after restart', async () => {
  const h = await harness();
  let resolutions = 0;
  const authority: VerifiedOrganizerAuthorityResolver = {
    async resolve() {
      resolutions += 1;
      return {
        grant: h.organizer,
        proof: {source: 'external_trust_registry', proofId: 'registry-proof-mina', verifiedAt: '2026-08-12T12:02:00.000Z'},
      };
    },
  };
  const storage = new MemoryStorage();
  const pending = new PendingVault();
  const first = h.service({storage, pending, authority});
  assert.deepEqual(await first.enter(h.bootstrap, '2026-08-12T12:03:00.000Z'), {
    status: 'ready', invitationId: 'invite-nina',
  });
  assert.deepEqual(await first.enter(h.bootstrap, '2026-08-12T12:03:30.000Z'), {
    status: 'ready', invitationId: 'invite-nina',
  });
  assert.equal(first.state.lifecycle.invitations['invite-nina'].status, 'invited');
  const beforeRestartResolutions = resolutions;

  const recreated = h.service({storage, pending, authority});
  assert.deepEqual(await recreated.restore('2026-08-12T12:04:00.000Z'), {
    restored: ['invite-nina'], rejected: [],
  });
  assert.ok(resolutions > beforeRestartResolutions);
  assert.equal(recreated.state.lifecycle.invitations['invite-nina'].status, 'invited');
  assert.equal(recreated.state.lifecycle.memberships['zurich-dinner:nina'], undefined);
});

test('URL, preview fixtures, wrong account, expiry, and missing restart authority never become trust roots', async () => {
  const h = await harness();
  const storage = new MemoryStorage();
  const pending = new PendingVault();
  const preview: VerifiedOrganizerAuthorityResolver = {async resolve() {
    return {
      grant: h.organizer,
      proof: {source: 'preview_fixture', proofId: 'fake-preview', verifiedAt: '2026-08-12T12:02:00.000Z'},
    };
  }};
  assert.equal((await h.service({storage, pending, authority: preview}).enter(
    h.bootstrap, '2026-08-12T12:03:00.000Z',
  )).status, 'untrusted_organizer');

  assert.equal((await h.service({
    storage: new MemoryStorage(), pending: new PendingVault(), authority: h.authority,
    actorId: 'leo', actorAccount: h.leoAccount, actorSigner: h.leoSigner,
  }).enter(h.bootstrap, '2026-08-12T12:03:00.000Z')).status, 'wrong_account');
  assert.equal((await h.service({storage, pending, authority: h.authority}).enter(
    h.bootstrap, '2099-08-13T12:00:00.000Z',
  )).status, 'expired');

  const accepted = h.service({storage, pending, authority: h.authority});
  assert.equal((await accepted.enter(h.bootstrap, '2026-08-12T12:03:00.000Z')).status, 'ready');
  const withoutAuthority = h.service({storage, pending, authority: {async resolve() { return null; }}});
  assert.deepEqual(await withoutAuthority.restore('2026-08-12T12:04:00.000Z'), {
    restored: [], rejected: [{eventId: 'event-invite-nina', status: 'untrusted_organizer'}],
  });
  assert.equal(withoutAuthority.state.lifecycle.invitations['invite-nina'], undefined);
});

test('Product Account signer mismatch rejects acceptance and clears unusable pending key state', async () => {
  const h = await harness();
  const pending = new PendingVault();
  const wrongSignerService = h.service({
    storage: new MemoryStorage(), pending, authority: h.authority, actorSigner: h.leoSigner,
  });
  assert.equal((await wrongSignerService.enter(h.bootstrap, '2026-08-12T12:03:00.000Z')).status, 'ready');
  await assert.rejects(() => wrongSignerService.accept({
    invitationId: 'invite-nina', eventId: 'event-accept-nina', nonce: 'nonce-nina',
    acceptedAt: '2026-08-12T12:04:00.000Z',
  }), /could not be verified/u);
  assert.equal(pending.values.size, 0);
  assert.equal(wrongSignerService.state.pendingAcceptances['invite-nina'], undefined);
});

test('invitee decline is signed, durable, delivered, idempotent, and never creates membership', async () => {
  const h = await harness();
  const sent: Array<{roomId: string; event: {eventId: string; event: {type: string}}}> = [];
  const service = h.service({
    storage: new MemoryStorage(), pending: new PendingVault(), authority: h.authority,
    delivery: {async send(roomId, event) {
      sent.push({roomId, event});
      return {messageId: event.eventId};
    }},
  });
  assert.equal((await service.enter(h.bootstrap, '2026-08-12T12:03:00.000Z')).status, 'ready');

  const first = await service.decline({
    invitationId: 'invite-nina', eventId: 'event-decline-nina',
    declinedAt: '2026-08-12T12:04:00.000Z',
  });
  const retry = await service.decline({
    invitationId: 'invite-nina', eventId: 'unused-retry-id',
    declinedAt: '2026-08-12T12:05:00.000Z',
  });
  assert.deepEqual(retry, first);
  assert.equal(first.event.type, 'INVITATION_DECLINED');
  assert.equal(service.state.lifecycle.invitations['invite-nina'].status, 'declined');
  assert.equal(service.state.lifecycle.memberships['zurich-dinner:nina'], undefined);
  assert.equal((await service.flush()).delivered.length, 1);
  assert.deepEqual(sent.map(item => [item.roomId, item.event.eventId, item.event.event.type]), [
    ['mina-nina-return', 'event-decline-nina', 'INVITATION_DECLINED'],
  ]);
});

async function harness() {
  await cryptoWaitReady();
  const mina = sr25519PairFromSeed(new Uint8Array(32).fill(11));
  const nina = sr25519PairFromSeed(new Uint8Array(32).fill(33));
  const leo = sr25519PairFromSeed(new Uint8Array(32).fill(22));
  const account = (pair: typeof mina) => `0x${Buffer.from(pair.publicKey).toString('hex')}`;
  const signer = (pair: typeof mina): AccountMessageSigner => ({signBytes: async data => sr25519Sign(data, pair)});
  const minaAccount = account(mina);
  const ninaAccount = account(nina);
  const leoAccount = account(leo);
  const minaSigner = signer(mina);
  const event = await createSignedMembershipEvent({
    eventId: 'event-invite-nina', actorId: 'mina', actorAccountPublicKeyHex: minaAccount,
    occurredAt: '2026-08-12T12:01:00.000Z',
    event: {type: 'INVITATION_CREATED', invitation: {
      invitationId: 'invite-nina', groupId: 'zurich-dinner', inviterId: 'mina', inviteeId: 'nina',
      inviteeAccountPublicKeyHex: ninaAccount, role: 'member', route: 'join_link', status: 'invited',
      createdAt: '2026-08-12T12:01:00.000Z', expiresAt: '2099-08-13T12:00:00.000Z',
    }},
    signer: minaSigner,
  });
  const bootstrap = await createRecipientBoundBootstrap({
    invitationEvent: event, returnRoomId: 'mina-nina-return', signer: minaSigner,
  });
  const organizer: MembershipGrant = {
    groupId: 'zurich-dinner', participantId: 'mina', accountPublicKeyHex: minaAccount, role: 'organizer',
    acceptedAt: '2026-08-12T12:00:00.000Z', invitationId: 'group-created',
    keyVersion: 1, groupKeyEnvelopeId: 'mina-envelope-v1',
  };
  const authority: VerifiedOrganizerAuthorityResolver = {async resolve() {
    return {
      grant: organizer,
      proof: {source: 'external_trust_registry', proofId: 'registry-proof-mina', verifiedAt: '2026-08-12T12:02:00.000Z'},
    };
  }};
  return {
    bootstrap, organizer, authority, ninaAccount, leoAccount, leoSigner: signer(leo),
    service(input: {
      storage: MemoryStorage;
      pending: PendingVault;
      authority: VerifiedOrganizerAuthorityResolver;
      actorId?: string;
      actorAccount?: string;
      actorSigner?: AccountMessageSigner;
      delivery?: MembershipEventDelivery;
    }) {
      return new MembershipBootstrapEntryService({
        actor: {
          participantId: input.actorId ?? 'nina',
          accountPublicKeyHex: input.actorAccount ?? ninaAccount,
          signer: input.actorSigner ?? signer(nina),
        },
        storage: input.storage,
        organizerAuthority: input.authority,
        delivery: input.delivery ?? delivery,
        pendingAcceptances: input.pending,
        protectedKeys: keySink,
      });
    },
  };
}
