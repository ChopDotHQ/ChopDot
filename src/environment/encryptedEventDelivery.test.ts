import assert from 'node:assert/strict';
import test from 'node:test';
import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import type {AccountMessageSigner} from '../membership/groupKeyHandoff.ts';
import type {KeyValueStorage} from './livePayerSync.ts';
import {
  EncryptedEventDeliveryQueue,
  createEncryptedDeliveryEnvelope,
  openEncryptedDeliveryEnvelope,
} from './encryptedEventDelivery.ts';

class MemoryStorage implements KeyValueStorage {
  readonly values = new Map<string, string>();
  read(key: string) { return this.values.get(key) ?? null; }
  write(key: string, value: string) { this.values.set(key, value); }
  remove(key: string) { this.values.delete(key); }
}

class FaultInjectingStorage extends MemoryStorage {
  throwOnceForKey: string | null = null;
  dropOnceForKey: string | null = null;

  override write(key: string, value: string) {
    if (key === this.throwOnceForKey) {
      this.throwOnceForKey = null;
      throw new Error('injected durable write failure');
    }
    if (key === this.dropOnceForKey) {
      this.dropOnceForKey = null;
      return;
    }
    super.write(key, value);
  }
}

const deliveryKey = new Uint8Array(32).fill(7);
const createdAt = '2026-08-23T12:00:00.000Z';
const expiresAt = '2026-08-23T13:00:00.000Z';
let minaPair: ReturnType<typeof sr25519PairFromSeed>;
let leoPair: ReturnType<typeof sr25519PairFromSeed>;

test.before(async () => {
  await cryptoWaitReady();
  minaPair = sr25519PairFromSeed(new Uint8Array(32).fill(11));
  leoPair = sr25519PairFromSeed(new Uint8Array(32).fill(22));
});

function account(pair: ReturnType<typeof sr25519PairFromSeed>): string {
  return `0x${Buffer.from(pair.publicKey).toString('hex')}`;
}

function signer(pair: ReturnType<typeof sr25519PairFromSeed>): AccountMessageSigner {
  return {signBytes: async bytes => sr25519Sign(bytes, pair)};
}

function envelope(overrides: Partial<Parameters<typeof createEncryptedDeliveryEnvelope>[0]> = {}) {
  return createEncryptedDeliveryEnvelope({
    envelopeId: 'delivery-1',
    channelId: 'group-zurich-dinner',
    senderAccountPublicKeyHex: account(minaPair),
    recipientAccountPublicKeyHex: account(leoPair),
    keyVersion: 2,
    createdAt,
    expiresAt,
    deliveryKey,
    payload: {v: 1, kind: 'membership_event', body: {eventId: 'remove-nina', privateNote: 'secret expense'}},
    signer: signer(minaPair),
    ...overrides,
  });
}

test('signed ciphertext opens only for the bound recipient, channel, key version, and key', async () => {
  const value = await envelope();
  const opened = await openEncryptedDeliveryEnvelope({
    envelope: value,
    expectedRecipientAccountPublicKeyHex: account(leoPair),
    expectedChannelId: 'group-zurich-dinner',
    expectedKeyVersion: 2,
    deliveryKey,
    now: '2026-08-23T12:01:00.000Z',
  });
  assert.deepEqual(opened, {v: 1, kind: 'membership_event', body: {eventId: 'remove-nina', privateNote: 'secret expense'}});

  await assert.rejects(() => openEncryptedDeliveryEnvelope({
    envelope: value, expectedRecipientAccountPublicKeyHex: account(minaPair),
    expectedChannelId: 'group-zurich-dinner', expectedKeyVersion: 2, deliveryKey,
    now: '2026-08-23T12:01:00.000Z',
  }), /recipient context/u);
  await assert.rejects(() => openEncryptedDeliveryEnvelope({
    envelope: value, expectedRecipientAccountPublicKeyHex: account(leoPair),
    expectedChannelId: 'another-group', expectedKeyVersion: 2, deliveryKey,
    now: '2026-08-23T12:01:00.000Z',
  }), /recipient context/u);
  await assert.rejects(() => openEncryptedDeliveryEnvelope({
    envelope: value, expectedRecipientAccountPublicKeyHex: account(leoPair),
    expectedChannelId: 'group-zurich-dinner', expectedKeyVersion: 1, deliveryKey,
    now: '2026-08-23T12:01:00.000Z',
  }), /recipient context/u);
  await assert.rejects(() => openEncryptedDeliveryEnvelope({
    envelope: value, expectedRecipientAccountPublicKeyHex: account(leoPair),
    expectedChannelId: 'group-zurich-dinner', expectedKeyVersion: 2,
    deliveryKey: new Uint8Array(32).fill(8), now: '2026-08-23T12:01:00.000Z',
  }), /could not be opened/u);
});

