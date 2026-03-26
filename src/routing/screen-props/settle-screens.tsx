import { lazy } from "react";
import type { SettlementResult } from "../../nav";
import type { AppRouterProps } from './types';
import { calculatePotSettlements } from "../../utils/settlements";
import type { SettleHomeSettlement } from "../../hooks/useSettlementActions";
import {
    anchorCloseoutDraft,
    createCloseoutDraft,
    findCloseoutLegForMembers,
    findLatestTrackedCloseout,
} from '../../services/closeout/pvmCloseout';
import { saveTrackedPotRecovery } from '../../services/closeout/trackedRecovery';

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

function buildTrackedSettlementFromLeg({
    leg,
    shCurrentUserId,
    currentPotId,
    currentPot,
    normalizedCurrentPot,
    shLabel,
}: {
    leg: {
        fromMemberId: string;
        toMemberId: string;
        amount: string;
    };
    shCurrentUserId: string;
    currentPotId: string | null;
    currentPot: RouterContext['data']['currentPot'];
    normalizedCurrentPot: RouterContext['data']['normalizedCurrentPot'];
    shLabel: string;
}): SettleHomeSettlement {
    const isCurrentUserPayer = leg.fromMemberId === shCurrentUserId;
    const counterpartyId = isCurrentUserPayer ? leg.toMemberId : leg.fromMemberId;
    const member = normalizedCurrentPot?.members?.find((entry) => entry.id === counterpartyId)
        || currentPot?.members?.find((entry) => entry.id === counterpartyId);

    return {
        id: counterpartyId,
        name: member?.name || counterpartyId,
        totalAmount: Number(leg.amount),
        direction: isCurrentUserPayer ? 'owe' : 'owed',
        pots: [{ potId: currentPotId || currentPot?.id || 'pot', potName: shLabel, amount: Number(leg.amount) }],
    };
}

function buildTrackedConfirmationResultFromLeg({
    leg,
    settlement,
    latestCloseout,
}: {
    leg: {
        index: number;
        amount: string;
        asset: 'DOT' | 'USDC';
        settlementTxHash?: string;
        proofTxHash?: string;
    };
    settlement: SettleHomeSettlement;
    latestCloseout?: {
        closeoutId?: string;
        contractAddress?: string;
    };
}): SettlementResult {
    return {
        amount: Number(leg.amount),
        method: leg.asset === 'USDC' ? 'usdc' : 'dot',
        counterpartyId: settlement.id,
        counterpartyName: settlement.name,
        direction: settlement.direction,
        scope: settlement.pots.length > 1 ? 'person-all' as const : 'pot' as const,
        pots: settlement.pots.map((potItem) => ({
            id: potItem.potId,
            name: potItem.potName,
            amount: potItem.amount,
        })),
        txHash: leg.settlementTxHash,
        closeoutId: latestCloseout?.closeoutId,
        closeoutLegIndex: leg.index,
        proofTxHash: leg.proofTxHash,
        proofStatus: leg.proofTxHash ? 'completed' as const : leg.settlementTxHash ? 'recorded' as const : 'anchored' as const,
        proofContract: latestCloseout?.contractAddress,
        at: Date.now(),
    };
}

type SelectionBalance = {
    id: string;
    name: string;
    amount: number;
    direction: 'owe' | 'owed';
    paymentPreference?: string;
    trustScore?: number;
};

