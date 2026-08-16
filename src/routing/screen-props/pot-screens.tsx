import { lazy } from "react";
import type { AppRouterProps } from './types';
import { Pot } from "../../types/app";
import {
    normalizeMembers,
    normalizeExpenses,
    normalizeConfirmations,
} from "../../utils/normalization";
import { Skeleton } from "../../components/Skeleton";

type RouterContext = AppRouterProps;

/** Shown while currentPotLoading is true and pot data hasn't arrived yet. */
function PotHomeLoadingSkeleton({ onBack }: { onBack?: () => void }) {
    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                {onBack && (
                    <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted/30 transition-colors active:scale-95 cursor-pointer">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
                            <polyline points="15 18 9 12 15 6"/>
                        </svg>
                    </button>
                )}
                <Skeleton height={22} width="45%" />
            </div>
            {/* Tab bar skeleton */}
            <div className="flex gap-1 px-4 py-2 border-b border-border">
                {[40, 55, 45, 50].map((w, i) => (
                    <Skeleton key={i} height={28} width={w} className="rounded-lg" />
                ))}
            </div>
            {/* Content */}
            <div className="flex-1 overflow-auto p-4 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="card p-4 space-y-3">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <Skeleton height={16} width={140} />
                                <Skeleton height={12} width={90} />
                            </div>
                            <Skeleton height={20} width={64} />
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                            {[1, 2].map((j) => (
                                <Skeleton key={j} width={28} height={28} className="rounded-full" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

const PotHome = lazy(() =>
    import("../../components/screens/PotHome").then((module) => ({
        default: module.PotHome,
    }))
);
const AddExpense = lazy(() =>
    import("../../components/screens/AddExpense").then((module) => ({
        default: module.AddExpense,
    }))
);
const ExpenseDetail = lazy(() =>
    import("../../components/screens/ExpenseDetail").then((module) => ({
        default: module.ExpenseDetail,
    }))
);

export function renderPotHome(ctx: RouterContext) {
    const {
        screen,
        nav: { push, back, replace },
        data: { currentPot: pot, pots },
        userState: { user },
        uiState: { invitesByPot, fabQuickAddPotId },
        actions: {
            setPots,
            setCurrentPotId,
            setCurrentExpenseId,
            setShowAddMember,
            setFabQuickAddPotId,
            copyInviteLink,
            resendInviteForPot,
            revokeInviteForPot,
            handleUpdateMember,
            handleUpdatePotSettings,
            handleDeletePot,
            handleArchivePot,
            handleLeavePot,
            deleteExpense,
            addExpenseToPot,
            handleRemoveMember,
            showToast,
        },
    } = ctx;

    if (!screen || screen.type !== "pot-home") return null;
    if (!pot && ctx.data.currentPotLoading) return <PotHomeLoadingSkeleton onBack={back} />;
    if (!pot) return null;

    const potInvites = invitesByPot[pot.id] || [];
    const pendingMemberInvites = potInvites.filter(
        (inv) => inv.status === "pending"
    );
    const inviteMembers = pendingMemberInvites.map((inv) => ({
        id: `invite-${inv.id}`,
        name: inv.invitee_email,
        role: "Member" as const,
        status: "pending" as const,
    }));
    const normalizedMapMembers = normalizeMembers(pot.members);
    const mergedMembers = [...normalizedMapMembers, ...inviteMembers];
    const normalizedExp = normalizeExpenses(pot.expenses, pot.baseCurrency);
    const normalizedCheckpointConfirmations = normalizeConfirmations(
        pot.currentCheckpoint?.confirmations
    );

    return (
        <PotHome
            potId={pot.id}
            potType={pot.type}
            potName={pot.name}
            baseCurrency={pot.baseCurrency}
            currentUserId={user?.id || "owner"}
            members={mergedMembers}
            expenses={normalizedExp}
            budget={pot.budget ?? undefined}
            budgetEnabled={pot.budgetEnabled}
            checkpointEnabled={pot.checkpointEnabled}
            hasActiveCheckpoint={
                pot.currentCheckpoint?.status === "pending"
            }
            checkpointConfirmations={normalizedCheckpointConfirmations}
            goalAmount={pot.goalAmount ?? undefined}
            goalDescription={pot.goalDescription}
            onBack={back}
            onImportPot={(importedPot) => {
                setPots([...pots, importedPot as Pot]);
                showToast("Pot imported successfully", "success");
                replace({ type: "pot-home", potId: importedPot.id });
            }}
            onAddExpense={() => push({ type: "add-expense" })}
            onExpenseClick={(expense) => {
                setCurrentExpenseId(expense.id);
                push({
                    type: "expense-detail",
                    expenseId: expense.id,
                });
            }}
            onAddMember={() => {
                setShowAddMember(true);
            }}
            onUpdateMember={(updatedMember) => {
                handleUpdateMember(pot.id, updatedMember);
            }}
            onUpdateSettings={(settings) => {
                handleUpdatePotSettings(pot.id, settings);
            }}
            onCopyInviteLink={() => {
                void copyInviteLink(pot.id);
            }}
            onResendInvite={(memberId) => {
                if (!memberId.startsWith("invite-")) return;
                void resendInviteForPot(pot.id, memberId.replace("invite-", ""));
            }}
            onRevokeInvite={(memberId) => {
                if (!memberId.startsWith("invite-")) return;
                void revokeInviteForPot(pot.id, memberId.replace("invite-", ""));
            }}
            onDeleteExpense={deleteExpense}
            onShowToast={showToast}
            onQuickAddSave={(data) => {
                setCurrentPotId(pot.id);
                addExpenseToPot(pot.id, data);
            }}
            openQuickAdd={fabQuickAddPotId === pot.id}
            onClearQuickAdd={() => setFabQuickAddPotId(null)}
            onRemoveMember={(id) => {
                if (!ctx.data.currentPotId) return;
                if (id === "owner") {
                    showToast("Owner cannot be removed", "info");
                    return;
                }
                if (id.startsWith("invite-")) {
                    showToast(
                        "Use invite actions for pending members",
                        "info"
                    );
                    return;
                }
                handleRemoveMember(ctx.data.currentPotId, id);
            }}
            onSettle={() => push({ type: "settle-selection" })}
            onDeletePot={() => {
                void handleDeletePot(pot.id);
            }}
            onArchivePot={() => {
                void handleArchivePot(pot.id);
            }}
            onLeavePot={() => {
                void handleLeavePot(pot.id);
            }}
        />
    );
}


export function renderAddExpense(ctx: RouterContext) {
    const {
        screen,
        nav: { back },
        data: { currentPot: pot },
        userState: { user },
        actions: { addExpenseToPot },
    } = ctx;

    if (!screen || screen.type !== "add-expense") return null;
    if (!pot) return null;

    const addExpenseMembers = normalizeMembers(pot.members).map((member) => ({
        ...member,
        name: member.id === user?.id ? 'You' : member.name,
    }));
    return (
        <AddExpense
            potName={pot.name}
            members={addExpenseMembers}
            baseCurrency={pot.baseCurrency}
            onBack={back}
            onSave={(data) => addExpenseToPot(pot.id, data)}
        />
    );
}

export function renderEditExpense(ctx: RouterContext) {
    const {
        screen,
        nav: { back },
        data: { currentPot: pot },
        userState: { user },
        actions: { updateExpense },
    } = ctx;

    if (!screen || screen.type !== "edit-expense") return null;
    if (!pot) return null;
    if (!("expenseId" in screen)) return null;

    const editExpenseMembers = normalizeMembers(pot.members).map((member) => ({
        ...member,
        name: member.id === user?.id ? 'You' : member.name,
    }));
    const editExpenses = normalizeExpenses(pot.expenses, pot.baseCurrency);
    const editingExpense = editExpenses.find(
        (e) => e.id === (screen as { expenseId: string }).expenseId
    );
    if (!editingExpense) return null;

    return (
        <AddExpense
            potName={pot.name}
            members={editExpenseMembers}
            baseCurrency={pot.baseCurrency}
            existingExpense={editingExpense}
            onBack={back}
            onSave={updateExpense}
        />
    );
}

export function renderExpenseDetail(ctx: RouterContext) {
    const {
        screen,
        nav: { push, back },
        data: {
            currentPot: pot,
            currentPotLoading,
            hasLoadedInitialData,
        },
        userState: { user },
        actions: {
            setCurrentExpenseId,
            deleteExpense,
            showToast,
        },
    } = ctx;

    if (!screen || screen.type !== "expense-detail") return null;

    if (!pot && (currentPotLoading || !hasLoadedInitialData)) {
        return (
            <ExpenseDetail
                currentUserId={user?.id || "owner"}
                baseCurrency={
                    (pot as Pot | null | undefined)?.baseCurrency || "USD"
                }
                onBack={back}
                isLoading
                onEdit={() => undefined}
                onDelete={() => undefined}
                onCopyReceiptLink={() => undefined}
                expense={undefined as any}
                members={[]}
            />
        );
    }
    if (!pot) return null;
    if (!("expenseId" in screen)) return null;

    const detailMembers = normalizeMembers(pot.members).map((member) => ({
        ...member,
        name: member.id === user?.id ? 'You' : member.name,
    }));
    const detailExpenses = normalizeExpenses(
        pot.expenses,
        pot.baseCurrency
    );
    const expense = detailExpenses.find(
        (e) => e.id === (screen as { expenseId: string }).expenseId
    );
    if (!expense) return null;

    return (
        <ExpenseDetail
            expense={expense}
            members={detailMembers}
            currentUserId={user?.id || "owner"}
            baseCurrency={pot.baseCurrency}
            onBack={back}
            onEdit={() => {
                setCurrentExpenseId(expense.id);
                push({
                    type: "edit-expense",
                    expenseId: expense.id,
                });
            }}
            onDelete={() => deleteExpense(expense.id, { navigateBack: true })}
            onCopyReceiptLink={() =>
                showToast("Receipt link copied", "success")
            }
        />
    );
}
