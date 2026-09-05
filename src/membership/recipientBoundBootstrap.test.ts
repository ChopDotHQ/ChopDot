import assert from 'node:assert/strict';
import test from 'node:test';
import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import type {AccountMessageSigner} from './groupKeyHandoff.ts';
import {
  bootstrapFromUrl,
  createOriginBoundRecipientBootstrap,
  createRecipientBoundBootstrap,
  decodeRecipientBoundBootstrap,
  encodeRecipientBoundBootstrap,
  recipientBoundBootstrapQrText,
  recipientBoundBootstrapUrl,
  organizerGrantFromVerifiedBootstrap,
  verifyRecipientBoundBootstrap,
} from './recipientBoundBootstrap.ts';
import {createSignedMembershipEvent, type SignedMembershipEventV1} from './signedMembershipEvents.ts';
import {createCanonicalEvent} from '../core/moneyEventKernel.ts';

const expiresAt = '2099-08-13T12:00:00.000Z';

test('link and QR use the same canonical account-bound bootstrap URL', async () => {
  const {event, signer, leoAccount} = await invitation();
  const bootstrap = await createRecipientBoundBootstrap({
    invitationEvent: event, returnRoomId: 'friends-room', signer,
  });
  const encoded = encodeRecipientBoundBootstrap(bootstrap);
  assert.deepEqual(decodeRecipientBoundBootstrap(encoded), bootstrap);
  const link = recipientBoundBootstrapUrl('https://chopdotproof02.dot/join', bootstrap);
  assert.equal(recipientBoundBootstrapQrText('https://chopdotproof02.dot/join', bootstrap), link);
  assert.deepEqual(bootstrapFromUrl(link), bootstrap);
  assert.equal(await verifyRecipientBoundBootstrap({
    bootstrap, expectedRecipientAccountPublicKeyHex: leoAccount,
    now: '2026-08-12T12:02:00.000Z',
  }), true);
});

test('wrong recipient, signed-route tamper, expiry, and unsupported payload data fail closed', async () => {
  const {event, signer, leoAccount} = await invitation();
  const bootstrap = await createRecipientBoundBootstrap({
    invitationEvent: event, returnRoomId: 'friends-room', signer,
  });
  assert.equal(await verifyRecipientBoundBootstrap({
    bootstrap, expectedRecipientAccountPublicKeyHex: `0x${'33'.repeat(32)}`,
  }), false);
  assert.equal(await verifyRecipientBoundBootstrap({
    bootstrap: {...bootstrap, returnRoute: {kind: 'chat_room', roomId: 'attacker-room'}},
    expectedRecipientAccountPublicKeyHex: leoAccount,
  }), false);
  assert.equal(await verifyRecipientBoundBootstrap({
    bootstrap, expectedRecipientAccountPublicKeyHex: leoAccount,
    now: expiresAt,
  }), false);

  for (const field of ['groupKey', 'groupHistory', 'moneyState', 'capability']) {
    const unsupported = {...bootstrap, [field]: 'must-not-travel'};
    assert.throws(() => encodeRecipientBoundBootstrap(unsupported as never), /unsupported data/u);
  }
});

test('bootstrap admits only account-bound join-link or QR membership invitations', async () => {
  const {event, signer} = await invitation();
  if (event.event.type !== 'INVITATION_CREATED') throw new Error('Expected invitation.');
  const noAccount = structuredClone(event);
  if (noAccount.event.type !== 'INVITATION_CREATED') throw new Error('Expected invitation.');
  delete noAccount.event.invitation.inviteeAccountPublicKeyHex;
  await assert.rejects(
    () => createRecipientBoundBootstrap({invitationEvent: noAccount, returnRoomId: 'room', signer}),
    /unsupported data|account-bound/u,
  );

  const noApp = structuredClone(event);
  if (noApp.event.type !== 'INVITATION_CREATED') throw new Error('Expected invitation.');
  noApp.event.invitation.route = 'no_app_action';
  noApp.event.invitation.role = 'limited';
  await assert.rejects(
    () => createRecipientBoundBootstrap({invitationEvent: noApp, returnRoomId: 'room', signer}),
    /account-bound invitation/u,
  );
});

