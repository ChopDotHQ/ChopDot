import assert from 'node:assert/strict';
import test from 'node:test';
import {verifiedContactFixture} from '../../tests/fixtures/verifiedContactFixture.ts';
import {
  completeVerifiedContact,
  contactTranscript,
  createContactConfirmation,
  createContactOffer,
  createContactResponse,
  verifyContactOffer,
  verifyContactRecord,
  verifyContactResponse,
} from './verifiedContact.ts';

test('two isolated Product Accounts confirm one code and create reciprocal records only', async () => {
  const fixture = await verifiedContactFixture();

  assert.match(fixture.transcript.safetyCode, /^\d{3} \d{3}$/u);
  assert.equal(await verifyContactRecord(fixture.minaRecord), true);
  assert.equal(await verifyContactRecord(fixture.leoRecord), true);
  assert.equal(fixture.minaRecord.remoteParticipantId, 'leo');
  assert.equal(fixture.leoRecord.remoteParticipantId, 'mina');
  assert.equal(fixture.minaRecord.recordId, fixture.leoRecord.recordId);
  const serialized = JSON.stringify(fixture.minaRecord);
  for (const forbidden of ['membership', 'groupKey', 'expense', 'split', 'payment', 'organizerGrant']) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test('tamper, wrong signer, unknown fields, self-response, and expiry fail closed', async () => {
  const fixture = await verifiedContactFixture();
  const tampered = structuredClone(fixture.response);
  tampered.responderId = 'nina';
  assert.equal(await verifyContactResponse(fixture.offer, tampered, '2026-08-20T10:03:00.000Z'), false);

  const unknown = {...structuredClone(fixture.offer), groupId: 'not-allowed'};
  assert.equal(await verifyContactOffer(unknown as never, '2026-08-20T10:01:00.000Z'), false);

  await assert.rejects(() => createContactResponse({
    responseId: 'self-response', offer: fixture.offer, actor: fixture.mina,
    nonce: 'self-response-nonce-0001', respondedAt: '2026-08-20T10:01:00.000Z',
  }), /different Product Account/u);

  await assert.rejects(() => createContactResponse({
    responseId: 'late-response', offer: fixture.offer, actor: fixture.leo,
    nonce: 'late-response-nonce-0001', respondedAt: '2026-08-20T10:30:00.000Z',
  }), /invalid or expired/u);

  const wrongConfirmation = structuredClone(fixture.leoConfirmation);
  wrongConfirmation.signature = fixture.minaConfirmation.signature;
  await assert.rejects(() => completeVerifiedContact({
    offer: fixture.offer,
    response: fixture.response,
    localConfirmation: fixture.minaConfirmation,
    remoteConfirmation: wrongConfirmation,
    localParticipantId: 'mina',
    localAccountPublicKeyHex: fixture.mina.accountPublicKeyHex,
    now: '2026-08-20T10:05:00.000Z',
  }), /Both people/u);
});
