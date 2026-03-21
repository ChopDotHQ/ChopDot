import { Member, Expense, CheckpointConfirmation, PotHistory } from "../types/app";

// Helpers to normalize data to strict types
export const normalizeMembers = (members: any[]): Member[] =>
    (members || []).map((m) => ({
        id: m.id,
        name: m.name ?? "Member",
        role: m.role === "Owner" ? "Owner" : "Member",
        status: m.status === "pending" ? "pending" : "active",
        address: m.address ?? undefined,
        evmAddress: m.evmAddress ?? undefined,
        verified: m.verified,
    }));

export const normalizeExpenses = (expenses: any[], fallbackCurrency: string): Expense[] =>
    (expenses || []).map((e) => {
        const rawSplit = Array.isArray(e.split) ? e.split : [];
        const splitTotal = rawSplit.reduce(
            (sum: number, split: { amount?: number }) => sum + Number(split.amount ?? 0),
            0,
        );
        const normalizedAmount = Number(e.amount ?? 0);
        const amount = normalizedAmount > 0 ? normalizedAmount : splitTotal;

        return {
        id: e.id,
        amount,
        currency: e.currency ?? fallbackCurrency ?? "USD",
        paidBy: e.paidBy ?? "owner",
        memo: e.memo ?? e.description ?? "",
        date: e.date ?? new Date().toISOString(),
        split: rawSplit,
        attestations: Array.isArray(e.attestations) ? e.attestations : [],
        hasReceipt: Boolean(e.hasReceipt),
        attestationTxHash: e.attestationTxHash,
        attestationTimestamp: e.attestationTimestamp,
        };
    });

export const normalizeConfirmations = (
    confirmations?: Map<string, unknown> | Record<string, unknown>,
): Map<string, CheckpointConfirmation> | Record<string, CheckpointConfirmation> | undefined => {
    if (!confirmations) return undefined;
    if (confirmations instanceof Map) {
        const normalized = new Map<string, CheckpointConfirmation>();
        confirmations.forEach((val, key) => {
            if (typeof val === "object" && val !== null && "confirmed" in (val as any)) {
                normalized.set(key, val as CheckpointConfirmation);
            } else {
                normalized.set(key, { confirmed: Boolean(val) });
            }
        });
        return normalized;
    }
    const normalized: Record<string, CheckpointConfirmation> = {};
    Object.entries(confirmations).forEach(([key, val]) => {
        if (typeof val === "object" && val !== null && "confirmed" in (val as any)) {
            normalized[key] = val as CheckpointConfirmation;
        } else {
            normalized[key] = { confirmed: Boolean(val) };
        }
    });
    return normalized;
};

export const normalizeHistory = (history: any[]): PotHistory[] =>
    (history || [])
        .map((h) => {
            const status = h.status ?? "submitted";
            if (h.type === "onchain_settlement") {
                return {
                    id: h.id,
                    when: Number(h.when ?? Date.now()),
                    type: "onchain_settlement" as const,
                    fromMemberId: h.fromMemberId,
                    toMemberId: h.toMemberId,
                    fromAddress: h.fromAddress,
                    toAddress: h.toAddress,
                    amountDot: h.amountDot,
                    amountUsdc: h.amountUsdc,
                    assetId: h.assetId,
                    txHash: h.txHash ?? "",
                    block: h.block,
                    status,
                    subscan: h.subscan ?? "",
                    note: h.note,
                    closeoutId: h.closeoutId,
                    closeoutLegIndex: h.closeoutLegIndex,
                    proofTxHash: h.proofTxHash,
                    proofStatus: h.proofStatus,
                    proofContract: h.proofContract,
                };
            }
            if (h.type === "remark_checkpoint") {
                return {
                    id: h.id,
                    when: Number(h.when ?? Date.now()),
                    type: "remark_checkpoint" as const,
                    message: h.message ?? "",
                    potHash: h.potHash ?? "",
                    cid: h.cid,
                    txHash: h.txHash,
                    block: h.block,
                    status,
                    subscan: h.subscan,
                };
            }
            return null;
        })
        .filter(Boolean) as PotHistory[];
