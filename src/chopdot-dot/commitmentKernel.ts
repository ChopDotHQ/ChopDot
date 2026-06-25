export type DotChapterMode =
  | 'event_deposit'
  | 'shared_expense'
  | 'savings_circle'
  | 'emergency_pot'
  | 'community_fund';

export type DotRole =
  | 'organizer'
  | 'treasurer'
  | 'approver'
  | 'contributor'
  | 'receiver'
  | 'viewer'
  | 'payer';

export type DotVisibility =
  | 'private_actor'
  | 'counterparty_visible'
  | 'organizer_operational'
  | 'scoped_group_summary'
  | 'redacted_export'
  | 'hash_only';

export type DotChapterState = 'open' | 'closed' | 'closed_with_open_items' | 'voided';
export type DotObligationState = 'open' | 'claimed' | 'confirmed' | 'exception_recorded';
export type DotClaimState = 'claimed' | 'confirmed' | 'denied';
export type DotApprovalState = 'pending' | 'approved' | 'denied' | 'needs_review';
export type DotReleaseState =
  | 'requested'
  | 'approved'
  | 'denied'
  | 'needs_review'
  | 'claimed_released'
  | 'confirmed';
export type DotDisputeState = 'open' | 'resolved';

export type DotParticipant = {
  id: string;
  name: string;
  roles: DotRole[];
};

export type DotPolicyVersion = {
  id: string;
  summary: string;
  createdAt: string;
};

export type DotObligation = {
  id: string;
  kind: 'deposit' | 'expense_leg' | 'circle_contribution' | 'emergency_contribution' | 'fund_contribution';
  title: string;
  fromParticipantId: string;
  toParticipantId: string;
  amount: number;
  currency: string;
  required: boolean;
  state: DotObligationState;
  policyVersionId: string;
};

export type DotContributionClaim = {
  id: string;
  obligationId: string;
  claimantId: string;
  receiverId: string;
  state: DotClaimState;
  evidenceVisibility: DotVisibility;
  note?: string;
  createdAt: string;
  confirmedAt?: string;
};

export type DotApprovalRequest = {
  id: string;
  releaseRequestId: string;
  requiredApproverIds: string[];
  state: DotApprovalState;
  createdAt: string;
};

export type DotApprovalDecision = {
  id: string;
  approvalRequestId: string;
  approverId: string;
  decision: Exclude<DotApprovalState, 'pending'>;
  note?: string;
  createdAt: string;
};

export type DotReleaseRequest = {
  id: string;
  title: string;
  requesterId: string;
  recipientId: string;
  amount: number;
  currency: string;
  state: DotReleaseState;
  createdAt: string;
  claimedAt?: string;
  confirmedAt?: string;
};

export type DotConfirmation = {
  id: string;
  subjectType: 'contribution_claim' | 'release_request';
  subjectId: string;
  confirmerId: string;
  createdAt: string;
};

export type DotDispute = {
  id: string;
  subjectType: 'obligation' | 'contribution_claim' | 'approval_request' | 'release_request';
  subjectId: string;
  openedBy: string;
  reason: string;
  state: DotDisputeState;
  createdAt: string;
};

export type DotExceptionNote = {
  id: string;
  subjectType: 'chapter' | 'obligation' | 'contribution_claim' | 'approval_request' | 'release_request';
  subjectId: string;
  actorId: string;
  note: string;
  visibility: DotVisibility;
  createdAt: string;
};

export type DotCloseoutSnapshot = {
  id: string;
  chapterId: string;
  state: Extract<DotChapterState, 'closed' | 'closed_with_open_items' | 'voided'>;
  blockerCount: number;
  blockers: string[];
  createdAt: string;
};

export type DotReceipt = {
  chapterId: string;
  chapterName: string;
  mode: DotChapterMode;
  state: DotChapterState;
  redaction: 'full' | 'redacted';
  generatedAt: string;
  summary: {
    obligationCount: number;
    confirmedObligationCount: number;
    releaseRequestCount: number;
    confirmedReleaseCount: number;
    openDisputeCount: number;
    exceptionCount: number;
  };
  participants: Array<{ id?: string; name?: string; roles: DotRole[] }>;
  blockers: string[];
  policyRefs: string[];
  sensitiveFieldsExcluded: string[];
};

