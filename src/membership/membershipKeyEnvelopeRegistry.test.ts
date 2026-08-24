import assert from 'node:assert/strict';
import test from 'node:test';
import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import type {AccountEntropyProvider} from '../environment/accountBoundKeyEnvelope.ts';
import type {KeyValueStorage} from '../environment/livePayerSync.ts';
import type {AccountMessageSigner} from './groupKeyHandoff.ts';
import type {MembershipGrant} from './membershipLifecycle.ts';
import {DurableMembershipKeyEnvelopeRegistry} from './membershipKeyEnvelopeRegistry.ts';
import {
  applySignedMembershipEvent,
  createCausalSignedMembershipEvent,
  createSignedMembershipState,
} from './signedMembershipEvents.ts';

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  read(key: string) { return this.values.get(key) ?? null; }
  write(key: string, value: string) { this.values.set(key, value); }
  remove(key: string) { this.values.delete(key); }
}

const productId = 'app.chopdot.dot';
const groupId = 'g-dinner';
const groupKey = new Uint8Array(32).fill(9);

test('lifecycle rotation accepts only durable recipient-opened envelopes and excludes the removed participant', async () => {
  await cryptoWaitReady();
  const minaPair = sr25519PairFromSeed(new Uint8Array(32).fill(11));
  const leoPair = sr25519PairFromSeed(new Uint8Array(32).fill(22));
  const ninaPair = sr25519PairFromSeed(new Uint8Array(32).fill(33));
  const account = (pair: typeof minaPair) => `0x${Buffer.from(pair.publicKey).toString('hex')}`;
  const signer = (pair: typeof minaPair): AccountMessageSigner => ({signBytes: async bytes => sr25519Sign(bytes, pair)});
  const grant = (participantId: string, pair: typeof minaPair, role: 'organizer' | 'member'): MembershipGrant => ({
    groupId, participantId, accountPublicKeyHex: account(pair), role,
    acceptedAt: '2026-08-23T11:00:00.000Z', invitationId: `accepted-${participantId}`,
    keyVersion: 1, groupKeyEnvelopeId: `legacy-${participantId}-v1`,
  });
  const initial = createSignedMembershipState([
    grant('mina', minaPair, 'organizer'),
    grant('leo', leoPair, 'member'),
    grant('nina', ninaPair, 'member'),
  ]);
  const minaStorage = new MemoryStorage();
  const leoStorage = new MemoryStorage();
  const minaEntropy = entropy('mina');
  const leoEntropy = entropy('leo');
  const organizerRegistry = new DurableMembershipKeyEnvelopeRegistry({
    productId, participantId: 'mina', accountPublicKeyHex: account(minaPair),
    storage: minaStorage, entropy: minaEntropy,
  });
  const leoRegistry = new DurableMembershipKeyEnvelopeRegistry({
    productId, participantId: 'leo', accountPublicKeyHex: account(leoPair),
    storage: leoStorage, entropy: leoEntropy,
  });
  const minaRecord = await organizerRegistry.stageRecipientBinding({
    groupId, keyVersion: 2, groupKey, signer: signer(minaPair), acknowledgedAt: '2026-08-23T12:00:00.000Z',
  });
  const leoRecord = await leoRegistry.stageRecipientBinding({
    groupId, keyVersion: 2, groupKey, signer: signer(leoPair), acknowledgedAt: '2026-08-23T12:00:00.000Z',
  });
  await organizerRegistry.importAcknowledged(leoRecord);

  const removal = await createCausalSignedMembershipEvent(initial, {
    eventId: 'remove-nina', actorId: 'mina', actorAccountPublicKeyHex: account(minaPair),
    occurredAt: '2026-08-23T12:01:00.000Z', signer: signer(minaPair),
    event: {
      type: 'MEMBERSHIP_REMOVED', groupId, participantId: 'nina', nextKeyVersion: 2,
      groupKeyEnvelopes: {mina: minaRecord.binding, leo: leoRecord.binding},
    },
  });
  const applied = await applySignedMembershipEvent(initial, removal, undefined, organizerRegistry);
  assert.equal(applied.outcome, 'applied');
  assert.equal(applied.state.lifecycle.memberships[`${groupId}:nina`], undefined);
  assert.equal(applied.state.lifecycle.memberships[`${groupId}:mina`].groupKeyEnvelopeId, minaRecord.binding.groupKeyEnvelopeId);
  assert.equal(applied.state.lifecycle.memberships[`${groupId}:leo`].groupKeyEnvelopeId, leoRecord.binding.groupKeyEnvelopeId);
  assert.equal(JSON.stringify(removal).includes('nina') && Object.hasOwn(removal.event.type === 'MEMBERSHIP_REMOVED' ? removal.event.groupKeyEnvelopes : {}, 'nina'), false);

  const recreatedLeo = new DurableMembershipKeyEnvelopeRegistry({
    productId, participantId: 'leo', accountPublicKeyHex: account(leoPair),
    storage: leoStorage, entropy: leoEntropy,
  });
  assert.deepEqual(await recreatedLeo.open(leoRecord.binding), groupKey);

  const bogus = await createCausalSignedMembershipEvent(initial, {
    eventId: 'remove-nina-bogus-envelope', actorId: 'mina', actorAccountPublicKeyHex: account(minaPair),
    occurredAt: '2026-08-23T12:02:00.000Z', signer: signer(minaPair),
    event: {
      type: 'MEMBERSHIP_REMOVED', groupId, participantId: 'nina', nextKeyVersion: 2,
      groupKeyEnvelopes: {
        mina: minaRecord.binding,
        leo: {...leoRecord.binding, groupKeyEnvelopeId: `sha256:${'ff'.repeat(32)}`},
      },
    },
  });
  const denied = await applySignedMembershipEvent(initial, bogus, undefined, organizerRegistry);
  assert.equal(denied.outcome, 'rejected');
  assert.match(denied.reason ?? '', /not bound to every remaining account/u);
});

function entropy(label: string): AccountEntropyProvider {
  return {deriveAccountEntropy: async context => {
    const prefix = new TextEncoder().encode(label);
    const bytes = new Uint8Array(prefix.byteLength + context.byteLength);
    bytes.set(prefix);
    bytes.set(context, prefix.byteLength);
    return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  }};
}
