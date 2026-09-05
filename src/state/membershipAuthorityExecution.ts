import type {AuthorityAppendResult, MembershipAuthorityCommandV1} from '../core/authority/productionAuthority.ts';
import type {CanonicalEventV1, CanonicalGroupStateV1} from '../core/moneyEventKernel.ts';
import type {MembershipGrant} from '../membership/membershipLifecycle.ts';
import type {AppState} from '../types.ts';

export interface MembershipAuthorityExecutionPort {
  readCanonicalGroup(groupId: string): Promise<CanonicalGroupStateV1 | null>;
  readAcceptedEvents(groupId: string): Promise<CanonicalEventV1[]>;
  importRecoveredEvents(base: AppState, events: CanonicalEventV1[]): Promise<{state: AppState; canonicalState: CanonicalGroupStateV1}>;
  appendMembership(base: AppState, command: MembershipAuthorityCommandV1): Promise<AuthorityAppendResult>;
}

/**
 * The journal append and its encrypted delivery are intentionally separate.
 * This executor projects the durable result first and makes a later retry
 * detect the already-accepted exact mutation instead of appending it twice.
 */
export async function executeMembershipAuthorityMutation(input: {
  authority: MembershipAuthorityExecutionPort;
  base: AppState;
  command: MembershipAuthorityCommandV1;
  onDurable(state: AppState, canonical: CanonicalGroupStateV1): void;
  deliverJoin(events: CanonicalEventV1[], state: CanonicalGroupStateV1, participantId: string): Promise<void>;
  deliverRemoval(events: CanonicalEventV1[], participantId: string): Promise<void>;
  deliverOther(before: AppState, result: AuthorityAppendResult): Promise<void>;
}): Promise<CanonicalGroupStateV1> {
  const durableBefore = await input.authority.readCanonicalGroup(input.command.groupId);
  const alreadyAccepted = input.command.type === 'add'
    ? acceptedMembershipGrantMatches(durableBefore, input.command.grant)
    : input.command.type === 'remove' && acceptedMembershipRemovalMatches(durableBefore, input.command);
  if (alreadyAccepted && durableBefore) {
    const events = await input.authority.readAcceptedEvents(input.command.groupId);
    const replay = await input.authority.importRecoveredEvents(input.base, events);
    input.onDurable(replay.state, replay.canonicalState);
    if (input.command.type === 'add') await input.deliverJoin(events, durableBefore, input.command.grant.participantId);
    else if (input.command.type === 'remove') await input.deliverRemoval(events, input.command.participantId);
    else throw new Error('This accepted membership retry is unavailable.');
    return structuredClone(durableBefore);
  }

  const result = await input.authority.appendMembership(input.base, input.command);
  input.onDurable(result.state, result.canonicalState);
  if (input.command.type === 'add') {
    await input.deliverJoin(await input.authority.readAcceptedEvents(result.canonicalState.groupId), result.canonicalState, input.command.grant.participantId);
  } else if (input.command.type === 'remove') {
    await input.deliverRemoval(await input.authority.readAcceptedEvents(result.canonicalState.groupId), input.command.participantId);
  } else {
    await input.deliverOther(input.base, result);
  }
  return structuredClone(result.canonicalState);
}

export function acceptedMembershipGrantMatches(state: CanonicalGroupStateV1 | null, grant: MembershipGrant): boolean {
  const member = state?.members[grant.participantId];
  return Boolean(member
    && member.active !== false
    && member.participantId === grant.participantId
    && member.accountPublicKeyHex.toLowerCase() === grant.accountPublicKeyHex.toLowerCase()
    && member.role === grant.role
    && member.acceptedAt === grant.acceptedAt
    && member.invitationId === grant.invitationId
    && member.keyVersion === grant.keyVersion
    && member.groupKeyEnvelopeId === grant.groupKeyEnvelopeId);
}

export function acceptedMembershipRemovalMatches(
  state: CanonicalGroupStateV1 | null,
  command: Extract<MembershipAuthorityCommandV1, {type: 'remove'}>,
): boolean {
  if (!state || state.members[command.participantId]?.active !== false || state.groupKeyVersion !== command.nextKeyVersion) return false;
  const active = Object.values(state.members).filter(member => member.active !== false);
  const expectedIds = Object.keys(command.groupKeyEnvelopeIds).sort();
  return expectedIds.join('\u0000') === active.map(member => member.participantId).sort().join('\u0000')
    && active.every(member => member.keyVersion === command.nextKeyVersion
      && member.groupKeyEnvelopeId === command.groupKeyEnvelopeIds[member.participantId]);
}
