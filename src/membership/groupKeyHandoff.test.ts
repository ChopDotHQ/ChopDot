import assert from 'node:assert/strict';
import test from 'node:test';
import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import {
  createGroupKeyHandoff,
  createMembershipAcceptance,
  openGroupKeyHandoff,
  verifyProductAccountSignature,
  type AccountMessageSigner,
  type AccountMessageVerifier,
  type GroupKeyHandoffV1,
} from './groupKeyHandoff.ts';

const leoAccount = `0x${'22'.repeat(32)}`;
const minaAccount = `0x${'11'.repeat(32)}`;
const expiresAt = '2099-08-13T12:00:00.000Z';

function signatureFor(account: string, data: Uint8Array): Promise<Uint8Array> {
  return crypto.subtle.digest('SHA-512', new Uint8Array([
    ...new TextEncoder().encode(account),
    ...data,
  ])).then(value => new Uint8Array(value));
}

function signer(account: string): AccountMessageSigner {
  return {signBytes: data => signatureFor(account, data)};
}

const verifier: AccountMessageVerifier = async (account, data, signature) => {
  const expected = await signatureFor(account, data);
  return expected.byteLength === signature.byteLength && expected.every((byte, index) => byte === signature[index]);
};

function key(): Uint8Array {
  return Uint8Array.from({length: 32}, (_, index) => index + 1);
}

async function ceremony() {
  const pending = await createMembershipAcceptance({
    invitationId: 'invite-leo', groupId: 'zurich-dinner', recipientId: 'leo',
    recipientAccountPublicKeyHex: leoAccount, nonce: 'nonce-1', expiresAt, signer: signer(leoAccount),
  });
  const handoff = await createGroupKeyHandoff({
    acceptance: pending.acceptance,
    verifyRecipient: verifier,
    groupKeyEnvelopeId: 'leo-envelope-v1',
    organizerId: 'mina', organizerAccountPublicKeyHex: minaAccount,
    role: 'member', keyVersion: 1, groupKey: key(),
    createdAt: '2026-08-12T12:05:00.000Z', expiresAt,
    signer: signer(minaAccount),
  });
  return {pending, handoff};
}

test('accepted recipient and authorized organizer exchange one group key', async () => {
  const {pending, handoff} = await ceremony();
  assert.equal(pending.recipientPrivateKey.extractable, false);
  const recovered = await openGroupKeyHandoff({
    pending, handoff, expectedOrganizerAccountPublicKeyHex: minaAccount,
    verifyOrganizer: verifier, now: '2026-08-12T12:06:00.000Z',
  });
  assert.deepEqual(recovered, key());
  assert.equal(JSON.stringify(pending.acceptance).includes(Array.from(key()).join(',')), false);
});

test('real sr25519 Product Account signatures authenticate both sides of the handoff', async () => {
  await cryptoWaitReady();
  const leoPair = sr25519PairFromSeed(new Uint8Array(32).fill(22));
  const minaPair = sr25519PairFromSeed(new Uint8Array(32).fill(11));
  const accountHex = (publicKey: Uint8Array) => `0x${Buffer.from(publicKey).toString('hex')}`;
  const productSigner = (pair: {publicKey: Uint8Array; secretKey: Uint8Array}): AccountMessageSigner => ({
    signBytes: async data => sr25519Sign(data, pair),
  });
  const pending = await createMembershipAcceptance({
    invitationId: 'invite-real-sig', groupId: 'zurich-dinner', recipientId: 'leo',
    recipientAccountPublicKeyHex: accountHex(leoPair.publicKey), nonce: 'nonce-real', expiresAt,
    signer: productSigner(leoPair),
  });
  const handoff = await createGroupKeyHandoff({
    acceptance: pending.acceptance,
    verifyRecipient: verifyProductAccountSignature,
    groupKeyEnvelopeId: 'leo-envelope-v1',
    organizerId: 'mina', organizerAccountPublicKeyHex: accountHex(minaPair.publicKey),
    role: 'member', keyVersion: 1, groupKey: key(),
    createdAt: '2026-08-12T12:05:00.000Z', expiresAt,
    signer: productSigner(minaPair),
  });
  assert.deepEqual(await openGroupKeyHandoff({
    pending,
    handoff,
    expectedOrganizerAccountPublicKeyHex: accountHex(minaPair.publicKey),
    verifyOrganizer: verifyProductAccountSignature,
    now: '2026-08-12T12:06:00.000Z',
  }), key());
});

