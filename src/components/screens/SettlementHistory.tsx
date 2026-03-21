import { TopBar } from "../TopBar";
import { PrimaryButton } from "../PrimaryButton";
import { Download, CheckCircle } from "lucide-react";
import { useMemo } from "react";
import { buildSubscanUrl } from "../../services/chain/utils";
import { getPvmCloseoutExplorerBaseUrl } from "../../services/closeout/pvmCloseout";
import { EmptyState } from "../EmptyState";
import { exportSettlementHistoryToCSV } from "../../utils/export";

interface Settlement {
  id: string;
  method: "cash" | "bank" | "paypal" | "twint" | "dot" | "usdc";
  personName: string;
  amount: number;
  currency: string;
  date: string;
  txHash?: string;
  potNames?: string[];
  closeoutId?: string;
  proofTxHash?: string;
  proofStatus?: "anchored" | "recorded" | "completed";
  personId?: string;
}

interface SettlementHistoryProps {
  settlements: Settlement[];
  onBack: () => void;
  personId?: string;
  onRetryProof?: (settlementId: string) => void;
}

export function SettlementHistory({ settlements, onBack, personId, onRetryProof }: SettlementHistoryProps) {
  const proofExplorerBaseUrl = getPvmCloseoutExplorerBaseUrl();

  // Filter settlements by personId if provided
  const filteredSettlements = useMemo(() => {
    if (!personId) return settlements;
    // Prefer matching by stored personId if present; fallback to name match for legacy entries
    return settlements.filter((s: any) => {
      const hasId = typeof s.personId === 'string' && s.personId.length > 0;
      const matchById = hasId ? s.personId === personId : false;
      const matchByName = s.personName && s.personName.toLowerCase() === personId.toLowerCase();
      return matchById || matchByName;
    });
  }, [settlements, personId]);

  // Format method name for display
  const formatMethod = (method: string): string => {
    const methodLabels: Record<string, string> = {
      cash: "Cash",
      bank: "Bank",
      paypal: "PayPal",
      twint: "TWINT",
      dot: "DOT",
      usdc: "USDC",
    };
    return methodLabels[method] || method;
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getTrackedStatus = (settlement: Settlement): string | null => {
    if (!settlement.closeoutId) return null;
    if (settlement.proofStatus === 'completed') return 'Payment confirmed';
    if (settlement.proofStatus === 'recorded') return 'Payment sent';
    return 'Smart settlement started';
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title={personId ? `Settlements with ${personId}` : "Settlement History"} 
        onBack={onBack} 
      />
      <div className="flex-1 overflow-auto p-4 space-y-2">
        {filteredSettlements.length === 0 ? (
          <div className="pt-8">
            <EmptyState
              icon={CheckCircle}
              message="No settlements yet"
              description="Your settlement history will appear here"
            />
          </div>
        ) : (
          filteredSettlements.map((settlement) => (
            <div key={settlement.id} className="p-4 card rounded-xl space-y-2 card-hover-lift transition-shadow duration-200 hover:shadow-[var(--shadow-fab)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-label" style={{ fontWeight: 600 }}>{formatMethod(settlement.method)}</p>
                  <p className="text-micro text-secondary mt-0.5">
                    {formatDate(settlement.date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[18px] tabular-nums" style={{ fontWeight: 700 }}>
                    {settlement.currency === 'DOT'
                      ? `${settlement.amount.toFixed(6)} DOT`
                      : settlement.currency === 'USDC'
                        ? `${settlement.amount.toFixed(6)} USDC`
                        : `$${settlement.amount.toFixed(2)}`}
                  </p>
                  {getTrackedStatus(settlement) && (
                    <p className="text-micro text-secondary mt-0.5">{getTrackedStatus(settlement)}</p>
                  )}
                </div>
              </div>
              <div className="pt-2 border-t border-border space-y-0.5">
                <div className="flex justify-between text-caption text-secondary">
                  <span>Person</span>
                  <span>{settlement.personName}</span>
                </div>
                {settlement.potNames && settlement.potNames.length > 0 && (
                  <div className="flex justify-between text-caption text-secondary">
                    <span>Pots</span>
                    <span className="text-right">{settlement.potNames.join(", ")}</span>
                  </div>
                )}
                {(settlement.txHash || settlement.closeoutId || settlement.proofTxHash) && (
                  <details className="pt-2">
                    <summary className="cursor-pointer text-caption text-secondary">Technical details</summary>
                    <div className="mt-2 space-y-1.5">
                      {settlement.txHash && (
                        <div className="flex justify-between text-caption text-secondary">
                          <span>Payment tx (Asset Hub)</span>
                          <a
                            className="text-micro underline font-mono text-secondary"
                            href={buildSubscanUrl(settlement.txHash)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {settlement.txHash.slice(0, 10)}...{settlement.txHash.slice(-8)}
                          </a>
                        </div>
                      )}
                      {settlement.closeoutId && (
                        <div className="flex justify-between text-caption text-secondary">
                          <span>Settlement package</span>
                          <span className="font-mono text-right">{settlement.closeoutId}</span>
                        </div>
                      )}
                      {settlement.closeoutId && (
                        <div className="flex justify-between text-caption text-secondary">
                          <span>Proof status</span>
                          <span className="text-right">{settlement.proofStatus || "anchored"}</span>
                        </div>
                      )}
                      {settlement.proofTxHash && (
                        <div className="flex justify-between text-caption text-secondary">
                          <span>Proof tx (Polkadot Hub)</span>
                          <a
                            className="text-micro underline font-mono text-secondary"
                            href={`${proofExplorerBaseUrl}${settlement.proofTxHash}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {settlement.proofTxHash.slice(0, 10)}...{settlement.proofTxHash.slice(-8)}
                          </a>
                        </div>
                      )}
                    </div>
                  </details>
                )}
                {settlement.closeoutId && !settlement.proofTxHash && onRetryProof && (
                  <div className="pt-2">
                    <button
                      onClick={() => onRetryProof(settlement.id)}
                      className="text-caption underline text-secondary hover:text-foreground transition-colors"
                    >
                      Retry proof recording
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-4 border-t border-border">
        <PrimaryButton
          fullWidth
          onClick={() => exportSettlementHistoryToCSV(filteredSettlements)}
        >
          <Download className="w-4 h-4 inline mr-1" />
          Export CSV
        </PrimaryButton>
      </div>
    </div>
  );
}
