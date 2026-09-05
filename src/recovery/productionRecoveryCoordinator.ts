import type {CanonicalEventV1, CanonicalGroupStateV1} from '../core/moneyEventKernel.ts';
import {verifyParticipantSignature} from '../core/authority/browserAuthority.ts';
import type {PolkadotHostIdentity} from '../environment/polkadotHostBridge.ts';
import {PolkadotHostBridge} from '../environment/polkadotHostBridge.ts';
import type {MembershipKeyEnvelopeBindingV1} from '../membership/signedMembershipEvents.ts';
import type {MembershipKeyEnvelopeRecordV1} from '../membership/membershipKeyEnvelopeRegistry.ts';
import {
  BulletinCheckpointArchive,
  EncryptedBulletinRecoveryLocatorStore,
  createHostBulletinBlobPort,
  type BulletinBlobPort,
} from './bulletinRecoveryStorage.ts';
import {ArrayLaterEventSource, type RecoveryLocatorV1} from './groupRecovery.ts';
import {createProductionGroupRecovery, deriveRecoveryHeadStream} from './productionRecoveryComposition.ts';
import {
  composeProductionRecoveryHeadRuntime,
  type ProductionRecoveryHeadRuntime,
} from './productionRecoveryHeadRuntime.ts';

export interface RecoveryAuthorityReader {
  readCanonicalGroup(groupId: string): Promise<CanonicalGroupStateV1 | null>;
  readAcceptedEvents(groupId: string): Promise<CanonicalEventV1[]>;
}

export interface RecoveryKeyEnvelopeAccess {
  export(groupKeyEnvelopeId: string): MembershipKeyEnvelopeRecordV1 | null;
  open(binding: MembershipKeyEnvelopeBindingV1): Promise<Uint8Array>;
}

/**
 * Production account-owned recovery orchestration. Publication is explicit
 * and may write one encrypted checkpoint blob, one account-encrypted locator
 * blob, and one compare-and-swap RecoveryHeadIndex update. Recovery itself is
 * read-only and returns signed events for the authority journal to import.
 */
export class ProductionRecoveryCoordinator {
  constructor(private readonly input: {
    productId: string;
    identity: PolkadotHostIdentity;
    bridge: PolkadotHostBridge;
    authority: RecoveryAuthorityReader;
    keyEnvelopes?: RecoveryKeyEnvelopeAccess;
    headRuntime?: () => Promise<ProductionRecoveryHeadRuntime>;
    bulletin?: () => Promise<BulletinBlobPort>;
  }) {
    if (input.identity.productId !== input.productId || !input.identity.signBytes) {
      throw new Error('Recovery requires the signed Product Account for this release.');
    }
  }

  async publish(groupIdValue: string): Promise<{
    locator: RecoveryLocatorV1;
    genesisHash: string;
    contractAddress: string;
    ownerAddress: string;
  }> {
    const groupId = required(groupIdValue);
    const keyEnvelopes = this.input.keyEnvelopes;
    if (!keyEnvelopes) throw new Error('Account-bound group access is unavailable.');
    const [state, events] = await Promise.all([
      this.input.authority.readCanonicalGroup(groupId),
      this.input.authority.readAcceptedEvents(groupId),
    ]);
    if (!state || events.length !== state.version || events.length === 0) {
      throw new Error('The accepted group history is unavailable for recovery.');
    }
    const accountPublicKeyHex = bytesToHex(this.input.identity.publicKey);
    const member = state.members[this.input.identity.username];
    if (
      !member
      || member.active === false
      || member.accountPublicKeyHex !== accountPublicKeyHex
      || !member.groupKeyEnvelopeId
      || !member.keyVersion
    ) throw new Error('Only an active account-bound member can protect this group.');
    const record = keyEnvelopes.export(member.groupKeyEnvelopeId);
    if (!record || !sameBinding(record.binding, member, this.input.identity.username)) {
      throw new Error('The current account-bound group access envelope is unavailable.');
    }
    const groupKey = await keyEnvelopes.open(record.binding);
    if (groupKey.byteLength !== 32) throw new Error('The current group access key could not be opened.');
    const runtime = await this.runtime();
    try {
      this.assertRuntimeAccount(runtime, accountPublicKeyHex);
      const composed = await this.compose(groupId, runtime, await this.bulletin(), events);
      const published = await composed.service.publish({
        acceptedEvents: events,
        groupKey,
        keyVersion: member.keyVersion,
        issuerId: this.input.identity.username,
        issuerAccountPublicKeyHex: accountPublicKeyHex,
        recipientId: this.input.identity.username,
        recipientAccountPublicKeyHex: accountPublicKeyHex,
        recipientKeyEnvelope: record.envelope,
        createdAt: new Date().toISOString(),
        signer: {sign: bytes => this.input.identity.signBytes!(bytes)},
      });
      return {
        locator: published.locator,
        genesisHash: runtime.genesisHash,
        contractAddress: runtime.port.address,
        ownerAddress: runtime.ownerAddress,
      };
    } finally {
      groupKey.fill(0);
      runtime.close();
    }
  }

