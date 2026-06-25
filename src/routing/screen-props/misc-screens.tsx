import { lazy } from "react";
import type { AppRouterProps } from './types';
import { Pot } from "../../types/app";
import { PaymentMethod } from "../../components/screens/PaymentMethods";
import { Notification } from "../../components/screens/NotificationCenter";
import {
    buildPaymentRequestNotificationMessage,
    type RequestPaymentPerson,
} from "../../utils/requestPayment";
import { addImportedPot, persistImportedPot } from "../../utils/importedPot";

type RouterContext = AppRouterProps;

const Settings = lazy(() =>
    import("../../components/screens/Settings").then((module) => ({ default: module.Settings }))
);
const PaymentMethods = lazy(() =>
    import("../../components/screens/PaymentMethods").then((module) => ({ default: module.PaymentMethods }))
);
const InsightsScreen = lazy(() =>
    import("../../components/screens/InsightsScreen").then((module) => ({ default: module.InsightsScreen }))
);
const MemberDetail = lazy(() =>
    import("../../components/screens/MemberDetail").then((module) => ({ default: module.MemberDetail }))
);
const CreatePot = lazy(() =>
    import("../../components/screens/CreatePot").then((module) => ({ default: module.CreatePot }))
);
const AddContribution = lazy(() =>
    import("../../components/screens/AddContribution").then((module) => ({ default: module.AddContribution }))
);
const WithdrawFunds = lazy(() =>
    import("../../components/screens/WithdrawFunds").then((module) => ({ default: module.WithdrawFunds }))
);
const RequestPayment = lazy(() =>
    import("../../components/screens/RequestPayment").then((module) => ({ default: module.RequestPayment }))
);
const CrustStorage = lazy(() =>
    import("../../components/screens/CrustStorage").then((module) => ({ default: module.CrustStorage }))
);
const CrustAuthSetup = lazy(() =>
    import("../../components/screens/CrustAuthSetup").then((module) => ({ default: module.CrustAuthSetup }))
);
const ReceiveQR = lazy(() =>
    import("../../components/screens/ReceiveQR").then((module) => ({ default: module.ReceiveQR }))
);
const ImportPot = lazy(() =>
    import("../../components/screens/ImportPot").then((module) => ({ default: module.ImportPot }))
);

export function buildRequestPaymentNotification(params: {
    person: RequestPaymentPerson;
    message: string;
    deliveryMethod?: string | null;
    timestamp?: Date;
}): Notification {
    const { person, message, deliveryMethod, timestamp = new Date() } = params;
    return {
        id: `${timestamp.getTime()}-${person.id}`,
        type: "settlement",
        title: "Payment request",
        message: buildPaymentRequestNotificationMessage(person, message, deliveryMethod),
        timestamp: timestamp.toISOString(),
        read: false,
    };
}

export function renderSettings(ctx: RouterContext) {
    const { nav: { push, back }, actions: { handleLogout, handleDeleteAccount, setTheme }, uiState: { theme } } = ctx;
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
}

export function renderPaymentMethods(ctx: RouterContext) {
    const { nav: { back }, uiState: { paymentMethods, preferredMethodId }, actions: { updatePaymentMethodValue, setPreferredMethod, setPreferredMethodId } } = ctx;
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
}

export function renderInsights(ctx: RouterContext) {
    const { nav: { back }, data: { pots, settlements, youTabInsights } } = ctx;
    const insightsMonthlyData = [
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
            settlementsCompleted={settlements.length}
            activeGroups={pots.length}
        />
    );
}