test('tamper and expiry fail closed before payload application', async () => {
  const value = await envelope();
  const tampered = {
    ...value,
    ciphertext: `${value.ciphertext[0] === 'A' ? 'B' : 'A'}${value.ciphertext.slice(1)}`,
  };
  await assert.rejects(() => openEncryptedDeliveryEnvelope({
    envelope: tampered,
    expectedRecipientAccountPublicKeyHex: account(leoPair), expectedChannelId: 'group-zurich-dinner',
    expectedKeyVersion: 2, deliveryKey, now: '2026-08-23T12:01:00.000Z',
  }), /signature/u);
  await assert.rejects(() => openEncryptedDeliveryEnvelope({
    envelope: value,
    expectedRecipientAccountPublicKeyHex: account(leoPair), expectedChannelId: 'group-zurich-dinner',
    expectedKeyVersion: 2, deliveryKey, now: expiresAt,
  }), /expired/u);
});

test('ciphertext-only outbox survives recreation, retries, and clears only after a recipient-signed ack', async () => {
  const storage = new MemoryStorage();
  const value = await envelope();
  const sender = new EncryptedEventDeliveryQueue(storage, 'sender');
  sender.enqueue(value);
  assert.equal([...storage.values.values()].some(raw => raw.includes('secret expense')), false);

  const first = await sender.flush(async () => { throw new Error('offline'); }, createdAt);
  assert.deepEqual(first.failed, ['delivery-1']);
  assert.equal(sender.pending()[0].attempts, 1);

  const recreatedSender = new EncryptedEventDeliveryQueue(storage, 'sender');
  const second = await recreatedSender.flush(async () => undefined, '2026-08-23T12:00:02.000Z');
  assert.deepEqual(second.acceptedByCarrier, ['delivery-1']);
  assert.equal(recreatedSender.pending()[0].attempts, 2);

  const recipient = new EncryptedEventDeliveryQueue(storage, 'recipient');
  const received = await recipient.receive({
    envelope: value,
    expectedRecipientAccountPublicKeyHex: account(leoPair),
    expectedChannelId: 'group-zurich-dinner',
    expectedKeyVersion: 2,
    deliveryKey,
    receivedAt: '2026-08-23T12:00:03.000Z',
    signer: signer(leoPair),
  });
  assert.equal(received.outcome, 'applied');
  assert.equal(await recreatedSender.acknowledge(received.ack), 'applied');
  assert.equal(recreatedSender.pending().length, 0);
  assert.equal(await recreatedSender.acknowledge(received.ack), 'idempotent');
});

test('an acknowledgement remains logically final when physical outbox cleanup fails', async () => {
  const storage = new FaultInjectingStorage();
  const value = await envelope({envelopeId: 'delivery-cleanup-failure'});
  const sender = new EncryptedEventDeliveryQueue(storage, 'sender-cleanup-failure');
  sender.enqueue(value);
  const recipient = new EncryptedEventDeliveryQueue(storage, 'recipient-cleanup-failure');
  const received = await recipient.receive({
    envelope: value,
    expectedRecipientAccountPublicKeyHex: account(leoPair),
    expectedChannelId: 'group-zurich-dinner',
    expectedKeyVersion: 2,
    deliveryKey,
    receivedAt: '2026-08-23T12:00:03.000Z',
    signer: signer(leoPair),
  });

  storage.throwOnceForKey = 'sender-cleanup-failure:outbox';
  await assert.rejects(() => sender.acknowledge(received.ack), /injected durable write failure/u);

  const recreated = new EncryptedEventDeliveryQueue(storage, 'sender-cleanup-failure');
  assert.equal(recreated.acknowledgements().length, 1);
  assert.equal(recreated.pending().length, 0);
  const flushed = await recreated.flush(async () => assert.fail('acknowledged delivery must not be resent'), received.ack.receivedAt);
  assert.deepEqual(flushed.attempted, []);
  assert.equal(await recreated.acknowledge(received.ack), 'idempotent');
  assert.throws(() => recreated.enqueue(value), /already acknowledged/u);
});

test('an unverified acknowledgement write leaves the ciphertext pending and retryable', async () => {
  const storage = new FaultInjectingStorage();
  const value = await envelope({envelopeId: 'delivery-ack-write-failure'});
  const sender = new EncryptedEventDeliveryQueue(storage, 'sender-ack-write-failure');
  sender.enqueue(value);
  const recipient = new EncryptedEventDeliveryQueue(storage, 'recipient-ack-write-failure');
  const received = await recipient.receive({
    envelope: value,
    expectedRecipientAccountPublicKeyHex: account(leoPair),
    expectedChannelId: 'group-zurich-dinner',
    expectedKeyVersion: 2,
    deliveryKey,
    receivedAt: '2026-08-23T12:00:03.000Z',
    signer: signer(leoPair),
  });

  storage.dropOnceForKey = 'sender-ack-write-failure:acks';
  await assert.rejects(() => sender.acknowledge(received.ack), /write could not be verified/u);

  const recreated = new EncryptedEventDeliveryQueue(storage, 'sender-ack-write-failure');
  assert.equal(recreated.acknowledgements().length, 0);
  assert.equal(recreated.pending().length, 1);
  assert.equal(await recreated.acknowledge(received.ack), 'applied');
  assert.equal(recreated.pending().length, 0);
});

