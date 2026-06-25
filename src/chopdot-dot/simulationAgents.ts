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
  resolveDotDispute,
  type DotChapter,
  type DotChapterMode,
  type DotParticipant,
  type DotReceipt,
  type DotStatus,
} from './commitmentKernel';

export type DotAgentJob = 'catch' | 'show' | 'move' | 'end' | 'attack' | 'audit';

export type SimulatedDotAgent = {
  id: string;
  participantId: string;
  name: string;
  job: DotAgentJob;
};

export type StatusSnapshot = {
  label: string;
  status: DotStatus;
};

export type ModeSimulationResult = {
  mode: DotChapterMode;
  title: string;
  agents: SimulatedDotAgent[];
  finalChapter: DotChapter;
  statusTimeline: StatusSnapshot[];
  receipt: DotReceipt;
  findings: string[];
};

export type AdversarialCheck = {
  name: string;
  risk: string;
  blocked: boolean;
  evidence: string;
};

export type ChopDotDotSimulationReport = {
  generatedAt: string;
  modeResults: ModeSimulationResult[];
  adversarialChecks: AdversarialCheck[];
  findings: string[];
};

type AttackAttempt = {
  name: string;
  risk: string;
  run: () => void;
};

const savingsParticipants: DotParticipant[] = [
  { id: 'mina', name: 'Mina', roles: ['organizer', 'treasurer', 'approver'] },
  { id: 'leo', name: 'Leo', roles: ['contributor', 'receiver'] },
  { id: 'nia', name: 'Nina', roles: ['contributor'] },
  { id: 'omar', name: 'Omar', roles: ['contributor', 'payer'] },
  { id: 'vera', name: 'Vera', roles: ['viewer'] },
];

const emergencyParticipants: DotParticipant[] = [
  { id: 'riley', name: 'Riley', roles: ['organizer', 'treasurer'] },
  { id: 'taylor', name: 'Taylor', roles: ['approver'] },
  { id: 'casey', name: 'Casey', roles: ['contributor', 'payer'] },
  { id: 'morgan', name: 'Morgan', roles: ['contributor'] },
  { id: 'jordan', name: 'Jordan', roles: ['receiver'] },
  { id: 'lee', name: 'Lee', roles: ['viewer'] },
];

const fundParticipants: DotParticipant[] = [
  { id: 'alex', name: 'Alex', roles: ['organizer', 'treasurer', 'approver'] },
  { id: 'priya', name: 'Priya', roles: ['approver'] },
  { id: 'sam', name: 'Sam', roles: ['contributor', 'payer'] },
  { id: 'jordan', name: 'Jordan', roles: ['receiver'] },
  { id: 'noor', name: 'Noor', roles: ['contributor'] },
  { id: 'vera', name: 'Vera', roles: ['viewer'] },
];

function snapshot(chapter: DotChapter, label: string): StatusSnapshot {
  return { label, status: buildDotStatus(chapter) };
}

function expectBlocked(attempt: AttackAttempt): AdversarialCheck {
  try {
    attempt.run();
    return {
      name: attempt.name,
      risk: attempt.risk,
      blocked: false,
      evidence: 'Attack was accepted.',
    };
  } catch (error) {
    return {
      name: attempt.name,
      risk: attempt.risk,
      blocked: true,
      evidence: error instanceof Error ? error.message : String(error),
    };
  }
}

