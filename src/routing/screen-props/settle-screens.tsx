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
    const potSettlements =
        normalizedCurrentPot
            ? calculatePotSettlements(normalizedCurrentPot as any, settleCurrentUserId)
            : balances;

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
}

export function renderSettleHome(ctx: RouterContext) {
    const {
        data: { currentPot, currentPotId, normalizedCurrentPot, balances, pots },
        userState: { user, isGuest },
        nav: { push, replace, reset },
        actions: { setPots, confirmSettlement, showToast, selectedCounterpartyId },
    } = ctx;

    const shCurrentUserId = isGuest ? 'owner' : (user?.id || 'owner');
    const shLabel = currentPot ? currentPot.name : "All pots";
    const shCurrency = currentPot?.baseCurrency || "USD";
    const personIdFromNav = selectedCounterpartyId;

    const sourceData = currentPotId && normalizedCurrentPot
        ? calculatePotSettlements(normalizedCurrentPot as any, shCurrentUserId)
        : balances;

    const reMappedSettlements: SettleHomeSettlement[] = [];
    sourceData.youOwe.forEach(p => {
        if (!personIdFromNav || p.id === personIdFromNav) {
            reMappedSettlements.push({
                id: p.id,
                name: p.name,
                totalAmount: Number(p.totalAmount),
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
                totalAmount: Number(p.totalAmount),
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
                    method: method as "cash" | "bank" | "paypal" | "twint" | "dot",
                    reference,
                    settlement,
                });
            }}
            onHistory={() => {
                push({ type: "settlement-history" });
            }}
        />
    );
}

export function renderSettlementHistory(ctx: RouterContext) {
    const {
        data: { settlements, people, pots },
        nav: { back },
    } = ctx;

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
}

export function renderSettlementConfirmation(ctx: RouterContext) {
    const {
        nav: { back, push, reset },
    } = ctx;

    return (
        <SettlementConfirmation
            onBack={back}
            result={null as any}
            onViewHistory={() => push({ type: "settlement-history" })}
            onDone={() => reset({ type: "pots-home" })}
        />
    );
}
