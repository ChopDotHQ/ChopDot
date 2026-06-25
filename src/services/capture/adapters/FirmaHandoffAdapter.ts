import type { HandoffResult, HandoffLeg, SettlementAdapter } from '../types/settlementAdapter';

export function buildFirmaMemo(input: {
  legId: string;
  potId: string;
  chapterId: string;
}): string {
  return `chopdot:leg:${input.legId}:pot:${input.potId}:chapter:${input.chapterId}`;
}

export function parseFirmaMemo(memo: string): {
  legId: string;
  potId: string;
  chapterId: string;
} | null {
  const match = memo.match(/^chopdot:leg:([^:]+):pot:([^:]+):chapter:(.+)$/);
  if (!match) {
    return null;
  }

  const legId = match[1];
  const potId = match[2];
  const chapterId = match[3];
  if (!legId || !potId || !chapterId) {
    return null;
  }

  return { legId, potId, chapterId };
}

export class FirmaHandoffAdapter implements SettlementAdapter {
  readonly railId = 'firma' as const;

  handoff(input: {
    leg: HandoffLeg;
    sessionRef: string;
    counterpartyPhone?: string;
    payeeAddress?: string;
    potId?: string;
    chapterId?: string;
  }): HandoffResult {
    const memo = buildFirmaMemo({
      legId: input.leg.id,
      potId: input.potId ?? 'unknown',
      chapterId: input.chapterId ?? 'unknown',
    });
    const amountStr = `${input.leg.amount.toFixed(2)} ${input.leg.currency}`;
    const payee = input.payeeAddress ?? input.leg.toName;
    const copyText = `Pay ${amountStr} to ${payee} via Firma. Memo: ${memo}`;

    return {
      railId: 'firma',
      title: 'Firma handoff',
      statusLabel: 'handoff started',
      copyText,
      deepLinkHref: `https://firma.cash/?memo=${encodeURIComponent(memo)}&amount=${input.leg.amount}`,
      reference: memo,
      waitingMessage: 'Waiting for Firma payment — leg updates automatically when settled.',
      primaryActionLabel: 'Open Firma',
    };
  }
}

export const firmaHandoffAdapter = new FirmaHandoffAdapter();
