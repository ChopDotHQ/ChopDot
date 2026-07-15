import { useState } from "react";
import { X, Wand2, Loader2 } from "lucide-react";
import { PrimaryButton } from "../PrimaryButton";
import { SecondaryButton } from "../SecondaryButton";
import { toast } from "sonner";
import { CreateExpenseDTO } from "../../services/data/types/dto";
import { getApiAuthHeaders } from "../../utils/apiAuthHeaders";

interface SmartScanModalProps {
    isOpen: boolean;
    potId: string;
    onDismiss: () => void;
    onParsed: (expenses: CreateExpenseDTO[]) => void;
}

export function SmartScanModal({
    isOpen,
    potId,
    onDismiss,
    onParsed,
}: SmartScanModalProps) {
    const [chatLog, setChatLog] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen) return null;

    const handleParse = async () => {
        if (!chatLog.trim()) {
            toast.error("Please paste a chat log or receipt text.");
            return;
        }

        setIsProcessing(true);
        try {
            // Assume API URL configuration (relative path works with Vite proxy if set, or we use full URL)
            // Using a standard fetch request to our new endpoint. 
            // In a real env, we'd use process.env.VITE_API_URL or similar, assuming relative path here.
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const authHeaders = await getApiAuthHeaders();
            const response = await fetch(`${apiUrl}/api/pots/${potId}/ai/parse-receipt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders,
                },
                body: JSON.stringify({ chatLog })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to parse receipt");
            }

            const data = await response.json();
            
            // Map the parsed data to CreateExpenseDTO
            const expenses: CreateExpenseDTO[] = data.map((item: any) => ({
                potId,
                amount: item.amount,
                currency: "USD",
                paidBy: item.paidBy,
                memo: item.memo || "Parsed Expense",
                split: item.split,
            }));

            toast.success("Parsed successfully!");
            onParsed(expenses);
            setChatLog("");
            onDismiss();
        } catch (err: any) {
            console.error("Parse error:", err);
            toast.error(err.message || "An error occurred while parsing.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 sm:px-4 animate-in fade-in duration-200">
            <div className="bg-background card p-5 w-full max-w-lg shadow-lg sm:rounded-2xl rounded-t-2xl sm:rounded-b-2xl h-[80vh] sm:h-auto flex flex-col">
                <div className="flex items-start justify-between mb-4 flex-shrink-0">
                    <div className="flex items-center gap-2 text-[var(--accent)]">
                        <Wand2 className="w-5 h-5" />
                        <h3 className="text-section" style={{ fontWeight: 600 }}>
                            Smart Scan
                        </h3>
                    </div>
                    <button
                        onClick={onDismiss}
                        disabled={isProcessing}
                        className="ml-3 p-1.5 -mt-1 -mr-1 hover:bg-muted/30 rounded-lg transition-colors flex-shrink-0"
                        aria-label="Dismiss"
                    >
                        <X className="w-4 h-4 text-secondary" />
                    </button>
                </div>

                <p className="text-body text-secondary mb-3 flex-shrink-0">
                    Paste a messy chat log (e.g. WhatsApp message) or a receipt string, and AI will automatically structure it into expenses and splits.
                </p>

                <textarea
                    value={chatLog}
                    onChange={(e) => setChatLog(e.target.value)}
                    disabled={isProcessing}
                    placeholder="e.g. 'I paid 200 for dinner. Alice owes 50, Bob owes 50...'"
                    className="flex-1 w-full bg-muted/20 border border-border/50 rounded-xl p-3 text-body resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all mb-4"
                />

                <div className="flex items-center justify-end gap-3 flex-shrink-0">
                    <SecondaryButton
                        onClick={onDismiss}
                        disabled={isProcessing}
                        className="!px-4 !py-2"
                    >
                        Cancel
                    </SecondaryButton>

                    <PrimaryButton
                        onClick={handleParse}
                        disabled={isProcessing}
                        className="!px-4 !py-2 flex items-center gap-2"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Parsing...
                            </>
                        ) : (
                            <>
                                <Wand2 className="w-4 h-4" />
                                Parse
                            </>
                        )}
                    </PrimaryButton>
                </div>
            </div>
        </div>
    );
}
