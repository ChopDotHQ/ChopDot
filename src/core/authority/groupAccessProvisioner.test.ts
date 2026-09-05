import assert from 'node:assert/strict';
import test from 'node:test';
import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import type {KeyValueStorage} from '../../environment/livePayerSync.ts';
import {DurableMembershipKeyEnvelopeRegistry} from '../../membership/membershipKeyEnvelopeRegistry.ts';
import {MembershipRegistryGroupAccessProvisioner} from './groupAccessProvisioner.ts';

class MemoryStorage implements KeyValueStorage {
  readonly values = new Map<string, string>();
  read(key: string) { return this.values.get(key) ?? null; }
  write(key: string, value: string) { this.values.set(key, value); }
  remove(key: string) { this.values.delete(key); }
}

test('GROUP_CREATED access provisioning persists only an account-bound organizer envelope', async () => {
  await cryptoWaitReady();
  const pair = sr25519PairFromSeed(new Uint8Array(32).fill(19));
  const accountPublicKeyHex = `0x${Buffer.from(pair.publicKey).toString('hex')}`;
  const storage = new MemoryStorage();
  const registry = new DurableMembershipKeyEnvelopeRegistry({
    productId: 'chopdotapp01.dot',
    participantId: 'mina.dot',
    accountPublicKeyHex,
    storage,
    entropy: {deriveAccountEntropy: async context => new Uint8Array(await crypto.subtle.digest('SHA-256', context))},
  });
  const provisioner = new MembershipRegistryGroupAccessProvisioner(registry);
  const result = await provisioner.provision({
    groupId: 'group-dinner',
    organizerId: 'mina.dot',
    organizerAccountPublicKeyHex: accountPublicKeyHex,
    eventId: 'event-origin',
    acceptedAt: '2026-08-23T12:00:00.000Z',
    signer: {sign: async bytes => sr25519Sign(bytes, pair)},
  });
  assert.equal(result.keyVersion, 1);
  assert.match(result.groupKeyEnvelopeId, /^sha256:[0-9a-f]{64}$/u);
  const record = registry.export(result.groupKeyEnvelopeId);
  assert.equal(record?.binding.participantId, 'mina.dot');
  assert.equal(record?.binding.recipientAccountPublicKeyHex, accountPublicKeyHex);
  assert.equal((await registry.open(record!.binding)).byteLength, 32);
  assert.equal([...storage.values.values()].some(value => /privateKey|groupKey"/iu.test(value)), false);
});
