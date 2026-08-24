import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createCanonicalEvent,
  type CanonicalSigner,
  type CanonicalVerifier,
} from '../core/moneyEventKernel.ts';
import {createAccountBoundGroupKeyEnvelope, type AccountEntropyProvider} from '../environment/accountBoundKeyEnvelope.ts';
import {
  ArrayLaterEventSource,
  GroupRecoveryService,
  MemoryCheckpointArchive,
  MemoryRecoveryLocatorStore,
  type RecoveryLocatorV1,
} from './groupRecovery.ts';
import {
  MemoryRecoveryHeadIndexPort,
  RecoveryHeadLocatorGuard,
  recoveryLocatorDigest,
} from './recoveryLocatorHeadGuard.ts';
import {createProductionGroupRecovery, deriveRecoveryHeadStream} from './productionRecoveryComposition.ts';

const minaKey = `0x${'11'.repeat(32)}`;
const leoKey = `0x${'22'.repeat(32)}`;
const owner = `0x${'33'.repeat(20)}` as const;
const stream = `0x${'44'.repeat(32)}` as const;
const productId = 'app.chopdot.dot';
const groupKey = new Uint8Array(32).fill(7);
const context = {groupId: 'g-dinner', participantId: 'leo', accountPublicKeyHex: leoKey};
const signer: CanonicalSigner = {sign: digest};
const verify: CanonicalVerifier = async (bytes, signature) => (
  Buffer.from(await digest(bytes)).equals(Buffer.from(signature))
);

function locator(checkpointVersion: number): RecoveryLocatorV1 {
  return {
    v: 1,
    groupId: 'g-dinner',
    participantId: 'leo',
    accountPublicKeyHex: leoKey,
    keyVersion: 2,
    checkpointRef: `sha256:${String(checkpointVersion).padStart(64, '0')}`,
    checkpointVersion,
    checkpointStateHash: `0x${'55'.repeat(32)}`,
    frontierHash: `0x${'66'.repeat(32)}`,
    publishedAt: `2026-08-23T12:0${checkpointVersion}:00.000Z`,
    issuerAccountPublicKeyHex: minaKey,
    signatureHex: `0x${'77'.repeat(32)}`,
  };
}

test('RecoveryHeadLocatorGuard advances once, is idempotent, and rejects a stale locator', async () => {
  const port = new MemoryRecoveryHeadIndexPort();
  const guard = new RecoveryHeadLocatorGuard({port, ownerAddress: owner, stream, context});
  const first = locator(1);
  await guard.publish(first);
  assert.deepEqual(await port.readHead(owner, stream), {sequence: 1n, digest: await recoveryLocatorDigest(first)});
  await guard.publish(first);
  assert.equal((await port.readHead(owner, stream)).sequence, 1n);
  await guard.assertCurrent(first);

  const second = locator(2);
  await guard.publish(second);
  assert.equal((await port.readHead(owner, stream)).sequence, 2n);
  await assert.rejects(() => guard.assertCurrent(first), /latest published recovery head/u);
  await guard.assertCurrent(second);
});

