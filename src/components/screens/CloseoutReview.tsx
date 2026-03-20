import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import type { Pot } from "../../schema/pot";
import type { CloseoutRecord } from "../../types/app";
import {
  anchorCloseoutDraft,
  createCloseoutDraft,
  findLatestCloseout,
  getCloseoutReadiness,
  getPvmCloseoutRuntimeSummary,
  type CloseoutReadinessItem,
  getPvmCloseoutExplorerBaseUrl,
} from "../../services/closeout/pvmCloseout";
import { formatCurrencyAmount } from "../../utils/currencyFormat";
import { TopBar } from "../TopBar";
import { PrimaryButton } from "../PrimaryButton";
import { SecondaryButton } from "../SecondaryButton";
import { HackathonReadinessCard } from "../hackathon/HackathonReadinessCard";
import { useEvmAccount } from "../../contexts/EvmAccountContext";

interface CloseoutReviewProps {
  pot: Pot;
  currentUserId: string;
  onBack: () => void;
  onAnchored: (closeout: CloseoutRecord) => void;
  onContinueToSettlement: () => void;
  onShowToast?: (message: string, type?: "success" | "error" | "info") => void;
}

const truncateHash = (value?: string) => {
  if (!value) return "Pending";
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
  const proofWallet = useEvmAccount();
  const [draft, setDraft] = useState<CloseoutRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(true);
  const [isAnchoring, setIsAnchoring] = useState(false);
  const [readiness, setReadiness] = useState<CloseoutReadinessItem[]>([]);
  const draftRef = useRef<CloseoutRecord | null>(null);
  const explorerBaseUrl = getPvmCloseoutExplorerBaseUrl();
  const pvmRuntimeSummary = useMemo(() => getPvmCloseoutRuntimeSummary(), []);
  const blockingReadinessIssue = useMemo(
    () => readiness.find((item) => item.status === "fail"),
    [readiness],
  );
  const showHackathonReadiness = import.meta.env.VITE_HACKATHON_DEMO_MODE === "1";
  const memberRailStatus = useMemo(() => {
    return pot.members.map((member) => ({
      id: member.id,
      name: member.name,
      paymentReady: Boolean(member.address),
      proofReady: Boolean(member.evmAddress),
    }));
  }, [pot.members]);
  const hackathonItems = useMemo(() => {
    if (!showHackathonReadiness) return [];
    return [
      {
        id: "mode",
        label: "Execution mode",
        status: (pvmRuntimeSummary.closeoutSimulation ? "warn" : "pass") as "warn" | "pass",
        detail: pvmRuntimeSummary.closeoutSimulation
          ? "Closeout anchoring is simulated. Switch to live mode before the final demo."
          : `Anchoring to ${pvmRuntimeSummary.chainName} (${pvmRuntimeSummary.chainId}).`,
      },
      {
        id: "contract",
        label: "Registry contract",
        status: (pvmRuntimeSummary.usingFallbackContractAddress ? "warn" : "pass") as "warn" | "pass",
        detail: pvmRuntimeSummary.usingFallbackContractAddress
          ? "Fallback contract placeholder detected. Set the deployed registry address."
          : pvmRuntimeSummary.contractAddress,
      },
      {
        id: "proof-wallet",
        label: "Proof wallet",
        status: (proofWallet.address ? "pass" : proofWallet.isAvailable ? "warn" : "fail") as "pass" | "warn" | "fail",
        detail: proofWallet.address
          ? `${proofWallet.address.slice(0, 8)}...${proofWallet.address.slice(-6)} is ready for Polkadot Hub proof writes.`
          : proofWallet.isAvailable
            ? "A 0x wallet is available but not connected yet."
            : "No injected 0x wallet detected for proof writes.",
      },
      {
        id: "next-step",
        label: "Next judge action",
        status: "pass" as const,
        detail:
          draft?.status === "active"
            ? "Continue to settlement and complete one live payment proof."
            : "Anchor the closeout, then continue directly into settlement.",
      },
    ];
  }, [showHackathonReadiness, pvmRuntimeSummary, draft, proofWallet.address, proofWallet.isAvailable]);
  const closeoutStatusSummary = useMemo(() => {
    if (!draft) return null;
    const pending = draft.legs.filter((leg) => leg.status === "pending").length;
    const paid = draft.legs.filter((leg) => leg.status === "paid").length;
    const proven = draft.legs.filter((leg) => leg.status === "proven" || leg.status === "acknowledged").length;
    const nextAction =
      draft.status === "draft"
        ? "Anchor the closeout onchain."
        : proven >= draft.totalLegCount
          ? "Closeout complete."
          : paid > proven
            ? "Retry or finish proof recording for paid legs."
            : "Continue into settlement and complete the remaining payment legs.";

    return { pending, paid, proven, nextAction };
  }, [draft]);

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

        if (existingCloseout && existingCloseout.status !== "draft") {
          if (!cancelled) {
            setReadiness(readinessItems);
            setDraft(existingCloseout);
          }
          return;
        }

        // Preserve an already-anchored local draft while parent pot state catches up.
        if (draftRef.current && draftRef.current.status !== "draft") {
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
          setError(draftError instanceof Error ? draftError.message : "Unable to prepare closeout.");
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
      onShowToast?.("Closeout anchored. Settlement proof is ready.", "success");
    } catch (anchorError) {
      const message =
        anchorError instanceof Error ? anchorError.message : "Failed to anchor closeout.";
      setError(message);
      onShowToast?.(message, "error");
    } finally {
      setIsAnchoring(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <TopBar title="Closeout Review" onBack={onBack} />
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
            ChopDot keeps expense collaboration offchain. This step anchors the final settlement package, then each DOT payment can attach Polkadot Hub proof to the matching closeout leg.
          </p>
          <div className="rounded-2xl border border-border/40 bg-muted/10 p-3">
            <p className="text-label font-medium">How this works</p>
            <div className="mt-2 space-y-2 text-caption text-secondary">
              <p>1. Payment rail: send the settlement in DOT to the member&apos;s Polkadot wallet.</p>
              <p>2. Proof rail: record that payment against the Polkadot Hub closeout contract with a 0x wallet.</p>
              <p>The same person can use one wallet setup or two different wallet formats. ChopDot handles the mapping.</p>
            </div>
          </div>
        </div>

        {showHackathonReadiness && (
          <HackathonReadinessCard
            title="Demo readiness"
            subtitle="Use this before you start the closeout walkthrough."
            items={hackathonItems}
          />
        )}

        {showHackathonReadiness && !proofWallet.address && proofWallet.isAvailable && (
          <div className="card p-4 space-y-3">
            <div>
              <p className="text-label font-medium">Connect proof wallet</p>
              <p className="text-caption text-secondary mt-1">
                Connect your 0x wallet now so the anchor and proof steps do not pause the demo.
              </p>
            </div>
            <SecondaryButton onClick={() => void proofWallet.connect()}>
              Connect proof wallet
            </SecondaryButton>
          </div>
        )}

        {isPreparing && (
          <div className="card p-4 flex items-center gap-3 text-secondary">
            <Loader2 className="w-4 h-4 animate-spin" />
            Preparing the closeout package...
          </div>
        )}

        {error && !draft && (
          <div className="card p-4 text-sm" style={{ color: "var(--danger)" }}>
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
                {item.status === "pass" ? (
                  <CheckCircle2 className="w-4 h-4 mt-0.5" style={{ color: "var(--success)" }} />
                ) : (
                  <AlertTriangle
                    className="w-4 h-4 mt-0.5"
                    style={{ color: item.status === "warn" ? "var(--accent)" : "var(--danger)" }}
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

        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <p className="text-label font-medium">Member rail readiness</p>
          </div>
          <div className="space-y-2">
            {memberRailStatus.map((member) => (
              <div
                key={member.id}
                className="rounded-2xl border border-border/40 bg-muted/10 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-label font-medium">{member.name}</p>
                  <div className="flex gap-2 text-micro uppercase tracking-wide">
                    <span className={`rounded-full px-2 py-1 ${member.paymentReady ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-muted/40 text-secondary"}`}>
                      {member.paymentReady ? "payment ready" : "payment missing"}
                    </span>
                    <span className={`rounded-full px-2 py-1 ${member.proofReady ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-muted/40 text-secondary"}`}>
                      {member.proofReady ? "proof ready" : "proof missing"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {draft && (
          <>
            {closeoutStatusSummary && (
              <div className="card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <p className="text-label font-medium">Closeout status</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-border/40 bg-muted/10 p-3">
                    <p className="text-caption text-secondary">Pending legs</p>
                    <p className="text-lg font-semibold">{closeoutStatusSummary.pending}</p>
                  </div>
                  <div className="rounded-2xl border border-border/40 bg-muted/10 p-3">
                    <p className="text-caption text-secondary">Paid legs</p>
                    <p className="text-lg font-semibold">{closeoutStatusSummary.paid}</p>
                  </div>
                  <div className="rounded-2xl border border-border/40 bg-muted/10 p-3">
                    <p className="text-caption text-secondary">Proven legs</p>
                    <p className="text-lg font-semibold">{closeoutStatusSummary.proven}</p>
                  </div>
                </div>
                <p className="text-caption text-secondary">{closeoutStatusSummary.nextAction}</p>
              </div>
            )}
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
          <p className="text-sm" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
        {draft?.status === "active" ? (
          <PrimaryButton fullWidth onClick={onContinueToSettlement}>
            Continue to settlement
          </PrimaryButton>
        ) : (
          <PrimaryButton
            fullWidth
            onClick={handleAnchor}
            disabled={!draft || isAnchoring || isPreparing || Boolean(blockingReadinessIssue)}
          >
            {isAnchoring ? "Anchoring closeout..." : "Anchor closeout"}
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
