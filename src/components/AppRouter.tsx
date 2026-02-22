import { lazy } from "react";
import { Screen } from "../nav";
import {
    Pot,
    ActivityItem,
    Person,
    Settlement as StoredSettlement,
} from "../types/app";
import {
    normalizeMembers,
    normalizeExpenses,
    normalizeConfirmations
} from "../utils/normalization";
import { PaymentMethod } from "./screens/PaymentMethods";
import { Notification } from "./screens/NotificationCenter";

// Lazy imports
const Settings = lazy(() =>
    import("./screens/Settings").then((module) => ({ default: module.Settings }))
);
const PaymentMethods = lazy(() =>
    import("./screens/PaymentMethods").then((module) => ({ default: module.PaymentMethods }))
);
const CreatePot = lazy(() =>
    import("./screens/CreatePot").then((module) => ({ default: module.CreatePot }))
);
const PotHome = lazy(() =>
    import("./screens/PotHome").then((module) => ({ default: module.PotHome }))
);
const AddExpense = lazy(() =>
    import("./screens/AddExpense").then((module) => ({ default: module.AddExpense }))
);
const ExpenseDetail = lazy(() =>
    import("./screens/ExpenseDetail").then((module) => ({ default: module.ExpenseDetail }))
);
const SettleSelection = lazy(() =>
    import("./screens/SettleSelection").then((module) => ({ default: module.SettleSelection }))
);
const SettleHome = lazy(() =>
    import("./screens/SettleHome").then((module) => ({ default: module.SettleHome }))
);
const SettlementHistory = lazy(() =>
    import("./screens/SettlementHistory").then((module) => ({ default: module.SettlementHistory }))
);
const SettlementConfirmation = lazy(() =>
    import("./screens/SettlementConfirmation").then((module) => ({ default: module.SettlementConfirmation }))
);
const InsightsScreen = lazy(() =>
    import("./screens/InsightsScreen").then((module) => ({ default: module.InsightsScreen }))
);
const MemberDetail = lazy(() =>
    import("./screens/MemberDetail").then((module) => ({ default: module.MemberDetail }))
);
const AddContribution = lazy(() =>
    import("./screens/AddContribution").then((module) => ({ default: module.AddContribution }))
);
const WithdrawFunds = lazy(() =>
    import("./screens/WithdrawFunds").then((module) => ({ default: module.WithdrawFunds }))
);
const RequestPayment = lazy(() =>
    import("./screens/RequestPayment").then((module) => ({ default: module.RequestPayment }))
);
const CrustStorage = lazy(() =>
    import("./screens/CrustStorage").then((module) => ({ default: module.CrustStorage }))
);
const CrustAuthSetup = lazy(() =>
    import("./screens/CrustAuthSetup").then((module) => ({ default: module.CrustAuthSetup }))
);
const ReceiveQR = lazy(() =>
    import("./screens/ReceiveQR").then((module) => ({ default: module.ReceiveQR }))
);
const ImportPot = lazy(() =>
    import("./screens/ImportPot").then((module) => ({ default: module.ImportPot }))
);
import { ActivityHome } from "./screens/ActivityHome";
import { PotsHome } from "./screens/PotsHome";
import { PeopleHome } from "./screens/PeopleHome";
import { YouTab } from "./screens/YouTab";
import { calculatePotSettlements, CalculatedSettlements } from "../utils/settlements";
import type { SettleHomeSettlement } from "../hooks/useSettlementActions";