export type DotChapter = {
  id: string;
  name: string;
  mode: DotChapterMode;
  currency: string;
  state: DotChapterState;
  privacyLevel: 'standard' | 'sensitive' | 'strict';
  reasonCategory?: string;
  sensitiveReason?: string;
  policyVersions: DotPolicyVersion[];
  participants: DotParticipant[];
  obligations: DotObligation[];
  contributionClaims: DotContributionClaim[];
  releaseRequests: DotReleaseRequest[];
  approvalRequests: DotApprovalRequest[];
  approvalDecisions: DotApprovalDecision[];
  confirmations: DotConfirmation[];
  disputes: DotDispute[];
  exceptions: DotExceptionNote[];
  closeoutSnapshots: DotCloseoutSnapshot[];
  createdAt: string;
  closedAt?: string;
};

export type DotStatus = {
  chapterId: string;
  state: DotChapterState;
  blockers: string[];
  nextActor?: string;
  nextAction?: string;
  closeoutReadiness: 'ready' | 'blocked' | 'closed';
};

type CreateDotChapterInput = {
  id?: string;
  name: string;
  mode: DotChapterMode;
  currency: string;
  policySummary: string;
  participants: DotParticipant[];
  privacyLevel?: DotChapter['privacyLevel'];
  reasonCategory?: string;
  sensitiveReason?: string;
};

type AddObligationInput = Omit<DotObligation, 'id' | 'state' | 'policyVersionId'> & {
  id?: string;
  policyVersionId?: string;
};

type CreateReleaseInput = {
  id?: string;
  title: string;
  requesterId: string;
  recipientId: string;
  amount: number;
  currency: string;
  requiredApproverIds: string[];
};

function nowIso(): string {
  return new Date().toISOString();
}

function nextId(prefix: string, length: number): string {
  return `${prefix}_${length + 1}`;
}

function assertOpen(chapter: DotChapter): void {
  if (chapter.state !== 'open') {
    throw new Error('Chapter is closed');
  }
}

function findParticipant(chapter: DotChapter, participantId: string): DotParticipant {
  const participant = chapter.participants.find((item) => item.id === participantId);
  if (!participant) {
    throw new Error(`Unknown participant: ${participantId}`);
  }
  return participant;
}

function hasAnyRole(chapter: DotChapter, participantId: string, roles: DotRole[]): boolean {
  return findParticipant(chapter, participantId).roles.some((role) => roles.includes(role));
}

function assertPositiveAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Amount must be greater than zero');
  }
}

function hasException(chapter: DotChapter, subjectType: DotExceptionNote['subjectType'], subjectId: string): boolean {
  return chapter.exceptions.some(
    (note) => note.subjectType === subjectType && note.subjectId === subjectId,
  );
}

function participantLabel(chapter: DotChapter, participantId: string): string {
  return chapter.participants.find((item) => item.id === participantId)?.name ?? participantId;
}

export function createDotChapter(input: CreateDotChapterInput): DotChapter {
  const createdAt = nowIso();
  return {
    id: input.id ?? `dot_chapter_${Date.now()}`,
    name: input.name,
    mode: input.mode,
    currency: input.currency,
    state: 'open',
    privacyLevel: input.privacyLevel ?? 'standard',
    reasonCategory: input.reasonCategory,
    sensitiveReason: input.sensitiveReason,
    policyVersions: [
      {
        id: 'policy_1',
        summary: input.policySummary,
        createdAt,
      },
    ],
    participants: input.participants,
    obligations: [],
    contributionClaims: [],
    releaseRequests: [],
    approvalRequests: [],
    approvalDecisions: [],
    confirmations: [],
    disputes: [],
    exceptions: [],
    closeoutSnapshots: [],
    createdAt,
  };
}

export function addDotObligation(chapter: DotChapter, input: AddObligationInput): DotChapter {
  assertOpen(chapter);
  assertPositiveAmount(input.amount);
  findParticipant(chapter, input.fromParticipantId);
  findParticipant(chapter, input.toParticipantId);
  const policyVersionId = input.policyVersionId ?? chapter.policyVersions.at(-1)?.id;
  if (!policyVersionId) {
    throw new Error('Policy version required');
  }
  const obligation: DotObligation = {
    ...input,
    id: input.id ?? nextId('obligation', chapter.obligations.length),
    state: 'open',
    policyVersionId,
  };
  return {
    ...chapter,
    obligations: [...chapter.obligations, obligation],
  };
}

