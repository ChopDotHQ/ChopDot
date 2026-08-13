import {Check, Clock3, CloudOff, LockKeyhole, ReceiptText} from 'lucide-react';
import type {ReactNode} from 'react';
import {displayMoney, type DinnerJourneySnapshot} from '../../journey/dinnerJourney.ts';

type CardTone = 'neutral' | 'attention' | 'positive' | 'offline' | 'saved';

export interface SpendingGroupCardModel {
  state: string;
  groupName: string;
  total?: string;
  totalLabel: string;
  statusLabel: string;
  statusDetail: string;
  tone: CardTone;
  members: Array<{name: string; detail: string; amount?: string}>;
  preview?: boolean;
}

export function spendingGroupCardFromSnapshot(snapshot: DinnerJourneySnapshot): SpendingGroupCardModel {
  const status = cardStatus(snapshot);
  return {
    state: snapshot.status,
    groupName: snapshot.groupName || 'Dinner',
    total: snapshot.total ? displayMoney(snapshot.total) : undefined,
    totalLabel: snapshot.status === 'closed' ? 'Saved total' : 'Dinner total',
    statusLabel: status.label,
    statusDetail: status.detail,
    tone: status.tone,
    members: snapshot.members.map(member => ({
      name: member.name,
      detail: member.status,
      amount: member.amount ? displayMoney(member.amount) : undefined,
    })),
  };
}

export const zurichDinnerPreviewCard: SpendingGroupCardModel = {
  state: 'preview',
  groupName: 'Zurich Dinner',
  total: 'CHF 120',
  totalLabel: 'Dinner total',
  statusLabel: 'Ready to review',
  statusDetail: 'Nothing has been sent',
  tone: 'neutral',
  preview: true,
  members: [
    {name: 'Mina', detail: 'Paid the bill', amount: 'CHF 40'},
    {name: 'Leo', detail: 'To review', amount: 'CHF 40'},
    {name: 'Nina', detail: 'To review', amount: 'CHF 40'},
  ],
};

export function SpendingGroupCard({model}: {model: SpendingGroupCardModel}) {
  return (
    <article
      aria-label={`${model.groupName}: ${model.statusLabel}`}
      data-card-state={model.state}
      data-testid="spending-group-card"
      className="spending-group-card relative mt-5 overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#101014] text-white shadow-[0_24px_60px_rgba(16,16,20,0.18)]"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_4%,rgba(230,0,122,0.22),transparent_34%),radial-gradient(circle_at_4%_105%,rgba(255,255,255,0.09),transparent_35%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full border border-white/10" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-3 -top-20 h-44 w-44 rounded-full border border-white/5" />

      <div className="relative px-5 pb-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.65rem] bg-white text-[#e6007a] shadow-sm">
              <ReceiptText className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">Spending group</p>
              <p className="truncate text-[17px] font-bold tracking-[-0.025em]">{model.groupName}</p>
            </div>
          </div>
          <StatusPill tone={model.tone}>{pillLabel(model)}</StatusPill>
        </div>

        <div className="mt-4 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">{model.totalLabel}</p>
            <p className="mt-1 whitespace-nowrap text-[2rem] font-bold leading-none tracking-[-0.065em]">{model.total ?? 'Not added'}</p>
          </div>
          <div className="max-w-[7.5rem] text-right">
            <p className="text-xs font-semibold text-white">{model.statusLabel}</p>
            <p className="mt-1 text-[11px] leading-4 text-white/55">{model.statusDetail}</p>
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/10 bg-black/10 px-5 py-1.5" role="list" aria-label="People in this spending group">
        {model.members.map(member => (
          <div key={member.name} role="listitem" className="flex min-h-10 items-center gap-3 border-b border-white/10 py-2 last:border-b-0">
            <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">{member.name.slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{member.name}</p>
              <p className={`mt-0.5 truncate text-[11px] font-medium ${memberStatusClass(member.detail)}`}>{member.detail}</p>
            </div>
            {member.amount && <span className="shrink-0 text-xs font-semibold text-white/80">{member.amount}</span>}
          </div>
        ))}
      </div>
    </article>
  );
}

function StatusPill({tone, children}: {tone: CardTone; children: ReactNode}) {
  const classes: Record<CardTone, string> = {
    neutral: 'bg-white/10 text-white/75',
    attention: 'bg-[#ffdbef] text-[#8e004b]',
    positive: 'bg-[#d9fbe8] text-[#14532d]',
    offline: 'bg-[#fff0c2] text-[#713f12]',
    saved: 'bg-white text-gray-950',
  };
  const Icon = tone === 'positive' ? Check : tone === 'offline' ? CloudOff : tone === 'saved' ? LockKeyhole : Clock3;
  return <span className={`inline-flex min-h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${classes[tone]}`}><Icon className="h-3 w-3" aria-hidden="true" />{children}</span>;
}

function cardStatus(snapshot: DinnerJourneySnapshot): {label: string; detail: string; tone: CardTone} {
  switch (snapshot.status) {
    case 'empty': return snapshot.actorRole === 'organizer'
      ? {label: 'Ready to start', detail: 'Add a receipt first', tone: 'neutral'}
      : {label: 'Waiting', detail: 'Mina has not sent it yet', tone: 'neutral'};
    case 'ready_to_request': return {label: 'Ready to send', detail: 'Review before anyone is asked', tone: 'attention'};
    case 'payment_requested': return {label: 'Payment requested', detail: snapshot.ownShare ? `Your share · ${displayMoney(snapshot.ownShare)}` : 'Your share is ready', tone: 'attention'};
    case 'sending': return {label: 'Saved offline', detail: 'Send it when you reconnect', tone: 'offline'};
    case 'marked_paid': return {label: 'Marked paid', detail: 'Waiting for Mina to confirm', tone: 'attention'};
    case 'needs_confirmation': {
      const count = snapshot.members.filter(member => member.status === 'Marked paid').length;
      return {label: 'Needs confirmation', detail: `${count} ${count === 1 ? 'payment' : 'payments'} to check`, tone: 'attention'};
    }
    case 'ready_to_close': return {label: 'Everyone settled', detail: 'Ready to save one record', tone: 'positive'};
    case 'closed': {
      const received = snapshot.members.filter(member => member.status === 'Received').length;
      return {label: 'Saved', detail: `${received} received · ${snapshot.members.length} people`, tone: 'saved'};
    }
    case 'unavailable': return {label: 'Unavailable', detail: 'Nothing has been changed', tone: 'offline'};
    default: {
      const waiting = snapshot.members.filter(member => member.status === 'Payment requested').length;
      return {label: waiting ? 'Requests sent' : 'Waiting', detail: waiting ? `${waiting} ${waiting === 1 ? 'person' : 'people'} to pay` : 'Updates appear automatically', tone: 'neutral'};
    }
  }
}

function memberStatusClass(status: string): string {
  if (['Received', 'Waived'].includes(status)) return 'text-[#8df0b5]';
  if (status === 'Marked paid') return 'text-[#ff9dcd]';
  return 'text-white/55';
}

function pillLabel(model: SpendingGroupCardModel): string {
  if (model.preview) return 'Preview';
  if (model.state === 'needs_confirmation') return 'To confirm';
  if (model.state === 'ready_to_close') return 'Settled';
  if (model.state === 'payment_requested') return 'Requested';
  return model.statusLabel;
}