test('GroupRecoveryService publishes and verifies the locator through the head guard', async () => {
  const event = await createCanonicalEvent({
    eventId: '01-create',
    commandId: 'create-group',
    groupId: 'g-dinner',
    expectedVersion: 0,
    parentEventId: null,
    actorId: 'mina',
    actorAccountPublicKeyHex: minaKey,
    actorRole: 'organizer',
    eventType: 'GROUP_CREATED',
    payload: {
      name: 'Zurich Dinner',
      organizerId: 'mina',
      members: [
        {participantId: 'mina', accountPublicKeyHex: minaKey, role: 'organizer'},
        {participantId: 'leo', accountPublicKeyHex: leoKey, role: 'member'},
      ],
    },
    occurredAt: '2026-08-23T12:00:00.000Z',
  }, signer);
  const archive = new MemoryCheckpointArchive();
  const locators = new MemoryRecoveryLocatorStore();
  const port = new MemoryRecoveryHeadIndexPort();
  const head = new RecoveryHeadLocatorGuard({port, ownerAddress: owner, stream, context});
  const service = new GroupRecoveryService({
    archive,
    locators,
    laterEvents: new ArrayLaterEventSource([]),
    verifyEvent: verify,
    verifyCheckpoint: verify,
    head,
  });
  const keyEnvelope = await createAccountBoundGroupKeyEnvelope({
    productId,
    groupId: 'g-dinner',
    recipientId: 'leo',
    recipientAccountPublicKeyHex: leoKey,
    keyVersion: 2,
  }, groupKey, entropy('leo-account'));
  const published = await service.publish({
    acceptedEvents: [event],
    groupKey,
    keyVersion: 2,
    issuerId: 'mina',
    issuerAccountPublicKeyHex: minaKey,
    recipientId: 'leo',
    recipientAccountPublicKeyHex: leoKey,
    recipientKeyEnvelope: keyEnvelope,
    createdAt: '2026-08-23T12:01:00.000Z',
    signer,
  });
  assert.deepEqual(published.locator.keyEnvelope, keyEnvelope);
  assert.equal((await port.readHead(owner, stream)).digest, await recoveryLocatorDigest(published.locator));
  const recovered = await service.recover({
    productId,
    groupId: 'g-dinner',
    participantId: 'leo',
    accountPublicKeyHex: leoKey,
    minimumKeyVersion: 2,
    entropy: entropy('leo-account'),
  });
  assert.equal(recovered.state.version, 1);

  locators.replace({...published.locator, checkpointRef: `sha256:${'aa'.repeat(32)}`});
  await assert.rejects(() => service.recover({
    productId,
    groupId: 'g-dinner',
    participantId: 'leo',
    accountPublicKeyHex: leoKey,
    minimumKeyVersion: 2,
    keyEnvelope,
    entropy: entropy('leo-account'),
  }), /latest published recovery head/u);
});

test('production recovery factory requires derived owner binding and an exact account/group stream', async () => {
  const port = new MemoryRecoveryHeadIndexPort();
  const derivedInputs: unknown[] = [];
  const archive = new MemoryCheckpointArchive();
  const locators = new MemoryRecoveryLocatorStore();
  const production = await createProductionGroupRecovery({
    context,
    port,
    ownerAddresses: {async derive(input) {
      derivedInputs.push(input);
      return owner;
    }},
    archive,
    locators,
    locatorReferences: {referenceFor: recoveryLocatorDigest},
    laterEvents: new ArrayLaterEventSource([]),
    verifyEvent: verify,
    verifyCheckpoint: verify,
  });
  assert.deepEqual(derivedInputs, [{genesisHash: port.genesisHash, accountPublicKeyHex: leoKey}]);
  assert.equal(production.ownerAddress, owner);
  assert.equal(production.stream, await deriveRecoveryHeadStream(port.genesisHash, context));
  assert.notEqual(production.stream, await deriveRecoveryHeadStream(port.genesisHash, {...context, groupId: 'another-group'}));
  assert.notEqual(production.stream, await deriveRecoveryHeadStream(port.genesisHash, {...context, participantId: 'nina'}));
  await assert.rejects(() => production.guard.publish({...locator(1), groupId: 'another-group'}), /bound recovery head context/u);

  await assert.rejects(() => createProductionGroupRecovery({
    context,
    port,
    ownerAddresses: {async derive() { return 'not-an-owner' as never; }},
    archive,
    locators,
    locatorReferences: {referenceFor: recoveryLocatorDigest},
    laterEvents: new ArrayLaterEventSource([]),
    verifyEvent: verify,
    verifyCheckpoint: verify,
  }), /owner binding/u);
});

async function digest(bytes: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}

function entropy(label: string): AccountEntropyProvider {
  return {deriveAccountEntropy: async context => digest(new Uint8Array([...new TextEncoder().encode(label), ...context]))};
}
