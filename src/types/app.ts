export interface Member {
    id: string;
    name: string;
    role: "Owner" | "Member";
    status: "active" | "pending";
    address?: string;
    verified?: boolean;
}

export interface Expense {
    id: string;
    amount: number;
    currency: string;
    paidBy: string;
    memo: string;
    date: string;
    split: { memberId: string; amount: number }[];
    attestations: string[];
    hasReceipt: boolean;
    attestationTxHash?: string;
    attestationTimestamp?: string;
}

export interface Contribution {
    id: string;
    memberId: string;
    amount: number;
    date: string;
    txHash?: string;
}

export interface CheckpointConfirmation {
    confirmed: boolean;
    confirmedAt?: string;
}

export interface ExpenseCheckpoint {
    id: string;
    createdBy: string;
    createdAt: string;
    status: "pending" | "confirmed" | "bypassed";
    confirmations: Map<
        string,
        { confirmed: boolean; confirmedAt?: string }
    >;
    expiresAt: string;
    bypassedBy?: string;
    bypassedAt?: string;
}

export type PotHistoryBase = {
    id: string;
    when: number;
    txHash?: string;
    block?: string;
    status: "submitted" | "in_block" | "finalized" | "failed";
    subscan?: string;
};

export type PotHistory =
    | (PotHistoryBase & {
        type: "onchain_settlement";
        fromMemberId: string;
        toMemberId: string;
        fromAddress: string;
        toAddress: string;
        amountDot?: string; // Optional - required if amountUsdc not present
        amountUsdc?: string; // Optional - required if amountDot not present
        assetId?: number; // Asset ID for USDC (1337), undefined for DOT
        txHash: string;
        subscan: string;
        note?: string;
    })
    | (PotHistoryBase & {
        type: "remark_checkpoint";
        message: string;
        potHash: string;
        cid?: string;
    });

export interface Pot {
    id: string;
    name: string;
    type: "expense" | "savings";
    baseCurrency: string;
    members: Member[];
    expenses: Expense[];
    budget?: number;
    budgetEnabled?: boolean;
    contributions?: Contribution[];
    totalPooled?: number;
    yieldRate?: number;
    defiProtocol?: string;
    goalAmount?: number;
    goalDescription?: string;
    checkpointEnabled?: boolean;
    currentCheckpoint?: ExpenseCheckpoint;
    archived?: boolean;
    history?: PotHistory[];
    createdAt?: string;
}

export interface Settlement {
    id: string;
    personId: string;
    amount: string;
    currency: string;
    method: "cash" | "bank" | "paypal" | "twint" | "dot";
    potIds?: string[];
    date: string;
    txHash?: string;
}

export interface ActivityItem {
    id: string;
    type: "expense" | "settlement" | "attestation" | "member" | "pot_created";
    timestamp: string;
    title: string;
    subtitle: string;
    amount?: string;
}

export interface Person {
    id: string;
    name: string;
    balance: number;
    trustScore: number;
    paymentPreference: string;
    potCount: number;
}
