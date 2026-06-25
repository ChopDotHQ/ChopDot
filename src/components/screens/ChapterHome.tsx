import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import { TopBar } from '../TopBar';
import type {
  ChapterPotAgent,
  ChapterPotEvent,
  ChapterPotReleaseTemplate,
  Pot,
} from '../../types/app';
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
  type DotChapterMode,
  type DotObligation,
  type DotParticipant,
  type DotReceipt,
  type DotReleaseRequest,
} from '../../chopdot-dot/commitmentKernel';
import {
  completeTestTokenTransfer,
  failTestTokenTransfer,
  requestTestTokenTransfer,
  type TestTokenRailState,
} from '../../chopdot-dot/testTokenRail';
import { createChapterPotTemplate } from '../../chopdot-dot/chapterPotTemplates';
import {
  AssetHubReferenceAdapter,
  BulletinReceiptAdapter,
  DemoDotSessionSignerAdapter,
  LocalSignedSessionAdapter,
  ProductAccountDotSessionSignerAdapter,
  ProductSdkStatementStoreSessionAdapter,
  ProductSdkCloseoutProofAdapter,
  ProductSdkCloudStorageReceiptAdapter,
  ProductSdkAssetHubEvidenceAdapter,
  ProductSdkPrivatePayloadAdapter,
  ProofAnchorAdapter,
  StatementStoreSessionAdapter,
  createDemoDotInvitationAccess,
  dotSessionEventsToActivity,
  reduceDotInviteAccessEvents,
  reduceDotSessionEvents,
  runDotNativeHostPreflight,
  type DotNativeHostPreflightResult,
  type DotMembershipGrant,
  type DotSessionAction,
  type DotSessionEvent,
} from '../../chopdot-dot/polkadotSession';
import { copyWithToast } from '../../utils/clipboard';

type ChapterHomeProps = {
  pot: Pot;
  currentUserId: string;
  onBack: () => void;
  onUpdatePot: (updates: Partial<Pot>) => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
};

type Tab = 'Overview' | 'People' | 'Activity' | 'Settings';

type AgentWalletPasTransfer = {
  label: string;
  from: string;
  to: string;
  amountPas: string;
  status: 'dry_run' | 'finalized' | 'failed';
  txHash?: string;
  blockNumber?: number;
  product?: {
    productState: string;
    clearsPayment: boolean;
  };
};

type AgentWalletPasScenario = {
  id: string;
  name: string;
  transfers: AgentWalletPasTransfer[];
};

type AgentWalletPasReport = {
  executionMode: string;
  network: { chainId: string };
  scenarios: AgentWalletPasScenario[];
};

const tabs: Tab[] = ['Overview', 'People', 'Activity', 'Settings'];
const accentActionStyle = { background: 'var(--accent, #e6007a)', color: '#fff' };
const personAlias: Record<string, string> = { nina: 'nia' };
const modeScenarioId: Partial<Record<DotChapterMode, string>> = {
  shared_expense: 'group_expense',
  savings_circle: 'savings_circle',
  emergency_pot: 'emergency_pot',
  community_fund: 'community_fund',
};
const agentWalletPasScenarioLabel: Partial<Record<DotChapterMode, string>> = {
  shared_expense: 'Group expense',
  savings_circle: 'Savings circle',
  emergency_pot: 'Emergency pot',
  community_fund: 'Community fund',
};

function buildAgentWalletPasActivityEvent(mode: DotChapterMode, sessionEvents: DotSessionEvent[]): ChapterPotEvent | null {
  const clearedTransfers = sessionEvents.filter((event) => {
    if (event.action.type === 'claim_contribution') {
      return event.action.assetHubReference?.currency === 'PAS' && event.action.assetHubReference.lifecycle === 'finalized';
    }
    if (event.action.type === 'claim_release') {
      return event.action.assetHubReference?.currency === 'PAS' && event.action.assetHubReference.lifecycle === 'finalized';
    }
    return false;
  });
  if (!clearedTransfers.length) return null;
  return {
    id: `agent_wallet_pas_${clearedTransfers.length}`,
    actor: 'ChopDot',
    label: 'PAS payments recorded',
    detail: `${agentWalletPasScenarioLabel[mode] ?? 'Agent wallet scenario'}: ${clearedTransfers.length} finalized public-testnet transfer(s) matched the right shares.`,
    kind: 'success',
  };
}

function formatAmount(amount: number, currency: string): string {
  if (currency === 'USD') return `$${amount.toLocaleString()}`;
  return `${amount.toLocaleString()} ${currency}`;
}

function participantName(participants: DotParticipant[], id: string): string {
  return participants.find((participant) => participant.id === id)?.name ?? id;
}

function participantRoles(participant?: DotParticipant): string {
  return participant?.roles.map((role) => role.replace(/_/g, ' ')).join(' / ') ?? '';
}

function hasRole(participant: DotParticipant | undefined, roles: DotParticipant['roles']): boolean {
  return Boolean(participant?.roles.some((role) => roles.includes(role)));
}

function deviceId(): string {
  if (typeof window === 'undefined') return 'server-device';
  const key = 'chopdot_dot_native_device_id';
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const next = `device_${Math.random().toString(36).slice(2)}`;
  window.sessionStorage.setItem(key, next);
  return next;
}

function nativePersonParam(): string | null {
  if (typeof window === 'undefined') return null;
  const person = new URLSearchParams(window.location.search).get('person')?.toLowerCase();
  if (!person) return null;
  return personAlias[person] ?? person;
}

function normalizeParticipantId(personId: string): string {
  return personAlias[personId.toLowerCase()] ?? personId.toLowerCase();
}

function shareUrlForParticipant(participantId?: string): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  if (participantId) {
    url.pathname = '/pots';
    url.searchParams.set('chopdot-dot-native', '1');
    url.searchParams.set('person', participantId);
  }
  url.searchParams.delete('chopdot-dot-dev');
  url.searchParams.delete('chopdot-dot-lab');
  url.searchParams.delete('chopdot-escrow-lab');
  return url.toString();
}

function latestClaimId(chapter: DotChapter, obligationId: string): string | null {
  for (let index = chapter.contributionClaims.length - 1; index >= 0; index -= 1) {
    const claim = chapter.contributionClaims[index];
    if (claim?.obligationId === obligationId) return claim.id;
  }
  return null;
}

function latestReleaseId(chapter: DotChapter): string | null {
  return chapter.releaseRequests.at(-1)?.id ?? null;
}

function latestApprovalId(chapter: DotChapter): string | null {
  return chapter.approvalRequests.at(-1)?.id ?? null;
}

function nextEventId(events: ChapterPotEvent[]): string {
  return `dot_event_${events.length + 1}`;
}

function statusLabel(state: string): string {
  if (state === 'open') return 'Waiting';
  if (state === 'claimed') return 'Marked paid';
  if (state === 'confirmed') return 'Confirmed';
  if (state === 'exception_recorded') return 'Delayed';
  if (state === 'requested') return 'Needs approval';
  if (state === 'approved') return 'Approved';
  if (state === 'claimed_released') return 'Released';
  if (state === 'closed_with_open_items') return 'Closed with notes';
  return state.replace(/_/g, ' ');
}

function releaseActionLabel(releaseNoun: string): string {
  return releaseNoun === 'payout' ? 'Record payout' : 'Record release';
}

function modeCopy(mode: Pot['chapterMode']) {
  if (mode === 'shared_expense') {
    return {
      summary: 'Dinner split',
      eyebrow: 'Group expense',
      nextReady: 'Split ready to close',
      moneyInLabel: 'Owed',
      moneyOutLabel: 'Reimbursement',
      releaseNoun: 'release',
      closeLabel: 'Close split',
      openCloseLabel: 'Close split with note',
      emptyRelease: 'Prepare reimbursement',
    };
  }
  if (mode === 'savings_circle') {
    return {
      summary: 'Round 1',
      eyebrow: 'Savings circle',
      nextReady: 'Round ready to close',
      moneyInLabel: 'Circle total',
      moneyOutLabel: 'Payout',
      releaseNoun: 'payout',
      closeLabel: 'Close round',
      openCloseLabel: 'Close round with note',
      emptyRelease: 'Prepare payout',
    };
  }
  if (mode === 'emergency_pot') {
    return {
      summary: 'Private support',
      eyebrow: 'Emergency pot',
      nextReady: 'Pot ready to close',
      moneyInLabel: 'Support raised',
      moneyOutLabel: 'Release',
      releaseNoun: 'release',
      closeLabel: 'Close pot',
      openCloseLabel: 'Close pot with note',
      emptyRelease: 'Prepare release',
    };
  }
  return {
    summary: 'June period',
    eyebrow: 'Community fund',
    nextReady: 'Period ready to close',
    moneyInLabel: 'Funded',
    moneyOutLabel: 'Approved spend',
    releaseNoun: 'release',
    closeLabel: 'Close period',
    openCloseLabel: 'Close period with note',
    emptyRelease: 'Prepare release',
  };
}

function sumObligations(obligations: DotObligation[], states?: DotObligation['state'][]): number {
  return obligations
    .filter((obligation) => !states || states.includes(obligation.state))
    .reduce((total, obligation) => total + obligation.amount, 0);
}

function chapterCurrency(chapter: DotChapter): string {
  return chapter.obligations[0]?.currency ?? chapter.releaseRequests.at(-1)?.currency ?? 'USD';
}

function testCurrencyFor(currency: string): 'TEST_USD' | 'TEST_USDC' | 'TEST_DOT' {
  if (currency === 'USDC') return 'TEST_USDC';
  if (currency === 'DOT' || currency === 'PAS') return 'TEST_DOT';
  return 'TEST_USD';
}

function releaseAmount(chapter: DotChapter, template?: ChapterPotReleaseTemplate): number {
  return chapter.releaseRequests.at(-1)?.amount ?? template?.amount ?? 0;
}

function nextChapterPrompt(
  chapter: DotChapter,
  release: DotReleaseRequest | undefined,
  template: ChapterPotReleaseTemplate | undefined,
  participants: DotParticipant[],
  closeReadyLabel: string,
): { label: string; detail: string } {
  const claimedObligations = chapter.obligations.filter((obligation) => obligation.state === 'claimed');
  if (claimedObligations.length) {
    const byReceiver = new Map<string, DotObligation[]>();
    claimedObligations.forEach((obligation) => {
      const receiverClaims = byReceiver.get(obligation.toParticipantId) ?? [];
      receiverClaims.push(obligation);
      byReceiver.set(obligation.toParticipantId, receiverClaims);
    });
    const [receiverId, receiverClaims] = Array.from(byReceiver.entries()).sort((a, b) => b[1].length - a[1].length)[0] ?? [];
    if (receiverId && receiverClaims && receiverClaims.length > 1) {
      const payerNames = receiverClaims.map((obligation) => participantName(participants, obligation.fromParticipantId));
      const total = receiverClaims.reduce((sum, obligation) => sum + obligation.amount, 0);
      const currency = receiverClaims[0]?.currency ?? chapterCurrency(chapter);
      return {
        label: `${participantName(participants, receiverId)} confirms next`,
        detail: `${payerNames.join(', ')} · ${formatAmount(total, currency)}`,
      };
    }

    const claimedObligation = claimedObligations[0];
    if (claimedObligation) {
      return {
        label: `${participantName(participants, claimedObligation.toParticipantId)} confirms next`,
        detail: `${participantName(participants, claimedObligation.fromParticipantId)} · ${formatAmount(claimedObligation.amount, claimedObligation.currency)}`,
      };
    }
  }

  const openObligation = chapter.obligations.find((obligation) => obligation.state === 'open');
  if (openObligation) {
    return {
      label: `${participantName(participants, openObligation.fromParticipantId)} to pay`,
      detail: `${formatAmount(openObligation.amount, openObligation.currency)} to ${participantName(participants, openObligation.toParticipantId)}.`,
    };
  }

  if (!release && template) {
    return {
      label: `Prepare ${template.title.toLowerCase()}`,
      detail: `${formatAmount(template.amount, template.currency)} planned for ${participantName(participants, template.recipientId)}.`,
    };
  }

  if (release?.state === 'requested') {
    return {
      label: 'Waiting for approval',
      detail: `${release.title} needs approval before money is marked released.`,
    };
  }

  if (release?.state === 'approved') {
    return {
      label: releaseActionLabel('release'),
      detail: formatAmount(release.amount, release.currency),
    };
  }

  if (release?.state === 'claimed_released') {
    return {
      label: `${participantName(participants, release.recipientId)} confirms next`,
      detail: release.title,
    };
  }

  return {
    label: closeReadyLabel,
    detail: 'Ready.',
  };
}

function readableBlockers(
  chapter: DotChapter,
  release: DotReleaseRequest | undefined,
  template: ChapterPotReleaseTemplate | undefined,
  participants: DotParticipant[],
): string[] {
  const blockers = chapter.obligations
    .filter((obligation) => obligation.state === 'open' || obligation.state === 'claimed')
    .map((obligation) => {
      if (obligation.state === 'claimed') {
        return `${participantName(participants, obligation.toParticipantId)} needs to confirm ${participantName(participants, obligation.fromParticipantId)}.`;
      }
      return `${participantName(participants, obligation.fromParticipantId)} has not marked ${formatAmount(obligation.amount, obligation.currency)} paid.`;
    });

  if (blockers.length === 0 && !release && template) {
    blockers.push(`${template.title} has not been prepared yet.`);
  }
  const pendingApprovalBlockers = chapter.approvalRequests
    .filter((approval) => approval.state === 'pending')
    .map((approval) => {
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
        .map((approverId) => participantName(participants, approverId))
        .join(', ');
      return `${waiting || 'Approver'} still needs to approve.`;
    });

  blockers.push(...pendingApprovalBlockers);

  if (release?.state === 'requested' && pendingApprovalBlockers.length === 0) blockers.push(`${release.title} still needs approval.`);
  if (release?.state === 'approved') blockers.push(`${release.title} is approved but not marked released.`);
  if (release?.state === 'claimed_released') blockers.push(`${participantName(participants, release.recipientId)} has not confirmed receipt.`);

  return blockers;
}

type ReconciliationState = 'observed' | 'claimed' | 'confirmed' | 'unresolved' | 'ready';

type ReconciliationItem = {
  id: string;
  label: string;
  detail: string;
  state: ReconciliationState;
  amountLabel?: string;
};

type CloseoutReconciliation = {
  observed: number;
  claimed: number;
  confirmed: number;
  unresolved: number;
  ready: number;
  items: ReconciliationItem[];
  evidenceWithoutConfirmation: boolean;
};

function reconciliationStateLabel(state: ReconciliationState): string {
  if (state === 'observed') return 'Reference';
  if (state === 'claimed') return 'Waiting confirmation';
  if (state === 'confirmed') return 'Confirmed';
  if (state === 'unresolved') return 'Still open';
  return 'Ready';
}

