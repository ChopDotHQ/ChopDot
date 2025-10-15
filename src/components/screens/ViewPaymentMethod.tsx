import { BottomSheet } from "../BottomSheet";
import { PaymentMethod } from "./PaymentMethods";
import { CreditCard, DollarSign, Smartphone, Wallet } from "lucide-react";

interface ViewPaymentMethodProps {
  method: PaymentMethod;
  onClose: () => void;
}

export function ViewPaymentMethod({ method, onClose }: ViewPaymentMethodProps) {
  const getMethodIcon = (kind: PaymentMethod["kind"]) => {
    switch (kind) {
      case "bank":
        return <CreditCard className="w-6 h-6" />;
      case "twint":
        return <Smartphone className="w-6 h-6" />;
      case "paypal":
        return <DollarSign className="w-6 h-6" />;
      case "crypto":
        return <Wallet className="w-6 h-6" />;
    }
  };

  const getMethodTitle = (kind: PaymentMethod["kind"]) => {
    switch (kind) {
      case "bank":
        return "Bank – IBAN";
      case "twint":
        return "TWINT";
      case "paypal":
        return "PayPal";
      case "crypto":
        return method.network === "polkadot" ? "Polkadot Wallet" : "Asset Hub Wallet";
    }
  };

  return (
    <BottomSheet onClose={onClose}>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3 pb-2">
          <div className="text-foreground">{getMethodIcon(method.kind)}</div>
          <h3 className="text-foreground">{getMethodTitle(method.kind)}</h3>
        </div>

        {method.kind === "bank" && (
          <>
            {method.holder && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Account holder</p>
                <p className="text-foreground">{method.holder}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground mb-1">IBAN</p>
              <p className="text-foreground font-mono text-sm break-all">
                {method.iban}
              </p>
            </div>
            {method.note && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Reference note</p>
                <p className="text-foreground">{method.note}</p>
              </div>
            )}
          </>
        )}

        {method.kind === "twint" && (
          <>
            {method.phone && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Phone number</p>
                <p className="text-foreground">{method.phone}</p>
              </div>
            )}
            {method.twintHandle && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">TWINT handle</p>
                <p className="text-foreground">{method.twintHandle}</p>
              </div>
            )}
          </>
        )}

        {method.kind === "paypal" && (
          <>
            {method.email && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Email</p>
                <p className="text-foreground">{method.email}</p>
              </div>
            )}
            {method.username && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Username</p>
                <p className="text-foreground">{method.username}</p>
              </div>
            )}
          </>
        )}

        {method.kind === "crypto" && (
          <>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Network</p>
              <p className="text-foreground">
                {method.network === "polkadot" ? "Polkadot" : "Asset Hub"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Address</p>
              <p className="text-foreground font-mono text-xs break-all">
                {method.address}
              </p>
            </div>
            {method.label && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Label</p>
                <p className="text-foreground">{method.label}</p>
              </div>
            )}
          </>
        )}

        <button
          onClick={onClose}
          className="w-full mt-4 py-3 text-center text-primary"
        >
          Close
        </button>
      </div>
    </BottomSheet>
  );
}
