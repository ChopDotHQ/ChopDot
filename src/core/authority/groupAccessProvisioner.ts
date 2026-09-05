import type {AuthorityGroupAccessProvisioner} from './productionAuthority.ts';
import {DurableMembershipKeyEnvelopeRegistry} from '../../membership/membershipKeyEnvelopeRegistry.ts';

/**
 * Creates the organizer's first account-bound group key before GROUP_CREATED
 * is signed. The returned ciphertext identifier is embedded in that same
 * canonical origin; plaintext group keys never enter AppState or a URL.
 */
export class MembershipRegistryGroupAccessProvisioner implements AuthorityGroupAccessProvisioner {
  constructor(private readonly registry: DurableMembershipKeyEnvelopeRegistry) {}

  async provision(input: Parameters<AuthorityGroupAccessProvisioner['provision']>[0]) {
    if (!input.groupId.trim() || !input.organizerId.trim() || !/^0x[0-9a-f]{64}$/iu.test(input.organizerAccountPublicKeyHex)) {
      throw new Error('Organizer group access context is invalid.');
    }
    const groupKey = crypto.getRandomValues(new Uint8Array(32));
    try {
      const record = await this.registry.stageRecipientBinding({
        groupId: input.groupId,
        keyVersion: 1,
        groupKey,
        acknowledgedAt: input.acceptedAt,
        signer: {signBytes: bytes => input.signer.sign(bytes)},
      });
      if (
        record.binding.participantId !== input.organizerId
        || record.binding.recipientAccountPublicKeyHex !== input.organizerAccountPublicKeyHex.toLowerCase()
        || record.binding.keyVersion !== 1
      ) throw new Error('Organizer group access binding is invalid.');
      return {keyVersion: 1, groupKeyEnvelopeId: record.binding.groupKeyEnvelopeId};
    } finally {
      groupKey.fill(0);
    }
  }
}
