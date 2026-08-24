import assert from 'node:assert/strict';
import test from 'node:test';
import {verifiedContactFixture} from '../../tests/fixtures/verifiedContactFixture.ts';
import {VerifiedContactRepository, type AsyncJsonStorage} from './verifiedContactRepository.ts';
import {VerifiedContactCeremonyService} from './verifiedContactCeremonyService.ts';
import {verifiedContactFromUrl} from './verifiedContactLink.ts';

class MemoryAsyncStorage implements AsyncJsonStorage {
  values = new Map<string, unknown>();
  async readJSON(key: string) { return structuredClone(this.values.get(key) ?? null); }
  async writeJSON(key: string, value: unknown) { this.values.set(key, structuredClone(value)); }
  async clear(key: string) { this.values.delete(key); }
}

test('separate Mina and Leo services require both code confirmations before reciprocal verification', async () => {
  const fixture = await verifiedContactFixture();
  const minaRepository = new VerifiedContactRepository(new MemoryAsyncStorage());
  const leoRepository = new VerifiedContactRepository(new MemoryAsyncStorage());
  const minaDrafts = new MemoryAsyncStorage();
  const leoDrafts = new MemoryAsyncStorage();
  const mina = service(fixture.mina, minaRepository, 'mina', minaDrafts);
  const leo = service(fixture.leo, leoRepository, 'leo', leoDrafts);

  const offerState = await mina.start();
  assert.equal(offerState.status, 'offer_ready');
  if (offerState.status !== 'offer_ready') throw new Error('Expected offer.');
  assert.equal((await leo.enter(offerState.offer)).status, 'offer_received');

  const leoCompare = await leo.respond();
  assert.equal(leoCompare.status, 'compare');
  if (leoCompare.status !== 'compare') throw new Error('Expected comparison.');
  const minaCompare = await mina.enter(leoCompare.response);
  assert.equal(minaCompare.status, 'compare');
  if (minaCompare.status !== 'compare') throw new Error('Expected comparison.');
  assert.equal(minaCompare.safetyCode, leoCompare.safetyCode);
  assert.deepEqual(await minaRepository.list(fixture.mina.accountPublicKeyHex), []);
  assert.deepEqual(await leoRepository.list(fixture.leo.accountPublicKeyHex), []);

  const leoReady = await leo.confirmCodesMatch();
  const minaReady = await mina.confirmCodesMatch();
  if (leoReady.status !== 'confirmation_ready' || minaReady.status !== 'confirmation_ready') {
    throw new Error('Expected signed confirmations.');
  }
  assert.equal((await mina.enter(leoReady.localConfirmation)).status, 'verified');
  assert.equal((await leo.enter(minaReady.localConfirmation)).status, 'verified');
  assert.equal((await minaRepository.list(fixture.mina.accountPublicKeyHex))[0].remoteParticipantId, 'leo');
  assert.equal((await leoRepository.list(fixture.leo.accountPublicKeyHex))[0].remoteParticipantId, 'mina');

  const recreatedMina = service(fixture.mina, minaRepository, 'mina-recreated', minaDrafts);
  const restored = await recreatedMina.restore();
  assert.equal(restored.status, 'idle');
  if (restored.status === 'idle') assert.equal(restored.verified[0].remoteParticipantId, 'leo');
});

test('own offer, missing transcript, and expiry stop without creating a record', async () => {
  const fixture = await verifiedContactFixture();
  const repository = new VerifiedContactRepository(new MemoryAsyncStorage());
  const mina = service(fixture.mina, repository, 'mina');
  const ownOffer = await mina.start();
  if (ownOffer.status !== 'offer_ready') throw new Error('Expected offer.');
  assert.equal((await mina.enter(ownOffer.offer)).status, 'wrong_account');
  assert.deepEqual(await repository.list(fixture.mina.accountPublicKeyHex), []);

  const noTranscript = service(fixture.leo, new VerifiedContactRepository(new MemoryAsyncStorage()), 'leo');
  assert.equal((await noTranscript.enter(fixture.minaConfirmation)).status, 'invalid');

  let current = '2026-08-20T10:00:00.000Z';
  const expiringMina = new VerifiedContactCeremonyService({
    actor: fixture.mina,
    repository: new VerifiedContactRepository(new MemoryAsyncStorage()),
    draftStorage: new MemoryAsyncStorage(),
    baseUrl: 'https://chopdot.example/',
    now: () => current,
    id: sequence('expiry-id'),
    nonce: sequence('expiry-nonce-value'),
  });
  const expiringOffer = await expiringMina.start();
  if (expiringOffer.status !== 'offer_ready') throw new Error('Expected offer.');
  current = '2026-08-20T10:21:00.000Z';
  const lateLeo = new VerifiedContactCeremonyService({
    actor: fixture.leo,
    repository: new VerifiedContactRepository(new MemoryAsyncStorage()),
    draftStorage: new MemoryAsyncStorage(),
    baseUrl: 'https://chopdot.example/', now: () => current,
  });
  assert.equal((await lateLeo.enter(expiringOffer.offer)).status, 'expired');
});