export function claimDotContribution(
  chapter: DotChapter,
  input: {
    obligationId: string;
    claimantId: string;
    note?: string;
    evidenceVisibility?: DotVisibility;
  },
): DotChapter {
  assertOpen(chapter);
  const obligation = chapter.obligations.find((item) => item.id === input.obligationId);
  if (!obligation) {
    throw new Error('Unknown obligation');
  }
  if (obligation.fromParticipantId !== input.claimantId) {
    throw new Error('Only the obligated participant can claim contribution');
  }
  if (obligation.state !== 'open') {
    throw new Error('Obligation must be open before contribution claim');
  }
  const claim: DotContributionClaim = {
    id: nextId('claim', chapter.contributionClaims.length),
    obligationId: obligation.id,
    claimantId: input.claimantId,
    receiverId: obligation.toParticipantId,
    state: 'claimed',
    evidenceVisibility: input.evidenceVisibility ?? 'counterparty_visible',
    note: input.note,
    createdAt: nowIso(),
  };
  return {
    ...chapter,
    obligations: chapter.obligations.map((item) =>
      item.id === obligation.id ? { ...item, state: 'claimed' } : item,
    ),
    contributionClaims: [...chapter.contributionClaims, claim],
  };
}

export function confirmDotContributionClaim(
  chapter: DotChapter,
  input: { claimId: string; confirmerId: string },
): DotChapter {
  assertOpen(chapter);
  const claim = chapter.contributionClaims.find((item) => item.id === input.claimId);
  if (!claim) {
    throw new Error('Unknown claim');
  }
  const canConfirm =
    claim.receiverId === input.confirmerId ||
    hasAnyRole(chapter, input.confirmerId, ['organizer', 'treasurer']);
  if (!canConfirm) {
    throw new Error('Only receiver, organizer, or treasurer can confirm');
  }
  if (claim.state !== 'claimed') {
    throw new Error('Claim must be claimed before confirmation');
  }
  const createdAt = nowIso();
  const confirmation: DotConfirmation = {
    id: nextId('confirmation', chapter.confirmations.length),
    subjectType: 'contribution_claim',
    subjectId: claim.id,
    confirmerId: input.confirmerId,
    createdAt,
  };
  return {
    ...chapter,
    contributionClaims: chapter.contributionClaims.map((item) =>
      item.id === claim.id ? { ...item, state: 'confirmed', confirmedAt: createdAt } : item,
    ),
    obligations: chapter.obligations.map((item) =>
      item.id === claim.obligationId ? { ...item, state: 'confirmed' } : item,
    ),
    confirmations: [...chapter.confirmations, confirmation],
  };
}

export function createDotReleaseRequest(chapter: DotChapter, input: CreateReleaseInput): DotChapter {
  assertOpen(chapter);
  assertPositiveAmount(input.amount);
  findParticipant(chapter, input.requesterId);
  findParticipant(chapter, input.recipientId);
  for (const approverId of input.requiredApproverIds) {
    if (!hasAnyRole(chapter, approverId, ['approver', 'organizer', 'treasurer'])) {
      throw new Error(`Participant cannot approve release: ${approverId}`);
    }
  }
  const releaseRequest: DotReleaseRequest = {
    id: input.id ?? nextId('release', chapter.releaseRequests.length),
    title: input.title,
    requesterId: input.requesterId,
    recipientId: input.recipientId,
    amount: input.amount,
    currency: input.currency,
    state: 'requested',
    createdAt: nowIso(),
  };
  const approvalRequest: DotApprovalRequest = {
    id: nextId('approval', chapter.approvalRequests.length),
    releaseRequestId: releaseRequest.id,
    requiredApproverIds: input.requiredApproverIds,
    state: 'pending',
    createdAt: releaseRequest.createdAt,
  };
  return {
    ...chapter,
    releaseRequests: [...chapter.releaseRequests, releaseRequest],
    approvalRequests: [...chapter.approvalRequests, approvalRequest],
  };
}

