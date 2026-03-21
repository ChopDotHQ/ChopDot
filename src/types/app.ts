export interface Member {
    id: string;
    name: string;
    role: "Owner" | "Member";
    status: "active" | "pending";
    address?: string;
    evmAddress?: string;
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

export type CloseoutAsset = "DOT" | "USDC";

export type CloseoutLegStatus =
    | "pending"
    | "paid"
    | "proven"
    | "acknowledged";

export type CloseoutStatus =
    | "draft"
    | "anchored"
    | "active"
    | "partially_settled"
    | "completed"
    | "cancelled";

export type CloseoutLeg = {
    index: number;
    fromMemberId: string;
    toMemberId: string;
    fromAddress: string;
    toAddress: string;
    amount: string;
    asset: CloseoutAsset;
    settlementTxHash?: string;
    proofTxHash?: string;
    status: CloseoutLegStatus;
};

export type CloseoutRecord = {
    id: string;
    potId: string;
    asset: CloseoutAsset;
    snapshotHash: string;
    metadataHash?: string;
    contractAddress?: string;
    closeoutId?: string;
    contractTxHash?: string;
    status: CloseoutStatus;
    createdByMemberId: string;
    createdAt: number;
    participantMemberIds: string[];
    participantAddresses: string[];
    settledLegCount: number;
    totalLegCount: number;
    legs: CloseoutLeg[];
};

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
        closeoutId?: string;
        closeoutLegIndex?: number;
        proofTxHash?: string;
        proofStatus?: "anchored" | "recorded" | "completed";
        proofContract?: string;
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
    mode?: "casual" | "auditable";
    confirmationsEnabled?: boolean;
    lastCheckpoint?: { hash: string; txHash?: string; at: string; cid?: string };
    archived?: boolean;
    history?: PotHistory[];
    closeouts?: CloseoutRecord[];
    createdAt?: string;
    updatedAt?: number;
    lastEditAt?: string;
    lastBackupCid?: string;
}

export interface Settlement {
    id: string;
    personId: string;
    amount: string;
    currency: string;
    method: "cash" | "bank" | "paypal" | "twint" | "dot" | "usdc";
    potIds?: string[];
    date: string;
    txHash?: string;
    closeoutId?: string;
    closeoutLegIndex?: number;
    proofTxHash?: string;
    proofStatus?: "anchored" | "recorded" | "completed";
    proofContract?: string;
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
    address?: string;
}