export function renderMemberDetail(ctx: RouterContext) {
    const screen = ctx.screen;
    if (!screen || screen.type !== "member-detail") return null;
    const mDetailId = screen.memberId;
    const { data: { people, pots, settlements }, nav: { push, back }, actions: { setSelectedCounterpartyId } } = ctx;
    const mDetailPerson = people.find(p => p.id === mDetailId);
    const currentUserId = ctx.userState.user?.id ?? 'owner';

    if (!mDetailPerson) return null;

    const mSharedPots = pots.filter(p => !p.archived && p.members.some(m => m.id === mDetailId)).map(p => {
        // Mirror the balance logic in MembersTab.getMemberBalance:
        // positive = they owe you, negative = you owe them
        let theirShareOfMyExpenses = 0;
        let myShareOfTheirExpenses = 0;
        p.expenses.forEach((expense) => {
            if (expense.paidBy === currentUserId) {
                const split = expense.split.find((s) => s.memberId === mDetailId);
                if (split) theirShareOfMyExpenses += split.amount;
            }
            if (expense.paidBy === mDetailId) {
                const split = expense.split.find((s) => s.memberId === currentUserId);
                if (split) myShareOfTheirExpenses += split.amount;
            }
        });
        return {
            id: p.id,
            name: p.name,
            yourBalance: theirShareOfMyExpenses - myShareOfTheirExpenses,
        };
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
}

export function renderCreatePot(ctx: RouterContext) {
    const { nav: { back }, actions: { createPot, newPotState, setNewPot } } = ctx;
    return (
        <CreatePot
            potName={newPotState.name || ""}
            setPotName={(name) =>
                setNewPot((current) => ({ ...current, name }))
            }
            potType={newPotState.type || "expense"}
            setPotType={(type) =>
                setNewPot((current) => ({ ...current, type, potIntent: type === "savings" ? "savings_circle" : "split", chapterMode: undefined }))
            }
            baseCurrency={newPotState.baseCurrency || "USD"}
            setBaseCurrency={(currency) =>
                setNewPot((current) => ({ ...current, baseCurrency: currency }))
            }
            members={newPotState.members || []}
            setMembers={(members) =>
                setNewPot((current) => ({
                    ...current,
                    members: members.map((m) => ({
                        id: m.id,
                        name: m.name,
                        role: "Member",
                        status: "active",
                        address: m.address,
                        verified: m.verified,
                    })),
                }))
            }
            goalAmount={newPotState.goalAmount}
            setGoalAmount={(amount) =>
                setNewPot((current) => ({ ...current, goalAmount: amount }))
            }
            goalDescription={newPotState.goalDescription}
            setGoalDescription={(description) =>
                setNewPot((current) => ({
                    ...current,
                    goalDescription: description,
                }))
            }
            onBack={back}
            onCreate={createPot}
        />
    );
}

export function renderAddContribution(ctx: RouterContext) {
    const pot = ctx.data.currentPot;
    if (!pot) return null;
    const { nav: { back }, actions: { addContribution } } = ctx;
    return (
        <AddContribution
            potName={pot.name}
            baseCurrency={pot.baseCurrency}
            currentBalance={pot.totalPooled || 0}
            yieldRate={pot.yieldRate || 0}
            onBack={back}
            defiProtocol={pot.defiProtocol || ""}
            onConfirm={(amount) => addContribution(amount, "bank")}
        />
    );
}

export function renderWithdrawFunds(ctx: RouterContext) {
    const pot = ctx.data.currentPot;
    if (!pot) return null;
    const { nav: { back }, actions: { withdrawFunds } } = ctx;
    return (
        <WithdrawFunds
            potName={pot.name}
            baseCurrency={pot.baseCurrency}
            yourBalance={pot.totalPooled || 0}
            totalPooled={pot.totalPooled || 0}
            yieldRate={pot.yieldRate || 0}
            onBack={back}
            defiProtocol={pot.defiProtocol || ""}
            onConfirm={(amount) => withdrawFunds(amount)}
        />
    );
}

export function renderRequestPayment(ctx: RouterContext) {
    const { nav: { back }, data: { balances }, actions: { setNotifications, showToast } } = ctx;
    return (
        <RequestPayment
            onBack={back}
            people={balances.owedToYou.map((person) => ({
                ...person,
                totalAmount: Number(person.totalAmount),
                paymentPreference: person.paymentPreference || "Any method",
            })) as any}
            onSendRequest={(personId, message, context) => {
                const person = balances.owedToYou.find((p) => p.id === personId);
                if (!person) {
                    showToast("Could not find person to request", "error");
                    return;
                }

                const requestPerson: RequestPaymentPerson = {
                    id: person.id,
                    name: person.name,
                    totalAmount: Number(person.totalAmount),
                    breakdown: person.breakdown,
                    paymentPreference: person.paymentPreference,
                };
                const notification = buildRequestPaymentNotification({
                    person: requestPerson,
                    message,
                    deliveryMethod: context.deliveryMethod,
                });

                setNotifications((prev) => [notification, ...prev]);
                showToast(`Request sent to ${person.name}`, "success");
            }}
        />
    );
}

export function renderCrustStorage(_ctx: RouterContext) {
    return <CrustStorage />;
}

export function renderCrustAuthSetup(ctx: RouterContext) {
    const { nav: { back } } = ctx;
    return <CrustAuthSetup onBack={back} />;
}

export function renderReceiveQR(ctx: RouterContext) {
    const { nav: { back }, userState: { user } } = ctx;
    return <ReceiveQR onClose={back} walletAddress={user?.id} />;
}

export function renderImportPot(ctx: RouterContext) {
    const { nav: { replace }, data: { pots }, actions: { setPots, showToast } } = ctx;
    const initialCid =
        typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('cid') ?? undefined
            : undefined;
    return (
        <ImportPot
            initialCid={initialCid}
            onBack={ctx.nav.back}
            onShowToast={showToast}
            onImport={(p) => {
                const importedPot = p as Pot;
                const commitImport = () => {
                    const persisted = persistImportedPot(importedPot);
                    setPots(addImportedPot(persisted.length ? persisted : pots, importedPot));
                };
                commitImport();
                window.setTimeout(commitImport, 250);
                replace({ type: 'pot-home', potId: p.id });
            }}
        />
    );
}