export function decideDotApproval(
  chapter: DotChapter,
  input: {
    approvalRequestId: string;
    approverId: string;
    decision: Exclude<DotApprovalState, 'pending'>;
    note?: string;
  },
): DotChapter {
  assertOpen(chapter);
  const request = chapter.approvalRequests.find((item) => item.id === input.approvalRequestId);
  if (!request) {
    throw new Error('Unknown approval request');
  }
  if (!request.requiredApproverIds.includes(input.approverId)) {
    throw new Error('Approver is not required on this request');
  }
  if (
    chapter.approvalDecisions.some(
      (item) => item.approvalRequestId === request.id && item.approverId === input.approverId,
    )
  ) {
    throw new Error('Approver already decided on this request');
  }
  const decision: DotApprovalDecision = {
    id: nextId('approval_decision', chapter.approvalDecisions.length),
    approvalRequestId: request.id,
    approverId: input.approverId,
    decision: input.decision,
    note: input.note,
    createdAt: nowIso(),
  };
  const decisions = [
    ...chapter.approvalDecisions.filter((item) => item.approvalRequestId === request.id),
    decision,
  ];
  const approvedIds = new Set(
    decisions.filter((item) => item.decision === 'approved').map((item) => item.approverId),
  );
  const nextApprovalState: DotApprovalState =
    input.decision === 'denied' || input.decision === 'needs_review'
      ? input.decision
      : request.requiredApproverIds.every((approverId) => approvedIds.has(approverId))
        ? 'approved'
        : 'pending';
  const nextReleaseState: DotReleaseState =
    nextApprovalState === 'approved'
      ? 'approved'
      : nextApprovalState === 'denied'
        ? 'denied'
        : nextApprovalState === 'needs_review'
          ? 'needs_review'
          : 'requested';
  return {
    ...chapter,
    approvalDecisions: [...chapter.approvalDecisions, decision],
    approvalRequests: chapter.approvalRequests.map((item) =>
      item.id === request.id ? { ...item, state: nextApprovalState } : item,
    ),
    releaseRequests: chapter.releaseRequests.map((item) =>
      item.id === request.releaseRequestId ? { ...item, state: nextReleaseState } : item,
    ),
  };
}

export function claimDotRelease(
  chapter: DotChapter,
  input: { releaseRequestId: string; actorId: string },
): DotChapter {
  assertOpen(chapter);
  findParticipant(chapter, input.actorId);
  const release = chapter.releaseRequests.find((item) => item.id === input.releaseRequestId);
  if (!release) {
    throw new Error('Unknown release request');
  }
  const canClaim =
    release.requesterId === input.actorId || hasAnyRole(chapter, input.actorId, ['organizer', 'treasurer', 'payer']);
  if (!canClaim) {
    throw new Error('Only requester, payer, organizer, or treasurer can claim release');
  }
  if (release.state !== 'approved') {
    throw new Error('Release must be approved before it can be claimed');
  }
  return {
    ...chapter,
    releaseRequests: chapter.releaseRequests.map((item) =>
      item.id === release.id ? { ...item, state: 'claimed_released', claimedAt: nowIso() } : item,
    ),
  };
}

export function confirmDotRelease(
  chapter: DotChapter,
  input: { releaseRequestId: string; confirmerId: string },
): DotChapter {
  assertOpen(chapter);
  const release = chapter.releaseRequests.find((item) => item.id === input.releaseRequestId);
  if (!release) {
    throw new Error('Unknown release request');
  }
  const canConfirm =
    release.recipientId === input.confirmerId ||
    hasAnyRole(chapter, input.confirmerId, ['organizer', 'treasurer']);
  if (!canConfirm) {
    throw new Error('Only receiver, organizer, or treasurer can confirm release');
  }
  if (release.state !== 'claimed_released') {
    throw new Error('Release must be claimed before receiver confirmation');
  }
  const createdAt = nowIso();
  const confirmation: DotConfirmation = {
    id: nextId('confirmation', chapter.confirmations.length),
    subjectType: 'release_request',
    subjectId: release.id,
    confirmerId: input.confirmerId,
    createdAt,
  };
  return {
    ...chapter,
    releaseRequests: chapter.releaseRequests.map((item) =>
      item.id === release.id ? { ...item, state: 'confirmed', confirmedAt: createdAt } : item,
    ),
    confirmations: [...chapter.confirmations, confirmation],
  };
}

