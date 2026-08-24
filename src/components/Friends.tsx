import {BadgeCheck, Check, Copy, Link2, ShieldCheck, Users} from 'lucide-react';
import {useCallback, useEffect, useState, type ReactNode} from 'react';
import {copyText} from '../environment';
import {createProductionVerifiedContactCeremony} from '../contacts/productionVerifiedContactComposition.ts';
import type {
  VerifiedContactCeremonyService,
  VerifiedContactCeremonyState,
} from '../contacts/verifiedContactCeremonyService.ts';
import {VERIFIED_CONTACT_PARAM, verifiedContactFromUrl} from '../contacts/verifiedContactLink.ts';
import {Button, Screen, ScreenContent, ScreenHeader} from './primitives';

type CopyState = 'idle' | 'copied' | 'fallback';

export function Friends({onBack}: {onBack: () => void}) {
  const [service, setService] = useState<VerifiedContactCeremonyService | null>(null);
  const [ceremony, setCeremony] = useState<VerifiedContactCeremonyState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copyState, setCopyState] = useState<CopyState>('idle');

  const enterCurrentCarrier = useCallback(async (active: VerifiedContactCeremonyService) => {
    const hasCarrier = new URL(window.location.href).hash.includes(`${VERIFIED_CONTACT_PARAM}=`);
    if (!hasCarrier) return active.state;
    const message = verifiedContactFromUrl(window.location.href);
    if (!message) throw new Error('This contact link is invalid. Ask the other person for a new one.');
    const next = await active.enter(message);
    removeContactFragment();
    return next;
  }, []);

  const connectAccount = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const active = await createProductionVerifiedContactCeremony();
      const next = await enterCurrentCarrier(active);
      setService(active);
      setCeremony(next);
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setBusy(false);
    }
  }, [enterCurrentCarrier]);

  useEffect(() => {
    if (!service) return;
    const followContactLink = () => {
      setBusy(true);
      setError('');
      void enterCurrentCarrier(service)
        .then(setCeremony)
        .catch(reason => setError(friendlyError(reason)))
        .finally(() => setBusy(false));
    };
    window.addEventListener('hashchange', followContactLink);
    return () => window.removeEventListener('hashchange', followContactLink);
  }, [enterCurrentCarrier, service]);

  const run = async (action: (active: VerifiedContactCeremonyService) => Promise<VerifiedContactCeremonyState>) => {
    if (!service) return;
    setBusy(true);
    setError('');
    setCopyState('idle');
    try {
      setCeremony(await action(service));
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setBusy(false);
    }
  };

  const copyCarrier = async (url: string) => {
    const result = await copyText(url);
    setCopyState(result === 'copied' ? 'copied' : 'fallback');
  };

  return (
    <Screen>
      <ScreenHeader title="People" onBack={onBack} />
      <ScreenContent className="bg-[#f7f6f4] px-6 py-7 dark:bg-gray-950">
        {!service || !ceremony ? (
          <IntroCard busy={busy} error={error} onConnect={() => void connectAccount()} />
        ) : (
          <CeremonyCard
            state={ceremony}
            busy={busy}
            error={error}
            copyState={copyState}
            onStart={() => void run(active => active.start())}
            onRespond={() => void run(active => active.respond())}
            onConfirm={() => void run(active => active.confirmCodesMatch())}
            onCopy={url => void copyCarrier(url)}
          />
        )}
      </ScreenContent>
    </Screen>
  );
}

function IntroCard({busy, error, onConnect}: {busy: boolean; error: string; onConnect: () => void}) {
  const incoming = new URL(window.location.href).hash.includes(`${VERIFIED_CONTACT_PARAM}=`);
  return (
    <Panel
      icon={<Users className="h-6 w-6" aria-hidden="true" />}
      eyebrow={incoming ? 'Contact request' : 'People you trust'}
      title={incoming ? 'Verify who sent this' : 'Verify a person'}
      copy="Both of you sign the same short exchange and compare a six-digit code. Nothing is added to a group yet."
    >
      <Button fullWidth disabled={busy} onClick={onConnect}>
        {busy ? 'Opening your account…' : 'Use my account'}
      </Button>
      <p className="text-center text-xs leading-5 text-gray-500">You choose separately who joins each group.</p>
      <InlineError message={error} />
    </Panel>
  );
}

