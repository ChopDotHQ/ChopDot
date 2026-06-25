import { TopBar } from "../TopBar";
import { useState } from "react";
import { AlertCircle } from "lucide-react";

interface WithdrawFundsProps {
  potName: string;
  baseCurrency: string;
  yourBalance: number;
  totalPooled: number;
  yieldRate: number;
  defiProtocol: string;
  onBack: () => void;
  onConfirm: (amount: number) => void;
}

export function WithdrawFunds({
  potName,
  baseCurrency,
  yourBalance,
  totalPooled: _totalPooled,
  yieldRate: _yieldRate,
  defiProtocol: _defiProtocol,
  onBack,
  onConfirm,
}: WithdrawFundsProps) {
  const [amount, setAmount] = useState("");
  const [withdrawAll, setWithdrawAll] = useState(false);

  const numAmount = withdrawAll ? yourBalance : (parseFloat(amount) || 0);
  const remainingBalance = yourBalance - numAmount;

  const isValid = numAmount > 0 && numAmount <= yourBalance;

  return (
    <div className="flex flex-col h-full bg-background">
      <TopBar title="Record Withdrawal" onBack={onBack} />

      <div className="flex-1 overflow-auto p-3 space-y-3 pb-[68px]">
        {/* Balance Card */}
        <div className="hero-card p-4 space-y-3">
          <div>
            <p className="text-micro text-secondary mb-1">Recorded balance in {potName}</p>
            <p className="text-[32px] tabular-nums" style={{ fontWeight: 600 }}>
              {baseCurrency} {yourBalance.toFixed(2)}
            </p>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/10">
            <div>
              <p className="text-micro text-secondary">ChopDot role</p>
              <p className="text-[18px]" style={{ fontWeight: 700, color: 'var(--success)' }}>
                Record only
              </p>
            </div>
            <div className="text-right">
              <p className="text-micro text-secondary">Money movement</p>
              <p className="text-[18px]" style={{ fontWeight: 700 }}>
                Outside app
              </p>
            </div>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <label className="text-micro text-secondary px-1">Amount to record</label>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              value={withdrawAll ? yourBalance.toFixed(2) : amount}
              onChange={(e) => {
                setWithdrawAll(false);
                setAmount(e.target.value);
              }}
              placeholder="0.00"
              disabled={withdrawAll}
              className="w-full px-4 py-4 bg-card border border-border rounded-xl focus:outline-none focus-ring-pink text-[28px] tabular-nums pr-20 disabled:opacity-50"
              style={{ fontWeight: 600 }}
              autoFocus={!withdrawAll}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[28px] text-secondary tabular-nums" style={{ fontWeight: 600 }}>
              {baseCurrency}
            </div>
          </div>

          {/* Quick amounts */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setWithdrawAll(false);
                setAmount((yourBalance * 0.25).toFixed(2));
              }}
              className="flex-1 px-3 py-2 bg-card border border-border rounded-lg text-micro hover:bg-muted/10 transition-colors active:scale-[0.98]"
            >
              25%
            </button>
            <button
              onClick={() => {
                setWithdrawAll(false);
                setAmount((yourBalance * 0.5).toFixed(2));
              }}
              className="flex-1 px-3 py-2 bg-card border border-border rounded-lg text-micro hover:bg-muted/10 transition-colors active:scale-[0.98]"
            >
              50%
            </button>
            <button
              onClick={() => {
                setWithdrawAll(false);
                setAmount((yourBalance * 0.75).toFixed(2));
              }}
              className="flex-1 px-3 py-2 bg-card border border-border rounded-lg text-micro hover:bg-muted/10 transition-colors active:scale-[0.98]"
            >
              75%
            </button>
            <button
              onClick={() => setWithdrawAll(true)}
              className="flex-1 px-3 py-2 bg-card border border-border rounded-lg text-micro hover:bg-muted/10 transition-colors active:scale-[0.98]"
            >
              Max
            </button>
          </div>
        </div>

        {/* Withdrawal Impact */}
        {numAmount > 0 && (
          <div className="space-y-2">
            <div className="p-3 rounded-lg bg-card border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-micro text-secondary">Remaining balance</p>
                <p className="text-[18px] tabular-nums" style={{ fontWeight: 700 }}>
                  {baseCurrency} {remainingBalance.toFixed(2)}
                </p>
              </div>
              <p className="text-micro text-secondary">
                Record this only after the withdrawal or transfer happened outside ChopDot.
              </p>
            </div>

            {withdrawAll && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/10 border border-border">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--foreground)' }} />
                <div>
                  <p className="text-micro" style={{ fontWeight: 500 }}>Full withdrawal</p>
                  <p className="text-micro text-secondary">
                    This will record the balance as fully withdrawn. It does not move money by itself.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Withdrawal Details */}
        <div className="space-y-2">
          <label className="text-micro text-secondary px-1">Withdrawal details</label>
          <div className="p-3 bg-card border border-border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-micro text-secondary">When to record</p>
              <p className="text-micro" style={{ fontWeight: 500 }}>After external transfer</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-micro text-secondary">ChopDot fee</p>
              <p className="text-micro" style={{ fontWeight: 500 }}>None in this record</p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <p className="text-micro" style={{ fontWeight: 500 }}>Recorded withdrawal</p>
              <p className="text-[18px] tabular-nums" style={{ fontWeight: 700 }}>
                {baseCurrency} {numAmount.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Info Note */}
        <div className="p-3 bg-muted/10 rounded-lg">
          <p className="text-micro text-secondary">
            ChopDot records that money moved outside the app. It does not custody funds, send withdrawals, or guarantee settlement.
          </p>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="p-3 border-t border-border bg-background">
        <button
          onClick={() => {
            if (isValid) {
              onConfirm(numAmount);
            }
          }}
          disabled={!isValid}
          className="w-full py-3 bg-card border-2 rounded-xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ 
            borderColor: isValid ? 'var(--success)' : 'var(--border)',
            fontWeight: 600,
          }}
        >
          {isValid ? `Record ${baseCurrency} ${numAmount.toFixed(2)}` : 'Enter amount'}
        </button>
      </div>
    </div>
  );
}
