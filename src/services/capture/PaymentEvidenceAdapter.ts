import type { PaymentEvidenceRef } from '../../chapter/types';

export type PaymentEvidenceFailureCode =
  | 'empty'
  | 'malformed'
  | 'unsupported'
  | 'unknown_status'
  | 'interrupted'
  | 'failed';

type ParsedPaymentStatus = PaymentEvidenceRef['status'] | 'unknown_status' | 'interrupted';

export type PaymentEvidenceParseResult =
  | {
      ok: true;
      evidence: PaymentEvidenceRef;
      suggestedAmount?: number;
      suggestedCurrency?: string;
      suggestedMemo: string;
      notice: string;
    }
  | { ok: false; reason: string; code: PaymentEvidenceFailureCode };

type JsonRecord = Record<string, unknown>;

function nowIso(): string {
  return new Date().toISOString();
}

function simpleHash(input: string): string {
  let hash = 5381;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 33) ^ input.charCodeAt(index);
  }
  return `hash_${(hash >>> 0).toString(16)}`;
}

function normalizeAmount(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.round(parsed * 100) / 100;
}

function valueAsString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function firstParam(params: URLSearchParams, names: string[]): string | undefined {
  for (const name of names) {
    const value = params.get(name);
    if (value?.trim()) return value.trim();
  }
  return undefined;
}

function isT3rminalPayUrl(url: URL): boolean {
  return url.protocol === 'polkadotapp:' && (url.hostname === 'pay' || url.pathname.replace(/^\/+/, '') === 'pay');
}

function sourceForUrl(url: URL, terminalId?: string): PaymentEvidenceRef['source'] {
  const host = url.hostname.toLowerCase();
  const protocol = url.protocol.toLowerCase();
  if (isT3rminalPayUrl(url) || terminalId || host.includes('t3rminal')) return 't3rminal';
  if (protocol === 'w3spay:' || host.includes('w3spay') || host.includes('w3s-pay')) return 'w3spay';
  if (protocol === 'coinage:' || host.includes('coinage')) return 'coinage';
  if (host.includes('assethub') || host.includes('asset-hub')) return 'asset_hub';
  return 'manual_checkout';
}

function normalizePaymentStatus(value: unknown): ParsedPaymentStatus {
  const status = valueAsString(value)?.toLowerCase().replace(/[\s-]+/g, '_');
  if (!status || ['request', 'requested', 'created', 'new', 'open', 'observed'].includes(status)) return 'observed';
  if (['submitted', 'pending', 'processing', 'in_flight', 'broadcast'].includes(status)) return 'submitted';
  if (['settled', 'completed', 'complete', 'finalized', 'finalised', 'paid'].includes(status)) return 'settled';
  if (['unconfirmed', 'needs_confirmation', 'unknown', 'needs_review'].includes(status)) return 'unconfirmed';
  if (['interrupted', 'cancelled', 'canceled', 'expired', 'abandoned', 'timeout', 'timed_out'].includes(status)) return 'interrupted';
  if (['failed', 'declined', 'rejected', 'error'].includes(status)) return 'failed';
  return 'unknown_status';
}

function statusNotice(status: PaymentEvidenceRef['status']): string {
  if (status === 'settled') return 'Payment record found. Receiver still confirms receipt in ChopDot.';
  if (status === 'submitted') return 'Payment appears submitted. Receiver still confirms what arrives.';
  if (status === 'unconfirmed') return 'Payment status needs review. Receiver confirmation is still required.';
  if (status === 'failed') return 'This checkout failed. Record it only after the payment succeeds.';
  return 'Checkout record found. Receiver still confirms receipt in ChopDot.';
}

function displayFor(input: {
  merchantName?: string;
  terminalId?: string;
  amount?: number;
  currency?: string;
  fallback: string;
}): string {
  const amount = input.amount && input.currency ? `${input.amount.toFixed(2)} ${input.currency}` : undefined;
  const merchant = input.merchantName ?? input.terminalId;
  if (merchant && amount) return `${merchant} · ${amount}`;
  if (merchant) return merchant;
  if (amount) return amount;
  return input.fallback;
}

