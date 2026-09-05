import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import {
  completeVerifiedContact,
  contactTranscript,
  createContactConfirmation,
  createContactOffer,
  createContactResponse,
  type ContactActor,
} from '../../src/contacts/verifiedContact.ts';

export async function verifiedContactFixture() {
  await cryptoWaitReady();
  const mina = verifiedContactActor('mina', 11);
  const leo = verifiedContactActor('leo', 22);
  const offer = await createContactOffer({
    offerId: 'offer-mina-leo', actor: mina, nonce: 'offer-nonce-mina-0001',
    createdAt: '2026-08-20T10:00:00.000Z', expiresAt: '2026-08-20T10:20:00.000Z',
  });
  const response = await createContactResponse({
    responseId: 'response-leo', offer, actor: leo, nonce: 'response-nonce-leo-0001',
    respondedAt: '2026-08-20T10:02:00.000Z',
  });
  const transcript = await contactTranscript({offer, response, now: '2026-08-20T10:03:00.000Z'});
  const minaConfirmation = await createContactConfirmation({
    confirmationId: 'confirm-mina', offer, response, actor: mina,
    confirmedAt: '2026-08-20T10:04:00.000Z',
  });
  const leoConfirmation = await createContactConfirmation({
    confirmationId: 'confirm-leo', offer, response, actor: leo,
    confirmedAt: '2026-08-20T10:04:30.000Z',
  });
  const minaRecord = await completeVerifiedContact({
    offer, response, localConfirmation: minaConfirmation, remoteConfirmation: leoConfirmation,
    localParticipantId: mina.participantId, localAccountPublicKeyHex: mina.accountPublicKeyHex,
    now: '2026-08-20T10:05:00.000Z',
  });
  const leoRecord = await completeVerifiedContact({
    offer, response, localConfirmation: leoConfirmation, remoteConfirmation: minaConfirmation,
    localParticipantId: leo.participantId, localAccountPublicKeyHex: leo.accountPublicKeyHex,
    now: '2026-08-20T10:05:00.000Z',
  });
  return {mina, leo, offer, response, transcript, minaConfirmation, leoConfirmation, minaRecord, leoRecord};
}

export function verifiedContactActor(participantId: string, seedByte: number): ContactActor {
  const pair = sr25519PairFromSeed(new Uint8Array(32).fill(seedByte));
  return {
    participantId,
    accountPublicKeyHex: `0x${Array.from(pair.publicKey, byte => byte.toString(16).padStart(2, '0')).join('')}`,
    signer: {async signBytes(data) { return sr25519Sign(data, pair); }},
  };
}
