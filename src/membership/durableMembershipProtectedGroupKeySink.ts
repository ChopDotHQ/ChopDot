import type {AccountMessageSigner} from './groupKeyHandoff.ts';
import {
  DurableMembershipKeyEnvelopeRegistry,
  type MembershipKeyEnvelopeRecordV1,
} from './membershipKeyEnvelopeRegistry.ts';
import type {ProtectedGroupKeySink} from './trustedContactInvitationCoordinator.ts';

/**
 * Recipient-side sink for an organizer handoff. The plaintext key exists only
 * long enough to stage and re-open the account-bound durable registry record.
 * No second key store or invitation-local secret copy is created.
 */
export class DurableMembershipProtectedGroupKeySink implements ProtectedGroupKeySink {
  constructor(private readonly options: {
    registry: DurableMembershipKeyEnvelopeRegistry;
    actor: {
      participantId: string;
      accountPublicKeyHex: string;
      signer: AccountMessageSigner;
    };
    now?: () => string;
  }) {}

  async save(input: Parameters<ProtectedGroupKeySink['save']>[0]): Promise<void> {
    this.assertRecipient(input);
    const existing = await this.recordFor(input);
    if (existing) {
      const opened = await this.options.registry.open(existing.binding);
      try {
        if (!equalBytes(opened, input.groupKey)) throw new Error('Acknowledged group access conflicts with this handoff.');
      } finally {
        opened.fill(0);
      }
      return;
    }
    const record = await this.options.registry.stageRecipientBinding({
      groupId: input.groupId,
      keyVersion: input.keyVersion,
      groupKey: input.groupKey,
      acknowledgedAt: this.options.now?.() ?? new Date().toISOString(),
      signer: this.options.actor.signer,
    });
    const opened = await this.options.registry.open(record.binding);
    try {
      if (!equalBytes(opened, input.groupKey)) throw new Error('Acknowledged group access could not be opened.');
    } finally {
      opened.fill(0);
    }
  }

  async has(input: Parameters<NonNullable<ProtectedGroupKeySink['has']>>[0]): Promise<boolean> {
    try {
      this.assertRecipient(input);
      const record = await this.recordFor(input);
      return Boolean(record && await this.options.registry.resolve({
        groupId: input.groupId,
        keyVersion: input.keyVersion,
        binding: record.binding,
      }));
    } catch {
      return false;
    }
  }

  async acknowledgedRecord(input: {
    groupId: string;
    participantId: string;
    accountPublicKeyHex: string;
    keyVersion: number;
  }): Promise<MembershipKeyEnvelopeRecordV1 | null> {
    this.assertRecipient(input);
    return this.recordFor(input);
  }

  async openAcknowledged(input: {
    groupId: string;
    participantId: string;
    accountPublicKeyHex: string;
    keyVersion: number;
  }): Promise<Uint8Array> {
    const record = await this.acknowledgedRecord(input);
    if (!record) throw new Error('Acknowledged group access is unavailable.');
    return this.options.registry.open(record.binding);
  }

  private async recordFor(input: {
    groupId: string;
    participantId: string;
    accountPublicKeyHex: string;
    keyVersion: number;
  }): Promise<MembershipKeyEnvelopeRecordV1 | null> {
    return this.options.registry.findAcknowledged({
      groupId: input.groupId,
      participantId: input.participantId,
      recipientAccountPublicKeyHex: input.accountPublicKeyHex,
      keyVersion: input.keyVersion,
    });
  }

  private assertRecipient(input: {participantId: string; accountPublicKeyHex: string}): void {
    if (input.participantId.trim() !== this.options.actor.participantId.trim()
      || normalizeAccount(input.accountPublicKeyHex) !== normalizeAccount(this.options.actor.accountPublicKeyHex)) {
      throw new Error('Group access does not belong to this Product Account.');
    }
  }
}

function normalizeAccount(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^0x[0-9a-f]{64}$/u.test(normalized)) throw new Error('Group access account is invalid.');
  return normalized;
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
}
