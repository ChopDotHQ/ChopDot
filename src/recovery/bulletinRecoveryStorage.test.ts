import assert from 'node:assert/strict';
import test from 'node:test';
import {canonicalJson, sha256Hex} from '../core/canonical.ts';
import type {AccountEntropyProvider} from '../environment/accountBoundKeyEnvelope.ts';
import type {EncryptedGroupCheckpointV1} from './encryptedGroupCheckpoint.ts';
import type {RecoveryLocatorV1} from './groupRecovery.ts';
import {
  BulletinCheckpointArchive,
  EncryptedBulletinRecoveryLocatorStore,
  type BulletinBlobPort,
} from './bulletinRecoveryStorage.ts';
import type {Bytes32} from './recoveryHeadIndex.ts';
import {MemoryRecoveryHeadIndexPort, RecoveryHeadLocatorGuard} from './recoveryLocatorHeadGuard.ts';

const account = `0x${'22'.repeat(32)}`;
const issuer = `0x${'11'.repeat(32)}`;
const owner = `0x${'33'.repeat(20)}`;
const stream = `0x${'44'.repeat(32)}` as Bytes32;
const context = {groupId: 'private-group-id', participantId: 'leo.dot', accountPublicKeyHex: account};

test('encrypted Bulletin locator is discoverable from the account-owned head on a fresh device', async () => {
  const blobs = new MemoryBulletin();
  const port = new MemoryRecoveryHeadIndexPort();
  const first = store({blobs, port, entropy: entropy('same-account')});
  const value = locator(3);
  await first.put(value);
  const reference = await first.referenceFor(value);
  const raw = blobs.read(reference);
  assert.ok(raw);
  assert.equal(new TextDecoder().decode(raw!).includes(context.groupId), false);
  assert.equal(new TextDecoder().decode(raw!).includes(context.participantId), false);

  const guard = new RecoveryHeadLocatorGuard({
    port,
    ownerAddress: owner,
    stream,
    context,
    locatorReferences: first,
  });
  await guard.publish(value);
  assert.deepEqual(await port.readHead(owner, stream), {sequence: 1n, digest: reference});

  const freshDevice = store({blobs, port, entropy: entropy('same-account')});
  assert.deepEqual(await freshDevice.get(context.groupId, context.participantId, account), value);
  assert.equal(await freshDevice.referenceFor(value), reference);
  const freshGuard = new RecoveryHeadLocatorGuard({
    port,
    ownerAddress: owner,
    stream,
    context,
    locatorReferences: freshDevice,
  });
  await freshGuard.assertCurrent(value);
});

test('Bulletin recovery uses one bounded host selector while retaining full account and group binding', async () => {
  const blobs = new MemoryBulletin();
  const port = new MemoryRecoveryHeadIndexPort();
  const selectors: Uint8Array[] = [];
  const boundedEntropy: AccountEntropyProvider = {
    deriveAccountEntropy: async value => {
      selectors.push(new Uint8Array(value));
      assert.equal(value.byteLength, 32);
      return new Uint8Array(await crypto.subtle.digest('SHA-256', value));
    },
  };
  const subject = store({blobs, port, entropy: boundedEntropy});
  const value = locator(3);
  await subject.put(value);
  const reference = await subject.referenceFor(value);
  await new RecoveryHeadLocatorGuard({
    port,
    ownerAddress: owner,
    stream,
    context,
    locatorReferences: subject,
  }).publish(value);
  assert.deepEqual(await subject.get(context.groupId, context.participantId, account), value);
  assert.equal(selectors.length >= 2, true);
  assert.equal(selectors.every(selector => selector.byteLength === 32), true);
  assert.equal(selectors.every(selector => Buffer.from(selector).equals(Buffer.from(selectors[0]))), true);
  assert.ok(blobs.read(reference));
});

