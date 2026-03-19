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

export type PaymentMethod = 'cash' | 'bank' | 'paypal' | 'twint' | 'dot';

export type ShowToast = (message: string, type?: 'success' | 'error' | 'info') => void;

export interface SettleHomeProps {
  settlements: Settlement[];
  onBack: () => void;
  onConfirm: (method: string, reference?: string) => void;
  onHistory?: () => void;
  scope?: 'global' | 'pot' | 'person';
  scopeLabel?: string;
  potId?: string;
  personId?: string;
  preferredMethod?: string;
  recipientAddress?: string;
  baseCurrency?: string;
  onShowToast?: ShowToast;
  pot?: Record<string, unknown>;
  onUpdatePot?: (updates: Record<string, unknown>) => void;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  bank: 'Bank',
  paypal: 'PayPal',
  twint: 'TWINT',
  dot: 'DOT',
};