function buildSelectionBalances({
    latestTrackedCloseout,
    currentPot,
    normalizedCurrentPot,
    settleCurrentUserId,
    balances,
}: {
    latestTrackedCloseout?: ReturnType<typeof findLatestTrackedCloseout>;
    currentPot: RouterContext['data']['currentPot'];
    normalizedCurrentPot: RouterContext['data']['normalizedCurrentPot'];
    settleCurrentUserId: string;
    balances: RouterContext['data']['balances'];
}): SelectionBalance[] {
    if (latestTrackedCloseout) {
        const nextBalances: SelectionBalance[] = [];
        latestTrackedCloseout.legs
            .filter((leg) => leg.fromMemberId === settleCurrentUserId || leg.toMemberId === settleCurrentUserId)
            .forEach((leg) => {
                if (leg.fromMemberId === settleCurrentUserId) {
                    const member = currentPot?.members.find((entry) => entry.id === leg.toMemberId)
                        || normalizedCurrentPot?.members.find((entry) => entry.id === leg.toMemberId);
                    nextBalances.push({
                        id: leg.toMemberId,
                        name: member?.name || leg.toMemberId,
                        amount: Number(leg.amount),
                        direction: 'owe',
                        paymentPreference: leg.asset,
                    });
                    return;
                }
                if (leg.toMemberId === settleCurrentUserId) {
                    const member = currentPot?.members.find((entry) => entry.id === leg.fromMemberId)
                        || normalizedCurrentPot?.members.find((entry) => entry.id === leg.fromMemberId);
                    nextBalances.push({
                        id: leg.fromMemberId,
                        name: member?.name || leg.fromMemberId,
                        amount: Number(leg.amount),
                        direction: 'owed',
                        paymentPreference: leg.asset,
                    });
                }
            });
        return nextBalances;
    }

    const potSettlements =
        normalizedCurrentPot
            ? calculatePotSettlements(normalizedCurrentPot as any, settleCurrentUserId)
            : balances;

    return [
        ...potSettlements.youOwe.map((person) => ({
            id: person.id,
            name: person.name,
            amount: Number(person.totalAmount),
            direction: 'owe' as const,
            trustScore: person.trustScore,
            paymentPreference: person.paymentPreference,
        })),
        ...potSettlements.owedToYou.map((person) => ({
            id: person.id,
            name: person.name,
            amount: Number(person.totalAmount),
            direction: 'owed' as const,
            trustScore: person.trustScore,
            paymentPreference: person.paymentPreference,
        })),
    ];
}

