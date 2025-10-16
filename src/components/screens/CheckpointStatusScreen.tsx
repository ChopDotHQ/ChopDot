import { ChevronLeft, Clock, CheckCircle2 } from "lucide-react";

interface Member {
  id: string;
  name: string;
}

interface CheckpointConfirmation {
  confirmed: boolean;
  confirmedAt?: string;
}

interface CheckpointStatusScreenProps {
  potName: string;
  members: Member[];
  confirmations: Map<string, CheckpointConfirmation>;
  currentUserId: string;
  expiresAt: string;
  onBack: () => void;
  onConfirm: () => void;
  onSettleAnyway: () => void;
  onRemind?: (memberId: string) => void;
}

export function CheckpointStatusScreen({
  potName,
  members,
  confirmations,
  currentUserId,
  expiresAt: _expiresAt,
  onBack,
  onConfirm,
  onSettleAnyway,
  onRemind,
}: CheckpointStatusScreenProps) {
  // Calculate confirmation status
  const confirmedCount = Array.from(confirmations.values()).filter(c => c.confirmed).length;
  const totalCount = members.length;
  const allConfirmed = confirmedCount === totalCount;
  const userConfirmed = confirmations.get(currentUserId)?.confirmed || false;

  // Calculate time remaining (computed inline as needed)

  // Format date helper
  const formatConfirmationDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffHours < 1) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/50 transition-all duration-200 active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-screen-title">Ready to Settle?</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-6 space-y-4">
        {/* Explanation */}
        <div className="card p-4">
          <p className="text-sm text-secondary">
            Before settling, let's confirm everyone has entered all their expenses for <span className="text-foreground" style={{ fontWeight: 600 }}>{potName}</span>.
          </p>
        </div>

        {/* Progress indicator */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm" style={{ fontWeight: 600 }}>Confirmation Progress</span>
            <span className="text-sm" style={{ fontWeight: 600 }}>
              {confirmedCount}/{totalCount}
            </span>
          </div>
          
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-success rounded-full transition-all duration-300"
              style={{ width: `${(confirmedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>

        {/* Member confirmation status */}
        <div className="card p-4">
          <h3 className="text-sm mb-3" style={{ fontWeight: 600 }}>Member Status</h3>
          <div className="space-y-3">
            {members.map((member) => {
              const confirmation = confirmations.get(member.id);
              const isConfirmed = confirmation?.confirmed || false;
              const isCurrentUser = member.id === currentUserId;

              return (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isConfirmed ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-muted flex items-center justify-center">
                        <Clock className="w-3 h-3 text-secondary" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm" style={{ fontWeight: 500 }}>
                        {isCurrentUser ? "You" : member.name}
                      </p>
                      {isConfirmed && confirmation?.confirmedAt && (
                        <p className="text-xs text-secondary">
                          Confirmed {formatConfirmationDate(confirmation!.confirmedAt)}
                        </p>
                      )}
                      {!isConfirmed && !isCurrentUser && (
                        <p className="text-xs text-secondary">Pending</p>
                      )}
                    </div>
                  </div>

                  {!isConfirmed && !isCurrentUser && onRemind && (
                    <button
                      onClick={() => onRemind(member.id)}
                      className="px-3 py-1.5 text-xs rounded-lg transition-all duration-200 active:scale-95"
                      style={{
                        background: 'var(--accent-pink-soft)',
                        color: 'var(--accent)',
                        fontWeight: 500,
                      }}
                    >
                      Remind
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* User confirmation action */}
        {!userConfirmed && (
          <div className="card p-4" style={{ background: 'var(--accent-pink-soft)' }}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent)' }}>
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm mb-1" style={{ fontWeight: 600, color: 'var(--ink)' }}>
                  Your confirmation needed
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Have you entered all your expenses?
                </p>
              </div>
            </div>
            <button
              onClick={onConfirm}
              className="w-full py-3 rounded-lg text-sm transition-all duration-200 active:scale-[0.98]"
              style={{
                background: 'var(--accent)',
                color: '#fff',
                fontWeight: 600,
              }}
            >
              ✓ I'm Done
            </button>
          </div>
        )}

        {/* Success state */}
        {allConfirmed && (
          <div className="card p-4" style={{ background: 'rgba(25, 195, 125, 0.1)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-success flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm" style={{ fontWeight: 600 }}>Everyone confirmed!</p>
                <p className="text-xs text-secondary">All members have confirmed their expenses</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-background border-t border-border space-y-3">
        {allConfirmed ? (
          <button
            onClick={onSettleAnyway}
            className="w-full py-3 rounded-lg text-sm transition-all duration-200 active:scale-[0.98]"
            style={{
              background: 'var(--ink)',
              color: 'var(--bg)',
              fontWeight: 600,
            }}
          >
            Proceed to Settlement
          </button>
        ) : (
          <>
            <button
              onClick={onSettleAnyway}
              className="w-full py-3 rounded-lg text-sm transition-all duration-200 active:scale-[0.98]"
              style={{
                background: 'var(--secondary)',
                color: 'var(--ink)',
                fontWeight: 500,
              }}
            >
              Settle Anyway
            </button>
            <p className="text-xs text-center text-muted-foreground">
              Settlement may be inaccurate if members add expenses later
            </p>
          </>
        )}
      </div>
    </div>
  );
}
