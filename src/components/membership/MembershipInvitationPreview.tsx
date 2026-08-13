import {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import '../../index.css';
import {MembershipInvitationFlow, type MembershipInvitationViewer} from './MembershipInvitationFlow.tsx';
import {createMembershipInvitationPreviewCeremony, type MembershipInvitationPreviewCeremony} from '../../../tests/fixtures/membershipInvitationPreviewCoordinator.ts';

const params = new URLSearchParams(window.location.search);

function Preview() {
  const [viewer, setViewer] = useState<MembershipInvitationViewer>('organizer');
  const [ceremony, setCeremony] = useState<MembershipInvitationPreviewCeremony | null>(null);
  const [, refresh] = useState(0);
  useEffect(() => {
    void createMembershipInvitationPreviewCeremony({failFirstGrant: params.get('failGrant') === '1'})
      .then(setCeremony);
  }, []);
  if (!ceremony) return <p className="p-6 text-sm font-medium text-gray-500">Preparing invitation…</p>;
  const status = ceremony.statusFor(viewer === 'invitee' ? 'leo' : 'mina');
  const run = async (action: () => Promise<void>) => {
    await action();
    refresh(value => value + 1);
  };
  return (
    <div className="min-h-[100dvh] bg-gray-100 sm:flex sm:items-center sm:justify-center sm:px-8">
      <div className="w-full overflow-hidden bg-[#f7f6f4] sm:max-w-[390px] sm:rounded-[2rem] sm:border sm:border-black/10 sm:shadow-2xl">
        <MembershipInvitationFlow
          groupName="Zurich Dinner"
          inviterName="Mina"
          friendName="Leo"
          status={status}
          viewer={viewer}
          previewLabel="Local preview"
          onInvite={async () => {
            await run(ceremony.invite);
            setViewer('invitee');
          }}
          onAccept={async () => {
            await run(ceremony.accept);
            setViewer('organizer');
          }}
          onDecline={() => run(ceremony.decline)}
          onGrant={() => run(ceremony.grant)}
          onRetryGrant={() => run(ceremony.retryGrant)}
        />
      </div>
    </div>
  );
}

const root = document.getElementById('membership-invitation-preview');
if (!root) throw new Error('Membership invitation preview root is missing.');
createRoot(root).render(<Preview />);
