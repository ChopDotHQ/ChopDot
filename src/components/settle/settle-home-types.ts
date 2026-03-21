import type { CloseoutRecord } from '../../types/app';

export interface SettlementPotBreakdown {
  potId: string;
  potName: string;
  amount: number;
}

export interface Settlement {
  id: string;
  name: string;
  totalAmount: number;
  direction: 'owe' | 'owed';
  pots: SettlementPotBreakdown[];
}

export type PaymentMethod = 'cash' | 'bank' | 'paypal' | 'twint' | 'dot' | 'usdc';
export type SettlementMode = 'normal' | 'smart';

export type ShowToast = (message: string, type?: 'success' | 'error' | 'info') => void;

export interface SettleHomeProps {
  settlements: Settlement[];
  onBack: () => void;
  onConfirm: (method: string, reference?: string) => Promise<void> | void;
  onStartSmartSettlement?: () => Promise<CloseoutRecord | null>;
  onOpenTrackedConfirmation?: () => void;
  onHistory?: () => void;
  scope?: 'global' | 'pot' | 'person';
  scopeLabel?: string;
  potId?: string;
  personId?: string;
  currentUserId?: string;
  preferredMethod?: string;
  recipientAddress?: string;
  baseCurrency?: string;
  onShowToast?: ShowToast;
  pot?: Record<string, unknown>;
  onUpdatePot?: (updates: Record<string, unknown>) => void;
  trackedCloseout?: CloseoutRecord | null;
  closeoutId?: string;
  closeoutLegIndex?: number;
  closeoutProofStatus?: 'anchored' | 'recorded' | 'completed';
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  bank: 'Bank',
  paypal: 'PayPal',
  twint: 'TWINT',
  dot: 'DOT',
  usdc: 'USDC',
};
