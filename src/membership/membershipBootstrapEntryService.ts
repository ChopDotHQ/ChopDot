import type {KeyValueStorage} from '../environment/livePayerSync.ts';
import type {AccountMessageSigner, AccountMessageVerifier} from './groupKeyHandoff.ts';
import type {MembershipGrant} from './membershipLifecycle.ts';
import {
  decodeRecipientBoundBootstrap,
  encodeRecipientBoundBootstrap,
  verifyRecipientBoundBootstrap,
  type RecipientBoundBootstrapV1,
} from './recipientBoundBootstrap.ts';
import {
  TrustedContactInvitationCoordinator,
  type MembershipEventDelivery,
  type PendingAcceptanceVault,
  type ProtectedGroupKeySink,
  type ReceiveMembershipResult,
  type TrustedContactAccountResolver,
  type TrustedGroupOrganizerResolver,
} from './trustedContactInvitationCoordinator.ts';

const INBOX_KEY = 'chopdot-membership-bootstrap-inbox-v1';

export interface VerifiedOrganizerAuthority {
  grant: MembershipGrant;
  proof: {
    source: 'external_trust_registry' | 'preview_fixture';
    proofId: string;
    verifiedAt: string;
  };
}

export interface VerifiedOrganizerAuthorityResolver {
  resolve(input: {
    groupId: string;
    organizerId: string;
    organizerAccountPublicKeyHex: string;
  }): Promise<VerifiedOrganizerAuthority | null>;
}

export interface MembershipBootstrapEntryServiceOptions {
  actor: {
    participantId: string;
    accountPublicKeyHex: string;
    signer: AccountMessageSigner;
  };
  storage: KeyValueStorage;
  organizerAuthority: VerifiedOrganizerAuthorityResolver;
  delivery: MembershipEventDelivery;
  pendingAcceptances: PendingAcceptanceVault;
  protectedKeys: ProtectedGroupKeySink;
  verifier?: AccountMessageVerifier;
}

export type MembershipBootstrapEntryOutcome =
  | {status: 'ready'; invitationId: string}
  | {status: 'wrong_account'}
  | {status: 'expired'}
  | {status: 'untrusted_organizer'}
  | {status: 'invalid'};

interface StoredBootstrap {
  eventId: string;
  recipientAccountPublicKeyHex: string;
  encodedBootstrap: string;
  storedAt: string;
}

/**
 * Production entry seam. URL data is an untrusted carrier: every entry and
 * every restart re-verifies the recipient signature binding and obtains the
 * organizer root from an external authority resolver.
 */
export class MembershipBootstrapEntryService {
  private readonly inbox: MembershipBootstrapInbox;
  private readonly coordinator: TrustedContactInvitationCoordinator;
  private readonly accountPublicKeyHex: string;

  constructor(private readonly options: MembershipBootstrapEntryServiceOptions) {
    this.accountPublicKeyHex = normalizeAccountKey(options.actor.accountPublicKeyHex);
    if (!options.actor.participantId.trim() || !this.accountPublicKeyHex) {
      throw new Error('A signed Product Account is required.');
    }
    this.inbox = new MembershipBootstrapInbox(options.storage);
    const organizerResolver: TrustedGroupOrganizerResolver = {
      resolve: input => this.resolveOrganizerRoot(input),
    };
    const noContactAuthority: TrustedContactAccountResolver = {async resolve() { return null; }};
    this.coordinator = new TrustedContactInvitationCoordinator({
      actor: {
        participantId: options.actor.participantId.trim(),
        accountPublicKeyHex: this.accountPublicKeyHex,
        signer: options.actor.signer,
      },
      organizerRoots: [],
      storage: options.storage,
      contacts: noContactAuthority,
      trustedOrganizers: organizerResolver,
      delivery: options.delivery,
      pendingAcceptances: options.pendingAcceptances,
      protectedKeys: options.protectedKeys,
      verifier: options.verifier,
    });
  }

  get state() {
    return this.coordinator.state;
  }

  async enter(
    bootstrap: RecipientBoundBootstrapV1,
    now = new Date().toISOString(),
  ): Promise<MembershipBootstrapEntryOutcome> {
    return this.enterInternal(bootstrap, now, true);
  }

