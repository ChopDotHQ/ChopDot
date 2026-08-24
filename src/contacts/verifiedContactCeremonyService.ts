import type {AccountMessageVerifier} from '../membership/groupKeyHandoff.ts';
import {
  completeVerifiedContact,
  contactTranscript,
  createContactConfirmation,
  createContactOffer,
  createContactResponse,
  verifyContactConfirmation,
  verifyContactOffer,
  verifyContactResponse,
  assertSignedContactCarrierMessage,
  type ContactActor,
  type SignedContactCarrierMessageV1,
  type SignedContactConfirmationV1,
  type SignedContactOfferV1,
  type SignedContactResponseV1,
  type VerifiedContactRecordV1,
} from './verifiedContact.ts';
import {verifiedContactUrl} from './verifiedContactLink.ts';
import {VerifiedContactRepository, type AsyncJsonStorage} from './verifiedContactRepository.ts';

const DRAFT_PREFIX = 'chopdot:verified-contact-draft:v1';

export type VerifiedContactCeremonyState =
  | {status: 'idle'; verified: VerifiedContactRecordV1[]}
  | {status: 'offer_ready'; offer: SignedContactOfferV1; carrierUrl: string}
  | {status: 'offer_received'; offer: SignedContactOfferV1; remoteId: string}
  | {
      status: 'compare';
      offer: SignedContactOfferV1;
      response: SignedContactResponseV1;
      remoteId: string;
      safetyCode: string;
      carrierUrl?: string;
      remoteConfirmation?: SignedContactConfirmationV1;
    }
  | {
      status: 'confirmation_ready';
      offer: SignedContactOfferV1;
      response: SignedContactResponseV1;
      localConfirmation: SignedContactConfirmationV1;
      remoteConfirmation?: SignedContactConfirmationV1;
      remoteId: string;
      safetyCode: string;
      carrierUrl: string;
    }
  | {status: 'verified'; record: VerifiedContactRecordV1; carrierUrl?: string}
  | {status: 'expired'}
  | {status: 'wrong_account'}
  | {status: 'invalid'};

export interface VerifiedContactCeremonyOptions {
  actor: ContactActor;
  repository: VerifiedContactRepository;
  draftStorage: AsyncJsonStorage;
  baseUrl: string;
  now?: () => string;
  id?: () => string;
  nonce?: () => string;
  verifier?: AccountMessageVerifier;
}

export class VerifiedContactCeremonyService {
  private stateValue: VerifiedContactCeremonyState = {status: 'idle', verified: []};
  private offer: SignedContactOfferV1 | null = null;
  private response: SignedContactResponseV1 | null = null;
  private localConfirmation: SignedContactConfirmationV1 | null = null;
  private remoteConfirmation: SignedContactConfirmationV1 | null = null;

  constructor(private readonly options: VerifiedContactCeremonyOptions) {}

  get state(): VerifiedContactCeremonyState {
    return this.stateValue;
  }

  async restore(): Promise<VerifiedContactCeremonyState> {
    const verified = await this.options.repository.list(this.options.actor.accountPublicKeyHex);
    const restored = await this.restoreDraft();
    if (restored) return restored;
    this.stateValue = {status: 'idle', verified};
    return this.stateValue;
  }

  async start(): Promise<VerifiedContactCeremonyState> {
    const createdAt = this.now();
    const expiresAt = new Date(Date.parse(createdAt) + 20 * 60_000).toISOString();
    this.offer = await createContactOffer({
      offerId: this.id(),
      actor: this.options.actor,
      nonce: this.nonce(),
      createdAt,
      expiresAt,
    });
    this.response = null;
    this.localConfirmation = null;
    this.remoteConfirmation = null;
    this.stateValue = {
      status: 'offer_ready',
      offer: this.offer,
      carrierUrl: verifiedContactUrl(this.options.baseUrl, this.offer),
    };
    await this.persistDraft();
    return this.stateValue;
  }

