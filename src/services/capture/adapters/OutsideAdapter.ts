import type { HandoffResult, HandoffLeg, SettlementAdapter } from '../types/settlementAdapter';

export class OutsideAdapter implements SettlementAdapter {
  readonly railId = 'outside' as const;

  handoff(input: { leg: HandoffLeg; sessionRef: string }): HandoffResult {
    const amountStr = `${input.leg.amount.toFixed(2)} ${input.leg.currency}`;
    const copyText = `Pay ${amountStr} to ${input.leg.toName} outside ChopDot. Reference: ${input.sessionRef}`;

    return {
      railId: 'outside',
      title: 'Pay outside',
      statusLabel: 'ready to pay',
      copyText,
      reference: input.sessionRef,
      primaryActionLabel: 'Copy payment details',
    };
  }
}

export const outsideAdapter = new OutsideAdapter();