test('wrong account entropy, context mismatch, and locator rollback fail closed', async () => {
  const blobs = new MemoryBulletin();
  const port = new MemoryRecoveryHeadIndexPort();
  const original = store({blobs, port, entropy: entropy('same-account')});
  const current = locator(4);
  await original.put(current);
  await new RecoveryHeadLocatorGuard({
    port,
    ownerAddress: owner,
    stream,
    context,
    locatorReferences: original,
  }).publish(current);

  const wrongEntropy = store({blobs, port, entropy: entropy('other-account')});
  await assert.rejects(
    () => wrongEntropy.get(context.groupId, context.participantId, account),
    /could not be opened/u,
  );
  await assert.rejects(
    () => original.get('forwarded-group', context.participantId, account),
    /does not match this account and group/u,
  );
  await assert.rejects(() => original.put(locator(2)), /rollback rejected/u);
});

test('encrypted checkpoint bytes round-trip through one exact Bulletin reference', async () => {
  const blobs = new MemoryBulletin();
  const archive = new BulletinCheckpointArchive(blobs);
  const checkpoint: EncryptedGroupCheckpointV1 = {
    v: 1,
    alg: 'A256GCM',
    groupId: context.groupId,
    issuerId: 'mina.dot',
    issuerAccountPublicKeyHex: issuer,
    keyVersion: 1,
    projectionVersion: 1,
    sourceEventIds: ['event-1'],
    frontierHash: `0x${'55'.repeat(32)}`,
    stateHash: `0x${'66'.repeat(32)}`,
    createdAt: '2026-08-23T12:00:00.000Z',
    iv: 'AAAAAAAAAAAAAAAA',
    ciphertext: 'BBBBBBBBBBBBBBBBBBBBBBBB',
    signatureHex: `0x${'77'.repeat(64)}`,
  };
  const ref = await archive.put(checkpoint);
  assert.match(ref, /^bulletin:0x[0-9a-f]{64}$/u);
  assert.deepEqual(await archive.get(ref), checkpoint);
  assert.equal(await archive.get(`bulletin:0x${'00'.repeat(32)}`), null);
});

function store(input: {blobs: BulletinBlobPort; port: MemoryRecoveryHeadIndexPort; entropy: AccountEntropyProvider}) {
  return new EncryptedBulletinRecoveryLocatorStore({
    productId: 'chopdotapp01.dot',
    context,
    ownerAddress: owner,
    stream,
    port: input.port,
    blobs: input.blobs,
    entropy: input.entropy,
  });
}

function locator(checkpointVersion: number): RecoveryLocatorV1 {
  return {
    v: 1,
    groupId: context.groupId,
    participantId: context.participantId,
    accountPublicKeyHex: context.accountPublicKeyHex,
    keyVersion: 1,
    checkpointRef: `bulletin:0x${String(checkpointVersion).padStart(64, '0')}`,
    checkpointVersion,
    checkpointStateHash: `0x${'55'.repeat(32)}`,
    frontierHash: `0x${'66'.repeat(32)}`,
    publishedAt: `2026-08-23T12:0${checkpointVersion}:00.000Z`,
    issuerAccountPublicKeyHex: issuer,
    signatureHex: `0x${'77'.repeat(64)}`,
  };
}

function entropy(label: string): AccountEntropyProvider {
  return {
    deriveAccountEntropy: async value => new Uint8Array(await crypto.subtle.digest(
      'SHA-256',
      new Uint8Array([...new TextEncoder().encode(label), ...value]),
    )),
  };
}

class MemoryBulletin implements BulletinBlobPort {
  private readonly values = new Map<Bytes32, Uint8Array>();

  async submit(value: Uint8Array): Promise<Bytes32> {
    const ref = (await sha256Hex(value)) as Bytes32;
    this.values.set(ref, new Uint8Array(value));
    return ref;
  }

  async lookup(ref: Bytes32): Promise<Uint8Array | null> {
    const value = this.values.get(ref);
    return value ? new Uint8Array(value) : null;
  }

  read(ref: Bytes32): Uint8Array | null {
    return this.values.get(ref) ?? null;
  }
}
