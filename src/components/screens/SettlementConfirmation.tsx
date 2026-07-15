import { Check } from "lucide-react";
import { SettlementResult } from "../../nav";
import { PrimaryButton } from "../PrimaryButton";
import { SecondaryButton } from "../SecondaryButton";
import { TopBar } from "../TopBar";

interface SettlementConfirmationProps {
  result: SettlementResult;
  onBack?: () => void;
  onViewHistory: () => void;
  onDone: () => void;
}

export function SettlementConfirmation({
  result,
  onBack,
  onViewHistory,
  onDone,
}: SettlementConfirmationProps) {
  const isCollecting = result.direction === 'owed';
  const methodLabels: Record<SettlementResult["method"], string> = {
    cash: "Cash",
    bank: "Bank Transfer",
    paypal: "PayPal",
    twint: "TWINT",
  };

  const formatResultAmount = (amount = result.amount) => {
    const currency = result.currency ?? 'USD';
    if (currency === 'USD') return `$${amount.toFixed(2)}`;
    if (currency === 'DOT' || currency === 'PAS') return `${amount.toFixed(6)} ${currency}`;
    return `${currency} ${amount.toFixed(2)}`;
  };

  return (
    <div className="h-full bg-background flex flex-col overflow-hidden">
      <TopBar title="Payment confirmed" onBack={onBack} />
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center px-6 py-12">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-[0_20px_50px_rgba(30,196,128,0.24)]"
            style={{ background: 'var(--success)' }}
          >
            <Check className="w-8 h-8 text-white" strokeWidth={3} />
          </div>

          <div className="text-center mb-8">
            <h1 className="mb-1 text-screen-title" style={{ fontWeight: 600 }}>
              {isCollecting
                ? `Collected ${formatResultAmount()} from ${result.counterpartyName}`
                : `Paid ${formatResultAmount()} to ${result.counterpartyName}`}
            </h1>
            <p className="text-secondary text-caption">
              {new Date(result.at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>

          <div className="w-full max-w-sm rounded-2xl bg-white/[0.055] p-4 mb-6 transition-shadow duration-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-micro text-secondary">Payment method</span>
              <span className="text-label" style={{ fontWeight: 600 }}>{methodLabels[result.method]}</span>
            </div>

            {result.ref && (
              <div className="flex items-center justify-between mb-3">
                <span className="text-micro text-secondary">Reference</span>
                <span className="font-mono text-label">{result.ref}</span>
              </div>
            )}
          </div>

          {result.pots && result.pots.length > 0 && (
            <div className="w-full max-w-sm mb-6">
              <h3 className="mb-3 text-micro text-secondary">Pots affected</h3>
              <div className="space-y-2">
                {result.pots.map((pot) => (
                  <div
                    key={pot.id}
                    className="card rounded-xl p-3 flex items-center justify-between transition-shadow duration-200"
                  >
                    <span className="text-body">{pot.name}</span>
                    <span className="text-label tabular-nums" style={{ fontWeight: 600 }}>
                      {formatResultAmount(Number(pot.amount))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-card px-4 pb-24 pt-4">
          <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
            <SecondaryButton fullWidth onClick={onViewHistory}>View history</SecondaryButton>
          <PrimaryButton fullWidth variant="gradient" onClick={onDone}>Back to pot</PrimaryButton>
          </div>
        </div>
    </div>
  );
}
