import type { PotStatus } from '../../chapter/types';

type CaptureChapterPanelProps = {
  status: PotStatus | null;
  currentMemberId: string;
  onMarkPaid: (legId: string, payerMemberId: string) => void;
  onConfirm: (legId: string, receiverMemberId: string) => void;
  onClose?: () => void;
  onOpenHandoff?: (legId: string) => void;
  isLoading?: boolean;
};

function legStateLabel(state: string): string {
  if (state === 'open') return 'Waiting';
  if (state === 'claimed') return 'Marked paid';
  if (state === 'confirmed') return 'Confirmed received';
  return state.replace(/_/g, ' ');
}

function getGroupGuidance(status: PotStatus): { step: 'mark' | 'confirm'; label: string } | null {
  const claimedCount = status.legs.filter((leg) => leg.state === 'claimed').length;
  const openCount = status.legs.filter((leg) => leg.state === 'open').length;

  if (claimedCount > 0) {
    return {
      step: 'confirm',
      label: `${claimedCount} waiting for confirmation`,
    };
  }

  if (openCount > 0) {
    return {
      step: 'mark',
      label: `${openCount} waiting to pay`,
    };
  }

  return null;
}

function nextActionLabel(leg: PotStatus['legs'][number], currentMemberId: string): { title: string; detail?: string } {
  if (leg.state === 'open') {
    if (leg.fromMemberId === currentMemberId) {
      return {
        title: 'Your turn',
        detail: `Pay ${leg.toName}`,
      };
    }

    return {
      title: leg.fromName,
      detail: 'Waiting to pay',
    };
  }

  if (leg.state === 'claimed') {
    if (leg.toMemberId === currentMemberId) {
      return {
        title: 'Your turn',
        detail: `Confirm ${leg.fromName}`,
      };
    }

    if (leg.fromMemberId === currentMemberId) {
      return {
        title: leg.toName,
        detail: 'Waiting to confirm',
      };
    }

    return {
      title: leg.toName,
      detail: 'Waiting to confirm',
    };
  }

  return {
    title: 'Confirmed received',
    detail: `${leg.fromName} paid ${leg.toName}`,
  };
}

export function CaptureChapterPanel({
  status,
  currentMemberId,
  onMarkPaid,
  onConfirm,
  onClose,
  onOpenHandoff,
  isLoading,
}: CaptureChapterPanelProps) {
  if (!status) {
    return null;
  }

  const groupGuidance = getGroupGuidance(status);
  const nextActions = status.legs
    .filter((leg) => leg.state !== 'confirmed')
    .slice(0, 3)
    .map((leg) => ({ leg, copy: nextActionLabel(leg, currentMemberId) }));

  return (
    <section
      className="card p-4 space-y-3 mx-4 mt-4 mb-8"
      data-testid="capture-chapter-status"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-body font-semibold">Group status</h3>
        <span className="text-caption text-secondary">
          {status.openLegCount} share{status.openLegCount === 1 ? '' : 's'} open
        </span>
      </div>

      {groupGuidance && (
        <p className="text-caption text-secondary" data-testid="capture-group-guidance">
          {groupGuidance.label}
        </p>
      )}

      {nextActions.length > 0 && (
        <div className="list-row p-3 space-y-2" data-testid="capture-action-queue">
          <p className="text-caption font-medium">Waiting on</p>
          <div className="divide-y divide-border">
            {nextActions.map(({ leg, copy }) => (
              <div className="py-2 first:pt-0 last:pb-0" key={leg.id} data-testid={`capture-next-${leg.id}`}>
                <p className="text-caption font-medium">{copy.title}</p>
                {copy.detail && <p className="text-caption text-secondary mt-0.5">{copy.detail}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {status.openLegCount === 0 ? (
        <div className="space-y-3" data-testid="capture-ready-to-close">
          {status.chapterState === 'closed' ? (
            <div className="card p-3 space-y-1" data-testid="capture-record-closed">
              <p className="text-caption font-medium">Record saved</p>
              <p className="text-caption text-secondary">All shares confirmed.</p>
            </div>
          ) : (
            <>
              <p className="text-caption text-secondary">All shares confirmed.</p>
              {onClose && (
                <button
                  type="button"
                  disabled={isLoading}
                  className="w-full rounded-xl py-2.5 text-caption font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent)' }}
                  data-testid="capture-close-record"
                  onClick={onClose}
                >
                  Close record
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {status.legs.map((leg) => (
            <li
              key={leg.id}
              className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0"
              data-testid={`capture-leg-${leg.id}`}
            >
              <div className="text-caption">
                <span className="font-medium">{leg.fromName}</span>
                {' → '}
                <span className="font-medium">{leg.toName}</span>
                {' · '}
                {leg.amount.toFixed(2)} {leg.currency}
                {' · '}
                {legStateLabel(leg.state)}
              </div>
              <div className="flex gap-2 flex-wrap">
                {leg.state === 'open' && onOpenHandoff && (
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-full border border-border text-caption"
                    data-testid={`capture-leg-${leg.id}-handoff`}
                    onClick={() => onOpenHandoff(leg.id)}
                  >
                    Payment details
                  </button>
                )}
                {leg.state === 'open' && (
                  <button
                    type="button"
                    disabled={isLoading || leg.fromMemberId !== currentMemberId}
                    className="px-3 py-1.5 rounded-full bg-muted/20 text-caption hover:bg-muted/30 disabled:opacity-50"
                    data-testid={`capture-leg-${leg.id}-mark-paid`}
                    onClick={() => onMarkPaid(leg.id, leg.fromMemberId)}
                  >
                    Mark paid
                  </button>
                )}
                {leg.state === 'claimed' && (
                  <button
                    type="button"
                    disabled={isLoading || leg.toMemberId !== currentMemberId}
                    className="px-3 py-1.5 rounded-full bg-accent text-caption text-white disabled:opacity-50"
                    data-testid={`capture-leg-${leg.id}-confirm`}
                    onClick={() => onConfirm(leg.id, leg.toMemberId)}
                  >
                    Confirm received
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
