import type {
  AccountMessageSigner,
  AccountMessageVerifier,
} from '../membership/groupKeyHandoff.ts';
import {verifyProductAccountSignature} from '../membership/groupKeyHandoff.ts';

const encoder = new TextEncoder();
const OFFER_DOMAIN = 'chopdot:verified-contact-offer:v1';
const RESPONSE_DOMAIN = 'chopdot:verified-contact-response:v1';
const CONFIRMATION_DOMAIN = 'chopdot:verified-contact-confirmation:v1';

export interface ContactActor {
  participantId: string;
  accountPublicKeyHex: string;
  signer: AccountMessageSigner;
}

export interface SignedContactOfferV1 {
  v: 1;
  kind: 'contact_offer';
  offerId: string;
  initiatorId: string;
  initiatorAccountPublicKeyHex: string;
  nonce: string;
  createdAt: string;
  expiresAt: string;
  signature: string;
}

export interface SignedContactResponseV1 {
  v: 1;
  kind: 'contact_response';
  responseId: string;
  offerFingerprint: string;
  responderId: string;
  responderAccountPublicKeyHex: string;
  nonce: string;
  respondedAt: string;
  expiresAt: string;
  signature: string;
}

export interface SignedContactConfirmationV1 {
  v: 1;
  kind: 'contact_confirmation';
  confirmationId: string;
  transcriptFingerprint: string;
  safetyCode: string;
  actorId: string;
  actorAccountPublicKeyHex: string;
  remoteId: string;
  remoteAccountPublicKeyHex: string;
  confirmedAt: string;
  signature: string;
}

export type SignedContactCarrierMessageV1 =
  | SignedContactOfferV1
  | SignedContactResponseV1
  | SignedContactConfirmationV1;

export interface VerifiedContactRecordV1 {
  v: 1;
  recordId: string;
  localParticipantId: string;
  localAccountPublicKeyHex: string;
  remoteParticipantId: string;
  remoteAccountPublicKeyHex: string;
  transcriptFingerprint: string;
  safetyCode: string;
  offer: SignedContactOfferV1;
  response: SignedContactResponseV1;
  localConfirmation: SignedContactConfirmationV1;
  remoteConfirmation: SignedContactConfirmationV1;
  verifiedAt: string;
}

export async function createContactOffer(input: {
  offerId: string;
  actor: ContactActor;
  nonce: string;
  createdAt: string;
  expiresAt: string;
}): Promise<SignedContactOfferV1> {
  const unsigned = canonicalUnsignedOffer({
    v: 1,
    kind: 'contact_offer',
    offerId: input.offerId,
    initiatorId: input.actor.participantId,
    initiatorAccountPublicKeyHex: input.actor.accountPublicKeyHex,
    nonce: input.nonce,
    createdAt: input.createdAt,
    expiresAt: input.expiresAt,
  });
  assertWindow(unsigned.createdAt, unsigned.expiresAt);
  return {...unsigned, signature: await sign(input.actor.signer, OFFER_DOMAIN, unsigned)};
}

export async function verifyContactOffer(
  offer: SignedContactOfferV1,
  now: string,
  verifier: AccountMessageVerifier = verifyProductAccountSignature,
): Promise<boolean> {
  try {
    const canonical = canonicalOffer(offer);
    assertWithinWindow(now, canonical.createdAt, canonical.expiresAt);
    return verifier(
      canonical.initiatorAccountPublicKeyHex,
      signingBytes(OFFER_DOMAIN, unsignedOffer(canonical)),
      hexToBytes(canonical.signature),
    );
  } catch {
    return false;
  }
}

export async function createContactResponse(input: {
  responseId: string;
  offer: SignedContactOfferV1;
  actor: ContactActor;
  nonce: string;
  respondedAt: string;
  verifier?: AccountMessageVerifier;
}): Promise<SignedContactResponseV1> {
  if (!await verifyContactOffer(input.offer, input.respondedAt, input.verifier)) {
    throw new Error('This verification request is invalid or expired.');
  }
  const offer = canonicalOffer(input.offer);
  if (normalizeAccount(input.actor.accountPublicKeyHex) === offer.initiatorAccountPublicKeyHex) {
    throw new Error('A different Product Account must respond.');
  }
  const unsigned = canonicalUnsignedResponse({
    v: 1,
    kind: 'contact_response',
    responseId: input.responseId,
    offerFingerprint: await contactOfferFingerprint(offer),
    responderId: input.actor.participantId,
    responderAccountPublicKeyHex: input.actor.accountPublicKeyHex,
    nonce: input.nonce,
    respondedAt: input.respondedAt,
    expiresAt: offer.expiresAt,
  });
  return {...unsigned, signature: await sign(input.actor.signer, RESPONSE_DOMAIN, unsigned)};
}

