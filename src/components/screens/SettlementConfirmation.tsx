import { Check } from "lucide-react";
import { SettlementResult } from "../../nav";
import { PrimaryButton } from "../PrimaryButton";
import { SecondaryButton } from "../SecondaryButton";

interface SettlementConfirmationProps {
  result: SettlementResult;
  onViewHistory: () => void;
  onDone: () => void;
}

export function SettlementConfirmation({
  result,
  onViewHistory,
  onDone,
}: SettlementConfirmationProps) {
  const methodLabels: Record<SettlementResult["method"], string> = {
    cash: "Cash",
    bank: "Bank Transfer",
    paypal: "PayPal",
    twint: "TWINT",
    dot: "DOT Wallet",
  };

  return (
    <div className="h-full bg-background flex flex-col overflow-hidden">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center px-6 py-12">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-6">
            <Check className="w-8 h-8 text-primary-foreground" strokeWidth={3} />
          </div>

          <div className="text-center mb-8">
            <h1 className="mb-1 text-screen-title" style={{ fontWeight: 600 }}>
              Settled {typeof result.amount === 'number' ? `$${result.amount.toFixed(2)}` : String(result.amount)} with {result.counterpartyName}
            </h1>
            <p className="text-muted-foreground text-caption">
              {new Date(result.at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>

          {/* Method & Reference */}
          <div className="w-full max-w-sm glass-sm rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-muted-foreground">Payment method</span>
              <span>{methodLabels[result.method]}</span>
            </div>

            {result.ref && (
              <div className="flex items-center justify-between mb-3">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-mono text-sm">{result.ref}</span>
              </div>
            )}

            {result.txHash && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Transaction</span>
                <a
                  className="font-mono text-sm truncate max-w-[180px] underline"
                  href={`https://assethub-polkadot.subscan.io/extrinsic/${result.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {result.txHash}
                </a>
              </div>
            )}
          </div>

          {/* Pots Affected */}
          {result.pots && result.pots.length > 0 && (
            <div className="w-full max-w-sm mb-6">
              <h3 className="mb-3 text-muted-foreground">Pots affected</h3>
              <div className="space-y-2">
                {result.pots.map((pot) => (
                  <div
                    key={pot.id}
                    className="glass-sm rounded-xl p-3 flex items-center justify-between"
                  >
                    <span>{pot.name}</span>
                    <span className="text-muted-foreground">${pot.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons - Fixed at bottom with safe area */}
      <div className="p-4 pb-24 space-y-3 border-t border-border bg-card">
        <SecondaryButton onClick={onViewHistory}>View history</SecondaryButton>
        <PrimaryButton onClick={onDone}>Done</PrimaryButton>
      </div>
    </div>
  );
}