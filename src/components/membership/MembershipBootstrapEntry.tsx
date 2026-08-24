import {useEffect, useState} from 'react';
import {CircleAlert, LockKeyhole} from 'lucide-react';
import type {
  MembershipBootstrapEntryOutcome,
  MembershipBootstrapEntryService,
} from '../../membership/membershipBootstrapEntryService';
import type {RecipientBoundBootstrap} from '../../membership/recipientBoundBootstrap';
import {
  resolveMembershipBootstrapEntry,
  verifiedInvitationDisplay,
} from '../../membership/membershipBootstrapEntryPresentation';
import {MembershipInvitationFlow} from './MembershipInvitationFlow';
import {projectMembershipInvitationStatus, type MembershipInvitationUiStatus} from './membershipInvitationView';

export interface MembershipBootstrapEntryDependencies {
  /** Injected directly by the app provider. URL/query/storage never creates authority. */
  service: MembershipBootstrapEntryService;
  /**
   * Product delivery tells the screen when the injected service has processed
   * an external membership event. The screen observes truth; it never creates
   * the organizer action itself.
   */
  subscribeToState?(listener: () => void): () => void;
  /** Bind delivery only after the signed grant is active; room metadata itself never grants membership. */
  onMembershipActive?(input: {groupId: string; roomId: string}): Promise<void>;
}

export function MembershipBootstrapEntry({
  bootstrap,
  onClose,
  dependencies,
}: {
  bootstrap: RecipientBoundBootstrap;
  onClose: () => void;
  dependencies?: MembershipBootstrapEntryDependencies;
}) {
  const [outcome, setOutcome] = useState<MembershipBootstrapEntryOutcome | null>(null);
  const [running, setRunning] = useState(false);
  const [, refresh] = useState(0);
  const invitation = bootstrap.invitationEvent.event.type === 'INVITATION_CREATED'
    ? bootstrap.invitationEvent.event.invitation
    : null;

  useEffect(() => {
    let active = true;
    setOutcome(null);
    if (!dependencies) {
      setOutcome({status: 'untrusted_organizer'});
      return () => { active = false; };
    }
    void resolveMembershipBootstrapEntry(dependencies.service, bootstrap)
      .then(result => { if (active) setOutcome(result); });
    return () => { active = false; };
  }, [bootstrap, dependencies]);

  useEffect(() => dependencies?.subscribeToState?.(() => {
    refresh(value => value + 1);
  }), [dependencies]);

  const membershipActive = Boolean(invitation && dependencies?.service.isMembershipActive({
    invitationId: invitation.invitationId,
    groupId: invitation.groupId,
    participantId: invitation.inviteeId,
  }));
  useEffect(() => {
    if (!membershipActive || !invitation || !dependencies?.onMembershipActive) return;
    void dependencies.onMembershipActive({groupId: invitation.groupId, roomId: bootstrap.returnRoute.roomId});
  }, [bootstrap.returnRoute.roomId, dependencies, invitation, membershipActive]);

  if (!invitation) return <Unavailable status="invalid" onClose={() => closeRoute(onClose)} />;
  if (!outcome) {
    return (
      <main className="flex min-h-[100dvh] flex-col bg-[#f7f6f4] px-6 py-8 text-gray-950">
        <Header />
        <p role="status" className="mt-12 text-sm font-medium text-gray-500">Checking your invitation…</p>
      </main>
    );
  }
  if (outcome.status !== 'ready') {
    return <Unavailable status={outcome.status} onClose={() => closeRoute(onClose)} />;
  }
  if (!dependencies) return <Unavailable status="untrusted_organizer" onClose={() => closeRoute(onClose)} />;

  const projectionInput = {
    state: dependencies.service.state,
    invitationId: invitation.invitationId,
    groupId: invitation.groupId,
    participantId: invitation.inviteeId,
  };
  const projected = projectMembershipInvitationStatus(projectionInput);
  const status: MembershipInvitationUiStatus = membershipActive
    ? 'accepted'
    : projected === 'ready_to_grant'
      ? 'accepted_waiting_grant'
      : projected === 'accepted'
        ? 'grant_failed'
        : projected;
  const accept = async () => {
    if (running || status !== 'pending') return;
    setRunning(true);
    try {
      await dependencies.service.accept({
        invitationId: invitation.invitationId,
        eventId: `accept-${invitation.invitationId}`,
        nonce: `nonce-${invitation.invitationId}`,
        acceptedAt: new Date().toISOString(),
      });
      await dependencies.service.flush();
      refresh(value => value + 1);
    } finally {
      setRunning(false);
    }
  };
  const decline = async () => {
    if (running || status !== 'pending') return;
    setRunning(true);
    try {
      await dependencies.service.decline({
        invitationId: invitation.invitationId,
        eventId: `decline-${invitation.invitationId}`,
        declinedAt: new Date().toISOString(),
      });
      await dependencies.service.flush();
      refresh(value => value + 1);
    } finally {
      setRunning(false);
    }
  };
  const display = verifiedInvitationDisplay(invitation);

  return (
    <MembershipInvitationFlow
      groupName={display.groupName}
      inviterName={display.inviterName}
      friendName={display.friendName}
      status={status}
      viewer="invitee"
      entryLabel={invitation.route === 'qr' ? 'Scanned QR' : 'Opened from link'}
      groupContext={display.groupContext}
      onAccept={accept}
      onDecline={decline}
    />
  );
}

function Unavailable({status, onClose}: {status: Exclude<MembershipBootstrapEntryOutcome['status'], 'ready'>; onClose: () => void}) {
  const content = status === 'wrong_account'
    ? {title: 'This invite isn’t for you', copy: 'It was made for a different account. Forwarding it does not add anyone.'}
    : status === 'expired'
      ? {title: 'This invite expired', copy: 'No one was added. Ask the organizer to send a new invitation.'}
      : status === 'untrusted_organizer'
        ? {title: 'This invite can’t be checked', copy: 'We couldn’t verify your account or the organizer. Nothing has been added.'}
        : {title: 'This invite is unavailable', copy: 'It may be invalid. No one was added.'};
  return (
    <main className="flex min-h-[100dvh] flex-col bg-[#f7f6f4] px-6 py-8 text-gray-950">
      <Header />
      <section className="mt-12 flex-1">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700">
          {status === 'untrusted_organizer' ? <LockKeyhole className="h-6 w-6" aria-hidden="true" /> : <CircleAlert className="h-6 w-6" aria-hidden="true" />}
        </span>
        <h1 className="mt-5 text-[2rem] font-bold tracking-[-0.05em]">{content.title}</h1>
        <p className="mt-3 max-w-[22rem] text-[15px] leading-6 text-gray-600">{content.copy}</p>
      </section>
      <button type="button" onClick={onClose} className="min-h-14 w-full rounded-full bg-gray-950 px-6 py-4 font-semibold text-white">Close invitation</button>
    </main>
  );
}

function Header() {
  return <header><p className="text-lg font-bold tracking-[-0.03em]">ChopDot</p></header>;
}

function closeRoute(onClose: () => void) {
  history.replaceState(null, '', `${location.pathname}${location.search}`);
  onClose();
}
