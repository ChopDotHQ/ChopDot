import type { HandoffResult, HandoffLeg, SettlementAdapter, SettlementRailId } from '../types/settlementAdapter';

function railLabel(railId: SettlementRailId): string {
  if (railId === 'bank') return 'Bank transfer';
  if (railId === 'wise') return 'Wise transfer';
  if (railId === 'revolut') return 'Revolut transfer';
  if (railId === 'venmo') return 'Venmo request';
  if (railId === 'cashapp') return 'Cash App request';
  if (railId === 'dot') return 'Pay with DOT';
  if (railId === 'usdc') return 'Pay with USDC';
  if (railId === 'pas') return 'Pay with PAS';
  if (railId === 'asset_hub') return 'Wallet payment';
  if (railId === 'coinage') return 'Payment link';
  if (railId === 'paypal') return 'PayPal request';
  return 'Payment handoff';
}

function actionLabel(railId: SettlementRailId): string {
  if (railId === 'venmo') return 'Copy Venmo request';
  if (railId === 'cashapp') return 'Copy Cash App request';
  if (railId === 'dot') return 'Copy DOT details';
  if (railId === 'usdc') return 'Copy USDC details';
  if (railId === 'pas') return 'Copy PAS details';
  if (railId === 'asset_hub') return 'Copy wallet details';
  if (railId === 'coinage') return 'Copy payment link';
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
        this.railId === 'asset_hub' || this.railId === 'dot' || this.railId === 'usdc' || this.railId === 'pas' || this.railId === 'coinage'
          ? 'Pay from your wallet, then return here.'
          : 'Use your normal payment app, then return here to mark the share paid.',
      primaryActionLabel: actionLabel(this.railId),
    };
  }
}