  async restore(now = new Date().toISOString()): Promise<{
    restored: string[];
    rejected: Array<{eventId: string; status: Exclude<MembershipBootstrapEntryOutcome['status'], 'ready'>}>;
  }> {
    const restored: string[] = [];
    const rejected: Array<{eventId: string; status: Exclude<MembershipBootstrapEntryOutcome['status'], 'ready'>}> = [];
    for (const record of this.inbox.listForAccount(this.accountPublicKeyHex)) {
      let bootstrap: RecipientBoundBootstrapV1;
      try {
        bootstrap = decodeRecipientBoundBootstrap(record.encodedBootstrap);
      } catch {
        rejected.push({eventId: record.eventId, status: 'invalid'});
        continue;
      }
      const result = await this.enterInternal(bootstrap, now, false);
      if (result.status === 'ready') restored.push(result.invitationId);
      else rejected.push({eventId: record.eventId, status: result.status});
    }
    await this.coordinator.restore(now);
    return {restored, rejected};
  }

  accept(input: {
    invitationId: string;
    eventId: string;
    nonce: string;
    acceptedAt: string;
  }) {
    return this.coordinator.acceptInvitation(input);
  }

  decline(input: {
    invitationId: string;
    eventId: string;
    declinedAt: string;
  }) {
    return this.coordinator.declineInvitation(input);
  }

  flush() {
    return this.coordinator.flush();
  }

  async receive(input: {
    roomId: string;
    peer: string;
    event: import('./signedMembershipEvents.ts').SignedMembershipEventV1;
    now?: string;
  }): Promise<ReceiveMembershipResult> {
    return this.coordinator.receive(input);
  }

  isMembershipActive(input: {invitationId: string; groupId: string; participantId: string}): boolean {
    return this.coordinator.isMembershipActive(input);
  }

  private async enterInternal(
    bootstrap: RecipientBoundBootstrapV1,
    now: string,
    persist: boolean,
  ): Promise<MembershipBootstrapEntryOutcome> {
    const invitation = bootstrap.invitationEvent.event.type === 'INVITATION_CREATED'
      ? bootstrap.invitationEvent.event.invitation
      : null;
    if (!invitation) return {status: 'invalid'};
    if (normalizeAccountKey(invitation.inviteeAccountPublicKeyHex ?? '') !== this.accountPublicKeyHex) {
      return {status: 'wrong_account'};
    }
    if (!isTimestamp(now)) return {status: 'invalid'};
    if (Date.parse(now) >= Date.parse(invitation.expiresAt)) return {status: 'expired'};
    if (!await verifyRecipientBoundBootstrap({
      bootstrap,
      expectedRecipientAccountPublicKeyHex: this.accountPublicKeyHex,
      now,
      verifier: this.options.verifier,
    })) return {status: 'invalid'};
    if (!await this.resolveOrganizerRoot({
      groupId: invitation.groupId,
      organizerId: invitation.inviterId,
      organizerAccountPublicKeyHex: bootstrap.invitationEvent.actorAccountPublicKeyHex,
    })) return {status: 'untrusted_organizer'};

    const transition = await this.coordinator.importBootstrapInvitation({bootstrap, now});
    if (transition.outcome === 'rejected' || transition.outcome === 'deferred') return {status: 'invalid'};
    if (persist) {
      this.inbox.remember({
        eventId: bootstrap.invitationEvent.eventId,
        recipientAccountPublicKeyHex: this.accountPublicKeyHex,
        encodedBootstrap: encodeRecipientBoundBootstrap(bootstrap),
        storedAt: now,
      });
    }
    return {status: 'ready', invitationId: invitation.invitationId};
  }

  private async resolveOrganizerRoot(input: {
    groupId: string;
    organizerId: string;
    organizerAccountPublicKeyHex: string;
  }): Promise<MembershipGrant | null> {
    const resolution = await this.options.organizerAuthority.resolve(input);
    if (
      !resolution
      || resolution.proof.source !== 'external_trust_registry'
      || !resolution.proof.proofId.trim()
      || !isTimestamp(resolution.proof.verifiedAt)
      || !organizerRootMatches(resolution.grant, input)
    ) return null;
    return resolution.grant;
  }
}

