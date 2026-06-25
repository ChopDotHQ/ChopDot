import { blake2AsHex } from '@polkadot/util-crypto';
import { exportDotReceipt, type DotChapter, type DotReceipt } from './commitmentKernel';

export const REDACTED_RECEIPT_PACKET_V1_SCHEMA = 'chopdot.redacted_receipt_packet.v1' as const;

export type RedactedReceiptPacketV1 = {
  schemaVersion: typeof REDACTED_RECEIPT_PACKET_V1_SCHEMA;
  packetId: string;
  generatedAt: string;
  chapter: {
    id: string;
    mode: DotChapter['mode'];
    state: DotChapter['state'];
    currency: string;
    privacyLevel: DotChapter['privacyLevel'];
    closedAt?: string;
  };
  receipt: DotReceipt;
  receiptHash: string;
  packetHash: string;
  archivePolicy: {
    target: 'bulletin_or_cloud_storage';
    liveHostStatus: 'local_packet_only' | 'host_ready';
    payload: 'redacted_receipt_only';
  };
  safety: {
    doesNotProve: string[];
    excludedFields: string[];
  };
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`).join(',')}}`;
}

export function hashRedactedReceiptPacketPayload(value: unknown): string {
  return blake2AsHex(stableStringify(value), 256);
}

function redactBlockers(receipt: DotReceipt): string[] {
  if (receipt.blockers.length === 0) return [];
  if (receipt.mode === 'emergency_pot') {
    return receipt.blockers.map(() => 'Private emergency item still needs review');
  }
  return receipt.blockers.map(() => 'Open item still needs review');
}

function sanitizeReceiptForPacket(receipt: DotReceipt): DotReceipt {
  return {
    ...receipt,
    redaction: 'redacted',
    participants: receipt.participants.map((participant) => ({ roles: participant.roles })),
    blockers: redactBlockers(receipt),
    sensitiveFieldsExcluded: Array.from(new Set([
      ...receipt.sensitiveFieldsExcluded,
      'participant.name',
      'participant.id',
      'sensitiveReason',
      'paymentReference',
      'privateNotes',
      'blockerDetail',
      'rawEvidence',
      'walletAddress',
      'txHash',
      'bankReference',
    ])).sort(),
  };
}

export function buildRedactedReceiptPacketV1(
  chapter: DotChapter,
  input: { generatedAt?: string; liveHostStatus?: RedactedReceiptPacketV1['archivePolicy']['liveHostStatus'] } = {},
): RedactedReceiptPacketV1 {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const receipt = sanitizeReceiptForPacket({
    ...exportDotReceipt(chapter, { redaction: 'redacted' }),
    generatedAt,
  });
  const receiptHash = hashRedactedReceiptPacketPayload(receipt);
  const body = {
    schemaVersion: REDACTED_RECEIPT_PACKET_V1_SCHEMA,
    packetId: `receipt_packet_${chapter.id}_${receiptHash.slice(2, 10)}`,
    generatedAt,
    chapter: {
      id: chapter.id,
      mode: chapter.mode,
      state: chapter.state,
      currency: chapter.currency,
      privacyLevel: chapter.privacyLevel,
      closedAt: chapter.closedAt,
    },
    receipt,
    receiptHash,
    archivePolicy: {
      target: 'bulletin_or_cloud_storage' as const,
      liveHostStatus: input.liveHostStatus ?? 'local_packet_only',
      payload: 'redacted_receipt_only' as const,
    },
    safety: {
      doesNotProve: [
        'bank settlement',
        'custody',
        'automatic payout',
        'legal settlement',
        'payment confirmation',
      ],
      excludedFields: receipt.sensitiveFieldsExcluded,
    },
  };
  return {
    ...body,
    packetHash: hashRedactedReceiptPacketPayload(body),
  };
}