export function runSavingsCircleAgentSimulation(): ModeSimulationResult {
  const agents: SimulatedDotAgent[] = [
    { id: 'agent-catch', participantId: 'mina', name: 'Organizer agent', job: 'catch' },
    { id: 'agent-show', participantId: 'vera', name: 'Viewer agent', job: 'show' },
    { id: 'agent-member-leo', participantId: 'leo', name: 'Member agent', job: 'move' },
    { id: 'agent-member-nia', participantId: 'nia', name: 'Late-member agent', job: 'move' },
    { id: 'agent-member-omar', participantId: 'omar', name: 'Payer agent', job: 'move' },
    { id: 'agent-end', participantId: 'mina', name: 'Closeout agent', job: 'end' },
  ];
  const statusTimeline: StatusSnapshot[] = [];
  let chapter = createDotChapter({
    id: 'dot-circle-round-1',
    name: 'Friday savings circle - round 1',
    mode: 'savings_circle',
    currency: 'USD',
    policySummary: 'Three members contribute 100 USD. Leo receives round 1 payout. Missed contributions need treasurer annotation.',
    participants: savingsParticipants,
    privacyLevel: 'sensitive',
  });

  chapter = addDotObligation(chapter, {
    kind: 'circle_contribution',
    title: 'Leo round contribution',
    fromParticipantId: 'leo',
    toParticipantId: 'mina',
    amount: 100,
    currency: 'USD',
    required: true,
  });
  chapter = addDotObligation(chapter, {
    kind: 'circle_contribution',
    title: 'Nina round contribution',
    fromParticipantId: 'nia',
    toParticipantId: 'mina',
    amount: 100,
    currency: 'USD',
    required: true,
  });
  chapter = addDotObligation(chapter, {
    kind: 'circle_contribution',
    title: 'Omar round contribution',
    fromParticipantId: 'omar',
    toParticipantId: 'mina',
    amount: 100,
    currency: 'USD',
    required: true,
  });
  statusTimeline.push(snapshot(chapter, 'catch: obligations opened'));

  chapter = claimDotContribution(chapter, { obligationId: 'obligation_1', claimantId: 'leo', note: 'Paid outside ChopDot.' });
  statusTimeline.push(snapshot(chapter, 'move: Leo claimed contribution'));
  chapter = confirmDotContributionClaim(chapter, { claimId: 'claim_1', confirmerId: 'mina' });

  chapter = claimDotContribution(chapter, { obligationId: 'obligation_3', claimantId: 'omar', note: 'Sent bank transfer.' });
  chapter = confirmDotContributionClaim(chapter, { claimId: 'claim_2', confirmerId: 'mina' });

  chapter = recordDotException(chapter, {
    subjectType: 'obligation',
    subjectId: 'obligation_2',
    actorId: 'mina',
    note: 'Nina missed this round and remains visible in private history.',
    visibility: 'organizer_operational',
  });
  statusTimeline.push(snapshot(chapter, 'move: missed contribution annotated'));

  chapter = createDotReleaseRequest(chapter, {
    title: 'Round 1 payout to Leo',
    requesterId: 'mina',
    recipientId: 'leo',
    amount: 200,
    currency: 'USD',
    requiredApproverIds: ['mina'],
  });
  chapter = decideDotApproval(chapter, { approvalRequestId: 'approval_1', approverId: 'mina', decision: 'approved' });
  statusTimeline.push(snapshot(chapter, 'move: payout approved'));
  chapter = claimDotRelease(chapter, { releaseRequestId: 'release_1', actorId: 'omar' });
  statusTimeline.push(snapshot(chapter, 'move: payout claimed released'));
  chapter = confirmDotRelease(chapter, { releaseRequestId: 'release_1', confirmerId: 'leo' });
  statusTimeline.push(snapshot(chapter, 'show: ready to close'));
  chapter = closeDotChapter(chapter, { actorId: 'mina' });

  return {
    mode: 'savings_circle',
    title: 'Savings circle round with missed-payment handling',
    agents,
    finalChapter: chapter,
    statusTimeline,
    receipt: exportDotReceipt(chapter, { redaction: 'redacted' }),
    findings: [
      'A missed contribution can be carried safely only when the treasurer annotates it.',
      'Payout approval, payout claim, and receiver confirmation remain separate.',
      'The closeout can produce a private round receipt without claiming custody or automatic payout.',
    ],
  };
}