export function openDotDispute(
  chapter: DotChapter,
  input: Omit<DotDispute, 'id' | 'state' | 'createdAt'>,
): DotChapter {
  assertOpen(chapter);
  findParticipant(chapter, input.openedBy);
  const dispute: DotDispute = {
    ...input,
    id: nextId('dispute', chapter.disputes.length),
    state: 'open',
    createdAt: nowIso(),
  };
  return {
    ...chapter,
    disputes: [...chapter.disputes, dispute],
  };
}

export function resolveDotDispute(
  chapter: DotChapter,
  input: { disputeId: string; actorId: string },
): DotChapter {
  assertOpen(chapter);
  const dispute = chapter.disputes.find((item) => item.id === input.disputeId);
  if (!dispute) {
    throw new Error('Unknown dispute');
  }
  const canResolve =
    dispute.openedBy === input.actorId || hasAnyRole(chapter, input.actorId, ['organizer', 'treasurer']);
  if (!canResolve) {
    throw new Error('Only dispute opener, organizer, or treasurer can resolve dispute');
  }
  return {
    ...chapter,
    disputes: chapter.disputes.map((item) =>
      item.id === dispute.id ? { ...item, state: 'resolved' } : item,
    ),
  };
}

export function recordDotException(
  chapter: DotChapter,
  input: Omit<DotExceptionNote, 'id' | 'createdAt'>,
): DotChapter {
  assertOpen(chapter);
  findParticipant(chapter, input.actorId);
  if (!hasAnyRole(chapter, input.actorId, ['organizer', 'treasurer'])) {
    throw new Error('Only organizer or treasurer can record exceptions');
  }
  const exception: DotExceptionNote = {
    ...input,
    id: nextId('exception', chapter.exceptions.length),
    createdAt: nowIso(),
  };
  const obligations = chapter.obligations.map((item) =>
    input.subjectType === 'obligation' && item.id === input.subjectId
      ? { ...item, state: 'exception_recorded' as DotObligationState }
      : item,
  );
  return {
    ...chapter,
    obligations,
    exceptions: [...chapter.exceptions, exception],
  };
}

export function buildDotStatus(chapter: DotChapter): DotStatus {
  if (chapter.state !== 'open') {
    return {
      chapterId: chapter.id,
      state: chapter.state,
      blockers: [],
      closeoutReadiness: 'closed',
    };
  }

  const blockers: string[] = [];
  for (const obligation of chapter.obligations) {
    if (obligation.required && obligation.state !== 'confirmed' && !hasException(chapter, 'obligation', obligation.id)) {
      blockers.push(
        `${participantLabel(chapter, obligation.fromParticipantId)} must complete ${obligation.title}`,
      );
    }
  }
  for (const approval of chapter.approvalRequests) {
    if (approval.state === 'pending' && !hasException(chapter, 'approval_request', approval.id)) {
      const waiting = approval.requiredApproverIds
        .filter(
          (approverId) =>
            !chapter.approvalDecisions.some(
              (decision) =>
                decision.approvalRequestId === approval.id &&
                decision.approverId === approverId &&
                decision.decision === 'approved',
            ),
        )
        .map((approverId) => participantLabel(chapter, approverId))
        .join(', ');
      blockers.push(`${waiting || 'Approver'} must approve release`);
    }
  }
  for (const release of chapter.releaseRequests) {
    if (release.state !== 'confirmed' && !hasException(chapter, 'release_request', release.id)) {
      if (release.state === 'approved') {
        blockers.push(`${participantLabel(chapter, release.requesterId)} must record release outside ChopDot`);
      } else if (release.state === 'claimed_released') {
        blockers.push(`${participantLabel(chapter, release.recipientId)} must confirm release`);
      } else if (release.state === 'requested' || release.state === 'needs_review' || release.state === 'denied') {
        blockers.push(`${release.title} is ${release.state.replace(/_/g, ' ')}`);
      }
    }
  }
  for (const dispute of chapter.disputes) {
    if (dispute.state === 'open' && !hasException(chapter, 'chapter', dispute.id)) {
      blockers.push(`Dispute remains open: ${dispute.reason}`);
    }
  }

  const first = blockers[0];
  return {
    chapterId: chapter.id,
    state: chapter.state,
    blockers,
    nextActor: first?.split(' must ')[0],
    nextAction: first?.includes(' must ') ? first.split(' must ')[1] : first,
    closeoutReadiness: blockers.length === 0 ? 'ready' : 'blocked',
  };
}

