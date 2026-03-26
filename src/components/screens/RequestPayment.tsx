import { useEffect, useRef, useState } from "react";
import { Send, ArrowLeft, Check } from "lucide-react";
import { deliverText, type DeliveryMode } from "../../utils/delivery";
import {
  buildPaymentRequestText,
  formatRequestAmount,
  inferRequestCurrency,
  type RequestPaymentBreakdown,
} from "../../utils/requestPayment";

interface PersonBalance {
  id: string;
  name: string;
  totalAmount: number;
  breakdown: RequestPaymentBreakdown[];
  trustScore: number;
  paymentPreference: string;
}

interface RequestPaymentProps {
  people: PersonBalance[];
  onBack: () => void;
  onSendRequest: (
    personId: string,
    message: string,
    context: {
      deliveryMethod: DeliveryMethod;
      requestText: string;
    },
  ) => boolean | Promise<boolean> | void;
}

type DeliveryMethod = DeliveryMode | "in-app";

const personAmountLabel = (person: PersonBalance) => {
  const currency = inferRequestCurrency(person);
  if (currency === null && person.breakdown.length > 0) {
    return "Mixed";
  }
  return formatRequestAmount(person.totalAmount, currency);
};

export function RequestPayment({
  people,
  onBack,
  onSendRequest,
}: RequestPaymentProps) {
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedPerson = people.find(p => p.id === selectedPersonId);
  const selectedPersonCurrency = selectedPerson ? inferRequestCurrency(selectedPerson) : null;

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const handleSend = async () => {
    if (!selectedPersonId || isSending) return;
    const personToRequest = people.find((p) => p.id === selectedPersonId);
    if (!personToRequest) {
      setSendError("Please select a person to request payment from.");
      return;
    }

    setIsSending(true);
    setSendError(null);
    try {
      const requestText = buildPaymentRequestText(personToRequest, message);
      const deliveryMode = await deliverText({
        title: "ChopDot payment request",
        text: requestText,
      });
      const delivery: DeliveryMethod = deliveryMode === "none" ? "in-app" : deliveryMode;
      const result = await Promise.resolve(
        onSendRequest(selectedPersonId, message, {
          deliveryMethod: delivery,
          requestText,
        }),
      );
      if (result === false) {
        setSendError("Request could not be sent. Please try again.");
        return;
      }
      setDeliveryMethod(delivery);
      setSent(true);

      // Auto close after showing success
      closeTimerRef.current = setTimeout(() => {
        onBack();
      }, 1500);
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Request could not be sent. Please try again.";
      setSendError(message);
    } finally {
      setIsSending(false);
    }
  };

  if (sent && selectedPerson) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        {/* Success State */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <div 
              className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
              style={{ background: 'var(--success)' }}
            >
              <Check className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-section mb-2">Request sent!</h2>
              <p className="text-body text-secondary">
                {deliveryMethod === "share" && `${selectedPerson.name} received a share request`}
                {deliveryMethod === "clipboard" && "Request copied to clipboard for quick sharing"}
                {deliveryMethod === "in-app" && "Request saved in ChopDot for follow-up"}
                {!deliveryMethod && `${selectedPerson.name} will receive your payment request`}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 hover:bg-muted/50 rounded-lg transition-all duration-200 active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-screen-title flex-1">Request Payment</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {people.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-body text-secondary mb-2">Nobody owes you money yet</p>
            <p className="text-caption text-muted">
              Split some expenses first!
            </p>
          </div>
        ) : (
          <>
            {/* Instruction */}
            <div className="card p-4" style={{ background: 'var(--accent-pink-soft)' }}>
              <p className="text-label" style={{ color: 'var(--accent)' }}>
                Select who you want to request payment from
              </p>
            </div>

            {/* People List */}
            <div className="space-y-2">
              <h3 className="text-label text-secondary px-1 mb-2">
                People who owe you
              </h3>
              {people.map((person) => (
                <button
                  key={person.id}
                  onClick={() => setSelectedPersonId(person.id)}
                  className={`w-full card p-4 transition-all duration-200 active:scale-[0.98] ${
                    selectedPersonId === person.id
                      ? 'ring-2'
                      : ''
                  }`}
                  style={selectedPersonId === person.id ? {
                    background: 'var(--accent-pink-soft)'
                  } : undefined}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-body">{person.name}</p>
                        {selectedPersonId === person.id && (
                          <div 
                            className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: 'var(--accent)' }}
                          >
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-caption text-muted">
                          {person.breakdown.length} pot{person.breakdown.length !== 1 ? 's' : ''}
                        </p>
                        {inferRequestCurrency(person) === null && person.breakdown.length > 1 && (
                          <>
                            <span className="text-caption text-muted">•</span>
                            <p className="text-caption text-muted">Mixed currencies</p>
                          </>
                        )}
                        <span className="text-caption text-muted">•</span>
                        <p className="text-caption text-muted">{person.paymentPreference}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-section" style={{ color: 'var(--success)' }}>
                        {personAmountLabel(person)}
                      </p>
                    </div>
                  </div>

                  {/* Breakdown */}
                  {selectedPersonId === person.id && person.breakdown.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
                      {person.breakdown.map((pot, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <p className="text-caption text-secondary">{pot.potName}</p>
                          <p className="text-caption text-muted">
                            {formatRequestAmount(pot.amount, pot.currency)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Message (Optional) */}
            {selectedPersonId && (
              <div className="space-y-2 animate-slideDown">
                <label className="text-label text-secondary px-1 block">
                  Add a message (optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Hey! Can you settle up when you get a chance? Thanks!"
                  className="w-full px-4 py-3 input-field text-body placeholder:text-secondary focus:outline-none focus-ring-pink resize-none"
                  rows={3}
                  maxLength={200}
                />
                <p className="text-caption text-muted px-1">
                  {message.length}/200 characters
                </p>
                {sendError && (
                  <p className="text-caption px-1" style={{ color: "var(--destructive, #dc2626)" }}>
                    {sendError}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Send Button (Fixed Bottom) */}
      {selectedPersonId && selectedPerson && (
        <div className="p-4 border-t border-border bg-background">
          <button
            onClick={handleSend}
            disabled={isSending}
            className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
            style={{ 
              background: 'var(--accent)',
              color: '#fff',
              opacity: isSending ? 0.7 : 1,
            }}
          >
            <Send className="w-5 h-5" />
            <span className="text-body" style={{ fontWeight: 500 }}>
              {isSending
                ? "Sending request..."
                : selectedPersonCurrency === null && selectedPerson.breakdown.length > 0
                  ? `Request payment from ${selectedPerson.name}`
                  : `Request ${formatRequestAmount(selectedPerson.totalAmount, selectedPersonCurrency)} from ${selectedPerson.name}`}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
