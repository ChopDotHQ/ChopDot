import assert from 'node:assert/strict';
import test from 'node:test';
import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import {createAccountBoundGroupKeyEnvelope, type AccountEntropyProvider} from '../environment/accountBoundKeyEnvelope.ts';
import type {KeyValueStorage} from '../environment/livePayerSync.ts';
import type {AccountMessageSigner} from '../membership/groupKeyHandoff.ts';
import {
  SOCIAL_REGRANT_MEMBERSHIP_STEPS,
  SocialRegrantNonceLedger,
  createEncryptedRecoveryKit,
  createSocialRegrantRequest,
  openEncryptedRecoveryKit,
  socialRegrantBoundary,
  verifySocialRegrantRequest,
  type RecoveryKitPayloadV1,
} from './recoveryKit.ts';

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  read(key: string) { return this.values.get(key) ?? null; }
  write(key: string, value: string) { this.values.set(key, value); }
  remove(key: string) { this.values.delete(key); }
}

const oldAccount = `0x${'11'.repeat(32)}`;
const groupKey = new Uint8Array(32).fill(9);
let newAccountPair: ReturnType<typeof sr25519PairFromSeed>;

test.before(async () => {
  await cryptoWaitReady();
  newAccountPair = sr25519PairFromSeed(new Uint8Array(32).fill(22));
});

function newAccount(): string {
  return `0x${Buffer.from(newAccountPair.publicKey).toString('hex')}`;
}

function signer(pair: ReturnType<typeof sr25519PairFromSeed>): AccountMessageSigner {
  return {signBytes: async bytes => sr25519Sign(bytes, pair)};
}

async function payload(): Promise<RecoveryKitPayloadV1> {
  const keyEnvelope = await createAccountBoundGroupKeyEnvelope({
    productId: 'app.chopdot.dot',
    groupId: 'g-dinner',
    recipientId: 'mina',
    recipientAccountPublicKeyHex: oldAccount,
    keyVersion: 2,
  }, groupKey, entropy('mina-account'));
  return {
    v: 1,
    ownerAccountPublicKeyHex: oldAccount,
    createdAt: '2026-08-23T12:00:00.000Z',
    entries: [{
      productId: 'app.chopdot.dot',
      groupId: 'g-dinner',
      participantId: 'mina',
      accountPublicKeyHex: oldAccount,
      keyVersion: 2,
      keyEnvelope,
      locator: {
        v: 1,
        groupId: 'g-dinner',
        participantId: 'mina',
        accountPublicKeyHex: oldAccount,
        keyVersion: 2,
        checkpointRef: `sha256:${'33'.repeat(32)}`,
        checkpointVersion: 4,
        checkpointStateHash: `0x${'44'.repeat(32)}`,
        frontierHash: `0x${'55'.repeat(32)}`,
        publishedAt: '2026-08-23T12:00:00.000Z',
        issuerAccountPublicKeyHex: oldAccount,
        signatureHex: `0x${'66'.repeat(32)}`,
      },
    }],
  };
}

test('optional recovery kit encrypts account-bound envelopes and locator data without raw group keys', async () => {
  const source = await payload();
  const kit = await createEncryptedRecoveryKit({payload: source, passphrase: 'correct horse battery staple'});
  const serialized = JSON.stringify(kit);
  assert.equal(serialized.includes('g-dinner'), false);
  assert.equal(serialized.includes(oldAccount), false);
  assert.equal(serialized.includes(Buffer.from(groupKey).toString('base64')), false);
  assert.deepEqual(await openEncryptedRecoveryKit({
    kit,
    passphrase: 'correct horse battery staple',
    expectedAccountPublicKeyHex: oldAccount,
  }), source);
});

test('wrong passphrase, wrong account, metadata mismatch, and weak passphrase fail closed', async () => {
  const source = await payload();
  const kit = await createEncryptedRecoveryKit({payload: source, passphrase: 'correct horse battery staple'});
  await assert.rejects(() => openEncryptedRecoveryKit({
    kit, passphrase: 'another passphrase value', expectedAccountPublicKeyHex: oldAccount,
  }), /could not be opened/u);
  await assert.rejects(() => openEncryptedRecoveryKit({
    kit, passphrase: 'correct horse battery staple', expectedAccountPublicKeyHex: newAccount(),
  }), /does not belong/u);
  await assert.rejects(() => createEncryptedRecoveryKit({
    payload: {...source, entries: [{...source.entries[0], participantId: 'leo'}]},
    passphrase: 'correct horse battery staple',
  }), /does not match/u);
  await assert.rejects(() => createEncryptedRecoveryKit({payload: source, passphrase: 'too short'}), /12 characters/u);
});

test('a social re-grant request proves only the requested new account and carries no membership authority', async () => {
  const request = await createSocialRegrantRequest({
    requestId: 'regrant-mina',
    groupId: 'g-dinner',
    participantId: 'mina',
    priorAccountPublicKeyHex: oldAccount,
    requestedAccountPublicKeyHex: newAccount(),
    nonce: 'fresh-device-nonce',
    createdAt: '2026-08-23T12:00:00.000Z',
    expiresAt: '2026-08-24T12:00:00.000Z',
    signer: signer(newAccountPair),
  });
  assert.equal(await verifySocialRegrantRequest(request, '2026-08-23T12:05:00.000Z'), true);
  assert.equal(await verifySocialRegrantRequest({...request, participantId: 'leo'}, '2026-08-23T12:05:00.000Z'), false);
  assert.equal(await verifySocialRegrantRequest(request, request.expiresAt), false);
  assert.deepEqual(socialRegrantBoundary(request), {
    requestId: 'regrant-mina',
    authority: 'none',
    preservesPriorSignatures: true,
    steps: SOCIAL_REGRANT_MEMBERSHIP_STEPS,
  });
});

test('social re-grant rejects a request that keeps the prior account', async () => {
  await assert.rejects(() => createSocialRegrantRequest({
    requestId: 'same-account',
    groupId: 'g-dinner',
    participantId: 'mina',
    priorAccountPublicKeyHex: newAccount(),
    requestedAccountPublicKeyHex: newAccount(),
    nonce: 'nonce',
    createdAt: '2026-08-23T12:00:00.000Z',
    expiresAt: '2026-08-24T12:00:00.000Z',
    signer: signer(newAccountPair),
  }), /different account/u);
});

test('social re-grant nonce is consumed once and corrupt replay state fails closed', async () => {
  const request = await createSocialRegrantRequest({
    requestId: 'regrant-once', groupId: 'g-dinner', participantId: 'mina',
    priorAccountPublicKeyHex: oldAccount, requestedAccountPublicKeyHex: newAccount(),
    nonce: 'one-use-nonce', createdAt: '2026-08-23T12:00:00.000Z',
    expiresAt: '2026-08-24T12:00:00.000Z', signer: signer(newAccountPair),
  });
  const storage = new MemoryStorage();
  const ledger = new SocialRegrantNonceLedger(storage, 'regrant-ledger');
  assert.equal(await ledger.consume({request, now: '2026-08-23T12:01:00.000Z'}), 'consumed');
  assert.equal(ledger.isConsumed(request), true);
  assert.equal(await ledger.consume({request, now: '2026-08-23T12:02:00.000Z'}), 'replay');
  storage.write('regrant-ledger', '{broken-json');
  assert.throws(() => ledger.isConsumed(request), /ledger is corrupt/u);
});

async function digest(bytes: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}

function entropy(label: string): AccountEntropyProvider {
  return {deriveAccountEntropy: async context => digest(new Uint8Array([...new TextEncoder().encode(label), ...context]))};
}
