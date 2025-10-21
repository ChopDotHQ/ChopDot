import { UserPlus, MoreVertical, UserMinus, Send } from "lucide-react";
import { TrustDots } from "../TrustDots";
import { useState } from "react";

interface Member {
  id: string;
  name: string;
  role: "Owner" | "Member";
  status: "active" | "pending";
}

interface Expense {
  id: string;
  amount: number;
  paidBy: string;
  split: { memberId: string; amount: number }[];
}

interface MembersTabProps {
  members: Member[];
  expenses?: Expense[]; // Optional for calculating balances
  currentUserId?: string;
  onAddMember: () => void;
  onRemoveMember: (id: string) => void;
  onCopyInviteLink?: () => void;
  onResendInvite?: (memberId: string) => void;
}

export function MembersTab({ 
  members, 
  expenses = [],
  currentUserId = "owner",
  onAddMember, 
  onRemoveMember,
  onCopyInviteLink: _onCopyInviteLink,
  onResendInvite,
}: MembersTabProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Calculate balance for each member relative to current user
  const getMemberBalance = (memberId: string): number => {
    if (!expenses || expenses.length === 0) return 0;

    let memberPaid = 0;
    let memberOwes = 0;
    let youPaid = 0;
    let youOwe = 0;

    expenses.forEach(expense => {
      // What this member paid
      if (expense.paidBy === memberId) {
        memberPaid += expense.amount;
      }
      // What this member owes (their split)
      const memberSplit = expense.split.find(s => s.memberId === memberId);
      if (memberSplit) {
        memberOwes += memberSplit.amount;
      }

      // What you paid
      if (expense.paidBy === currentUserId) {
        youPaid += expense.amount;
      }
      // What you owe (your split)
      const yourSplit = expense.split.find(s => s.memberId === currentUserId);
      if (yourSplit) {
        youOwe += yourSplit.amount;
      }
    });

    // Member's net position
    const memberNet = memberPaid - memberOwes;
    // Your net position
    const yourNet = youPaid - youOwe;

    // Balance = how much they owe you (or you owe them)
    // If positive: they owe you
    // If negative: you owe them
    return yourNet - memberNet;
  };

  // Mock payment preferences (in real app, would come from member data)
  const getPaymentPreference = (memberId: string): string | undefined => {
    // You don't have a payment preference shown
    if (memberId === currentUserId) return undefined;
    
    // Mock data for other members
    const preferences: Record<string, string> = {
      alice: "Bank",
      bob: "TWINT",
      charlie: "DOT",
      diana: "PayPal",
    };
    return preferences[memberId] || "Bank";
  };

  // Mock trust scores (in real app, would come from member data)
  const getTrustScore = (_memberId: string): number => 9;

  return (
    <div className="p-3 space-y-3">
      {/* Member Cards */}
      <div className="space-y-2">
        {members.map((member) => {
          const balance = getMemberBalance(member.id);
          const isCurrentUser = member.id === currentUserId;
          const paymentPref = getPaymentPreference(member.id);
          const trustScore = getTrustScore(member.id);
          const isPositive = balance >= 0;
          const amountColor = isPositive ? 'var(--success)' : 'var(--ink)';
          const showMenu = openMenuId === member.id;

          return (
            <div key={member.id} className="relative">
              <div className="card p-3">
                <div className="flex items-center justify-between gap-3">
                  {/* Left: Avatar + Name + Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Avatar with TrustDots badge */}
                    <div className="relative flex-shrink-0">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ 
                          background: isCurrentUser ? 'var(--accent-pink-soft)' : 'var(--muted)',
                          opacity: 0.2,
                        }}
                      >
                        <span 
                          className="text-body"
                          style={{ 
                            fontWeight: 500,
                            color: 'var(--foreground)',
                            opacity: 1,
                          }}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {/* TrustDots overlay - bottom-right corner */}
                      {!isCurrentUser && (
                        <TrustDots 
                          score={trustScore} 
                          className="bottom-0 right-0"
                        />
                      )}
                    </div>
                    
                    {/* Name + Role + Payment Preference */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p 
                          className="text-body truncate"
                          style={{ fontWeight: 500 }}
                        >
                          {member.name}
                        </p>
                        
                        {/* Role Badge */}
                        <span 
                          className="inline-block px-1.5 py-0.5 rounded text-micro"
                          style={{ 
                            backgroundColor: member.role === "Owner" ? 'var(--accent-pink-soft)' : 'var(--muted)',
                            color: member.role === "Owner" ? 'var(--accent)' : 'var(--foreground)',
                            opacity: 0.8,
                          }}
                        >
                          {member.role}
                        </span>
                      </div>
                      
                      {/* Payment Preference Pill */}
                      {paymentPref && (
                        <div className="flex items-center gap-1 mt-1">
                          <span 
                            className="inline-block px-2 py-0.5 rounded-md text-caption"
                            style={{ 
                              backgroundColor: 'var(--muted)',
                              color: 'var(--bg)',
                              opacity: 0.8,
                            }}
                          >
                            Pref: {paymentPref}
                          </span>
                        </div>
                      )}
                      
                      {/* Status for pending members */}
                      {member.status === "pending" && (
                        <p className="text-caption text-secondary mt-0.5">
                          Invite pending
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Right: Balance or Menu Button */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Balance (if not current user and there are expenses) */}
                    {!isCurrentUser && expenses.length > 0 && (
                      <div className="text-right">
                        <p 
                          className="text-body tabular-nums"
                          style={{ 
                            fontWeight: 500,
                            color: Math.abs(balance) < 0.01 ? 'var(--muted)' : amountColor,
                          }}
                        >
                          {Math.abs(balance) < 0.01 
                            ? "Settled" 
                            : `${isPositive ? '+' : ''}$${Math.abs(balance).toFixed(2)}`
                          }
                        </p>
                        {Math.abs(balance) >= 0.01 && (
                          <p className="text-caption text-secondary">
                            {isPositive ? "owes you" : "you owe"}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Menu Button (for non-owners) */}
                    {member.role !== "Owner" && (
                      <button
                        onClick={() => setOpenMenuId(showMenu ? null : member.id)}
                        className="p-1.5 hover:bg-muted/30 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-secondary" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Dropdown Menu */}
              {showMenu && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setOpenMenuId(null)}
                  />
                  
                  {/* Menu */}
                  <div 
                    className="absolute right-0 top-full mt-1 w-48 card p-1 z-50"
                    style={{ boxShadow: 'var(--shadow-fab)' }}
                  >
                    {member.status === "pending" && onResendInvite && (
                      <button
                        onClick={() => {
                          onResendInvite(member.id);
                          setOpenMenuId(null);
                        }}
                        className="w-full px-3 py-2 text-left rounded-lg hover:bg-muted/30 transition-colors flex items-center gap-2"
                      >
                        <Send className="w-4 h-4 text-secondary" />
                        <span className="text-body">Resend invite</span>
                      </button>
                    )}
                    
                    <button
                      onClick={() => {
                        onRemoveMember(member.id);
                        setOpenMenuId(null);
                      }}
                      className="w-full px-3 py-2 text-left rounded-lg hover:bg-destructive/10 transition-colors flex items-center gap-2"
                    >
                      <UserMinus className="w-4 h-4" style={{ color: 'var(--danger)' }} />
                      <span className="text-body" style={{ color: 'var(--danger)' }}>
                        Remove member
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Add Member Button */}
      <button
        onClick={onAddMember}
        className="w-full py-3 rounded-xl hover:bg-accent/15 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
        style={{ background: 'var(--accent-pink-soft)' }}
      >
        <UserPlus className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        <span className="text-body" style={{ color: 'var(--accent)' }}>Add Member</span>
      </button>
    </div>
  );
}
