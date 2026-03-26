import { X } from "lucide-react";
import { PrimaryButton } from "../PrimaryButton";
import { SecondaryButton } from "../SecondaryButton";

interface AcceptInviteModalProps {
    isOpen: boolean;
    isProcessing: boolean;
    onAccept: () => void;
    onDecline: () => void;
    onDismiss: () => void;
    potName?: string;
    inviteeEmail?: string;
}

export function AcceptInviteModal({
    isOpen,
    isProcessing,
    onAccept,
    onDecline,
    onDismiss,
    potName,
    inviteeEmail,
}: AcceptInviteModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-4 animate-in fade-in duration-200">
            <div className="bg-background card p-5 w-full max-w-sm shadow-lg rounded-2xl">
                {/* Header with dismiss */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-section" style={{ fontWeight: 600 }}>
                            Pot invite
                        </h3>
                        {potName && (
                            <p className="text-body mt-0.5 truncate" style={{ color: 'var(--accent)', fontWeight: 500 }}>
                                {potName}
                            </p>
                        )}
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

                <p className="text-body text-secondary mb-5">
                    {potName
                        ? `You've been invited to join "${potName}".`
                        : "You've been invited to join a pot."}
                    {inviteeEmail && (
                        <span className="block text-caption mt-1 text-secondary">
                            Sent to {inviteeEmail}
                        </span>
                    )}
                </p>

                <div className="flex items-center justify-end gap-3">
                    <SecondaryButton
                        onClick={onDecline}
                        disabled={isProcessing}
                        className="!px-4 !py-2"
                    >
                        Decline
                    </SecondaryButton>

                    <PrimaryButton
                        onClick={onAccept}
                        disabled={isProcessing}
                        className="!px-4 !py-2"
                    >
                        {isProcessing ? "Joining…" : "Accept"}
                    </PrimaryButton>
                </div>
            </div>
        </div>
    );
}
