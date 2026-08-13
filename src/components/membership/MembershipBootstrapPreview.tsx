import {useEffect, useLayoutEffect, useRef, useState, type ReactNode} from 'react';
import {ArrowRight, Check, CircleAlert, Clock3, X} from 'lucide-react';
import {createRoot} from 'react-dom/client';
import '../../index.css';
import {MembershipInvitationFlow, type MembershipInvitationViewer} from './MembershipInvitationFlow.tsx';
import {
  createLimitedDinnerActionPreviewAdapter,
  parseMembershipBootstrapRoute,
  type MembershipBootstrapPreviewAdapter,
  type MembershipBootstrapState,
} from './membershipBootstrapPreviewAdapter.ts';
import {createMembershipBootstrapPreviewCeremony} from '../../../tests/fixtures/membershipBootstrapPreviewCoordinator.ts';
import type {MembershipInvitationUiStatus} from './membershipInvitationView.ts';

const route = parseMembershipBootstrapRoute(new URLSearchParams(window.location.search).get('route'));

function Preview() {
  const [adapter, setAdapter] = useState<MembershipBootstrapPreviewAdapter | null>(null);
  const [state, setState] = useState<MembershipBootstrapState | null>(null);
  const [viewer, setViewer] = useState<MembershipInvitationViewer>('invitee');
  useEffect(() => {
    const prepare = route === 'limited'
      ? Promise.resolve(createLimitedDinnerActionPreviewAdapter())
      : createMembershipBootstrapPreviewCeremony(route);
    void prepare.then(value => {
      document.documentElement.dataset.canonicalInviteUrl = value.canonicalUrl ?? '';
      document.documentElement.dataset.qrText = value.qrText ?? '';
      setAdapter(value);
      setState(value.getState());
    });
  }, []);
  if (!adapter || !state) return <p className="p-6 text-sm font-medium text-gray-500">Preparing invitation…</p>;
  const run = async (action: () => Promise<void>, nextViewer = viewer) => {
    await action();
    setState(adapter.getState());
    setViewer(nextViewer);
  };

  if (state === 'wrong_person') {
    return <SafeStop title="This invite isn’t for you" copy="It was made for Nina. Forwarding it does not add anyone to Zurich Dinner." action="Close invite" />;
  }
  if (state === 'expired') {
    return <SafeStop title="This invite expired" copy="Nina was not added. Ask Mina to send a new invitation." action="Close invite" expired />;
  }
  if (isLimitedState(state)) {
    return (
      <LimitedDinnerAction
        state={state}
        onOpen={() => run(adapter.openLimitedAction)}
        onDecline={() => run(adapter.decline)}
      />
    );
  }

  const status: MembershipInvitationUiStatus = state === 'decision'
    ? 'pending'
    : state === 'accepted_pending_grant'
      ? 'ready_to_grant'
      : state === 'joined'
        ? 'accepted'
        : 'declined';
  const entryLabel = adapter.route === 'qr' ? 'Scanned QR' : 'Opened from link';
  return (
    <PreviewFrame>
      <MembershipInvitationFlow
        groupName="Zurich Dinner"
        inviterName="Mina"
        friendName="Nina"
        status={status}
        viewer={viewer}
        previewLabel="Local preview"
        entryLabel={entryLabel}
        groupContext="Mina and Leo are already here. Choose whether you want to take part."
        onAccept={() => run(adapter.accept, 'organizer')}
        onDecline={() => run(adapter.decline)}
        onGrant={() => run(adapter.grant, 'organizer')}
      />
    </PreviewFrame>
  );
}

function isLimitedState(state: MembershipBootstrapState): state is Extract<MembershipBootstrapState, `limited_${string}`> {
  return state === 'limited_decision' || state === 'limited_opened' || state === 'limited_declined';
}

