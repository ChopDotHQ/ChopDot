/**
 * settle-home-types - MVP stub
 */
import type { PaymentMethod as AppPaymentMethod } from '../../App';

export type { AppPaymentMethod as PaymentMethod };
export type SettlementMode = 'cash' | 'bank' | 'paypal' | 'twint';

export interface SettleHomeProps {
  [key: string]: any;
}
