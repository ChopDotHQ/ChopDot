import { lazy } from "react";
import type { AppRouterProps } from './types';
import { calculatePotSettlements } from "../../utils/settlements";
import type { SettleHomeSettlement } from "../../hooks/useSettlementActions";

type RouterContext = AppRouterProps;

const SettleSelection = lazy(() =>
    import("../../components/screens/SettleSelection").then((module) => ({ default: module.SettleSelection }))
);
const SettleHome = lazy(() =>
    import("../../components/screens/SettleHome").then((module) => ({ default: module.SettleHome }))
);
const SettlementHistory = lazy(() =>
    import("../../components/screens/SettlementHistory").then((module) => ({ default: module.SettlementHistory }))
);
const SettlementConfirmation = lazy(() =>
    import("../../components/screens/SettlementConfirmation").then((module) => ({ default: module.SettlementConfirmation }))
);

export function renderSettleSelection(ctx: RouterContext) {
    const {
        data: { normalizedCurrentPot, balances, currentPot, currentPotId },
        userState: { user, isGuest },
        nav: { push, replace, reset },
        actions: { setSelectedCounterpartyId },
    } = ctx;

    const settleCurrentUserId = isGuest ? 'owner' : (user?.id || 'owner');
    const sourceData = currentPotId && normalizedCurrentPot
        ? calculatePotSettlements(normalizedCurrentPot as any, settleCurrentUserId)
        : balances;

    const selectionBalances = [
        ...sourceData.youOwe.map((person) => ({
            id: person.id,
            name: person.name,
            amount: Number(person.totalAmount),
            direction: 'owe' as const,
            trustScore: person.trustScore,
            paymentPreference: person.paymentPreference,
        })),
        ...sourceData.owedToYou.map((person) => ({
            id: person.id,
            name: person.name,
            amount: Number(person.totalAmount),
            direction: 'owed' as const,
            trustScore: person.trustScore,
            paymentPreference: person.paymentPreference,
        })),
    ];

    return (
        <SettleSelection
            potName={currentPot?.name}
            balances={selectionBalances}
            baseCurrency={currentPot?.baseCurrency || "USD"}
            onBack={() => {
                setSelectedCounterpartyId(null);
                if (currentPotId) {
                    replace({ type: "pot-home", potId: currentPotId });
                } else {
                    reset({ type: "people-home" });
                }
            }}
            onSelectPerson={(personId) => {
                setSelectedCounterpartyId(personId);
                push({ type: "settle-home", personId });
            }}
        />
    );
}

export function renderSettleHome(ctx: RouterContext) {
    const {
        screen,
        data: { currentPot, currentPotId, normalizedCurrentPot, balances, people },
        userState: { user, isGuest },
        nav: { push, replace, reset },
        actions: { confirmSettlement, setSelectedCounterpartyId, showToast, selectedCounterpartyId },
    } = ctx;

    const shCurrentUserId = isGuest ? 'owner' : (user?.id || 'owner');
    const shLabel = currentPot ? currentPot.name : "All pots";
    const shCurrency = currentPot?.baseCurrency || "USD";
    const personIdFromRoute = screen && screen.type === 'settle-home' ? screen.personId || null : null;
    const personIdFromNav = personIdFromRoute || selectedCounterpartyId;

    const sourceData = currentPotId && normalizedCurrentPot
        ? calculatePotSettlements(normalizedCurrentPot as any, shCurrentUserId)
        : balances;

    const settlements: SettleHomeSettlement[] = [
        ...sourceData.youOwe.map(p => ({
            id: p.id,
            name: p.name,
            totalAmount: Number(p.totalAmount),
            direction: "owe" as const,
            pots: p.breakdown.map(b => ({ potId: currentPotId || b.potName, potName: b.potName, amount: b.amount }))
        })),
        ...sourceData.owedToYou.map(p => ({
            id: p.id,
            name: p.name,
            totalAmount: Number(p.totalAmount),
            direction: "owed" as const,
            pots: p.breakdown.map(b => ({ potId: currentPotId || b.potName, potName: b.potName, amount: b.amount }))
        })),
    ].filter(s => !personIdFromNav || s.id === personIdFromNav);

    const settlementsForUi = settlements.length > 0 || !personIdFromNav
        ? settlements
        : (() => {
            const fallbackPerson = people.find((entry) => entry.id === personIdFromNav);
            if (!fallbackPerson) return settlements;
            return [{
                id: fallbackPerson.id,
                name: fallbackPerson.name,
                totalAmount: 0,
                direction: 'owe' as const,
                pots: [] as { potId: string; potName: string; amount: number }[],
            }];
        })();

    const targetCounterpartyId = personIdFromNav || settlementsForUi[0]?.id;

    return (
        <SettleHome
            onBack={() => {
                setSelectedCounterpartyId(null);
                if (currentPotId) {
                    replace({ type: "settle-selection" });
                } else {
                    reset({ type: "people-home" });
                }
            }}
            settlements={settlementsForUi}
            scope={currentPotId ? "pot" : "global"}
            scopeLabel={shLabel}
            potId={currentPotId || undefined}
            personId={personIdFromNav || undefined}
            currentUserId={shCurrentUserId}
            baseCurrency={shCurrency}
            onShowToast={showToast}
            onConfirm={async (method, reference) => {
                const settlement = settlementsForUi.find(s => s.id === targetCounterpartyId);
                if (!settlement) {
                    setSelectedCounterpartyId(null);
                    showToast("Settlement target is no longer available. Pick a person again.", "error");
                    if (currentPotId) {
                        replace({ type: "settle-selection" });
                    } else {
                        reset({ type: "people-home" });
                    }
                    return;
                }
                const result = await confirmSettlement({
                    method: method as "cash" | "bank" | "paypal" | "twint",
                    reference,
                    settlement,
                });
                if (result) {
                    setSelectedCounterpartyId(null);
                    push({ type: 'settlement-confirmation', result });
                }
            }}
            onHistory={() => {
                setSelectedCounterpartyId(null);
                if (targetCounterpartyId) {
                    push({ type: "settlement-history", personId: targetCounterpartyId });
                    return;
                }
                push({ type: "settlement-history" });
            }}
        />
    );
}

export function renderSettlementHistory(ctx: RouterContext) {
    const {
        screen,
        data: { settlements, people, pots },
        nav: { back },
    } = ctx;
    const personId = screen && screen.type === 'settlement-history' ? screen.personId : undefined;

    return (
        <SettlementHistory
            onBack={back}
            personId={personId}
            settlements={settlements.map((s) => ({
                id: s.id,
                method: s.method,
                personName: people.find((p) => p.id === s.personId)?.name || s.personId,
                amount: Number(s.amount),
                currency: s.currency,
                date: s.date,
                ref: s.ref,
                potNames: s.potIds?.map((pid) => pots.find((p) => p.id === pid)?.name || pid),
                personId: s.personId,
            }))}
        />
    );
}

export function renderSettlementConfirmation(ctx: RouterContext) {
    const {
        screen,
        actions: { setSelectedCounterpartyId },
        nav: { back, push, reset },
    } = ctx;

    if (!screen || screen.type !== 'settlement-confirmation') return null;

    return (
        <SettlementConfirmation
            onBack={back}
            result={screen.result}
            onViewHistory={() => {
                setSelectedCounterpartyId(null);
                push({ type: "settlement-history", personId: screen.result.counterpartyId });
            }}
            onDone={() => {
                setSelectedCounterpartyId(null);
                reset({ type: "pots-home" });
            }}
        />
    );
}
