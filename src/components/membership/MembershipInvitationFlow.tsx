import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import {ArrowRight, Check, CircleAlert, Clock3, UserPlus, X} from 'lucide-react';
import type {MembershipInvitationUiStatus} from './membershipInvitationView.ts';

export type MembershipInvitationViewer = 'organizer' | 'invitee';

interface MembershipInvitationFlowProps {
  groupName: string;
  inviterName: string;
  friendName: string;
  status: MembershipInvitationUiStatus;
  viewer: MembershipInvitationViewer;
  previewLabel?: string;
  entryLabel?: string;
  groupContext?: string;
  onInvite?: () => Promise<void> | void;
  onAccept?: () => Promise<void> | void;
  onDecline?: () => Promise<void> | void;
  onGrant?: () => Promise<void> | void;
  onRetryGrant?: () => Promise<void> | void;
}

type ActionName = 'invite' | 'accept' | 'decline' | 'grant' | 'retry';

export function MembershipInvitationFlow(props: MembershipInvitationFlowProps) {
  const scrollRootRef = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState(true);
  const [running, setRunning] = useState<ActionName | null>(null);
  const [failedAction, setFailedAction] = useState<ActionName | null>(null);

  useEffect(() => setFailedAction(null), [props.status]);

  const visibleStatus = failedAction === 'grant' || failedAction === 'retry'
    ? 'grant_failed'
    : props.status;

  useLayoutEffect(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    const resetScroll = () => {
      scrollRootRef.current?.scrollTo({top: 0, left: 0});
      window.scrollTo({top: 0, left: 0});
    };
    resetScroll();
    const frame = window.requestAnimationFrame(resetScroll);
    return () => window.cancelAnimationFrame(frame);
  }, [visibleStatus]);

  const run = async (action: ActionName, callback?: () => Promise<void> | void) => {
    if (!callback || running) return;
    setRunning(action);
    setFailedAction(null);
    try {
      await callback();
    } catch {
      setFailedAction(action);
    } finally {
      setRunning(null);
    }
  };

  return (
    <main ref={scrollRootRef} className="flex min-h-[100dvh] w-full flex-col bg-[#f7f6f4] px-6 py-7 text-gray-950 dark:bg-gray-950 dark:text-white sm:min-h-[720px]">
      <header className="flex items-center justify-between">
        <p className="text-lg font-bold tracking-[-0.03em]">ChopDot</p>
        {props.previewLabel && (
          <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-400">
            {props.previewLabel}
          </span>
        )}
      </header>

      <div className="mt-9 flex-1">
        <InvitationHeading {...props} status={visibleStatus} />

        {visibleStatus === 'idle' && props.viewer === 'organizer' && (
          <section className="mt-8" aria-labelledby="people-label">
            <p id="people-label" className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
              People you know
            </p>
            <button
              type="button"
              role="checkbox"
              aria-checked={selected}
              aria-label={`Select ${props.friendName}`}
              onClick={() => setSelected(current => !current)}
              className="mt-3 flex w-full items-center gap-4 border-y border-black/10 py-4 text-left focus:outline-none focus:ring-2 focus:ring-[#e6007a] focus:ring-offset-2 dark:border-white/10 dark:ring-offset-gray-950"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-950 text-sm font-bold text-white dark:bg-white dark:text-gray-950">
                {initials(props.friendName)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{props.friendName}</span>
                <span className="mt-0.5 block text-sm text-gray-500 dark:text-gray-400">ChopDot friend</span>
              </span>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${selected ? 'border-[#e6007a] bg-[#e6007a] text-white' : 'border-gray-300 text-transparent dark:border-gray-600'}`}>
                <Check className="h-4 w-4" aria-hidden="true" />
              </span>
            </button>
          </section>
        )}
      </div>

      <InvitationActions
        {...props}
        status={visibleStatus}
        selected={selected}
        running={running}
        failedAction={failedAction}
        run={run}
      />
    </main>
  );
}

function InvitationHeading(props: MembershipInvitationFlowProps & {status: MembershipInvitationUiStatus}) {
  if (props.status === 'idle') {
    return <Heading title={`Invite ${props.friendName}`} copy={`${props.friendName} is already your friend. They still choose whether to join ${props.groupName}.`} />;
  }
  if (props.status === 'pending' && props.viewer === 'invitee') {
    return <Heading eyebrow={`${props.inviterName} invited you${props.entryLabel ? ` • ${props.entryLabel}` : ''}`} title={`Join ${props.groupName}?`} copy={props.groupContext ?? 'See the group and choose whether you want to take part.'} />;
  }
  if (props.status === 'pending') {
    return <Heading icon="pending" eyebrow="Pending" title={`Waiting for ${props.friendName}`} copy={`${props.friendName} has the invite. They are not in the group until they accept.`} />;
  }
  if (props.status === 'ready_to_grant') {
    return <Heading icon="pending" eyebrow="Accepted" title={`${sentenceStart(props.friendName)} accepted`} copy={`${sentenceStart(props.friendName)} said yes. Add them to ${props.groupName} to finish.`} />;
  }
  if (props.status === 'accepted_waiting_grant') {
    return <Heading icon="pending" eyebrow="Acceptance sent" title={`Waiting for ${props.inviterName}`} copy={`You are not in ${props.groupName} until ${props.inviterName} finishes adding you.`} />;
  }
  if (props.status === 'accepted') {
    return props.viewer === 'invitee'
      ? <Heading icon="accepted" eyebrow="Accepted" title="You joined" copy={`You can now take part in ${props.groupName}.`} />
      : <Heading icon="accepted" eyebrow="Accepted" title={`${props.friendName} joined`} copy={`${props.friendName} can now take part in ${props.groupName}.`} />;
  }
  if (props.status === 'declined') {
    return props.viewer === 'invitee'
      ? <Heading icon="declined" eyebrow="Declined" title="Invite declined" copy={`You were not added to ${props.groupName}.`} />
      : <Heading icon="declined" eyebrow="Declined" title={`${props.friendName} declined`} copy={`${props.friendName} was not added to ${props.groupName}.`} />;
  }
  if (props.status === 'grant_failed') {
    return <Heading icon="failed" eyebrow="Couldn’t add" title={`${props.friendName} wasn’t added`} copy={`The invite was accepted, but ChopDot couldn’t finish adding ${props.friendName}. Nothing changed.`} />;
  }
  if (props.status === 'expired') {
    return <Heading icon="declined" eyebrow="Expired" title="This invite expired" copy={`${props.friendName} was not added to ${props.groupName}.`} />;
  }
  return <Heading icon="declined" eyebrow="Cancelled" title="Invite cancelled" copy={`${props.friendName} was not added to ${props.groupName}.`} />;
}

function Heading({eyebrow, title, copy, icon}: {eyebrow?: string; title: string; copy: string; icon?: 'pending' | 'accepted' | 'declined' | 'failed'}) {
  const Icon = icon === 'pending' ? Clock3 : icon === 'accepted' ? Check : icon === 'failed' ? CircleAlert : icon === 'declined' ? X : UserPlus;
  return (
    <section aria-live="polite">
      {eyebrow && <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{eyebrow}</p>}
      {icon && (
        <span className={`mb-5 flex h-12 w-12 items-center justify-center rounded-full ${icon === 'accepted' ? 'bg-emerald-100 text-emerald-700' : icon === 'failed' || icon === 'declined' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      )}
      <h1 className="mt-1 text-[2rem] font-bold tracking-[-0.05em]">{title}</h1>
      <p className="mt-3 max-w-[20rem] text-[15px] leading-6 text-gray-600 dark:text-gray-300">{copy}</p>
    </section>
  );
}

function InvitationActions(props: MembershipInvitationFlowProps & {
  status: MembershipInvitationUiStatus;
  selected: boolean;
  running: ActionName | null;
  failedAction: ActionName | null;
  run: (action: ActionName, callback?: () => Promise<void> | void) => Promise<void>;
}) {
  if (props.status === 'idle' && props.viewer === 'organizer') {
    return (
      <div className="pb-3">
        {props.failedAction === 'invite' && <ActionError>Invite couldn’t be sent. Try again.</ActionError>}
        <PrimaryButton disabled={!props.selected || Boolean(props.running)} onClick={() => void props.run('invite', props.onInvite)}>
          {props.running === 'invite' ? 'Sending…' : `Invite ${props.friendName}`}
        </PrimaryButton>
      </div>
    );
  }
  if (props.status === 'pending' && props.viewer === 'invitee') {
    return (
      <div className="space-y-3 pb-3">
        {props.failedAction === 'accept' && <ActionError>Couldn’t accept the invite. Try again.</ActionError>}
        {props.failedAction === 'decline' && <ActionError>Couldn’t decline the invite. Try again.</ActionError>}
        <PrimaryButton disabled={Boolean(props.running)} onClick={() => void props.run('accept', props.onAccept)}>
          {props.running === 'accept' ? 'Joining…' : 'Accept invite'}
          {!props.running && <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />}
        </PrimaryButton>
        <button type="button" disabled={Boolean(props.running)} onClick={() => void props.run('decline', props.onDecline)} className="w-full py-3 text-sm font-semibold text-gray-500 hover:text-gray-950 disabled:opacity-50 dark:text-gray-400 dark:hover:text-white">
          Decline
        </button>
      </div>
    );
  }
  if (props.status === 'ready_to_grant' && props.viewer === 'organizer') {
    return (
      <div className="pb-3">
        <PrimaryButton disabled={Boolean(props.running)} onClick={() => void props.run('grant', props.onGrant)}>
          {props.running === 'grant' ? 'Adding…' : `Add ${props.friendName}`}
        </PrimaryButton>
      </div>
    );
  }
  if (props.status === 'grant_failed') {
    return (
      <div className="pb-3">
        <PrimaryButton disabled={Boolean(props.running)} onClick={() => void props.run('retry', props.onRetryGrant)}>
          {props.running === 'retry' ? 'Trying again…' : 'Try again'}
        </PrimaryButton>
      </div>
    );
  }
  return <div className="pb-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">No further action needed.</div>;
}

function PrimaryButton({children, ...props}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} type="button" className="flex min-h-14 w-full items-center justify-center rounded-full bg-[#e6007a] px-6 py-4 font-semibold text-white shadow-[0_10px_24px_rgba(230,0,122,0.22)] transition-colors hover:bg-[#c9006b] focus:outline-none focus:ring-2 focus:ring-[#e6007a] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 dark:ring-offset-gray-950">
      {children}
    </button>
  );
}

function ActionError({children}: {children: ReactNode}) {
  return <p role="alert" className="mb-3 text-center text-sm font-medium text-red-600 dark:text-red-400">{children}</p>;
}

function initials(name: string): string {
  return name.split(/\s+/u).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('');
}

function sentenceStart(value: string): string {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}
