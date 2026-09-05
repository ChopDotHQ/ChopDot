import assert from 'node:assert/strict';
import test from 'node:test';
import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import type {AccountEntropyProvider} from '../environment/accountBoundKeyEnvelope.ts';
import type {KeyValueStorage} from '../environment/livePayerSync.ts';
import {DurableMembershipProtectedGroupKeySink} from './durableMembershipProtectedGroupKeySink.ts';
import {DurableMembershipKeyEnvelopeRegistry} from './membershipKeyEnvelopeRegistry.ts';

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  read(key: string) { return this.values.get(key) ?? null; }
  write(key: string, value: string) { this.values.set(key, value); }
  remove(key: string) { this.values.delete(key); }
}

test('durable recipient sink survives restart and re-opens the exact acknowledged key', async () => {
  const fixture = await createFixture();
  await fixture.first.save(fixture.handoff);
  assert.equal(await fixture.first.has(fixture.handoff), true);

  const record = await fixture.first.acknowledgedRecord(fixture.handoff);
  assert.ok(record);
  assert.equal(record.binding.participantId, 'leo');
  assert.equal(Object.hasOwn(record, 'groupKey'), false);
  assert.equal(Object.hasOwn(record.envelope, 'groupKey'), false);

  const recreatedRegistry = registry(fixture.storage, fixture.account, fixture.entropy);
  const recreated = sink(recreatedRegistry, fixture.account, fixture.signer);
  assert.equal(await recreated.has(fixture.handoff), true);
  assert.deepEqual(await recreated.openAcknowledged(fixture.handoff), fixture.handoff.groupKey);
  assert.deepEqual(await recreated.acknowledgedRecord(fixture.handoff), record);
});

test('durable recipient sink is idempotent for the same key and rejects a conflicting replay', async () => {
  const fixture = await createFixture();
  await fixture.first.save(fixture.handoff);
  const before = fixture.storage.read('chopdot-membership-key-envelope-registry-v1');
  await fixture.first.save({...fixture.handoff, groupKeyEnvelopeId: 'retried-transport-envelope'});
  assert.equal(fixture.storage.read('chopdot-membership-key-envelope-registry-v1'), before);

  await assert.rejects(
    () => fixture.first.save({...fixture.handoff, groupKey: new Uint8Array(32).fill(9)}),
    /conflicts with this handoff/u,
  );
  assert.deepEqual(await fixture.first.openAcknowledged(fixture.handoff), fixture.handoff.groupKey);
});

test('durable recipient sink rejects forwarding to another participant or account', async () => {
  const fixture = await createFixture();
  await assert.rejects(
    () => fixture.first.save({...fixture.handoff, participantId: 'nina'}),
    /does not belong/u,
  );
  await assert.rejects(
    () => fixture.first.save({...fixture.handoff, accountPublicKeyHex: `0x${'44'.repeat(32)}`}),
    /does not belong/u,
  );
  await assert.rejects(
    () => fixture.first.acknowledgedRecord({...fixture.handoff, participantId: 'nina'}),
    /does not belong/u,
  );
  assert.equal(await fixture.first.has({...fixture.handoff, participantId: 'nina'}), false);
});

test('durable recipient sink clears every temporary plaintext opened for validation', async () => {
  const openedExisting = new Uint8Array(32).fill(7);
  const openedStaged = new Uint8Array(32).fill(7);
  const binding = {
    participantId: 'leo',
    recipientAccountPublicKeyHex: `0x${'22'.repeat(32)}`,
    keyVersion: 1,
    groupKeyEnvelopeId: `sha256:${'33'.repeat(32)}`,
  };
  const record = {binding} as Awaited<ReturnType<DurableMembershipKeyEnvelopeRegistry['findAcknowledged']>> & {};
  let existing = true;
  const fakeRegistry = {
    async findAcknowledged() { return existing ? record : null; },
    async stageRecipientBinding() { return record; },
    async open() { return existing ? openedExisting : openedStaged; },
  } as unknown as DurableMembershipKeyEnvelopeRegistry;
  const account = binding.recipientAccountPublicKeyHex;
  const value = {
    groupId: 'zurich-dinner', participantId: 'leo', accountPublicKeyHex: account,
    keyVersion: 1, groupKeyEnvelopeId: 'transport-envelope-leo-v1',
    groupKey: new Uint8Array(32).fill(7),
  };
  const protectedSink = sink(fakeRegistry, account, {signBytes: async () => new Uint8Array(64)});

  await protectedSink.save(value);
  assert.deepEqual(openedExisting, new Uint8Array(32));
  existing = false;
  await protectedSink.save(value);
  assert.deepEqual(openedStaged, new Uint8Array(32));
});

async function createFixture() {
  await cryptoWaitReady();
  const pair = sr25519PairFromSeed(new Uint8Array(32).fill(22));
  const account = `0x${Buffer.from(pair.publicKey).toString('hex')}`;
  const signer = {signBytes: async (bytes: Uint8Array) => sr25519Sign(bytes, pair)};
  const storage = new MemoryStorage();
  const entropy = entropyProvider('leo-device');
  const firstRegistry = registry(storage, account, entropy);
  const first = sink(firstRegistry, account, signer);
  const handoff = {
    groupId: 'zurich-dinner', participantId: 'leo', accountPublicKeyHex: account,
    keyVersion: 1, groupKeyEnvelopeId: 'transport-envelope-leo-v1',
    groupKey: new Uint8Array(32).fill(7),
  };
  return {account, signer, storage, entropy, first, handoff};
}

function registry(storage: MemoryStorage, account: string, entropy: AccountEntropyProvider) {
  return new DurableMembershipKeyEnvelopeRegistry({
    productId: 'app.chopdot.dot', participantId: 'leo', accountPublicKeyHex: account,
    storage, entropy,
  });
}

function sink(
  durableRegistry: DurableMembershipKeyEnvelopeRegistry,
  account: string,
  signer: {signBytes(bytes: Uint8Array): Promise<Uint8Array>},
) {
  return new DurableMembershipProtectedGroupKeySink({
    registry: durableRegistry,
    actor: {participantId: 'leo', accountPublicKeyHex: account, signer},
    now: () => '2026-08-23T12:03:00.000Z',
  });
}

function entropyProvider(label: string): AccountEntropyProvider {
  return {deriveAccountEntropy: async context => {
    const prefix = new TextEncoder().encode(label);
    const bytes = new Uint8Array(prefix.byteLength + context.byteLength);
    bytes.set(prefix);
    bytes.set(context, prefix.byteLength);
    return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  }};
}
