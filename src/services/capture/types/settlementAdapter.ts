import type { SettlementLeg } from '../../../chapter/types';

export type SettlementRailId =
  | 'twint'
  | 'firma'
  | 'bank'
  | 'wise'
  | 'revolut'
  | 'venmo'
  | 'cashapp'
  | 'outside'
  | 'asset_hub'
  | 'coinage'
  | 'dot'
  | 'pas'
  | 'paypal'
  | 'usdc';

export type HandoffLeg = {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  fromName: string;
  toName: string;
  amount: number;
  currency: string;
};

export type HandoffResult = {
  railId: SettlementRailId;
  title: string;
  statusLabel: 'ready to pay' | 'handoff started' | 'claimed' | 'cleared' | 'needs confirmation' | 'failed';
  copyText: string;
  smsHref?: string;
  deepLinkHref?: string;
  reference: string;
  waitingMessage?: string;
  primaryActionLabel?: string;
};

export type FirmaWebhookMatch = {
  potId: string;
  chapterId: string;
  legId: string;
  amount: number;
  currency: string;
  payerRef?: string;
  deliveryId: string;
  eventType: string;
};

export type SettlementAdapter = {
  readonly railId: SettlementRailId;
  handoff(input: {
    leg: HandoffLeg;
    sessionRef: string;
    counterpartyPhone?: string;
    payeeAddress?: string;
    potId?: string;
    chapterId?: string;
  }): HandoffResult;
};

export function legToHandoffLeg(
  leg: SettlementLeg & { fromName?: string; toName?: string },
): HandoffLeg {
  return {
    id: leg.id,
    fromMemberId: leg.fromMemberId,
    toMemberId: leg.toMemberId,
    fromName: leg.fromName ?? leg.fromMemberId,
    toName: leg.toName ?? leg.toMemberId,
    amount: leg.amount,
    currency: leg.currency,
  };
}
