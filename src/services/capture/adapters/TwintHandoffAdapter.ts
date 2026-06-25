import type { HandoffResult, HandoffLeg, SettlementAdapter } from '../types/settlementAdapter';

export class TwintHandoffAdapter implements SettlementAdapter {
  readonly railId = 'twint' as const;

  handoff(input: {
    leg: HandoffLeg;
    sessionRef: string;
    counterpartyPhone?: string;
  }): HandoffResult {
    const phone = input.counterpartyPhone ?? '';
    const amountStr = `${input.leg.amount.toFixed(2)} ${input.leg.currency}`;
    const copyText = `TWINT payment: ${amountStr} to ${phone || 'phone'} (${input.leg.toName}) ref ${input.sessionRef}`;

    return {
      railId: 'twint',
      title: 'Pay with TWINT',
      statusLabel: 'ready to pay',
      copyText,
      smsHref: phone
        ? `sms:${encodeURIComponent(phone)}?&body=${encodeURIComponent(`Amount: ${amountStr} ref ${input.sessionRef}`)}`
        : undefined,
      reference: input.sessionRef,
      primaryActionLabel: 'Copy TWINT details',
    };
  }
}

export const twintHandoffAdapter = new TwintHandoffAdapter();
