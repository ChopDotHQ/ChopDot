import assert from 'node:assert/strict';
import test from 'node:test';
import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import type {CanonicalGroupStateV1} from '../core/moneyEventKernel.ts';
import type {AccountEntropyProvider} from '../environment/accountBoundKeyEnvelope.ts';
import type {KeyValueStorage} from '../environment/livePayerSync.ts';
import type {AccountMessageSigner} from './groupKeyHandoff.ts';
import {DurableMembershipKeyEnvelopeRegistry} from './membershipKeyEnvelopeRegistry.ts';
import {MembershipRemovalCoordinator, type MembershipRemovalMessageV1} from './membershipRemovalCoordinator.ts';
import type {PendingAcceptanceRecord, PendingAcceptanceVault} from './trustedContactInvitationCoordinator.ts';

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  read(key: string) { return this.values.get(key) ?? null; }
  write(key: string, value: string) { this.values.set(key, value); }
  remove(key: string) { this.values.delete(key); }
}
class MemoryPendingVault implements PendingAcceptanceVault {
  values = new Map<string, PendingAcceptanceRecord>();
  async load(id: string) { return this.values.get(id) ?? null; }
  async save(id: string, value: PendingAcceptanceRecord) { this.values.set(id, value); }
  async remove(id: string) { this.values.delete(id); }
}

await cryptoWaitReady();
const pairs = {
  mina: sr25519PairFromSeed(new Uint8Array(32).fill(11)),
  leo: sr25519PairFromSeed(new Uint8Array(32).fill(22)),
  nina: sr25519PairFromSeed(new Uint8Array(32).fill(33)),
};
type Person = keyof typeof pairs;
const account = (id: Person) => `0x${Buffer.from(pairs[id].publicKey).toString('hex')}`;
const signer = (id: Person): AccountMessageSigner => ({signBytes: async bytes => sr25519Sign(bytes, pairs[id])});
const groupId = 'g-removal';
const roomId = 'room-removal';

test('removal waits for every remaining account to open and acknowledge the exact future key', async () => {
  const harness = await setup();
  const proposal = await harness.mina.coordinator.begin({proposalId: 'remove-nina-1', groupId, participantId: 'nina', roomId});
  assert.equal(harness.mina.coordinator.status(proposal.proposalId).status, 'waiting_for_members');
  assert.equal(await harness.mina.coordinator.command(proposal.proposalId), null);
  assert.equal(JSON.stringify([...harness.mina.storage.values.values()]).includes('"groupKey":'), false);

  const proposalMessage = harness.sent.shift()!;
  await harness.leo.coordinator.receive(proposalMessage.roomId, proposalMessage.message);
  const acceptance = harness.sent.shift()!;
  await harness.mina.coordinator.receive(acceptance.roomId, acceptance.message);
  const handoff = harness.sent.shift()!;
  await harness.leo.coordinator.receive(handoff.roomId, handoff.message);
  const acknowledgement = harness.sent.shift()!;
  await harness.mina.coordinator.receive(acknowledgement.roomId, acknowledgement.message);

  const command = await harness.mina.coordinator.command(proposal.proposalId);
  assert.ok(command && command.type === 'remove');
  assert.equal(command.participantId, 'nina');
  assert.deepEqual(Object.keys(command.groupKeyEnvelopeIds).sort(), ['leo', 'mina']);
  assert.equal(harness.mina.coordinator.status(proposal.proposalId).status, 'ready_to_remove');
  assert.equal(await harness.mina.coordinator.authorize(command, 'mina'), true);
  const queueGuarded = coordinator(
    'mina',
    harness.mina.storage,
    harness.mina.registry,
    new MemoryPendingVault(),
    harness.sent,
    () => harness.state,
    async () => { throw new Error('queue-aware authority read must not be re-entered'); },
  );
  assert.equal(
    await queueGuarded.authorize(command, 'mina', structuredClone(harness.state)),
    true,
    'verified current state authorizes without re-entering the serialized authority queue',
  );
  assert.equal(
    await queueGuarded.authorize(command, 'mina', {...structuredClone(harness.state), groupId: 'another-group'}),
    false,
    'a same-shaped frontier from another group cannot authorize removal',
  );
  assert.equal(await harness.nina.registry.findAcknowledged({groupId, participantId: 'nina', recipientAccountPublicKeyHex: account('nina'), keyVersion: 2}), null);
  const leoV2 = await harness.leo.registry.findAcknowledged({groupId, participantId: 'leo', recipientAccountPublicKeyHex: account('leo'), keyVersion: 2});
  assert.ok(leoV2);
  assert.equal((await harness.leo.registry.open(leoV2.binding)).byteLength, 32);
  harness.state = {
    ...harness.state, version: 5, currentEventId: 'remove-nina-event', groupKeyVersion: 2,
    members: Object.fromEntries(Object.entries(harness.state.members).map(([id, member]) => [id, id === 'nina'
      ? {...member, active: false}
      : {...member, keyVersion: 2, groupKeyEnvelopeId: command.groupKeyEnvelopeIds[id]}])),
  };
  const restarted = coordinator('mina', harness.mina.storage, harness.mina.registry, new MemoryPendingVault(), harness.sent, () => harness.state);
  assert.deepEqual(await restarted.command(proposal.proposalId), command, 'accepted removal remains retryable after restart');
});