export interface AppRouterProps {
    screen: Screen | null;
    nav: {
        push: (screen: Screen) => void;
        replace: (screen: Screen) => void;
        back: () => void;
        reset: (screen: Screen) => void;
    };
    data: {
        pots: Pot[];
        currentPot: Pot | null;
        currentPotId: string | null;
        currentPotLoading: boolean;
        hasLoadedInitialData: boolean;
        people: Person[];
        balances: CalculatedSettlements;
        totalOwed: number;
        totalOwing: number;
        pendingExpenses: Array<{
            id: string;
            memo: string;
            amount: number;
            currency?: string;
            paidBy: string;
            potName: string;
        }>;
        activities: ActivityItem[];
        normalizedCurrentPot?: Pot;
        youTabInsights: {
            monthlySpending: number;
            expensesNeedingConfirmation: number;
            expensesConfirmed: number;
            topCategory: string;
            topCategoryAmount: number;
            activePots: number;
            totalSettled: number;
            confirmationRate: number;
            settlementsCompleted: number;
            activeGroups: number;
        };
        settlements: StoredSettlement[];
    };
    userState: {
        user: any;
        authLoading: boolean;
        isAuthenticated: boolean;
        isGuest: boolean;
        notifications: Notification[];
        walletConnected: boolean;
        connectedWallet: any;
    };
    uiState: {
        theme: "light" | "dark" | "system";
        showNotifications: boolean;
        paymentMethods: PaymentMethod[];
        preferredMethodId: string;
        invitesByPot: Record<string, any[]>; // Define tighter if possible
        pendingInviteToken: string | null;
        isProcessingInvite: boolean;
        pendingInvites: any[];
        fabQuickAddPotId: string | null;
    };
    actions: {
        setPots: (pots: Pot[]) => void;
        setCurrentPotId: (id: string | null) => void;
        setCurrentExpenseId: (id: string | null) => void;
        setWalletConnected: (connected: boolean) => void;
        setShowNotifications: (show: boolean) => void;
        setShowWalletSheet: (show: boolean) => void;
        setShowMyQR: (show: boolean) => void;
        setShowScanQR: (show: boolean) => void;
        setShowChoosePot: (show: boolean) => void;
        setShowAddMember: (show: boolean) => void;
        setShowAddPaymentMethod: (show: boolean) => void;
        setPaymentMethods: (fn: (prev: PaymentMethod[]) => PaymentMethod[]) => void;
        setPreferredMethodId: (id: string) => void;
        setTheme: (theme: "light" | "dark" | "system") => void;
        setFabQuickAddPotId: (id: string | null) => void;
        setNewPot: (pot: Partial<Pot>) => void;
        setSelectedCounterpartyId: (id: string | null) => void;
        setSettlements: (settlements: StoredSettlement[]) => void;
        setNotifications: (
            updater: (prev: Notification[]) => Notification[],
        ) => void;
        // Business Logic Actions
        createPot: () => Promise<void>;
        addExpenseToPot: (potId: string, data: any) => void;
        updateExpense: (data: any) => void;
        deleteExpense: (expenseId?: string, options?: { navigateBack?: boolean }) => void;
        attestExpense: (expenseId: string) => void;
        batchAttestExpenses: (expenseIds: string[]) => void;
        addContribution: (amount: number, method: "wallet" | "bank") => void;
        withdrawFunds: (amount: number) => void;
        handleLogout: () => void;
        handleDeleteAccount: () => void;
        updatePaymentMethodValue: (id: string, updates: Partial<PaymentMethod>) => void;
        setPreferredMethod: (id: string) => void;
        handleInviteNew: (email: string) => void;
        handleUpdateMember: (
            potId: string,
            member: { id: string; name: string; address?: string; verified?: boolean },
        ) => void;
        handleRemoveMember: (potId: string, memberId: string) => void;
        acceptInvite: (token: string) => void;
        declineInvite: (token: string) => void;
        confirmSettlement: (params: {
            method: "cash" | "bank" | "paypal" | "twint" | "dot";
            reference?: string;
            settlement: SettleHomeSettlement;
        }) => Promise<void>;
        showToast: (msg: string, type?: "success" | "error" | "info") => void;
        // State wrappers
        newPotState: Partial<Pot>;
        joinProcessingRef: React.MutableRefObject<boolean>;
        selectedCounterpartyId: string | null;
    };
    flags: {
        DEMO_MODE: boolean;
        POLKADOT_APP_ENABLED: boolean;
    };
}