export function renderSettleSelection(ctx: RouterContext) {
    const {
        data: { normalizedCurrentPot, balances, currentPot, currentPotId },
        userState: { user, isGuest },
        nav: { push, replace, reset },
        actions: { setSelectedCounterpartyId },
    } = ctx;

    const settleCurrentUserId = isGuest ? 'owner' : (user?.id || 'owner');
    const latestTrackedCloseout = findLatestTrackedCloseout(currentPot || normalizedCurrentPot || undefined);
    const selectionBalances = buildSelectionBalances({
        latestTrackedCloseout,
        currentPot,
        normalizedCurrentPot,
        settleCurrentUserId,
        balances,
    });

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
        data: { currentPot, currentPotId, normalizedCurrentPot, balances, pots, people },
        userState: { user, isGuest },
        nav: { push, replace, reset },
        actions: { setPots, confirmSettlement, setSelectedCounterpartyId, showToast, selectedCounterpartyId },
    } = ctx;

    const shCurrentUserId = isGuest ? 'owner' : (user?.id || 'owner');
    const shLabel = currentPot ? currentPot.name : "All pots";
    const shCurrency = currentPot?.baseCurrency || "USD";
    const personIdFromRoute =
        screen && screen.type === 'settle-home'
            ? screen.personId || null
            : null;
    const personIdFromNav = personIdFromRoute || selectedCounterpartyId;

    const potForCloseout =
        currentPotId ? (normalizedCurrentPot || currentPot || undefined) : undefined;
    const latestCloseout = potForCloseout ? findLatestTrackedCloseout(potForCloseout) : undefined;
    const sourceData = currentPotId && normalizedCurrentPot
        ? calculatePotSettlements(normalizedCurrentPot as any, shCurrentUserId)
        : balances;
    const fallbackTrackedLeg =
        latestCloseout && personIdFromNav
            ? findCloseoutLegForMembers(latestCloseout, shCurrentUserId, personIdFromNav)
                || findCloseoutLegForMembers(latestCloseout, personIdFromNav, shCurrentUserId)
            : undefined;

    const reMappedSettlements: SettleHomeSettlement[] = latestCloseout
        ? (() => {
            const nextSettlements: SettleHomeSettlement[] = [];
            latestCloseout.legs
                .filter((leg) => leg.status === 'pending')
                .forEach((leg) => {
                    if (leg.fromMemberId === shCurrentUserId) {
                        if (personIdFromNav && leg.toMemberId !== personIdFromNav) return;
                        nextSettlements.push(buildTrackedSettlementFromLeg({
                            leg,
                            shCurrentUserId,
                            currentPotId,
                            currentPot,
                            normalizedCurrentPot,
                            shLabel,
                        }));
                        return;
                    }
                    if (leg.toMemberId === shCurrentUserId) {
                        if (personIdFromNav && leg.fromMemberId !== personIdFromNav) return;
                        nextSettlements.push(buildTrackedSettlementFromLeg({
                            leg,
                            shCurrentUserId,
                            currentPotId,
                            currentPot,
                            normalizedCurrentPot,
                            shLabel,
                        }));
                    }
                });
            if (nextSettlements.length === 0 && fallbackTrackedLeg) {
                nextSettlements.push(buildTrackedSettlementFromLeg({
                    leg: fallbackTrackedLeg,
                    shCurrentUserId,
                    currentPotId,
                    currentPot,
                    normalizedCurrentPot,
                    shLabel,
                }));
            }
            return nextSettlements;
        })()
        : (() => {
            const nextSettlements: SettleHomeSettlement[] = [];
            sourceData.youOwe.forEach(p => {
                if (!personIdFromNav || p.id === personIdFromNav) {
                    nextSettlements.push({
                        id: p.id,
                        name: p.name,
                        totalAmount: Number(p.totalAmount),
                        direction: "owe",
                        pots: p.breakdown.map(b => ({ potId: currentPotId || b.potName, potName: b.potName, amount: b.amount }))
                    });
                }
            });
            sourceData.owedToYou.forEach(p => {
                if (!personIdFromNav || p.id === personIdFromNav) {
                    nextSettlements.push({
                        id: p.id,
                        name: p.name,
                        totalAmount: Number(p.totalAmount),
                        direction: "owed",
                        pots: p.breakdown.map(b => ({ potId: currentPotId || b.potName, potName: b.potName, amount: b.amount }))
                    });
                }
            });
            return nextSettlements;
        })();

    const settlementsForUi =
        reMappedSettlements.length > 0 || !personIdFromNav
            ? reMappedSettlements
            : (() => {
                const fallbackPerson = people.find((entry) => entry.id === personIdFromNav);
                if (!fallbackPerson) return reMappedSettlements;
                return [
                    {
                        id: fallbackPerson.id,
                        name: fallbackPerson.name,
                        totalAmount: 0,
                        direction: 'owe' as const,
                        pots: [] as { potId: string; potName: string; amount: number }[],
                    },
                ];
            })();
    const hasPersonMatch =
        !!personIdFromNav && settlementsForUi.some((settlement) => settlement.id === personIdFromNav);
    const targetCounterpartyId = hasPersonMatch ? personIdFromNav : settlementsForUi[0]?.id;
    const selectedCounterparty = [...sourceData.youOwe, ...sourceData.owedToYou]
        .find((p) => p.id === targetCounterpartyId);

    const memberById =
        normalizedCurrentPot?.members?.find((m) => m.id === targetCounterpartyId) ||
        currentPot?.members?.find((m) => m.id === targetCounterpartyId);
    const memberAcrossPots =
        targetCounterpartyId !== undefined
            ? pots.flatMap((p) => p.members).find((m) => m.id === targetCounterpartyId)
            : undefined;
    const memberByName = selectedCounterparty?.name
        ? (normalizedCurrentPot?.members?.find((m) => m.name === selectedCounterparty.name) ||
            currentPot?.members?.find((m) => m.name === selectedCounterparty.name))
        : undefined;
    const recipientAddress =
        selectedCounterparty?.address ||
        memberById?.address ||
        memberByName?.address ||
        memberAcrossPots?.address;
    const preferredMethod = selectedCounterparty?.paymentPreference;
    const matchingCloseoutLeg =
        latestCloseout && targetCounterpartyId
            ? findCloseoutLegForMembers(latestCloseout, shCurrentUserId, targetCounterpartyId)
                || findCloseoutLegForMembers(latestCloseout, targetCounterpartyId, shCurrentUserId)
            : undefined;

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
            preferredMethod={preferredMethod}
            recipientAddress={recipientAddress}
            baseCurrency={shCurrency}
            onShowToast={showToast}
            trackedCloseout={latestCloseout || null}
            onStartSmartSettlement={async () => {
                if (!currentPot) return null;

                const existing = findLatestTrackedCloseout(currentPot);
                if (existing) {
                    return existing as any;
                }

                const draft = await createCloseoutDraft({
                    pot: currentPot as any,
                    createdByMemberId: shCurrentUserId,
                });
                const anchored = await anchorCloseoutDraft(draft);
                const nextCloseout = {
                    ...draft,
                    ...anchored,
                };
                const nextCloseouts = [
                    nextCloseout,
                    ...(currentPot.closeouts || []).filter((entry) => entry.id !== nextCloseout.id),
                ];

                setPots(pots.map((p) => (
                    p.id === currentPot.id
                        ? { ...p, closeouts: nextCloseouts, lastEditAt: new Date().toISOString() }
                        : p
                )) as any);
                saveTrackedPotRecovery({
                    id: currentPot.id,
                    closeouts: nextCloseouts,
                    history: currentPot.history || [],
                    lastEditAt: new Date().toISOString(),
                } as any);
                await ctx.actions.persistPotPartial(currentPot.id, {
                    closeouts: nextCloseouts,
                    lastEditAt: new Date().toISOString(),
                } as any);
                return nextCloseout as any;
            }}
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
                    method: method as "cash" | "bank" | "paypal" | "twint" | "dot" | "usdc",
                    reference,
                    settlement,
                    closeoutContext:
                        latestCloseout?.closeoutId && matchingCloseoutLeg
                            ? {
                                closeoutId: latestCloseout.closeoutId,
                                legIndex: matchingCloseoutLeg.index,
                            }
                            : undefined,
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
            onOpenTrackedConfirmation={() => {
                if (!matchingCloseoutLeg) {
                    return;
                }
                const trackedSettlement = settlementsForUi.find((entry) => entry.id === targetCounterpartyId)
                    || buildTrackedSettlementFromLeg({
                        leg: matchingCloseoutLeg,
                        shCurrentUserId,
                        currentPotId,
                        currentPot,
                        normalizedCurrentPot,
                        shLabel,
                    });
                push({
                    type: 'settlement-confirmation',
                    result: buildTrackedConfirmationResultFromLeg({
                        leg: matchingCloseoutLeg,
                        settlement: trackedSettlement,
                        latestCloseout,
                    }),
                });
            }}
            closeoutId={matchingCloseoutLeg ? latestCloseout?.closeoutId : undefined}
            closeoutLegIndex={matchingCloseoutLeg?.index}
            closeoutProofStatus={
                matchingCloseoutLeg?.proofTxHash
                    ? 'completed'
                    : matchingCloseoutLeg?.settlementTxHash
                        ? 'recorded'
                        : matchingCloseoutLeg
                            ? 'anchored'
                            : undefined
            }
        />
    );
}

export function renderSettlementHistory(ctx: RouterContext) {
    const {
        screen,
        data: { settlements, people, pots },
        actions: { retrySettlementProof },
        nav: { back },
    } = ctx;
    const personId =
        screen && screen.type === 'settlement-history'
            ? screen.personId
            : undefined;

    return (
        <SettlementHistory
            onBack={back}
            personId={personId}
            onRetryProof={retrySettlementProof}
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
                closeoutId: s.closeoutId,
                proofTxHash: s.proofTxHash,
                proofStatus: s.proofStatus,
            })) as any}
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
