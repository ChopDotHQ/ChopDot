import { lazy } from "react";
import type { AppRouterProps } from './types';
import { Pot } from "../../types/app";
import {
    normalizeMembers,
    normalizeExpenses,
    normalizeConfirmations,
} from "../../utils/normalization";

type RouterContext = AppRouterProps;

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
const CloseoutReview = lazy(() =>
    import("../../components/screens/CloseoutReview").then((module) => ({
        default: module.CloseoutReview,
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
            attestExpense,
            batchAttestExpenses,
            addExpenseToPot,
            handleRemoveMember,
            persistPotPartial,
            showToast,
        },
    } = ctx;

    if (!screen || screen.type !== "pot-home") return null;
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
            contributions={pot.contributions}
            totalPooled={pot.totalPooled ?? undefined}
            yieldRate={pot.yieldRate ?? undefined}
            defiProtocol={pot.defiProtocol}
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
            onAttestExpense={(expenseId, silent) => {
                attestExpense(expenseId);
                if (!silent) {
                    showToast("Expense confirmed", "success");
                }
            }}
            onBatchAttestExpenses={batchAttestExpenses}
            onShowToast={showToast}
            onAddContribution={() => push({ type: "add-contribution" })}
            onWithdraw={() => push({ type: "withdraw-funds" })}
            onViewCheckpoint={() => push({ type: "checkpoint-status" })}
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
            closeouts={pot.closeouts}
            onReopenTrackedSettlement={() => {
                const latestCloseout = [...(pot.closeouts || [])]
                    .filter((entry) => entry.status !== 'cancelled' && entry.status !== 'draft')
                    .sort((left, right) => right.createdAt - left.createdAt)[0];

                if (!latestCloseout) {
                    showToast('No smart settlement is active for this tab.', 'info');
                    return;
                }

                const hasStartedPayments = latestCloseout.legs.some(
                    (leg) => Boolean(leg.settlementTxHash || leg.proofTxHash || leg.status !== 'pending')
                );

                if (hasStartedPayments) {
                    showToast('This tab already has tracked payments. Rebalancing is locked.', 'info');
                    return;
                }

                const nextCloseouts = (pot.closeouts || []).map((entry) =>
                    entry.id === latestCloseout.id
                        ? { ...entry, status: 'cancelled' as const }
                        : entry
                );

                void persistPotPartial(pot.id, {
                    closeouts: nextCloseouts,
                    lastEditAt: new Date().toISOString(),
                } as any);
                showToast('Smart settlement reopened. You can change expenses again.', 'success');
            }}
        />
    );
}

export function renderCloseoutReview(ctx: RouterContext) {
    const {
        screen,
        nav: { back, push },
        data: { currentPot: pot },
        userState: { user, isGuest },
        actions: { persistPotPartial, showToast },
    } = ctx;

    if (!screen || screen.type !== 'closeout-review') return null;
    if (!pot) return null;

    return (
        <CloseoutReview
            pot={pot as any}
            currentUserId={isGuest ? 'owner' : (user?.id || 'owner')}
            onBack={back}
            onAnchored={(closeout) => {
                const nextCloseouts = [
                    closeout,
                    ...(pot.closeouts || []).filter((entry) => entry.id !== closeout.id),
                ];
                void persistPotPartial(pot.id, {
                    closeouts: nextCloseouts,
                    lastEditAt: new Date().toISOString(),
                } as any);
            }}
            onContinueToSettlement={() => push({ type: 'settle-selection' })}
            onShowToast={showToast}
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
            pots,
            currentPotId,
        },
        userState: { user, walletConnected },
        actions: {
            setPots,
            setCurrentExpenseId,
            setWalletConnected,
            deleteExpense,
            attestExpense,
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
                walletConnected={walletConnected}
                onBack={back}
                isLoading
                onEdit={() => undefined}
                onDelete={() => undefined}
                onAttest={() => undefined}
                onCopyReceiptLink={() => undefined}
                onConnectWallet={() => setWalletConnected(true)}
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
            walletConnected={walletConnected}
            onBack={back}
            onEdit={() => {
                setCurrentExpenseId(expense.id);
                push({
                    type: "edit-expense",
                    expenseId: expense.id,
                });
            }}
            onDelete={() => deleteExpense(expense.id, { navigateBack: true })}
            onAttest={() => attestExpense(expense.id)}
            onCopyReceiptLink={() =>
                showToast("Receipt link copied", "success")
            }
            onUpdateExpense={(updates) => {
                setPots(
                    pots.map((p) =>
                        p.id === currentPotId
                            ? {
                                  ...p,
                                  expenses: p.expenses.map((e) =>
                                      e.id === expense.id
                                          ? { ...e, ...updates }
                                          : e
                                  ),
                              }
                            : p
                    )
                );
                showToast("Expense anchored on-chain", "success");
            }}
            onConnectWallet={() => setWalletConnected(true)}
        />
    );
}