function LimitedDinnerAction(props: {
  state: Extract<MembershipBootstrapState, `limited_${string}`>;
  onOpen: () => Promise<void>;
  onDecline: () => Promise<void>;
}) {
  if (props.state === 'limited_opened') {
    return <StatusScreen icon="done" eyebrow="Dinner only" title="Dinner share opened" copy="You can respond to this dinner without joining Zurich Dinner." />;
  }
  if (props.state === 'limited_declined') {
    return <StatusScreen icon="stopped" eyebrow="Declined" title="Dinner share declined" copy="You were not added to Zurich Dinner." />;
  }
  return (
    <PreviewFrame>
      <ScreenShell>
        <div className="mt-9 flex-1">
          <p className="text-sm font-semibold text-gray-500">Mina invited you • One dinner only</p>
          <h1 className="mt-1 text-[2rem] font-bold tracking-[-0.05em]">Review your dinner share</h1>
          <p className="mt-3 max-w-[20rem] text-[15px] leading-6 text-gray-600">This lets you respond to this dinner only. You won’t join Zurich Dinner.</p>
        </div>
        <div className="space-y-3 pb-3">
          <PrimaryAction onClick={() => void props.onOpen()}>Review dinner share <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" /></PrimaryAction>
          <button type="button" onClick={() => void props.onDecline()} className="w-full py-3 text-sm font-semibold text-gray-500">Decline</button>
        </div>
      </ScreenShell>
    </PreviewFrame>
  );
}

function SafeStop({title, copy, action, expired = false}: {title: string; copy: string; action: string; expired?: boolean}) {
  return (
    <PreviewFrame>
      <ScreenShell>
        <div className="mt-9 flex-1">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700">
            {expired ? <Clock3 className="h-6 w-6" aria-hidden="true" /> : <CircleAlert className="h-6 w-6" aria-hidden="true" />}
          </span>
          <h1 className="mt-5 text-[2rem] font-bold tracking-[-0.05em]">{title}</h1>
          <p className="mt-3 max-w-[20rem] text-[15px] leading-6 text-gray-600">{copy}</p>
        </div>
        <div className="pb-3"><PrimaryAction onClick={() => window.close()}>{action}</PrimaryAction></div>
      </ScreenShell>
    </PreviewFrame>
  );
}

function StatusScreen({icon, eyebrow, title, copy}: {icon: 'done' | 'stopped'; eyebrow: string; title: string; copy: string}) {
  return (
    <PreviewFrame>
      <ScreenShell>
        <div className="mt-9 flex-1">
          <p className="text-sm font-semibold text-gray-500">{eyebrow}</p>
          <span className={`mt-2 flex h-12 w-12 items-center justify-center rounded-full ${icon === 'done' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            {icon === 'done' ? <Check className="h-6 w-6" aria-hidden="true" /> : <X className="h-6 w-6" aria-hidden="true" />}
          </span>
          <h1 className="mt-5 text-[2rem] font-bold tracking-[-0.05em]">{title}</h1>
          <p className="mt-3 max-w-[20rem] text-[15px] leading-6 text-gray-600">{copy}</p>
        </div>
        <div className="pb-3 text-center text-sm font-medium text-gray-500">No further action needed.</div>
      </ScreenShell>
    </PreviewFrame>
  );
}

function ScreenShell({children}: {children: ReactNode}) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    window.scrollTo({top: 0, left: 0});
    ref.current?.scrollTo({top: 0, left: 0});
  }, []);
  return (
    <main ref={ref} className="flex min-h-[100dvh] w-full flex-col bg-[#f7f6f4] px-6 py-7 text-gray-950 sm:min-h-[720px]">
      <header className="flex items-center justify-between">
        <p className="text-lg font-bold tracking-[-0.03em]">ChopDot</p>
        <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Local preview</span>
      </header>
      {children}
    </main>
  );
}

function PreviewFrame({children}: {children: ReactNode}) {
  return <div className="min-h-[100dvh] bg-gray-100 sm:flex sm:items-center sm:justify-center sm:px-8"><div className="w-full overflow-hidden bg-[#f7f6f4] sm:max-w-[390px] sm:rounded-[2rem] sm:border sm:border-black/10 sm:shadow-2xl">{children}</div></div>;
}

function PrimaryAction({children, onClick}: {children: ReactNode; onClick: () => void}) {
  return <button type="button" onClick={onClick} className="flex min-h-14 w-full items-center justify-center rounded-full bg-[#e6007a] px-6 py-4 font-semibold text-white shadow-[0_10px_24px_rgba(230,0,122,0.22)]">{children}</button>;
}

const root = document.getElementById('membership-bootstrap-preview');
if (!root) throw new Error('Membership bootstrap preview root is missing.');
createRoot(root).render(<Preview />);
