import { UserPlus, MoreVertical, UserMinus, Send, Edit } from "lucide-react";
import { TrustDots } from "../TrustDots";
import { useState } from "react";
import { EditMemberModal } from "../EditMemberModal";

interface Member {
  id: string;
  name: string;
  role: "Owner" | "Member";
  status: "active" | "pending";
  verified?: boolean;
}

interface Expense {
  id: string;
  amount: number;
  paidBy: string;
  split: { memberId: string; amount: number }[];
}

interface MembersTabProps {
  members: Member[];
  expenses?: Expense[];
  currentUserId?: string;
  baseCurrency?: string;
  onAddMember: () => void;
  onRemoveMember: (id: string) => void;
  onUpdateMember?: (member: { id: string; name: string; verified?: boolean }) => void;
  onCopyInviteLink?: () => void;
  onResendInvite?: (memberId: string) => void;
  onRevokeInvite?: (memberId: string) => void;
}

export function MembersTab({
  members,
  expenses = [],
  currentUserId = "owner",
  onAddMember,
  onRemoveMember,
  onUpdateMember,
  onCopyInviteLink: _onCopyInviteLink,
  onResendInvite,
  onRevokeInvite,
}: MembersTabProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const getMemberBalance = (memberId: string): number => {
    if (!expenses || expenses.length === 0) return 0;
    let theirShareOfMyExpenses = 0;
    let myShareOfTheirExpenses = 0;
    expenses.forEach(expense => {
      if (expense.paidBy === currentUserId) {
        const memberSplit = expense.split.find(s => s.memberId === memberId);
        if (memberSplit) theirShareOfMyExpenses += memberSplit.amount;
      }
      if (expense.paidBy === memberId) {
        const yourSplit = expense.split.find(s => s.memberId === currentUserId);
        if (yourSplit) myShareOfTheirExpenses += yourSplit.amount;
      }
    });
    return theirShareOfMyExpenses - myShareOfTheirExpenses;
  };

  const getTrustScore = (_memberId: string): number => 9;

  return (
    <div className="p-3 space-y-3">
      <div className="space-y-2">
        {members.map((member) => {
          const balance = getMemberBalance(member.id);
          const isCurrentUser = member.id === currentUserId;
          const displayName = isCurrentUser ? "You" : member.name;
          const trustScore = getTrustScore(member.id);
          const isPositive = balance >= 0;
          const amountColor = isPositive ? 'var(--success)' : 'var(--ink)';
          const showMenu = openMenuId === member.id;
          const canEditMember = Boolean(onUpdateMember);
          const canResendInvite = member.status === "pending" && Boolean(onResendInvite);
          const canRevokeInvite = member.status === "pending" && Boolean(onRevokeInvite);
          const canRemoveMember = member.role !== "Owner";
          const canShowMenu = canEditMember || canResendInvite || canRevokeInvite || canRemoveMember;

          return (
            <div key={member.id} className="relative">
              <div className="card p-3">
                <div className="flex items-center justify-between gap-3">
                  {/* Left: Avatar + Name + Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
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
                          style={{ fontWeight: 500, color: 'var(--foreground)', opacity: 1 }}
                        >
                          {displayName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {!isCurrentUser && (
                        <TrustDots score={trustScore} className="bottom-0 right-0" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-body truncate" style={{ fontWeight: 500 }}>
                          {displayName}
                        </p>
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

                      {member.status === "pending" && (
                        <p className="text-caption text-secondary mt-0.5">Invite pending</p>
                      )}
                    </div>
                  </div>

                  {/* Right: Balance + Menu */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!isCurrentUser && expenses.length > 0 && (
                      <div className="text-right">
                        {(() => {
                          const isSettled = Math.abs(balance) < 0.01;
                          const balanceDisplay = isSettled
                            ? "Settled"
                            : `${isPositive ? '+' : ''}$${Math.abs(balance).toFixed(2)}`;
                          return (
                            <>
                              <p
                                className="text-[18px] tabular-nums"
                                style={{ fontWeight: 700, color: isSettled ? 'var(--muted)' : amountColor }}
                              >
                                {balanceDisplay}
                              </p>
                              {!isSettled && (
                                <p className="text-caption text-secondary">
                                  {isPositive ? "owes you" : "you owe"}
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {canShowMenu && (
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

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                  <div
                    className="absolute right-0 top-full mt-1 w-48 card p-1 z-50"
                    style={{ boxShadow: 'var(--shadow-fab)' }}
                  >
                    {canEditMember && (
                      <button
                        onClick={() => { setEditingMember(member); setOpenMenuId(null); }}
                        className="w-full px-3 py-2 text-left rounded-lg hover:bg-muted/30 transition-colors flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4 text-secondary" />
                        <span className="text-body">Edit member</span>
                      </button>
                    )}
                    {canResendInvite && (
                      <button
                        onClick={() => { onResendInvite?.(member.id); setOpenMenuId(null); }}
                        className="w-full px-3 py-2 text-left rounded-lg hover:bg-muted/30 transition-colors flex items-center gap-2"
                      >
                        <Send className="w-4 h-4 text-secondary" />
                        <span className="text-body">Resend invite</span>
                      </button>
                    )}
                    {canRevokeInvite && (
                      <button
                        onClick={() => { onRevokeInvite?.(member.id); setOpenMenuId(null); }}
                        className="w-full px-3 py-2 text-left rounded-lg hover:bg-muted/30 transition-colors flex items-center gap-2"
                      >
                        <UserMinus className="w-4 h-4 text-secondary" />
                        <span className="text-body">Revoke invite</span>
                      </button>
                    )}
                    {canRemoveMember && (
                      <button
                        onClick={() => { onRemoveMember(member.id); setOpenMenuId(null); }}
                        className="w-full px-3 py-2 text-left rounded-lg hover:bg-destructive/10 transition-colors flex items-center gap-2"
                      >
                        <UserMinus className="w-4 h-4" style={{ color: 'var(--danger)' }} />
                        <span className="text-body" style={{ color: 'var(--danger)' }}>Remove member</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={onAddMember}
        className="w-full py-3 rounded-xl hover:bg-accent/15 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
        style={{ background: 'var(--accent-pink-soft)' }}
      >
        <UserPlus className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        <span className="text-body" style={{ color: 'var(--accent)' }}>Add Member</span>
      </button>

      {onUpdateMember && (
        <EditMemberModal
          isOpen={editingMember !== null}
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSave={(updatedMember) => {
            onUpdateMember(updatedMember);
            setEditingMember(null);
          }}
        />
      )}
    </div>
  );
}