test('ciphertext batch validation is atomic and cannot leave half a removal outbox', async () => {
  const storage = new MemoryStorage();
  const queue = new EncryptedEventDeliveryQueue(storage, 'atomic-removal');
  const remaining = await envelope({envelopeId: 'removal-for-remaining'});
  const invalidRemoved = {...await envelope({envelopeId: 'removal-for-removed'}), signatureHex: '0x00'};
  assert.throws(() => queue.enqueueMany([{envelope: remaining}, {envelope: invalidRemoved}]), /signature/u);
  assert.deepEqual(queue.pending(), []);
});

test('inbox deduplicates exact retries and rejects an envelope-ID collision', async () => {
  const storage = new MemoryStorage();
  const recipient = new EncryptedEventDeliveryQueue(storage, 'recipient-dedupe');
  const firstEnvelope = await envelope();
  const input = {
    envelope: firstEnvelope,
    expectedRecipientAccountPublicKeyHex: account(leoPair),
    expectedChannelId: 'group-zurich-dinner',
    expectedKeyVersion: 2,
    deliveryKey,
    receivedAt: '2026-08-23T12:00:03.000Z',
    signer: signer(leoPair),
  };
  const first = await recipient.receive(input);
  const duplicate = await new EncryptedEventDeliveryQueue(storage, 'recipient-dedupe').receive(input);
  assert.equal(first.outcome, 'applied');
  assert.equal(duplicate.outcome, 'duplicate');
  assert.deepEqual(duplicate.ack, first.ack);

  const collision = await envelope({payload: {v: 1, kind: 'membership_event', body: {eventId: 'different'}}});
  await assert.rejects(() => recipient.receive({...input, envelope: collision}), /identifier is already in use/u);
});

test('authority application must succeed before an acknowledgement or inbox receipt is persisted', async () => {
  const storage = new MemoryStorage();
  const value = await envelope();
  const recipient = new EncryptedEventDeliveryQueue(storage, 'recipient-apply-first');
  let attempts = 0;
  const input = {
    envelope: value,
    expectedRecipientAccountPublicKeyHex: account(leoPair),
    expectedChannelId: 'group-zurich-dinner',
    expectedKeyVersion: 2,
    deliveryKey,
    receivedAt: '2026-08-23T12:00:03.000Z',
    signer: signer(leoPair),
  };
  await assert.rejects(() => recipient.receive({
    ...input,
    apply: async () => {
      attempts += 1;
      throw new Error('authority rejected');
    },
  }), /authority rejected/u);
  assert.equal(recipient.acknowledgements().length, 0);

  const accepted = await recipient.receive({
    ...input,
    apply: async () => { attempts += 1; },
  });
  assert.equal(accepted.outcome, 'applied');
  assert.equal(attempts, 2);
  const duplicate = await recipient.receive({...input, apply: async () => { attempts += 1; }});
  assert.equal(duplicate.outcome, 'duplicate');
  assert.equal(attempts, 2);
});

test('an acknowledgement from the sender or for another envelope is rejected', async () => {
  const storage = new MemoryStorage();
  const value = await envelope();
  const sender = new EncryptedEventDeliveryQueue(storage, 'ack-boundary');
  sender.enqueue(value);
  const recipient = new EncryptedEventDeliveryQueue(storage, 'ack-recipient');
  const received = await recipient.receive({
    envelope: value,
    expectedRecipientAccountPublicKeyHex: account(leoPair), expectedChannelId: 'group-zurich-dinner',
    expectedKeyVersion: 2, deliveryKey, receivedAt: '2026-08-23T12:01:00.000Z', signer: signer(leoPair),
  });
  const tampered = {...received.ack, envelopeId: 'another-envelope'};
  assert.equal(await sender.acknowledge(tampered), 'rejected');
  assert.equal(sender.pending().length, 1);
});

test('oversized inbound ciphertext and corrupt durable queue state fail closed before decryption', async () => {
  const value = await envelope();
  await assert.rejects(() => openEncryptedDeliveryEnvelope({
    envelope: {...value, ciphertext: 'A'.repeat(1_500_000)},
    expectedRecipientAccountPublicKeyHex: account(leoPair),
    expectedChannelId: 'group-zurich-dinner',
    expectedKeyVersion: 2,
    deliveryKey,
    now: '2026-08-23T12:01:00.000Z',
  }), /exceeds the inbound limit/u);

  const storage = new MemoryStorage();
  storage.write('corrupt:outbox', '[{"not":"a delivery"}]');
  const queue = new EncryptedEventDeliveryQueue(storage, 'corrupt');
  assert.throws(() => queue.pending(), /storage is corrupt/u);
  storage.write('corrupt:outbox', '{broken-json');
  assert.throws(() => queue.pending(), /storage is corrupt/u);
});