function CeremonyCard(props: {
  state: VerifiedContactCeremonyState;
  busy: boolean;
  error: string;
  copyState: CopyState;
  onStart: () => void;
  onRespond: () => void;
  onConfirm: () => void;
  onCopy: (url: string) => void;
}) {
  const {state, busy, error, copyState, onStart, onRespond, onConfirm, onCopy} = props;

  if (state.status === 'idle') {
    return (
      <div className="space-y-5">
        <Panel
          icon={<ShieldCheck className="h-6 w-6" aria-hidden="true" />}
          eyebrow="Contact check"
          title="Verify someone you know"
          copy="Share a temporary link, then compare the code together by voice or in person."
        >
          <Button fullWidth disabled={busy} onClick={onStart}>Start verification</Button>
          <InlineError message={error} />
        </Panel>
        <VerifiedPeople records={state.verified} />
      </div>
    );
  }

  if (state.status === 'offer_ready') {
    return (
      <CarrierPanel
        title="Send this contact link"
        copy="It expires in 20 minutes. Ask the other person to open it with their own account."
        url={state.carrierUrl}
        busy={busy}
        copyState={copyState}
        onCopy={onCopy}
        error={error}
      />
    );
  }

  if (state.status === 'offer_received') {
    return (
      <Panel
        icon={<Link2 className="h-6 w-6" aria-hidden="true" />}
        eyebrow="Contact request"
        title={`${state.remoteId} wants to verify with you`}
        copy="Continue only if you know this person. You will compare the same six-digit code before either side is verified."
      >
        <Button fullWidth disabled={busy} onClick={onRespond}>Continue to the code</Button>
        <InlineError message={error} />
      </Panel>
    );
  }

  if (state.status === 'compare') {
    return (
      <Panel
        icon={<ShieldCheck className="h-6 w-6" aria-hidden="true" />}
        eyebrow={`Checking ${state.remoteId}`}
        title="Compare this code together"
        copy="Read it aloud or compare it in person. If either screen differs, stop."
      >
        {state.carrierUrl && (
          <CarrierBox
            label="First, send your signed reply"
            url={state.carrierUrl}
            copyState={copyState}
            onCopy={onCopy}
          />
        )}
        <output aria-label="Six-digit contact safety code" className="block rounded-3xl bg-white px-5 py-6 text-center font-mono text-4xl font-bold tracking-[0.14em] text-gray-950 shadow-sm ring-1 ring-black/5 dark:bg-gray-900 dark:text-white">
          {state.safetyCode}
        </output>
        <Button fullWidth disabled={busy} onClick={onConfirm}>The codes match</Button>
        <p className="text-center text-xs leading-5 text-gray-500">This verifies contact only. It does not grant group access or organizer rights.</p>
        <InlineError message={error} />
      </Panel>
    );
  }

  if (state.status === 'confirmation_ready') {
    return (
      <CarrierPanel
        title="Send your confirmation"
        copy={`Your code matched ${state.remoteId}. Send this last signed link, then open their confirmation when it arrives.`}
        url={state.carrierUrl}
        busy={busy}
        copyState={copyState}
        onCopy={onCopy}
        error={error}
      />
    );
  }

  if (state.status === 'verified') {
    return (
      <Panel
        icon={<BadgeCheck className="h-6 w-6" aria-hidden="true" />}
        eyebrow="Contact verified"
        title={`${state.record.remoteParticipantId} is verified`}
        copy={state.carrierUrl
          ? 'Send the final confirmation so they can finish too. You still choose separately whether to invite them to a group.'
          : 'Both accounts completed the same check. You still choose separately whether to invite this person to a group.'}
      >
        {state.carrierUrl && (
          <CarrierBox label="Send final confirmation" url={state.carrierUrl} copyState={copyState} onCopy={onCopy} />
        )}
        <div className="rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900 ring-1 ring-emerald-200">
          <strong>Not a group member yet.</strong> Contact proof never grants membership, money access, or organizer authority.
        </div>
        <InlineError message={error} />
      </Panel>
    );
  }

  const failure = state.status === 'expired'
    ? {title: 'This contact link expired', copy: 'Nothing changed. Ask the other person to create a new link.'}
    : state.status === 'wrong_account'
      ? {title: 'Use the other person’s account', copy: 'A contact check must be completed by two different accounts.'}
      : {title: 'This contact check did not verify', copy: 'Nothing changed. Return and ask for a fresh link.'};
  return (
    <Panel eyebrow="Not verified" title={failure.title} copy={failure.copy}>
      <InlineError message={error} />
    </Panel>
  );
}

