import { describe, expect, it } from 'vitest';
import {
  addDotObligation,
  buildDotStatus,
  claimDotContribution,
  claimDotRelease,
  closeDotChapter,
  confirmDotContributionClaim,
  confirmDotRelease,
  createDotChapter,
  createDotReleaseRequest,
  decideDotApproval,
  exportDotReceipt,
  openDotDispute,
  recordDotException,
  type DotChapter,
  type DotParticipant,
} from './commitmentKernel';

const commonParticipants: DotParticipant[] = [
  { id: 'alex', name: 'Alex', roles: ['organizer', 'treasurer', 'approver'] },
  { id: 'sam', name: 'Sam', roles: ['contributor', 'payer'] },
  { id: 'jordan', name: 'Jordan', roles: ['contributor', 'receiver'] },
  { id: 'vera', name: 'Vera', roles: ['viewer'] },
];

function savingsCircle(): DotChapter {
  return createDotChapter({
    id: 'circle-1',
    name: 'Friday savings circle',
    mode: 'savings_circle',
    currency: 'USD',
    policySummary: 'Members contribute 100 USD each round. Payout order is Jordan, Sam, Alex.',
    participants: commonParticipants,
  });
}

function emergencyPot(): DotChapter {
  return createDotChapter({
    id: 'emergency-1',
    name: 'Medical bridge support for Jordan',
    mode: 'emergency_pot',
    currency: 'USD',
    policySummary: 'Private emergency support. Two approvers required before release.',
    participants: commonParticipants,
    privacyLevel: 'strict',
    reasonCategory: 'medical',
    sensitiveReason: 'Detailed medical note should not leave the private record.',
  });
}

function communityFund(): DotChapter {
  return createDotChapter({
    id: 'fund-1',
    name: 'Builder house community fund',
    mode: 'community_fund',
    currency: 'USDC',
    policySummary: 'Approver must approve releases before anyone records payment outside ChopDot.',
    participants: commonParticipants,
  });
}