  async enter(message: SignedContactCarrierMessageV1): Promise<VerifiedContactCeremonyState> {
    const now = this.now();
    if (message.kind === 'contact_offer') {
      if (!await verifyContactOffer(message, now, this.options.verifier)) return this.failByTime(message.expiresAt);
      if (message.initiatorAccountPublicKeyHex === normalizeAccount(this.options.actor.accountPublicKeyHex)) {
        this.stateValue = {status: 'wrong_account'};
        return this.stateValue;
      }
      this.offer = message;
      this.response = null;
      this.localConfirmation = null;
      this.remoteConfirmation = null;
      this.stateValue = {status: 'offer_received', offer: message, remoteId: message.initiatorId};
      await this.persistDraft();
      return this.stateValue;
    }
    if (!this.offer) {
      this.stateValue = {status: 'invalid'};
      return this.stateValue;
    }
    if (message.kind === 'contact_response') {
      if (!await verifyContactResponse(this.offer, message, now, this.options.verifier)) return this.failByTime(message.expiresAt);
      if (this.offer.initiatorAccountPublicKeyHex !== normalizeAccount(this.options.actor.accountPublicKeyHex)) {
        this.stateValue = {status: 'wrong_account'};
        return this.stateValue;
      }
      this.response = message;
      this.localConfirmation = null;
      this.remoteConfirmation = null;
      const state = await this.showComparison();
      await this.persistDraft();
      return state;
    }
    if (!this.response) {
      this.stateValue = {status: 'invalid'};
      return this.stateValue;
    }
    const remote = this.remoteParty();
    if (!await verifyContactConfirmation({
      offer: this.offer,
      response: this.response,
      confirmation: message,
      now,
      expectedActorId: remote.id,
      expectedActorAccountPublicKeyHex: remote.account,
      expectedRemoteId: this.options.actor.participantId,
      expectedRemoteAccountPublicKeyHex: this.options.actor.accountPublicKeyHex,
      verifier: this.options.verifier,
    })) {
      this.stateValue = {status: 'invalid'};
      return this.stateValue;
    }
    this.remoteConfirmation = message;
    if (this.localConfirmation) return this.complete();
    const state = await this.showComparison();
    await this.persistDraft();
    return state;
  }

  async respond(): Promise<VerifiedContactCeremonyState> {
    if (!this.offer || this.stateValue.status !== 'offer_received') {
      this.stateValue = {status: 'invalid'};
      return this.stateValue;
    }
    this.response = await createContactResponse({
      responseId: this.id(),
      offer: this.offer,
      actor: this.options.actor,
      nonce: this.nonce(),
      respondedAt: this.now(),
      verifier: this.options.verifier,
    });
    const state = await this.showComparison(verifiedContactUrl(this.options.baseUrl, this.response));
    await this.persistDraft();
    return state;
  }

  async confirmCodesMatch(): Promise<VerifiedContactCeremonyState> {
    if (!this.offer || !this.response || !['compare', 'confirmation_ready'].includes(this.stateValue.status)) {
      this.stateValue = {status: 'invalid'};
      return this.stateValue;
    }
    if (!this.localConfirmation) {
      this.localConfirmation = await createContactConfirmation({
        confirmationId: this.id(),
        offer: this.offer,
        response: this.response,
        actor: this.options.actor,
        confirmedAt: this.now(),
        verifier: this.options.verifier,
      });
    }
    if (this.remoteConfirmation) {
      return this.complete(verifiedContactUrl(this.options.baseUrl, this.localConfirmation));
    }
    const transcript = await contactTranscript({
      offer: this.offer, response: this.response, now: this.now(), verifier: this.options.verifier,
    });
    this.stateValue = {
      status: 'confirmation_ready',
      offer: this.offer,
      response: this.response,
      localConfirmation: this.localConfirmation,
      remoteId: this.remoteParty().id,
      safetyCode: transcript.safetyCode,
      carrierUrl: verifiedContactUrl(this.options.baseUrl, this.localConfirmation),
      ...(this.remoteConfirmation ? {remoteConfirmation: this.remoteConfirmation} : {}),
    };
    await this.persistDraft();
    return this.stateValue;
  }