export function runEmergencyPotAgentSimulation(): ModeSimulationResult {
  const agents: SimulatedDotAgent[] = [
    { id: 'agent-catch', participantId: 'riley', name: 'Organizer agent', job: 'catch' },
    { id: 'agent-show', participantId: 'lee', name: 'Privacy viewer agent', job: 'show' },
    { id: 'agent-contributor', participantId: 'casey', name: 'Contributor agent', job: 'move' },
    { id: 'agent-approver', participantId: 'taylor', name: 'Approver agent', job: 'move' },
    { id: 'agent-receiver', participantId: 'jordan', name: 'Receiver agent', job: 'move' },
    { id: 'agent-end', participantId: 'riley', name: 'Redacted closeout agent', job: 'end' },
  ];
  const statusTimeline: StatusSnapshot[] = [];
  let chapter = createDotChapter({
    id: 'dot-emergency-pot-1',
    name: 'Medical bridge support for Jordan',
    mode: 'emergency_pot',
    currency: 'USD',
    policySummary: 'Strict privacy emergency pot. Riley and Taylor must approve release readiness.',
    participants: emergencyParticipants,
    privacyLevel: 'strict',
    reasonCategory: 'medical',
    sensitiveReason: 'Private medical details must not appear in exported receipts.',
  });

  chapter = addDotObligation(chapter, {
    kind: 'emergency_contribution',
    title: 'Casey support contribution',
    fromParticipantId: 'casey',
    toParticipantId: 'riley',
    amount: 150,
    currency: 'USD',
    required: true,
  });
  chapter = addDotObligation(chapter, {
    kind: 'emergency_contribution',
    title: 'Morgan support contribution',
    fromParticipantId: 'morgan',
    toParticipantId: 'riley',
    amount: 100,
    currency: 'USD',
    required: true,
  });
  statusTimeline.push(snapshot(chapter, 'catch: private pot opened'));

  chapter = claimDotContribution(chapter, {
    obligationId: 'obligation_1',
    claimantId: 'casey',
    note: 'External transfer sent.',
    evidenceVisibility: 'organizer_operational',
  });
  chapter = confirmDotContributionClaim(chapter, { claimId: 'claim_1', confirmerId: 'riley' });
  chapter = claimDotContribution(chapter, {
    obligationId: 'obligation_2',
    claimantId: 'morgan',
    note: 'Cash contribution delivered.',
    evidenceVisibility: 'organizer_operational',
  });
  chapter = confirmDotContributionClaim(chapter, { claimId: 'claim_2', confirmerId: 'riley' });
  statusTimeline.push(snapshot(chapter, 'move: contributions confirmed privately'));

  chapter = createDotReleaseRequest(chapter, {
    title: 'Release emergency support',
    requesterId: 'riley',
    recipientId: 'jordan',
    amount: 250,
    currency: 'USD',
    requiredApproverIds: ['riley', 'taylor'],
  });
  chapter = decideDotApproval(chapter, { approvalRequestId: 'approval_1', approverId: 'riley', decision: 'approved' });
  statusTimeline.push(snapshot(chapter, 'move: first approval recorded'));
  chapter = decideDotApproval(chapter, { approvalRequestId: 'approval_1', approverId: 'taylor', decision: 'approved' });
  chapter = claimDotRelease(chapter, { releaseRequestId: 'release_1', actorId: 'riley' });
  statusTimeline.push(snapshot(chapter, 'move: release claimed outside ChopDot'));
  chapter = confirmDotRelease(chapter, { releaseRequestId: 'release_1', confirmerId: 'jordan' });
  statusTimeline.push(snapshot(chapter, 'show: redacted closeout ready'));
  chapter = closeDotChapter(chapter, { actorId: 'riley' });

  return {
    mode: 'emergency_pot',
    title: 'Emergency pot with private contributions and redacted closeout',
    agents,
    finalChapter: chapter,
    statusTimeline,
    receipt: exportDotReceipt(chapter, { redaction: 'redacted' }),
    findings: [
      'The emergency flow can close without exposing the recipient name or sensitive reason in the receipt.',
      'Approval readiness does not count as payment or release.',
      'The product language should stay privacy-first because this mode is easiest to harm with public proof.',
    ],
  };
}

