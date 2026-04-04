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
    confirmations: Map<string, { confirmed: boolean; confirmedAt?: string }>;
    expiresAt: string;
    bypassedBy?: string;
    bypassedAt?: string;
}

export interface Pot {
    id: string;
    name: string;
    type: "expense" | "savings";
    baseCurrency: string;
    members: Member[];
    expenses: Expense[];
    budget?: number;
    budgetEnabled?: boolean;
    goalAmount?: number;
    goalDescription?: string;
    checkpointEnabled?: boolean;
    currentCheckpoint?: ExpenseCheckpoint;
    mode?: "casual" | "auditable";
    confirmationsEnabled?: boolean;
    archived?: boolean;
    createdAt?: string;
    updatedAt?: number;
    lastEditAt?: string;
}

export interface Settlement {
    id: string;
    personId: string;
    amount: string;
    currency: string;
    method: "cash" | "bank" | "paypal" | "twint";
    potIds?: string[];
    date: string;
    ref?: string;
}

export interface ActivityItem {
    id: string;
    type: "expense" | "settlement" | "member" | "pot_created";
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
