import { markLegPaid } from '../../chapter/chapterEngine';
import type { ChapterDocument } from '../../chapter/types';
import { parseFirmaMemo } from './adapters/FirmaHandoffAdapter';

export type FirmaWebhookPayload = {
  id: string;
  type: string;
  created_at: string;
  data: {
    amount: number;
    currency: string;
    memo: string;
    payer_ref?: string;
    payee_ref?: string;
    transaction_id?: string;
  };
};

export type FirmaWebhookClaimInput = {
  payload: FirmaWebhookPayload;
  deliveryId: string;
};

export type FirmaWebhookClaimResult =
  | { status: 'claimed'; chapter: ChapterDocument; legId: string; potId: string }
  | { status: 'ignored'; reason: string }
  | { status: 'error'; reason: string };

function amountsMatch(expected: number, actual: number): boolean {
  return Math.abs(expected - actual) < 0.01;
}

export function parseFirmaWebhookPayload(raw: unknown): FirmaWebhookPayload | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const body = raw as Partial<FirmaWebhookPayload>;
  if (!body.type || !body.data?.memo || typeof body.data.amount !== 'number') {
    return null;
  }

  return body as FirmaWebhookPayload;
}

export function applyFirmaWebhookClaim(
  chapter: ChapterDocument,
  input: FirmaWebhookClaimInput,
): FirmaWebhookClaimResult {
  if (input.payload.type !== 'payment.settled') {
    return { status: 'ignored', reason: `Unsupported event type: ${input.payload.type}` };
  }

  const refs = parseFirmaMemo(input.payload.data.memo);
  if (!refs) {
    return { status: 'ignored', reason: 'Memo missing ChopDot leg reference' };
  }

  if (chapter.id !== refs.chapterId) {
    return { status: 'error', reason: 'Chapter id mismatch' };
  }

  const leg = chapter.legs.find((item) => item.id === refs.legId);
  if (!leg) {
    return { status: 'error', reason: 'Leg not found' };
  }

  if (leg.state !== 'open') {
    return { status: 'ignored', reason: `Leg already ${leg.state}` };
  }

  if (!amountsMatch(leg.amount, input.payload.data.amount)) {
    return { status: 'error', reason: 'Amount mismatch' };
  }

  if (leg.currency !== input.payload.data.currency) {
    return { status: 'error', reason: 'Currency mismatch' };
  }

  try {
    const updated = markLegPaid(chapter, {
      legId: leg.id,
      payerMemberId: leg.fromMemberId,
    });
    return {
      status: 'claimed',
      chapter: updated,
      legId: leg.id,
      potId: refs.potId,
    };
  } catch (error) {
    return {
      status: 'error',
      reason: error instanceof Error ? error.message : 'markLegPaid failed',
    };
  }
}

export async function verifyFirmaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader || !secret) {
    return false;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const expected = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return timingSafeEqual(expected, signatureHeader.toLowerCase());
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

export function buildFirmaWebhookFixture(input: {
  legId: string;
  potId: string;
  chapterId: string;
  amount: number;
  currency: string;
  deliveryId?: string;
}): FirmaWebhookPayload {
  return {
    id: `evt_${Date.now()}`,
    type: 'payment.settled',
    created_at: new Date().toISOString(),
    data: {
      amount: input.amount,
      currency: input.currency,
      memo: `chopdot:leg:${input.legId}:pot:${input.potId}:chapter:${input.chapterId}`,
      payer_ref: 'test-payer',
      transaction_id: `tx_${Date.now()}`,
    },
  };
}