export function runCommunityFundAgentSimulation(): ModeSimulationResult {
  const agents: SimulatedDotAgent[] = [
    { id: 'agent-catch', participantId: 'alex', name: 'Admin agent', job: 'catch' },
    { id: 'agent-show', participantId: 'vera', name: 'Reviewer agent', job: 'show' },
    { id: 'agent-contributor', participantId: 'sam', name: 'Contributor agent', job: 'move' },
    { id: 'agent-approver-one', participantId: 'alex', name: 'Approver agent one', job: 'move' },
    { id: 'agent-approver-two', participantId: 'priya', name: 'Approver agent two', job: 'move' },
    { id: 'agent-payer', participantId: 'sam', name: 'Payer agent', job: 'move' },
    { id: 'agent-receiver', participantId: 'jordan', name: 'Receiver agent', job: 'move' },
    { id: 'agent-end', participantId: 'alex', name: 'Handoff closeout agent', job: 'end' },
  ];
  const statusTimeline: StatusSnapshot[] = [];
  let chapter = createDotChapter({
    id: 'dot-community-fund-period-1',
    name: 'Builder house community fund - June',
    mode: 'community_fund',
    currency: 'USDC',
    policySummary: 'Two approvers required for releases. External payments are recorded and confirmed by receiver.',
    participants: fundParticipants,
    privacyLevel: 'sensitive',
  });

  chapter = addDotObligation(chapter, {
    kind: 'fund_contribution',
    title: 'Sam June fund contribution',
    fromParticipantId: 'sam',
    toParticipantId: 'alex',
    amount: 300,
    currency: 'USDC',
    required: true,
  });
  chapter = addDotObligation(chapter, {
    kind: 'fund_contribution',
    title: 'Noor June fund contribution',
    fromParticipantId: 'noor',
    toParticipantId: 'alex',
    amount: 200,
    currency: 'USDC',
    required: true,
  });
  statusTimeline.push(snapshot(chapter, 'catch: fund period opened'));

  chapter = claimDotContribution(chapter, { obligationId: 'obligation_1', claimantId: 'sam', note: 'USDC sent externally.' });
  chapter = confirmDotContributionClaim(chapter, { claimId: 'claim_1', confirmerId: 'alex' });
  chapter = claimDotContribution(chapter, { obligationId: 'obligation_2', claimantId: 'noor', note: 'Bank transfer sent.' });
  chapter = confirmDotContributionClaim(chapter, { claimId: 'claim_2', confirmerId: 'alex' });
  statusTimeline.push(snapshot(chapter, 'move: contributions confirmed'));

  chapter = createDotReleaseRequest(chapter, {
    title: 'Pay workshop supplier',
    requesterId: 'alex',
    recipientId: 'jordan',
    amount: 180,
    currency: 'USDC',
    requiredApproverIds: ['alex', 'priya'],
  });
  chapter = decideDotApproval(chapter, { approvalRequestId: 'approval_1', approverId: 'alex', decision: 'approved' });
  statusTimeline.push(snapshot(chapter, 'move: waiting on second approver'));
  chapter = decideDotApproval(chapter, { approvalRequestId: 'approval_1', approverId: 'priya', decision: 'approved' });
  chapter = claimDotRelease(chapter, { releaseRequestId: 'release_1', actorId: 'sam' });
  statusTimeline.push(snapshot(chapter, 'move: payment claimed'));
  chapter = confirmDotRelease(chapter, { releaseRequestId: 'release_1', confirmerId: 'jordan' });
  statusTimeline.push(snapshot(chapter, 'show: handoff closeout ready'));
  chapter = closeDotChapter(chapter, { actorId: 'alex' });

  return {
    mode: 'community_fund',
    title: 'Community fund period with two approvals and handoff receipt',
    agents,
    finalChapter: chapter,
    statusTimeline,
    receipt: exportDotReceipt(chapter, { redaction: 'redacted' }),
    findings: [
      'The fund behaves like a handoff ledger, not a DAO or treasury executor.',
      'Two-step approval remains visible until every required approver acts.',
      'The payer claim still needs receiver confirmation before clean closeout.',
    ],
  };
}

