import assert from 'node:assert/strict';
import test from 'node:test';
import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import type {KeyValueStorage} from '../environment/livePayerSync.ts';
import type {AccountMessageSigner} from './groupKeyHandoff.ts';
import {createSignedLimitedNoAppAction, type SignedLimitedNoAppResponseV1} from './limitedNoAppAction.ts';
import {LimitedNoAppActionService} from './limitedNoAppActionService.ts';

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  read(key: string) { return this.values.get(key) ?? null; }
  write(key: string, value: string) { this.values.set(key, value); }
  remove(key: string) { this.values.delete(key); }
}

test('limited action survives restart, retries exact signed response, and exposes no membership state', async () => {
  const h = await harness();
  let online = false;
  const delivered: SignedLimitedNoAppResponseV1[] = [];
  const storage = new MemoryStorage();
  const service = h.service(storage, {async send(response) {
    if (!online) throw new Error('offline');
    delivered.push(response);
    return {messageId: response.responseId};
  }});
  assert.deepEqual(await service.enter(h.request, '2026-08-13T10:01:00.000Z'), {status: 'ready', requestId: 'request-1'});
  const response = await service.respond({
    requestId: 'request-1', responseId: 'response-1', decision: 'MARKED_PAID',
    respondedAt: '2026-08-13T10:02:00.000Z',
  });
  assert.deepEqual(await service.flush(), {delivered: [], pending: ['limited:request-1:response-1']});

  const restarted = h.service(storage, {async send(value) {
    delivered.push(value);
    return {messageId: value.responseId};
  }});
  assert.deepEqual(await restarted.restore('2026-08-13T10:03:00.000Z'), {restored: ['request-1'], rejected: []});
  const replay = await restarted.respond({
    requestId: 'request-1', responseId: 'unused', decision: 'MARKED_PAID',
    respondedAt: '2026-08-13T10:04:00.000Z',
  });
  assert.deepEqual(replay, response);
  online = true;
  assert.equal((await restarted.flush()).delivered.length, 1);
  assert.deepEqual(delivered, [response]);
  assert.equal('memberships' in restarted.state, false);
});

test('wrong recipient, expired request, and absent organizer authority fail closed without persistence', async () => {
  const h = await harness();
  const wrong = h.service(new MemoryStorage(), {async send() { return {messageId: 'unused'}; }}, 'other');
  assert.equal((await wrong.enter(h.request, '2026-08-13T10:01:00.000Z')).status, 'wrong_account');
  const expired = h.service(new MemoryStorage(), {async send() { return {messageId: 'unused'}; }});
  assert.equal((await expired.enter(h.request, '2026-08-14T10:00:00.000Z')).status, 'expired');
  const untrusted = h.service(new MemoryStorage(), {async send() { return {messageId: 'unused'}; }}, 'omar', false);
  assert.equal((await untrusted.enter(h.request, '2026-08-13T10:01:00.000Z')).status, 'untrusted_organizer');
  assert.deepEqual(untrusted.state, {requests: {}, responses: {}});
});

test('conflicting retry and dropped outbox persistence fail visibly without changing first response', async () => {
  const h = await harness();
  const storage = new MemoryStorage();
  const service = h.service(storage, {async send() { return {messageId: 'unused'}; }});
  await service.enter(h.request, '2026-08-13T10:01:00.000Z');
  const first = await service.respond({
    requestId: 'request-1', responseId: 'response-1', decision: 'MARKED_PAID',
    respondedAt: '2026-08-13T10:02:00.000Z',
  });
  await assert.rejects(() => service.respond({
    requestId: 'request-1', responseId: 'response-2', decision: 'DECLINED',
    respondedAt: '2026-08-13T10:03:00.000Z',
  }), /another response/u);
  assert.deepEqual(service.state.responses['request-1'], first);

  const dropping = new MemoryStorage();
  const originalWrite = dropping.write.bind(dropping);
  dropping.write = (key, value) => {
    if (key !== 'chopdot-limited-no-app-outbox-v1') originalWrite(key, value);
  };
  const unsafe = h.service(dropping, {async send() { return {messageId: 'unused'}; }});
  await unsafe.enter(h.request, '2026-08-13T10:01:00.000Z');
  await assert.rejects(() => unsafe.respond({
    requestId: 'request-1', responseId: 'response-1', decision: 'MARKED_PAID',
    respondedAt: '2026-08-13T10:02:00.000Z',
  }), /delivery state could not be persisted/u);
});

async function harness() {
  await cryptoWaitReady();
  const mina = sr25519PairFromSeed(new Uint8Array(32).fill(11));
  const omar = sr25519PairFromSeed(new Uint8Array(32).fill(44));
  const account = (pair: typeof mina) => `0x${Buffer.from(pair.publicKey).toString('hex')}`;
  const signer = (pair: typeof mina): AccountMessageSigner => ({signBytes: async data => sr25519Sign(data, pair)});
  const minaAccount = account(mina);
  const omarAccount = account(omar);
  const request = await createSignedLimitedNoAppAction({
    requestId: 'request-1', organizerId: 'mina', organizerAccountPublicKeyHex: minaAccount,
    recipientId: 'omar', recipientAccountPublicKeyHex: omarAccount, groupId: 'group-1',
    expenseId: 'expense-1', action: 'MARK_PAID', amountMinor: 2500, currency: 'CHF',
    createdAt: '2026-08-13T10:00:00.000Z', expiresAt: '2026-08-14T10:00:00.000Z', signer: signer(mina),
  });
  return {
    request,
    service(storage: MemoryStorage, delivery: {send(value: SignedLimitedNoAppResponseV1): Promise<{messageId: string}>}, actor = 'omar', trusted = true) {
      return new LimitedNoAppActionService({
        actor: {participantId: actor, accountPublicKeyHex: actor === 'omar' ? omarAccount : `0x${'55'.repeat(32)}`, signer: signer(omar)},
        storage, delivery,
        organizerAuthority: {async verify(input) {
          return trusted && input.organizerId === 'mina' && input.organizerAccountPublicKeyHex === minaAccount;
        }},
      });
    },
  };
}
