import { Member, Expense, CheckpointConfirmation } from "../types/app";

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