export function closeDotChapter(
  chapter: DotChapter,
  input: { actorId: string; allowOpenItems?: boolean; annotation?: string },
): DotChapter {
  assertOpen(chapter);
  if (!hasAnyRole(chapter, input.actorId, ['organizer', 'treasurer'])) {
    throw new Error('Only organizer or treasurer can close chapter');
  }
  const status = buildDotStatus(chapter);
  if (status.blockers.length > 0 && !input.allowOpenItems) {
    throw new Error(`Cannot close: ${status.blockers.length} blocker(s)`);
  }
  if (status.blockers.length > 0 && !input.annotation?.trim()) {
    throw new Error('Open-item closeout requires annotation');
  }

  const createdAt = nowIso();
  const closeoutState: DotCloseoutSnapshot['state'] =
    status.blockers.length > 0 ? 'closed_with_open_items' : 'closed';
  const snapshot: DotCloseoutSnapshot = {
    id: nextId('closeout', chapter.closeoutSnapshots.length),
    chapterId: chapter.id,
    state: closeoutState,
    blockerCount: status.blockers.length,
    blockers: status.blockers,
    createdAt,
  };
  const closeoutException: DotExceptionNote | undefined =
    status.blockers.length > 0
      ? {
          id: nextId('exception', chapter.exceptions.length),
          subjectType: 'chapter',
          subjectId: chapter.id,
          actorId: input.actorId,
          note: input.annotation ?? 'Closed with open items.',
          visibility: 'redacted_export',
          createdAt,
        }
      : undefined;

  return {
    ...chapter,
    state: closeoutState,
    closedAt: createdAt,
    exceptions: closeoutException ? [...chapter.exceptions, closeoutException] : chapter.exceptions,
    closeoutSnapshots: [...chapter.closeoutSnapshots, snapshot],
  };
}

export function exportDotReceipt(chapter: DotChapter, input: { redaction: 'full' | 'redacted' }): DotReceipt {
  const latestSnapshot = chapter.closeoutSnapshots.at(-1);
  const redacted = input.redaction === 'redacted';
  const rawBlockers = latestSnapshot?.blockers ?? buildDotStatus(chapter).blockers;
  const blockers =
    redacted && chapter.mode === 'emergency_pot'
      ? rawBlockers.map(() => 'Private emergency item still needs review')
      : rawBlockers;
  return {
    chapterId: chapter.id,
    chapterName: redacted && chapter.mode === 'emergency_pot' ? 'Emergency pot' : chapter.name,
    mode: chapter.mode,
    state: chapter.state,
    redaction: input.redaction,
    generatedAt: nowIso(),
    summary: {
      obligationCount: chapter.obligations.length,
      confirmedObligationCount: chapter.obligations.filter((item) => item.state === 'confirmed').length,
      releaseRequestCount: chapter.releaseRequests.length,
      confirmedReleaseCount: chapter.releaseRequests.filter((item) => item.state === 'confirmed').length,
      openDisputeCount: chapter.disputes.filter((item) => item.state === 'open').length,
      exceptionCount: chapter.exceptions.length,
    },
    participants: chapter.participants.map((participant) =>
      redacted ? { roles: participant.roles } : { id: participant.id, name: participant.name, roles: participant.roles },
    ),
    blockers,
    policyRefs: chapter.policyVersions.map((policy) => policy.id),
    sensitiveFieldsExcluded: redacted
      ? ['participant.name', 'participant.id', 'sensitiveReason', 'paymentReference', 'privateNotes', 'blockerDetail']
      : [],
  };
}