export async function verifyContactResponse(
  offerInput: SignedContactOfferV1,
  responseInput: SignedContactResponseV1,
  now: string,
  verifier: AccountMessageVerifier = verifyProductAccountSignature,
): Promise<boolean> {
  try {
    const offer = canonicalOffer(offerInput);
    const response = canonicalResponse(responseInput);
    assertWithinWindow(now, offer.createdAt, offer.expiresAt);
    if (
      response.offerFingerprint !== await contactOfferFingerprint(offer)
      || response.expiresAt !== offer.expiresAt
      || Date.parse(response.respondedAt) < Date.parse(offer.createdAt)
      || Date.parse(response.respondedAt) >= Date.parse(offer.expiresAt)
      || response.responderAccountPublicKeyHex === offer.initiatorAccountPublicKeyHex
    ) return false;
    return verifier(
      response.responderAccountPublicKeyHex,
      signingBytes(RESPONSE_DOMAIN, unsignedResponse(response)),
      hexToBytes(response.signature),
    );
  } catch {
    return false;
  }
}

export async function contactTranscript(input: {
  offer: SignedContactOfferV1;
  response: SignedContactResponseV1;
  now: string;
  verifier?: AccountMessageVerifier;
}): Promise<{fingerprint: string; safetyCode: string}> {
  if (!await verifyContactOffer(input.offer, input.now, input.verifier)
    || !await verifyContactResponse(input.offer, input.response, input.now, input.verifier)) {
    throw new Error('This verification exchange is invalid or expired.');
  }
  const fingerprint = await sha256Hex(stableSerialize({
    offer: canonicalOffer(input.offer),
    response: canonicalResponse(input.response),
  }));
  return {fingerprint, safetyCode: safetyCodeFromFingerprint(fingerprint)};
}

export async function createContactConfirmation(input: {
  confirmationId: string;
  offer: SignedContactOfferV1;
  response: SignedContactResponseV1;
  actor: ContactActor;
  confirmedAt: string;
  verifier?: AccountMessageVerifier;
}): Promise<SignedContactConfirmationV1> {
  const transcript = await contactTranscript({
    offer: input.offer,
    response: input.response,
    now: input.confirmedAt,
    verifier: input.verifier,
  });
  const offer = canonicalOffer(input.offer);
  const response = canonicalResponse(input.response);
  const actorAccount = normalizeAccount(input.actor.accountPublicKeyHex);
  const isInitiator = actorAccount === offer.initiatorAccountPublicKeyHex
    && input.actor.participantId.trim() === offer.initiatorId;
  const isResponder = actorAccount === response.responderAccountPublicKeyHex
    && input.actor.participantId.trim() === response.responderId;
  if (!isInitiator && !isResponder) throw new Error('This account is not part of the verification.');
  const remoteId = isInitiator ? response.responderId : offer.initiatorId;
  const remoteAccountPublicKeyHex = isInitiator
    ? response.responderAccountPublicKeyHex
    : offer.initiatorAccountPublicKeyHex;
  const unsigned = canonicalUnsignedConfirmation({
    v: 1,
    kind: 'contact_confirmation',
    confirmationId: input.confirmationId,
    transcriptFingerprint: transcript.fingerprint,
    safetyCode: transcript.safetyCode,
    actorId: input.actor.participantId,
    actorAccountPublicKeyHex: actorAccount,
    remoteId,
    remoteAccountPublicKeyHex,
    confirmedAt: input.confirmedAt,
  });
  return {...unsigned, signature: await sign(input.actor.signer, CONFIRMATION_DOMAIN, unsigned)};
}