function parseUrlEvidence(raw: string): PaymentEvidenceParseResult | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  const params = url.searchParams;
  const terminalId = firstParam(params, ['terminalId', 'terminal', 'terminal_id', 'till']);
  const merchantName = firstParam(params, ['merchant', 'merchantName', 'business', 'payee']);
  const paymentId = firstParam(params, ['paymentId', 'payment_id', 'id']);
  const currency = firstParam(params, ['currency', 'asset']);
  const memo = firstParam(params, ['memo', 'note', 'description']) ?? 'Checkout purchase';
  const amount = normalizeAmount(firstParam(params, ['displayAmount', 'total', 'amountFiat', 'amount']));
  const source = sourceForUrl(url, terminalId);
  const kind = isT3rminalPayUrl(url) || source === 'w3spay' || source === 'coinage' ? 'checkout_request' : 'payment_reference';
  const status = normalizePaymentStatus(firstParam(params, ['status', 'state', 'paymentStatus']));
  if (status === 'interrupted') {
    return {
      ok: false,
      code: 'interrupted',
      reason: 'This checkout was interrupted. Record the spend only after payment is retried or confirmed another way.',
    };
  }
  if (status === 'failed') {
    return {
      ok: false,
      code: 'failed',
      reason: 'This checkout failed. Record it only after the payment succeeds.',
    };
  }
  if (status === 'unknown_status') {
    return {
      ok: false,
      code: 'unknown_status',
      reason: 'This checkout has a payment status ChopDot does not understand yet.',
    };
  }
  const display = displayFor({ merchantName, terminalId, amount, currency, fallback: memo });
  const evidence: PaymentEvidenceRef = {
    id: `payev_${simpleHash(raw).slice(5)}`,
    kind,
    source,
    status,
    capturedAt: nowIso(),
    display,
    rawHash: simpleHash(raw),
    amount,
    currency,
    merchantName,
    terminalId,
    paymentId,
  };

  return {
    ok: true,
    evidence,
    suggestedAmount: amount,
    suggestedCurrency: currency,
    suggestedMemo: merchantName ? `${merchantName} - ${memo}` : memo,
    notice: statusNotice(status),
  };
}

function parseJsonEvidence(raw: string): PaymentEvidenceParseResult | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const record = parsed as JsonRecord;
  const type = valueAsString(record.type);
  const business = record.business && typeof record.business === 'object' ? (record.business as JsonRecord) : undefined;
  const merchantName =
    valueAsString(record.merchantName) ??
    valueAsString(record.merchant) ??
    valueAsString(business?.name);
  const amount =
    normalizeAmount(record.amount) ??
    normalizeAmount(record.total) ??
    normalizeAmount(record.totalAmount) ??
    normalizeAmount(record.amountCents ? Number(record.amountCents) / 100 : undefined);
  const currency = valueAsString(record.currency) ?? valueAsString(record.asset);
  const receiptId = valueAsString(record.receiptId) ?? valueAsString(record.id);
  const terminalId = valueAsString(record.terminalId);
  const memo = valueAsString(record.memo) ?? valueAsString(record.description) ?? 'Checkout receipt';
  const isReceipt = type === 't3rminal-receipt' || Boolean(receiptId);
  const status = normalizePaymentStatus(record.status ?? record.state ?? record.paymentStatus);
  if (status === 'interrupted') {
    return {
      ok: false,
      code: 'interrupted',
      reason: 'This checkout was interrupted. Record the spend only after payment is retried or confirmed another way.',
    };
  }
  if (status === 'failed') {
    return {
      ok: false,
      code: 'failed',
      reason: 'This checkout failed. Record it only after the payment succeeds.',
    };
  }
  if (status === 'unknown_status') {
    return {
      ok: false,
      code: 'unknown_status',
      reason: 'This checkout has a payment status ChopDot does not understand yet.',
    };
  }
  const display = displayFor({ merchantName, terminalId, amount, currency, fallback: memo });

  const evidence: PaymentEvidenceRef = {
    id: `payev_${simpleHash(raw).slice(5)}`,
    kind: isReceipt ? 'receipt' : 'payment_reference',
    source: type?.includes('t3rminal') ? 't3rminal' : type?.includes('coinage') ? 'coinage' : 'w3spay',
    status,
    capturedAt: nowIso(),
    display,
    rawHash: simpleHash(raw),
    amount,
    currency,
    merchantName,
    terminalId,
    receiptId,
  };

  return {
    ok: true,
    evidence,
    suggestedAmount: amount,
    suggestedCurrency: currency,
    suggestedMemo: merchantName ? `${merchantName} - ${memo}` : memo,
    notice: statusNotice(status),
  };
}

export function parsePaymentEvidence(rawInput: string): PaymentEvidenceParseResult {
  const raw = rawInput.trim();
  if (!raw) {
    return { ok: false, code: 'empty', reason: 'Paste a checkout QR, payment link, or receipt first' };
  }

  const urlResult = parseUrlEvidence(raw);
  if (urlResult) return urlResult;

  const jsonResult = parseJsonEvidence(raw);
  if (jsonResult) return jsonResult;

  const params = new URLSearchParams(raw);
  if (params.has('amount') || params.has('terminalId') || params.has('merchant')) {
	    return parseUrlEvidence(`https://checkout.chopdot.local/?${raw}`) ?? {
	      ok: false,
	      code: 'malformed',
	      reason: 'Could not read this receipt or payment link',
	    };
	  }
	
	  return { ok: false, code: 'unsupported', reason: 'Could not read this receipt or payment link' };
}
