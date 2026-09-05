import type {CanonicalGroupStateV1} from '../core/moneyEventKernel.ts';

/** Chat presence and account login never make organizer controls visible. */
export function canManageCanonicalMembership(input: {
  state: CanonicalGroupStateV1 | null;
  participantId: string | null;
  accountPublicKeyHex?: string;
}): boolean {
  const participantId = input.participantId?.trim() ?? '';
  const account = input.accountPublicKeyHex?.trim().toLowerCase() ?? '';
  const member = participantId ? input.state?.members[participantId] : null;
  return Boolean(input.state
    && member
    && member.active !== false
    && member.role === 'organizer'
    && input.state.organizerId === participantId
    && /^0x[0-9a-f]{64}$/u.test(account)
    && member.accountPublicKeyHex.toLowerCase() === account);
}

export function canonicalMembershipActionVisibility(input: Parameters<typeof canManageCanonicalMembership>[0]): {
  normalGroupActions: boolean;
  namedModeManageMembers: boolean;
} {
  const allowed = canManageCanonicalMembership(input);
  return {normalGroupActions: allowed, namedModeManageMembers: allowed};
}
