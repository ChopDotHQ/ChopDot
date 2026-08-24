/**
 * Payment evidence and human receipt are deliberately separate:
 * `cleared` means an exact transfer finalized on the selected network;
 * `confirmed` means the receiver explicitly acknowledged receipt.
 */
export type PaymentStatus = 'open' | 'request_sent' | 'marked_paid' | 'cleared' | 'confirmed';

export type GroupMode =
  | 'normal_pot'
  | 'trip'
  | 'couple'
  | 'spend_card'
  | 'savings_circle'
  | 'emergency_pot'
  | 'community_fund';

export interface User {
  id: string;
  name: string;
  accountPublicKeyHex?: string;
  statementSignerHex?: string;
  walletAddress?: string;
}

export interface Group {
  id: string;
  name: string;
  memberIds: string[];
  /**
   * Presentation and policy configuration over the shared group lifecycle.
   * Legacy groups omit this and are presented as a normal pot.
   */
  mode?: GroupMode;
  liveSession?: {
    roomId: string;
    secret: string;
  };
  closedRecordId?: string;
  closedAt?: string;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  currency?: string;
  paidByUserId: string; // The organizer
  date: string;
}

export interface Split {
  id: string;
  expenseId: string;
  userId: string;     // The payer
  amount: number;
  status: PaymentStatus;
  requestId?: string;
  requestExpiresAt?: string;
  requestCapabilityHash?: string;
  requestEntryCapability?: string;
  requestCreatedAt?: string;
  walletPayment?: WalletPaymentReceipt;
}

export interface WalletPaymentReceipt {
  txHash: string;
  chainId: string;
  from: string;
  to: string;
  amountBaseUnits: string;
  blockNumber: string;
  confirmedAt: string;
}

export interface PaymentMethod {
  id: string;
  userId: string;
  type: string;
  details: string;
}

export interface ActivityEvent {
  id: string;
  type: string;
  timestamp: string;
  details: any;
}

export interface SavedRecord {
  id: string;
  groupId: string;
  dateSaved: string;
  totalAmount: number;
  openAmount: number;
  splits: Split[];
}

export interface AppState {
  mode: 'clean' | 'demo';
  theme: 'light' | 'dark';
  currency: string;
  preferredPaymentMethod: string | null;
  currentUserId: string | null;
  users: Record<string, User>;
  groups: Record<string, Group>;
  expenses: Record<string, Expense>;
  splits: Record<string, Split>;
  paymentMethods: Record<string, PaymentMethod>;
  activityEvents: Record<string, ActivityEvent>;
  savedRecords: Record<string, SavedRecord>;
}