class MembershipBootstrapInbox {
  constructor(private readonly storage: KeyValueStorage) {}

  remember(record: StoredBootstrap): void {
    const canonical = canonicalStoredBootstrap(record);
    const records = this.list();
    const existing = records.find(candidate => candidate.eventId === canonical.eventId);
    if (existing) {
      if (
        existing.recipientAccountPublicKeyHex !== canonical.recipientAccountPublicKeyHex
        || existing.encodedBootstrap !== canonical.encodedBootstrap
      ) {
        throw new Error('Invitation bootstrap identifier is already in use.');
      }
      // Re-entry and React effect replay must preserve the first receipt time
      // without turning the same verified bootstrap into a false conflict.
      return;
    }
    this.storage.write(INBOX_KEY, JSON.stringify([...records, canonical]));
    const persisted = this.list().find(candidate => candidate.eventId === canonical.eventId);
    if (!persisted || stableSerialize(persisted) !== stableSerialize(canonical)) {
      throw new Error('Invitation bootstrap could not be remembered safely.');
    }
  }

  listForAccount(accountPublicKeyHex: string): StoredBootstrap[] {
    const account = normalizeAccountKey(accountPublicKeyHex);
    return this.list().filter(record => record.recipientAccountPublicKeyHex === account);
  }

  private list(): StoredBootstrap[] {
    const stored = this.storage.read(INBOX_KEY);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored) as unknown;
      if (!Array.isArray(parsed)) return [];
      const firstById = new Map<string, StoredBootstrap>();
      for (const candidate of parsed) {
        try {
          const canonical = canonicalStoredBootstrap(candidate as StoredBootstrap);
          if (!firstById.has(canonical.eventId)) firstById.set(canonical.eventId, canonical);
        } catch {
          // Corrupt siblings cannot erase valid pending bootstrap entries.
        }
      }
      return Array.from(firstById.values());
    } catch {
      return [];
    }
  }
}

function canonicalStoredBootstrap(value: StoredBootstrap): StoredBootstrap {
  const result = {
    eventId: required(value.eventId),
    recipientAccountPublicKeyHex: normalizeAccountKey(value.recipientAccountPublicKeyHex),
    encodedBootstrap: required(value.encodedBootstrap),
    storedAt: canonicalTimestamp(value.storedAt),
  };
  if (!result.recipientAccountPublicKeyHex) throw new Error('Invalid bootstrap account.');
  const bootstrap = decodeRecipientBoundBootstrap(result.encodedBootstrap);
  if (
    bootstrap.invitationEvent.eventId !== result.eventId
    || bootstrap.invitationEvent.event.type !== 'INVITATION_CREATED'
    || normalizeAccountKey(bootstrap.invitationEvent.event.invitation.inviteeAccountPublicKeyHex ?? '')
      !== result.recipientAccountPublicKeyHex
  ) throw new Error('Invalid stored bootstrap.');
  return result;
}

function organizerRootMatches(
  root: MembershipGrant,
  expected: {groupId: string; organizerId: string; organizerAccountPublicKeyHex: string},
): boolean {
  return root.groupId === expected.groupId
    && root.participantId === expected.organizerId
    && root.role === 'organizer'
    && normalizeAccountKey(root.accountPublicKeyHex) === normalizeAccountKey(expected.organizerAccountPublicKeyHex)
    && Boolean(root.invitationId.trim())
    && Boolean(root.groupKeyEnvelopeId.trim())
    && Number.isSafeInteger(root.keyVersion)
    && root.keyVersion > 0
    && isTimestamp(root.acceptedAt);
}

function normalizeAccountKey(value: string): string {
  const normalized = value.trim().toLowerCase();
  return /^0x[0-9a-f]{64}$/u.test(normalized) ? normalized : '';
}

function required(value: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error('Required value is missing.');
  return normalized;
}

function canonicalTimestamp(value: string): string {
  if (!isTimestamp(value)) throw new Error('Invalid timestamp.');
  return new Date(value).toISOString();
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