export async function verifyContactConfirmation(input: {
  offer: SignedContactOfferV1;
  response: SignedContactResponseV1;
  confirmation: SignedContactConfirmationV1;
  now: string;
  expectedActorId: string;
  expectedActorAccountPublicKeyHex: string;
  expectedRemoteId: string;
  expectedRemoteAccountPublicKeyHex: string;
  verifier?: AccountMessageVerifier;
}): Promise<boolean> {
  try {
    const transcript = await contactTranscript({
      offer: input.offer,
      response: input.response,
      now: input.now,
      verifier: input.verifier,
    });
    return verifyConfirmation(
      canonicalConfirmation(input.confirmation),
      transcript,
      required(input.expectedActorId),
      account(input.expectedActorAccountPublicKeyHex),
      required(input.expectedRemoteId),
      account(input.expectedRemoteAccountPublicKeyHex),
      input.verifier,
    );
  } catch {
    return false;
  }
}

export async function completeVerifiedContact(input: {
  offer: SignedContactOfferV1;
  response: SignedContactResponseV1;
  localConfirmation: SignedContactConfirmationV1;
  remoteConfirmation: SignedContactConfirmationV1;
  localParticipantId: string;
  localAccountPublicKeyHex: string;
  now: string;
  verifier?: AccountMessageVerifier;
}): Promise<VerifiedContactRecordV1> {
  const transcript = await contactTranscript({
    offer: input.offer,
    response: input.response,
    now: input.now,
    verifier: input.verifier,
  });
  const localAccount = normalizeAccount(input.localAccountPublicKeyHex);
  const localId = required(input.localParticipantId);
  const offer = canonicalOffer(input.offer);
  const response = canonicalResponse(input.response);
  const localIsInitiator = localAccount === offer.initiatorAccountPublicKeyHex && localId === offer.initiatorId;
  const localIsResponder = localAccount === response.responderAccountPublicKeyHex && localId === response.responderId;
  if (!localIsInitiator && !localIsResponder) throw new Error('This contact is not for the current Product Account.');

  const localConfirmation = canonicalConfirmation(input.localConfirmation);
  const remoteConfirmation = canonicalConfirmation(input.remoteConfirmation);
  const remoteId = localIsInitiator ? response.responderId : offer.initiatorId;
  const remoteAccount = localIsInitiator
    ? response.responderAccountPublicKeyHex
    : offer.initiatorAccountPublicKeyHex;
  if (!await verifyConfirmation(localConfirmation, transcript, localId, localAccount, remoteId, remoteAccount, input.verifier)
    || !await verifyConfirmation(remoteConfirmation, transcript, remoteId, remoteAccount, localId, localAccount, input.verifier)) {
    throw new Error('Both people must confirm the same code.');
  }
  const verifiedAt = new Date(Math.max(
    Date.parse(localConfirmation.confirmedAt),
    Date.parse(remoteConfirmation.confirmedAt),
  )).toISOString();
  if (Date.parse(verifiedAt) >= Date.parse(offer.expiresAt)) {
    throw new Error('This verification expired before it was completed.');
  }
  return {
    v: 1,
    recordId: transcript.fingerprint,
    localParticipantId: localId,
    localAccountPublicKeyHex: localAccount,
    remoteParticipantId: remoteId,
    remoteAccountPublicKeyHex: remoteAccount,
    transcriptFingerprint: transcript.fingerprint,
    safetyCode: transcript.safetyCode,
    offer,
    response,
    localConfirmation,
    remoteConfirmation,
    verifiedAt,
  };
}

export async function verifyContactRecord(
  recordInput: VerifiedContactRecordV1,
  verifier: AccountMessageVerifier = verifyProductAccountSignature,
): Promise<boolean> {
  try {
    assertExactKeys(recordInput, [
      'v', 'recordId', 'localParticipantId', 'localAccountPublicKeyHex',
      'remoteParticipantId', 'remoteAccountPublicKeyHex', 'transcriptFingerprint',
      'safetyCode', 'offer', 'response', 'localConfirmation', 'remoteConfirmation',
      'verifiedAt',
    ]);
    if (recordInput.v !== 1) return false;
    const record = await completeVerifiedContact({
      offer: recordInput.offer,
      response: recordInput.response,
      localConfirmation: recordInput.localConfirmation,
      remoteConfirmation: recordInput.remoteConfirmation,
      localParticipantId: recordInput.localParticipantId,
      localAccountPublicKeyHex: recordInput.localAccountPublicKeyHex,
      now: recordInput.verifiedAt,
      verifier,
    });
    return stableSerialize(record) === stableSerialize(recordInput);
  } catch {
    return false;
  }
}

