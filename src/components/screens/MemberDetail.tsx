import { TopBar } from "../TopBar";
import { PrimaryButton } from "../PrimaryButton";
import { SecondaryButton } from "../SecondaryButton";
import { TrustIndicator } from "../TrustIndicator";
import { User, ChevronRight } from "lucide-react";
import { useState } from "react";
import { BottomSheet } from "../BottomSheet";

interface SharedPot {
  id: string;
  name: string;
  yourBalance: number; // positive = they owe you, negative = you owe them
}

interface RecentSettlement {
  id: string;
  amount: number;
  method: string;
  date: string;
  direction: "sent" | "received";
}

interface MemberDetailProps {
  memberId: string;
  memberName: string;
  trustScore: number;
  sharedPots: SharedPot[];
  recentSettlements: RecentSettlement[];
  paymentPreference?: {
    kind: "bank" | "twint" | "paypal" | "crypto";
    maskedDetails: string; // e.g., "****1234"
  };
  totalBalance: number; // Net balance across all pots
  onBack: () => void;
  onSettle: () => void;
  onCopyPaymentDetails?: () => void;
}

export function MemberDetail({
  memberId: _memberId,
  memberName,
  trustScore,
  sharedPots,
  recentSettlements,
  paymentPreference,
  totalBalance,
  onBack,
  onSettle,
  onCopyPaymentDetails,
}: MemberDetailProps) {
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);

  const getPaymentKindLabel = (kind: string) => {
    switch (kind) {
      case "bank": return "Bank";
      case "twint": return "TWINT";
      case "paypal": return "PayPal";
      case "crypto": return "DOT Wallet";
      default: return kind;
    }
  };

  const getFullPaymentDetails = (kind: string, masked: string) => {
    switch (kind) {
      case "bank": return `IBAN: CH93 0076 2011 6238 ${masked}`;
      case "twint": return `Phone: +41 79 123 ${masked}`;
      case "paypal": return `Email: ${masked.replace("****", "alice")}`;
      case "crypto": return `Wallet: 1A1zP1eP5QGefi2DM${masked}`;
      default: return masked;
    }
  };

  return (
    <>
      <div className="flex flex-col h-full pb-[68px]">
        <TopBar title={memberName} onBack={onBack} />
        
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Profile Header */}
          <div className="card rounded-xl p-4 transition-shadow duration-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <User className="w-8 h-8 text-secondary" />
              </div>
              <div className="flex-1">
                <h2 className="text-section mb-1">{memberName}</h2>
                <TrustIndicator score={trustScore} showExplanation={true} />
              </div>
            </div>
            
            {/* Overall Balance */}
            <div className="pt-3 border-t border-border">
              <p className="text-micro text-secondary mb-1">Overall balance</p>
              <p className="text-[22px] tabular-nums" style={{ 
                fontWeight: 700,
                color: totalBalance > 0 ? 'var(--money)' : totalBalance < 0 ? 'var(--ink)' : 'var(--muted)'
              }}>
                {totalBalance > 0 ? `+$${totalBalance.toFixed(2)}` : totalBalance < 0 ? `-$${Math.abs(totalBalance).toFixed(2)}` : 'Settled'}
              </p>
            </div>
          </div>

          {/* Preferred Payment Method */}
          {paymentPreference && (
            <div className="space-y-2">
              <p className="text-micro text-secondary">Preferred payment method</p>
              <button
                onClick={() => setShowPaymentDetails(true)}
                className="w-full card rounded-xl p-3 text-left hover:shadow-[var(--shadow-fab)] transition-all duration-200 active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-[13px] text-secondary mb-1">
                      {getPaymentKindLabel(paymentPreference.kind)}
                    </p>
                    <p className="text-[14px]">{paymentPreference.maskedDetails}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-secondary" />
                </div>
              </button>
            </div>
          )}

          {/* Shared Pots */}
          {sharedPots.length > 0 && (
            <div className="space-y-2">
              <p className="text-micro text-secondary">Shared pots ({sharedPots.length})</p>
              <div className="space-y-2">
                {sharedPots.map((pot) => (
                  <div key={pot.id} className="card rounded-xl p-3 transition-shadow duration-200">
                    <div className="flex items-center justify-between">
                      <p className="text-label">{pot.name}</p>
                      <p className="text-[18px] tabular-nums" style={{
                        fontWeight: 700,
                        color: pot.yourBalance > 0 ? 'var(--money)' : pot.yourBalance < 0 ? 'var(--ink)' : 'var(--muted)'
                      }}>
                        {pot.yourBalance > 0 ? `+$${pot.yourBalance.toFixed(2)}` : pot.yourBalance < 0 ? `-$${Math.abs(pot.yourBalance).toFixed(2)}` : '—'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Settlements */}
          {recentSettlements.length > 0 && (
            <div className="space-y-2">
              <p className="text-micro text-secondary">Recent settlements</p>
              <div className="space-y-2">
                {recentSettlements.map((settlement) => (
                  <div key={settlement.id} className="card rounded-xl p-3 transition-shadow duration-200">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-label">
                        {settlement.direction === "sent" ? "You paid" : "They paid"}
                      </p>
                      <p className="text-[18px] tabular-nums" style={{ fontWeight: 700 }}>${settlement.amount.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-micro text-secondary">{settlement.method}</p>
                      <p className="text-micro text-secondary">{settlement.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty States */}
          {sharedPots.length === 0 && (
            <div className="pt-8 text-center">
              <p className="text-micro text-secondary">No shared pots yet</p>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        {totalBalance !== 0 && (
          <div className="p-4 border-t border-border">
            <PrimaryButton onClick={onSettle} fullWidth>
              Settle up
            </PrimaryButton>
          </div>
        )}
      </div>

      {/* Payment Details Bottom Sheet */}
      {paymentPreference && (
        <BottomSheet
          isOpen={showPaymentDetails}
          onClose={() => setShowPaymentDetails(false)}
          title="Payment details"
        >
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <p className="text-micro text-secondary">Payment method</p>
              <p className="text-label">{getPaymentKindLabel(paymentPreference.kind)}</p>
            </div>
            
            <div className="space-y-2">
              <p className="text-micro text-secondary">Details</p>
              <div className="p-3 bg-muted rounded-xl">
                <p className="text-body font-mono">
                  {getFullPaymentDetails(paymentPreference.kind, paymentPreference.maskedDetails)}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <SecondaryButton 
                onClick={() => {
                  navigator.clipboard.writeText(
                    getFullPaymentDetails(paymentPreference.kind, paymentPreference.maskedDetails)
                  );
                  setShowPaymentDetails(false);
                  onCopyPaymentDetails?.();
                }} 
                fullWidth
              >
                Copy details
              </SecondaryButton>
              <SecondaryButton onClick={() => setShowPaymentDetails(false)} fullWidth>
                Close
              </SecondaryButton>
            </div>
          </div>
        </BottomSheet>
      )}
    </>
  );
}