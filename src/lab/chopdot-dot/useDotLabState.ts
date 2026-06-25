import { useMemo, useState } from 'react';
import {
  buildDotStatus,
  claimDotContribution,
  claimDotRelease,
  closeDotChapter,
  confirmDotContributionClaim,
  confirmDotRelease,
  createDotReleaseRequest,
  decideDotApproval,
  exportDotReceipt,
  recordDotException,
  type DotChapter,
} from '../../chopdot-dot/commitmentKernel';
import {
  completeTestTokenTransfer,
  failTestTokenTransfer,
  requestTestTokenTransfer,
  type TestTokenRailState,
} from '../../chopdot-dot/testTokenRail';
import { createDotLabScenario, type DotLabAgent, type DotLabMode } from './dotLabScenarios';

export type DotLabEvent = {
  id: string;
  actor: string;
  label: string;
  detail: string;
  kind: 'success' | 'blocked' | 'info';
};

export type DotLabState = {
  mode: DotLabMode;
  chapter: DotChapter;
  rail: TestTokenRailState;
  agents: DotLabAgent[];
  activeAgent: DotLabAgent;
  events: DotLabEvent[];
};

function nextEventId(events: DotLabEvent[]): string {
  return `dot_lab_event_${events.length + 1}`;
}

function participantName(chapter: DotChapter, id: string): string {
  return chapter.participants.find((item) => item.id === id)?.name ?? id;
}

function latestClaimId(chapter: DotChapter, obligationId: string): string | null {
  for (let index = chapter.contributionClaims.length - 1; index >= 0; index -= 1) {
    const claim = chapter.contributionClaims[index];
    if (claim?.obligationId === obligationId) {
      return claim.id;
    }
  }
  return null;
}

function latestReleaseId(chapter: DotChapter): string | null {
  return chapter.releaseRequests.at(-1)?.id ?? null;
}

function latestApprovalId(chapter: DotChapter): string | null {
  return chapter.approvalRequests.at(-1)?.id ?? null;
}

