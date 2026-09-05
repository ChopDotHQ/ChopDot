import {ChangeEvent, useEffect, useRef, useState, type ReactNode} from 'react';
import {ArrowRight, Link as LinkIcon, Upload} from 'lucide-react';
import {extractReceiptDraft} from '../../capture/receiptDraft.ts';
import {DinnerJourneyService, displayMoney, type DinnerJourneySnapshot} from '../../journey/dinnerJourney.ts';
import {SpendingGroupCard, spendingGroupCardFromSnapshot} from './SpendingGroupCard.tsx';

export interface DinnerJourneyEntryDependencies {
  service: DinnerJourneyService;
}

export function DinnerJourneyEntry({dependencies, onClose}: {dependencies?: DinnerJourneyEntryDependencies; onClose: () => void}) {
  const [snapshot, setSnapshot] = useState<DinnerJourneySnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<{title: string; amount: string; source: 'receipt' | 'link'} | null>(null);
  const [captureError, setCaptureError] = useState('');
  const [showLink, setShowLink] = useState(false);
  const [receiptLink, setReceiptLink] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!dependencies) return;
    const service = dependencies.service;
    let active = true;
    const refresh = () => active && setSnapshot(service.getSnapshot());
    const unsubscribe = service.subscribe(refresh);
    void service.start().then(refresh).catch(() => setSnapshot({
      status: 'unavailable', actorId: '', actorName: '', actorRole: 'member', groupId: '', groupName: 'Dinner', description: '', members: [], pendingCount: 0,
      error: 'This dinner could not be opened safely.',
    }));
    return () => {
      active = false;
      unsubscribe();
      service.stop();
    };
  }, [dependencies]);

  if (!dependencies) return <Unavailable onClose={onClose} />;
  if (!snapshot) return <Shell><Eyebrow>Dinner</Eyebrow><h1 className="mt-2 text-3xl font-bold tracking-[-0.045em]">Opening your dinner…</h1><LoadingCard /></Shell>;
  if (snapshot.status === 'unavailable') return <Unavailable onClose={onClose} message={snapshot.error} />;

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      setSnapshot(dependencies.service.getSnapshot());
    } finally {
      setBusy(false);
    }
  };

  const handleReceipt = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setCaptureError('');
    try {
      const result = await extractReceiptDraft(file);
      if (result.status === 'needs_review') {
        setDraft({title: result.title, amount: result.amount.toFixed(2), source: 'receipt'});
      } else {
        setDraft({title: 'Zurich Dinner', amount: '', source: 'receipt'});
        setCaptureError('We couldn’t read the total. Add it below before sending anything.');
      }
    } finally {
      setBusy(false);
    }
  };

  if (snapshot.status === 'empty' && snapshot.actorRole === 'organizer') {
    if (draft) {
      const canContinue = /^\d+(?:\.\d{1,2})?$/.test(draft.amount) && Number(draft.amount) > 0 && draft.title.trim().length > 0;
      return (
        <Shell>
          <Eyebrow>Check before sending</Eyebrow>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.045em]">Review this spend</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">Nothing is shared until you send the split.</p>
          {captureError && <p role="alert" className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">{captureError}</p>}
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-semibold">Place
              <input aria-label="Dinner name" value={draft.title} onChange={event => setDraft({...draft, title: event.target.value})} className="mt-2 min-h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-base outline-none focus:border-gray-950" />
            </label>
            <label className="block text-sm font-semibold">Total
              <div className="mt-2 flex min-h-14 items-center rounded-xl border border-gray-200 bg-white px-4 focus-within:border-gray-950">
                <span className="mr-2 text-sm font-bold text-gray-500">CHF</span>
                <input inputMode="decimal" aria-label="Dinner total" value={draft.amount} onChange={event => setDraft({...draft, amount: event.target.value})} className="min-w-0 flex-1 bg-transparent text-2xl font-bold outline-none" />
              </div>
            </label>
          </div>
          <div className="mt-6 divide-y divide-gray-100 border-y border-gray-100">
            {['Mina', 'Leo', 'Nina'].map(name => <div key={name} className="flex min-h-12 items-center justify-between py-3 text-sm"><span className="font-semibold">{name}</span><span className="text-gray-500">{draft.amount && canContinue ? `CHF ${(Number(draft.amount) / 3).toFixed(2)}` : '—'}</span></div>)}
          </div>
          <Primary disabled={!canContinue || busy} onClick={() => void run(async () => {
            await dependencies.service.createDinner({groupName: 'Zurich Dinner', description: draft.title.trim(), totalDecimal: Number(draft.amount).toFixed(2), currency: 'CHF'});
          })}>{busy ? 'Sending…' : 'Send requests'}</Primary>
          <button type="button" onClick={() => setDraft(null)} className="mt-3 w-full py-2 text-sm font-semibold text-gray-500">Choose another receipt</button>
        </Shell>
      );
    }

    return (
      <Shell>
        <input ref={fileRef} type="file" accept="image/*,.txt,.csv,.json,text/plain,text/csv,application/json" aria-label="Choose dinner receipt" className="sr-only" onChange={event => void handleReceipt(event)} />
        <Eyebrow>Zurich Dinner</Eyebrow>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.045em]">Start with the receipt</h1>
        <p className="mt-2 max-w-sm text-sm leading-6 text-gray-600">Add what you just paid. You’ll review it before Leo or Nina is asked.</p>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="mt-7 flex min-h-40 w-full flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-gray-300 bg-white px-6 hover:border-gray-500">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-50 text-[#e6007a]"><Upload className="h-5 w-5" aria-hidden="true" /></span>
          <span className="mt-3 font-semibold">{busy ? 'Reading receipt…' : 'Add receipt'}</span>
          <span className="mt-1 text-xs text-gray-500">Photo or receipt file</span>
        </button>
        {!showLink ? (
          <button type="button" onClick={() => setShowLink(true)} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 text-sm font-semibold text-gray-600"><LinkIcon className="h-4 w-4" />Use a receipt link</button>
        ) : (
          <div className="mt-5">
            <label className="text-sm font-semibold">Receipt link
              <input aria-label="Receipt link" type="url" value={receiptLink} onChange={event => setReceiptLink(event.target.value)} placeholder="https://…" className="mt-2 min-h-12 w-full rounded-xl border border-gray-200 bg-white px-4 outline-none focus:border-gray-950" />
            </label>
            <button type="button" disabled={!safeWebUrl(receiptLink)} onClick={() => { setDraft({title: 'Zurich Dinner', amount: '', source: 'link'}); setCaptureError('Check the place and total from this link before sending anything.'); }} className="mt-3 min-h-11 w-full rounded-full bg-gray-950 px-5 text-sm font-semibold text-white disabled:opacity-40">Review link</button>
          </div>
        )}
      </Shell>
    );
  }

  if (snapshot.status === 'empty') {
    return <StatusScreen snapshot={snapshot} eyebrow="Zurich Dinner" title="Waiting for Mina" support="Mina hasn’t sent your dinner share yet." />;
  }

  if (snapshot.status === 'payment_requested') {
    return (
      <StatusScreen snapshot={snapshot} eyebrow={snapshot.groupName} title={`Pay Mina ${displayMoney(snapshot.ownShare)}`} support="Use your usual payment app. Then mark it here so Mina knows to check." >
        <Primary disabled={busy} onClick={() => void run(() => dependencies.service.markPaid())}>{busy ? 'Sending…' : 'I paid Mina'}</Primary>
      </StatusScreen>
    );
  }

  if (snapshot.status === 'sending') {
    return (
      <StatusScreen snapshot={snapshot} eyebrow={snapshot.groupName} title="We’ll send this when you’re back online" support="Your payment note is saved on this device. Mina still needs to confirm after it arrives.">
        <Primary disabled={busy} onClick={() => void run(() => dependencies.service.reconnect())}>{busy ? 'Trying again…' : 'Try again'}</Primary>
      </StatusScreen>
    );
  }

  if (snapshot.status === 'marked_paid') {
    return <StatusScreen snapshot={snapshot} eyebrow={snapshot.groupName} title="Marked as paid" support="Mina still needs to confirm that it arrived." />;
  }

  if (snapshot.status === 'needs_confirmation') {
    const waiting = snapshot.members.filter(member => member.status === 'Marked paid');
    return (
      <StatusScreen snapshot={snapshot} eyebrow={snapshot.groupName} title="Confirm what arrived" support="Only confirm money you actually received.">
        <div className="mt-6 space-y-3">{waiting.map(member => <button key={member.participantId} type="button" disabled={busy} onClick={() => void run(() => dependencies.service.confirmReceived(member.participantId))} aria-label={`Confirm received from ${member.name}`} className="flex min-h-14 w-full items-center justify-between rounded-2xl bg-white px-4 text-left shadow-sm ring-1 ring-black/5"><span className="font-semibold">{member.name}</span><span className="font-semibold text-emerald-600">Confirm received</span></button>)}</div>
      </StatusScreen>
    );
  }

  if (snapshot.status === 'ready_to_close') {
    return (
      <StatusScreen snapshot={snapshot} eyebrow={snapshot.groupName} title="Everyone is settled" support="Leo and Nina’s payments were confirmed. Save one final record for the group.">
        <Primary disabled={busy} onClick={() => void run(() => dependencies.service.close())}>{busy ? 'Saving…' : 'Close and save'}</Primary>
      </StatusScreen>
    );
  }

  if (snapshot.status === 'closed') {
    return (
      <StatusScreen snapshot={snapshot} eyebrow="Saved record" title={snapshot.groupName} support="Closed records stay unchanged. A correction would create a new follow-up record.">
        <Primary onClick={onClose}>Done</Primary>
      </StatusScreen>
    );
  }

  return <StatusScreen snapshot={snapshot} eyebrow={snapshot.groupName} title="Waiting for the group" support="Updates will appear here automatically." />;
}

