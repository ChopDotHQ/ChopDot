// Commitment lifecycle — the state a pot/chapter can be in
export type PotStatus =
    | 'draft'
    | 'active'
    | 'partially_settled'
    | 'completed'
    | 'cancelled';

// Settlement leg statuses — tracks a single bilateral payment
export type SettlementLegStatus = 'pending' | 'paid' | 'confirmed';

// A single leg in a chapter settlement
export interface SettlementLeg {
    id: string;
    potId: string;
    fromMemberId: string;
    toMemberId: string;
    amount: number;        // fiat units (e.g. 12.50)
    currency: string;
    status: SettlementLegStatus;
    method?: 'cash' | 'bank' | 'paypal' | 'twint';
    reference?: string;
    createdAt: string;     // ISO
    paidAt?: string;       // ISO — set when status → paid
    confirmedAt?: string;  // ISO — set when status → confirmed
}

// Typed commitment event — append-only history entry
export type PotEventType =
    | 'commitment_created'
    | 'participant_joined'
    | 'expense_added'
    | 'chapter_proposed'
    | 'leg_marked_paid'
    | 'leg_confirmed'
    | 'chapter_closed'
    | 'commitment_cancelled';

export interface PotEvent {
    id: string;
    type: PotEventType;
    actorId: string;       // member ID who triggered the event
    timestamp: string;     // ISO
    meta?: Record<string, unknown>;
}

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
    status?: PotStatus;
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
    events?: PotEvent[];
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
