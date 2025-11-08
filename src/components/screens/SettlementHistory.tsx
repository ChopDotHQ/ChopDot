import { TopBar } from "../TopBar";
import { PrimaryButton } from "../PrimaryButton";
import { Download } from "lucide-react";
import { useMemo } from "react";
import { polkadotChainService } from "../../services/chain/polkadot";

interface Settlement {
  id: string;
  method: "cash" | "bank" | "paypal" | "twint" | "dot";
  personName: string;
  amount: number;
  currency: string;
  date: string;
  txHash?: string;
  potNames?: string[];
}

interface SettlementHistoryProps {
  settlements: Settlement[];
  onBack: () => void;
  personId?: string;
}

export function SettlementHistory({ settlements, onBack, personId }: SettlementHistoryProps) {
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

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title={personId ? `Settlements with ${personId}` : "Settlement History"} 
        onBack={onBack} 
      />
      <div className="flex-1 overflow-auto p-4 space-y-2">
        {filteredSettlements.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-label text-secondary">No settlements yet</p>
          </div>
        ) : (
          filteredSettlements.map((settlement) => (
            <div key={settlement.id} className="p-3 glass-sm rounded-xl space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-label text-foreground">{formatMethod(settlement.method)}</p>
                  <p className="text-caption text-secondary mt-0.5">
                    {formatDate(settlement.date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-body tabular-nums" style={{ fontWeight: 500 }}>
                    {settlement.currency === 'DOT' ? `${settlement.amount.toFixed(6)} DOT` : `$${settlement.amount.toFixed(2)}`}
                  </p>
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
                {settlement.txHash && (
                  <div className="flex justify-between text-caption text-secondary">
                    <span>Tx</span>
                    <a
                      className="text-micro underline font-mono text-secondary"
                      href={polkadotChainService.buildSubscanUrl(settlement.txHash)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {settlement.txHash.slice(0, 10)}...{settlement.txHash.slice(-8)}
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-4 border-t border-border">
        <PrimaryButton fullWidth>
          <Download className="w-4 h-4 inline mr-1" />
          Export CSV
        </PrimaryButton>
      </div>
    </div>
  );
}