  reset(): VerifiedContactCeremonyState {
    this.offer = null;
    this.response = null;
    this.localConfirmation = null;
    this.remoteConfirmation = null;
    this.stateValue = {status: 'idle', verified: []};
    return this.stateValue;
  }

  private async showComparison(carrierUrl?: string): Promise<VerifiedContactCeremonyState> {
    if (!this.offer || !this.response) return this.fail();
    try {
      const transcript = await contactTranscript({
        offer: this.offer, response: this.response, now: this.now(), verifier: this.options.verifier,
      });
      this.stateValue = {
        status: 'compare',
        offer: this.offer,
        response: this.response,
        remoteId: this.remoteParty().id,
        safetyCode: transcript.safetyCode,
        ...(carrierUrl ? {carrierUrl} : {}),
        ...(this.remoteConfirmation ? {remoteConfirmation: this.remoteConfirmation} : {}),
      };
      return this.stateValue;
    } catch {
      return this.failByTime(this.offer.expiresAt);
    }
  }

  private async complete(carrierUrl?: string): Promise<VerifiedContactCeremonyState> {
    if (!this.offer || !this.response || !this.localConfirmation || !this.remoteConfirmation) return this.fail();
    try {
      const record = await completeVerifiedContact({
        offer: this.offer,
        response: this.response,
        localConfirmation: this.localConfirmation,
        remoteConfirmation: this.remoteConfirmation,
        localParticipantId: this.options.actor.participantId,
        localAccountPublicKeyHex: this.options.actor.accountPublicKeyHex,
        now: this.now(),
        verifier: this.options.verifier,
      });
      await this.options.repository.save(record);
      await this.options.draftStorage.clear(this.draftKey());
      this.stateValue = {status: 'verified', record, ...(carrierUrl ? {carrierUrl} : {})};
      return this.stateValue;
    } catch {
      return this.failByTime(this.offer.expiresAt);
    }
  }

  private remoteParty(): {id: string; account: string} {
    if (!this.offer || !this.response) throw new Error('Verification transcript is incomplete.');
    const local = normalizeAccount(this.options.actor.accountPublicKeyHex);
    return local === this.offer.initiatorAccountPublicKeyHex
      ? {id: this.response.responderId, account: this.response.responderAccountPublicKeyHex}
      : {id: this.offer.initiatorId, account: this.offer.initiatorAccountPublicKeyHex};
  }

  private now(): string {
    return (this.options.now ?? (() => new Date().toISOString()))();
  }

  private id(): string {
    return (this.options.id ?? (() => crypto.randomUUID()))();
  }

  private nonce(): string {
    return (this.options.nonce ?? randomNonce)();
  }

  private failByTime(expiresAt: string): VerifiedContactCeremonyState {
    this.stateValue = Date.parse(this.now()) >= Date.parse(expiresAt)
      ? {status: 'expired'}
      : {status: 'invalid'};
    return this.stateValue;
  }

  private fail(): VerifiedContactCeremonyState {
    this.stateValue = {status: 'invalid'};
    return this.stateValue;
  }

  private async persistDraft(): Promise<void> {
    if (!this.offer) return;
    await this.options.draftStorage.writeJSON(this.draftKey(), {
      v: 1,
      offer: this.offer,
      ...(this.response ? {response: this.response} : {}),
      ...(this.localConfirmation ? {localConfirmation: this.localConfirmation} : {}),
      ...(this.remoteConfirmation ? {remoteConfirmation: this.remoteConfirmation} : {}),
    });
  }

