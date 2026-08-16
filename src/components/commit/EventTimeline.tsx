import { CheckCircle, FileText, UserPlus, DollarSign, Clock, XCircle } from 'lucide-react';
import type { PotEvent, PotEventType } from '../../types/app';
import { getMemberDisplayName } from '../../utils/settlementLabels';

interface Member {
  id: string;
  name: string;
}

interface EventTimelineProps {
  events: PotEvent[];
  members: Member[];
  currentUserId: string;
}

const EVENT_LABELS: Record<PotEventType, string> = {
  commitment_created:   'Commitment created',
  participant_joined:   'Member joined',
  expense_added:        'Expense added',
  chapter_proposed:     'Settlement proposed',
  leg_marked_paid:      'Payment marked',
  leg_confirmed:        'Payment confirmed',
  chapter_closed:       'Chapter closed',
  commitment_cancelled: 'Commitment cancelled',
};

function EventIcon({ type }: { type: PotEventType }) {
  const cls = 'w-3.5 h-3.5 flex-shrink-0';
  switch (type) {
    case 'chapter_closed':    return <CheckCircle className={cls} style={{ color: 'var(--success)' }} />;
    case 'leg_confirmed':     return <CheckCircle className={cls} style={{ color: 'var(--success)' }} />;
    case 'leg_marked_paid':   return <DollarSign className={cls} style={{ color: 'var(--accent)' }} />;
    case 'chapter_proposed':  return <FileText className={cls} style={{ color: 'var(--accent)' }} />;
    case 'participant_joined':return <UserPlus className={cls} style={{ color: 'var(--text-secondary)' }} />;
    case 'commitment_cancelled': return <XCircle className={cls} style={{ color: 'var(--error)' }} />;
    default:                  return <Clock className={cls} style={{ color: 'var(--text-secondary)' }} />;
  }
}

function formatEventTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function EventTimeline({ events, members, currentUserId }: EventTimelineProps) {
  if (events.length === 0) return null;

  // Oldest first for a timeline reading order
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  return (
    <div className="space-y-1 pt-1">
      <p className="text-micro text-secondary uppercase tracking-wide pb-1">Activity</p>
      {sorted.map(event => {
        const actorName = getMemberDisplayName(members, event.actorId, currentUserId);
        const label = EVENT_LABELS[event.type] ?? event.type;
        return (
          <div key={event.id} className="flex items-start gap-2 py-1">
            <EventIcon type={event.type} />
            <div className="flex-1 min-w-0">
              <p className="text-caption leading-tight">
                <span className="font-medium">{actorName}</span>
                {' — '}
                {label}
              </p>
              <p className="text-micro text-secondary">{formatEventTime(event.timestamp)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