function buildCloseoutReconciliation({
  chapter,
  release,
  releaseTemplate,
  rail,
  closeoutReadiness,
}: {
  chapter: DotChapter;
  release: DotReleaseRequest | undefined;
  releaseTemplate: ChapterPotReleaseTemplate | undefined;
  rail?: TestTokenRailState;
  closeoutReadiness: ReturnType<typeof buildDotStatus>['closeoutReadiness'];
}): CloseoutReconciliation {
  const items: ReconciliationItem[] = [];
  const completedTransfers = rail?.transfers.filter((transfer) => transfer.state === 'completed') ?? [];
  const observedSubjectIds = new Set(completedTransfers.map((transfer) => transfer.subjectId));

  for (const transfer of completedTransfers) {
    const isReleaseEvidence = transfer.subjectId.startsWith('escrow-release-');
    items.push({
      id: `evidence-${transfer.id}`,
      label: isReleaseEvidence ? 'Release recorded' : 'Payment recorded',
      detail: isReleaseEvidence ? 'Waiting on recipient.' : 'Waiting on receiver.',
      state: 'observed',
      amountLabel: formatAmount(transfer.amount, transfer.currency.replace('TEST_', '')),
    });
  }

  for (const obligation of chapter.obligations) {
    const payer = participantName(chapter.participants, obligation.fromParticipantId);
    const receiver = participantName(chapter.participants, obligation.toParticipantId);
    const amount = formatAmount(obligation.amount, obligation.currency);
    const hasObservedEvidence = observedSubjectIds.has(obligation.id) || observedSubjectIds.has(`escrow-${obligation.id}`);

    if (obligation.state === 'confirmed') {
      items.push({
        id: `confirmed-${obligation.id}`,
        label: `${payer} paid`,
        detail: `${receiver} confirmed ${amount}.`,
        state: 'confirmed',
      });
    } else if (obligation.state === 'claimed') {
      items.push({
        id: `marked-${obligation.id}`,
        label: `${payer} marked paid`,
        detail: `Waiting on ${receiver}.`,
        state: 'claimed',
      });
    } else if (obligation.state === 'exception_recorded') {
      items.push({
        id: `noted-${obligation.id}`,
        label: `${payer} delay noted`,
        detail: `${amount} is not confirmed, but the delay is visible for closeout.`,
        state: 'ready',
      });
    } else if (!hasObservedEvidence) {
      items.push({
        id: `open-${obligation.id}`,
        label: `${payer} open`,
        detail: `${amount} to ${receiver}.`,
        state: 'unresolved',
      });
    }
  }

  if (!release && releaseTemplate) {
    items.push({
      id: 'release-missing',
      label: `${releaseTemplate.title} not prepared`,
      detail: `${formatAmount(releaseTemplate.amount, releaseTemplate.currency)} is planned, but not ready for confirmation yet.`,
      state: 'unresolved',
    });
  } else if (release?.state === 'requested') {
    items.push({
      id: `release-${release.id}`,
      label: `${release.title} needs approval`,
      detail: 'Waiting on approval.',
      state: 'unresolved',
    });
  } else if (release?.state === 'approved') {
    items.push({
      id: `release-${release.id}`,
      label: `${release.title} approved`,
      detail: 'Ready to release.',
      state: 'claimed',
    });
  } else if (release?.state === 'claimed_released') {
    items.push({
      id: `release-${release.id}`,
      label: `${release.title} marked released`,
      detail: `Waiting on ${participantName(chapter.participants, release.recipientId)}.`,
      state: 'claimed',
    });
  } else if (release?.state === 'confirmed') {
    items.push({
      id: `release-${release.id}`,
      label: `${release.title} confirmed`,
      detail: `${participantName(chapter.participants, release.recipientId)} confirmed the release arrived.`,
      state: 'confirmed',
    });
  }

  if (closeoutReadiness === 'ready') {
    items.push({
      id: 'ready-closeout',
      label: 'Ready to close',
      detail: 'Everything required is confirmed or noted.',
      state: 'ready',
    });
  }

  const counts = items.reduce(
    (result, item) => ({ ...result, [item.state]: result[item.state] + 1 }),
    { observed: 0, claimed: 0, confirmed: 0, unresolved: 0, ready: 0 } satisfies Record<ReconciliationState, number>,
  );

  return {
    ...counts,
    items,
    evidenceWithoutConfirmation: counts.observed > 0 && counts.confirmed < counts.observed,
  };
}

function passiveTaskPrompt({
  chapter,
  activeParticipant,
  release,
  releaseTemplate,
  openItems,
  copy,
  contributionPhaseOpen,
}: {
  chapter: DotChapter;
  activeParticipant: DotParticipant | undefined;
  release: DotReleaseRequest | undefined;
  releaseTemplate: ChapterPotReleaseTemplate | undefined;
  openItems: string[];
  copy: ReturnType<typeof modeCopy>;
  contributionPhaseOpen: boolean;
}): { label: string; detail: string } {
  const waitingOn = openItems.length
    ? `${openItems.length} item${openItems.length === 1 ? '' : 's'} open`
    : 'No open items';

  if (!activeParticipant) {
    return {
      label: 'Review the group status',
      detail: waitingOn,
    };
  }

  if (hasRole(activeParticipant, ['viewer'])) {
    return {
      label: 'You can review only',
      detail: waitingOn,
    };
  }

  if (contributionPhaseOpen && hasRole(activeParticipant, ['approver']) && !hasRole(activeParticipant, ['organizer', 'treasurer'])) {
    return {
      label: 'Approval pending',
      detail: waitingOn,
    };
  }

  if (contributionPhaseOpen && hasRole(activeParticipant, ['receiver']) && !hasRole(activeParticipant, ['organizer', 'treasurer'])) {
    return {
      label: `${copy.releaseNoun[0]?.toUpperCase() ?? ''}${copy.releaseNoun.slice(1)} pending`,
      detail: waitingOn,
    };
  }

  if (contributionPhaseOpen && hasRole(activeParticipant, ['organizer', 'treasurer'])) {
    return {
      label: 'Waiting on the group',
      detail: waitingOn,
    };
  }

  if (release?.state === 'requested') {
    const approval = chapter.approvalRequests.find((item) => item.releaseRequestId === release.id);
    const alreadyApproved = approval
      ? chapter.approvalDecisions.some(
          (decision) =>
            decision.approvalRequestId === approval.id &&
            decision.approverId === activeParticipant.id &&
            decision.decision === 'approved',
        )
      : false;

    if (alreadyApproved) {
      return {
        label: 'Your approval is recorded',
        detail: `${release.title} is waiting on the next approval.`,
      };
    }

    return {
      label: 'Waiting for approval',
      detail: release.title,
    };
  }

  if (release?.state === 'approved') {
    if (release.recipientId === activeParticipant.id) {
      return {
        label: `You’ll confirm after release`,
        detail: `${release.title} is approved.`,
      };
    }
    return {
      label: 'Waiting for release',
      detail: `${release.title} is approved.`,
    };
  }

  if (release?.state === 'claimed_released' && release.recipientId !== activeParticipant.id) {
    return {
      label: 'Waiting for recipient confirmation',
      detail: participantName(chapter.participants, release.recipientId),
    };
  }

  if (!contributionPhaseOpen && !release && releaseTemplate) {
    return {
      label: `Waiting to prepare ${copy.releaseNoun}`,
      detail: participantName(chapter.participants, releaseTemplate.requesterId),
    };
  }

  return {
    label: 'Nothing for you yet',
    detail: waitingOn,
  };
}

type TimelineState = 'done' | 'current' | 'upcoming';

type TimelineStep = {
  id: string;
  title: string;
  detail?: string;
  done: boolean;
  state?: TimelineState;
};

function withTimelineState(steps: TimelineStep[]): Array<TimelineStep & { state: TimelineState }> {
  const currentIndex = steps.findIndex((step) => !step.done);
  return steps.map((step, index) => ({
    ...step,
    state: step.done ? 'done' : index === currentIndex ? 'current' : 'upcoming',
  }));
}

function buildGuidedTimeline(
  chapter: DotChapter,
  release: DotReleaseRequest | undefined,
): { title: string; detail: string; steps: Array<TimelineStep & { state: TimelineState }> } {
  const noOpenPayments = chapter.obligations.every((obligation) => obligation.state !== 'open');
  const paymentsHandled = chapter.obligations.every(
    (obligation) => obligation.state === 'confirmed' || obligation.state === 'exception_recorded',
  );
  const releaseApproved = Boolean(release && ['approved', 'claimed_released', 'confirmed'].includes(release.state));
  const releaseConfirmed = release?.state === 'confirmed';
  const closed = chapter.state === 'closed' || chapter.state === 'closed_with_open_items';

  if (chapter.mode === 'shared_expense') {
    return {
      title: 'Progress',
      detail: '',
      steps: withTimelineState([
        { id: 'pay-shares', title: 'Shares paid', done: noOpenPayments },
        { id: 'confirm-receipts', title: 'Received', done: paymentsHandled },
        { id: 'prepare-reimbursement', title: 'Reimbursement', done: Boolean(release) },
        { id: 'close-split', title: 'Record saved', done: closed },
      ]),
    };
  }

  if (chapter.mode === 'savings_circle') {
    return {
      title: 'Progress',
      detail: '',
      steps: withTimelineState([
        { id: 'circle-contributions', title: 'Contributions', done: noOpenPayments },
        { id: 'circle-confirmations', title: 'Received', done: paymentsHandled },
        { id: 'circle-delay-notes', title: 'Notes', done: paymentsHandled },
        { id: 'circle-payout', title: 'Payout', done: releaseConfirmed },
        { id: 'circle-closeout', title: 'Round saved', done: closed },
      ]),
    };
  }

  if (chapter.mode === 'emergency_pot') {
    return {
      title: 'Progress',
      detail: '',
      steps: withTimelineState([
        { id: 'emergency-support', title: 'Support paid', done: noOpenPayments },
        { id: 'emergency-confirm', title: 'Received', done: paymentsHandled },
        { id: 'emergency-approval', title: 'Approved', done: releaseApproved },
        { id: 'emergency-recipient', title: 'Recipient paid', done: releaseConfirmed },
        { id: 'emergency-receipt', title: 'Receipt saved', done: closed },
      ]),
    };
  }

  return {
    title: 'Progress',
    detail: '',
    steps: withTimelineState([
      { id: 'fund-contributions', title: 'Contributions', done: noOpenPayments },
      { id: 'fund-confirm', title: 'Received', done: paymentsHandled },
      { id: 'fund-approval', title: 'Approved', done: releaseApproved },
      { id: 'fund-release', title: 'Paid out', done: releaseConfirmed },
      { id: 'fund-handoff', title: 'Record saved', done: closed },
    ]),
  };
}

function TimelinePill({ state }: { state: TimelineState }) {
  if (state === 'done') return <span className="text-caption text-[var(--accent)] font-semibold">Done</span>;
  if (state === 'current') return <span className="text-caption text-foreground font-semibold">Now</span>;
  return <span className="text-caption text-secondary">Next</span>;
}

