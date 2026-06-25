import type { HandoffResult, HandoffLeg, SettlementAdapter, SettlementRailId } from '../types/settlementAdapter';

function railLabel(railId: SettlementRailId): string {
  if (railId === 'bank') return 'Bank transfer';
  if (railId === 'wise') return 'Wise transfer';
  if (railId === 'revolut') return 'Revolut transfer';
  if (railId === 'venmo') return 'Venmo request';
  if (railId === 'cashapp') return 'Cash App request';
  if (railId === 'asset_hub' || railId === 'dot' || railId === 'usdc') return 'Asset Hub reference';
  if (railId === 'coinage') return 'Coinage evidence';
  if (railId === 'paypal') return 'PayPal request';
  return 'Payment handoff';
}

function actionLabel(railId: SettlementRailId): string {
  if (railId === 'venmo') return 'Copy Venmo request';
  if (railId === 'cashapp') return 'Copy Cash App request';
  if (railId === 'asset_hub' || railId === 'dot' || railId === 'usdc') return 'Copy Asset Hub reference';
  if (railId === 'coinage') return 'Copy Coinage evidence request';
  return 'Copy payment details';
}

export class ReferenceHandoffAdapter implements SettlementAdapter {
  readonly railId: SettlementRailId;

  constructor(railId: SettlementRailId) {
    this.railId = railId;
  }

  handoff(input: { leg: HandoffLeg; sessionRef: string }): HandoffResult {
    const amountStr = `${input.leg.amount.toFixed(2)} ${input.leg.currency}`;
    const label = railLabel(this.railId);
    const copyText = `${label}: ${amountStr} to ${input.leg.toName}. Reference: ${input.sessionRef}`;

    return {
      railId: this.railId,
      title: label,
      statusLabel: 'ready to pay',
      copyText,
      reference: input.sessionRef,
      waitingMessage:
        this.railId === 'asset_hub' || this.railId === 'dot' || this.railId === 'usdc' || this.railId === 'coinage'
          ? 'This can support payment evidence. The group record still follows ChopDot confirmation rules.'
          : 'Use your normal payment app, then return here to mark the share paid.',
      primaryActionLabel: actionLabel(this.railId),
    };
  }
}