describe('ChopDot.dot mode-aware commitment kernel', () => {
  it('keeps a savings circle contribution claim separate from confirmation', () => {
    let chapter = savingsCircle();
    chapter = addDotObligation(chapter, {
      kind: 'circle_contribution',
      title: 'Round 1 contribution',
      fromParticipantId: 'sam',
      toParticipantId: 'alex',
      amount: 100,
      currency: 'USD',
      required: true,
    });

    chapter = claimDotContribution(chapter, {
      obligationId: 'obligation_1',
      claimantId: 'sam',
      note: 'Paid outside ChopDot',
    });

    expect(chapter.contributionClaims[0]?.state).toBe('claimed');
    expect(chapter.obligations[0]?.state).toBe('claimed');
    expect(buildDotStatus(chapter).closeoutReadiness).toBe('blocked');

    chapter = confirmDotContributionClaim(chapter, { claimId: 'claim_1', confirmerId: 'alex' });

    expect(chapter.contributionClaims[0]?.state).toBe('confirmed');
    expect(chapter.obligations[0]?.state).toBe('confirmed');
    expect(buildDotStatus(chapter).closeoutReadiness).toBe('ready');
  });

  it('does not treat approval as payment or release', () => {
    let chapter = communityFund();
    chapter = createDotReleaseRequest(chapter, {
      title: 'Pay venue deposit',
      requesterId: 'alex',
      recipientId: 'jordan',
      amount: 250,
      currency: 'USDC',
      requiredApproverIds: ['alex'],
    });

    chapter = decideDotApproval(chapter, {
      approvalRequestId: 'approval_1',
      approverId: 'alex',
      decision: 'approved',
    });

    expect(chapter.approvalRequests[0]?.state).toBe('approved');
    expect(chapter.releaseRequests[0]?.state).toBe('approved');
    expect(buildDotStatus(chapter).blockers[0]).toContain('record release outside ChopDot');
  });

  it('does not let a release claim close a community fund period', () => {
    let chapter = communityFund();
    chapter = createDotReleaseRequest(chapter, {
      title: 'Pay workshop supplier',
      requesterId: 'alex',
      recipientId: 'jordan',
      amount: 400,
      currency: 'USDC',
      requiredApproverIds: ['alex'],
    });
    chapter = decideDotApproval(chapter, {
      approvalRequestId: 'approval_1',
      approverId: 'alex',
      decision: 'approved',
    });
    chapter = claimDotRelease(chapter, { releaseRequestId: 'release_1', actorId: 'alex' });

    expect(chapter.releaseRequests[0]?.state).toBe('claimed_released');
    expect(() => closeDotChapter(chapter, { actorId: 'alex' })).toThrow(/blocker/i);
    expect(buildDotStatus(chapter).blockers[0]).toContain('Jordan must confirm release');
  });

  it('redacts sensitive emergency pot receipt fields by default', () => {
    let chapter = emergencyPot();
    chapter = createDotReleaseRequest(chapter, {
      title: 'Release emergency support',
      requesterId: 'alex',
      recipientId: 'jordan',
      amount: 500,
      currency: 'USD',
      requiredApproverIds: ['alex'],
    });
    chapter = decideDotApproval(chapter, {
      approvalRequestId: 'approval_1',
      approverId: 'alex',
      decision: 'approved',
    });
    chapter = recordDotException(chapter, {
      subjectType: 'release_request',
      subjectId: 'release_1',
      actorId: 'alex',
      note: 'Release handled manually and documented privately.',
      visibility: 'redacted_export',
    });
    chapter = closeDotChapter(chapter, {
      actorId: 'alex',
      allowOpenItems: true,
      annotation: 'Emergency support closed with manually documented release.',
    });

    const receipt = exportDotReceipt(chapter, { redaction: 'redacted' });

    expect(receipt.chapterName).toBe('Emergency pot');
    expect(receipt.participants.every((participant) => participant.name === undefined)).toBe(true);
    expect(receipt.sensitiveFieldsExcluded).toContain('sensitiveReason');
    expect(JSON.stringify(receipt)).not.toContain('Detailed medical note');
    expect(JSON.stringify(receipt)).not.toContain('Medical bridge support for Jordan');
  });

  it('blocks savings round closeout while required contributions remain unresolved', () => {
    let chapter = savingsCircle();
    chapter = addDotObligation(chapter, {
      kind: 'circle_contribution',
      title: 'Round 1 Sam contribution',
      fromParticipantId: 'sam',
      toParticipantId: 'alex',
      amount: 100,
      currency: 'USD',
      required: true,
    });

    expect(() => closeDotChapter(chapter, { actorId: 'alex' })).toThrow(/blocker/i);
    expect(buildDotStatus(chapter).blockers[0]).toContain('Sam must complete');
  });

  it('blocks community fund closeout while approvals or disputes remain open unless annotated', () => {
    let chapter = communityFund();
    chapter = createDotReleaseRequest(chapter, {
      title: 'Buy shared supplies',
      requesterId: 'alex',
      recipientId: 'jordan',
      amount: 125,
      currency: 'USDC',
      requiredApproverIds: ['alex'],
    });
    chapter = openDotDispute(chapter, {
      subjectType: 'release_request',
      subjectId: 'release_1',
      openedBy: 'sam',
      reason: 'Amount needs review',
    });

    expect(() => closeDotChapter(chapter, { actorId: 'alex' })).toThrow(/blocker/i);

    const closed = closeDotChapter(chapter, {
      actorId: 'alex',
      allowOpenItems: true,
      annotation: 'Closed with pending approval and dispute visible for handoff.',
    });

    expect(closed.state).toBe('closed_with_open_items');
    expect(closed.closeoutSnapshots[0]?.blockerCount).toBeGreaterThan(0);
  });

  it('does not let a viewer mutate contribution, release, exception, or closeout state', () => {
    let chapter = communityFund();
    chapter = addDotObligation(chapter, {
      kind: 'fund_contribution',
      title: 'Monthly Sam contribution',
      fromParticipantId: 'sam',
      toParticipantId: 'alex',
      amount: 80,
      currency: 'USDC',
      required: true,
    });
    chapter = claimDotContribution(chapter, {
      obligationId: 'obligation_1',
      claimantId: 'sam',
      note: 'Paid outside ChopDot',
    });
    chapter = createDotReleaseRequest(chapter, {
      title: 'Buy shared supplies',
      requesterId: 'alex',
      recipientId: 'jordan',
      amount: 125,
      currency: 'USDC',
      requiredApproverIds: ['alex'],
    });
    chapter = decideDotApproval(chapter, {
      approvalRequestId: 'approval_1',
      approverId: 'alex',
      decision: 'approved',
    });
    chapter = claimDotRelease(chapter, { releaseRequestId: 'release_1', actorId: 'alex' });

    expect(() => confirmDotContributionClaim(chapter, { claimId: 'claim_1', confirmerId: 'vera' })).toThrow(
      /Only receiver, organizer, or treasurer can confirm/i,
    );
    expect(() =>
      decideDotApproval(chapter, {
        approvalRequestId: 'approval_1',
        approverId: 'vera',
        decision: 'approved',
      }),
    ).toThrow(/Approver is not required/i);
    expect(() => claimDotRelease(chapter, { releaseRequestId: 'release_1', actorId: 'vera' })).toThrow(
      /Only requester, payer, organizer, or treasurer can claim release/i,
    );
    expect(() => confirmDotRelease(chapter, { releaseRequestId: 'release_1', confirmerId: 'vera' })).toThrow(
      /Only receiver, organizer, or treasurer can confirm release/i,
    );
    expect(() =>
      recordDotException(chapter, {
        subjectType: 'chapter',
        subjectId: chapter.id,
        actorId: 'vera',
        note: 'Viewer should not be able to override blockers.',
        visibility: 'redacted_export',
      }),
    ).toThrow(/Only organizer or treasurer can record exceptions/i);
    expect(() => closeDotChapter(chapter, { actorId: 'vera', allowOpenItems: true, annotation: 'Viewer close' })).toThrow(
      /Only organizer or treasurer can close chapter/i,
    );
  });

  it('keeps a community fund blocked until every required approver approves', () => {
    let chapter = createDotChapter({
      id: 'fund-2',
      name: 'Builder house community fund',
      mode: 'community_fund',
      currency: 'USDC',
      policySummary: 'Two approvers must approve releases before payment is recorded outside ChopDot.',
      participants: [
        { id: 'alex', name: 'Alex', roles: ['organizer', 'treasurer', 'approver'] },
        { id: 'priya', name: 'Priya', roles: ['approver'] },
        { id: 'sam', name: 'Sam', roles: ['payer', 'contributor'] },
        { id: 'jordan', name: 'Jordan', roles: ['receiver'] },
      ],
    });

    chapter = createDotReleaseRequest(chapter, {
      title: 'Pay workshop supplier',
      requesterId: 'alex',
      recipientId: 'jordan',
      amount: 400,
      currency: 'USDC',
      requiredApproverIds: ['alex', 'priya'],
    });
    chapter = decideDotApproval(chapter, {
      approvalRequestId: 'approval_1',
      approverId: 'alex',
      decision: 'approved',
    });

    expect(chapter.approvalRequests[0]?.state).toBe('pending');
    expect(chapter.releaseRequests[0]?.state).toBe('requested');
    expect(() => claimDotRelease(chapter, { releaseRequestId: 'release_1', actorId: 'sam' })).toThrow(
      /Release must be approved/i,
    );
    expect(buildDotStatus(chapter).blockers[0]).toContain('Priya must approve release');

    chapter = decideDotApproval(chapter, {
      approvalRequestId: 'approval_1',
      approverId: 'priya',
      decision: 'approved',
    });

    expect(chapter.approvalRequests[0]?.state).toBe('approved');
    expect(chapter.releaseRequests[0]?.state).toBe('approved');
  });

  it('redacts emergency blocker detail when a pot closes with open items', () => {
    let chapter = emergencyPot();
    chapter = createDotReleaseRequest(chapter, {
      title: 'Private medical transfer to Jordan account ref BANK-SECRET-123',
      requesterId: 'alex',
      recipientId: 'jordan',
      amount: 500,
      currency: 'USD',
      requiredApproverIds: ['alex'],
    });
    chapter = closeDotChapter(chapter, {
      actorId: 'alex',
      allowOpenItems: true,
      annotation: 'Closed with unresolved emergency release visible only to private reviewers.',
    });

    const receipt = exportDotReceipt(chapter, { redaction: 'redacted' });
    const serialized = JSON.stringify(receipt);

    expect(receipt.blockers.length).toBeGreaterThan(0);
    expect(receipt.blockers.every((blocker) => blocker === 'Private emergency item still needs review')).toBe(true);
    expect(receipt.sensitiveFieldsExcluded).toContain('blockerDetail');
    expect(serialized).not.toContain('Jordan');
    expect(serialized).not.toContain('BANK-SECRET-123');
    expect(serialized).not.toContain('Private medical transfer');
    expect(serialized).not.toContain('Detailed medical note');
  });
});
