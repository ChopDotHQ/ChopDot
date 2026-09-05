import assert from 'node:assert/strict';
import test from 'node:test';
import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import {projectCanonicalEvents, createCanonicalEvent} from '../core/moneyEventKernel.ts';
import {verifyParticipantSignature} from '../core/authority/browserAuthority.ts';
import type {PolkadotHostBridge, PolkadotHostIdentity} from '../environment/polkadotHostBridge.ts';
import type {KeyValueStorage} from '../environment/livePayerSync.ts';
import {DurableMembershipKeyEnvelopeRegistry} from '../membership/membershipKeyEnvelopeRegistry.ts';
import type {BulletinBlobPort} from './bulletinRecoveryStorage.ts';
import type {Bytes32} from './recoveryHeadIndex.ts';
import {MemoryRecoveryHeadIndexPort} from './recoveryLocatorHeadGuard.ts';
import {ProductionRecoveryCoordinator} from './productionRecoveryCoordinator.ts';

class MemoryStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();
  read(key: string) { return this.values.get(key) ?? null; }
  write(key: string, value: string) { this.values.set(key, value); }
  remove(key: string) { this.values.delete(key); }
}

class MemoryBulletin implements BulletinBlobPort {
  readonly values = new Map<Bytes32, Uint8Array>();
  async submit(value: Uint8Array): Promise<Bytes32> {
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', value));
    const ref = `0x${Buffer.from(digest).toString('hex')}` as Bytes32;
    this.values.set(ref, new Uint8Array(value));
    return ref;
  }
  async lookup(ref: Bytes32): Promise<Uint8Array | null> {
    const value = this.values.get(ref);
    return value ? new Uint8Array(value) : null;
  }
}

test('an active member publishes and recovers from a fresh device without a local envelope registry', async () => {
  await cryptoWaitReady();
  const pair = sr25519PairFromSeed(new Uint8Array(32).fill(31));
  const publicKeyHex = `0x${Buffer.from(pair.publicKey).toString('hex')}` as const;
  const productId = 'chopdotapp01.dot';
  const participantId = 'mina.dot';
  const groupId = 'group-recovery';
  const groupKey = new Uint8Array(32).fill(9);
  const entropy = entropyBridge('same-account');
  const registry = new DurableMembershipKeyEnvelopeRegistry({
    productId,
    participantId,
    accountPublicKeyHex: publicKeyHex,
    storage: new MemoryStorage(),
    entropy,
  });
  const record = await registry.stageRecipientBinding({
    groupId,
    keyVersion: 1,
    groupKey,
    acknowledgedAt: '2026-08-23T12:00:00.000Z',
    signer: {signBytes: async bytes => sr25519Sign(bytes, pair)},
  });
  const event = await createCanonicalEvent({
    eventId: 'event-origin',
    commandId: 'command-origin',
    groupId,
    expectedVersion: 0,
    parentEventId: null,
    actorId: participantId,
    actorAccountPublicKeyHex: publicKeyHex,
    actorRole: 'organizer',
    eventType: 'GROUP_CREATED',
    payload: {
      name: 'Recovery dinner',
      organizerId: participantId,
      members: [{
        participantId,
        accountPublicKeyHex: publicKeyHex,
        role: 'organizer',
        active: true,
        acceptedAt: '2026-08-23T12:00:00.000Z',
        invitationId: 'group-origin:event-origin',
        keyVersion: 1,
        groupKeyEnvelopeId: record.binding.groupKeyEnvelopeId,
      }],
    },
    occurredAt: '2026-08-23T12:00:00.000Z',
  }, {sign: async bytes => sr25519Sign(bytes, pair)});
  const projected = await projectCanonicalEvents([event], verifyParticipantSignature);
  assert.equal(projected.state.version, 1);
  const identity: PolkadotHostIdentity = {
    username: participantId,
    productId,
    publicKey: pair.publicKey,
    accountId: ['5Fake', 42],
    signBytes: async bytes => sr25519Sign(bytes, pair),
  };
  const port = new MemoryRecoveryHeadIndexPort();
  const bulletin = new MemoryBulletin();
  const ownerAddress = `0x${'ab'.repeat(20)}` as const;
  const runtime = () => Promise.resolve({
    genesisHash: port.genesisHash,
    ownerAddress,
    accountPublicKeyHex: publicKeyHex,
    port,
    close() {},
  });
  const publisher = new ProductionRecoveryCoordinator({
    productId,
    identity,
    bridge: entropy,
    authority: {
      readCanonicalGroup: async () => projected.state,
      readAcceptedEvents: async () => [event],
    },
    keyEnvelopes: registry,
    headRuntime: runtime,
    bulletin: async () => bulletin,
  });
  const published = await publisher.publish(groupId);
  assert.deepEqual(published.locator.keyEnvelope, record.envelope);

  const freshDevice = new ProductionRecoveryCoordinator({
    productId,
    identity,
    bridge: entropy,
    authority: {readCanonicalGroup: async () => null, readAcceptedEvents: async () => []},
    headRuntime: runtime,
    bulletin: async () => bulletin,
  });
  const recovered = await freshDevice.recover(groupId);
  assert.equal(recovered.stateHash, projected.stateHash);
  assert.deepEqual(recovered.events, [event]);
  assert.equal(recovered.state.name, 'Recovery dinner');

  const wrongAccountEntropy = new ProductionRecoveryCoordinator({
    productId,
    identity,
    bridge: entropyBridge('wrong-account'),
    authority: {readCanonicalGroup: async () => null, readAcceptedEvents: async () => []},
    headRuntime: runtime,
    bulletin: async () => bulletin,
  });
  await assert.rejects(() => wrongAccountEntropy.recover(groupId), /could not be opened/u);
});

function entropyBridge(label: string): PolkadotHostBridge {
  return {
    deriveAccountEntropy: async (context: Uint8Array) => new Uint8Array(await crypto.subtle.digest(
      'SHA-256',
      new Uint8Array([...new TextEncoder().encode(label), ...context]),
    )),
  } as unknown as PolkadotHostBridge;
}
