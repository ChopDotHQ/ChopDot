import { describe, expect, it } from 'vitest';
import {
  addDotObligation,
  claimDotContribution,
  closeDotChapter,
  confirmDotContributionClaim,
  createDotChapter,
  createDotReleaseRequest,
  decideDotApproval,
  recordDotException,
  type DotChapter,
  type DotParticipant,
} from './commitmentKernel';
import {
  buildRedactedReceiptPacketV1,
  hashRedactedReceiptPacketPayload,
  REDACTED_RECEIPT_PACKET_V1_SCHEMA,
} from './receiptPacket';

const participants: DotParticipant[] = [
  { id: 'mina', name: 'Mina', roles: ['organizer', 'treasurer', 'approver'] },
  { id: 'leo', name: 'Leo', roles: ['contributor', 'receiver'] },
  { id: 'nina', name: 'Nina', roles: ['contributor'] },
  { id: 'omar', name: 'Omar', roles: ['contributor', 'payer'] },
  { id: 'vera', name: 'Vera', roles: ['viewer'] },
];

function closeSavingsCircle(): DotChapter {
  let chapter = createDotChapter({
    id: 'packet-savings',
    name: 'Friday savings circle',
    mode: 'savings_circle',
    currency: 'USD',
    policySummary: 'Members contribute 100 USD each round.',
    participants,
    privacyLevel: 'standard',
  });
  chapter = addDotObligation(chapter, {
    id: 'leo-round-1',
    kind: 'circle_contribution',
    title: 'Leo round 1 contribution',
    fromParticipantId: 'leo',
    toParticipantId: 'mina',
    amount: 100,
    currency: 'USD',
    required: true,
  });
  chapter = claimDotContribution(chapter, {
    obligationId: 'leo-round-1',
    claimantId: 'leo',
    note: 'Paid outside ChopDot with private receipt REF-LEO-SECRET',
  });
  chapter = confirmDotContributionClaim(chapter, { claimId: 'claim_1', confirmerId: 'mina' });
  return closeDotChapter(chapter, { actorId: 'mina' });
}

function closeEmergencyPotWithOpenItems(): DotChapter {
  let chapter = createDotChapter({
    id: 'packet-emergency',
    name: 'Emergency support for Leo',
    mode: 'emergency_pot',
    currency: 'USD',
    policySummary: 'Private emergency support. Approver required before release.',
    participants,
    privacyLevel: 'strict',
    reasonCategory: 'medical',
    sensitiveReason: 'Private surgery bridge note and bank ref BANK-SECRET-911.',
  });
  chapter = createDotReleaseRequest(chapter, {
    id: 'release-private-medical',
    title: 'Private medical release to Leo BANK-SECRET-911',
    requesterId: 'mina',
    recipientId: 'leo',
    amount: 500,
    currency: 'USD',
    requiredApproverIds: ['mina'],
  });
  chapter = recordDotException(chapter, {
    subjectType: 'release_request',
    subjectId: 'release-private-medical',
    actorId: 'mina',
    note: 'Private transfer reference TX-SECRET-123 handled outside ChopDot.',
    visibility: 'redacted_export',
  });
  return closeDotChapter(chapter, {
    actorId: 'mina',
    allowOpenItems: true,
    annotation: 'Closed with private emergency evidence held outside public packet.',
  });
}

function closeCommunityFundWithOpenItems(): DotChapter {
  let chapter = createDotChapter({
    id: 'packet-community',
    name: 'Builder house community fund',
    mode: 'community_fund',
    currency: 'USDC',
    policySummary: 'Approvers review releases before payment is recorded.',
    participants,
    privacyLevel: 'sensitive',
  });
  chapter = createDotReleaseRequest(chapter, {
    id: 'release-supplier',
    title: 'Supplier payout to Omar wallet 5FSECRET',
    requesterId: 'mina',
    recipientId: 'omar',
    amount: 250,
    currency: 'USDC',
    requiredApproverIds: ['mina'],
  });
  chapter = decideDotApproval(chapter, {
    approvalRequestId: 'approval_1',
    approverId: 'mina',
    decision: 'approved',
  });
  return closeDotChapter(chapter, {
    actorId: 'mina',
    allowOpenItems: true,
    annotation: 'Closed with supplier payment still awaiting receipt confirmation.',
  });
}

describe('RedactedReceiptPacketV1', () => {
  it('builds a schema-versioned, hashable savings circle packet', () => {
    const packet = buildRedactedReceiptPacketV1(closeSavingsCircle(), {
      generatedAt: '2026-06-21T12:00:00.000Z',
    });

    expect(packet.schemaVersion).toBe(REDACTED_RECEIPT_PACKET_V1_SCHEMA);
    expect(packet.receipt.mode).toBe('savings_circle');
    expect(packet.receipt.summary.confirmedObligationCount).toBe(1);
    expect(packet.receiptHash).toMatch(/^0x/);
    expect(packet.packetHash).toBe(hashRedactedReceiptPacketPayload({
      schemaVersion: packet.schemaVersion,
      packetId: packet.packetId,
      generatedAt: packet.generatedAt,
      chapter: packet.chapter,
      receipt: packet.receipt,
      receiptHash: packet.receiptHash,
      archivePolicy: packet.archivePolicy,
      safety: packet.safety,
    }));
    expect(packet.safety.doesNotProve).toContain('payment confirmation');
  });

  it('redacts emergency names, reasons, payment refs, and blocker details', () => {
    const packet = buildRedactedReceiptPacketV1(closeEmergencyPotWithOpenItems(), {
      generatedAt: '2026-06-21T12:00:00.000Z',
    });
    const serialized = JSON.stringify(packet);

    expect(packet.receipt.chapterName).toBe('Emergency pot');
    expect(packet.receipt.blockers).toEqual(['Private emergency item still needs review']);
    expect(packet.receipt.sensitiveFieldsExcluded).toEqual(expect.arrayContaining([
      'participant.name',
      'sensitiveReason',
      'paymentReference',
      'txHash',
      'bankReference',
      'blockerDetail',
    ]));
    expect(serialized).not.toContain('Leo');
    expect(serialized).not.toContain('Private surgery');
    expect(serialized).not.toContain('BANK-SECRET-911');
    expect(serialized).not.toContain('TX-SECRET-123');
    expect(serialized).not.toContain('Private medical release');
  });

  it('produces a conservative community fund handoff packet without leaking payment detail', () => {
    const packet = buildRedactedReceiptPacketV1(closeCommunityFundWithOpenItems(), {
      generatedAt: '2026-06-21T12:00:00.000Z',
      liveHostStatus: 'host_ready',
    });
    const serialized = JSON.stringify(packet);

    expect(packet.archivePolicy.liveHostStatus).toBe('host_ready');
    expect(packet.receipt.mode).toBe('community_fund');
    expect(packet.receipt.state).toBe('closed_with_open_items');
    expect(packet.receipt.blockers).toEqual(['Open item still needs review']);
    expect(serialized).not.toContain('Omar');
    expect(serialized).not.toContain('5FSECRET');
    expect(serialized).not.toContain('Supplier payout');
    expect(packet.safety.doesNotProve).toContain('custody');
    expect(packet.safety.doesNotProve).toContain('legal settlement');
  });
});
