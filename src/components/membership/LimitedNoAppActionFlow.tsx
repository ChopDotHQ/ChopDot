import {Check, CircleAlert, Clock3, X} from 'lucide-react';
import {useLayoutEffect, useRef, type ReactNode, type RefObject} from 'react';
import {MoneyAmount} from '../primitives';

export type LimitedNoAppActionFlowState =
  | 'ready_to_mark_paid'
  | 'ready_to_decline'
  | 'marked_paid'
  | 'marked_paid_pending'
  | 'declined'
  | 'declined_pending'
  | 'wrong_account'
  | 'expired'
  | 'unavailable';

export function LimitedNoAppActionFlow({
  state,
  amount,
  currency,
  running = false,
  onRespond,
  onClose,
}: {
  state: LimitedNoAppActionFlowState;
  amount: number;
  currency: string;
  running?: boolean;
  onRespond?: () => Promise<void> | void;
  onClose: () => void;
}) {
  const scrollRootRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    scrollRootRef.current?.scrollTo({top: 0, left: 0});
    window.scrollTo({top: 0, left: 0});
  }, [state]);

  const ready = state === 'ready_to_mark_paid' || state === 'ready_to_decline';
  const title = state === 'ready_to_mark_paid'
    ? 'Confirm this dinner payment'
    : state === 'ready_to_decline'
      ? 'Decline this dinner request'
      : null;

  if (!ready) {
    return (
      <StatusScreen
        rootRef={scrollRootRef}
        state={state}
        amount={amount}
        currency={currency}
        onClose={onClose}
      />
    );
  }

  return (
    <main ref={scrollRootRef} className="flex min-h-[100dvh] w-full flex-col bg-[#f7f6f4] px-6 py-7 text-gray-950 sm:min-h-[720px]">
      <Brand />
      <section className="mt-9 flex-1">
        <p className="text-sm font-semibold text-gray-500">One dinner only</p>
        <h1 className="mt-1 text-[2rem] font-bold tracking-[-0.05em]">{title}</h1>
        <p className="mt-3 max-w-[20rem] text-[15px] leading-6 text-gray-600">
          This answers only this dinner request. You won’t join the group.
        </p>
        <div className="mt-12 text-[3.5rem] leading-none">
          <MoneyAmount amount={amount} currency={currency} />
        </div>
      </section>
      <div className="space-y-3 pb-3">
        <PrimaryAction disabled={running || !onRespond} onClick={() => void onRespond?.()}>
          {running
            ? 'Sending…'
            : state === 'ready_to_mark_paid'
              ? 'I paid this'
              : 'Decline request'}
        </PrimaryAction>
        <button type="button" disabled={running} onClick={onClose} className="w-full py-3 text-sm font-semibold text-gray-500 disabled:opacity-50">
          Not now
        </button>
      </div>
    </main>
  );
}

function StatusScreen({
  rootRef,
  state,
  amount,
  currency,
  onClose,
}: {
  rootRef: RefObject<HTMLElement | null>;
  state: Exclude<LimitedNoAppActionFlowState, 'ready_to_mark_paid' | 'ready_to_decline'>;
  amount: number;
  currency: string;
  onClose: () => void;
}) {
  const content = state === 'marked_paid'
    ? {icon: 'done' as const, eyebrow: 'Payment marked', title: 'Waiting for confirmation', copy: 'The organizer still needs to confirm what arrived.'}
    : state === 'marked_paid_pending'
      ? {icon: 'expired' as const, eyebrow: 'Saved', title: 'Waiting to send', copy: 'We’ll send your payment update when the connection returns.'}
    : state === 'declined'
      ? {icon: 'stopped' as const, eyebrow: 'Declined', title: 'Request declined', copy: 'Nothing else changed.'}
      : state === 'declined_pending'
        ? {icon: 'expired' as const, eyebrow: 'Saved', title: 'Waiting to send', copy: 'We’ll send your response when the connection returns.'}
      : state === 'expired'
        ? {icon: 'expired' as const, eyebrow: 'Expired', title: 'This request expired', copy: 'Ask the organizer to send a new one.'}
        : state === 'wrong_account'
          ? {icon: 'stopped' as const, eyebrow: 'Unavailable', title: 'This request isn’t for you', copy: 'It was made for a different account.'}
          : {icon: 'stopped' as const, eyebrow: 'Unavailable', title: 'This request can’t be opened', copy: 'Nothing has changed.'};
  const Icon = content.icon === 'done' ? Check : content.icon === 'expired' ? Clock3 : state === 'unavailable' ? CircleAlert : X;
  return (
    <main ref={rootRef} className="flex min-h-[100dvh] w-full flex-col bg-[#f7f6f4] px-6 py-7 text-gray-950 sm:min-h-[720px]">
      <Brand />
      <section className="mt-9 flex-1">
        <p className="text-sm font-semibold text-gray-500">{content.eyebrow}</p>
        <span className={`mt-3 flex h-12 w-12 items-center justify-center rounded-full ${content.icon === 'done' ? 'bg-emerald-100 text-emerald-700' : content.icon === 'expired' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-[2rem] font-bold tracking-[-0.05em]">{content.title}</h1>
        <p className="mt-3 max-w-[20rem] text-[15px] leading-6 text-gray-600">{content.copy}</p>
        {(['marked_paid', 'marked_paid_pending', 'declined', 'declined_pending'] as LimitedNoAppActionFlowState[]).includes(state) && (
          <p className="mt-8 text-2xl"><MoneyAmount amount={amount} currency={currency} /></p>
        )}
      </section>
      <div className="pb-3"><PrimaryAction onClick={onClose}>Close</PrimaryAction></div>
    </main>
  );
}

function Brand() {
  return <header><p className="text-lg font-bold tracking-[-0.03em]">ChopDot</p></header>;
}

function PrimaryAction({children, disabled = false, onClick}: {children: ReactNode; disabled?: boolean; onClick: () => void}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="flex min-h-14 w-full items-center justify-center rounded-full bg-[#e6007a] px-6 py-4 font-semibold text-white shadow-[0_10px_24px_rgba(230,0,122,0.22)] disabled:cursor-not-allowed disabled:opacity-45">
      {children}
    </button>
  );
}