test('v2 binds a recipient invitation to the signed canonical group origin', async () => {
  const {event, signer, leoAccount, mina, minaAccount} = await invitation();
  const organizerGroupEvent = await createCanonicalEvent({
    eventId: 'group-origin-zurich', commandId: 'create-zurich', groupId: 'zurich-dinner',
    eventType: 'GROUP_CREATED', expectedVersion: 0, parentEventId: null,
    actorId: 'mina', actorAccountPublicKeyHex: minaAccount, actorRole: 'organizer',
    occurredAt: '2026-08-12T12:00:00.000Z',
    payload: {name: 'Zurich dinner', mode: 'normal_pot', organizerId: 'mina', members: [
      {
        participantId: 'mina', accountPublicKeyHex: minaAccount, role: 'organizer', active: true,
        acceptedAt: '2026-08-12T12:00:00.000Z', invitationId: 'group-origin-zurich', keyVersion: 1,
        groupKeyEnvelopeId: `sha256:${'aa'.repeat(32)}`,
      },
    ]},
  }, {sign: async data => sr25519Sign(data, mina)});
  const bootstrap = await createOriginBoundRecipientBootstrap({
    invitationEvent: event, organizerGroupEvent, returnRoomId: 'friends-room', signer,
  });
  assert.equal(await verifyRecipientBoundBootstrap({
    bootstrap, expectedRecipientAccountPublicKeyHex: leoAccount,
    now: '2026-08-12T12:02:00.000Z',
  }), true);
  assert.deepEqual(organizerGrantFromVerifiedBootstrap(bootstrap), {
    groupId: 'zurich-dinner', participantId: 'mina', accountPublicKeyHex: minaAccount,
    role: 'organizer', acceptedAt: '2026-08-12T12:00:00.000Z',
    invitationId: 'group-origin-zurich', keyVersion: 1,
    groupKeyEnvelopeId: `sha256:${'aa'.repeat(32)}`,
  });
  assert.equal(await verifyRecipientBoundBootstrap({
    bootstrap: {...bootstrap, organizerGroupEvent: {...organizerGroupEvent, groupId: 'another-group'}},
    expectedRecipientAccountPublicKeyHex: leoAccount,
  }), false);

  const incompleteOrigin = structuredClone(organizerGroupEvent);
  const members = (incompleteOrigin.payload as unknown as {members: Array<Record<string, unknown>>}).members;
  delete members[0].groupKeyEnvelopeId;
  await assert.rejects(() => createOriginBoundRecipientBootstrap({
    invitationEvent: event, organizerGroupEvent: incompleteOrigin,
    returnRoomId: 'friends-room', signer,
  }), /organizer proof/u);
});

async function invitation(): Promise<{
  event: SignedMembershipEventV1;
  signer: AccountMessageSigner;
  leoAccount: string;
  mina: ReturnType<typeof sr25519PairFromSeed>;
  minaAccount: string;
}> {
  await cryptoWaitReady();
  const mina = sr25519PairFromSeed(new Uint8Array(32).fill(11));
  const signer: AccountMessageSigner = {signBytes: async data => sr25519Sign(data, mina)};
  const minaAccount = `0x${Buffer.from(mina.publicKey).toString('hex')}`;
  const event = await createSignedMembershipEvent({
    eventId: 'event-link-nina', actorId: 'mina',
    actorAccountPublicKeyHex: minaAccount,
    occurredAt: '2026-08-12T12:01:00.000Z',
    event: {type: 'INVITATION_CREATED', invitation: {
      invitationId: 'invite-leo', groupId: 'zurich-dinner', inviterId: 'mina', inviteeId: 'leo',
      inviteeAccountPublicKeyHex: `0x${'22'.repeat(32)}`,
      role: 'member', route: 'join_link', status: 'invited',
      createdAt: '2026-08-12T12:01:00.000Z', expiresAt,
    }},
    signer,
  });
  return {event, signer, leoAccount: `0x${'22'.repeat(32)}`, mina, minaAccount};
}