function GuidedTimeline({ timeline }: { timeline: ReturnType<typeof buildGuidedTimeline> }) {
  return (
    <div className="card p-4" data-testid="guided-timeline">
      <div>
        <p className="text-body font-medium">{timeline.title}</p>
        {timeline.detail && <p className="text-caption text-secondary mt-1">{timeline.detail}</p>}
      </div>
      <div className="pt-3 divide-y divide-border">
        {timeline.steps.map((step, index) => (
          <div className="py-3 first:pt-0 last:pb-0 flex gap-3" key={step.id} data-testid={`timeline-step-${step.id}`}>
            <div
              className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center text-caption font-semibold ${
                step.state === 'done'
                  ? 'bg-[var(--accent)] text-white'
                  : step.state === 'current'
                    ? 'bg-foreground text-background'
                    : 'bg-muted/20 text-secondary'
              }`}
              aria-hidden="true"
            >
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-body font-medium">{step.title}</p>
                <TimelinePill state={step.state} />
              </div>
              {step.detail && <p className="text-caption text-secondary mt-1">{step.detail}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type ModeSetupRow = {
  label: string;
  value: string;
};

function formatNames(participants: DotParticipant[], ids: string[]): string {
  const names = ids.map((id) => participantName(participants, id)).filter(Boolean);
  if (names.length === 0) return 'Not set';
  if (names.length === 1) return names[0] ?? 'Not set';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`;
}

function buildModeSetup(
  chapter: DotChapter,
  releaseTemplate: ChapterPotReleaseTemplate | undefined,
): { title: string; detail: string; rows: ModeSetupRow[] } {
  const participants = chapter.participants;
  const receiverIds = [...new Set(chapter.obligations.map((obligation) => obligation.toParticipantId))];
  const payerCount = new Set(chapter.obligations.map((obligation) => obligation.fromParticipantId)).size;
  const firstObligation = chapter.obligations[0];
  const contributionAmount = firstObligation ? formatAmount(firstObligation.amount, firstObligation.currency) : 'Not set';
  const approverIds = releaseTemplate?.requiredApproverIds ?? [];
  const recipient = releaseTemplate ? participantName(participants, releaseTemplate.recipientId) : 'Not set';
  const releaseAmount = releaseTemplate ? formatAmount(releaseTemplate.amount, releaseTemplate.currency) : 'Not set';

  if (chapter.mode === 'savings_circle') {
    return {
      title: 'Round setup',
      detail: '',
      rows: [
        { label: 'Members paying now', value: `${payerCount} members · ${contributionAmount} each` },
        { label: 'Treasurer confirms', value: formatNames(participants, receiverIds) },
        { label: 'Round payout', value: `${releaseAmount} planned for ${recipient}` },
        { label: 'Late payment', value: 'Delay note' },
      ],
    };
  }

  if (chapter.mode === 'emergency_pot') {
    return {
      title: 'Privacy setup',
      detail: '',
      rows: [
        { label: 'Reason', value: chapter.reasonCategory ?? 'private' },
        { label: 'Organizer confirms', value: formatNames(participants, receiverIds) },
        { label: 'Release approval', value: formatNames(participants, approverIds) },
        { label: 'Receipt', value: 'Redacted' },
      ],
    };
  }

  if (chapter.mode === 'community_fund') {
    return {
      title: 'Fund period setup',
      detail: '',
      rows: [
        { label: 'Contributions', value: `${payerCount} members this period` },
        { label: 'Admin confirms', value: formatNames(participants, receiverIds) },
        { label: 'Spend approval', value: formatNames(participants, approverIds) },
        { label: 'Handoff', value: `${releaseAmount} to ${recipient}` },
      ],
    };
  }

  return {
    title: 'Split setup',
    detail: '',
    rows: [
      { label: 'Friends paying', value: `${payerCount} people` },
      { label: 'Receiver confirms', value: formatNames(participants, receiverIds) },
      { label: 'Reimbursement', value: releaseTemplate ? `${releaseAmount} to ${recipient}` : 'Not prepared yet' },
      { label: 'Receipt', value: 'Private' },
    ],
  };
}

function ModeSetupCard({ setup }: { setup: ReturnType<typeof buildModeSetup> }) {
  return (
    <div className="card p-4" data-testid="mode-setup">
      <div>
        <p className="text-body font-medium">{setup.title}</p>
        {setup.detail && <p className="text-caption text-secondary mt-1">{setup.detail}</p>}
      </div>
      <div className="pt-3 divide-y divide-border">
        {setup.rows.map((row) => (
          <div className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-4" key={row.label}>
            <p className="text-caption text-secondary">{row.label}</p>
            <p className="text-caption font-medium text-foreground text-right max-w-[12rem]">{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

type ModeGuardrail = {
  title: string;
  detail: string;
  rows: ModeSetupRow[];
};

function buildModeGuardrail(chapter: DotChapter): ModeGuardrail | null {
  if (chapter.mode === 'emergency_pot') {
    return {
      title: 'Privacy',
      detail: '',
      rows: [
        { label: 'Visible', value: 'Status and amount' },
        { label: 'Hidden', value: 'Sensitive details' },
        { label: 'Closeout', value: 'Redacted receipt' },
      ],
    };
  }

  if (chapter.mode === 'community_fund') {
    return {
      title: 'Controls',
      detail: '',
      rows: [
        { label: 'Approvers', value: 'Approve' },
        { label: 'Payer', value: 'Records payout' },
        { label: 'Receiver', value: 'Confirms' },
      ],
    };
  }

  return null;
}

function ModeGuardrailCard({ guardrail }: { guardrail: ModeGuardrail | null }) {
  if (!guardrail) return null;

  return (
    <div className="card p-4" data-testid="mode-guardrails">
      <div>
        <p className="text-body font-medium">{guardrail.title}</p>
        {guardrail.detail && <p className="text-caption text-secondary mt-1">{guardrail.detail}</p>}
      </div>
      <div className="pt-3 divide-y divide-border">
        {guardrail.rows.map((row) => (
          <div className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-4" key={row.label}>
            <p className="text-caption text-secondary">{row.label}</p>
            <p className="text-caption font-medium text-foreground text-right max-w-[13rem]">{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

type ReleaseHandoff = {
  title: string;
  detail: string;
  rows: ModeSetupRow[];
};

function buildReleaseHandoff({
  chapter,
  release,
  template,
  participants,
  releaseNoun,
}: {
  chapter: DotChapter;
  release: DotReleaseRequest | undefined;
  template: ChapterPotReleaseTemplate | undefined;
  participants: DotParticipant[];
  releaseNoun: string;
}): ReleaseHandoff | null {
  if (!release && !template) return null;

  const recipientId = release?.recipientId ?? template?.recipientId;
  const recipientName = recipientId ? participantName(participants, recipientId) : 'Receiver';
  const releasePrepared = Boolean(release);
  const releaseApproved = Boolean(release && ['approved', 'claimed_released', 'confirmed'].includes(release.state));
  const releaseRecorded = Boolean(release && ['claimed_released', 'confirmed'].includes(release.state));
  const releaseConfirmed = release?.state === 'confirmed';
  const closed = chapter.state === 'closed' || chapter.state === 'closed_with_open_items';

  return {
    title: `${releaseNoun === 'payout' ? 'Payout' : 'Release'} handoff`,
    detail: '',
    rows: [
      {
        label: 'Approval',
        value: releaseApproved
          ? 'Approved'
          : releasePrepared
            ? 'Pending'
            : 'Not ready',
      },
      {
        label: 'Release',
        value: releaseRecorded
          ? 'Recorded'
          : releaseApproved
            ? 'Ready'
            : 'Not yet',
      },
      {
        label: 'Received',
        value: releaseConfirmed
          ? `${recipientName} confirmed`
          : releaseRecorded
            ? `${recipientName} pending`
            : 'Pending',
      },
      {
        label: 'Record',
        value: closed
          ? 'Saved'
          : releaseConfirmed
            ? 'Ready'
            : 'Not ready',
      },
    ],
  };
}

function ReleaseHandoffCard({ handoff }: { handoff: ReleaseHandoff | null }) {
  if (!handoff) return null;

  return (
    <div className="card p-4" data-testid="release-handoff">
      <div>
        <p className="text-body font-medium">{handoff.title}</p>
        {handoff.detail && <p className="text-caption text-secondary mt-1">{handoff.detail}</p>}
      </div>
      <div className="pt-3 divide-y divide-border">
        {handoff.rows.map((row) => (
          <div className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-4" key={row.label}>
            <p className="text-caption text-secondary">{row.label}</p>
            <p className="text-caption font-medium text-foreground text-right max-w-[14rem]">{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

type OrganizerQueueItem = {
  id: string;
  title: string;
  detail: string;
  actionLabel?: string;
  onClick?: () => void;
};

function OrganizerQueueCard({ items }: { items: OrganizerQueueItem[] }) {
  if (!items.length) return null;

  return (
    <div className="card p-4" data-testid="organizer-queue">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-body font-medium">Organizer queue</p>
        </div>
        <span className="text-caption text-secondary whitespace-nowrap">{items.length} open</span>
      </div>
      <div className="pt-3 divide-y divide-border">
        {items.map((item, index) => (
          <div className="py-3 first:pt-0 last:pb-0" key={item.id} data-testid={`organizer-queue-${item.id}`}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 h-6 w-6 rounded-full bg-muted/20 text-secondary text-caption font-semibold flex items-center justify-center">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-body font-medium">{item.title}</p>
                <p className="text-caption text-secondary mt-1">{item.detail}</p>
                {item.actionLabel && item.onClick && (
                  <button
                    type="button"
                    className="mt-3 px-3 py-2 rounded-xl text-body active:scale-[0.98]"
                    style={accentActionStyle}
                    onClick={item.onClick}
                  >
                    {item.actionLabel}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type WaitingGuide = {
  detail: string;
  rows: ModeSetupRow[];
};

function WaitingGuideCard({ guide }: { guide: WaitingGuide | null }) {
  if (!guide) return null;

  return (
    <div className="card p-4" data-testid="waiting-guide">
      <div>
        <p className="text-body font-medium">Status</p>
        <p className="text-caption text-secondary mt-1">{guide.detail}</p>
      </div>
      <div className="pt-3 divide-y divide-border">
        {guide.rows.map((row) => (
          <div className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-4" key={row.label}>
            <p className="text-caption text-secondary">{row.label}</p>
            <p className="text-caption font-medium text-foreground text-right max-w-[13rem]">{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CloseoutReconciliationPanel({ reconciliation }: { reconciliation: CloseoutReconciliation }) {
  const summary = [
    { label: 'Observed', value: reconciliation.observed, testId: 'reconciliation-observed' },
    { label: 'Marked paid', value: reconciliation.claimed, testId: 'reconciliation-claimed' },
    { label: 'Confirmed', value: reconciliation.confirmed, testId: 'reconciliation-confirmed' },
    { label: 'Still open', value: reconciliation.unresolved, testId: 'reconciliation-unresolved' },
    { label: 'Ready', value: reconciliation.ready, testId: 'reconciliation-ready' },
  ];
  const visibleItems = reconciliation.items.slice(0, 6);

  return (
    <div className="card p-4 space-y-4" data-testid="closeout-reconciliation">
      <div>
        <p className="text-body font-medium">Close check</p>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {summary.map((item) => (
          <div className="rounded-2xl bg-muted/10 px-2 py-2 min-w-0" data-testid={item.testId} key={item.label}>
            <p className="text-[10px] leading-tight text-secondary truncate">{item.label}</p>
            <p className="text-body font-semibold tabular-nums mt-0.5">{item.value}</p>
          </div>
        ))}
      </div>

      {reconciliation.evidenceWithoutConfirmation && (
        <div className="rounded-2xl bg-muted/10 p-3">
          <p className="text-caption font-medium">Waiting on receiver</p>
        </div>
      )}

      <div className="divide-y divide-border" data-testid="reconciliation-items">
        {visibleItems.map((item) => (
          <div className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-3" key={item.id}>
            <div className="min-w-0">
              <p className="text-caption font-medium text-foreground">{item.label}</p>
              <p className="text-caption text-secondary mt-0.5">{item.detail}</p>
            </div>
            <div className="text-right flex-shrink-0">
              {item.amountLabel && <p className="text-caption font-medium tabular-nums">{item.amountLabel}</p>}
              <p className="text-[10px] leading-tight text-secondary mt-0.5">{reconciliationStateLabel(item.state)}</p>
            </div>
          </div>
        ))}
        {reconciliation.items.length > visibleItems.length && (
          <p className="pt-2 text-caption text-secondary">{reconciliation.items.length - visibleItems.length} more item{reconciliation.items.length - visibleItems.length === 1 ? '' : 's'} in the record.</p>
        )}
      </div>
    </div>
  );
}

function receiptStateLabel(state: DotReceipt['state']): string {
  if (state === 'closed') return 'Record closed';
  if (state === 'closed_with_open_items') return 'Closed with notes';
  if (state === 'voided') return 'Voided';
  return 'Preview only';
}

function receiptPrivateSummary(receipt: DotReceipt): string {
  if (!receipt.sensitiveFieldsExcluded.length) return '';
  return 'Names, payment details, private notes.';
}

function compactReceiptBlocker(blocker: string): string {
  const contributionMatch = blocker.match(/^(.+) must complete .+ contribution\.?$/);
  if (contributionMatch?.[1]) return `${contributionMatch[1]} payment open`;
  return blocker
    .replace('must complete', 'open:')
    .replace('has not confirmed receipt.', 'confirmation open')
    .replace('has not been prepared yet.', 'not ready yet');
}

function ReceiptReview({
  receipt,
  closeoutLabel,
  isNativeSession,
  nativeHostIssue,
}: {
  receipt: DotReceipt | null;
  closeoutLabel: string;
  isNativeSession: boolean;
  nativeHostIssue: string | null;
}) {
  if (!receipt) return null;
  const redacted = receipt.redaction === 'redacted';
  const closed = receipt.state === 'closed' || receipt.state === 'closed_with_open_items';
  const archiveLabel = closed ? 'Saved' : 'Ready on close';
  const archiveDetail = closed ? 'Group copy available here.' : 'Created after close.';
  const receiptMeaning = closed ? 'Closed group record.' : 'Preview only.';
  const privateSummary = receiptPrivateSummary(receipt);
  const trustRows: ModeSetupRow[] = [
    {
      label: 'Confirmed',
      value: `${receipt.summary.confirmedObligationCount} payment${receipt.summary.confirmedObligationCount === 1 ? '' : 's'}${receipt.summary.confirmedReleaseCount ? `, ${receipt.summary.confirmedReleaseCount} release${receipt.summary.confirmedReleaseCount === 1 ? '' : 's'}` : ''}`,
    },
    {
      label: 'Notes',
      value: receipt.summary.exceptionCount
        ? `${receipt.summary.exceptionCount} exception note${receipt.summary.exceptionCount === 1 ? '' : 's'} included`
        : 'No exception notes',
    },
    {
      label: 'Privacy',
      value: redacted ? 'Names and private details hidden' : 'Full private copy',
    },
  ];
  const hostDetail = isNativeSession
    ? nativeHostIssue
      ? `Needs attention: ${nativeHostIssue}`
      : 'Not connected yet.'
    : 'Not connected.';

  return (
    <div className="card p-4 space-y-4" data-testid="receipt-review">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-micro text-secondary">Receipt</p>
          <p className="text-body font-medium mt-1">{receiptStateLabel(receipt.state)}</p>
        </div>
        <span className="text-caption px-2 py-1 rounded-full bg-muted/20 text-secondary whitespace-nowrap">{closeoutLabel}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-muted/10 p-3">
          <p className="text-micro text-secondary">Confirmed</p>
          <p className="text-body font-semibold tabular-nums">
            {receipt.summary.confirmedObligationCount}/{receipt.summary.obligationCount}
          </p>
        </div>
        <div className="rounded-2xl bg-muted/10 p-3">
          <p className="text-micro text-secondary">Releases</p>
          <p className="text-body font-semibold tabular-nums">
            {receipt.summary.confirmedReleaseCount}/{receipt.summary.releaseRequestCount}
          </p>
        </div>
        <div className="rounded-2xl bg-muted/10 p-3">
          <p className="text-micro text-secondary">Notes</p>
          <p className="text-body font-semibold tabular-nums">{receipt.summary.exceptionCount}</p>
        </div>
        <div className="rounded-2xl bg-muted/10 p-3">
          <p className="text-micro text-secondary">Disputes</p>
          <p className="text-body font-semibold tabular-nums">{receipt.summary.openDisputeCount}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-muted/10 p-3" data-testid="receipt-meaning">
        <p className="text-micro text-secondary">Status</p>
        <p className="text-caption text-secondary mt-1">{receiptMeaning}</p>
      </div>

      <div className="rounded-2xl bg-muted/10 p-3" data-testid="receipt-trust-summary">
        <p className="text-micro text-secondary">Summary</p>
        <div className="pt-2 divide-y divide-border">
          {trustRows.map((row) => (
            <div className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-4" key={row.label}>
              <p className="text-caption text-secondary">{row.label}</p>
              <p className="text-caption font-medium text-foreground text-right max-w-[14rem]">{row.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2" data-testid="receipt-redaction">
        <div className="flex items-center justify-between gap-3">
          <p className="text-body font-medium">{redacted ? 'Private receipt' : 'Group receipt'}</p>
          <span className="text-caption text-secondary">{receipt.participants.length} role entries</span>
        </div>
        <p className="text-caption text-secondary">
          {redacted
            ? 'Names and private notes hidden.'
            : 'Full details for the group.'}
        </p>
        {receipt.sensitiveFieldsExcluded.length > 0 && (
          <div className="rounded-2xl bg-muted/10 p-3">
            <p className="text-micro text-secondary">Hidden</p>
            <p className="text-caption text-secondary mt-1">{privateSummary}</p>
          </div>
        )}
      </div>

      <div className="space-y-2" data-testid="receipt-blockers">
        <p className="text-body font-medium">Still open</p>
        {receipt.blockers.length ? (
          receipt.blockers.map((blocker) => (
            <p className="text-caption text-secondary" key={blocker}>{compactReceiptBlocker(blocker)}</p>
          ))
        ) : (
          <p className="text-caption text-secondary">Nothing open on this receipt.</p>
        )}
      </div>

      <div className="space-y-2" data-testid="receipt-archive-status">
        <div>
          <p className="text-body font-medium">{archiveLabel}</p>
          <p className="text-caption text-secondary mt-1">{archiveDetail}</p>
        </div>
        <div className="rounded-2xl bg-muted/10 p-3">
          <p className="text-micro text-secondary">Archive</p>
          <p className="text-caption text-secondary mt-1">{hostDetail}</p>
        </div>
      </div>
    </div>
  );
}

function PaymentStatusRow({
  obligation,
  activeParticipant,
  participants,
}: {
  obligation: DotObligation;
  activeParticipant: DotParticipant | undefined;
  participants: DotParticipant[];
}) {
  const isActive =
    obligation.fromParticipantId === activeParticipant?.id ||
    obligation.toParticipantId === activeParticipant?.id;

  return (
    <div
      className={`py-3 border-t border-border first:border-t-0 ${isActive ? 'text-foreground' : ''}`}
      data-testid={`payment-status-${obligation.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body font-medium truncate">
            {participantName(participants, obligation.fromParticipantId)}
          </p>
          <p className="text-caption text-secondary mt-0.5">
            {formatAmount(obligation.amount, obligation.currency)} to {participantName(participants, obligation.toParticipantId)}
          </p>
        </div>
        <span className="text-caption px-2 py-1 rounded-full bg-muted/20 text-secondary whitespace-nowrap">
          {statusLabel(obligation.state)}
        </span>
      </div>
    </div>
  );
}

function ContributionRow({
  obligation,
  activeParticipant,
  participants,
  onClaim,
  onConfirm,
  onException,
}: {
  obligation: DotObligation;
  activeParticipant: DotParticipant | undefined;
  participants: DotParticipant[];
  onClaim: () => void;
  onConfirm: () => void;
  onException: () => void;
}) {
  const canClaim = obligation.state === 'open' && activeParticipant?.id === obligation.fromParticipantId;
  const canConfirm =
    obligation.state === 'claimed' &&
    (activeParticipant?.id === obligation.toParticipantId || hasRole(activeParticipant, ['organizer', 'treasurer']));
  const canNote = obligation.state === 'open' && hasRole(activeParticipant, ['organizer', 'treasurer']);

  return (
    <div className="py-3 border-t border-border first:border-t-0" data-testid={`obligation-${obligation.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body font-medium truncate">
            {participantName(participants, obligation.fromParticipantId)}
          </p>
          <p className="text-caption text-secondary mt-0.5">
            {formatAmount(obligation.amount, obligation.currency)} to {participantName(participants, obligation.toParticipantId)}
          </p>
        </div>
        <span className="text-caption px-2 py-1 rounded-full bg-muted/20 text-secondary whitespace-nowrap">
          {statusLabel(obligation.state)}
        </span>
      </div>
      {(canClaim || canConfirm || canNote) && (
        <div className="flex gap-2 pt-3">
          {canClaim && (
            <button type="button" className="flex-1 px-3 py-2 rounded-xl text-body active:scale-[0.98]" style={accentActionStyle} onClick={onClaim}>
              Mark paid
            </button>
          )}
          {canConfirm && (
            <button type="button" className="flex-1 px-3 py-2 rounded-xl text-body active:scale-[0.98]" style={accentActionStyle} onClick={onConfirm}>
              Confirm received
            </button>
          )}
          {canNote && (
            <button type="button" className="flex-1 px-3 py-2 rounded-xl border border-border bg-card text-body active:scale-[0.98]" onClick={onException}>
              Record delay
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ReleaseSection({
  release,
  template,
  activeParticipant,
  participants,
  emptyLabel,
  releaseNoun,
  onCreate,
  onApprove,
  onClaim,
  onConfirm,
}: {
  release?: DotReleaseRequest;
  template?: ChapterPotReleaseTemplate;
  activeParticipant: DotParticipant | undefined;
  participants: DotParticipant[];
  emptyLabel: string;
  releaseNoun: string;
  onCreate: () => void;
  onApprove: () => void;
  onClaim: () => void;
  onConfirm: () => void;
}) {
  const canCreate = !release && hasRole(activeParticipant, ['organizer', 'treasurer']);
  const canApprove = release?.state === 'requested' && hasRole(activeParticipant, ['approver', 'organizer', 'treasurer']);
  const canClaim =
    release?.state === 'approved' &&
    (release.requesterId === activeParticipant?.id || hasRole(activeParticipant, ['organizer', 'treasurer', 'payer']));
  const canConfirm =
    release?.state === 'claimed_released' &&
    (release.recipientId === activeParticipant?.id || hasRole(activeParticipant, ['organizer', 'treasurer']));

  return (
    <div className="card p-4 space-y-3" data-testid="release-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-micro text-secondary">{releaseNoun === 'payout' ? 'Payout' : 'Money out'}</p>
          <p className="text-body font-medium mt-1">{release?.title ?? emptyLabel}</p>
        </div>
        {release && (
          <span className="text-caption px-2 py-1 rounded-full bg-muted/20 text-secondary whitespace-nowrap">
            {statusLabel(release.state)}
          </span>
        )}
      </div>
      <p className="text-caption text-secondary">
        {release
          ? `${formatAmount(release.amount, release.currency)} for ${participantName(participants, release.recipientId)}.`
          : template
            ? `${formatAmount(template.amount, template.currency)} planned for ${participantName(participants, template.recipientId)}.`
            : 'No release is prepared yet.'}
      </p>
      {(canCreate || canApprove || canClaim || canConfirm) && (
        <div className="flex flex-col gap-2">
          {canCreate && <button type="button" className="w-full px-3 py-2 rounded-xl text-body active:scale-[0.98]" style={accentActionStyle} onClick={onCreate}>{emptyLabel}</button>}
          {canApprove && <button type="button" className="w-full px-3 py-2 rounded-xl text-body active:scale-[0.98]" style={accentActionStyle} onClick={onApprove}>Approve {releaseNoun}</button>}
          {canClaim && <button type="button" className="w-full px-3 py-2 rounded-xl text-body active:scale-[0.98]" style={accentActionStyle} onClick={onClaim}>{releaseActionLabel(releaseNoun)}</button>}
          {canConfirm && <button type="button" className="w-full px-3 py-2 rounded-xl text-body active:scale-[0.98]" style={accentActionStyle} onClick={onConfirm}>Confirm received</button>}
        </div>
      )}
    </div>
  );
}

export function ChapterHome({ pot, currentUserId: _currentUserId, onBack, onUpdatePot, onShowToast }: ChapterHomeProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const receiptReviewRef = useRef<HTMLDivElement | null>(null);
  const [activeAgentId, setActiveAgentId] = useState(() => {
    const participantId = nativePersonParam();
    const matchingAgent = participantId ? pot.dotAgents?.find((agent) => agent.participantId === participantId) : undefined;
    return matchingAgent?.id ?? pot.dotActiveAgentId ?? pot.dotAgents?.[0]?.id ?? '';
  });
  const [nativeSyncStatus, setNativeSyncStatus] = useState<'up to date' | 'syncing' | 'needs refresh'>('up to date');
  const [nativeEventCount, setNativeEventCount] = useState(0);
  const [nativeMembershipGrants, setNativeMembershipGrants] = useState<DotMembershipGrant[]>([]);
  const [nativeChapterKey, setNativeChapterKey] = useState<Uint8Array | undefined>();
  const [nativeHostGateIssue, setNativeHostGateIssue] = useState<string | null>(null);
  const [nativeHostPreflight, setNativeHostPreflight] = useState<DotNativeHostPreflightResult[]>([]);
  const [nativeHostPreflightStatus, setNativeHostPreflightStatus] = useState<'idle' | 'checking' | 'checked'>('idle');
  const chapter = pot.dotChapter;
  const agents = pot.dotAgents ?? [];
  const events = pot.dotEvents ?? [];
  const rail = pot.dotRail;
  const releaseTemplate = pot.dotReleaseTemplate;
  const activeAgent = agents.find((agent) => agent.id === activeAgentId) ?? agents[0];
  const activeParticipant = chapter?.participants.find((participant) => participant.id === activeAgent?.participantId);
  const copy = modeCopy(pot.chapterMode);
  const status = useMemo(() => (chapter ? buildDotStatus(chapter) : null), [chapter]);
  const receipt = useMemo(
    () => (chapter ? exportDotReceipt(chapter, { redaction: chapter.mode === 'emergency_pot' ? 'redacted' : 'redacted' }) : null),
    [chapter],
  );
  const nativeSessionEnabled =
    Boolean(chapter && pot.chapterMode) &&
    new URLSearchParams(window.location.search).get('chopdot-dot-native') === '1';
  const showDeveloperControls =
    new URLSearchParams(window.location.search).get('chopdot-dot-dev') === '1' ||
    new URLSearchParams(window.location.search).get('chopdot-dot-lab') === '1' ||
    (import.meta.env.DEV && !nativeSessionEnabled);
  const escrowLabEnabled =
    showDeveloperControls && new URLSearchParams(window.location.search).get('chopdot-escrow-lab') === '1';
  const nativeTemplate = useMemo(
    () => (nativeSessionEnabled && pot.chapterMode ? createChapterPotTemplate(pot.chapterMode) : null),
    [nativeSessionEnabled, pot.chapterMode],
  );
  const nativeInitialChapter = nativeTemplate?.chapter;
  const nativeSessionAdapter = useMemo(() => {
    const transport = typeof window === 'undefined' ? 'statement-store' : new URLSearchParams(window.location.search).get('chopdot-dot-transport');
    const sessionId = typeof window === 'undefined' ? 'default' : new URLSearchParams(window.location.search).get('chopdot-dot-session') ?? 'default';
    if (transport === 'host-required') return new ProductSdkStatementStoreSessionAdapter();
    return transport === 'local' ? new LocalSignedSessionAdapter() : new StatementStoreSessionAdapter('/__chopdot_dot_statement_store', sessionId);
  }, []);
  const nativeSignerAdapter = useMemo(() => {
    const providerType = typeof window === 'undefined' ? 'host' : new URLSearchParams(window.location.search).get('chopdot-dot-signer');
    const fallback = new DemoDotSessionSignerAdapter();
    if (providerType === 'dev') return new ProductAccountDotSessionSignerAdapter({ providerType: 'dev', fallback });
    if (providerType === 'host-required') return new ProductAccountDotSessionSignerAdapter({ providerType: 'host', requireProductAccount: true });
    return new ProductAccountDotSessionSignerAdapter({ providerType: 'host', fallback });
  }, []);
  const nativeReceiptAdapter = useMemo(
    () => {
      const archive = typeof window === 'undefined' ? 'cloud-storage' : new URLSearchParams(window.location.search).get('chopdot-dot-archive');
      return archive === 'host-required'
        ? new ProductSdkCloudStorageReceiptAdapter({ requireCloudStorage: true })
        : new ProductSdkCloudStorageReceiptAdapter({ fallback: new BulletinReceiptAdapter() });
    },
    [],
  );
  const nativeProofAdapter = useMemo(() => new ProofAnchorAdapter(), []);
  const nativeCloseoutProofAdapter = useMemo(
    () => {
      const closeout = typeof window === 'undefined' ? 'hash-only' : new URLSearchParams(window.location.search).get('chopdot-dot-closeout');
      return closeout === 'host-required'
        ? new ProductSdkCloseoutProofAdapter({ requireHostProof: true })
        : new ProductSdkCloseoutProofAdapter({ fallback: new ProofAnchorAdapter() });
    },
    [],
  );
  const nativeAssetHubAdapter = useMemo(
    () => {
      const assetHub = typeof window === 'undefined' ? 'lab' : new URLSearchParams(window.location.search).get('chopdot-dot-asset-hub');
      return assetHub === 'host-required'
        ? new ProductSdkAssetHubEvidenceAdapter({ requireProductSdkTx: true })
        : new ProductSdkAssetHubEvidenceAdapter({ fallback: new AssetHubReferenceAdapter() });
    },
    [],
  );
  const nativePrivatePayloadAdapter = useMemo(
    () => new ProductSdkPrivatePayloadAdapter({ chapterId: nativeInitialChapter?.id ?? chapter?.id ?? pot.id, key: nativeChapterKey }),
    [chapter?.id, nativeChapterKey, nativeInitialChapter?.id, pot.id],
  );
  const nativeDeviceId = useMemo(() => deviceId(), []);
  const lastNativeReplayRef = useRef('');
  const agentWalletPasImportKeysRef = useRef(new Set<string>());
  const nativeReplayOptions = useMemo(
    () => (nativeMembershipGrants.length ? { membershipGrants: nativeMembershipGrants } : undefined),
    [nativeMembershipGrants],
  );

  useEffect(() => () => nativeSignerAdapter.destroy?.(), [nativeSignerAdapter]);

  useEffect(() => {
    if (!nativeSessionEnabled || !nativeInitialChapter || !showDeveloperControls) return;
    let cancelled = false;
    const strictSignerAdapter = new ProductAccountDotSessionSignerAdapter({ providerType: 'host', requireProductAccount: true });
    const strictTransportAdapter = new ProductSdkStatementStoreSessionAdapter();
    const strictReceiptAdapter = new ProductSdkCloudStorageReceiptAdapter({ requireCloudStorage: true });
    const strictCloseoutProofAdapter = new ProductSdkCloseoutProofAdapter({ requireHostProof: true });
    const strictAssetHubAdapter = new ProductSdkAssetHubEvidenceAdapter({ requireProductSdkTx: true });
    const receiptForPreflight = exportDotReceipt(nativeInitialChapter, { redaction: 'redacted' });
    setNativeHostPreflightStatus('checking');
    void runDotNativeHostPreflight({
      chapter: nativeInitialChapter,
      receipt: receiptForPreflight,
      participantId: activeParticipant?.id ?? 'leo',
      deviceId: nativeDeviceId,
      identityParticipantIds: nativeInitialChapter.participants.map((participant) => participant.id),
      membershipGrants: nativeMembershipGrants,
      requireMembershipGrant: true,
      requireDistinctParticipantSigners: true,
      signerAdapter: strictSignerAdapter,
      transportAdapter: strictTransportAdapter,
      receiptAdapter: strictReceiptAdapter,
      closeoutProofAdapter: strictCloseoutProofAdapter,
      assetHubEvidenceAdapter: strictAssetHubAdapter,
    }).then((results) => {
      if (!cancelled) {
        setNativeHostPreflight(results);
        setNativeHostPreflightStatus('checked');
      }
    });
    return () => {
      cancelled = true;
      strictSignerAdapter.destroy?.();
    };
  }, [activeParticipant?.id, nativeDeviceId, nativeInitialChapter, nativeMembershipGrants, nativeSessionEnabled, showDeveloperControls]);

  useEffect(() => {
    if (!nativeSessionEnabled || !nativeInitialChapter) return;
    let cancelled = false;
    const refreshAccess = async () => {
      const localAccess = await createDemoDotInvitationAccess(nativeInitialChapter, activeParticipant?.id);
      const expectedParticipantIds = nativeInitialChapter.participants.map((participant) => participant.id);
      const waitForStore = () => new Promise((resolve) => window.setTimeout(resolve, 150));

      for (let attempt = 0; attempt < 6; attempt += 1) {
        let accessEvents = await nativeSessionAdapter.loadAccessEvents(nativeInitialChapter.id);
        let derivedAccess = reduceDotInviteAccessEvents(nativeInitialChapter, accessEvents);
        const grantedParticipantIds = new Set(derivedAccess.membershipGrants.map((grant) => grant.participantId));
        const missingParticipantIds = expectedParticipantIds.filter((participantId) => !grantedParticipantIds.has(participantId));

        if (!missingParticipantIds.length) {
          return { access: localAccess, grants: derivedAccess.membershipGrants };
        }

        try {
          for (const missingParticipantId of missingParticipantIds) {
            const accessEvent = localAccess.accessEvents.find((event) => event.participantId === missingParticipantId);
            if (!accessEvent) continue;
            const signer = await nativeSignerAdapter.getSigner(accessEvent.participantId);
            accessEvents = await nativeSessionAdapter.appendAccessEvent(nativeInitialChapter, signer, nativeDeviceId, accessEvent.action);
            derivedAccess = reduceDotInviteAccessEvents(nativeInitialChapter, accessEvents);
          }
          return { access: localAccess, grants: derivedAccess.membershipGrants };
        } catch (error) {
          const message = error instanceof Error ? error.message : '';
          if (!/out of order|duplicate/i.test(message)) {
            throw error;
          }
          await waitForStore();
        }
      }

      const finalAccessEvents = await nativeSessionAdapter.loadAccessEvents(nativeInitialChapter.id);
      const finalAccess = reduceDotInviteAccessEvents(nativeInitialChapter, finalAccessEvents);
      if (finalAccess.membershipGrants.length >= expectedParticipantIds.length) {
        return { access: localAccess, grants: finalAccess.membershipGrants };
      }
      throw new Error('Native membership grants are still syncing.');
    };
    refreshAccess()
      .then(({ access, grants }) => {
        if (!cancelled) {
          setNativeMembershipGrants(grants);
          setNativeChapterKey(access.chapterKey);
          setNativeHostGateIssue(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setNativeSyncStatus('needs refresh');
          setNativeHostGateIssue(error instanceof Error ? error.message : 'Native host access is unavailable.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeParticipant?.id, nativeDeviceId, nativeInitialChapter, nativeSessionAdapter, nativeSessionEnabled, nativeSignerAdapter]);

  useEffect(() => {
    if (!nativeSessionEnabled || !nativeInitialChapter) return;
    const participantId = nativePersonParam();
    const nextAgent = participantId ? agents.find((agent) => agent.participantId === participantId) : undefined;
    if (nextAgent && nextAgent.id !== activeAgentId) {
      setActiveAgentId(nextAgent.id);
      onUpdatePot({ dotActiveAgentId: nextAgent.id });
    }
  }, [activeAgentId, agents, nativeInitialChapter, nativeSessionEnabled, onUpdatePot]);

  useEffect(() => {
    if (!nativeSessionEnabled || !nativeInitialChapter) return;
    if (!nativeReplayOptions) {
      setNativeSyncStatus('syncing');
      return;
    }
    const replay = (sessionEvents: DotSessionEvent[]) => {
      setNativeSyncStatus('syncing');
      try {
        const result = reduceDotSessionEvents(nativeInitialChapter, sessionEvents, nativeReplayOptions);
        const activityEvents = dotSessionEventsToActivity(sessionEvents).map((event, index) => ({
          id: `dot_native_event_${sessionEvents.length - index}`,
          actor: 'ChopDot',
          label: event.label,
          detail: event.detail,
          kind: event.kind,
        }));
        const pasActivityEvent = buildAgentWalletPasActivityEvent(nativeInitialChapter.mode, sessionEvents);
        const nextEvents = pasActivityEvent ? [pasActivityEvent, ...activityEvents] : activityEvents;
        const nextSnapshot = JSON.stringify({ chapter: result.chapter, nextEvents, eventCount: sessionEvents.length });
        if (lastNativeReplayRef.current !== nextSnapshot) {
          lastNativeReplayRef.current = nextSnapshot;
          onUpdatePot({
            dotChapter: result.chapter,
            dotEvents: nextEvents.length ? nextEvents : events,
            dotReleaseTemplate: nativeTemplate?.releaseTemplate ?? releaseTemplate,
            lastEditAt: new Date().toISOString(),
          });
        }
        setNativeEventCount(sessionEvents.length);
        setNativeSyncStatus('up to date');
      } catch {
        setNativeSyncStatus('needs refresh');
        setNativeHostGateIssue('Signed session events could not be replayed.');
      }
    };
    let cancelled = false;
    nativeSessionAdapter
      .loadEvents(nativeInitialChapter.id)
      .then((sessionEvents) => {
        if (!cancelled) replay(sessionEvents);
      })
      .catch((error) => {
        if (!cancelled) {
          setNativeSyncStatus('needs refresh');
          setNativeHostGateIssue(error instanceof Error ? error.message : 'Native session transport is unavailable.');
        }
      });
    const unsubscribe = nativeSessionAdapter.subscribe(nativeInitialChapter.id, replay);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [events, nativeInitialChapter, nativeReplayOptions, nativeSessionAdapter, nativeSessionEnabled, nativeTemplate?.releaseTemplate, onUpdatePot, releaseTemplate]);

  useEffect(() => {
    if (!nativeSessionEnabled || !nativeInitialChapter || !nativeReplayOptions || !nativeTemplate?.releaseTemplate) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const trialSessionId = params.get('agent-wallet-trial');
    if (!trialSessionId) return;
    const expectedScenarioId = params.get('scenario') ?? modeScenarioId[nativeInitialChapter.mode];
    if (!expectedScenarioId) return;
    const nativeTrialSessionId = params.get('chopdot-dot-session') ?? 'default';
    const localKey = `chopdot_agent_wallet_pas_applied:${trialSessionId}:${nativeTrialSessionId}:${nativeInitialChapter.id}:${expectedScenarioId}`;
    const lockKey = `${localKey}:inflight`;
    if (window.sessionStorage.getItem(localKey) === '1') return;
    if (agentWalletPasImportKeysRef.current.has(localKey) || window.sessionStorage.getItem(lockKey)) return;
    agentWalletPasImportKeysRef.current.add(localKey);
    window.sessionStorage.setItem(lockKey, String(Date.now()));

    let cancelled = false;

    const appendAs = async (workingChapter: DotChapter, participantId: string, action: DotSessionAction) => {
      const signer = await nativeSignerAdapter.getSigner(participantId);
      const sessionEvents = await nativeSessionAdapter.appendEvent(workingChapter, signer, nativeDeviceId, action, nativeReplayOptions);
      return reduceDotSessionEvents(nativeInitialChapter, sessionEvents, nativeReplayOptions);
    };

    const importPasScenario = async () => {
      const existingEvents = await nativeSessionAdapter.loadEvents(nativeInitialChapter.id);
      if (existingEvents.length > 0) {
        const existingReplay = reduceDotSessionEvents(nativeInitialChapter, existingEvents, nativeReplayOptions);
        if (existingReplay.chapter.state === 'closed' || buildAgentWalletPasActivityEvent(nativeInitialChapter.mode, existingEvents)) {
          window.sessionStorage.setItem(localKey, '1');
        }
        return;
      }

      const response = await fetch(`/__agent_wallet_trial/pas-report?sessionId=${encodeURIComponent(trialSessionId)}`);
      if (!response.ok) return;
      const report = (await response.json()) as AgentWalletPasReport;
      const scenario = report.scenarios.find((item) => item.id === expectedScenarioId);
      if (!scenario || report.executionMode !== 'executed_public_testnet_pas') return;

      let replay = reduceDotSessionEvents(nativeInitialChapter, [], nativeReplayOptions);
      const verifiedTransfers = scenario.transfers.filter(
        (transfer) => transfer.status === 'finalized' && transfer.product?.clearsPayment === true && transfer.txHash,
      );

      for (const transfer of verifiedTransfers) {
        const fromParticipantId = normalizeParticipantId(transfer.from);
        const toParticipantId = normalizeParticipantId(transfer.to);
        const obligation = replay.chapter.obligations.find(
          (item) =>
            item.fromParticipantId === fromParticipantId &&
            item.toParticipantId === toParticipantId &&
            item.state === 'open',
        );

        if (!obligation) continue;
        replay = await appendAs(replay.chapter, fromParticipantId, {
          type: 'claim_contribution',
          obligationId: obligation.id,
          note: `${transfer.label}. Public testnet PAS tx finalized and matched expected recipient and amount.`,
          assetHubReference: {
            subjectId: obligation.id,
            txHash: transfer.txHash ?? '',
            lifecycle: 'finalized',
            amount: Number(transfer.amountPas),
            currency: 'PAS',
            blockNumber: transfer.blockNumber,
          },
        });
        replay = await appendAs(replay.chapter, toParticipantId, {
          type: 'confirm_contribution',
          obligationId: obligation.id,
        });
      }

      const closerId = replay.chapter.participants.find((participant) =>
        participant.roles.some((role) => role === 'organizer' || role === 'treasurer'),
      )?.id;
      if (!closerId) return;

      for (const obligation of replay.chapter.obligations) {
        if (obligation.required && obligation.state !== 'confirmed') {
          replay = await appendAs(replay.chapter, closerId, {
            type: 'record_exception',
            subjectType: 'obligation',
            subjectId: obligation.id,
            note: 'Agent-wallet trial recorded this item as intentionally unresolved for this scenario.',
            visibility: 'organizer_operational',
          });
        }
      }

      const releaseTransfer = verifiedTransfers.find((transfer) => {
        const fromParticipantId = normalizeParticipantId(transfer.from);
        const toParticipantId = normalizeParticipantId(transfer.to);
        return (
          fromParticipantId === nativeTemplate.releaseTemplate.requesterId &&
          toParticipantId === nativeTemplate.releaseTemplate.recipientId
        );
      });

      if (releaseTransfer) {
        replay = await appendAs(replay.chapter, nativeTemplate.releaseTemplate.requesterId, {
          type: 'create_release',
          release: nativeTemplate.releaseTemplate,
        });
        const releaseId = replay.chapter.releaseRequests.at(-1)?.id;
        if (releaseId) {
          for (const approverId of nativeTemplate.releaseTemplate.requiredApproverIds) {
            replay = await appendAs(replay.chapter, approverId, {
              type: 'approve_release',
              releaseRequestId: releaseId,
            });
          }
          replay = await appendAs(replay.chapter, nativeTemplate.releaseTemplate.requesterId, {
            type: 'claim_release',
            releaseRequestId: releaseId,
            assetHubReference: {
              subjectId: releaseId,
              txHash: releaseTransfer.txHash ?? '',
              lifecycle: 'finalized',
              amount: Number(releaseTransfer.amountPas),
              currency: 'PAS',
              blockNumber: releaseTransfer.blockNumber,
            },
          });
          replay = await appendAs(replay.chapter, nativeTemplate.releaseTemplate.recipientId, {
            type: 'confirm_release',
            releaseRequestId: releaseId,
          });
        }
      }

      const finalStatus = buildDotStatus(replay.chapter);
      replay = await appendAs(replay.chapter, closerId, {
        type: 'close_chapter',
        allowOpenItems: finalStatus.blockers.length > 0,
        annotation: finalStatus.blockers.length > 0 ? 'Closed with agent-wallet trial annotations.' : undefined,
      });

      if (cancelled) return;
      const sessionEvents = await nativeSessionAdapter.loadEvents(nativeInitialChapter.id);
      onUpdatePot({
        dotChapter: replay.chapter,
        dotEvents: [
          {
            id: `agent_wallet_pas_${sessionEvents.length + 1}`,
            actor: 'ChopDot',
            label: 'PAS payments recorded',
            detail: `${scenario.name}: ${verifiedTransfers.length} finalized public-testnet transfer(s) matched the right shares.`,
            kind: 'success',
          },
          ...dotSessionEventsToActivity(sessionEvents).map((event, index) => ({
            id: `dot_native_event_${sessionEvents.length - index}`,
            actor: 'ChopDot',
            label: event.label,
            detail: event.detail,
            kind: event.kind,
          })),
        ],
        dotReleaseTemplate: nativeTemplate.releaseTemplate,
        lastEditAt: new Date().toISOString(),
      });
      window.sessionStorage.setItem(localKey, '1');
      setNativeEventCount(sessionEvents.length);
      setNativeSyncStatus('up to date');
      onShowToast?.('PAS payments recorded', 'success');
    };

    void importPasScenario().catch((error) => {
      setNativeSyncStatus('needs refresh');
      setNativeHostGateIssue(error instanceof Error ? error.message : 'Agent-wallet PAS payments could not be loaded.');
      console.error('Agent-wallet PAS payment import failed', error);
      window.sessionStorage.removeItem(localKey);
    }).finally(() => {
      agentWalletPasImportKeysRef.current.delete(localKey);
      window.sessionStorage.removeItem(lockKey);
    });

    return () => {
      cancelled = true;
    };
  }, [
    nativeDeviceId,
    nativeInitialChapter,
    nativeReplayOptions,
    nativeSessionAdapter,
    nativeSessionEnabled,
    nativeSignerAdapter,
    nativeTemplate?.releaseTemplate,
    onShowToast,
    onUpdatePot,
  ]);

  if (!chapter || !status) {
    return (
      <div className="flex flex-col h-full bg-background">
        <TopBar title={pot.name} onBack={onBack} />
        <div className="p-4">
          <div className="card p-4">
            <p className="text-body font-medium">This pot is missing its chapter setup.</p>
          </div>
        </div>
      </div>
    );
  }

  const addEvent = (label: string, detail: string, kind: ChapterPotEvent['kind'] = 'success') => {
    const nextEvents = [
      { id: nextEventId(events), actor: activeAgent?.name ?? 'ChopDot', label, detail, kind },
      ...events,
    ];
    return nextEvents;
  };

  const updateChapter = (nextChapter: DotChapter, nextEvents: ChapterPotEvent[] = events, nextRail: TestTokenRailState | undefined = rail) => {
    onUpdatePot({
      dotChapter: nextChapter,
      dotEvents: nextEvents,
      dotRail: nextRail,
      dotActiveAgentId: activeAgent?.id,
      lastEditAt: new Date().toISOString(),
    });
  };

  const nativeActivityEvents = (
    sessionEvents: DotSessionEvent[],
    leadingEvent?: { label: string; detail: string; kind: ChapterPotEvent['kind'] },
  ): ChapterPotEvent[] => [
    ...(leadingEvent && activeParticipant
      ? [{ id: `dot_native_event_${sessionEvents.length + 1}`, actor: activeParticipant.name, ...leadingEvent }]
      : []),
    ...dotSessionEventsToActivity(sessionEvents).map((event, index) => ({
      id: `dot_native_event_${sessionEvents.length - index}`,
      actor: 'ChopDot',
      label: event.label,
      detail: event.detail,
      kind: event.kind,
    })),
  ];

  const privateRecipients = (...participantIds: Array<string | undefined>) =>
    Array.from(new Set([
      ...participantIds.filter((participantId): participantId is string => Boolean(participantId)),
      ...(chapter?.participants
        .filter((participant) => hasRole(participant, ['organizer', 'treasurer']))
        .map((participant) => participant.id) ?? []),
    ]));

  const commitNativeAction = async (label: string, action: DotSessionAction, detail: string, kind: ChapterPotEvent['kind'] = 'success') => {
    if (!nativeSessionEnabled || !nativeInitialChapter || !activeParticipant) return false;
    if (!nativeReplayOptions) {
      onShowToast?.('Getting the group ready.', 'info');
      return true;
    }
    try {
      setNativeSyncStatus('syncing');
      const signer = await nativeSignerAdapter.getSigner(activeParticipant.id);
      const sessionEvents = await nativeSessionAdapter.appendEvent(chapter, signer, nativeDeviceId, action, nativeReplayOptions);
      const result = reduceDotSessionEvents(nativeInitialChapter, sessionEvents, nativeReplayOptions);
      onUpdatePot({
        dotChapter: result.chapter,
        dotEvents: nativeActivityEvents(sessionEvents, { label, detail, kind }),
        dotActiveAgentId: activeAgent?.id,
        dotReleaseTemplate: nativeTemplate?.releaseTemplate ?? releaseTemplate,
        lastEditAt: new Date().toISOString(),
      });
      setNativeEventCount(sessionEvents.length);
      setNativeSyncStatus('up to date');
      setNativeHostGateIssue(null);
      onShowToast?.(label, 'success');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Action blocked.';
      onUpdatePot({ dotEvents: addEvent(label, message, 'blocked'), dotActiveAgentId: activeAgent?.id });
      setNativeSyncStatus('needs refresh');
      setNativeHostGateIssue(message);
      onShowToast?.(message, 'info');
      return true;
    }
  };

  const closeNativeChapter = async (allowOpenItems: boolean) => {
    if (!nativeSessionEnabled || !nativeInitialChapter || !activeParticipant) return false;
    if (!nativeReplayOptions) {
      onShowToast?.('Getting the group ready.', 'info');
      return true;
    }
    const label = allowOpenItems ? 'Closed with note' : 'Closed';
    try {
      setNativeSyncStatus('syncing');
      const signer = await nativeSignerAdapter.getSigner(activeParticipant.id);
      const closedEvents = await nativeSessionAdapter.appendEvent(chapter, signer, nativeDeviceId, {
        type: 'close_chapter',
        allowOpenItems,
        annotation: allowOpenItems ? 'Closed with visible open items.' : undefined,
      }, nativeReplayOptions);
      const closedResult = reduceDotSessionEvents(nativeInitialChapter, closedEvents, nativeReplayOptions);
      const closedReceipt = closedResult.receipt ?? exportDotReceipt(closedResult.chapter, { redaction: 'redacted' });
      const receiptRef = await nativeReceiptAdapter.saveReceipt(closedReceipt);
      const proofRef = await nativeCloseoutProofAdapter.anchorReceipt(closedReceipt);
      nativeProofAdapter.hashOnly(closedReceipt);
      const receiptEvents = await nativeSessionAdapter.appendEvent(closedResult.chapter, signer, nativeDeviceId, {
        type: 'save_receipt',
        receiptHash: receiptRef.receiptHash,
        storage: receiptRef.storage,
        cid: receiptRef.cid,
        blockNumber: receiptRef.blockNumber,
        extrinsicIndex: receiptRef.extrinsicIndex,
      }, nativeReplayOptions);
      const anchoredEvents = await nativeSessionAdapter.appendEvent(closedResult.chapter, signer, nativeDeviceId, {
        type: 'anchor_receipt',
        proof: proofRef,
      }, nativeReplayOptions);
      const archivedResult = reduceDotSessionEvents(nativeInitialChapter, anchoredEvents, nativeReplayOptions);
      onUpdatePot({
        dotChapter: archivedResult.chapter,
        dotEvents: nativeActivityEvents(receiptEvents.length > anchoredEvents.length ? receiptEvents : anchoredEvents),
        dotActiveAgentId: activeAgent?.id,
        dotReleaseTemplate: nativeTemplate?.releaseTemplate ?? releaseTemplate,
        lastEditAt: new Date().toISOString(),
      });
      setNativeEventCount(anchoredEvents.length);
      setNativeSyncStatus('up to date');
      setNativeHostGateIssue(null);
      onShowToast?.('Receipt saved', 'success');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Action blocked.';
      onUpdatePot({ dotEvents: addEvent(label, message, 'blocked'), dotActiveAgentId: activeAgent?.id });
      setNativeSyncStatus('needs refresh');
      setNativeHostGateIssue(message);
      onShowToast?.(message, 'info');
      return true;
    }
  };

  const runAction = (label: string, action: () => { chapter: DotChapter; rail?: TestTokenRailState }, detail: string) => {
    try {
      const result = action();
      updateChapter(result.chapter, addEvent(label, detail), result.rail ?? rail);
      onShowToast?.(label, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Action blocked.';
      onUpdatePot({ dotEvents: addEvent(label, message, 'blocked'), dotActiveAgentId: activeAgent?.id });
      onShowToast?.(message, 'info');
    }
  };

  const claimContribution = (obligation: DotObligation) => {
    if (nativeSessionEnabled) {
      void (async () => {
        const assetHubReference = await nativeAssetHubAdapter.evidenceForClaim({
          subjectId: obligation.id,
          txHash: `asset_hub_lab_${obligation.id}`,
          amount: obligation.amount,
          currency: obligation.currency === 'USDC' ? 'TEST_USDC' : 'TEST_USD',
        });
        const privatePayloadRef = await nativePrivatePayloadAdapter.encryptPayload({
          subjectId: obligation.id,
          kind: 'payment_reference',
          visibility: 'counterparty_visible',
          recipients: privateRecipients(obligation.fromParticipantId, obligation.toParticipantId),
          payload: {
            note: 'Marked paid in ChopDot. Receiver still needs to confirm.',
            assetHubReference,
          },
        });
        await commitNativeAction(
          'Marked paid',
          {
            type: 'claim_contribution',
            obligationId: obligation.id,
            note: 'Marked paid in ChopDot. Receiver still needs to confirm.',
            privatePayloadRef,
          },
          `${activeAgent?.name ?? 'Member'} marked a payment. Confirmation is still separate.`,
        );
      })();
      return;
    }
    runAction(
      'Marked paid',
      () => {
        let nextRail = rail;
        if (nextRail && activeAgent) {
          nextRail = requestTestTokenTransfer(nextRail, {
            subjectId: obligation.id,
            fromParticipantId: activeAgent.participantId,
            toParticipantId: obligation.toParticipantId,
            amount: obligation.amount,
            currency: nextRail.balances[0]?.currency ?? 'TEST_USD',
            note: `${activeAgent.name} payment note for ${obligation.title}`,
          });
          nextRail = completeTestTokenTransfer(nextRail, nextRail.transfers.at(-1)?.id ?? '');
        }
        return {
          rail: nextRail,
          chapter: claimDotContribution(chapter, {
            obligationId: obligation.id,
            claimantId: activeAgent?.participantId ?? '',
            note: 'Marked paid in ChopDot. Receiver still needs to confirm.',
            evidenceVisibility: chapter.mode === 'emergency_pot' ? 'organizer_operational' : 'counterparty_visible',
          }),
        };
      },
      `${activeAgent?.name ?? 'Member'} marked a payment. Confirmation is still separate.`,
    );
  };

  const confirmContribution = (obligation: DotObligation) => {
    const claimId = latestClaimId(chapter, obligation.id);
    if (!claimId) return;
    if (nativeSessionEnabled) {
      void commitNativeAction(
        'Confirmed received',
        { type: 'confirm_contribution', obligationId: obligation.id },
        `${activeAgent?.name ?? 'Member'} confirmed receipt.`,
      );
      return;
    }
    runAction(
      'Confirmed received',
      () => ({
        chapter: confirmDotContributionClaim(chapter, { claimId, confirmerId: activeAgent?.participantId ?? '' }),
      }),
      `${activeAgent?.name ?? 'Member'} confirmed receipt.`,
    );
  };

  const recordDelay = (obligation: DotObligation) => {
    if (nativeSessionEnabled) {
      void (async () => {
        const privatePayloadRef = await nativePrivatePayloadAdapter.encryptPayload({
          subjectId: obligation.id,
          kind: 'exception_note',
          visibility: 'organizer_operational',
          recipients: privateRecipients(obligation.fromParticipantId, obligation.toParticipantId),
          payload: {
            note: 'Delay recorded for closeout.',
            obligationTitle: obligation.title,
          },
        });
        await commitNativeAction(
          'Delay recorded',
          {
            type: 'record_exception',
            subjectType: 'obligation',
            subjectId: obligation.id,
            note: 'Delay recorded for closeout.',
            visibility: 'organizer_operational',
            privatePayloadRef,
          },
          `${activeAgent?.name ?? 'Member'} added a delay note.`,
        );
      })();
      return;
    }
    runAction(
      'Delay recorded',
      () => ({
        chapter: recordDotException(chapter, {
          subjectType: 'obligation',
          subjectId: obligation.id,
          actorId: activeAgent?.participantId ?? '',
          note: 'Delay recorded for closeout.',
          visibility: 'organizer_operational',
        }),
      }),
      `${activeAgent?.name ?? 'Member'} added a delay note.`,
    );
  };

  const createRelease = () => {
    if (!releaseTemplate) return;
    if (nativeSessionEnabled) {
      void commitNativeAction(
        `${copy.emptyRelease} ready`,
        { type: 'create_release', release: releaseTemplate },
        `${activeAgent?.name ?? 'Member'} prepared the ${copy.releaseNoun}.`,
      );
      return;
    }
    runAction(
      `${copy.emptyRelease} ready`,
      () => ({ chapter: createDotReleaseRequest(chapter, releaseTemplate) }),
      `${activeAgent?.name ?? 'Member'} prepared the ${copy.releaseNoun}.`,
    );
  };

  const approveRelease = () => {
    const approvalId = latestApprovalId(chapter);
    if (!approvalId) return;
    const releaseId = latestReleaseId(chapter);
    if (nativeSessionEnabled && releaseId) {
      void commitNativeAction(
        `${copy.releaseNoun === 'payout' ? 'Payout' : 'Release'} approved`,
        { type: 'approve_release', releaseRequestId: releaseId },
        `${activeAgent?.name ?? 'Member'} approved readiness.`,
      );
      return;
    }
    runAction(
      `${copy.releaseNoun === 'payout' ? 'Payout' : 'Release'} approved`,
      () => ({
        chapter: decideDotApproval(chapter, {
          approvalRequestId: approvalId,
          approverId: activeAgent?.participantId ?? '',
          decision: 'approved',
        }),
      }),
      `${activeAgent?.name ?? 'Member'} approved readiness.`,
    );
  };

  const claimRelease = () => {
    const releaseId = latestReleaseId(chapter);
    if (!releaseId) return;
    const release = chapter.releaseRequests.find((item) => item.id === releaseId);
    if (!release) return;
    if (nativeSessionEnabled) {
      void (async () => {
        const assetHubReference = await nativeAssetHubAdapter.evidenceForClaim({
          subjectId: releaseId,
          txHash: `asset_hub_lab_${releaseId}`,
          amount: release.amount,
          currency: release.currency === 'USDC' ? 'TEST_USDC' : 'TEST_USD',
        });
        const privatePayloadRef = await nativePrivatePayloadAdapter.encryptPayload({
          subjectId: releaseId,
          kind: 'release_reference',
          visibility: 'counterparty_visible',
          recipients: privateRecipients(release.requesterId, release.recipientId),
          payload: {
            note: 'Released.',
            assetHubReference,
          },
        });
        await commitNativeAction(
          releaseActionLabel(copy.releaseNoun),
          {
            type: 'claim_release',
            releaseRequestId: releaseId,
            privatePayloadRef,
          },
          `${activeAgent?.name ?? 'Member'} recorded the ${copy.releaseNoun}.`,
        );
      })();
      return;
    }
    runAction(
      releaseActionLabel(copy.releaseNoun),
      () => {
        let nextRail = rail;
        if (nextRail && activeAgent) {
          nextRail = requestTestTokenTransfer(nextRail, {
            subjectId: release.id,
            fromParticipantId: activeAgent.participantId,
            toParticipantId: release.recipientId,
            amount: release.amount,
            currency: nextRail.balances[0]?.currency ?? 'TEST_USD',
            note: `${activeAgent.name} release note for ${release.title}`,
          });
          nextRail = completeTestTokenTransfer(nextRail, nextRail.transfers.at(-1)?.id ?? '');
        }
        return { rail: nextRail, chapter: claimDotRelease(chapter, { releaseRequestId: releaseId, actorId: activeAgent?.participantId ?? '' }) };
      },
      `${activeAgent?.name ?? 'Member'} recorded the ${copy.releaseNoun}.`,
    );
  };

  const confirmRelease = () => {
    const releaseId = latestReleaseId(chapter);
    if (!releaseId) return;
    if (nativeSessionEnabled) {
      void commitNativeAction(
        'Release confirmed',
        { type: 'confirm_release', releaseRequestId: releaseId },
        `${activeAgent?.name ?? 'Member'} confirmed receipt.`,
      );
      return;
    }
    runAction(
      'Release confirmed',
      () => ({ chapter: confirmDotRelease(chapter, { releaseRequestId: releaseId, confirmerId: activeAgent?.participantId ?? '' }) }),
      `${activeAgent?.name ?? 'Member'} confirmed receipt.`,
    );
  };

  const closeChapter = (allowOpenItems: boolean) => {
    if (nativeSessionEnabled) {
      void closeNativeChapter(allowOpenItems);
      return;
    }
    runAction(
      allowOpenItems ? 'Closed with note' : 'Closed',
      () => ({
        chapter: closeDotChapter(chapter, {
          actorId: activeAgent?.participantId ?? '',
          allowOpenItems,
          annotation: allowOpenItems ? 'Closed with visible open items.' : undefined,
        }),
      }),
      `${activeAgent?.name ?? 'Member'} closed the record.`,
    );
  };

  const recordEscrowDepositEvidence = (obligation: DotObligation) => {
    if (!rail || !activeParticipant) return;
    try {
      if (activeParticipant.id !== obligation.fromParticipantId) {
        throw new Error(`${participantName(chapter.participants, obligation.fromParticipantId)} must run this held-payment check.`);
      }
      let nextRail = requestTestTokenTransfer(rail, {
        subjectId: `escrow-${obligation.id}`,
        fromParticipantId: activeParticipant.id,
        toParticipantId: obligation.toParticipantId,
        amount: obligation.amount,
        currency: testCurrencyFor(obligation.currency),
        note: `Held-payment check for ${obligation.title}`,
      });
      nextRail = completeTestTokenTransfer(nextRail, nextRail.transfers.at(-1)?.id ?? '');
      onUpdatePot({
        dotRail: nextRail,
        dotEvents: addEvent(
          'Held-payment check added',
          `${activeParticipant.name}'s ${formatAmount(obligation.amount, obligation.currency)} has a developer check attached. ChopDot is not holding funds and receiver confirmation is still required.`,
          'info',
        ),
        dotActiveAgentId: activeAgent?.id,
        lastEditAt: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Action blocked.';
      onUpdatePot({ dotEvents: addEvent('Held-payment check blocked', message, 'blocked'), dotActiveAgentId: activeAgent?.id });
      onShowToast?.(message, 'info');
    }
  };

  const recordEscrowReleaseEvidence = () => {
    if (!rail || !activeParticipant || !release) return;
    try {
      let nextRail = requestTestTokenTransfer(rail, {
        subjectId: `escrow-release-${release.id}`,
        fromParticipantId: activeParticipant.id,
        toParticipantId: release.recipientId,
        amount: release.amount,
        currency: testCurrencyFor(release.currency),
        note: `Release check for ${release.title}`,
      });
      nextRail = completeTestTokenTransfer(nextRail, nextRail.transfers.at(-1)?.id ?? '');
      onUpdatePot({
        dotRail: nextRail,
        dotEvents: addEvent(
          'Release check added',
          `${formatAmount(release.amount, release.currency)} has a developer release check. This is not an automatic payout and receiver confirmation is still required.`,
          'info',
        ),
        dotActiveAgentId: activeAgent?.id,
        lastEditAt: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Action blocked.';
      onUpdatePot({ dotEvents: addEvent('Release check blocked', message, 'blocked'), dotActiveAgentId: activeAgent?.id });
      onShowToast?.(message, 'info');
    }
  };

  const release = chapter.releaseRequests.at(-1);
  const handledCount = chapter.obligations.filter((item) => item.state === 'confirmed' || item.state === 'exception_recorded').length;
  const confirmedCount = chapter.obligations.filter((item) => item.state === 'confirmed').length;
  const currency = chapterCurrency(chapter);
  const expectedAmount = sumObligations(chapter.obligations);
  const confirmedAmount = sumObligations(chapter.obligations, ['confirmed']);
  const notedCount = chapter.obligations.filter((item) => item.state === 'exception_recorded').length;
  const plannedReleaseAmount = releaseAmount(chapter, releaseTemplate);
  const openItems = readableBlockers(chapter, release, releaseTemplate, chapter.participants);
  const groupPrompt = nextChapterPrompt(chapter, release, releaseTemplate, chapter.participants, copy.nextReady);
  const guidedTimeline = buildGuidedTimeline(chapter, release);
  const closeoutReconciliation = buildCloseoutReconciliation({
    chapter,
    release,
    releaseTemplate,
    rail,
    closeoutReadiness: status.closeoutReadiness,
  });
  const modeSetup = buildModeSetup(chapter, releaseTemplate);
  const modeGuardrail = buildModeGuardrail(chapter);
  const releaseHandoff = buildReleaseHandoff({
    chapter,
    release,
    template: releaseTemplate,
    participants: chapter.participants,
    releaseNoun: copy.releaseNoun,
  });
  const progressPercent = chapter.obligations.length ? (handledCount / chapter.obligations.length) * 100 : 0;
  const nativeDisplaySyncStatus = nativeHostGateIssue ? 'needs refresh' : nativeSyncStatus;
  const heldTransfers = rail?.transfers.filter((transfer) => transfer.subjectId.startsWith('escrow-') && transfer.state === 'completed') ?? [];
  const heldAmount = heldTransfers
    .filter((transfer) => !transfer.subjectId.startsWith('escrow-release-'))
    .reduce((total, transfer) => total + transfer.amount, 0);
  const releaseEvidenceAmount = heldTransfers
    .filter((transfer) => transfer.subjectId.startsWith('escrow-release-'))
    .reduce((total, transfer) => total + transfer.amount, 0);
  const activeOpenObligation = chapter.obligations.find(
    (obligation) => obligation.state === 'open' && obligation.fromParticipantId === activeParticipant?.id,
  );
  const activeClaimedObligation = chapter.obligations.find(
    (obligation) =>
      obligation.state === 'claimed' &&
      (obligation.toParticipantId === activeParticipant?.id || hasRole(activeParticipant, ['organizer', 'treasurer'])),
  );
  const activeWaitingObligation = chapter.obligations.find(
    (obligation) => obligation.state === 'claimed' && obligation.fromParticipantId === activeParticipant?.id,
  );
  const contributionPhaseOpen = chapter.obligations.some((obligation) => obligation.state === 'open' || obligation.state === 'claimed');
  const primaryAction = (() => {
    if (
      activeClaimedObligation &&
      (activeClaimedObligation.toParticipantId === activeParticipant?.id || hasRole(activeParticipant, ['organizer', 'treasurer']))
    ) {
      return { label: 'Confirm received', onClick: () => confirmContribution(activeClaimedObligation) };
    }
    if (activeOpenObligation) {
      const obligation = activeOpenObligation;
      return { label: 'Mark paid', onClick: () => claimContribution(obligation) };
    }
    if (!release && releaseTemplate && hasRole(activeParticipant, ['organizer', 'treasurer'])) {
      return { label: copy.emptyRelease, onClick: createRelease };
    }
    if (release?.state === 'requested' && hasRole(activeParticipant, ['approver', 'organizer', 'treasurer'])) {
      return { label: `Approve ${copy.releaseNoun}`, onClick: approveRelease };
    }
    if (
      release?.state === 'approved' &&
      (release.requesterId === activeParticipant?.id || hasRole(activeParticipant, ['organizer', 'treasurer', 'payer']))
    ) {
      return { label: releaseActionLabel(copy.releaseNoun), onClick: claimRelease };
    }
    if (
      release?.state === 'claimed_released' &&
      (release.recipientId === activeParticipant?.id || hasRole(activeParticipant, ['organizer', 'treasurer']))
    ) {
      return { label: 'Confirm received', onClick: confirmRelease };
    }
    if (status.closeoutReadiness === 'ready' && hasRole(activeParticipant, ['organizer', 'treasurer'])) {
      return { label: copy.closeLabel, onClick: () => closeChapter(false) };
    }
    return null;
  })();
  const closeoutLabel =
    status.closeoutReadiness === 'ready'
      ? 'Ready to close'
      : status.closeoutReadiness === 'blocked'
        ? 'Not ready yet'
        : 'Can close with notes';
  const activeTask = (() => {
    if (chapter.state === 'closed') {
      return {
        label: 'Record saved',
        detail: 'All required items complete.',
      };
    }
    if (chapter.state === 'closed_with_open_items') {
      return {
        label: 'Closed with notes',
        detail: 'Open items noted.',
      };
    }
    if (activeClaimedObligation) {
      return {
        label: `Confirm ${participantName(chapter.participants, activeClaimedObligation.fromParticipantId)}`,
        detail: `${formatAmount(activeClaimedObligation.amount, activeClaimedObligation.currency)} pending receipt.`,
        actionLabel: 'Confirm received',
        onClick: () => confirmContribution(activeClaimedObligation),
      };
    }
    if (activeOpenObligation) {
      return {
        label: 'Mark your payment',
        detail: `${formatAmount(activeOpenObligation.amount, activeOpenObligation.currency)} to ${participantName(chapter.participants, activeOpenObligation.toParticipantId)}.`,
        actionLabel: 'Mark paid',
        onClick: () => claimContribution(activeOpenObligation),
      };
    }
    if (activeWaitingObligation) {
      const receiver = participantName(chapter.participants, activeWaitingObligation.toParticipantId);
      return {
        label: `Waiting on ${receiver}`,
        detail: `${formatAmount(activeWaitingObligation.amount, activeWaitingObligation.currency)} marked paid.`,
      };
    }
    if (release?.state === 'requested' && hasRole(activeParticipant, ['approver', 'organizer', 'treasurer'])) {
      return {
        label: `Approve ${copy.releaseNoun}`,
        detail: release.title,
        actionLabel: `Approve ${copy.releaseNoun}`,
        onClick: approveRelease,
      };
    }
    if (release?.state === 'approved' && (release.requesterId === activeParticipant?.id || hasRole(activeParticipant, ['organizer', 'treasurer', 'payer']))) {
      return {
        label: releaseActionLabel(copy.releaseNoun),
        detail: formatAmount(release.amount, release.currency),
        actionLabel: releaseActionLabel(copy.releaseNoun),
        onClick: claimRelease,
      };
    }
    if (release?.state === 'claimed_released' && (release.recipientId === activeParticipant?.id || hasRole(activeParticipant, ['organizer', 'treasurer']))) {
      return {
        label: 'Confirm the release',
        detail: release.title,
        actionLabel: 'Confirm received',
        onClick: confirmRelease,
      };
    }
    if (!contributionPhaseOpen && !release && releaseTemplate && hasRole(activeParticipant, ['organizer', 'treasurer'])) {
      return {
        label: copy.emptyRelease,
        detail: `${formatAmount(releaseTemplate.amount, releaseTemplate.currency)} to ${participantName(chapter.participants, releaseTemplate.recipientId)}.`,
        actionLabel: copy.emptyRelease,
        onClick: createRelease,
      };
    }
    if (status.closeoutReadiness === 'ready' && hasRole(activeParticipant, ['organizer', 'treasurer'])) {
      return {
        label: copy.closeLabel,
        detail: 'Ready.',
        actionLabel: copy.closeLabel,
        onClick: () => closeChapter(false),
      };
    }
    return passiveTaskPrompt({
      chapter,
      activeParticipant,
      release,
      releaseTemplate,
      openItems,
      copy,
      contributionPhaseOpen,
    });
  })();
  const visiblePrimaryAction = 'onClick' in activeTask && 'actionLabel' in activeTask
    ? { label: activeTask.actionLabel, onClick: activeTask.onClick }
    : null;
  const primaryActionReady = !nativeSessionEnabled || Boolean(nativeReplayOptions);
  const organizerQueue: OrganizerQueueItem[] = (() => {
    if (!hasRole(activeParticipant, ['organizer', 'treasurer'])) return [];
    const items: OrganizerQueueItem[] = [];

    for (const obligation of chapter.obligations) {
      const fromName = participantName(chapter.participants, obligation.fromParticipantId);
      if (obligation.state === 'claimed') {
        items.push({
          id: obligation.id,
          title: `Confirm ${fromName}`,
          detail: `${formatAmount(obligation.amount, obligation.currency)} pending`,
          actionLabel: 'Confirm received',
          onClick: () => confirmContribution(obligation),
        });
      } else if (obligation.state === 'open') {
        items.push({
          id: obligation.id,
          title: `Check ${fromName}`,
          detail: `${formatAmount(obligation.amount, obligation.currency)} open`,
          actionLabel: 'Record delay',
          onClick: () => recordDelay(obligation),
        });
      }
    }

    if (!contributionPhaseOpen && !release && releaseTemplate) {
      items.push({
        id: 'prepare-release',
        title: copy.emptyRelease,
        detail: `${formatAmount(releaseTemplate.amount, releaseTemplate.currency)} to ${participantName(chapter.participants, releaseTemplate.recipientId)}`,
        actionLabel: copy.emptyRelease,
        onClick: createRelease,
      });
    }

    if (release?.state === 'requested') {
      items.push({
        id: 'approve-release',
        title: `Approve ${copy.releaseNoun}`,
        detail: release.title,
        actionLabel: `Approve ${copy.releaseNoun}`,
        onClick: approveRelease,
      });
    }

    if (release?.state === 'approved') {
      items.push({
        id: 'claim-release',
        title: releaseActionLabel(copy.releaseNoun),
        detail: formatAmount(release.amount, release.currency),
        actionLabel: releaseActionLabel(copy.releaseNoun),
        onClick: claimRelease,
      });
    }

    if (release?.state === 'claimed_released') {
      const recipientName = participantName(chapter.participants, release.recipientId);
      items.push({
        id: 'confirm-release',
        title: `Confirm ${recipientName}`,
        detail: release.title,
        actionLabel: 'Confirm received',
        onClick: confirmRelease,
      });
    }

    if (status.closeoutReadiness === 'ready') {
      items.push({
        id: 'close-record',
        title: 'Close record',
        detail: 'Ready',
        actionLabel: copy.closeLabel,
        onClick: () => closeChapter(false),
      });
    }

    return items.slice(0, 6);
  })();
  const waitingGuide: WaitingGuide | null = (() => {
    if (!activeParticipant || visiblePrimaryAction || hasRole(activeParticipant, ['organizer', 'treasurer'])) return null;
    const firstOpenItem = openItems[0]?.replace(/\.$/, '') ?? 'No blocker is assigned to you right now';
    const moreOpenItems = openItems.length > 1 ? ` + ${openItems.length - 1} more` : '';
    const rows: ModeSetupRow[] = [
      { label: 'Waiting on', value: `${firstOpenItem}${moreOpenItems}` },
    ];

    if (activeWaitingObligation) {
      rows.push(
        { label: 'Your part', value: 'Marked paid' },
        { label: 'Next', value: 'Receiver confirmation' },
      );
      return {
        detail: 'Payment marked.',
        rows,
      };
    }

    if (contributionPhaseOpen && hasRole(activeParticipant, ['approver'])) {
      rows.push(
        { label: 'Your part', value: 'Approve later' },
        { label: 'Next', value: 'Payment review' },
        { label: 'Status', value: 'Not ready' },
      );
      return {
        detail: 'Approval pending.',
        rows,
      };
    }

    if (contributionPhaseOpen && hasRole(activeParticipant, ['receiver'])) {
      rows.push(
        { label: 'Your part', value: 'Confirm later' },
        { label: 'Next', value: 'Release record' },
        { label: 'Status', value: 'Pending' },
      );
      return {
        detail: `${copy.releaseNoun[0]?.toUpperCase() ?? ''}${copy.releaseNoun.slice(1)} pending.`,
        rows,
      };
    }

    if (release?.state === 'requested' && hasRole(activeParticipant, ['approver'])) {
      rows.push(
        { label: 'Your part', value: 'Approve' },
        { label: 'Next', value: 'Release record' },
        { label: 'Status', value: 'Ready' },
      );
      return {
        detail: release.title,
        rows,
      };
    }

    if (release?.state === 'approved') {
      rows.push(
        { label: 'Your part', value: release.recipientId === activeParticipant.id ? 'Confirm later' : 'Wait' },
        { label: 'Next', value: 'Release record' },
        { label: 'Status', value: 'Approved' },
      );
      return {
        detail: release.title,
        rows,
      };
    }

    if (release?.state === 'claimed_released') {
      rows.push(
        { label: 'Your part', value: release.recipientId === activeParticipant.id ? 'Confirm' : 'Wait' },
        { label: 'Next', value: `${participantName(chapter.participants, release.recipientId)} confirmation` },
        { label: 'Status', value: 'Released' },
      );
      return {
        detail: release.title,
        rows,
      };
    }

    if (hasRole(activeParticipant, ['viewer'])) {
      rows.push(
        { label: 'Your part', value: 'Review only' },
        { label: 'Can change?', value: 'No' },
      );
      return {
        detail: 'You can review this group record, but you cannot mark payments, confirm receipt, approve release, or close it.',
        rows,
      };
    }

    rows.push({ label: 'Your part', value: activeTask.label });
    return {
      detail: 'The next action belongs to someone else. This view shows what must happen before your role is needed.',
      rows,
    };
  })();
  const sortedObligations = [...chapter.obligations].sort((left, right) => {
    const leftActive = left.fromParticipantId === activeParticipant?.id || left.toParticipantId === activeParticipant?.id;
    const rightActive = right.fromParticipantId === activeParticipant?.id || right.toParticipantId === activeParticipant?.id;
    if (leftActive === rightActive) return 0;
    return leftActive ? -1 : 1;
  });
  const sortedParticipants = [...chapter.participants].sort((left, right) => {
    const leftActive = left.id === activeParticipant?.id;
    const rightActive = right.id === activeParticipant?.id;
    if (leftActive === rightActive) return 0;
    return leftActive ? -1 : 1;
  });
  const scrollToReceiptReview = () => {
    setActiveTab('Overview');
    window.setTimeout(() => {
      receiptReviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };
  const copyChapterLink = async (participantId?: string, participantLabel = 'Chapter') => {
    const url = shareUrlForParticipant(participantId);
    const ok = await copyWithToast(url, `${participantLabel} link copied`, (message) => onShowToast?.(message, 'success'));
    if (!ok) {
      onShowToast?.('Could not copy link', 'error');
    }
  };

  return (
    <div className="flex flex-col h-full pb-[68px] bg-background" data-testid="chapter-home">
      <TopBar
        title={pot.name}
        onBack={onBack}
        rightAction={
          <div className="flex items-center gap-1.5">
            <button
              className="p-2 hover:bg-muted/50 rounded-lg transition-all duration-200 active:scale-95"
              title="Share"
              aria-label="Share chapter link"
              data-testid="chapter-share-link"
              onClick={() => void copyChapterLink(activeParticipant?.id, activeParticipant?.name ?? 'Chapter')}
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              className="p-2 hover:bg-muted/50 rounded-lg transition-all duration-200 active:scale-95"
              title="Review receipt"
              aria-label="Review receipt"
              onClick={scrollToReceiptReview}
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        }
      />

      <div className="px-4 py-3 flex items-center gap-2 border-b border-border bg-background" data-testid="chapter-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ backgroundColor: activeTab === tab ? 'var(--ink)' : 'var(--card)', color: activeTab === tab ? 'var(--bg)' : 'var(--ink)' }}
            className="px-3 py-1.5 rounded-lg text-[13px] transition-colors font-medium flex-shrink-0"
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {activeTab === 'Overview' && (
          <div className="space-y-3" data-testid="chapter-overview">
            <div className="rounded-[1.35rem] bg-[var(--ink)] text-[var(--bg)] p-5 space-y-5 overflow-hidden">
              <div>
                <p className="text-micro text-white/55">Your step · {activeParticipant ? activeParticipant.name : copy.eyebrow}</p>
                <h2 className="text-[32px] leading-[0.98] font-semibold mt-2 tracking-normal" data-testid="next-actor">
                  {activeTask.label}
                </h2>
                <p className="text-caption text-white/70 mt-3 max-w-[30rem]">{activeTask.detail}</p>
              </div>
              {nativeSessionEnabled && (
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/10 p-3" data-testid="native-sync-status">
                  <span className="text-caption text-secondary">Sync</span>
                  <span className="text-caption font-semibold text-foreground">{nativeDisplaySyncStatus}</span>
                </div>
              )}
              {visiblePrimaryAction && (
                <button
                  type="button"
                  data-testid="guided-primary-action"
                  className="w-full px-4 py-3 rounded-2xl text-body font-semibold active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
                  style={accentActionStyle}
                  disabled={!primaryActionReady}
                  onClick={visiblePrimaryAction.onClick}
                >
                  {visiblePrimaryAction.label}
                </button>
              )}
              <div className="h-1.5 bg-white/15 rounded-full overflow-hidden">
                <div className="h-full transition-all duration-300" style={{ width: `${progressPercent}%`, background: 'var(--accent, #e6007a)' }} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-micro text-white/55">{copy.moneyInLabel}</p>
                  <p className="text-body font-semibold tabular-nums">{formatAmount(expectedAmount, currency)}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-micro text-white/55">Confirmed</p>
                  <p className="text-body font-semibold tabular-nums">{formatAmount(confirmedAmount, currency)}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-micro text-white/55">{copy.moneyOutLabel}</p>
                  <p className="text-body font-semibold tabular-nums">{formatAmount(plannedReleaseAmount, release?.currency ?? releaseTemplate?.currency ?? currency)}</p>
                </div>
              </div>
            </div>

            <GuidedTimeline timeline={guidedTimeline} />
            <ModeSetupCard setup={modeSetup} />
            <ModeGuardrailCard guardrail={modeGuardrail} />
            <WaitingGuideCard guide={waitingGuide} />
            <OrganizerQueueCard items={organizerQueue} />

            <div className="card p-4" data-testid="blockers">
              <div className="flex items-center justify-between gap-3">
                <p className="text-body font-medium">Group state</p>
                <span className="text-caption text-secondary">{handledCount}/{chapter.obligations.length} handled</span>
              </div>
              <div className="pt-2">
                <p className="text-body font-medium">{groupPrompt.label}</p>
                <p className="text-caption text-secondary mt-1">{groupPrompt.detail}</p>
              </div>
              {openItems.length ? (
                <div className="pt-2 space-y-2">
                  {openItems.map((blocker) => (
                    <p className="text-caption text-secondary" key={blocker}>{blocker}</p>
                  ))}
                </div>
              ) : (
                <p className="text-caption text-secondary mt-1">
                  {notedCount ? `${notedCount} item${notedCount === 1 ? '' : 's'} closed with a note.` : 'Every required item is confirmed.'}
                </p>
              )}
            </div>

            <CloseoutReconciliationPanel reconciliation={closeoutReconciliation} />

            {escrowLabEnabled && (
              <div className="card p-4 space-y-3" data-testid="escrow-status">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-body font-medium">Developer simulation only</p>
                    <p className="text-caption text-secondary mt-1">
                      Developer simulation. ChopDot is not holding funds, protecting funds, or guaranteeing payout. People still need to mark paid, confirm received, approve release, and close the record.
                    </p>
                  </div>
                  <p className="text-body font-semibold tabular-nums" aria-label="Simulated held amount">{formatAmount(heldAmount, currency)}</p>
                </div>
                {releaseEvidenceAmount > 0 && (
                  <p className="text-caption text-secondary">
                    {formatAmount(releaseEvidenceAmount, release?.currency ?? currency)} has a simulated release reference. Receiver confirmation is still required.
                  </p>
                )}
              </div>
            )}

            <div className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-body font-medium">Group status</p>
                <p className="text-caption text-secondary">{confirmedCount} confirmed</p>
              </div>
              <div className="pt-2">
                {sortedObligations.map((obligation) => (
                  <PaymentStatusRow
                    key={obligation.id}
                    obligation={obligation}
                    activeParticipant={activeParticipant}
                    participants={chapter.participants}
                  />
                ))}
              </div>
              <button
                type="button"
                className="w-full mt-2 px-3 py-2 rounded-xl border border-border bg-card text-body active:scale-[0.98]"
                onClick={() => setActiveTab('People')}
              >
                Review people
              </button>
            </div>

            {contributionPhaseOpen && !release ? (
              <div className="card p-4 space-y-1" data-testid="release-panel">
                <p className="text-micro text-secondary">{copy.moneyOutLabel}</p>
                <p className="text-body font-medium">Payout waits for confirmed payments</p>
                <p className="text-caption text-secondary">
                  {copy.emptyRelease} appears after each contribution is confirmed or noted.
                </p>
              </div>
            ) : (
              <ReleaseSection
                release={release}
                template={releaseTemplate}
                activeParticipant={activeParticipant}
                participants={chapter.participants}
                releaseNoun={copy.releaseNoun}
                emptyLabel={copy.emptyRelease}
                onCreate={createRelease}
                onApprove={approveRelease}
                onClaim={claimRelease}
                onConfirm={confirmRelease}
              />
            )}
            <ReleaseHandoffCard handoff={releaseHandoff} />

            <div className="card p-4 space-y-3" data-testid="receipt-preview">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-body font-medium">Closeout readiness</p>
                  <span className="text-caption px-2 py-1 rounded-full bg-muted/20 text-secondary whitespace-nowrap">{closeoutLabel}</span>
                </div>
                <p className="text-caption text-secondary mt-1">
                  {receipt?.summary.confirmedObligationCount}/{receipt?.summary.obligationCount} contributions confirmed.
                  {receipt?.summary.exceptionCount ? ` ${receipt.summary.exceptionCount} note added.` : ''}
                </p>
                <p className="text-caption text-secondary mt-1">
                  {receipt?.state === 'closed'
                    ? 'Record closed. The receipt shows what the group confirmed or noted.'
                    : status.closeoutReadiness === 'ready'
                      ? 'All required items are confirmed or noted.'
                      : 'Private record. The record stays private until the group is ready to close.'}
                </p>
              </div>
              {hasRole(activeParticipant, ['organizer', 'treasurer']) && primaryAction?.label !== copy.closeLabel && (
                <button
                  type="button"
                  className="w-full px-3 py-2 rounded-xl text-body active:scale-[0.98]"
                  style={accentActionStyle}
                  onClick={() => closeChapter(status.closeoutReadiness !== 'ready')}
                >
                  {status.closeoutReadiness === 'ready' ? copy.closeLabel : copy.openCloseLabel}
                </button>
              )}
            </div>

            <div ref={receiptReviewRef}>
              <ReceiptReview
                receipt={receipt}
                closeoutLabel={closeoutLabel}
                isNativeSession={nativeSessionEnabled}
                nativeHostIssue={nativeHostGateIssue}
              />
            </div>
          </div>
        )}

        {activeTab === 'People' && (
          <div className="space-y-3" data-testid="chapter-people">
            {nativeSessionEnabled && !showDeveloperControls && (
              <div className="card p-4 space-y-1" data-testid="person-link-guide">
                <p className="text-body font-medium">Send each person their own link</p>
                <p className="text-caption text-secondary">
                  Use one device or browser profile per person. Each link opens the same group record with that person’s next step first.
                </p>
              </div>
            )}
            {showDeveloperControls && (
              <div className="card p-4 space-y-1">
                <p className="text-body font-medium">Demo person</p>
                <p className="text-caption text-secondary">Switch who is using this local preview.</p>
              </div>
            )}
            {showDeveloperControls
              ? agents.map((agent: ChapterPotAgent) => (
                  <button
                    key={agent.id}
                    type="button"
                    data-testid={activeAgentId === agent.id ? 'active-agent' : undefined}
                    onClick={() => {
                      setActiveAgentId(agent.id);
                      onUpdatePot({ dotActiveAgentId: agent.id });
                    }}
                    className={`w-full card p-4 text-left transition-all duration-200 active:scale-[0.98] ${activeAgentId === agent.id ? 'border border-[var(--accent)]' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-body font-medium">{agent.name}</p>
                        <p className="text-caption text-secondary mt-0.5">{agent.job}</p>
                      </div>
                      <span className="text-caption text-secondary">{activeAgentId === agent.id ? 'Active' : 'View'}</span>
                    </div>
                  </button>
                ))
              : sortedParticipants.map((participant) => {
                  const isActiveParticipant = participant.id === activeParticipant?.id;
                  return (
                  <div
                    className={`card p-4 ${isActiveParticipant ? 'border border-[var(--accent)]' : ''}`}
                    key={participant.id}
                    data-testid={`participant-${participant.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-body font-medium truncate">{participant.name}</p>
                        <p className="text-caption text-secondary mt-0.5">{participantRoles(participant)}</p>
                      </div>
                      {isActiveParticipant && (
                        <span className="text-caption px-2 py-1 rounded-full bg-muted/20 text-secondary whitespace-nowrap">
                          You
                        </span>
                      )}
                    </div>
                    {nativeSessionEnabled && (
                      <button
                        type="button"
                        className="mt-3 px-3 py-2 rounded-lg border border-border text-caption active:scale-[0.98]"
                        data-testid={`participant-share-link-${participant.id}`}
                        onClick={() => void copyChapterLink(participant.id, participant.name)}
                      >
                        {isActiveParticipant ? 'Copy my link' : 'Copy link'}
                      </button>
                    )}
                  </div>
                  );
                })}
            <div className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-body font-medium">Payment details</p>
                <p className="text-caption text-secondary">{handledCount}/{chapter.obligations.length} handled</p>
              </div>
              <div className="pt-2">
                {sortedObligations.map((obligation) => (
                  <ContributionRow
                    key={obligation.id}
                    obligation={obligation}
                    activeParticipant={activeParticipant}
                    participants={chapter.participants}
                    onClaim={() => claimContribution(obligation)}
                    onConfirm={() => confirmContribution(obligation)}
                    onException={() => recordDelay(obligation)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Activity' && (
          <div className="space-y-3" data-testid="chapter-activity">
            {events.map((event) => (
              <div className="card p-4" key={event.id}>
                <p className="text-body font-medium">{event.label}</p>
                <p className="text-caption text-secondary mt-1">{event.actor}: {event.detail}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Settings' && (
          <div className="space-y-3" data-testid="chapter-settings">
            <div className="card p-4 space-y-2">
              <p className="text-body font-medium">Privacy</p>
              <p className="text-caption text-secondary">{chapter.privacyLevel} record. Exports default to redacted.</p>
            </div>
            <div className="card p-4 space-y-2">
              <p className="text-body font-medium">Policy</p>
              <p className="text-caption text-secondary">{chapter.policyVersions.at(-1)?.summary}</p>
            </div>
            {showDeveloperControls && (
              <details className="card p-4" data-testid="developer-checks">
                <summary className="text-body font-medium cursor-pointer">Developer checks</summary>
                <div className="pt-3 space-y-3 text-caption text-secondary">
                  <div data-testid="token-rail">
                    <p className="font-medium text-foreground">Token simulation</p>
                    {rail?.transfers.length ? rail.transfers.map((transfer) => (
                      <p key={transfer.id}>{transfer.state}: {formatAmount(transfer.amount, transfer.currency)}</p>
                    )) : <p>No local transfer records yet.</p>}
                  </div>
                  {escrowLabEnabled && (
                    <div data-testid="escrow-dev-controls">
                      <p className="font-medium text-foreground">Escrow developer checks</p>
                      <p>Developer simulation only. These actions do not hold funds, protect funds, guarantee payout, mark paid, confirm receipt, approve release, or close the record.</p>
                      <div className="flex flex-col gap-2 pt-2">
                        {chapter.obligations.map((obligation) => (
                          <button
                            key={obligation.id}
                            type="button"
                            className="px-3 py-2 rounded-xl border border-border bg-card text-body"
                            onClick={() => recordEscrowDepositEvidence(obligation)}
                          >
                            Add held-payment check for {participantName(chapter.participants, obligation.fromParticipantId)}
                          </button>
                        ))}
                        {release && (
                          <button
                            type="button"
                            className="px-3 py-2 rounded-xl border border-border bg-card text-body"
                            onClick={recordEscrowReleaseEvidence}
                          >
                            Add release check
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {nativeSessionEnabled && (
                    <div data-testid="native-session-events">
                      <p className="font-medium text-foreground">Signed session</p>
                      <p>{nativeEventCount} signed event{nativeEventCount === 1 ? '' : 's'}</p>
                      <p>{nativeDisplaySyncStatus}</p>
                    </div>
                  )}
                  {nativeSessionEnabled && (
                    <div data-testid="native-host-gate-status">
                      <p className="font-medium text-foreground">Host gate</p>
                      <p>{nativeHostGateIssue ?? 'No host gate issue recorded.'}</p>
                    </div>
                  )}
                  {nativeSessionEnabled && (
                    <div data-testid="native-host-preflight">
                      <p className="font-medium text-foreground">Host preflight</p>
                      {nativeHostPreflightStatus !== 'checked' && <p>Checking host gates...</p>}
                      {nativeHostPreflight.map((gate) => (
                        <p key={gate.id} data-testid={`native-host-preflight-${gate.id}`}>
                          {gate.label}: {gate.status} - {gate.detail}
                        </p>
                      ))}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-foreground">Adversarial actions</p>
                    <div className="flex flex-col gap-2 pt-2">
                      {chapter.obligations.map((obligation) => (
                        <button
                          key={obligation.id}
                          type="button"
                          className="px-3 py-2 rounded-xl border border-border bg-card text-body"
                          onClick={() => {
                            if (!rail) return;
                            try {
                              let nextRail = requestTestTokenTransfer(rail, {
                                subjectId: `failed-${obligation.id}-${rail.transfers.length}`,
                                fromParticipantId: obligation.fromParticipantId,
                                toParticipantId: obligation.toParticipantId,
                                amount: obligation.amount,
                                currency: rail.balances[0]?.currency ?? 'TEST_USD',
                                note: `Failed transfer drill for ${obligation.title}`,
                              });
                              nextRail = failTestTokenTransfer(nextRail, nextRail.transfers.at(-1)?.id ?? '');
                              onUpdatePot({ dotRail: nextRail, dotEvents: addEvent('Transfer failed', 'The open item remains because failed simulation does not mark paid.', 'blocked') });
                            } catch (error) {
                              const message = error instanceof Error ? error.message : 'Action blocked.';
                              onUpdatePot({ dotEvents: addEvent('Transfer failed', message, 'blocked') });
                            }
                          }}
                        >
                          Simulate failed transfer
                        </button>
                      ))}
                    </div>
                  </div>
                  <pre className="max-h-64 overflow-auto rounded-xl bg-black p-3 text-white/80 whitespace-pre-wrap">
                    {JSON.stringify(receipt, null, 2)}
                  </pre>
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
