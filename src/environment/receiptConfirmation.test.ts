import assert from 'node:assert/strict';
import test from 'node:test';
import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import type {StandalonePayerRequest} from '../requestLinks.ts';
import {decryptSessionValue, encryptSessionValue} from './encryptedSession.ts';
import {
  createReceiptConfirmedEnvelope,
  derivePayerSessionConfig,
  paymentEventSigningBytes,
  ReceiptConfirmationOutbox,
  toReceiptConfirmedWire,
  fromReceiptConfirmedWire,
  receiptConfirmationEventId,
  validateReceiptConfirmedForPayer,
  type KeyValueStorage,
  type ReceiptConfirmedEnvelope,
} from './livePayerSync.ts';

const capability = 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
const request: StandalonePayerRequest = {
  requestId: 'req-leo',
  groupName: 'Zurich Dinner',
  requesterName: 'Mina',
  payerName: 'Leo',
  amount: 60,
  currency: 'CHF',
  paymentMethodLabel: 'Cash',
  createdAt: '2026-08-09T18:00:00.000Z',
  expiresAt: '2099-08-10T18:00:00.987Z',
  live: {
    memberCapability: capability,
    authority: 'native',
    requesterPublicKeyHex: '',
  },
};

async function signedConfirmation(overrides: Partial<ReceiptConfirmedEnvelope> = {}) {
  await cryptoWaitReady();
  const keypair = sr25519PairFromSeed(new Uint8Array(32).fill(7));
  const actorPublicKeyHex = `0x${Buffer.from(keypair.publicKey).toString('hex')}`;
  const unsigned = createReceiptConfirmedEnvelope({
    eventId: receiptConfirmationEventId(request.requestId),
    requestId: request.requestId,
    groupId: 'g-zurich',
    memberId: 'u-leo',
    amount: request.amount,
    currency: request.currency,
    memberCapability: capability,
    actorPublicKeyHex,
    actorSignature: 'A'.repeat(86),
    occurredAt: '2026-08-09T18:06:00.000Z',
    expiresAt: '2099-08-10T18:00:00.000Z',
    ...overrides,
  });
  const actorSignature = toBase64Url(sr25519Sign(paymentEventSigningBytes(unsigned), keypair));
  return createReceiptConfirmedEnvelope({...unsigned, actorSignature});
}

test('payer accepts only the exact product-signed organizer confirmation', async () => {
  const envelope = await signedConfirmation();
  const notice = fromReceiptConfirmedWire(toReceiptConfirmedWire(envelope));
  assert.ok(notice);
  const exactRequest = {
    ...request,
    live: {...request.live, requesterPublicKeyHex: envelope.actorPublicKeyHex},
  };
  assert.deepEqual(await validateReceiptConfirmedForPayer(
    exactRequest,
    {groupId: envelope.groupId, memberId: envelope.memberId},
    notice,
    `0x${'33'.repeat(32)}`,
    new Date('2026-08-09T18:07:00.000Z'),
  ), {ok: true});

  assert.equal((await validateReceiptConfirmedForPayer(
    {...exactRequest, amount: 59},
    {groupId: envelope.groupId, memberId: envelope.memberId},
    notice,
    `0x${'33'.repeat(32)}`,
    new Date('2026-08-09T18:07:00.000Z'),
  )).ok, false);
  assert.equal((await validateReceiptConfirmedForPayer(
    {...exactRequest, live: {...exactRequest.live, requesterPublicKeyHex: `0x${'44'.repeat(32)}`}},
    {groupId: envelope.groupId, memberId: envelope.memberId},
    notice,
    `0x${'33'.repeat(32)}`,
    new Date('2026-08-09T18:07:00.000Z'),
  )).ok, false);
  assert.equal((await validateReceiptConfirmedForPayer(
    exactRequest,
    {groupId: envelope.groupId, memberId: envelope.memberId},
    {...notice, actorSignature: 'B'.repeat(86)},
    `0x${'33'.repeat(32)}`,
    new Date('2026-08-09T18:07:00.000Z'),
  )).ok, false);
});

test('four compact confirmation notices fit one organizer Statement Store budget', async () => {
  const envelope = await signedConfirmation();
  const wire = toReceiptConfirmedWire(envelope);
  assert.deepEqual(fromReceiptConfirmedWire(wire), {
    v: 1,
    kind: 'chopdot-receipt-confirmed-notice',
    requestId: envelope.requestId,
    actorSignature: envelope.actorSignature,
  });
  const session = await derivePayerSessionConfig(request.requestId, request.live.memberCapability);
  const packet = await encryptSessionValue(session.secret, wire);
  const size = new TextEncoder().encode(JSON.stringify(packet)).byteLength;
  assert.ok(size <= 256);
  assert.ok(size * 4 <= 1024);
  assert.deepEqual(fromReceiptConfirmedWire(await decryptSessionValue(session.secret, packet)), fromReceiptConfirmedWire(wire));
});

test('organizer confirmation outbox retains one stable event through failure', async () => {
  const storage = memoryStorage();
  const outbox = new ReceiptConfirmationOutbox(storage);
  const session = await derivePayerSessionConfig(request.requestId, request.live.memberCapability);
  const pending = outbox.enqueue({
    eventId: 'confirm-stable',
    requestId: request.requestId,
    groupId: 'g-zurich',
    memberId: 'u-leo',
    amount: 60,
    currency: 'CHF',
    memberCapability: capability,
    roomId: session.roomId,
    secret: session.secret,
    occurredAt: '2026-08-09T18:06:00.000Z',
    expiresAt: request.expiresAt,
  });
  assert.equal(outbox.enqueue({...pending, eventId: 'confirm-repeated'}).eventId, 'confirm-stable');
  assert.deepEqual(await outbox.flush(async () => false), {published: [], pending: [request.requestId]});
  assert.equal(outbox.get(request.requestId)?.eventId, 'confirm-stable');
  assert.deepEqual(await outbox.flush(async () => true), {published: [request.requestId], pending: []});
  assert.equal(outbox.get(request.requestId), null);
});

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

function memoryStorage(): KeyValueStorage {
  const values = new Map<string, string>();
  return {
    read: key => values.get(key) ?? null,
    write: (key, value) => values.set(key, value),
    remove: key => values.delete(key),
  };
}
