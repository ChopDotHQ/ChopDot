import {useEffect, useState} from 'react';
import {Check, CircleAlert, ReceiptText} from 'lucide-react';
import type {RecoveredGroupSummary, RecoveryEntryOutcome, RecoveryEntryService} from '../../recovery/recoveryEntryService';

export interface GroupRecoveryEntryDependencies {
  service: RecoveryEntryService;
}

export function GroupRecoveryEntry({
  groupId,
  dependencies,
  onClose,
}: {
  groupId: string;
  dependencies?: GroupRecoveryEntryDependencies;
  onClose: () => void;
}) {
  const [outcome, setOutcome] = useState<RecoveryEntryOutcome | null>(null);
  useEffect(() => {
    let active = true;
    if (!dependencies) {
      setOutcome({status: 'unavailable'});
      return () => {active = false};
    }
    setOutcome(null);
    void dependencies.service.recover(groupId).then(result => {if (active) setOutcome(result)});
    return () => {active = false};
  }, [dependencies, groupId]);

  if (!outcome) return <Shell><p role="status" className="mt-12 text-sm font-medium text-gray-500">Bringing your group up to date…</p></Shell>;
  if (outcome.status !== 'ready') return <Unavailable onClose={() => closeRoute(onClose)} />;
  return <Recovered summary={outcome.summary} onClose={() => closeRoute(onClose)} />;
}

function Recovered({summary, onClose}: {summary: RecoveredGroupSummary; onClose: () => void}) {
  const [reviewing, setReviewing] = useState(false);
  return (
    <Shell>
      <section className="mt-10 flex-1">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Check className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="mt-5 text-sm font-semibold text-emerald-700">You’re up to date</p>
        <h1 className="mt-1 text-[2rem] font-bold tracking-[-0.05em]">{summary.groupName}</h1>
        {!reviewing ? (
          <p className="mt-3 max-w-[20rem] text-[15px] leading-6 text-gray-600">Your shared record is ready on this device.</p>
        ) : <div className="mt-7 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Shared spend</p>
              <p className="mt-2 text-3xl font-bold tracking-[-0.05em]">{summary.totalLabel}</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-50 text-pink-600">
              <ReceiptText className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4 text-sm">
            <p><span className="block font-semibold text-gray-950">{summary.receivedCount} received</span><span className="text-gray-500">Payments confirmed</span></p>
            <p><span className="block font-semibold text-gray-950">{summary.memberCount} people</span><span className="text-gray-500">In this group</span></p>
          </div>
          <p className="mt-4 text-sm font-medium text-gray-600">{summary.closed ? 'This record is closed and can’t be changed.' : summary.openCount ? `${summary.openCount} payment${summary.openCount === 1 ? '' : 's'} still open.` : 'Everything is settled.'}</p>
        </div>}
      </section>
      <button type="button" onClick={() => reviewing ? onClose() : setReviewing(true)} className="min-h-14 w-full rounded-full bg-[#ed168c] px-6 py-4 font-semibold text-white shadow-sm">
        {reviewing ? 'Done' : 'Review this spend'}
      </button>
    </Shell>
  );
}

function Unavailable({onClose}: {onClose: () => void}) {
  return (
    <Shell>
      <section className="mt-12 flex-1">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700"><CircleAlert className="h-6 w-6" aria-hidden="true" /></span>
        <h1 className="mt-5 text-[2rem] font-bold tracking-[-0.05em]">This group can’t be restored</h1>
        <p className="mt-3 max-w-[22rem] text-[15px] leading-6 text-gray-600">Reconnect the account you used for this group, then try again. Nothing has been changed.</p>
      </section>
      <button type="button" onClick={onClose} className="min-h-14 w-full rounded-full bg-gray-950 px-6 py-4 font-semibold text-white">Close</button>
    </Shell>
  );
}

function Shell({children}: {children: React.ReactNode}) {
  return <main className="flex h-full min-h-0 w-full flex-col bg-[#f7f6f4] px-6 py-8 text-gray-950"><header><p className="text-lg font-bold tracking-[-0.03em]">ChopDot</p></header>{children}</main>;
}

function closeRoute(onClose: () => void) {
  history.replaceState(null, '', `${location.pathname}${location.search}`);
  onClose();
}