  async recover(groupIdValue: string): Promise<{
    events: CanonicalEventV1[];
    state: CanonicalGroupStateV1;
    stateHash: string;
    locator: RecoveryLocatorV1;
    genesisHash: string;
    contractAddress: string;
  }> {
    const groupId = required(groupIdValue);
    const accountPublicKeyHex = bytesToHex(this.input.identity.publicKey);
    const runtime = await this.runtime();
    try {
      this.assertRuntimeAccount(runtime, accountPublicKeyHex);
      const localEvents = await this.input.authority.readAcceptedEvents(groupId);
      const composed = await this.compose(groupId, runtime, await this.bulletin(), localEvents);
      const recovered = await composed.service.recover({
        productId: this.input.productId,
        groupId,
        participantId: this.input.identity.username,
        accountPublicKeyHex,
        minimumKeyVersion: 1,
        entropy: this.input.bridge,
      });
      return {
        events: recovered.events,
        state: recovered.state,
        stateHash: recovered.stateHash,
        locator: recovered.locator,
        genesisHash: runtime.genesisHash,
        contractAddress: runtime.port.address,
      };
    } finally {
      runtime.close();
    }
  }

  private async compose(
    groupId: string,
    runtime: ProductionRecoveryHeadRuntime,
    blobs: BulletinBlobPort,
    localEvents: CanonicalEventV1[],
  ) {
    const context = {
      groupId,
      participantId: this.input.identity.username,
      accountPublicKeyHex: runtime.accountPublicKeyHex,
    };
    const stream = await deriveRecoveryHeadStream(runtime.genesisHash, context);
    const locators = new EncryptedBulletinRecoveryLocatorStore({
      productId: this.input.productId,
      context,
      ownerAddress: runtime.ownerAddress,
      stream,
      port: runtime.port,
      blobs,
      entropy: this.input.bridge,
    });
    return createProductionGroupRecovery({
      context,
      port: runtime.port,
      ownerAddresses: {derive: async ({genesisHash, accountPublicKeyHex}) => {
        if (genesisHash !== runtime.genesisHash || accountPublicKeyHex !== runtime.accountPublicKeyHex) {
          throw new Error('Recovery owner derivation context changed.');
        }
        return runtime.ownerAddress;
      }},
      archive: new BulletinCheckpointArchive(blobs),
      locators,
      locatorReferences: locators,
      laterEvents: new ArrayLaterEventSource(localEvents),
      verifyEvent: verifyParticipantSignature,
      verifyCheckpoint: verifyParticipantSignature,
    });
  }

  private runtime(): Promise<ProductionRecoveryHeadRuntime> {
    return this.input.headRuntime?.() ?? composeProductionRecoveryHeadRuntime({
      productId: this.input.productId,
      requestLogin: false,
    });
  }

  private bulletin(): Promise<BulletinBlobPort> {
    return this.input.bulletin?.() ?? createHostBulletinBlobPort();
  }

  private assertRuntimeAccount(runtime: ProductionRecoveryHeadRuntime, expected: string): void {
    if (runtime.accountPublicKeyHex !== expected || runtime.genesisHash !== runtime.port.genesisHash) {
      throw new Error('Recovery runtime is bound to another account or network.');
    }
  }
}

function sameBinding(
  binding: MembershipKeyEnvelopeBindingV1,
  member: {accountPublicKeyHex: string; keyVersion?: number; groupKeyEnvelopeId?: string},
  participantId: string,
): boolean {
  return binding.participantId === participantId
    && binding.recipientAccountPublicKeyHex === member.accountPublicKeyHex
    && binding.keyVersion === member.keyVersion
    && binding.groupKeyEnvelopeId === member.groupKeyEnvelopeId;
}

function required(value: string): string {
  const result = value.trim();
  if (!result) throw new Error('Recovery group is required.');
  return result;
}

function bytesToHex(value: Uint8Array): `0x${string}` {
  return `0x${Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}
