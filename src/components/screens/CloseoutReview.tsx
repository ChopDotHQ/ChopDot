import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import type { Pot } from '../../schema/pot';
import type { CloseoutRecord } from '../../types/app';
import {
  anchorCloseoutDraft,
  createCloseoutDraft,
  findLatestCloseout,
  getCloseoutReadiness,
  getPvmCloseoutExplorerBaseUrl,
  type CloseoutReadinessItem,
} from '../../services/closeout/pvmCloseout';
import { formatCurrencyAmount } from '../../utils/currencyFormat';
import { TopBar } from '../TopBar';
import { PrimaryButton } from '../PrimaryButton';
import { SecondaryButton } from '../SecondaryButton';

interface CloseoutReviewProps {
  pot: Pot;
  currentUserId: string;
  onBack: () => void;
  onAnchored: (closeout: CloseoutRecord) => void;
  onContinueToSettlement: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const truncateHash = (value?: string) => {
  if (!value) return 'Pending';
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
};

export function CloseoutReview({
  pot,
  currentUserId,
  onBack,
  onAnchored,
  onContinueToSettlement,
  onShowToast,
}: CloseoutReviewProps) {
  const [draft, setDraft] = useState<CloseoutRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(true);
  const [isAnchoring, setIsAnchoring] = useState(false);
  const [readiness, setReadiness] = useState<CloseoutReadinessItem[]>([]);
  const draftRef = useRef<CloseoutRecord | null>(null);
  const explorerBaseUrl = getPvmCloseoutExplorerBaseUrl();
  const blockingReadinessIssue = useMemo(
    () => readiness.find((item) => item.status === 'fail'),
    [readiness],
  );

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    let cancelled = false;

    const prepare = async () => {
      setIsPreparing(true);
      setError(null);

      try {
        const readinessItems = await getCloseoutReadiness(pot);
        const existingCloseout = findLatestCloseout(pot);

        if (existingCloseout && existingCloseout.status !== 'draft') {
          if (!cancelled) {
            setReadiness(readinessItems);
            setDraft(existingCloseout);
          }
          return;
        }

        if (draftRef.current && draftRef.current.status !== 'draft') {
          if (!cancelled) {
            setReadiness(readinessItems);
          }
          return;
        }

        const nextDraft = await createCloseoutDraft({
          pot,
          createdByMemberId: currentUserId,
        });
        if (!cancelled) {
          setReadiness(readinessItems);
          setDraft(nextDraft);
        }
      } catch (draftError) {
        if (!cancelled) {
          setReadiness(await getCloseoutReadiness(pot));
          setError(draftError instanceof Error ? draftError.message : 'Unable to prepare closeout.');
        }
      } finally {
        if (!cancelled) {
          setIsPreparing(false);
        }
      }
    };

    void prepare();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, pot]);

  const handleAnchor = async () => {
    if (!draft || isAnchoring) return;

    setIsAnchoring(true);
    try {
      const anchored = await anchorCloseoutDraft(draft);
      const nextCloseout: CloseoutRecord = {
        ...draft,
        ...anchored,
      };
      setDraft(nextCloseout);
      onAnchored(nextCloseout);
      onShowToast?.('Closeout anchored. Settlement proof is ready.', 'success');
    } catch (anchorError) {
      const message =
        anchorError instanceof Error ? anchorError.message : 'Failed to anchor closeout.';
      setError(message);
      onShowToast?.(message, 'error');
    } finally {
      setIsAnchoring(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <TopBar title="Finalize Pot Onchain" onBack={onBack} />
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="card p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-caption text-secondary">Pot</p>
              <h1 className="text-xl font-semibold">{pot.name}</h1>
            </div>
            <div className="rounded-full px-3 py-1 text-micro font-medium bg-muted/20">
              {pot.baseCurrency}
            </div>
          </div>
          <p className="text-caption text-secondary">
            Use this when the group is done adding expenses and ready to finalize the pot. ChopDot keeps collaboration offchain, then anchors the final settlement package here so payment proof can be attached to each leg.
          </p>
        </div>

        {isPreparing && (
          <div className="card p-4 flex items-center gap-3 text-secondary">
            <Loader2 className="w-4 h-4 animate-spin" />
            Preparing the closeout package...
          </div>
        )}

        {error && !draft && (
          <div className="card p-4 text-sm" style={{ color: 'var(--danger)' }}>
            {error}
          </div>
        )}

        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <p className="text-label font-medium">Preflight checklist</p>
          </div>
          <div className="space-y-2">
            {readiness.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-border/40 bg-muted/10 p-3 flex items-start gap-3"
              >
                {item.status === 'pass' ? (
                  <CheckCircle2 className="w-4 h-4 mt-0.5" style={{ color: 'var(--success)' }} />
                ) : (
                  <AlertTriangle
                    className="w-4 h-4 mt-0.5"
                    style={{ color: item.status === 'warn' ? 'var(--accent)' : 'var(--danger)' }}
                  />
                )}
                <div className="min-w-0">
                  <p className="text-label font-medium">{item.label}</p>
                  <p className="text-caption text-secondary break-words">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {draft && (
          <>
            <div className="card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <p className="text-label font-medium">Snapshot</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/40 bg-muted/10 p-3">
                  <p className="text-caption text-secondary mb-1">Snapshot hash</p>
                  <p className="font-mono text-label break-all">{truncateHash(draft.snapshotHash)}</p>
                </div>
                <div className="rounded-2xl border border-border/40 bg-muted/10 p-3">
                  <p className="text-caption text-secondary mb-1">Participants</p>
                  <p className="text-label">{draft.participantMemberIds.length} members</p>
                </div>
              </div>
              {draft.contractTxHash && (
                <div className="rounded-2xl border border-border/40 bg-muted/10 p-3">
                  <p className="text-caption text-secondary mb-1">Anchored tx</p>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-label break-all">{truncateHash(draft.contractTxHash)}</p>
                    {draft.contractTxHash && explorerBaseUrl && (
                      <a
                        href={`${explorerBaseUrl}${draft.contractTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-secondary hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="card p-4 space-y-3">
              <p className="text-label font-medium">Settlement legs</p>
              <div className="space-y-2">
                {draft.legs.map((leg) => {
                  const fromMember = pot.members.find((member) => member.id === leg.fromMemberId);
                  const toMember = pot.members.find((member) => member.id === leg.toMemberId);
                  return (
                    <div
                      key={leg.index}
                      className="rounded-2xl border border-border/40 bg-muted/10 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-label truncate font-medium">{fromMember?.name || leg.fromMemberId}</span>
                          <ArrowRight className="w-3 h-3 text-secondary flex-shrink-0" />
                          <span className="text-label truncate font-medium">{toMember?.name || leg.toMemberId}</span>
                        </div>
                        <span className="text-label font-semibold">
                          {formatCurrencyAmount(Number(leg.amount), leg.asset)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-micro text-secondary sm:grid-cols-2">
                        <p className="font-mono break-all">From: {leg.fromAddress}</p>
                        <p className="font-mono break-all">To: {leg.toAddress}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="border-t border-border bg-card p-4 pb-24 space-y-3">
        {error && draft && (
          <p className="text-sm" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}
        {draft?.status === 'active' ? (
          <PrimaryButton fullWidth onClick={onContinueToSettlement}>
            Continue to settlement
          </PrimaryButton>
        ) : (
          <PrimaryButton
            fullWidth
            onClick={handleAnchor}
            disabled={!draft || isAnchoring || isPreparing || Boolean(blockingReadinessIssue)}
          >
            {isAnchoring ? 'Anchoring final settlement...' : 'Finalize pot onchain'}
          </PrimaryButton>
        )}
        {blockingReadinessIssue && (
          <p className="text-micro text-secondary">
            Resolve the failing checklist item before anchoring onchain.
          </p>
        )}
        <SecondaryButton onClick={onBack}>Cancel</SecondaryButton>
      </div>
    </div>
  );
}
