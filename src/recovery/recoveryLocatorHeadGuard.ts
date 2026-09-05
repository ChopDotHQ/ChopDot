import {canonicalJson, sha256Hex} from '../core/canonical.ts';
import type {Bytes32, RecoveryHead, RecoveryHeadIndexPort} from './recoveryHeadIndex.ts';
import type {RecoveryLocatorHeadGuard, RecoveryLocatorV1} from './groupRecovery.ts';

const ZERO_DIGEST = `0x${'00'.repeat(32)}` as Bytes32;

/**
 * Rollback guard for an encrypted recovery locator. The contract stores only
 * an opaque digest and sequence; it cannot grant membership, read group data,
 * or replace the participant-held signed event log.
 */
export class RecoveryHeadLocatorGuard implements RecoveryLocatorHeadGuard {
  constructor(private readonly input: {
    port: RecoveryHeadIndexPort;
    ownerAddress: string;
    stream: string;
    context: {
      groupId: string;
      participantId: string;
      accountPublicKeyHex: string;
    };
    locatorReferences?: RecoveryLocatorReferenceResolver;
  }) {}

  async publish(locator: RecoveryLocatorV1): Promise<void> {
    this.assertLocatorContext(locator);
    const digest = await this.locatorReference(locator);
    const before = await this.input.port.readHead(this.input.ownerAddress, this.input.stream);
    if (before.digest === digest) return;
    await this.input.port.advanceHead({
      stream: this.input.stream,
      expectedSequence: before.sequence,
      expectedDigest: before.digest,
      nextDigest: digest,
    });
    const after = await this.input.port.readHead(this.input.ownerAddress, this.input.stream);
    if (after.sequence !== before.sequence + 1n || after.digest !== digest) {
      throw new Error('Recovery head update could not be verified.');
    }
  }

  async assertCurrent(locator: RecoveryLocatorV1): Promise<void> {
    this.assertLocatorContext(locator);
    const expected = await this.locatorReference(locator);
    const current = await this.input.port.readHead(this.input.ownerAddress, this.input.stream);
    if (current.sequence === 0n || current.digest === ZERO_DIGEST || current.digest !== expected) {
      throw new Error('Recovery locator is not the latest published recovery head.');
    }
  }

  private assertLocatorContext(locator: RecoveryLocatorV1): void {
    if (
      locator.groupId !== this.input.context.groupId.trim()
      || locator.participantId !== this.input.context.participantId.trim()
      || locator.accountPublicKeyHex.toLowerCase() !== this.input.context.accountPublicKeyHex.trim().toLowerCase()
    ) throw new Error('Recovery locator does not match the bound recovery head context.');
  }

  private locatorReference(locator: RecoveryLocatorV1): Promise<Bytes32> {
    return this.input.locatorReferences?.referenceFor(locator) ?? recoveryLocatorDigest(locator);
  }
}

export interface RecoveryLocatorReferenceResolver {
  referenceFor(locator: RecoveryLocatorV1): Promise<Bytes32>;
}

export async function recoveryLocatorDigest(locator: RecoveryLocatorV1): Promise<Bytes32> {
  return (await sha256Hex(canonicalJson(locator))).toLowerCase() as Bytes32;
}

export class MemoryRecoveryHeadIndexPort implements RecoveryHeadIndexPort {
  readonly genesisHash = `0x${'11'.repeat(32)}` as const;
  readonly address = `0x${'22'.repeat(20)}` as const;
  private head: RecoveryHead = {sequence: 0n, digest: ZERO_DIGEST};

  async readHead(_owner: string, _stream: string): Promise<RecoveryHead> {
    return {...this.head};
  }

  async advanceHead(input: {
    stream: string;
    expectedSequence: bigint;
    expectedDigest: string;
    nextDigest: string;
  }) {
    if (input.expectedSequence !== this.head.sequence || input.expectedDigest.toLowerCase() !== this.head.digest) {
      throw new Error('Recovery head changed before this update.');
    }
    if (!/^0x[0-9a-f]{64}$/iu.test(input.nextDigest) || input.nextDigest.toLowerCase() === ZERO_DIGEST) {
      throw new Error('Recovery head digest is invalid.');
    }
    this.head = {sequence: this.head.sequence + 1n, digest: input.nextDigest.toLowerCase() as Bytes32};
    return {transactionHash: `0x${this.head.sequence.toString(16).padStart(64, '0')}` as const};
  }
}
