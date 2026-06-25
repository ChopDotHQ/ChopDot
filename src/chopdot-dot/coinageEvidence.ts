import { blake2AsHex } from '@polkadot/util-crypto';
import type { PaymentEvidenceRef } from '../chapter/types';

export type CoinageHostEvidenceFailureCode =
  | 'host_unavailable'
  | 'timeout'
  | 'rejected'
  | 'unsupported'
  | 'failed'
  | 'privacy_violation';

export type CoinageHostPaymentInput = {
  subjectId: string;
  paymentId: string;
  amount: number;
  currency: string;
  merchantName?: string;
  terminalId?: string;
  topic?: string;
  encryptedCheque?: string;
  ephemeralPublicKey?: string;
  rawPaymentLink?: string;
};

export type CoinageHostClaimStatus =
  | 'submitted'
  | 'claimed'
  | 'settled'
  | 'timeout'
  | 'rejected'
  | 'unsupported'
  | 'failed';

export type CoinageHostClaimOutcome = {
  status: CoinageHostClaimStatus;
  reason?: string;
  txHash?: string;
  blockNumber?: number;
  extrinsicIndex?: number;
};

export type CoinageEvidenceResult =
  | {
      ok: true;
      evidence: PaymentEvidenceRef;
      deduped: boolean;
      notice: string;
      privateFieldsExcluded: string[];
    }
  | {
      ok: false;
      code: CoinageHostEvidenceFailureCode;
      reason: string;
    };

export interface CoinageHostClient {
  claimPayment(input: CoinageHostPaymentInput): Promise<CoinageHostClaimOutcome>;
}

export type CoinageHostEvidenceAdapterOptions = {
  shouldAttemptHost?: () => boolean;
  requireHost?: boolean;
  client?: CoinageHostClient;
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`).join(',')}}`;
}

function likelyInsideProductHost(): boolean {
  return typeof window !== 'undefined' && window.parent !== window;
}

function displayFor(input: CoinageHostPaymentInput): string {
  const amount = `${input.amount.toFixed(2)} ${input.currency}`;
  if (input.merchantName) return `${input.merchantName} · ${amount}`;
  if (input.terminalId) return `${input.terminalId} · ${amount}`;
  return amount;
}

function evidenceStatusFor(status: CoinageHostClaimStatus): PaymentEvidenceRef['status'] | null {
  if (status === 'submitted') return 'submitted';
  if (status === 'claimed' || status === 'settled') return 'settled';
  if (status === 'failed') return 'failed';
  return null;
}

function failureFor(status: CoinageHostClaimStatus, reason?: string): CoinageEvidenceResult {
  if (status === 'timeout') {
    return {
      ok: false,
      code: 'timeout',
      reason: reason ?? 'Coinage payment evidence timed out. Record another payment proof or try again.',
    };
  }
  if (status === 'rejected') {
    return {
      ok: false,
      code: 'rejected',
      reason: reason ?? 'Coinage payment evidence was rejected and cannot support this claim.',
    };
  }
  if (status === 'unsupported') {
    return {
      ok: false,
      code: 'unsupported',
      reason: reason ?? 'This host does not support Coinage payment evidence yet.',
    };
  }
  return {
    ok: false,
    code: 'failed',
    reason: reason ?? 'Coinage payment evidence failed and cannot support this claim.',
  };
}

function containsPrivateSecret(input: CoinageHostPaymentInput): boolean {
  const candidate = input.rawPaymentLink ?? '';
  if (!candidate) return false;
  try {
    const parsed = new URL(candidate);
    return ['secret', 'privateKey', 'private_key', 'seed', 'mnemonic'].some((key) => parsed.searchParams.has(key));
  } catch {
    return /(?:secret|privateKey|private_key|seed|mnemonic)=/i.test(candidate);
  }
}

export class CoinageHostEvidenceAdapter {
  readonly kind = 'coinage_host_evidence';
  private readonly shouldAttemptHost: () => boolean;
  private readonly requireHost: boolean;
  private readonly client?: CoinageHostClient;
  private readonly seenEvidence = new Map<string, PaymentEvidenceRef>();

  constructor(options: CoinageHostEvidenceAdapterOptions = {}) {
    this.shouldAttemptHost = options.shouldAttemptHost ?? likelyInsideProductHost;
    this.requireHost = options.requireHost ?? false;
    this.client = options.client;
  }

  async evidenceForPayment(input: CoinageHostPaymentInput): Promise<CoinageEvidenceResult> {
    if (containsPrivateSecret(input)) {
      return {
        ok: false,
        code: 'privacy_violation',
        reason: 'Coinage payment evidence includes private secret material and was rejected.',
      };
    }

    const dedupeKey = `${input.subjectId}:${input.paymentId}`;
    const existing = this.seenEvidence.get(dedupeKey);
    if (existing) {
      return {
        ok: true,
        evidence: existing,
        deduped: true,
        notice: 'Coinage evidence was already recorded. Receiver confirmation is still required.',
        privateFieldsExcluded: ['encryptedCheque', 'ephemeralPublicKey', 'rawPaymentLink'],
      };
    }

    if (!this.shouldAttemptHost() || !this.client) {
      if (this.requireHost) {
        return {
          ok: false,
          code: 'host_unavailable',
          reason: 'Coinage payment evidence requires the Polkadot host and cannot use local fallback.',
        };
      }
      const evidence = this.buildEvidence(input, 'observed');
      this.seenEvidence.set(dedupeKey, evidence);
      return {
        ok: true,
        evidence,
        deduped: false,
        notice: 'Coinage evidence was recorded locally for review. Receiver confirmation is still required.',
        privateFieldsExcluded: ['encryptedCheque', 'ephemeralPublicKey', 'rawPaymentLink'],
      };
    }

    const outcome = await this.client.claimPayment(input);
    const status = evidenceStatusFor(outcome.status);
    if (!status) return failureFor(outcome.status, outcome.reason);

    const evidence = this.buildEvidence(input, status, outcome);
    this.seenEvidence.set(dedupeKey, evidence);
    return {
      ok: true,
      evidence,
      deduped: false,
      notice: 'Coinage payment evidence found. Receiver confirmation is still required.',
      privateFieldsExcluded: ['encryptedCheque', 'ephemeralPublicKey', 'rawPaymentLink'],
    };
  }

  private buildEvidence(
    input: CoinageHostPaymentInput,
    status: PaymentEvidenceRef['status'],
    outcome?: CoinageHostClaimOutcome,
  ): PaymentEvidenceRef {
    return {
      id: `coinage_${blake2AsHex(`${input.subjectId}:${input.paymentId}`, 256).slice(2, 14)}`,
      kind: 'checkout_request',
      source: 'coinage',
      status,
      capturedAt: new Date().toISOString(),
      display: displayFor(input),
      rawHash: blake2AsHex(stableStringify({
        subjectId: input.subjectId,
        paymentId: input.paymentId,
        amount: input.amount,
        currency: input.currency,
        merchantName: input.merchantName,
        terminalId: input.terminalId,
        topic: input.topic,
        txHash: outcome?.txHash,
        blockNumber: outcome?.blockNumber,
        extrinsicIndex: outcome?.extrinsicIndex,
      }), 256),
      amount: input.amount,
      currency: input.currency,
      merchantName: input.merchantName,
      terminalId: input.terminalId,
      paymentId: input.paymentId,
    };
  }
}