export const AppRouter = ({
    screen,
    nav: { push, replace, back, reset },
    data: {
        pots, currentPot, currentPotId, currentPotLoading, hasLoadedInitialData,
        people, balances, totalOwed, totalOwing, pendingExpenses, activities,
        normalizedCurrentPot, youTabInsights, settlements
    },
    userState: {
        user, notifications, walletConnected, isGuest
    },
    uiState: {
        theme, paymentMethods, preferredMethodId,
        invitesByPot, pendingInvites,
        fabQuickAddPotId
    },
    actions: {
        setPots, setCurrentPotId, setCurrentExpenseId, setWalletConnected,
        setShowNotifications, setShowWalletSheet, setShowMyQR, setShowScanQR,
        setShowChoosePot, setShowAddMember,
        setPreferredMethodId, setTheme, setFabQuickAddPotId, setNewPot,
        setSelectedCounterpartyId, setNotifications,
        createPot, addExpenseToPot, updateExpense, deleteExpense, attestExpense,
        batchAttestExpenses, addContribution, withdrawFunds, handleLogout,
        handleDeleteAccount, updatePaymentMethodValue, setPreferredMethod,
        handleUpdateMember, handleRemoveMember,
        acceptInvite, declineInvite, confirmSettlement, showToast,
        newPotState, joinProcessingRef, selectedCounterpartyId
    },
    flags: { DEMO_MODE, POLKADOT_APP_ENABLED }
}: AppRouterProps) => {
    const pot: Pot | null | undefined = currentPot;

    if (!screen) return null;

    switch (screen.type) {
        case "activity-home":
            return (
                <ActivityHome
                    totalOwed={totalOwed}
                    totalOwing={totalOwing}
                    activities={activities}
                    pendingExpenses={pendingExpenses}
                    topPersonToSettle={undefined}
                    hasPendingAttestations={pendingExpenses.length > 0}
                    onActivityClick={(activity) => {
                        if (activity.type === "expense") {
                            const pot = pots.find((p) =>
                                p.expenses.some((e) => e.id === activity.id),
                            );
                            if (pot) {
                                setCurrentPotId(pot.id);
                                setCurrentExpenseId(activity.id);
                                push({
                                    type: "expense-detail",
                                    expenseId: activity.id,
                                });
                            }
                        } else if (activity.type === "attestation") {
                            const expenseId =
                                activity.id.split("-attestation-")[0];
                            const pot = pots.find((p) =>
                                p.expenses.some((e) => e.id === expenseId),
                            );
                            if (pot) {
                                setCurrentPotId(pot.id);
                                setCurrentExpenseId(expenseId!);
                                push({ type: "expense-detail", expenseId: expenseId! });
                            }
                        } else if (activity.type === "pot_created") {
                            const potId = activity.id.replace("pot-created-", "");
                            const pot = pots.find((p) => p.id === potId);
                            if (pot) {
                                setCurrentPotId(pot.id);
                                push({ type: "pot-home", potId: pot.id });
                            }
                        } else {
                            showToast(
                                `${activity.type} activities coming soon`,
                                "info",
                            );
                        }
                    }}
                    onNotificationClick={() => {
                        // triggerHaptic("light"); // Haptic triggered in App.tsx wrapper or here? Passed as prop?
                        // Haptics imported in App.tsx. Should arguably be in router or action.
                        // For now assuming wrapper handles it or importing haptic utils here.
                        setShowNotifications(true);
                    }}
                    onWalletClick={() => {
                        if (DEMO_MODE) {
                            showToast("Wallet disabled in demo", "info");
                            return;
                        }
                        if (!POLKADOT_APP_ENABLED) {
                            showToast("Wallet feature disabled", "info");
                            return;
                        }
                        setShowWalletSheet(true);
                    }}
                    walletConnected={walletConnected}
                    onRefresh={async () => {
                        await new Promise((resolve) =>
                            setTimeout(resolve, 1000),
                        );
                    }}
                    notificationCount={
                        notifications.filter((n) => !n.read).length
                    }
                />
            );

        case "pots-home":
            const potSummaries = pots.filter(p => !p.archived).map((pot) => {
                const myExpenses = pot.expenses
                    .filter((e) => e.paidBy === "owner")
                    .reduce((sum, e) => sum + e.amount, 0);

                const totalExpenses = pot.expenses.reduce(
                    (sum, e) => sum + e.amount,
                    0,
                );

                const myShare = pot.expenses.reduce((sum, e) => {
                    const split = e.split.find(
                        (s) => s.memberId === "owner",
                    );
                    return sum + (split?.amount || 0);
                }, 0);

                const net = myExpenses - myShare;

                return {
                    id: pot.id,
                    name: pot.name,
                    type: pot.type,
                    myExpenses,
                    totalExpenses,
                    net,
                    budget: pot.budget,
                    budgetEnabled: pot.budgetEnabled,
                    totalPooled: pot.totalPooled,
                    yieldRate: pot.yieldRate,
                };
            });

            return (
                <PotsHome
                    pots={potSummaries}
                    youOwe={balances.youOwe.map(p => ({ ...p, totalAmount: Number(p.totalAmount) })) as any}
                    owedToYou={balances.owedToYou.map(p => ({ ...p, totalAmount: Number(p.totalAmount) })) as any}
                    onCreatePot={() => push({ type: "create-pot" })}
                    onPotClick={(potId) => {
                        setCurrentPotId(potId);
                        push({ type: "pot-home", potId });
                    }}
                    pendingInvites={pendingInvites}
                    onAcceptInvite={(token) => {
                        joinProcessingRef.current = false;
                        acceptInvite(token);
                    }}
                    onDeclineInvite={(token: string) => {
                        joinProcessingRef.current = false;
                        declineInvite(token);
                    }}
                    onSettleWithPerson={(personId) => {
                        setSelectedCounterpartyId(personId);
                        push({ type: "settle-home" });
                    }}
                    // PotHome fix
                    onRemindSent={() => {
                        showToast("Reminder sent.");
                    }}
                    onNotificationClick={() => {
                        setShowNotifications(true);
                    }}
                    onWalletClick={() => {
                        if (DEMO_MODE) {
                            showToast("Wallet disabled in demo", "info");
                            return;
                        }
                        if (!POLKADOT_APP_ENABLED) {
                            showToast("Wallet feature disabled", "info");
                            return;
                        }
                        setShowWalletSheet(true);
                    }}
                    walletConnected={walletConnected}
                    notificationCount={
                        notifications.filter((n) => !n.read).length
                    }
                    onQuickAddExpense={() => {
                        if (pots.length === 0) {
                            showToast("Create a pot first!", "info");
                            return;
                        }
                        if (pots.length === 1) {
                            const pid = pots[0]!.id;
                            setCurrentPotId(pid);
                            push({ type: "pot-home", potId: pid });
                        } else {
                            setShowChoosePot(true);
                        }
                    }}
                    onQuickSettle={() => {
                        if (
                            balances.youOwe.length === 0 &&
                            balances.owedToYou.length === 0
                        ) {
                            showToast("Nothing to settle yet", "info");
                            return;
                        }
                        reset({ type: "people-home" });
                    }}
                    onQuickScan={() => {
                        setShowScanQR(true);
                    }}
                    onQuickRequest={() => {
                        if (balances.owedToYou.length === 0) {
                            showToast("Nobody owes you money yet", "info");
                            return;
                        }
                        push({ type: "request-payment" });
                    }}
                />
            );

        case "settlements-home":
        case "people-home":
            return (
                <PeopleHome
                    isLoading={!hasLoadedInitialData}
                    youOwe={balances.youOwe.map(p => ({ ...p, totalAmount: Number(p.totalAmount) })) as any}
                    owedToYou={balances.owedToYou.map(p => ({ ...p, totalAmount: Number(p.totalAmount) })) as any}
                    people={people.map(p => ({
                        ...p,
                        balance: Number(balances.byPerson.get(p.id) || "0")
                    }))}
                    onSettle={(personId) => {
                        setSelectedCounterpartyId(personId);
                        push({ type: "settle-home" });
                    }}
                    onPersonClick={(person) => {
                        push({ type: "member-detail", memberId: person.id });
                    }}
                    onNotificationClick={() => {
                        setShowNotifications(true);
                    }}
                    onWalletClick={() => {
                        if (DEMO_MODE) {
                            showToast("Wallet disabled in demo", "info");
                            return;
                        }
                        if (!POLKADOT_APP_ENABLED) {
                            showToast("Wallet feature disabled", "info");
                            return;
                        }
                        setShowWalletSheet(true);
                    }}
                    walletConnected={walletConnected}
                    notificationCount={
                        notifications.filter((n) => !n.read).length
                    }
                    onConnectWallet={() => setWalletConnected(true)}
                />
            );

        case "you-tab":
            return (
                <YouTab
                    onShowQR={() => {
                        setShowMyQR(true);
                    }}
                    onScanQR={() => {
                        setShowScanQR(true);
                    }}
                    onReceive={() => {
                        if (!walletConnected && user?.status !== 'connected') { // Adjusted logic
                            // simplified
                            if (!walletConnected) {
                                showToast("Connect wallet first", "info");
                                return;
                            }
                        }
                        push({ type: "receive-qr" });
                    }}
                    onPaymentMethods={() => {
                        push({ type: "payment-methods" });
                    }}
                    onViewInsights={() => {
                        push({ type: "insights" });
                    }}
                    onSettings={() => {
                        push({ type: "settings" });
                    }}
                    onCrustStorage={() => {
                        push({ type: "crust-storage" });
                    }}
                    onNotificationClick={() => {
                        setShowNotifications(true);
                    }}
                    onWalletClick={() => {
                        if (DEMO_MODE) {
                            showToast("Wallet disabled in demo", "info");
                            return;
                        }
                        if (!POLKADOT_APP_ENABLED) {
                            showToast("Wallet feature disabled", "info");
                            return;
                        }
                        setShowWalletSheet(true);
                    }}
                    walletConnected={walletConnected}
                    notificationCount={
                        notifications.filter((n) => !n.read).length
                    }
                    insights={youTabInsights}
                    theme={theme}
                    onThemeChange={setTheme}
                    onLogout={handleLogout}
                    onDeleteAccount={handleDeleteAccount}
                    userName={user?.name || "You"}
                    userEmail={user?.email}
                    isGuest={user?.isGuest || false}
                />
            );

        case "settings":
            return (
                <Settings
                    onBack={back}
                    onPaymentMethods={() =>
                        push({ type: "payment-methods" })
                    }
                    onCrustStorage={() =>
                        push({ type: "crust-storage" })
                    }
                    onLogout={handleLogout}
                    onDeleteAccount={handleDeleteAccount}
                    theme={theme}
                    onThemeChange={setTheme}
                />
            );

        case "payment-methods":
            return (
                <PaymentMethods
                    methods={paymentMethods}
                    preferredMethodId={preferredMethodId}
                    onBack={back}
                    onUpdateMethod={(kind, value) => {
                        const target = paymentMethods.find(m => m.kind === kind);
                        if (!target) return;
                        const updates: Partial<PaymentMethod> =
                            kind === 'bank' ? { iban: value } :
                                kind === 'twint' ? { phone: value } :
                                    kind === 'paypal' ? { email: value } :
                                        { address: value };
                        updatePaymentMethodValue(target.id, updates);
                    }}
                    onSetPreferred={(methodId: string | null) => {
                        if (methodId) setPreferredMethod(methodId);
                        else setPreferredMethodId("");
                    }}
                />
            );

        case "insights":
            // Calculate insights data
            const insightsMonthlyData = [ // Placeholder
                { month: "Jan", amount: 0 },
                { month: "Feb", amount: 0 },
                { month: "Mar", amount: 0 },
            ];

            return (
                <InsightsScreen
                    onBack={back}
                    monthlySpending={youTabInsights.monthlySpending}
                    activePots={pots.filter(p => !p.archived).length}
                    totalSettled={settlements.reduce((sum, s) => sum + parseFloat(s.amount), 0)}
                    monthlyData={insightsMonthlyData}
                    confirmationRate={youTabInsights.expensesNeedingConfirmation + youTabInsights.expensesConfirmed === 0 ? 0 : Math.round((youTabInsights.expensesConfirmed / (youTabInsights.expensesNeedingConfirmation + youTabInsights.expensesConfirmed)) * 100)}
                    expensesConfirmed={youTabInsights.expensesConfirmed}
                    settlementsCompleted={settlements.length}
                    activeGroups={pots.length}
                />
            );

        case "member-detail":
            if (!screen || !('memberId' in screen)) return null;
            const mDetailId = (screen as any).memberId;
            const mDetailPerson = people.find(p => p.id === mDetailId);

            if (!mDetailPerson) return null;

            const mSharedPots = pots.filter(p => !p.archived && p.members.some(m => m.id === mDetailId)).map(p => {
                // Simplified
                return { id: p.id, name: p.name, yourBalance: 0 };
            });

            const mRecentSettlements = settlements.filter(s => s.personId === mDetailId).map(s => ({
                id: s.id,
                amount: parseFloat(s.amount),
                method: s.method,
                date: s.date,
                direction: "sent" as const
            }));

            return (
                <MemberDetail
                    memberId={mDetailId}
                    memberName={mDetailPerson.name}
                    trustScore={mDetailPerson.trustScore}
                    sharedPots={mSharedPots}
                    recentSettlements={mRecentSettlements}
                    paymentPreference={mDetailPerson.paymentPreference as any}
                    totalBalance={Number(mDetailPerson.balance)}
                    onBack={back}
                    onSettle={() => {
                        setSelectedCounterpartyId(mDetailId);
                        push({ type: "settle-home" });
                    }}
                />
            );

        case "create-pot":
            return (
                <CreatePot
                    potName={newPotState.name || ""}
                    setPotName={(name) =>
                        setNewPot({ ...newPotState, name })
                    }
                    potType={newPotState.type || "expense"}
                    setPotType={(type) =>
                        setNewPot({ ...newPotState, type })
                    }
                    baseCurrency={newPotState.baseCurrency || "USD"}
                    setBaseCurrency={(currency) =>
                        setNewPot({ ...newPotState, baseCurrency: currency })
                    }
                    members={newPotState.members || []}
                    setMembers={(members) =>
                        setNewPot({
                            ...newPotState,
                            members: members.map((m) => ({
                                id: m.id,
                                name: m.name,
                                role: "Member",
                                status: "active",
                                address: m.address, // Preserve wallet address
                                verified: m.verified, // Preserve verification status
                            })),
                        })
                    }
                    goalAmount={newPotState.goalAmount}
                    setGoalAmount={(amount) =>
                        setNewPot({ ...newPotState, goalAmount: amount })
                    }
                    goalDescription={newPotState.goalDescription}
                    setGoalDescription={(description) =>
                        setNewPot({
                            ...newPotState,
                            goalDescription: description,
                        })
                    }
                    onBack={back}
                    onCreate={createPot}
                />
            );

        case "pot-home":
            if (!pot) return null;
            const potInvites = invitesByPot[pot.id] || [];
            // Filter out accepted invites (they're now in pot.members via pot_members table)
            const pendingMemberInvites = potInvites.filter((inv) => inv.status === "pending");
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
                pot.currentCheckpoint?.confirmations,
            );
            return (
                <PotHome
                    potId={pot.id}
                    potType={pot.type}
                    potName={pot.name}
                    baseCurrency={pot.baseCurrency}
                    currentUserId={user?.id || 'owner'}
                    members={mergedMembers}
                    expenses={normalizedExp}
                    budget={pot.budget ?? undefined}
                    budgetEnabled={pot.budgetEnabled}
                    checkpointEnabled={pot.checkpointEnabled}
                    hasActiveCheckpoint={
                        pot.currentCheckpoint?.status === "pending"
                    }
                    checkpointConfirmations={
                        normalizedCheckpointConfirmations
                    }
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
                        const normalizedSettings: Partial<Pot> = {};

                        if (typeof settings?.potName === "string") {
                            normalizedSettings.name = settings.potName;
                        }
                        if (typeof settings?.baseCurrency === "string") {
                            normalizedSettings.baseCurrency = settings.baseCurrency;
                        }
                        if (typeof settings?.budgetEnabled === "boolean") {
                            normalizedSettings.budgetEnabled = settings.budgetEnabled;
                        }
                        if ("budget" in (settings || {})) {
                            normalizedSettings.budget = settings.budget;
                        }

                        setPots(
                            pots.map((p) =>
                                p.id === pot.id
                                    ? { ...p, ...normalizedSettings }
                                    : p,
                            ),
                        );
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
                    onAddContribution={() =>
                        push({ type: "add-contribution" })
                    }
                    onWithdraw={() => push({ type: "withdraw-funds" })}
                    onViewCheckpoint={() =>
                        push({ type: "checkpoint-status" })
                    }
                    onQuickAddSave={(data) => {
                        setCurrentPotId(pot.id);
                        addExpenseToPot(pot.id, data);
                    }}
                    openQuickAdd={fabQuickAddPotId === pot.id}
                    onClearQuickAdd={() => setFabQuickAddPotId(null)}
                    onRemoveMember={(id) => {
                        if (!currentPotId) return;
                        if (id === "owner") {
                            showToast("Owner cannot be removed", "info");
                            return;
                        }
                        if (id.startsWith("invite-")) {
                            showToast("Use invite actions for pending members", "info");
                            return;
                        }
                        handleRemoveMember(currentPotId, id);
                    }}
                    onSettle={() => push({ type: "settle-selection" })}
                />
            );

        case "add-expense":
            if (!pot) return null;
            const addExpenseMembers = normalizeMembers(pot.members);
            return (
                <AddExpense
                    potName={pot.name}
                    members={addExpenseMembers}
                    baseCurrency={pot.baseCurrency}
                    onBack={back}
                    onSave={(data) => addExpenseToPot(pot.id, data)}
                />
            );

        case "edit-expense":
            if (!pot) return null;
            if (!("expenseId" in screen)) return null;
            const editExpenseMembers = normalizeMembers(pot.members);
            const editExpenses = normalizeExpenses(pot.expenses, pot.baseCurrency);
            const editingExpense = editExpenses.find(
                (e) => e.id === (screen as any).expenseId,
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

        case "expense-detail":
            if (!pot && (currentPotLoading || !hasLoadedInitialData)) {
                return (
                    <ExpenseDetail
                        currentUserId={user?.id || 'owner'}
                        baseCurrency={(pot as Pot | null | undefined)?.baseCurrency || 'USD'}
                        walletConnected={walletConnected}
                        onBack={back}
                        isLoading
                        onEdit={() => undefined}
                        onDelete={() => undefined}
                        onAttest={() => undefined}
                        onCopyReceiptLink={() => undefined}
                        onConnectWallet={() => setWalletConnected(true)}
                        // Props missing: expense, members (optional in loading)
                        expense={undefined as any}
                        members={[]}
                    />
                );
            }
            if (!pot) return null;
            if (!("expenseId" in screen)) return null;

            const detailMembers = normalizeMembers(pot.members);
            const detailExpenses = normalizeExpenses(pot.expenses, pot.baseCurrency);
            const expense = detailExpenses.find(
                (e) => e.id === (screen as any).expenseId,
            );
            if (!expense) return null;

            return (
                <ExpenseDetail
                    expense={expense}
                    members={detailMembers}
                    currentUserId={user?.id || 'owner'}
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
                                                : e,
                                        ),
                                    }
                                    : p,
                            ),
                        );
                        showToast("Expense anchored on-chain", "success");
                    }}
                    onConnectWallet={() => setWalletConnected(true)}
                />
            );

        case "settle-selection":
            const settleCurrentUserId = isGuest ? 'owner' : (user?.id || 'owner');
            const potSettlements =
                normalizedCurrentPot
                    ? calculatePotSettlements(normalizedCurrentPot as any, settleCurrentUserId)
                    : balances; // Assuming balances passed from props matches this structure

            const selectionBalances = [
                ...potSettlements.youOwe.map((p) => ({
                    id: p.id,
                    name: p.name,
                    amount: Number(p.totalAmount),
                    direction: "owe" as const,
                    trustScore: p.trustScore,
                    paymentPreference: p.paymentPreference,
                })),
                ...potSettlements.owedToYou.map((p) => ({
                    id: p.id,
                    name: p.name,
                    amount: Number(p.totalAmount),
                    direction: "owed" as const,
                    trustScore: p.trustScore,
                    paymentPreference: p.paymentPreference,
                })),
            ];

            return (
                <SettleSelection
                    potName={currentPot?.name}
                    balances={selectionBalances}
                    baseCurrency={currentPot?.baseCurrency || "USD"}
                    onBack={() => {
                        if (currentPotId) {
                            replace({ type: "pot-home", potId: currentPotId });
                        } else {
                            reset({ type: "people-home" });
                        }
                    }}
                    onSelectPerson={(personId) => {
                        setSelectedCounterpartyId(personId);
                        push({ type: "settle-home" });
                    }}
                />
            );

        case "settle-home":
            const shCurrentUserId = isGuest ? 'owner' : (user?.id || 'owner');
            const shLabel = currentPot ? currentPot.name : "All pots";
            const shCurrency = currentPot?.baseCurrency || "USD";
            const personIdFromNav = selectedCounterpartyId;

            // Re-do mapping cleanly
            const sourceData = currentPotId && normalizedCurrentPot
                ? calculatePotSettlements(normalizedCurrentPot as any, shCurrentUserId)
                : balances; /* Global balances already separated */

            const reMappedSettlements: SettleHomeSettlement[] = [];
            sourceData.youOwe.forEach(p => {
                if (!personIdFromNav || p.id === personIdFromNav) {
                    reMappedSettlements.push({
                        id: p.id,
                        name: p.name,
                        totalAmount: Number(p.totalAmount), // NUMBER
                        direction: "owe",
                        pots: p.breakdown.map(b => ({ potId: b.potName, potName: b.potName, amount: b.amount }))
                    });
                }
            });
            sourceData.owedToYou.forEach(p => {
                if (!personIdFromNav || p.id === personIdFromNav) {
                    reMappedSettlements.push({
                        id: p.id,
                        name: p.name,
                        totalAmount: Number(p.totalAmount), // NUMBER
                        direction: "owed",
                        pots: p.breakdown.map(b => ({ potId: b.potName, potName: b.potName, amount: b.amount }))
                    });
                }
            });

            const hasPersonMatch = !!personIdFromNav && reMappedSettlements.some((s) => s.id === personIdFromNav);
            const targetCounterpartyId = hasPersonMatch ? personIdFromNav : reMappedSettlements[0]?.id;
            const selectedCounterparty = [...sourceData.youOwe, ...sourceData.owedToYou]
                .find((p) => p.id === targetCounterpartyId);

            const memberById =
                normalizedCurrentPot?.members?.find((m) => m.id === targetCounterpartyId) ||
                currentPot?.members?.find((m) => m.id === targetCounterpartyId);
            const memberByName = selectedCounterparty?.name
                ? (normalizedCurrentPot?.members?.find((m) => m.name === selectedCounterparty.name) ||
                    currentPot?.members?.find((m) => m.name === selectedCounterparty.name))
                : undefined;
            const recipientAddress =
                selectedCounterparty?.address ||
                memberById?.address ||
                memberByName?.address;
            const preferredMethod = selectedCounterparty?.paymentPreference;


            return (
                <SettleHome
                    onBack={() => {
                        if (currentPotId) {
                            replace({ type: "settle-selection" });
                        } else {
                            reset({ type: "people-home" });
                        }
                    }}
                    settlements={reMappedSettlements}
                    scope={currentPotId ? "pot" : "global"}
                    scopeLabel={shLabel}
                    potId={currentPotId || undefined}
                    personId={personIdFromNav || undefined}
                    preferredMethod={preferredMethod}
                    recipientAddress={recipientAddress}
                    baseCurrency={shCurrency}
                    onShowToast={showToast}
                    pot={
                        normalizedCurrentPot
                            ? ({ ...normalizedCurrentPot, mode: "casual" as const } as any)
                            : undefined
                    }
                    onUpdatePot={(updates) => {
                        if (currentPot) {
                            setPots(pots.map(p => p.id === currentPotId ? { ...p, ...updates } : p));
                        }
                    }}
                    onConfirm={async (method, reference) => {
                        const targetSettlementId = personIdFromNav || reMappedSettlements[0]?.id;
                        const settlement = reMappedSettlements.find(s => s.id === targetSettlementId);
                        if (!settlement) {
                            showToast("Error: Could not find settlement details", "error");
                            return;
                        }
                        await confirmSettlement({
                            method,
                            reference,
                            settlement,
                        });
                    }}
                    onHistory={() => {
                        push({ type: "settlement-history" });
                    }}
                />
            );

        case "settlement-history":
            return (
                <SettlementHistory
                    onBack={back}
                    settlements={settlements.map((s) => ({
                        id: s.id,
                        method: s.method,
                        personName: people.find((p) => p.id === s.personId)?.name || s.personId,
                        amount: Number(s.amount),
                        currency: s.currency,
                        date: s.date,
                        txHash: s.txHash,
                        potNames: s.potIds?.map((pid) => pots.find((p) => p.id === pid)?.name || pid),
                        personId: s.personId,
                    })) as any}
                />
            );

        case "settlement-confirmation":
            return <SettlementConfirmation
                onBack={back}
                result={null as any}
                onViewHistory={() => push({ type: "settlement-history" })}
                onDone={() => reset({ type: "pots-home" })}
            />;


        case "add-contribution":
            if (!pot) return null;
            return <AddContribution
                potName={pot.name}
                baseCurrency={pot.baseCurrency}
                currentBalance={0}
                yieldRate={pot.yieldRate || 0}
                onBack={back}
                defiProtocol={pot.defiProtocol || ""}
                onConfirm={(amount) => addContribution(amount, "bank")} // defaulting method
            />;

        case "withdraw-funds":
            if (!pot) return null;
            return <WithdrawFunds
                potName={pot.name}
                baseCurrency={pot.baseCurrency}
                yourBalance={0}
                totalPooled={pot.totalPooled || 0}
                yieldRate={pot.yieldRate || 0}
                onBack={back}
                defiProtocol={pot.defiProtocol || ""}
                onConfirm={(amount) => withdrawFunds(amount)}
            />;

        case "request-payment":
            return <RequestPayment
                onBack={back}
                people={balances.owedToYou.map((person) => ({
                    ...person,
                    totalAmount: Number(person.totalAmount),
                    paymentPreference: person.paymentPreference || "Any method",
                })) as any}
                onSendRequest={(personId, message) => {
                    const person = balances.owedToYou.find((p) => p.id === personId);
                    if (!person) {
                        showToast("Could not find person to request", "error");
                        return;
                    }

                    const amount = Number(person.totalAmount);
                    const notification: Notification = {
                        id: `${Date.now()}-${personId}`,
                        type: "settlement",
                        title: "Payment request",
                        message:
                            message.trim() ||
                            `You requested payment of $${amount.toFixed(2)} from ${person.name}`,
                        timestamp: new Date().toISOString(),
                        read: false,
                    };

                    setNotifications((prev) => [notification, ...prev]);
                    showToast(`Request sent to ${person.name}`, "success");
                }}
            />;

        case "crust-storage":
            return <CrustStorage />;

        case "crust-auth-setup":
            return <CrustAuthSetup onBack={back} />;

        case "receive-qr":
            // ReceiveQR Logic
            return <ReceiveQR onClose={back} walletAddress={user?.id} />;

        case "import-pot":
            return <ImportPot onBack={back} onImport={(p) => {
                setPots([...pots, p as Pot]);
                replace({ type: 'pot-home', potId: p.id });
            }} />;

        default:
            return null;
    }
};
