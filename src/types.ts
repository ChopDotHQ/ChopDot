export type PaymentStatus = 'open' | 'request_sent' | 'marked_paid' | 'confirmed';

export interface User {
  id: string;
  name: string;
}

export interface Group {
  id: string;
  name: string;
  memberIds: string[];
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  paidByUserId: string; // The organizer
  date: string;
}

export interface Split {
  id: string;
  expenseId: string;
  userId: string;     // The payer
  amount: number;
  status: PaymentStatus;
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
