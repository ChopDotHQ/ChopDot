import type {GroupInvitation} from './membershipLifecycle.ts';
import type {
  MembershipBootstrapEntryOutcome,
  MembershipBootstrapEntryService,
} from './membershipBootstrapEntryService.ts';
import type {RecipientBoundBootstrap} from './recipientBoundBootstrap.ts';

export function verifiedInvitationDisplay(invitation: GroupInvitation) {
  return {
    groupName: 'this group',
    inviterName: 'the organizer',
    friendName: 'You',
    groupContext: 'Review the invitation and choose whether you want to take part.',
  };
}

export async function resolveMembershipBootstrapEntry(
  service: Pick<MembershipBootstrapEntryService, 'restore' | 'enter'>,
  bootstrap: RecipientBoundBootstrap,
): Promise<MembershipBootstrapEntryOutcome> {
  try {
    await service.restore();
    return await service.enter(bootstrap);
  } catch {
    return {status: 'invalid'};
  }
}