export function assertSignedContactCarrierMessage(
  value: unknown,
): asserts value is SignedContactCarrierMessageV1 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid contact message.');
  const kind = (value as {kind?: unknown}).kind;
  if (kind === 'contact_offer') canonicalOffer(value as SignedContactOfferV1);
  else if (kind === 'contact_response') canonicalResponse(value as SignedContactResponseV1);
  else if (kind === 'contact_confirmation') canonicalConfirmation(value as SignedContactConfirmationV1);
  else throw new Error('Unknown contact message.');
}

export async function contactOfferFingerprint(offer: SignedContactOfferV1): Promise<string> {
  return sha256Hex(stableSerialize(canonicalOffer(offer)));
}

async function verifyConfirmation(
  confirmation: SignedContactConfirmationV1,
  transcript: {fingerprint: string; safetyCode: string},
  actorId: string,
  actorAccount: string,
  remoteId: string,
  remoteAccount: string,
  verifier: AccountMessageVerifier = verifyProductAccountSignature,
): Promise<boolean> {
  if (
    confirmation.transcriptFingerprint !== transcript.fingerprint
    || confirmation.safetyCode !== transcript.safetyCode
    || confirmation.actorId !== actorId
    || confirmation.actorAccountPublicKeyHex !== actorAccount
    || confirmation.remoteId !== remoteId
    || confirmation.remoteAccountPublicKeyHex !== remoteAccount
  ) return false;
  return verifier(
    actorAccount,
    signingBytes(CONFIRMATION_DOMAIN, unsignedConfirmation(confirmation)),
    hexToBytes(confirmation.signature),
  );
}

async function sign(signer: AccountMessageSigner, domain: string, value: unknown): Promise<string> {
  const signature = await signer.signBytes(signingBytes(domain, value));
  if (signature.byteLength !== 64) throw new Error('Product Account signature is invalid.');
  return bytesToHex(signature);
}

function signingBytes(domain: string, value: unknown): Uint8Array {
  return encoder.encode(`${domain}\n${stableSerialize(value)}`);
}

async function sha256Hex(value: string): Promise<string> {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}

function safetyCodeFromFingerprint(value: string): string {
  const bytes = hexToBytes(value);
  const number = (((bytes[0] << 24) >>> 0) + (bytes[1] << 16) + (bytes[2] << 8) + bytes[3]) % 1_000_000;
  const digits = number.toString().padStart(6, '0');
  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
}

function canonicalOffer(value: SignedContactOfferV1): SignedContactOfferV1 {
  assertExactKeys(value, [
    'v', 'kind', 'offerId', 'initiatorId', 'initiatorAccountPublicKeyHex',
    'nonce', 'createdAt', 'expiresAt', 'signature',
  ]);
  if (value.v !== 1 || value.kind !== 'contact_offer') throw new Error('Invalid offer.');
  const result = {...canonicalUnsignedOffer(value), signature: canonicalSignature(value.signature)};
  assertWindow(result.createdAt, result.expiresAt);
  return result;
}

function canonicalUnsignedOffer(value: Omit<SignedContactOfferV1, 'signature'>): Omit<SignedContactOfferV1, 'signature'> {
  return {
    v: 1,
    kind: 'contact_offer',
    offerId: required(value.offerId),
    initiatorId: required(value.initiatorId),
    initiatorAccountPublicKeyHex: account(value.initiatorAccountPublicKeyHex),
    nonce: canonicalNonce(value.nonce),
    createdAt: timestamp(value.createdAt),
    expiresAt: timestamp(value.expiresAt),
  };
}

function canonicalResponse(value: SignedContactResponseV1): SignedContactResponseV1 {
  assertExactKeys(value, [
    'v', 'kind', 'responseId', 'offerFingerprint', 'responderId',
    'responderAccountPublicKeyHex', 'nonce', 'respondedAt', 'expiresAt', 'signature',
  ]);
  if (value.v !== 1 || value.kind !== 'contact_response') throw new Error('Invalid response.');
  return {...canonicalUnsignedResponse(value), signature: canonicalSignature(value.signature)};
}

function canonicalUnsignedResponse(value: Omit<SignedContactResponseV1, 'signature'>): Omit<SignedContactResponseV1, 'signature'> {
  return {
    v: 1,
    kind: 'contact_response',
    responseId: required(value.responseId),
    offerFingerprint: digest(value.offerFingerprint),
    responderId: required(value.responderId),
    responderAccountPublicKeyHex: account(value.responderAccountPublicKeyHex),
    nonce: canonicalNonce(value.nonce),
    respondedAt: timestamp(value.respondedAt),
    expiresAt: timestamp(value.expiresAt),
  };
}

