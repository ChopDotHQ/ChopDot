import { lazy } from "react";
import type { AppRouterProps } from './types';

type RouterContext = AppRouterProps;

const Settings = lazy(() =>
    import("../../components/screens/Settings").then((module) => ({ default: module.Settings }))
);
const MemberDetail = lazy(() =>
    import("../../components/screens/MemberDetail").then((module) => ({ default: module.MemberDetail }))
);
const CreatePot = lazy(() =>
    import("../../components/screens/CreatePot").then((module) => ({ default: module.CreatePot }))
);

export function renderSettings(ctx: RouterContext) {
    const { nav: { back }, actions: { handleLogout, handleDeleteAccount, setTheme }, uiState: { theme } } = ctx;
    return (
        <Settings
            onBack={back}
            onLogout={handleLogout}
            onDeleteAccount={handleDeleteAccount}
            theme={theme}
            onThemeChange={setTheme}
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
            setPotName={(name) => setNewPot({ ...newPotState, name })}
            potType={newPotState.type || "expense"}
            setPotType={(type) => setNewPot({ ...newPotState, type })}
            baseCurrency={newPotState.baseCurrency || "USD"}
            setBaseCurrency={(currency) => setNewPot({ ...newPotState, baseCurrency: currency })}
            members={newPotState.members || []}
            setMembers={(members) =>
                setNewPot({
                    ...newPotState,
                    members: members.map((m) => ({
                        id: m.id,
                        name: m.name,
                        role: "Member",
                        status: "active",
                        address: m.address,
                        verified: m.verified,
                    })),
                })
            }
            goalAmount={newPotState.goalAmount}
            setGoalAmount={(amount) => setNewPot({ ...newPotState, goalAmount: amount })}
            goalDescription={newPotState.goalDescription}
            setGoalDescription={(description) => setNewPot({ ...newPotState, goalDescription: description })}
            onBack={back}
            onCreate={createPot}
        />
    );
}