test('an in-progress offer and response survive a full service restart', async () => {
  const fixture = await verifiedContactFixture();
  const minaRepository = new VerifiedContactRepository(new MemoryAsyncStorage());
  const leoRepository = new VerifiedContactRepository(new MemoryAsyncStorage());
  const minaDrafts = new MemoryAsyncStorage();
  const leoDrafts = new MemoryAsyncStorage();

  const firstMina = service(fixture.mina, minaRepository, 'mina-first', minaDrafts);
  const offer = await firstMina.start();
  assert.equal(offer.status, 'offer_ready');
  if (offer.status !== 'offer_ready') throw new Error('Expected offer.');
  const restoredMina = await service(fixture.mina, minaRepository, 'mina-second', minaDrafts).restore();
  assert.equal(restoredMina.status, 'offer_ready');

  const firstLeo = service(fixture.leo, leoRepository, 'leo-first', leoDrafts);
  await firstLeo.enter(offer.offer);
  const response = await firstLeo.respond();
  assert.equal(response.status, 'compare');
  const restoredLeo = await service(fixture.leo, leoRepository, 'leo-second', leoDrafts).restore();
  assert.equal(restoredLeo.status, 'compare');
  if (restoredLeo.status === 'compare') assert.equal(restoredLeo.carrierUrl, response.carrierUrl);
});

test('the second confirmer returns a signed final carrier before the first side becomes verified', async () => {
  const fixture = await verifiedContactFixture();
  const minaRepository = new VerifiedContactRepository(new MemoryAsyncStorage());
  const leoRepository = new VerifiedContactRepository(new MemoryAsyncStorage());
  const mina = service(fixture.mina, minaRepository, 'mina-serial');
  const leo = service(fixture.leo, leoRepository, 'leo-serial');

  const offer = await mina.start();
  if (offer.status !== 'offer_ready') throw new Error('Expected offer.');
  await leo.enter(offer.offer);
  const leoResponse = await leo.respond();
  if (leoResponse.status !== 'compare') throw new Error('Expected response.');
  const minaCompare = await mina.enter(leoResponse.response);
  assert.equal(minaCompare.status, 'compare');
  if (minaCompare.status === 'compare') assert.equal(minaCompare.carrierUrl, undefined);

  const minaConfirmation = await mina.confirmCodesMatch();
  if (minaConfirmation.status !== 'confirmation_ready') throw new Error('Expected first confirmation.');
  assert.deepEqual(await minaRepository.list(fixture.mina.accountPublicKeyHex), []);

  const leoReceived = await leo.enter(minaConfirmation.localConfirmation);
  assert.equal(leoReceived.status, 'compare');
  const leoVerified = await leo.confirmCodesMatch();
  assert.equal(leoVerified.status, 'verified');
  if (leoVerified.status !== 'verified') throw new Error('Expected reciprocal verification.');
  assert.match(leoVerified.carrierUrl ?? '', /#chopdot-contact=/u);
  assert.deepEqual(await minaRepository.list(fixture.mina.accountPublicKeyHex), []);

  const finalConfirmation = verifiedContactFromUrl(leoVerified.carrierUrl!);
  assert.ok(finalConfirmation);
  assert.equal((await mina.enter(finalConfirmation)).status, 'verified');
  assert.equal((await minaRepository.list(fixture.mina.accountPublicKeyHex))[0].remoteParticipantId, 'leo');
});

function service(
  actor: Awaited<ReturnType<typeof verifiedContactFixture>>['mina'],
  repository: VerifiedContactRepository,
  prefix: string,
  draftStorage: AsyncJsonStorage = new MemoryAsyncStorage(),
) {
  return new VerifiedContactCeremonyService({
    actor,
    repository,
    draftStorage,
    baseUrl: 'https://chopdot.example/',
    now: sequenceTime(),
    id: sequence(`${prefix}-id`),
    nonce: sequence(`${prefix}-nonce-value`),
  });
}

function sequence(prefix: string) {
  let index = 0;
  return () => `${prefix}-${String(++index).padStart(4, '0')}`;
}

function sequenceTime() {
  let milliseconds = Date.parse('2026-08-20T10:00:00.000Z');
  return () => new Date(milliseconds += 1_000).toISOString();
}
