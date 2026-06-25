import { lazy } from "react";
import type { AppRouterProps } from './types';
import { Pot } from "../../types/app";
import {
    normalizeMembers,
    normalizeExpenses,
    normalizeConfirmations,
} from "../../utils/normalization";
import { Skeleton } from "../../components/Skeleton";
import { addImportedPot, persistImportedPot } from "../../utils/importedPot";

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
const ChapterHome = lazy(() =>
    import("../../components/screens/ChapterHome").then((module) => ({
        default: module.ChapterHome,
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
const SpendCardScreen = lazy(() =>
    import("../../components/screens/SpendCardScreen").then((module) => ({
        default: module.SpendCardScreen,
    }))
);
const CaptureHandoffScreen = lazy(() =>
    import("../../components/screens/CaptureHandoffScreen").then((module) => ({
        default: module.CaptureHandoffScreen,
    }))
);
const CaptureConfirmScreen = lazy(() =>
    import("../../components/screens/CaptureConfirmScreen").then((module) => ({
        default: module.CaptureConfirmScreen,
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
            persistPotPartial,
            showToast,
        },
    } = ctx;

    if (!screen || screen.type !== "pot-home") return null;
    if (!pot && ctx.data.currentPotLoading) return <PotHomeLoadingSkeleton onBack={back} />;
    if (!pot) return null;
    if (pot.chapterMode && pot.dotChapter) {
        return (
            <ChapterHome
                pot={pot}
                currentUserId={user?.id || "owner"}
                onBack={back}
                onShowToast={showToast}
                onUpdatePot={(updates) => {
                    setPots((prev) =>
                        prev.map((item) =>
                            item.id === pot.id ? { ...item, ...updates } : item,
                        ),
                    );
                }}
            />
        );
    }

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
            potIntent={pot.potIntent}
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
                const potToImport = importedPot as Pot;
                const commitImport = () => {
                    const persisted = persistImportedPot(potToImport);
                    setPots(addImportedPot(persisted.length ? persisted : pots, potToImport));
                };
                commitImport();
                window.setTimeout(commitImport, 250);
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
            onOpenSpendCard={(spendCardId) => {
                setCurrentPotId(pot.id);
                push({ type: "spend-card", potId: pot.id, spendCardId });
            }}
            hasCaptureChapter={Boolean(pot.chapter)}
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

export function renderSpendCard(ctx: RouterContext) {
    const {
        screen,
        nav: { push, back },
        userState: { user },
        actions: { showToast },
    } = ctx;

    if (!screen || screen.type !== "spend-card") return null;
    if (!("potId" in screen)) return null;

    const memberId = user?.id || "owner";
    const memberName = user?.name || "You";

    return (
        <SpendCardScreen
            potId={screen.potId}
            spendCardId={screen.spendCardId}
            actingMemberIdOverride={screen.actingMemberId}
            currentMemberId={memberId}
            currentMemberName={memberName}
            currentUserId={user?.id}
            onBack={back}
            onOpenHandoff={(legId) =>
                push({ type: "capture-handoff", potId: screen.potId, legId })
            }
            onShowToast={showToast}
        />
    );
}

export function renderCaptureHandoff(ctx: RouterContext) {
    const {
        screen,
        nav: { back },
        userState: { user },
        actions: { showToast },
    } = ctx;

    if (!screen || screen.type !== "capture-handoff") return null;
    if (!("potId" in screen) || !("legId" in screen)) return null;

    const memberId = user?.id || "owner";
    const memberName = user?.name || "You";

    return (
        <CaptureHandoffScreen
            potId={screen.potId}
            legId={screen.legId}
            captureToken={screen.captureToken}
            actingMemberIdOverride={screen.actingMemberId}
            currentMemberId={memberId}
            currentMemberName={memberName}
            currentUserId={user?.id}
            onBack={back}
            onShowToast={showToast}
        />
    );
}

export function renderCaptureConfirm(ctx: RouterContext) {
    const {
        screen,
        nav: { back, reset },
        userState: { user },
        actions: { showToast },
    } = ctx;

    if (!screen || screen.type !== "capture-confirm") return null;

    const memberId = user?.id || "owner";
    const memberName = user?.name || "You";

    return (
        <CaptureConfirmScreen
            potId={screen.potId}
            legId={screen.legId}
            captureToken={screen.captureToken}
            receiverId={screen.receiverId}
            currentMemberId={memberId}
            currentMemberName={memberName}
            currentUserId={user?.id}
            onBack={back}
            onShowToast={showToast}
            onComplete={() => {
                window.history.replaceState({}, "", "/pots");
                reset({ type: "pot-home", potId: screen.potId });
            }}
        />
    );
}

export function renderCaptureLinkError(ctx: RouterContext) {
    const {
        screen,
        nav: { reset },
    } = ctx;

    if (!screen || screen.type !== "capture-link-error") return null;

    return (
        <div className="flex flex-col h-full bg-background p-4" data-testid="capture-link-error-screen">
            <div className="card p-4 space-y-2 mt-8">
                <h1 className="text-body font-semibold">Link unavailable</h1>
                <p className="text-caption text-secondary">{screen.message}</p>
                {screen.expectedName && (
                    <p className="text-caption text-secondary">This link is for {screen.expectedName}.</p>
                )}
                <button
                    type="button"
                    className="w-full py-3 rounded-xl bg-accent text-white font-medium mt-2"
                    onClick={() => reset({ type: "pots-home" })}
                >
                    Go to pots
                </button>
            </div>
        </div>
    );
}