function CarrierPanel(props: {
  title: string;
  copy: string;
  url: string;
  busy: boolean;
  copyState: CopyState;
  onCopy: (url: string) => void;
  error: string;
}) {
  return (
    <Panel icon={<Link2 className="h-6 w-6" aria-hidden="true" />} eyebrow="Ready to share" title={props.title} copy={props.copy}>
      <CarrierBox label="Copy secure link" url={props.url} copyState={props.copyState} onCopy={props.onCopy} />
      <InlineError message={props.error} />
    </Panel>
  );
}

function CarrierBox({label, url, copyState, onCopy}: {label: string; url: string; copyState: CopyState; onCopy: (url: string) => void}) {
  return (
    <div className="space-y-3">
      <Button fullWidth onClick={() => onCopy(url)}>
        {copyState === 'copied' ? <><Check className="mr-2 h-5 w-5" aria-hidden="true" />Copied</> : <><Copy className="mr-2 h-5 w-5" aria-hidden="true" />{label}</>}
      </Button>
      {copyState === 'fallback' && (
        <div>
          <label htmlFor="contact-carrier" className="text-sm font-medium text-gray-700 dark:text-gray-200">Select and copy this link</label>
          <input id="contact-carrier" readOnly value={url} onFocus={event => event.currentTarget.select()} className="mt-2 w-full rounded-2xl bg-white p-4 text-sm text-gray-950 shadow-sm ring-1 ring-black/10 dark:bg-gray-900 dark:text-white" />
        </div>
      )}
    </div>
  );
}

function VerifiedPeople({records}: {records: Extract<VerifiedContactCeremonyState, {status: 'idle'}>['verified']}) {
  return (
    <section aria-labelledby="verified-people-heading" className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 dark:bg-gray-900">
      <h2 id="verified-people-heading" className="font-semibold text-gray-950 dark:text-white">Verified people</h2>
      {records.length === 0 ? (
        <p className="mt-2 text-sm leading-6 text-gray-500">No one verified yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
          {records.map(record => (
            <li key={record.recordId} className="flex min-h-12 items-center gap-3 py-3">
              <BadgeCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" />
              <span className="font-medium text-gray-950 dark:text-white">{record.remoteParticipantId}</span>
              <span className="ml-auto text-xs font-semibold text-gray-500">Contact only</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Panel({icon, eyebrow, title, copy, children}: {icon?: ReactNode; eyebrow: string; title: string; copy: string; children?: ReactNode}) {
  return (
    <section className="mx-auto flex min-h-[34rem] w-full max-w-md flex-col rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-gray-900">
      {icon && <span className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-100 text-[#c40068] dark:bg-pink-950">{icon}</span>}
      <p className="mt-5 text-sm font-semibold text-gray-500">{eyebrow}</p>
      <h1 className="mt-2 text-[2rem] font-bold tracking-[-0.05em] text-gray-950 dark:text-white">{title}</h1>
      <p className="mt-3 max-w-sm text-[15px] leading-6 text-gray-600 dark:text-gray-300">{copy}</p>
      {children && <div className="mt-auto space-y-4 pt-8">{children}</div>}
    </section>
  );
}

function InlineError({message}: {message: string}) {
  return message ? <p role="alert" className="text-sm font-medium text-orange-700 dark:text-orange-300">{message}</p> : null;
}

function removeContactFragment(): void {
  const url = new URL(window.location.href);
  url.hash = '';
  window.history.replaceState(null, '', url.toString());
}

function friendlyError(reason: unknown): string {
  const message = reason instanceof Error ? reason.message : '';
  if (/compatible signed host account/iu.test(message)) return 'Open ChopDot in a supported Polkadot host and choose your account.';
  if (/invalid|expired/iu.test(message)) return 'This contact link is invalid or expired. Nothing changed.';
  return 'This contact check could not continue. Nothing changed; please try again.';
}
