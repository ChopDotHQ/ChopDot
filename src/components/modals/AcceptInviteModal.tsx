import { PrimaryButton } from "../PrimaryButton";
import { SecondaryButton } from "../SecondaryButton";

interface AcceptInviteModalProps {
    isOpen: boolean;
    isProcessing: boolean;
    onAccept: () => void;
    onDecline: () => void; // Or onCancel if used for closing
    inviteDetails?: {
        email: string;
        inviterName?: string;
    };
}

export function AcceptInviteModal({
    isOpen,
    isProcessing,
    onAccept,
    onDecline,
}: AcceptInviteModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-4 animate-in fade-in duration-200">
            <div className="bg-background card p-5 w-full max-w-sm shadow-lg rounded-2xl">
                <h3 className="text-section mb-2" style={{ fontWeight: 600 }}>
                    Accept invite?
                </h3>
                <p className="text-body text-secondary mb-6">
                    You were invited to join a pot. Accept to add it to your list.
                </p>

                <div className="flex items-center justify-end gap-3">
                    <SecondaryButton
                        onClick={onDecline}
                        disabled={isProcessing}
                        className="!px-4 !py-2"
                    >
                        Cancel
                    </SecondaryButton>

                    <PrimaryButton
                        onClick={onAccept}
                        disabled={isProcessing}
                        className="!px-4 !py-2"
                    >
                        {isProcessing ? "Joining..." : "Accept"}
                    </PrimaryButton>
                </div>
            </div>
        </div>
    );
}