test('wrong recipient account or substituted ECDH key invalidates acceptance', async () => {
  const {pending} = await ceremony();
  await assert.rejects(() => createGroupKeyHandoff({
    acceptance: {...pending.acceptance, recipientAccountPublicKeyHex: `0x${'33'.repeat(32)}`},
    verifyRecipient: verifier, groupKeyEnvelopeId: 'leo-envelope-v1',
    organizerId: 'mina', organizerAccountPublicKeyHex: minaAccount,
    role: 'member', keyVersion: 1, groupKey: key(), createdAt: '2026-08-12T12:05:00.000Z', expiresAt,
    signer: signer(minaAccount),
  }), /acceptance could not be verified/u);

  const replacement = await crypto.subtle.generateKey({name: 'ECDH', namedCurve: 'P-256'}, false, ['deriveBits']);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', replacement.publicKey));
  const encoded = Buffer.from(raw).toString('base64url');
  await assert.rejects(() => createGroupKeyHandoff({
    acceptance: {...pending.acceptance, recipientEcdhPublicKey: encoded},
    verifyRecipient: verifier, groupKeyEnvelopeId: 'leo-envelope-v1',
    organizerId: 'mina', organizerAccountPublicKeyHex: minaAccount,
    role: 'member', keyVersion: 1, groupKey: key(), createdAt: '2026-08-12T12:05:00.000Z', expiresAt,
    signer: signer(minaAccount),
  }), /acceptance could not be verified/u);
});

test('wrong organizer and tampered handoff fail closed', async () => {
  const {pending, handoff} = await ceremony();
  await assert.rejects(() => openGroupKeyHandoff({
    pending, handoff, expectedOrganizerAccountPublicKeyHex: `0x${'44'.repeat(32)}`,
    verifyOrganizer: verifier,
  }), /could not be restored/u);

  const mutations: GroupKeyHandoffV1[] = [
    {...handoff, groupId: 'wrong-group'},
    {...handoff, groupKeyEnvelopeId: 'substituted-envelope'},
    {...handoff, keyVersion: 2},
    {...handoff, ciphertext: `${handoff.ciphertext.slice(0, -1)}${handoff.ciphertext.endsWith('A') ? 'B' : 'A'}`},
    {...handoff, signature: `0x${'00'.repeat(64)}`},
  ];
  for (const mutation of mutations) {
    await assert.rejects(() => openGroupKeyHandoff({
      pending, handoff: mutation, expectedOrganizerAccountPublicKeyHex: minaAccount,
      verifyOrganizer: verifier,
    }), /could not be restored/u);
  }
});

test('expired acceptance and handoff fail before key delivery', async () => {
  await assert.rejects(() => createMembershipAcceptance({
    invitationId: 'expired', groupId: 'g', recipientId: 'leo', recipientAccountPublicKeyHex: leoAccount,
    nonce: 'n', expiresAt: '2020-01-01T00:00:00.000Z', signer: signer(leoAccount),
  }), /expired/u);

  const {pending, handoff} = await ceremony();
  await assert.rejects(() => openGroupKeyHandoff({
    pending, handoff, expectedOrganizerAccountPublicKeyHex: minaAccount,
    verifyOrganizer: verifier, now: '2100-01-01T00:00:00.000Z',
  }), /expired/u);
});