  private async restoreDraft(): Promise<VerifiedContactCeremonyState | null> {
    const stored = await this.options.draftStorage.readJSON(this.draftKey());
    if (!stored) return null;
    try {
      if (!stored || typeof stored !== 'object' || Array.isArray(stored)) throw new Error('Invalid draft.');
      const draft = stored as Record<string, unknown>;
      const allowed = ['v', 'offer', 'response', 'localConfirmation', 'remoteConfirmation'];
      if (draft.v !== 1 || !draft.offer || Object.keys(draft).some(key => !allowed.includes(key))) {
        throw new Error('Invalid draft.');
      }
      assertSignedContactCarrierMessage(draft.offer);
      if (draft.offer.kind !== 'contact_offer' || !await verifyContactOffer(draft.offer, this.now(), this.options.verifier)) {
        throw new Error('Invalid offer.');
      }
      this.offer = draft.offer;
      this.response = null;
      this.localConfirmation = null;
      this.remoteConfirmation = null;
      const localAccount = normalizeAccount(this.options.actor.accountPublicKeyHex);
      const localIsInitiator = localAccount === this.offer.initiatorAccountPublicKeyHex;
      if (!draft.response) {
        this.stateValue = localIsInitiator
          ? {status: 'offer_ready', offer: this.offer, carrierUrl: verifiedContactUrl(this.options.baseUrl, this.offer)}
          : {status: 'offer_received', offer: this.offer, remoteId: this.offer.initiatorId};
        return this.stateValue;
      }
      assertSignedContactCarrierMessage(draft.response);
      if (draft.response.kind !== 'contact_response'
        || !await verifyContactResponse(this.offer, draft.response, this.now(), this.options.verifier)) {
        throw new Error('Invalid response.');
      }
      this.response = draft.response;
      const remote = this.remoteParty();
      if (draft.localConfirmation) {
        assertSignedContactCarrierMessage(draft.localConfirmation);
        if (draft.localConfirmation.kind !== 'contact_confirmation'
          || !await verifyContactConfirmation({
            offer: this.offer, response: this.response, confirmation: draft.localConfirmation,
            now: this.now(), expectedActorId: this.options.actor.participantId,
            expectedActorAccountPublicKeyHex: localAccount,
            expectedRemoteId: remote.id, expectedRemoteAccountPublicKeyHex: remote.account,
            verifier: this.options.verifier,
          })) throw new Error('Invalid local confirmation.');
        this.localConfirmation = draft.localConfirmation;
      }
      if (draft.remoteConfirmation) {
        assertSignedContactCarrierMessage(draft.remoteConfirmation);
        if (draft.remoteConfirmation.kind !== 'contact_confirmation'
          || !await verifyContactConfirmation({
            offer: this.offer, response: this.response, confirmation: draft.remoteConfirmation,
            now: this.now(), expectedActorId: remote.id,
            expectedActorAccountPublicKeyHex: remote.account,
            expectedRemoteId: this.options.actor.participantId,
            expectedRemoteAccountPublicKeyHex: localAccount,
            verifier: this.options.verifier,
          })) throw new Error('Invalid remote confirmation.');
        this.remoteConfirmation = draft.remoteConfirmation;
      }
      if (this.localConfirmation && this.remoteConfirmation) return this.complete();
      if (this.localConfirmation) {
        const transcript = await contactTranscript({
          offer: this.offer, response: this.response, now: this.now(), verifier: this.options.verifier,
        });
        this.stateValue = {
          status: 'confirmation_ready', offer: this.offer, response: this.response,
          localConfirmation: this.localConfirmation, remoteId: remote.id,
          safetyCode: transcript.safetyCode,
          carrierUrl: verifiedContactUrl(this.options.baseUrl, this.localConfirmation),
          ...(this.remoteConfirmation ? {remoteConfirmation: this.remoteConfirmation} : {}),
        };
        return this.stateValue;
      }
      return this.showComparison(localIsInitiator ? undefined : verifiedContactUrl(this.options.baseUrl, this.response));
    } catch {
      await this.options.draftStorage.clear(this.draftKey());
      this.stateValue = {status: 'invalid'};
      return this.stateValue;
    }
  }

  private draftKey(): string {
    return `${DRAFT_PREFIX}:${normalizeAccount(this.options.actor.accountPublicKeyHex)}`;
  }
}

function randomNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/gu, '');
}

function normalizeAccount(value: string): string {
  return value.trim().toLowerCase();
}