export function runChopDotDotAdversarialChecks(): AdversarialCheck[] {
  const checks: AdversarialCheck[] = [];

  let duplicateClaimChapter = createDotChapter({
    id: 'attack-duplicate-claim',
    name: 'Duplicate claim attack',
    mode: 'savings_circle',
    currency: 'USD',
    policySummary: 'One contribution should only have one active claim.',
    participants: savingsParticipants,
  });
  duplicateClaimChapter = addDotObligation(duplicateClaimChapter, {
    kind: 'circle_contribution',
    title: 'Leo contribution',
    fromParticipantId: 'leo',
    toParticipantId: 'mina',
    amount: 100,
    currency: 'USD',
    required: true,
  });
  duplicateClaimChapter = claimDotContribution(duplicateClaimChapter, {
    obligationId: 'obligation_1',
    claimantId: 'leo',
  });
  const claimedOnce = duplicateClaimChapter;
  checks.push(expectBlocked({
    name: 'Duplicate contribution claim',
    risk: 'A member could flood a round with repeated claims for the same obligation.',
    run: () => {
      claimDotContribution(claimedOnce, { obligationId: 'obligation_1', claimantId: 'leo' });
    },
  }));

  checks.push(expectBlocked({
    name: 'Wrong person claims contribution',
    risk: 'A participant could claim someone else paid.',
    run: () => {
      claimDotContribution(claimedOnce, { obligationId: 'obligation_1', claimantId: 'nia' });
    },
  }));

  let releaseChapter = createDotChapter({
    id: 'attack-release',
    name: 'Release attack',
    mode: 'community_fund',
    currency: 'USDC',
    policySummary: 'Only authorized actors can record releases.',
    participants: fundParticipants,
  });
  releaseChapter = createDotReleaseRequest(releaseChapter, {
    title: 'Pay supplier',
    requesterId: 'alex',
    recipientId: 'jordan',
    amount: 100,
    currency: 'USDC',
    requiredApproverIds: ['alex'],
  });
  const pendingReleaseChapter = releaseChapter;
  checks.push(expectBlocked({
    name: 'Release claim before approval',
    risk: 'A payment could be claimed before approval readiness exists.',
    run: () => {
      claimDotRelease(pendingReleaseChapter, { releaseRequestId: 'release_1', actorId: 'sam' });
    },
  }));

  releaseChapter = decideDotApproval(releaseChapter, {
    approvalRequestId: 'approval_1',
    approverId: 'alex',
    decision: 'approved',
  });
  const approvedReleaseChapter = releaseChapter;
  checks.push(expectBlocked({
    name: 'Viewer claims release',
    risk: 'A read-only actor could record an external payment claim.',
    run: () => {
      claimDotRelease(approvedReleaseChapter, { releaseRequestId: 'release_1', actorId: 'vera' });
    },
  }));

  checks.push(expectBlocked({
    name: 'Duplicate approval decision',
    risk: 'One approver could create misleading multiple approval events.',
    run: () => {
      decideDotApproval(approvedReleaseChapter, {
        approvalRequestId: 'approval_1',
        approverId: 'alex',
        decision: 'approved',
      });
    },
  }));

  checks.push(expectBlocked({
    name: 'Unrequired approver decision',
    risk: 'A non-required actor could push a release through.',
    run: () => {
      decideDotApproval(pendingReleaseChapter, {
        approvalRequestId: 'approval_1',
        approverId: 'priya',
        decision: 'approved',
      });
    },
  }));

  checks.push(expectBlocked({
    name: 'Viewer records exception',
    risk: 'A read-only actor could hide blockers by adding exception notes.',
    run: () => {
      recordDotException(pendingReleaseChapter, {
        subjectType: 'release_request',
        subjectId: 'release_1',
        actorId: 'vera',
        note: 'Trying to bypass blocker.',
        visibility: 'redacted_export',
      });
    },
  }));

  checks.push(expectBlocked({
    name: 'Negative obligation amount',
    risk: 'A malformed obligation could invert contribution meaning.',
    run: () => {
      addDotObligation(pendingReleaseChapter, {
        kind: 'fund_contribution',
        title: 'Bad contribution',
        fromParticipantId: 'sam',
        toParticipantId: 'alex',
        amount: -1,
        currency: 'USDC',
        required: true,
      });
    },
  }));

  checks.push(expectBlocked({
    name: 'Clean close with missing contribution',
    risk: 'A chapter could close while required work remains open.',
    run: () => {
      let chapter = createDotChapter({
        id: 'attack-missing-contribution',
        name: 'Missing contribution attack',
        mode: 'savings_circle',
        currency: 'USD',
        policySummary: 'Required contribution must block clean close.',
        participants: savingsParticipants,
      });
      chapter = addDotObligation(chapter, {
        kind: 'circle_contribution',
        title: 'Leo contribution',
        fromParticipantId: 'leo',
        toParticipantId: 'mina',
        amount: 100,
        currency: 'USD',
        required: true,
      });
      closeDotChapter(chapter, { actorId: 'mina' });
    },
  }));

  checks.push(expectBlocked({
    name: 'Open-item close without annotation',
    risk: 'An organizer could close unresolved items with no explanation.',
    run: () => {
      let chapter = createDotChapter({
        id: 'attack-open-closeout',
        name: 'Open closeout attack',
        mode: 'community_fund',
        currency: 'USDC',
        policySummary: 'Open items need a closeout note.',
        participants: fundParticipants,
      });
      chapter = createDotReleaseRequest(chapter, {
        title: 'Unfinished release',
        requesterId: 'alex',
        recipientId: 'jordan',
        amount: 100,
        currency: 'USDC',
        requiredApproverIds: ['alex'],
      });
      closeDotChapter(chapter, { actorId: 'alex', allowOpenItems: true });
    },
  }));

  let disputeChapter = createDotChapter({
    id: 'attack-dispute-resolution',
    name: 'Dispute resolution authority',
    mode: 'community_fund',
    currency: 'USDC',
    policySummary: 'Only the opener or operator roles can resolve disputes.',
    participants: fundParticipants,
  });
  disputeChapter = openDotDispute(disputeChapter, {
    subjectType: 'release_request',
    subjectId: 'release_1',
    openedBy: 'sam',
    reason: 'Suspicious release.',
  });
  checks.push(expectBlocked({
    name: 'Viewer resolves dispute',
    risk: 'A read-only actor could erase a contested item.',
    run: () => {
      resolveDotDispute(disputeChapter, { disputeId: 'dispute_1', actorId: 'vera' });
    },
  }));

  const emergency = runEmergencyPotAgentSimulation();
  const redactedReceipt = JSON.stringify(emergency.receipt);
  checks.push({
    name: 'Emergency redaction',
    risk: 'Sensitive emergency details could leak into exported records.',
    blocked:
      !redactedReceipt.includes('Jordan') &&
      !redactedReceipt.includes('Medical bridge support') &&
      !redactedReceipt.includes('Private medical details'),
    evidence: 'Redacted receipt excludes participant names, original title, and sensitive reason text.',
  });

  return checks;
}

export function runChopDotDotAgentSimulationReport(): ChopDotDotSimulationReport {
  const modeResults = [
    runSavingsCircleAgentSimulation(),
    runEmergencyPotAgentSimulation(),
    runCommunityFundAgentSimulation(),
  ];
  const adversarialChecks = runChopDotDotAdversarialChecks();
  const failedChecks = adversarialChecks.filter((check) => !check.blocked);
  return {
    generatedAt: new Date().toISOString(),
    modeResults,
    adversarialChecks,
    findings: [
      'All three expanded modes can complete the shared Catch, Show, Move, End loop.',
      'The strongest common product surface is a status board showing next actor and blockers.',
      'The adversarial pass confirms the clean closeout rule is doing useful work.',
      failedChecks.length === 0
        ? 'No adversarial checks bypassed the current kernel guardrails.'
        : `${failedChecks.length} adversarial check(s) bypassed the current kernel guardrails.`,
    ],
  };
}
