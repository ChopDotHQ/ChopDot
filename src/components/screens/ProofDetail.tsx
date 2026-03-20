import { ExternalLink, Share2, Copy } from "lucide-react";
import type { ProofDetailRecord } from "../../nav";
import { TopBar } from "../TopBar";
import { PrimaryButton } from "../PrimaryButton";
import { SecondaryButton } from "../SecondaryButton";
import { buildSubscanUrl } from "../../services/chain/utils";
import { getPvmCloseoutExplorerBaseUrl } from "../../services/closeout/pvmCloseout";

interface ProofDetailProps {
  record: ProofDetailRecord;
  onBack: () => void;
  onShareReceipt: () => void;
  onCopyReceipt: () => void;
}

const formatAmount = (record: ProofDetailRecord) => {
  if (record.currency === "DOT" || record.method === "dot") {
    return `${record.amount.toFixed(6)} DOT`;
  }
  if (record.currency === "USDC" || record.method === "usdc") {
    return `${record.amount.toFixed(6)} USDC`;
  }
  return `$${record.amount.toFixed(2)}`;
};

const truncate = (value?: string) => {
  if (!value) return "Pending";
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
};

export function ProofDetail({ record, onBack, onShareReceipt, onCopyReceipt }: ProofDetailProps) {
  const proofExplorerBaseUrl = getPvmCloseoutExplorerBaseUrl();
  const timeline = [
    {
      label: "Closeout anchored",
      detail: record.closeoutId ? `Closeout ${record.closeoutId} is linked onchain.` : "Closeout has not been linked yet.",
      done: Boolean(record.closeoutId),
    },
    {
      label: "Payment recorded",
      detail: record.txHash ? "The DOT settlement transaction completed." : "Waiting for the payment transaction.",
      done: Boolean(record.txHash),
    },
    {
      label: "Proof attached",
      detail: record.proofTxHash ? "The payment is attached to the closeout proof." : "Proof attachment is still pending.",
      done: Boolean(record.proofTxHash),
    },
  ];

  return (
    <div className="flex h-full flex-col bg-background">
      <TopBar title="Settlement Proof" onBack={onBack} />
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="card p-4 space-y-2">
          <p className="text-caption text-secondary">Recorded onchain</p>
          <h1 className="text-xl font-semibold">{formatAmount(record)} with {record.counterpartyName}</h1>
          <p className="text-caption text-secondary">
            {new Date(record.at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>

        <div className="card p-4 space-y-3">
          <p className="text-label font-medium">Closeout status</p>
          <div className="space-y-2 text-caption">
            <div className="flex justify-between gap-3">
              <span className="text-secondary">Closeout onchain</span>
              <span className="font-mono text-right">{record.closeoutId || "Not linked"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-secondary">Settlement proof</span>
              <span className="text-right">{record.proofStatus || "anchored"}</span>
            </div>
            {typeof record.closeoutLegIndex === "number" && (
              <div className="flex justify-between gap-3">
                <span className="text-secondary">Settlement leg</span>
                <span className="text-right">{record.closeoutLegIndex + 1}</span>
              </div>
            )}
            {record.potNames?.length ? (
              <div className="flex justify-between gap-3">
                <span className="text-secondary">Pots</span>
                <span className="text-right">{record.potNames.join(", ")}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="card p-4 space-y-3">
          <p className="text-label font-medium">Proof timeline</p>
          <div className="space-y-3">
            {timeline.map((step) => (
              <div key={step.label} className="flex items-start gap-3">
                <div className={`mt-0.5 h-3 w-3 rounded-full ${step.done ? "bg-[var(--success)]" : "bg-muted"}`} />
                <div>
                  <p className="text-caption font-medium">{step.label}</p>
                  <p className="text-caption text-secondary">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4 space-y-3">
          <p className="text-label font-medium">Proof links</p>
          <div className="space-y-3">
            {record.txHash && (
              <div className="rounded-2xl border border-border/40 bg-muted/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-caption text-secondary">Payment transaction</p>
                    <p className="font-mono text-label break-all">{truncate(record.txHash)}</p>
                  </div>
                  <a href={buildSubscanUrl(record.txHash)} target="_blank" rel="noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}

            {record.proofTxHash && (
              <div className="rounded-2xl border border-border/40 bg-muted/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-caption text-secondary">Proof transaction</p>
                    <p className="font-mono text-label break-all">{truncate(record.proofTxHash)}</p>
                  </div>
                  {proofExplorerBaseUrl ? (
                    <a href={`${proofExplorerBaseUrl}${record.proofTxHash}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : null}
                </div>
              </div>
            )}

            {record.proofContract && (
              <div className="rounded-2xl border border-border/40 bg-muted/10 p-3">
                <p className="text-caption text-secondary">Proof contract</p>
                <p className="font-mono text-label break-all">{record.proofContract}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-border bg-card p-4 pb-24 space-y-3">
        <PrimaryButton onClick={onShareReceipt}>
          <Share2 className="mr-2 inline h-4 w-4" />
          Share Closeout Receipt
        </PrimaryButton>
        <SecondaryButton onClick={onCopyReceipt}>
          <Copy className="mr-2 inline h-4 w-4" />
          Copy Receipt
        </SecondaryButton>
      </div>
    </div>
  );
}