test('restart, exact ack replay, retry, wrong recipient, and changed frontier fail closed', async () => {
  const harness = await setup();
  const proposal = await harness.mina.coordinator.begin({proposalId: 'remove-nina-restart', groupId, participantId: 'nina', roomId});
  const proposalMessage = harness.sent.shift()!;
  await harness.leo.coordinator.receive(roomId, proposalMessage.message);
  const acceptance = harness.sent.shift()!;
  await harness.mina.coordinator.receive(roomId, acceptance.message);
  const handoff = harness.sent.shift()!;
  assert.equal(handoff.message.kind, 'chopdot.membership-removal-handoff.v1');
  if (handoff.message.kind !== 'chopdot.membership-removal-handoff.v1') throw new Error('expected handoff');
  await assert.rejects(harness.nina.coordinator.receive(roomId, handoff.message), /not for this account|unavailable/u);
  await harness.leo.coordinator.receive(roomId, handoff.message);
  const ack = harness.sent.shift()!;
  await harness.mina.coordinator.receive(roomId, ack.message);
  await harness.mina.coordinator.receive(roomId, ack.message);

  const restarted = coordinator('mina', harness.mina.storage, harness.mina.registry, new MemoryPendingVault(), harness.sent, () => harness.state);
  const command = await restarted.command(proposal.proposalId);
  assert.ok(command && command.type === 'remove');
  await restarted.retry(proposal.proposalId);
  assert.equal(harness.sent.length, 0);

  harness.state = {...harness.state, version: harness.state.version + 1, currentEventId: 'concurrent-event'};
  assert.equal(await restarted.command(proposal.proposalId), null);
  assert.equal(await restarted.authorize(command!, 'mina'), false);
});

async function setup() {
  const initialKey = new Uint8Array(32).fill(4);
  const sent: Array<{roomId: string; message: MembershipRemovalMessageV1}> = [];
  const contexts = {} as Record<Person, {storage: MemoryStorage; registry: DurableMembershipKeyEnvelopeRegistry; coordinator: MembershipRemovalCoordinator}>;
  const bindings: Record<string, string> = {};
  for (const id of Object.keys(pairs) as Person[]) {
    const storage = new MemoryStorage();
    const registry = new DurableMembershipKeyEnvelopeRegistry({productId: 'app.chopdot.dot', participantId: id, accountPublicKeyHex: account(id), storage, entropy: entropy(id)});
    const record = await registry.stageRecipientBinding({groupId, keyVersion: 1, groupKey: initialKey, acknowledgedAt: new Date().toISOString(), signer: signer(id)});
    bindings[id] = record.binding.groupKeyEnvelopeId;
    contexts[id] = {storage, registry, coordinator: null as unknown as MembershipRemovalCoordinator};
  }
  let state: CanonicalGroupStateV1 = {
    v: 1, groupId, name: 'Circle', mode: 'savings_circle', version: 4, currentEventId: 'frontier-4', organizerId: 'mina', groupKeyVersion: 1,
    members: Object.fromEntries((Object.keys(pairs) as Person[]).map(id => [id, {
      participantId: id, accountPublicKeyHex: account(id), role: id === 'mina' ? 'organizer' : 'member', active: true,
      acceptedAt: new Date().toISOString(), invitationId: `accepted-${id}`, keyVersion: 1, groupKeyEnvelopeId: bindings[id],
    }])), expenses: {}, shares: {}, closed: null, successorRecords: [], eventIds: ['origin', 'one', 'two', 'frontier-4'],
  };
  for (const id of Object.keys(pairs) as Person[]) {
    contexts[id].coordinator = coordinator(id, contexts[id].storage, contexts[id].registry, new MemoryPendingVault(), sent, () => state);
  }
  return {
    ...contexts,
    sent,
    get state() { return state; },
    set state(value: CanonicalGroupStateV1) { state = value; },
  };
}

function coordinator(
  id: Person,
  storage: MemoryStorage,
  registry: DurableMembershipKeyEnvelopeRegistry,
  pending: PendingAcceptanceVault,
  sent: Array<{roomId: string; message: MembershipRemovalMessageV1}>,
  state: () => CanonicalGroupStateV1,
  readCanonicalGroup: () => Promise<CanonicalGroupStateV1 | null> = async () => structuredClone(state()),
) {
  return new MembershipRemovalCoordinator({
    actor: {participantId: id, accountPublicKeyHex: account(id), signer: signer(id)}, storage, keyEnvelopes: registry, pendingAcceptances: pending,
    authority: {readCanonicalGroup}, roomForGroup: () => roomId,
    delivery: {send: async (targetRoom, message) => { sent.push({roomId: targetRoom, message: structuredClone(message)}); }},
    now: () => new Date().toISOString(),
  });
}

function entropy(id: Person): AccountEntropyProvider {
  return {deriveAccountEntropy: async context => {
    const prefix = new TextEncoder().encode(id);
    const input = new Uint8Array(prefix.length + context.length);
    input.set(prefix); input.set(context, prefix.length);
    return new Uint8Array(await crypto.subtle.digest('SHA-256', input));
  }};
}