function StatusScreen({snapshot, eyebrow, title, support, children}: {snapshot: DinnerJourneySnapshot; eyebrow: string; title: string; support: string; children?: ReactNode}) {
  return (
    <Shell resetKey={snapshot.status}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="mt-2 text-3xl font-bold tracking-[-0.045em]">{title}</h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-gray-600">{support}</p>
      <p role="status" aria-live="polite" className="sr-only">{spendingGroupCardFromSnapshot(snapshot).statusLabel}</p>
      <SpendingGroupCard model={spendingGroupCardFromSnapshot(snapshot)} />
      {children}
    </Shell>
  );
}

function Shell({children, resetKey}: {children: ReactNode; resetKey?: string}) { const ref=useRef<HTMLElement>(null); useEffect(()=>{ref.current?.scrollTo({top:0,left:0})},[resetKey]); return <main ref={ref} className="flex-1 overflow-y-auto bg-[#f7f6f4] px-6 py-7 text-gray-950 sm:px-7 sm:py-5"> <header className="flex items-center justify-between"><p className="text-lg font-bold tracking-[-0.03em]">ChopDot</p></header>{children}</main>; }
function Eyebrow({children}: {children: ReactNode}) { return <p className="mt-8 text-sm font-semibold text-gray-500 sm:mt-5">{children}</p>; }
function Primary({children, onClick, disabled = false}: {children: ReactNode; onClick: () => void; disabled?: boolean}) { return <button type="button" onClick={onClick} disabled={disabled} data-primary-action="true" className="mt-7 flex min-h-14 w-full items-center justify-center rounded-full bg-[#e6007a] px-6 py-4 font-semibold text-white shadow-[0_10px_24px_rgba(230,0,122,0.22)] transition-colors hover:bg-[#c9006b] focus:outline-none focus:ring-2 focus:ring-[#e6007a] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 sm:mt-5 sm:min-h-12 sm:py-3">{children}<ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" /></button>; }
function Unavailable({onClose, message}: {onClose: () => void; message?: string}) { return <Shell><Eyebrow>Dinner</Eyebrow><h1 className="mt-2 text-3xl font-bold">This dinner can’t be opened</h1><p className="mt-2 text-sm leading-6 text-gray-600">{message ?? 'Open ChopDot with the account that belongs to this group.'}</p><SpendingGroupCard model={{state:'unavailable',groupName:'Dinner',totalLabel:'Dinner total',statusLabel:'Unavailable',statusDetail:'Nothing has been changed',tone:'offline',members:[]}} /><Primary onClick={onClose}>Close</Primary></Shell>; }
function LoadingCard() { return <div data-testid="spending-card-loading" aria-hidden="true" className="mt-6 overflow-hidden rounded-[1.8rem] bg-[#101014] p-5 shadow-[0_24px_60px_rgba(16,16,20,0.18)]"><div className="h-9 w-36 animate-pulse rounded-xl bg-white/10"/><div className="mt-7 h-10 w-44 animate-pulse rounded-xl bg-white/10"/><div className="mt-7 space-y-3 border-t border-white/10 pt-4"><div className="h-10 animate-pulse rounded-xl bg-white/10"/><div className="h-10 animate-pulse rounded-xl bg-white/10"/></div></div>; }
function safeWebUrl(value: string): boolean { try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol); } catch { return false; } }
