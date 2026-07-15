import { lazy } from "react";
import type { AppRouterProps } from './types';
import { Pot } from "../../types/app";
import {
    normalizeMembers,
    normalizeExpenses,
    normalizeConfirmations,
} from "../../utils/normalization";
import { Skeleton } from "../../components/Skeleton";
import { experimentalPotSurfacesEnabled } from "../../utils/experimentalSurfaces";
import { calculatePotSettlements } from "../../utils/settlements";
import { applyConfirmedLegAdjustments, type ConfirmedLegAdjustment } from "../../utils/confirmedLegAdjustments";
import { CloseoutReview } from "../../components/screens/CloseoutReview";
import type { SettlementLeg } from "../../types/app";


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
        userState: { user, isGuest },
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
    const currentUserId = isGuest ? "owner" : (user?.id || "owner");

    if (pot.chapterMode && experimentalPotSurfacesEnabled()) {
        return (
            <ChapterHome
                pot={pot as any}
                currentUserId={currentUserId}
                onBack={back}
                onUpdatePot={(updates) => {
                    setPots((previousPots) =>
                        previousPots.map((existingPot) =>
                            existingPot.id === pot.id
                                ? { ...existingPot, ...updates, lastEditAt: new Date().toISOString() }
                                : existingPot,
                        ),
                    );
                }}
                onShowToast={showToast}
            />
        );
    }

    return (
        <PotHome
            potId={pot.id}
            potType={pot.type}
            potName={pot.name}
            baseCurrency={pot.baseCurrency}
            currentUserId={currentUserId}
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
            recentSettlement={screen.recentSettlement}
            closeouts={(pot as any).closeouts || []}
            confirmedLegs={((pot as any).chapter?.legs ?? []).filter(
                (leg: ConfirmedLegAdjustment) => leg.state === 'confirmed',
            )}
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
            onCloseRecord={() => push({ type: "closeout-review", potId: pot.id })}
            onDeletePot={() => {
                void handleDeletePot(pot.id);
            }}
            onArchivePot={() => {
                void handleArchivePot(pot.id);
            }}
            onLeavePot={() => {
                void handleLeavePot(pot.id);
            }}
            onOpenSpendCard={() => push({ type: "spend-card", potId: pot.id })}
        />
    );
}

export function renderCloseoutReview(ctx: RouterContext) {
    const {
        screen,
        nav: { back, replace },
        data: { currentPot, pots },
        userState: { user, isGuest },
        actions: { persistPotPartial, showToast },
    } = ctx;

    if (!screen || screen.type !== "closeout-review") return null;
    const pot = currentPot?.id === screen.potId
        ? currentPot
        : pots.find((candidate) => candidate.id === screen.potId);
    if (!pot) return null;

    const members = normalizeMembers(pot.members);
    const expenses = normalizeExpenses(pot.expenses, pot.baseCurrency);
    const currentUserId = isGuest ? "owner" : (user?.id || "owner");
    const legs = buildCloseRecordLegs({
        potId: pot.id,
        potName: pot.name,
        members,
        expenses,
        baseCurrency: pot.baseCurrency,
        currentUserId,
        confirmedLegs: ((pot as any).chapter?.legs ?? []).filter(
            (leg: ConfirmedLegAdjustment) => leg.state === 'confirmed',
        ),
    });

    return (
        <CloseoutReview
            potName={pot.name}
            legs={legs}
            members={members}
            baseCurrency={pot.baseCurrency}
            currentUserId={currentUserId}
            onCancel={back}
            onClose={async (annotation) => {
                const now = new Date().toISOString();
                const closeout = {
                    id: `closeout-${Date.now()}`,
                    potId: pot.id,
                    closedAt: now,
                    annotation,
                    legs,
                };
                const historyEntry = {
                    id: `event-${Date.now()}`,
                    type: "chapter_closed",
                    actorId: currentUserId,
                    timestamp: now,
                    meta: {
                        annotation,
                        openItems: legs.filter((leg) => leg.status !== "confirmed").length,
                    },
                };
                await persistPotPartial(pot.id, {
                    closeouts: [...((pot as any).closeouts || []), closeout],
                    history: [...((pot as any).history || []), historyEntry],
                    lastEditAt: now,
                });
                showToast("Record saved", "success");
                replace({ type: "pot-home", potId: pot.id });
            }}
        />
    );
}

function buildCloseRecordLegs({
    potId,
    potName,
    members,
    expenses,
    baseCurrency,
    currentUserId,
    confirmedLegs = [],
}: {
    potId: string;
    potName: string;
    members: Array<{ id: string; name: string; role?: string; status?: string }>;
    expenses: Array<{
        id: string;
        amount: number;
        currency: string;
        paidBy: string;
        memo: string;
        date: string;
        split: { memberId: string; amount: number }[];
        attestations: string[] | Array<{ memberId: string; confirmedAt: string }>;
        hasReceipt: boolean;
        receiptUrl?: string;
    }>;
    baseCurrency: string;
    currentUserId: string;
    confirmedLegs?: ConfirmedLegAdjustment[];
}): SettlementLeg[] {
    const potForCalc = {
        id: potId,
        name: potName,
        type: "expense" as const,
        baseCurrency,
        members: members.map((member) => ({
            id: member.id,
            name: member.name,
            role: "Member" as const,
            status: "active" as const,
        })),
        expenses,
        history: [],
        archived: false,
    };
    const calculated = applyConfirmedLegAdjustments(
        calculatePotSettlements(potForCalc as any, currentUserId),
        members,
        {
            currentUserId,
            potName,
            baseCurrency,
            confirmedLegs,
        },
    );
    const createdAt = new Date().toISOString();
    const owedToYou = calculated.owedToYou.map((person) => ({
        id: `close-leg-${potId}-${person.id}-to-${currentUserId}`,
        potId,
        fromMemberId: person.id,
        toMemberId: currentUserId,
        amount: person.totalAmount,
        currency: person.breakdown[0]?.currency || baseCurrency,
        status: "pending" as const,
        createdAt,
    }));
    const youOwe = calculated.youOwe.map((person) => ({
        id: `close-leg-${potId}-${currentUserId}-to-${person.id}`,
        potId,
        fromMemberId: currentUserId,
        toMemberId: person.id,
        amount: person.totalAmount,
        currency: person.breakdown[0]?.currency || baseCurrency,
        status: "pending" as const,
        createdAt,
    }));
    return [...owedToYou, ...youOwe];
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
        nav: { back },
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