export function useDotLabState(initialMode: DotLabMode) {
  const [scenario, setScenario] = useState(() => createDotLabScenario(initialMode));
  const [chapter, setChapter] = useState(scenario.chapter);
  const [rail, setRail] = useState(scenario.tokenRail);
  const [activeAgentId, setActiveAgentId] = useState(scenario.agents[0]?.id ?? '');
  const [events, setEvents] = useState<DotLabEvent[]>([
    {
      id: 'dot_lab_event_1',
      actor: 'System',
      label: 'Lab opened',
      detail: 'Seeded people, obligations, permissions, and fake test-token balances.',
      kind: 'info',
    },
  ]);

  const activeAgent = useMemo(
    () => scenario.agents.find((item) => item.id === activeAgentId) ?? scenario.agents[0],
    [activeAgentId, scenario.agents],
  );
  const status = useMemo(() => buildDotStatus(chapter), [chapter]);
  const receipt = useMemo(
    () => exportDotReceipt(chapter, { redaction: chapter.mode === 'emergency_pot' ? 'redacted' : 'redacted' }),
    [chapter],
  );

  function addEvent(label: string, detail: string, kind: DotLabEvent['kind'] = 'success') {
    setEvents((prev) => [
      { id: nextEventId(prev), actor: activeAgent?.name ?? 'Agent', label, detail, kind },
      ...prev,
    ]);
  }

  function safely(label: string, action: () => DotChapter, detail: string) {
    try {
      setChapter(action());
      addEvent(label, detail);
    } catch (error) {
      addEvent(label, error instanceof Error ? error.message : 'Action blocked.', 'blocked');
    }
  }

  function switchMode(mode: DotLabMode) {
    const next = createDotLabScenario(mode);
    setScenario(next);
    setChapter(next.chapter);
    setRail(next.tokenRail);
    setActiveAgentId(next.agents[0]?.id ?? '');
    setEvents([
      {
        id: 'dot_lab_event_1',
        actor: 'System',
        label: 'Mode selected',
        detail: next.job,
        kind: 'info',
      },
    ]);
  }

  function claimContribution(obligationId: string) {
    const obligation = chapter.obligations.find((item) => item.id === obligationId);
    if (!obligation || !activeAgent) return;
    try {
      let nextRail = requestTestTokenTransfer(rail, {
        subjectId: obligation.id,
        fromParticipantId: activeAgent.participantId,
        toParticipantId: obligation.toParticipantId,
        amount: obligation.amount,
        currency: scenario.tokenCurrency,
        note: `${activeAgent.name} claim evidence for ${obligation.title}`,
      });
      nextRail = completeTestTokenTransfer(nextRail, nextRail.transfers.at(-1)?.id ?? '');
      const nextChapter = claimDotContribution(chapter, {
        obligationId,
        claimantId: activeAgent.participantId,
        note: `Completed ${scenario.tokenCurrency} test-token transfer. Receiver still must confirm.`,
        evidenceVisibility: chapter.mode === 'emergency_pot' ? 'organizer_operational' : 'counterparty_visible',
      });
      setRail(nextRail);
      setChapter(nextChapter);
      addEvent(
        'Contribution claimed',
        `${activeAgent.name} completed a fake token transfer. This created a claim, not confirmation.`,
      );
    } catch (error) {
      addEvent('Contribution claim blocked', error instanceof Error ? error.message : 'Action blocked.', 'blocked');
    }
  }

  function failContributionTransfer(obligationId: string) {
    const obligation = chapter.obligations.find((item) => item.id === obligationId);
    if (!obligation || !activeAgent) return;
    try {
      let nextRail = requestTestTokenTransfer(rail, {
        subjectId: `failed-${obligation.id}-${rail.transfers.length}`,
        fromParticipantId: activeAgent.participantId,
        toParticipantId: obligation.toParticipantId,
        amount: obligation.amount,
        currency: scenario.tokenCurrency,
        note: `Failed transfer drill for ${obligation.title}`,
      });
      nextRail = failTestTokenTransfer(nextRail, nextRail.transfers.at(-1)?.id ?? '');
      setRail(nextRail);
      addEvent('Transfer failed', 'The blocker remains because failed test tokens do not create a claim.', 'blocked');
    } catch (error) {
      addEvent('Transfer failure drill blocked', error instanceof Error ? error.message : 'Action blocked.', 'blocked');
    }
  }

  function confirmContribution(obligationId: string) {
    const claimId = latestClaimId(chapter, obligationId);
    if (!claimId || !activeAgent) return;
    safely(
      'Contribution confirmed',
      () => confirmDotContributionClaim(chapter, { claimId, confirmerId: activeAgent.participantId }),
      `${activeAgent.name} confirmed the receiver side.`,
    );
  }

  function recordMissedContribution(obligationId: string) {
    if (!activeAgent) return;
    safely(
      'Exception recorded',
      () =>
        recordDotException(chapter, {
          subjectType: 'obligation',
          subjectId: obligationId,
          actorId: activeAgent.participantId,
          note: 'Missed contribution is visible in closeout history.',
          visibility: 'organizer_operational',
        }),
      `${activeAgent.name} annotated the open item instead of hiding it.`,
    );
  }

  function createRelease() {
    if (!activeAgent || latestReleaseId(chapter)) return;
    safely(
      'Release requested',
      () => createDotReleaseRequest(chapter, scenario.releaseTemplate),
      `${activeAgent.name} opened the release request. Approval is still separate.`,
    );
  }

  function approveRelease() {
    const approvalId = latestApprovalId(chapter);
    if (!approvalId || !activeAgent) return;
    safely(
      'Approved',
      () =>
        decideDotApproval(chapter, {
          approvalRequestId: approvalId,
          approverId: activeAgent.participantId,
          decision: 'approved',
        }),
      `${activeAgent.name} approved readiness. This is not a payment.`,
    );
  }

  function claimRelease() {
    const releaseId = latestReleaseId(chapter);
    if (!releaseId || !activeAgent) return;
    const release = chapter.releaseRequests.find((item) => item.id === releaseId);
    if (!release) return;
    try {
      let nextRail = requestTestTokenTransfer(rail, {
        subjectId: release.id,
        fromParticipantId: activeAgent.participantId,
        toParticipantId: release.recipientId,
        amount: release.amount,
        currency: scenario.tokenCurrency,
        note: `${activeAgent.name} release evidence for ${release.title}`,
      });
      nextRail = completeTestTokenTransfer(nextRail, nextRail.transfers.at(-1)?.id ?? '');
      const nextChapter = claimDotRelease(chapter, {
        releaseRequestId: releaseId,
        actorId: activeAgent.participantId,
      });
      setRail(nextRail);
      setChapter(nextChapter);
      addEvent(
        'Released outside ChopDot',
        `${activeAgent.name} completed fake token release evidence. Receiver still must confirm.`,
      );
    } catch (error) {
      addEvent('Release claim blocked', error instanceof Error ? error.message : 'Action blocked.', 'blocked');
    }
  }

  function confirmRelease() {
    const releaseId = latestReleaseId(chapter);
    if (!releaseId || !activeAgent) return;
    safely(
      'Release confirmed',
      () => confirmDotRelease(chapter, { releaseRequestId: releaseId, confirmerId: activeAgent.participantId }),
      `${activeAgent.name} confirmed the receiver side.`,
    );
  }

  function closeCleanly() {
    if (!activeAgent) return;
    safely(
      'Chapter closed',
      () => closeDotChapter(chapter, { actorId: activeAgent.participantId }),
      `${activeAgent.name} closed with no blockers.`,
    );
  }

  function closeWithOpenItems() {
    if (!activeAgent) return;
    safely(
      'Closed with open items',
      () =>
        closeDotChapter(chapter, {
          actorId: activeAgent.participantId,
          allowOpenItems: true,
          annotation: 'Lab closeout keeps unresolved blockers visible.',
        }),
      `${activeAgent.name} closed with an explicit annotation.`,
    );
  }

  function tryForbidden(kind: 'close' | 'approve' | 'claim-first') {
    if (!activeAgent) return;
    if (kind === 'close') {
      closeCleanly();
      return;
    }
    if (kind === 'approve') {
      approveRelease();
      return;
    }
    const first = chapter.obligations[0];
    if (!first) return;
    safely(
      'Forbidden claim attempt',
      () => claimDotContribution(chapter, { obligationId: first.id, claimantId: activeAgent.participantId }),
      `${participantName(chapter, activeAgent.participantId)} tried to claim someone else's contribution.`,
    );
  }

  return {
    scenario,
    state: { mode: scenario.mode, chapter, rail, agents: scenario.agents, activeAgent, events },
    status,
    receipt,
    switchMode,
    setActiveAgentId,
    claimContribution,
    failContributionTransfer,
    confirmContribution,
    recordMissedContribution,
    createRelease,
    approveRelease,
    claimRelease,
    confirmRelease,
    closeCleanly,
    closeWithOpenItems,
    tryForbidden,
  };
}
