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
  if (state === 'claimed') return 'Marked paid, waiting confirmation';
  if (state === 'confirmed') return 'Confirmed';
  return state.replace(/_/g, ' ');
}

function getGroupGuidance(status: PotStatus): { step: 'mark' | 'confirm'; text: string } | null {
  const claimedCount = status.legs.filter((leg) => leg.state === 'claimed').length;
  const openCount = status.legs.filter((leg) => leg.state === 'open').length;

  if (claimedCount > 0) {
    return {
      step: 'confirm',
      text: `${claimedCount} marked paid. Receivers should confirm only after money arrives.`,
    };
  }

  if (openCount > 0) {
    return {
      step: 'mark',
      text: `${openCount} share${openCount === 1 ? '' : 's'} still need to be marked paid before receivers can confirm.`,
    };
  }

  return null;
}

function nextActionLabel(leg: PotStatus['legs'][number], currentMemberId: string): { title: string; detail: string } {
  if (leg.state === 'open') {
    if (leg.fromMemberId === currentMemberId) {
      return {
        title: 'Your turn: mark paid',
        detail: `Pay ${leg.toName} in your payment app, then mark this share paid.`,
      };
    }

    return {
      title: `${leg.fromName} marks paid`,
      detail: `Waiting for ${leg.fromName} to pay in their payment app and mark this share paid.`,
    };
  }

  if (leg.state === 'claimed') {
    if (leg.toMemberId === currentMemberId) {
      return {
        title: 'Your turn: confirm received',
        detail: `Confirm only if ${leg.fromName}'s money arrived.`,
      };
    }

    if (leg.fromMemberId === currentMemberId) {
      return {
        title: 'Receiver confirms next',
        detail: 'Your payment update is recorded. It still needs receiver confirmation.',
      };
    }

    return {
      title: `${leg.toName} confirms next`,
      detail: `Marked paid by ${leg.fromName}; confirmation waits for money to arrive.`,
    };
  }

  return {
    title: 'Share confirmed',
    detail: `${leg.toName} confirmed receipt from ${leg.fromName}.`,
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
          {groupGuidance.text}
        </p>
      )}

      {nextActions.length > 0 && (
        <div className="rounded-[1.25rem] bg-muted/10 p-3 space-y-2" data-testid="capture-action-queue">
          <p className="text-caption font-medium">Waiting on</p>
          <div className="divide-y divide-border">
            {nextActions.map(({ leg, copy }) => (
              <div className="py-2 first:pt-0 last:pb-0" key={leg.id} data-testid={`capture-next-${leg.id}`}>
                <p className="text-caption font-medium">{copy.title}</p>
                <p className="text-caption text-secondary mt-0.5">{copy.detail}</p>
              </div>
            ))}
          </div>
          <p className="text-caption text-secondary">
            Mark paid tells the group someone paid. Confirm received means the money arrived.
          </p>
        </div>
      )}

      {status.openLegCount === 0 ? (
        <div className="space-y-3" data-testid="capture-ready-to-close">
          {status.chapterState === 'closed' ? (
            <div className="rounded-[1rem] bg-muted/10 p-3 space-y-1" data-testid="capture-record-closed">
              <p className="text-caption font-medium">Record saved</p>
              <p className="text-caption text-secondary">All shares are confirmed in the group record.</p>
            </div>
          ) : (
            <>
              <p className="text-caption text-secondary">All shares confirmed. This record is ready to close.</p>
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
