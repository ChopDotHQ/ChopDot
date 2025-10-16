import { TopBar } from "../TopBar";
import { CreditCard, DollarSign, Smartphone, Wallet, Check } from "lucide-react";

export interface PaymentMethod {
  id: string;
  kind: "bank" | "twint" | "paypal" | "crypto";
  // Bank
  iban?: string;
  holder?: string;
  note?: string;
  // TWINT
  phone?: string;
  twintHandle?: string;
  // PayPal
  email?: string;
  username?: string;
  // Crypto
  network?: "polkadot" | "assethub";
  address?: string;
  label?: string;
}

interface PaymentMethodsProps {
  methods: PaymentMethod[];
  preferredMethodId?: string;
  onBack: () => void;
  onUpdateMethod: (kind: PaymentMethod["kind"], value: string) => void;
  onSetPreferred: (methodId: string | null) => void;
}

type PaymentMethodKind = "bank" | "twint" | "paypal" | "crypto";

export function PaymentMethods({
  methods,
  preferredMethodId,
  onBack,
  onUpdateMethod,
  onSetPreferred,
}: PaymentMethodsProps) {
  const methodOptions: Array<{
    kind: PaymentMethodKind;
    icon: React.ReactNode;
    title: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
  }> = [
    {
      kind: "bank",
      icon: <CreditCard className="w-5 h-5 text-muted-foreground" />,
      title: "Bank – IBAN",
      placeholder: "CH93 0000 0000 0000 0000 0",
      value: methods.find(m => m.kind === "bank")?.iban || "",
      onChange: (value) => onUpdateMethod("bank", value),
    },
    {
      kind: "twint",
      icon: <Smartphone className="w-5 h-5 text-muted-foreground" />,
      title: "TWINT",
      placeholder: "+41 79 123 45 67",
      value: methods.find(m => m.kind === "twint")?.phone || "",
      onChange: (value) => onUpdateMethod("twint", value),
    },
    {
      kind: "paypal",
      icon: <DollarSign className="w-5 h-5 text-muted-foreground" />,
      title: "PayPal",
      placeholder: "your@email.com",
      value: methods.find(m => m.kind === "paypal")?.email || "",
      onChange: (value) => onUpdateMethod("paypal", value),
    },
    {
      kind: "crypto",
      icon: <Wallet className="w-5 h-5 text-muted-foreground" />,
      title: "DOT Wallet",
      placeholder: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      value: methods.find(m => m.kind === "crypto")?.address || "",
      onChange: (value) => onUpdateMethod("crypto", value),
    },
  ];

  //

  // Find the existing method ID for each kind to determine if it's preferred
  const getMethodId = (kind: PaymentMethodKind) => {
    return methods.find(m => m.kind === kind)?.id;
  };

  const handleSetPreferred = (kind: PaymentMethodKind) => {
    const methodId = getMethodId(kind);
    if (methodId) {
      onSetPreferred(methodId);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <TopBar title="Payment methods" onBack={onBack} />

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {methodOptions.map((option) => {
          const methodId = getMethodId(option.kind);
          const isPreferred = methodId === preferredMethodId;
          const value = option.value;
          const hasValue = value.length > 0;

          return (
            <div key={option.kind} className="glass-sm rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                {option.icon}
                <h4 className="text-section flex-1">{option.title}</h4>
                {hasValue && (
                  <button
                    onClick={() => handleSetPreferred(option.kind)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-micro transition-all duration-200 active:scale-95 ${
                      isPreferred
                        ? "bg-foreground text-background"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {isPreferred && <Check className="w-3 h-3" />}
                    {isPreferred ? "Preferred" : "Set preferred"}
                  </button>
                )}
              </div>
              <input
                type="text"
                value={option.value}
                onChange={(e) => option.onChange(e.target.value)}
                placeholder={option.placeholder}
                className="w-full px-3 py-2.5 bg-input-background border border-border/30 rounded-[var(--r-lg)] text-body placeholder:text-muted-foreground focus:outline-none focus-ring-pink transition-all"
              />
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-border/30">
        <p className="text-caption text-muted-foreground text-center">
          Your saved details are shown only to people in your pots when settling with you.
        </p>
      </div>
    </div>
  );
}