function canonicalConfirmation(value: SignedContactConfirmationV1): SignedContactConfirmationV1 {
  assertExactKeys(value, [
    'v', 'kind', 'confirmationId', 'transcriptFingerprint', 'safetyCode',
    'actorId', 'actorAccountPublicKeyHex', 'remoteId', 'remoteAccountPublicKeyHex',
    'confirmedAt', 'signature',
  ]);
  if (value.v !== 1 || value.kind !== 'contact_confirmation') throw new Error('Invalid confirmation.');
  return {...canonicalUnsignedConfirmation(value), signature: canonicalSignature(value.signature)};
}

function canonicalUnsignedConfirmation(value: Omit<SignedContactConfirmationV1, 'signature'>): Omit<SignedContactConfirmationV1, 'signature'> {
  const safetyCode = required(value.safetyCode);
  if (!/^\d{3} \d{3}$/u.test(safetyCode)) throw new Error('Invalid safety code.');
  return {
    v: 1,
    kind: 'contact_confirmation',
    confirmationId: required(value.confirmationId),
    transcriptFingerprint: digest(value.transcriptFingerprint),
    safetyCode,
    actorId: required(value.actorId),
    actorAccountPublicKeyHex: account(value.actorAccountPublicKeyHex),
    remoteId: required(value.remoteId),
    remoteAccountPublicKeyHex: account(value.remoteAccountPublicKeyHex),
    confirmedAt: timestamp(value.confirmedAt),
  };
}

function unsignedOffer(value: SignedContactOfferV1): Omit<SignedContactOfferV1, 'signature'> {
  const {signature: _signature, ...unsigned} = value;
  return unsigned;
}

function unsignedResponse(value: SignedContactResponseV1): Omit<SignedContactResponseV1, 'signature'> {
  const {signature: _signature, ...unsigned} = value;
  return unsigned;
}

function unsignedConfirmation(value: SignedContactConfirmationV1): Omit<SignedContactConfirmationV1, 'signature'> {
  const {signature: _signature, ...unsigned} = value;
  return unsigned;
}

function assertWithinWindow(nowValue: string, createdAt: string, expiresAt: string): void {
  const now = Date.parse(timestamp(nowValue));
  if (now < Date.parse(createdAt) || now >= Date.parse(expiresAt)) throw new Error('Verification is expired.');
}

function assertWindow(createdAt: string, expiresAt: string): void {
  if (Date.parse(createdAt) >= Date.parse(expiresAt)) throw new Error('Invalid verification window.');
}

function timestamp(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error('Invalid timestamp.');
  return new Date(parsed).toISOString();
}

function required(value: string): string {
  const result = typeof value === 'string' ? value.trim() : '';
  if (!result || result.length > 160) throw new Error('Required value is invalid.');
  return result;
}

function account(value: string): string {
  const result = normalizeAccount(value);
  if (!result) throw new Error('Product Account is invalid.');
  return result;
}

function normalizeAccount(value: string): string {
  const result = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return /^0x[0-9a-f]{64}$/u.test(result) ? result : '';
}

function canonicalNonce(value: string): string {
  const result = required(value);
  if (!/^[A-Za-z0-9_-]{16,128}$/u.test(result)) throw new Error('Invalid nonce.');
  return result;
}

function digest(value: string): string {
  const result = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!/^0x[0-9a-f]{64}$/u.test(result)) throw new Error('Invalid fingerprint.');
  return result;
}

function canonicalSignature(value: string): string {
  const result = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!/^0x[0-9a-f]{128}$/u.test(result)) throw new Error('Invalid signature.');
  return result;
}

function assertExactKeys(value: unknown, expected: string[]): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid object.');
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const wanted = [...expected].sort();
  if (keys.length !== wanted.length || keys.some((key, index) => key !== wanted[index])) {
    throw new Error('Unexpected fields.');
  }
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function bytesToHex(value: Uint8Array): string {
  return `0x${Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function hexToBytes(value: string): Uint8Array {
  const hex = value.startsWith('0x') ? value.slice(2) : value;
  if (hex.length % 2 !== 0 || !/^[0-9a-f]+$/iu.test(hex)) throw new Error('Invalid hex.');
  return Uint8Array.from(hex.match(/.{2}/gu)!.map(byte => Number.parseInt(byte, 16)));
}
