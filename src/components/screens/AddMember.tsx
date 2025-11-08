import { useState } from "react";
import { BottomSheet } from "../BottomSheet";
import { PrimaryButton } from "../PrimaryButton";
import { SecondaryButton } from "../SecondaryButton";
import { User, Search, Mail, QrCode, UserPlus } from "lucide-react";
import { TrustIndicator } from "../TrustIndicator";

interface Contact {
  id: string;
  name: string;
  trustScore?: number;
  paymentPreference?: string;
  sharedPots?: number;
  lastTransaction?: string;
}

interface AddMemberProps {
  onClose: () => void;
  onAddExisting: (contactId: string) => void;
  onInviteNew: (nameOrEmail: string) => void;
  onShowQR: () => void;
  existingContacts: Contact[];
  currentMembers: string[]; // IDs of people already in the pot
}

export function AddMember({
  onClose,
  onAddExisting,
  onInviteNew,
  onShowQR,
  existingContacts,
  currentMembers,
}: AddMemberProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteInput, setInviteInput] = useState("");
  const [view, setView] = useState<"contacts" | "invite">("contacts");

  // Filter out people already in the pot
  const availableContacts = existingContacts.filter(
    (c) => !currentMembers.includes(c.id)
  );

  // Filter contacts by search
  const filteredContacts = availableContacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInvite = () => {
    if (!inviteInput.trim()) return;
    onInviteNew(inviteInput);
    onClose();
  };

  return (
    <BottomSheet isOpen={true} onClose={onClose} title="Add Member">
      {/* Subtitle */}
      <p className="text-[13px] text-muted mb-4">
        Add someone from your contacts or invite a new person
      </p>

      {/* View Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setView("contacts")}
          className={`flex-1 py-2.5 px-4 rounded-lg transition-all ${
            view === "contacts"
              ? "bg-foreground text-background"
              : "bg-muted/10 text-muted"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <User className="w-4 h-4" />
            <span className="text-[14px] font-medium">Your Contacts</span>
          </div>
        </button>
        <button
          onClick={() => setView("invite")}
          className={`flex-1 py-2.5 px-4 rounded-lg transition-all ${
            view === "invite"
              ? "bg-foreground text-background"
              : "bg-muted/10 text-muted"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <UserPlus className="w-4 h-4" />
            <span className="text-[14px] font-medium">Invite New</span>
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {view === "contacts" ? (
          <>
            {/* Search */}
            {availableContacts.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-full pl-10 pr-4 py-3 bg-card rounded-lg border border-border text-[15px] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>
            )}

            {/* Contact List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => {
                      onAddExisting(contact.id);
                      onClose();
                    }}
                    className="w-full p-3 bg-card rounded-lg border border-border hover:bg-muted/5 active:scale-[0.98] transition-all text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-muted/20 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-secondary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[15px] font-medium truncate">
                              {contact.name}
                            </p>
                            {contact.trustScore && (
                              <TrustIndicator score={contact.trustScore} />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {contact.sharedPots && contact.sharedPots > 0 && (
                              <p className="text-[12px] text-muted">
                                {contact.sharedPots} shared pot
                                {contact.sharedPots !== 1 ? "s" : ""}
                              </p>
                            )}
                            {contact.paymentPreference && (
                              <>
                                {contact.sharedPots && (
                                  <span className="text-[12px] text-muted">•</span>
                                )}
                                <p className="text-[12px] text-muted">
                                  {contact.paymentPreference}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-foreground text-label font-medium flex-shrink-0 ml-2">
                        Add
                      </div>
                    </div>
                  </button>
                ))
              ) : availableContacts.length === 0 ? (
                <div className="py-12 text-center">
                  <User className="w-12 h-12 text-muted mx-auto mb-3 opacity-30" />
                  <p className="text-[14px] text-muted mb-1">
                    No contacts yet
                  </p>
                  <p className="text-[12px] text-muted">
                    Invite someone to get started
                  </p>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Search className="w-12 h-12 text-muted mx-auto mb-3 opacity-30" />
                  <p className="text-[14px] text-muted">
                    No contacts match "{searchQuery}"
                  </p>
                </div>
              )}
            </div>

            {/* Quick Action: Invite New */}
            {availableContacts.length > 0 && (
              <div className="pt-2 border-t border-border">
                <button
                  onClick={() => setView("invite")}
                  className="w-full p-3 rounded-lg hover:bg-accent/15 active:scale-[0.98] transition-all"
                  style={{ background: 'var(--accent-pink-soft)' }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <UserPlus className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                    <span className="text-[14px] font-medium" style={{ color: 'var(--accent)' }}>
                      Invite new person instead
                    </span>
                  </div>
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Invite New Person */}
            <div className="space-y-3">
              {/* Email/Name Input */}
              <div>
                <label className="block text-[13px] text-muted mb-2">
                  Name or email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="text"
                    value={inviteInput}
                    onChange={(e) => setInviteInput(e.target.value)}
                    placeholder="alice@example.com or Alice Smith"
                    className="w-full pl-10 pr-4 py-3 bg-card rounded-lg border border-border text-[15px] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/20"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-muted mt-2">
                  They'll receive an invite link to join this pot
                </p>
              </div>

              {/* Send Invite Button */}
              <PrimaryButton onClick={handleInvite} fullWidth>
                Send Invite
              </PrimaryButton>

              {/* Or Divider */}
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[12px] text-muted">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Share QR Code */}
              <SecondaryButton onClick={onShowQR} fullWidth>
                <QrCode className="w-4 h-4" />
                Share Pot QR Code
              </SecondaryButton>

              <p className="text-[11px] text-muted text-center">
                Share your QR code in person or via messaging apps
              </p>
            </div>

            {/* Back to Contacts */}
            {availableContacts.length > 0 && (
              <div className="pt-2 border-t border-border">
                <button
                  onClick={() => setView("contacts")}
                  className="w-full p-3 bg-muted/10 rounded-lg hover:bg-muted/15 active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center justify-center gap-2">
                    <User className="w-4 h-4 text-muted" />
                    <span className="text-[14px] font-medium text-muted">
                      Choose from contacts instead
                    </span>
                  </div>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </BottomSheet>
  );
}
