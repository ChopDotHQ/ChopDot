import {cloneJson} from './canonical.ts';
import {addMoney, assertMoney, moneyEquals, moneyFromMinorUnits, type MoneyAllocationV1, type MoneyV1} from './money.ts';

export type ModeWorkflowGroupModeV1 =
  | 'normal_pot'
  | 'trip'
  | 'couple'
  | 'spend_card'
  | 'savings_circle'
  | 'emergency_pot'
  | 'community_fund';

export type ModeWorkflowEventTypeV1 =
  | 'SPEND_TRANSACTION_IMPORTED'
  | 'SPEND_RECEIPT_REVIEWED'
  | 'SPEND_TRANSACTION_LINKED'
  | 'SPEND_TRANSACTION_REFUNDED'
  | 'SPEND_TRANSACTION_REVERSED'
  | 'SPEND_SETTLED_ADJUSTMENT_CONFIRMED'
  | 'CIRCLE_RULES_SET'
  | 'CIRCLE_RULES_ACCEPTED'
  | 'CIRCLE_PARTICIPANT_EXITED'
  | 'CIRCLE_PARTICIPANT_REPLACED'
  | 'CIRCLE_ROUND_OPENED'
  | 'CIRCLE_CONTRIBUTION_RECORDED'
  | 'CIRCLE_CONTRIBUTION_RECEIVED'
  | 'CIRCLE_CONTRIBUTION_DELAYED'
  | 'CIRCLE_CONTRIBUTION_DEFAULTED'
  | 'CIRCLE_CONTRIBUTION_CORRECTED'
  | 'CIRCLE_PAYOUT_RECORDED'
  | 'CIRCLE_PAYOUT_CONFIRMED'
  | 'CIRCLE_ROUND_ADVANCED'
  | 'CIRCLE_CLOSED'
  | 'EMERGENCY_POLICY_SET'
  | 'EMERGENCY_POLICY_RECONCILED'
  | 'EMERGENCY_REQUEST_OPENED'
  | 'EMERGENCY_CONTRIBUTION_RECORDED'
  | 'EMERGENCY_CONTRIBUTION_RECEIVED'
  | 'EMERGENCY_REQUEST_APPROVED'
  | 'EMERGENCY_RELEASE_RECORDED'
  | 'EMERGENCY_RELEASE_CONFIRMED'
  | 'EMERGENCY_RELEASE_DISPUTED'
  | 'EMERGENCY_CORRECTION_APPROVED'
  | 'EMERGENCY_RELEASE_CORRECTED'
  | 'EMERGENCY_REQUEST_CLOSED'
  | 'COMMUNITY_POLICY_SET'
  | 'COMMUNITY_POLICY_RECONCILED'
  | 'COMMUNITY_CONTRIBUTION_RECORDED'
  | 'COMMUNITY_CONTRIBUTION_RECEIVED'
  | 'COMMUNITY_PROPOSAL_CREATED'
  | 'COMMUNITY_PROPOSAL_AMENDED'
  | 'COMMUNITY_PROPOSAL_APPROVED'
  | 'COMMUNITY_PROPOSAL_REJECTED'
  | 'COMMUNITY_PROPOSAL_EXPIRED'
  | 'COMMUNITY_RELEASE_RECORDED'
  | 'COMMUNITY_RELEASE_CONFIRMED'
  | 'COMMUNITY_STEWARD_HANDOFF_PROPOSED'
  | 'COMMUNITY_STEWARD_HANDOFF_ACCEPTED'
  | 'COMMUNITY_REPORT_ADDED'
  | 'COMMUNITY_FUND_CLOSED';

export const MODE_WORKFLOW_EVENT_TYPES_V1: readonly ModeWorkflowEventTypeV1[] = Object.freeze([
  'SPEND_TRANSACTION_IMPORTED',
  'SPEND_RECEIPT_REVIEWED',
  'SPEND_TRANSACTION_LINKED',
  'SPEND_TRANSACTION_REFUNDED',
  'SPEND_TRANSACTION_REVERSED',
  'SPEND_SETTLED_ADJUSTMENT_CONFIRMED',
  'CIRCLE_RULES_SET',
  'CIRCLE_RULES_ACCEPTED',
  'CIRCLE_PARTICIPANT_EXITED',
  'CIRCLE_PARTICIPANT_REPLACED',
  'CIRCLE_ROUND_OPENED',
  'CIRCLE_CONTRIBUTION_RECORDED',
  'CIRCLE_CONTRIBUTION_RECEIVED',
  'CIRCLE_CONTRIBUTION_DELAYED',
  'CIRCLE_CONTRIBUTION_DEFAULTED',
  'CIRCLE_CONTRIBUTION_CORRECTED',
  'CIRCLE_PAYOUT_RECORDED',
  'CIRCLE_PAYOUT_CONFIRMED',
  'CIRCLE_ROUND_ADVANCED',
  'CIRCLE_CLOSED',
  'EMERGENCY_POLICY_SET',
  'EMERGENCY_POLICY_RECONCILED',
  'EMERGENCY_REQUEST_OPENED',
  'EMERGENCY_CONTRIBUTION_RECORDED',
  'EMERGENCY_CONTRIBUTION_RECEIVED',
  'EMERGENCY_REQUEST_APPROVED',
  'EMERGENCY_RELEASE_RECORDED',
  'EMERGENCY_RELEASE_CONFIRMED',
  'EMERGENCY_RELEASE_DISPUTED',
  'EMERGENCY_CORRECTION_APPROVED',
  'EMERGENCY_RELEASE_CORRECTED',
  'EMERGENCY_REQUEST_CLOSED',
  'COMMUNITY_POLICY_SET',
  'COMMUNITY_POLICY_RECONCILED',
  'COMMUNITY_CONTRIBUTION_RECORDED',
  'COMMUNITY_CONTRIBUTION_RECEIVED',
  'COMMUNITY_PROPOSAL_CREATED',
  'COMMUNITY_PROPOSAL_AMENDED',
  'COMMUNITY_PROPOSAL_APPROVED',
  'COMMUNITY_PROPOSAL_REJECTED',
  'COMMUNITY_PROPOSAL_EXPIRED',
  'COMMUNITY_RELEASE_RECORDED',
  'COMMUNITY_RELEASE_CONFIRMED',
  'COMMUNITY_STEWARD_HANDOFF_PROPOSED',
  'COMMUNITY_STEWARD_HANDOFF_ACCEPTED',
  'COMMUNITY_REPORT_ADDED',
  'COMMUNITY_FUND_CLOSED',
]);

export interface ModeWorkflowPayloadByTypeV1 {
  SPEND_TRANSACTION_IMPORTED: {transactionId: string; transactionReferenceHash: string; merchantLabel: string; total: MoneyV1; transactedAt: string};
  SPEND_RECEIPT_REVIEWED: {transactionId: string; receiptId: string; receiptDigest: string; reviewedTotal: MoneyV1};
  SPEND_TRANSACTION_LINKED: {transactionId: string; expenseId: string};
  SPEND_TRANSACTION_REFUNDED: {transactionId: string; adjustmentId: string; referenceHash: string; reasonDigest: string; amount: MoneyV1};
  SPEND_TRANSACTION_REVERSED: {transactionId: string; adjustmentId: string; referenceHash: string; reasonDigest: string; amount: MoneyV1};
  SPEND_SETTLED_ADJUSTMENT_CONFIRMED: {transactionId: string; adjustmentId: string; amount: MoneyV1; resolutionReferenceHash: string};
  CIRCLE_RULES_SET: {rulesId: string; participantOrder: string[]; contribution: MoneyV1; dueEveryDays: number};
  CIRCLE_RULES_ACCEPTED: {rulesId: string};
  CIRCLE_PARTICIPANT_EXITED: {participantId: string; reasonDigest: string};
  CIRCLE_PARTICIPANT_REPLACED: {departedParticipantId: string; replacementParticipantId: string; reasonDigest: string};
  CIRCLE_ROUND_OPENED: {roundId: string; sequence: number; dueAt: string};
  CIRCLE_CONTRIBUTION_RECORDED: {roundId: string; contributionId: string; amount: MoneyV1; referenceHash: string};
  CIRCLE_CONTRIBUTION_RECEIVED: {roundId: string; contributionId: string};
  CIRCLE_CONTRIBUTION_DELAYED: {roundId: string; contributionId: string; until: string; noteDigest: string};
  CIRCLE_CONTRIBUTION_DEFAULTED: {roundId: string; contributionId: string; noteDigest: string};
  CIRCLE_CONTRIBUTION_CORRECTED: {roundId: string; contributionId: string; amount: MoneyV1; reasonDigest: string};
  CIRCLE_PAYOUT_RECORDED: {roundId: string; payoutId: string; amount: MoneyV1; referenceHash: string};
  CIRCLE_PAYOUT_CONFIRMED: {roundId: string; payoutId: string};
  CIRCLE_ROUND_ADVANCED: {roundId: string; nextRoundId: string; nextDueAt: string};
  CIRCLE_CLOSED: {roundId: string; recordId: string};
  EMERGENCY_POLICY_SET: {trustedApproverIds: string[]; approvalThreshold: number};
  EMERGENCY_POLICY_RECONCILED: {trustedApproverIds: string[]; approvalThreshold: number};
  EMERGENCY_REQUEST_OPENED: {requestId: string; recipientId: string; reasonDigest: string; target: MoneyV1};
  EMERGENCY_CONTRIBUTION_RECORDED: {requestId: string; contributionId: string; amount: MoneyV1; referenceHash: string};
  EMERGENCY_CONTRIBUTION_RECEIVED: {requestId: string; contributionId: string};
  EMERGENCY_REQUEST_APPROVED: {requestId: string};
  EMERGENCY_RELEASE_RECORDED: {requestId: string; releaseId: string; amount: MoneyV1; referenceHash: string};
  EMERGENCY_RELEASE_CONFIRMED: {requestId: string; releaseId: string};
  EMERGENCY_RELEASE_DISPUTED: {requestId: string; releaseId: string; reasonDigest: string};
  EMERGENCY_CORRECTION_APPROVED: {requestId: string; releaseId: string};
  EMERGENCY_RELEASE_CORRECTED: {requestId: string; disputedReleaseId: string; releaseId: string; amount: MoneyV1; referenceHash: string; reasonDigest: string};
  EMERGENCY_REQUEST_CLOSED: {requestId: string; recordId: string};
  COMMUNITY_POLICY_SET: {stewardId: string; approverIds: string[]; approvalThreshold: number};
  COMMUNITY_POLICY_RECONCILED: {stewardId: string; approverIds: string[]; approvalThreshold: number};
  COMMUNITY_CONTRIBUTION_RECORDED: {contributionId: string; amount: MoneyV1; referenceHash: string};
  COMMUNITY_CONTRIBUTION_RECEIVED: {contributionId: string};
  COMMUNITY_PROPOSAL_CREATED: {proposalId: string; recipientId: string; summary: string; purposeDigest: string; amount: MoneyV1; expiresAt: string};
  COMMUNITY_PROPOSAL_AMENDED: {proposalId: string; summary: string; purposeDigest: string; amount: MoneyV1; expiresAt: string};
  COMMUNITY_PROPOSAL_APPROVED: {proposalId: string};
  COMMUNITY_PROPOSAL_REJECTED: {proposalId: string; reasonDigest: string};
  COMMUNITY_PROPOSAL_EXPIRED: {proposalId: string};
  COMMUNITY_RELEASE_RECORDED: {proposalId: string; releaseId: string; amount: MoneyV1; referenceHash: string};
  COMMUNITY_RELEASE_CONFIRMED: {proposalId: string; releaseId: string};
  COMMUNITY_STEWARD_HANDOFF_PROPOSED: {handoffId: string; nextStewardId: string};
  COMMUNITY_STEWARD_HANDOFF_ACCEPTED: {handoffId: string};
  COMMUNITY_REPORT_ADDED: {reportId: string; summary: string; reportDigest: string; periodStart: string; periodEnd: string};
  COMMUNITY_FUND_CLOSED: {recordId: string};
}

export type ModeWorkflowEventPayloadV1 = ModeWorkflowPayloadByTypeV1[ModeWorkflowEventTypeV1];
export type ModeWorkflowCommandV1 = {
  [Type in ModeWorkflowEventTypeV1]: {eventType: Type; payload: ModeWorkflowPayloadByTypeV1[Type]}
}[ModeWorkflowEventTypeV1];

export interface SpendCardTransactionV1 {
  transactionId: string;
  cardholderId: string;
  transactionReferenceHash: string;
  merchantLabel: string;
  total: MoneyV1;
  transactedAt: string;
  receipt: null | {
    receiptId: string;
    receiptDigest: string;
    reviewedTotal: MoneyV1;
    outcome: 'matched' | 'mismatch';
    eventId: string;
  };
  linkedExpenseId: string | null;
  pendingExpenseCorrection: null | {
    adjustmentId: string;
    expenseId: string;
    previousTotal: MoneyV1;
    nextTotal: MoneyV1;
    correctionReason: string;
  };
  completedExpenseCorrections: Array<{adjustmentId: string; expenseId: string; correctionEventId: string; total: MoneyV1}>;
  settledAdjustmentFollowUps: Array<{
    adjustmentId: string;
    expenseId: string;
    kind: 'refund' | 'reversal';
    amount: MoneyV1;
    reasonDigest: string;
    referenceHash: string;
    allocations: MoneyAllocationV1[];
    requiredConfirmationIds: string[];
    confirmedBy: Array<{participantId: string; amount: MoneyV1; resolutionReferenceHash: string; eventId: string}>;
  }>;
  adjustments: Array<{
    adjustmentId: string;
    kind: 'refund' | 'reversal';
    referenceHash: string;
    reasonDigest: string;
    amount: MoneyV1;
    eventId: string;
  }>;
  remaining: MoneyV1;
}

export interface SavingsCircleRulesV1 {
  rulesId: string;
  participantOrder: string[];
  contribution: MoneyV1;
  dueEveryDays: number;
  acceptedBy: string[];
}

export interface SavingsCircleContributionV1 {
  contributionId: string;
  participantId: string;
  amount: MoneyV1;
  referenceHash: string;
  status: 'recorded' | 'received' | 'delayed' | 'defaulted';
  delayUntil?: string;
  noteDigest?: string;
  corrections: Array<{eventId: string; previousAmount: MoneyV1; amount: MoneyV1; reasonDigest: string}>;
}

export interface SavingsCircleRoundV1 {
  roundId: string;
  sequence: number;
  recipientId: string;
  dueAt: string;
  contributions: Record<string, SavingsCircleContributionV1>;
  exitedParticipantIds: string[];
  payout: null | {
    payoutId: string;
    amount: MoneyV1;
    referenceHash: string;
    recordedBy: string;
    status: 'recorded' | 'confirmed';
  };
}

export interface EmergencyContributionV1 {
  contributionId: string;
  contributorId: string;
  amount: MoneyV1;
  referenceHash: string;
  status: 'recorded' | 'received';
}

export interface EmergencyReleaseV1 {
  releaseId: string;
  amount: MoneyV1;
  referenceHash: string;
  status: 'recorded' | 'confirmed' | 'disputed';
  disputeReasonDigest?: string;
  correctionOfReleaseId?: string;
}

export interface EmergencyRequestV1 {
  requestId: string;
  requesterId: string;
  recipientId: string;
  reasonDigest: string;
  target: MoneyV1;
  contributions: Record<string, EmergencyContributionV1>;
  approvedBy: string[];
  release: EmergencyReleaseV1 | null;
  releaseHistory: EmergencyReleaseV1[];
  correctionApprovedBy: string[];
  closedRecordId: string | null;
}

export interface CommunityContributionV1 {
  contributionId: string;
  contributorId: string;
  amount: MoneyV1;
  referenceHash: string;
  status: 'recorded' | 'received';
}

export interface CommunityProposalV1 {
  proposalId: string;
  proposerId: string;
  recipientId: string;
  summary: string;
  purposeDigest: string;
  amount: MoneyV1;
  expiresAt: string;
  revision: number;
  approvedBy: string[];
  status: 'open' | 'approved' | 'rejected' | 'expired' | 'released' | 'confirmed';
  rejectionReasonDigest?: string;
  release: null | {releaseId: string; amount: MoneyV1; referenceHash: string};
}

export interface CanonicalModeStateV1 {
  spendCard?: {transactions: Record<string, SpendCardTransactionV1>};
  savingsCircle?: {
    rules: SavingsCircleRulesV1 | null;
    activeRound: SavingsCircleRoundV1 | null;
    completedRounds: SavingsCircleRoundV1[];
    closedRecordId: string | null;
  };
  emergencyPot?: {
    policy: null | {trustedApproverIds: string[]; approvalThreshold: number};
    requests: Record<string, EmergencyRequestV1>;
  };
  communityFund?: {
    policy: null | {stewardId: string; approverIds: string[]; approvalThreshold: number};
    contributions: Record<string, CommunityContributionV1>;
    proposals: Record<string, CommunityProposalV1>;
    pendingHandoff: null | {handoffId: string; fromStewardId: string; nextStewardId: string};
    reports: Array<{reportId: string; summary: string; reportDigest: string; periodStart: string; periodEnd: string; eventId: string}>;
    closedRecordId: string | null;
  };
}

interface ModeWorkflowMemberV1 {role: 'organizer' | 'member'; active?: boolean; acceptedAt?: string}
interface ModeWorkflowExpenseV1 {expenseId: string; paidBy: string; total: MoneyV1; revisions: Array<{eventId: string}>}
interface ModeWorkflowShareV1 {shareId: string; expenseId: string; participantId: string; amount: MoneyV1; status: 'open' | 'requested' | 'marked_paid' | 'cleared' | 'received' | 'waived' | 'disputed'}
export interface ModeWorkflowContextV1 {
  mode: ModeWorkflowGroupModeV1;
  organizerId: string;
  members: Record<string, ModeWorkflowMemberV1>;
  expenses: Record<string, ModeWorkflowExpenseV1>;
  shares: Record<string, ModeWorkflowShareV1>;
  modeState?: CanonicalModeStateV1;
}

export interface ModeWorkflowEventV1 {
  eventId: string;
  eventType: ModeWorkflowEventTypeV1;
  actorId: string;
  occurredAt: string;
  payload: ModeWorkflowEventPayloadV1;
}

export function initialModeStateV1(mode: ModeWorkflowGroupModeV1): CanonicalModeStateV1 {
  if (mode === 'spend_card') return {spendCard: {transactions: {}}};
  if (mode === 'savings_circle') return {savingsCircle: {rules: null, activeRound: null, completedRounds: [], closedRecordId: null}};
  if (mode === 'emergency_pot') return {emergencyPot: {policy: null, requests: {}}};
  if (mode === 'community_fund') return {communityFund: {policy: null, contributions: {}, proposals: {}, pendingHandoff: null, reports: [], closedRecordId: null}};
  return {};
}

export function isModeWorkflowEventTypeV1(value: unknown): value is ModeWorkflowEventTypeV1 {
  return MODE_WORKFLOW_EVENT_TYPES_V1.includes(value as ModeWorkflowEventTypeV1);
}

/**
 * Apply one named-mode event to the canonical group projection. The caller is
 * the shared money-event kernel, so every accepted change still advances the
 * same signed frontier. This function never performs payment or custody.
 */
export function applyModeWorkflowEventV1(context: ModeWorkflowContextV1, event: ModeWorkflowEventV1): CanonicalModeStateV1 {
  if (!isModeWorkflowEventTypeV1(event.eventType)) throw new Error('Named-mode event type is invalid.');
  if (!context.members[event.actorId]) throw new Error('Named-mode actor is not a group member.');
  const state = cloneJson(context.modeState ?? initialModeStateV1(context.mode));
  if (event.eventType.startsWith('SPEND_')) return applySpendCard(context, state, event);
  if (event.eventType.startsWith('CIRCLE_')) return applySavingsCircle(context, state, event);
  if (event.eventType.startsWith('EMERGENCY_')) return applyEmergencyPot(context, state, event);
  return applyCommunityFund(context, state, event);
}

function applySpendCard(context: ModeWorkflowContextV1, state: CanonicalModeStateV1, event: ModeWorkflowEventV1): CanonicalModeStateV1 {
  if (context.mode !== 'spend_card' || !state.spendCard) throw new Error('Spend Card actions require a Spend Card group.');
  const transactions = state.spendCard.transactions;
  if (event.eventType === 'SPEND_TRANSACTION_IMPORTED') {
    const payload = event.payload as {transactionId: string; transactionReferenceHash: string; merchantLabel: string; total: MoneyV1; transactedAt: string};
    requiredId(payload.transactionId, 'Transaction');
    requiredDigest(payload.transactionReferenceHash, 'Transaction reference');
    requiredText(payload.merchantLabel, 'Merchant');
    assertPositiveMoney(payload.total, 'Transaction total');
    assertIso(payload.transactedAt, 'Transaction time');
    if (transactions[payload.transactionId]) throw new Error('This card transaction was already imported.');
    if (Object.values(transactions).some(row => row.transactionReferenceHash === payload.transactionReferenceHash)) throw new Error('This card transaction reference is a duplicate.');
    transactions[payload.transactionId] = {
      transactionId: payload.transactionId,
      cardholderId: event.actorId,
      transactionReferenceHash: payload.transactionReferenceHash,
      merchantLabel: payload.merchantLabel.trim(),
      total: cloneJson(payload.total),
      transactedAt: payload.transactedAt,
      receipt: null,
      linkedExpenseId: null,
      pendingExpenseCorrection: null,
      completedExpenseCorrections: [],
      settledAdjustmentFollowUps: [],
      adjustments: [],
      remaining: cloneJson(payload.total),
    };
    return state;
  }
  const payload = event.payload as {transactionId: string};
  const transaction = transactions[payload.transactionId];
  if (!transaction) throw new Error('Card transaction is missing.');
  if (event.eventType === 'SPEND_SETTLED_ADJUSTMENT_CONFIRMED') {
    const confirmation = event.payload as {transactionId: string; adjustmentId: string; amount: MoneyV1; resolutionReferenceHash: string};
    const followUp = transaction.settledAdjustmentFollowUps.find(row => row.adjustmentId === confirmation.adjustmentId);
    if (!followUp || !followUp.requiredConfirmationIds.includes(event.actorId)) throw new Error('Only an affected participant may confirm this settled adjustment follow-up.');
    if (followUp.confirmedBy.some(row => row.participantId === event.actorId)) throw new Error('This settled adjustment follow-up is already confirmed by this participant.');
    const allocation = followUp.allocations.find(row => row.participantId === event.actorId);
    if (!allocation || !moneyEquals(allocation.amount, confirmation.amount)) throw new Error('Settled adjustment confirmation amount does not match the signed successor allocation.');
    requiredDigest(confirmation.resolutionReferenceHash, 'Settled adjustment resolution reference');
    if (transaction.settledAdjustmentFollowUps.some(row => row.confirmedBy.some(candidate => candidate.resolutionReferenceHash === confirmation.resolutionReferenceHash))) {
      throw new Error('Settled adjustment resolution reference is a duplicate.');
    }
    followUp.confirmedBy.push({participantId: event.actorId, amount: cloneJson(confirmation.amount), resolutionReferenceHash: confirmation.resolutionReferenceHash, eventId: event.eventId});
    followUp.confirmedBy.sort((left, right) => left.participantId.localeCompare(right.participantId));
    return state;
  }
  if (transaction.cardholderId !== event.actorId) throw new Error('Only the cardholder may review or adjust this transaction.');
  if (event.eventType === 'SPEND_RECEIPT_REVIEWED') {
    const reviewed = event.payload as {transactionId: string; receiptId: string; receiptDigest: string; reviewedTotal: MoneyV1};
    requiredId(reviewed.receiptId, 'Receipt');
    requiredDigest(reviewed.receiptDigest, 'Receipt');
    assertPositiveMoney(reviewed.reviewedTotal, 'Reviewed receipt total');
    if (transaction.receipt) throw new Error('This transaction already has a reviewed receipt.');
    if (Object.values(transactions).some(row => row.receipt?.receiptDigest === reviewed.receiptDigest)) throw new Error('This receipt was already matched to another transaction.');
    assertSameCurrency(transaction.total, reviewed.reviewedTotal, 'Receipt');
    transaction.receipt = {
      receiptId: reviewed.receiptId,
      receiptDigest: reviewed.receiptDigest,
      reviewedTotal: cloneJson(reviewed.reviewedTotal),
      outcome: moneyEquals(transaction.total, reviewed.reviewedTotal) ? 'matched' : 'mismatch',
      eventId: event.eventId,
    };
    return state;
  }
  if (event.eventType === 'SPEND_TRANSACTION_LINKED') {
    const linked = event.payload as {transactionId: string; expenseId: string};
    requiredId(linked.expenseId, 'Expense');
    if (!transaction.receipt) throw new Error('Review the receipt before linking this transaction.');
    if (transaction.linkedExpenseId) throw new Error('This card transaction is already linked to an expense.');
    const expense = context.expenses[linked.expenseId];
    if (!expense) throw new Error('The linked expense is missing.');
    if (expense.paidBy !== event.actorId) throw new Error('The linked expense must belong to the cardholder.');
    if (!moneyEquals(expense.total, transaction.receipt.reviewedTotal)) throw new Error('The linked expense must exactly match the reviewed receipt total and currency.');
    if (Object.values(transactions).some(row => row.linkedExpenseId === linked.expenseId)) throw new Error('This expense is already linked to another card transaction.');
    transaction.linkedExpenseId = linked.expenseId;
    return state;
  }
  const adjustment = event.payload as {transactionId: string; adjustmentId: string; referenceHash: string; reasonDigest: string; amount: MoneyV1};
  if (!transaction.linkedExpenseId) throw new Error('Split and link this reviewed transaction before recording an adjustment.');
  if (transaction.pendingExpenseCorrection) throw new Error('Finish the pending expense correction before recording another adjustment.');
  if (transaction.settledAdjustmentFollowUps.some(row => row.confirmedBy.length !== row.requiredConfirmationIds.length)) throw new Error('Finish the settled adjustment follow-up before recording another adjustment.');
  requiredId(adjustment.adjustmentId, 'Card adjustment');
  requiredDigest(adjustment.referenceHash, 'Card adjustment reference');
  requiredDigest(adjustment.reasonDigest, 'Card adjustment reason');
  assertPositiveMoney(adjustment.amount, 'Card adjustment amount');
  assertSameCurrency(transaction.total, adjustment.amount, 'Card adjustment');
  if (transaction.adjustments.some(row => row.adjustmentId === adjustment.adjustmentId || row.referenceHash === adjustment.referenceHash)) {
    throw new Error('This card adjustment is a duplicate.');
  }
  const remaining = BigInt(transaction.remaining.minorUnits);
  const amount = BigInt(adjustment.amount.minorUnits);
  const expense = context.expenses[transaction.linkedExpenseId];
  if (!expense) throw new Error('The linked expense is missing.');
  if (amount > remaining) throw new Error('Card adjustment exceeds the remaining transaction amount.');
  if (event.eventType === 'SPEND_TRANSACTION_REVERSED' && amount !== remaining) throw new Error('A reversal must cover the exact remaining transaction amount.');
  const expenseMinorUnits = BigInt(expense.total.minorUnits);
  if (event.eventType === 'SPEND_TRANSACTION_REFUNDED' && amount > expenseMinorUnits) throw new Error('Card refund exceeds the linked expense total.');
  const nextExpenseTotal = moneyFromMinorUnits(
    event.eventType === 'SPEND_TRANSACTION_REVERSED' ? 0n : expenseMinorUnits - amount,
    expense.total.currency,
    expense.total.exponent,
  );
  transaction.adjustments.push({
    adjustmentId: adjustment.adjustmentId,
    kind: event.eventType === 'SPEND_TRANSACTION_REFUNDED' ? 'refund' : 'reversal',
    referenceHash: adjustment.referenceHash,
    reasonDigest: adjustment.reasonDigest,
    amount: cloneJson(adjustment.amount),
    eventId: event.eventId,
  });
  transaction.remaining = moneyFromMinorUnits(remaining - amount, transaction.total.currency, transaction.total.exponent);
  const expenseShares = Object.values(context.shares).filter(share => share.expenseId === expense.expenseId);
  if (expenseShares.some(share => !['open', 'requested'].includes(share.status))) {
    const allocations = proportionalAllocations(expenseShares.map(share => ({participantId: share.participantId, amount: share.amount})), adjustment.amount);
    const affectedParticipantIds = allocations
      .filter(row => BigInt(row.amount.minorUnits) > 0n && context.members[row.participantId]?.active !== false && row.participantId !== transaction.cardholderId)
      .map(row => row.participantId)
      .sort();
    transaction.settledAdjustmentFollowUps.push({
      adjustmentId: adjustment.adjustmentId,
      expenseId: expense.expenseId,
      kind: event.eventType === 'SPEND_TRANSACTION_REFUNDED' ? 'refund' : 'reversal',
      amount: cloneJson(adjustment.amount),
      reasonDigest: adjustment.reasonDigest,
      referenceHash: adjustment.referenceHash,
      allocations,
      requiredConfirmationIds: affectedParticipantIds.length > 0 ? affectedParticipantIds : [transaction.cardholderId],
      confirmedBy: [],
    });
    return state;
  }
  transaction.pendingExpenseCorrection = {
    adjustmentId: adjustment.adjustmentId,
    expenseId: expense.expenseId,
    previousTotal: cloneJson(expense.total),
    nextTotal: nextExpenseTotal,
    correctionReason: spendCorrectionReason(transaction.transactionId, adjustment.adjustmentId),
  };
  return state;
}

function applySavingsCircle(context: ModeWorkflowContextV1, state: CanonicalModeStateV1, event: ModeWorkflowEventV1): CanonicalModeStateV1 {
  if (context.mode !== 'savings_circle' || !state.savingsCircle) throw new Error('Savings-circle actions require a savings-circle group.');
  const circle = state.savingsCircle;
  if (circle.closedRecordId) throw new Error('This savings circle is already closed.');
  if (event.eventType === 'CIRCLE_RULES_SET') {
    const payload = event.payload as {rulesId: string; participantOrder: string[]; contribution: MoneyV1; dueEveryDays: number};
    if (event.actorId !== context.organizerId || circle.rules) throw new Error('Only the organizer may set the initial circle rules.');
    requiredId(payload.rulesId, 'Circle rules');
    const participantOrder = uniqueMembers(payload.participantOrder, context.members, 'Circle order');
    if (participantOrder.length !== Object.keys(context.members).length) throw new Error('Circle order must include every member exactly once.');
    assertPositiveMoney(payload.contribution, 'Circle contribution');
    if (!Number.isSafeInteger(payload.dueEveryDays) || payload.dueEveryDays < 1 || payload.dueEveryDays > 366) throw new Error('Circle cadence is invalid.');
    circle.rules = {rulesId: payload.rulesId, participantOrder, contribution: cloneJson(payload.contribution), dueEveryDays: payload.dueEveryDays, acceptedBy: [event.actorId]};
    return state;
  }
  const rules = circle.rules;
  if (!rules) throw new Error('Circle rules must be set first.');
  if (event.eventType === 'CIRCLE_RULES_ACCEPTED') {
    const payload = event.payload as {rulesId: string};
    if (payload.rulesId !== rules.rulesId) throw new Error('Circle acceptance refers to different rules.');
    if (rules.acceptedBy.includes(event.actorId)) throw new Error('Circle rules were already accepted by this member.');
    rules.acceptedBy.push(event.actorId);
    rules.acceptedBy.sort();
    return state;
  }
  if (event.eventType === 'CIRCLE_PARTICIPANT_EXITED') {
    const payload = event.payload as {participantId: string; reasonDigest: string};
    if (event.actorId !== context.organizerId) throw new Error('Only the organizer may record a circle exit.');
    requireInactiveMember(payload.participantId, context.members, 'Departed circle participant');
    if (!rules.participantOrder.includes(payload.participantId)) throw new Error('Departed participant is not in the accepted circle order.');
    requiredDigest(payload.reasonDigest, 'Circle exit reason');
    const round = circle.activeRound;
    if (round) {
      if (round.exitedParticipantIds.includes(payload.participantId)) throw new Error('Circle exit is already recorded for this round.');
      const contribution = Object.values(round.contributions).find(row => row.participantId === payload.participantId);
      if (contribution && ['recorded', 'delayed'].includes(contribution.status)) {
        contribution.status = 'defaulted';
        contribution.noteDigest = payload.reasonDigest;
      }
      round.exitedParticipantIds.push(payload.participantId);
      round.exitedParticipantIds.sort();
    }
    return state;
  }
  if (event.eventType === 'CIRCLE_PARTICIPANT_REPLACED') {
    const payload = event.payload as {departedParticipantId: string; replacementParticipantId: string; reasonDigest: string};
    if (event.actorId !== context.organizerId) throw new Error('Only the organizer may replace a departed circle participant.');
    requireInactiveMember(payload.departedParticipantId, context.members, 'Departed circle participant');
    requireActiveAcceptedMember(payload.replacementParticipantId, context.members, 'Replacement circle participant');
    requiredDigest(payload.reasonDigest, 'Circle replacement reason');
    const departedIndex = rules.participantOrder.indexOf(payload.departedParticipantId);
    if (departedIndex < 0) throw new Error('Departed participant is not in the accepted circle order.');
    if (rules.participantOrder.includes(payload.replacementParticipantId)) throw new Error('Replacement participant is already in the circle order.');
    const round = circle.activeRound;
    if (round?.recipientId === payload.departedParticipantId) {
      round.recipientId = payload.replacementParticipantId;
    } else if (round) {
      const departedContribution = Object.values(round.contributions).find(row => row.participantId === payload.departedParticipantId);
      if (departedContribution && ['received', 'defaulted'].includes(departedContribution.status)) {
        round.exitedParticipantIds.push(payload.replacementParticipantId);
        round.exitedParticipantIds = [...new Set(round.exitedParticipantIds)].sort();
      } else if (departedContribution) {
        throw new Error('Record the departed contribution as exited before replacement.');
      }
    }
    rules.participantOrder[departedIndex] = payload.replacementParticipantId;
    rules.acceptedBy = rules.acceptedBy.filter(id => id !== payload.departedParticipantId && id !== payload.replacementParticipantId).sort();
    return state;
  }
  if (rules.acceptedBy.length !== rules.participantOrder.length) throw new Error('Every circle member must accept the rules first.');
  if (event.eventType === 'CIRCLE_ROUND_OPENED') {
    const payload = event.payload as {roundId: string; sequence: number; dueAt: string};
    if (event.actorId !== context.organizerId || circle.activeRound || circle.completedRounds.length) throw new Error('Only the organizer may open the first circle round.');
    requiredId(payload.roundId, 'Circle round');
    assertIso(payload.dueAt, 'Circle due time');
    if (payload.sequence !== 1) throw new Error('The first circle round sequence must be one.');
    circle.activeRound = newCircleRound(payload.roundId, payload.sequence, rules.participantOrder[0], payload.dueAt);
    return state;
  }
  const round = circle.activeRound;
  if (!round) throw new Error('A circle round must be open first.');
  const roundPayload = event.payload as {roundId: string};
  if (roundPayload.roundId !== round.roundId) throw new Error('Circle action refers to another round.');
  if (event.eventType === 'CIRCLE_CONTRIBUTION_RECORDED') {
    const payload = event.payload as {roundId: string; contributionId: string; amount: MoneyV1; referenceHash: string};
    if (!rules.participantOrder.includes(event.actorId)) throw new Error('Only an accepted circle participant may contribute.');
    if (event.actorId === round.recipientId) throw new Error('The round recipient does not owe a contribution to themself.');
    requiredId(payload.contributionId, 'Circle contribution');
    requiredDigest(payload.referenceHash, 'Circle contribution reference');
    assertPositiveMoney(payload.amount, 'Circle contribution');
    if (!moneyEquals(payload.amount, rules.contribution)) throw new Error('Circle contribution does not match the accepted rules.');
    if (allCircleContributions(circle).some(row => row.contributionId === payload.contributionId || row.referenceHash === payload.referenceHash)
      || Object.values(round.contributions).some(row => row.participantId === event.actorId)) {
      throw new Error('This circle contribution is a duplicate.');
    }
    round.contributions[payload.contributionId] = {
      contributionId: payload.contributionId,
      participantId: event.actorId,
      amount: cloneJson(payload.amount),
      referenceHash: payload.referenceHash,
      status: 'recorded',
      corrections: [],
    };
    return state;
  }
  const contributionPayload = event.payload as {contributionId?: string};
  const contribution = contributionPayload.contributionId ? round.contributions[contributionPayload.contributionId] : undefined;
  if (['CIRCLE_CONTRIBUTION_RECEIVED','CIRCLE_CONTRIBUTION_DELAYED','CIRCLE_CONTRIBUTION_DEFAULTED','CIRCLE_CONTRIBUTION_CORRECTED'].includes(event.eventType)) {
    if (!contribution) throw new Error('Circle contribution is missing.');
    if (event.eventType === 'CIRCLE_CONTRIBUTION_RECEIVED') {
      if (event.actorId !== round.recipientId || !['recorded', 'delayed'].includes(contribution.status)) throw new Error('Only the round recipient may confirm this contribution.');
      contribution.status = 'received';
      delete contribution.delayUntil;
      return state;
    }
    if (event.eventType === 'CIRCLE_CONTRIBUTION_DELAYED') {
      const payload = event.payload as {until: string; noteDigest: string};
      if (event.actorId !== contribution.participantId || !['recorded', 'delayed'].includes(contribution.status)) throw new Error('Only the contributor may record their delay.');
      assertIso(payload.until, 'Circle delay');
      if (Date.parse(payload.until) <= Date.parse(event.occurredAt)) throw new Error('Circle delay must be in the future.');
      requiredDigest(payload.noteDigest, 'Circle delay note');
      contribution.status = 'delayed';
      contribution.delayUntil = payload.until;
      contribution.noteDigest = payload.noteDigest;
      return state;
    }
    if (event.eventType === 'CIRCLE_CONTRIBUTION_DEFAULTED') {
      const payload = event.payload as {noteDigest: string};
      if (event.actorId !== round.recipientId || !['recorded', 'delayed'].includes(contribution.status)) throw new Error('Only the round recipient may record a missed contribution.');
      if (Date.parse(event.occurredAt) < Date.parse(contribution.delayUntil ?? round.dueAt)) throw new Error('A circle contribution cannot default before it is due.');
      requiredDigest(payload.noteDigest, 'Circle default note');
      contribution.status = 'defaulted';
      contribution.noteDigest = payload.noteDigest;
      return state;
    }
    const payload = event.payload as {amount: MoneyV1; reasonDigest: string};
    if (event.actorId !== contribution.participantId || contribution.status === 'received') throw new Error('Only the contributor may correct their unresolved contribution.');
    assertPositiveMoney(payload.amount, 'Corrected circle contribution');
    assertSameCurrency(rules.contribution, payload.amount, 'Corrected circle contribution');
    requiredDigest(payload.reasonDigest, 'Circle correction reason');
    contribution.corrections.push({eventId: event.eventId, previousAmount: cloneJson(contribution.amount), amount: cloneJson(payload.amount), reasonDigest: payload.reasonDigest});
    contribution.amount = cloneJson(payload.amount);
    return state;
  }
  if (event.eventType === 'CIRCLE_PAYOUT_RECORDED') {
    const payload = event.payload as {payoutId: string; amount: MoneyV1; referenceHash: string};
    if (event.actorId !== context.organizerId || round.payout) throw new Error('Only the organizer may record one circle payout.');
    const dueContributors = rules.participantOrder.filter(id => id !== round.recipientId);
    if (dueContributors.some(id => !round.exitedParticipantIds.includes(id) && !Object.values(round.contributions).some(row => row.participantId === id && ['received', 'defaulted'].includes(row.status)))) {
      throw new Error('Every due circle contribution must be received or visibly defaulted first.');
    }
    requiredId(payload.payoutId, 'Circle payout');
    requiredDigest(payload.referenceHash, 'Circle payout reference');
    if (allCirclePayouts(circle).some(row => row.payoutId === payload.payoutId || row.referenceHash === payload.referenceHash)) throw new Error('This circle payout reference is a duplicate.');
    const expected = dueContributors.reduce((sum, participantId) => {
      const row = Object.values(round.contributions).find(candidate => candidate.participantId === participantId);
      return row?.status === 'received' ? addMoney(sum, row.amount) : sum;
    }, moneyFromMinorUnits(0n, rules.contribution.currency, rules.contribution.exponent));
    if (!moneyEquals(payload.amount, expected)) throw new Error('Circle payout must match the received contribution total exactly.');
    round.payout = {payoutId: payload.payoutId, amount: cloneJson(payload.amount), referenceHash: payload.referenceHash, recordedBy: event.actorId, status: 'recorded'};
    return state;
  }
  if (event.eventType === 'CIRCLE_PAYOUT_CONFIRMED') {
    const payload = event.payload as {payoutId: string};
    if (event.actorId !== round.recipientId || !round.payout || round.payout.payoutId !== payload.payoutId || round.payout.status !== 'recorded') {
      throw new Error('Only the round recipient may confirm the recorded payout.');
    }
    round.payout.status = 'confirmed';
    return state;
  }
  if (event.eventType === 'CIRCLE_ROUND_ADVANCED') {
    const payload = event.payload as {nextRoundId: string; nextDueAt: string};
    if (event.actorId !== context.organizerId || round.payout?.status !== 'confirmed') throw new Error('A confirmed payout is required before advancing the circle.');
    if (round.sequence >= rules.participantOrder.length) throw new Error('The final circle round must be closed, not advanced.');
    requiredId(payload.nextRoundId, 'Next circle round');
    assertIso(payload.nextDueAt, 'Next circle due time');
    if (circle.completedRounds.some(row => row.roundId === payload.nextRoundId) || round.roundId === payload.nextRoundId) throw new Error('Circle round identifier is a duplicate.');
    const nextRecipientId = rules.participantOrder[round.sequence];
    if (context.members[nextRecipientId]?.active === false) throw new Error('Replace the departed next recipient before advancing the circle.');
    circle.completedRounds.push(round);
    circle.activeRound = newCircleRound(payload.nextRoundId, round.sequence + 1, nextRecipientId, payload.nextDueAt);
    return state;
  }
  const payload = event.payload as {recordId: string};
  if (event.actorId !== context.organizerId || round.sequence !== rules.participantOrder.length || round.payout?.status !== 'confirmed') {
    throw new Error('The organizer may close only after the final recipient confirms payout.');
  }
  requiredId(payload.recordId, 'Circle record');
  circle.completedRounds.push(round);
  circle.activeRound = null;
  circle.closedRecordId = payload.recordId;
  return state;
}

function applyEmergencyPot(context: ModeWorkflowContextV1, state: CanonicalModeStateV1, event: ModeWorkflowEventV1): CanonicalModeStateV1 {
  if (context.mode !== 'emergency_pot' || !state.emergencyPot) throw new Error('Emergency actions require an emergency-pot group.');
  const emergency = state.emergencyPot;
  if (event.eventType === 'EMERGENCY_POLICY_SET') {
    const payload = event.payload as {trustedApproverIds: string[]; approvalThreshold: number};
    if (event.actorId !== context.organizerId || emergency.policy) throw new Error('Only the organizer may set the initial emergency policy.');
    const trustedApproverIds = uniqueMembers(payload.trustedApproverIds, context.members, 'Emergency approvers');
    assertThreshold(payload.approvalThreshold, trustedApproverIds.length, 'Emergency');
    emergency.policy = {trustedApproverIds, approvalThreshold: payload.approvalThreshold};
    return state;
  }
  if (event.eventType === 'EMERGENCY_POLICY_RECONCILED') {
    const payload = event.payload as {trustedApproverIds: string[]; approvalThreshold: number};
    if (event.actorId !== context.organizerId || !emergency.policy) throw new Error('Only the organizer may reconcile an existing emergency policy.');
    if (!emergency.policy.trustedApproverIds.some(id => context.members[id]?.active === false)) throw new Error('Emergency policy reconciliation requires a departed approver.');
    const trustedApproverIds = uniqueActiveMembers(payload.trustedApproverIds, context.members, 'Emergency approvers');
    assertThreshold(payload.approvalThreshold, trustedApproverIds.length, 'Emergency');
    emergency.policy = {trustedApproverIds, approvalThreshold: payload.approvalThreshold};
    for (const request of Object.values(emergency.requests)) {
      if (!request.closedRecordId) {
        request.approvedBy = request.approvedBy.filter(id => trustedApproverIds.includes(id));
        request.correctionApprovedBy = request.correctionApprovedBy.filter(id => trustedApproverIds.includes(id));
      }
    }
    return state;
  }
  const policy = emergency.policy;
  if (!policy) throw new Error('Emergency trusted roles and threshold must be set first.');
  if (event.eventType === 'EMERGENCY_REQUEST_OPENED') {
    const payload = event.payload as {requestId: string; recipientId: string; reasonDigest: string; target: MoneyV1};
    requiredId(payload.requestId, 'Emergency request');
    requireMember(payload.recipientId, context.members, 'Emergency recipient');
    requiredDigest(payload.reasonDigest, 'Emergency reason');
    assertPositiveMoney(payload.target, 'Emergency target');
    if (emergency.requests[payload.requestId]) throw new Error('Emergency request identifier is a duplicate.');
    emergency.requests[payload.requestId] = {
      requestId: payload.requestId,
      requesterId: event.actorId,
      recipientId: payload.recipientId,
      reasonDigest: payload.reasonDigest,
      target: cloneJson(payload.target),
      contributions: {},
      approvedBy: [],
      release: null,
      releaseHistory: [],
      correctionApprovedBy: [],
      closedRecordId: null,
    };
    return state;
  }
  const requestPayload = event.payload as {requestId: string};
  const request = emergency.requests[requestPayload.requestId];
  if (!request) throw new Error('Emergency request is missing.');
  if (request.closedRecordId) throw new Error('Emergency request is already closed.');
  if (event.eventType === 'EMERGENCY_CONTRIBUTION_RECORDED') {
    const payload = event.payload as {contributionId: string; amount: MoneyV1; referenceHash: string};
    requiredId(payload.contributionId, 'Emergency contribution');
    requiredDigest(payload.referenceHash, 'Emergency contribution reference');
    assertPositiveMoney(payload.amount, 'Emergency contribution');
    assertSameCurrency(request.target, payload.amount, 'Emergency contribution');
    if (allEmergencyReferences(emergency).some(row => row.id === payload.contributionId || row.referenceHash === payload.referenceHash)) throw new Error('Emergency contribution is a duplicate.');
    request.contributions[payload.contributionId] = {contributionId: payload.contributionId, contributorId: event.actorId, amount: cloneJson(payload.amount), referenceHash: payload.referenceHash, status: 'recorded'};
    return state;
  }
  if (event.eventType === 'EMERGENCY_CONTRIBUTION_RECEIVED') {
    const payload = event.payload as {contributionId: string};
    const contribution = request.contributions[payload.contributionId];
    if (event.actorId !== context.organizerId || !contribution || contribution.status !== 'recorded') throw new Error('Only the organizer may confirm a recorded emergency contribution.');
    contribution.status = 'received';
    return state;
  }
  if (event.eventType === 'EMERGENCY_REQUEST_APPROVED') {
    if (!policy.trustedApproverIds.includes(event.actorId)) throw new Error('Only a trusted emergency approver may approve release.');
    if (request.approvedBy.includes(event.actorId)) throw new Error('Emergency approval is a duplicate.');
    request.approvedBy.push(event.actorId);
    request.approvedBy.sort();
    return state;
  }
  if (event.eventType === 'EMERGENCY_RELEASE_RECORDED') {
    const payload = event.payload as {releaseId: string; amount: MoneyV1; referenceHash: string};
    if (event.actorId !== context.organizerId || request.release) throw new Error('Only the organizer may record one approved emergency release.');
    if (request.approvedBy.length < policy.approvalThreshold) throw new Error('Emergency approval threshold has not been met.');
    requiredId(payload.releaseId, 'Emergency release');
    requiredDigest(payload.referenceHash, 'Emergency release reference');
    if (allEmergencyReferences(emergency).some(row => row.id === payload.releaseId || row.referenceHash === payload.referenceHash)) throw new Error('Emergency release reference is a duplicate.');
    assertPositiveMoney(payload.amount, 'Emergency release');
    assertSameCurrency(request.target, payload.amount, 'Emergency release');
    const received = sumMoney(Object.values(request.contributions).filter(row => row.status === 'received').map(row => row.amount), request.target);
    if (BigInt(payload.amount.minorUnits) > BigInt(received.minorUnits) || BigInt(payload.amount.minorUnits) > BigInt(request.target.minorUnits)) {
      throw new Error('Emergency release exceeds the received contributions or request target.');
    }
    request.release = {releaseId: payload.releaseId, amount: cloneJson(payload.amount), referenceHash: payload.referenceHash, status: 'recorded'};
    return state;
  }
  if (event.eventType === 'EMERGENCY_RELEASE_CONFIRMED') {
    const payload = event.payload as {releaseId: string};
    if (event.actorId !== request.recipientId || request.release?.releaseId !== payload.releaseId || request.release.status !== 'recorded') {
      throw new Error('Only the emergency recipient may confirm the recorded release.');
    }
    request.release.status = 'confirmed';
    return state;
  }
  if (event.eventType === 'EMERGENCY_RELEASE_DISPUTED') {
    const payload = event.payload as {releaseId: string; reasonDigest: string};
    if (event.actorId !== request.recipientId || request.release?.releaseId !== payload.releaseId || request.release.status !== 'recorded') {
      throw new Error('Only the emergency recipient may dispute the recorded release.');
    }
    requiredDigest(payload.reasonDigest, 'Emergency dispute reason');
    request.release.status = 'disputed';
    request.release.disputeReasonDigest = payload.reasonDigest;
    request.correctionApprovedBy = [];
    return state;
  }
  if (event.eventType === 'EMERGENCY_CORRECTION_APPROVED') {
    const payload = event.payload as {releaseId: string};
    if (!policy.trustedApproverIds.includes(event.actorId) || request.release?.releaseId !== payload.releaseId || request.release.status !== 'disputed') {
      throw new Error('Only a trusted approver may authorize correction of the disputed release.');
    }
    if (request.correctionApprovedBy.includes(event.actorId)) throw new Error('Emergency correction approval is a duplicate.');
    request.correctionApprovedBy.push(event.actorId);
    request.correctionApprovedBy.sort();
    return state;
  }
  if (event.eventType === 'EMERGENCY_RELEASE_CORRECTED') {
    const payload = event.payload as {disputedReleaseId: string; releaseId: string; amount: MoneyV1; referenceHash: string; reasonDigest: string};
    if (event.actorId !== context.organizerId || request.release?.releaseId !== payload.disputedReleaseId || request.release.status !== 'disputed') {
      throw new Error('Only the organizer may correct the current disputed release.');
    }
    if (request.correctionApprovedBy.length < policy.approvalThreshold) throw new Error('Emergency correction approval threshold has not been met.');
    requiredId(payload.releaseId, 'Corrected emergency release');
    requiredDigest(payload.referenceHash, 'Corrected emergency release reference');
    requiredDigest(payload.reasonDigest, 'Emergency correction reason');
    if (allEmergencyReferences(emergency).some(row => row.id === payload.releaseId || row.referenceHash === payload.referenceHash)) throw new Error('Corrected emergency release reference is a duplicate.');
    assertPositiveMoney(payload.amount, 'Corrected emergency release');
    assertSameCurrency(request.target, payload.amount, 'Corrected emergency release');
    const received = sumMoney(Object.values(request.contributions).filter(row => row.status === 'received').map(row => row.amount), request.target);
    if (BigInt(payload.amount.minorUnits) > BigInt(received.minorUnits) || BigInt(payload.amount.minorUnits) > BigInt(request.target.minorUnits)) {
      throw new Error('Corrected emergency release exceeds the received contributions or request target.');
    }
    request.releaseHistory.push(cloneJson(request.release));
    request.release = {
      releaseId: payload.releaseId,
      amount: cloneJson(payload.amount),
      referenceHash: payload.referenceHash,
      status: 'recorded',
      correctionOfReleaseId: payload.disputedReleaseId,
    };
    request.correctionApprovedBy = [];
    return state;
  }
  const payload = event.payload as {recordId: string};
  if (event.actorId !== context.organizerId || request.release?.status !== 'confirmed') throw new Error('Only a confirmed emergency release can be closed.');
  requiredId(payload.recordId, 'Emergency record');
  request.closedRecordId = payload.recordId;
  return state;
}

function applyCommunityFund(context: ModeWorkflowContextV1, state: CanonicalModeStateV1, event: ModeWorkflowEventV1): CanonicalModeStateV1 {
  if (context.mode !== 'community_fund' || !state.communityFund) throw new Error('Community actions require a community-fund group.');
  const fund = state.communityFund;
  if (fund.closedRecordId) throw new Error('This community fund is already closed.');
  if (event.eventType === 'COMMUNITY_POLICY_SET') {
    const payload = event.payload as {stewardId: string; approverIds: string[]; approvalThreshold: number};
    if (event.actorId !== context.organizerId || fund.policy) throw new Error('Only the organizer may set the initial community policy.');
    requireMember(payload.stewardId, context.members, 'Community steward');
    const approverIds = uniqueMembers(payload.approverIds, context.members, 'Community approvers');
    assertThreshold(payload.approvalThreshold, approverIds.length, 'Community');
    fund.policy = {stewardId: payload.stewardId, approverIds, approvalThreshold: payload.approvalThreshold};
    return state;
  }
  if (event.eventType === 'COMMUNITY_POLICY_RECONCILED') {
    const payload = event.payload as {stewardId: string; approverIds: string[]; approvalThreshold: number};
    if (event.actorId !== context.organizerId || !fund.policy) throw new Error('Only the organizer may reconcile an existing community policy.');
    if (context.members[fund.policy.stewardId]?.active !== false
      && !fund.policy.approverIds.some(id => context.members[id]?.active === false)) {
      throw new Error('Community policy reconciliation requires a departed role holder.');
    }
    requireActiveMember(payload.stewardId, context.members, 'Community steward');
    const approverIds = uniqueActiveMembers(payload.approverIds, context.members, 'Community approvers');
    assertThreshold(payload.approvalThreshold, approverIds.length, 'Community');
    fund.policy = {stewardId: payload.stewardId, approverIds, approvalThreshold: payload.approvalThreshold};
    fund.pendingHandoff = null;
    for (const proposal of Object.values(fund.proposals)) {
      if (proposal.status === 'open') proposal.approvedBy = proposal.approvedBy.filter(id => approverIds.includes(id));
    }
    return state;
  }
  const policy = fund.policy;
  if (!policy) throw new Error('Community roles and threshold must be set first.');
  if (event.eventType === 'COMMUNITY_CONTRIBUTION_RECORDED') {
    const payload = event.payload as {contributionId: string; amount: MoneyV1; referenceHash: string};
    requiredId(payload.contributionId, 'Community contribution');
    requiredDigest(payload.referenceHash, 'Community contribution reference');
    assertPositiveMoney(payload.amount, 'Community contribution');
    const existingContribution = Object.values(fund.contributions)[0];
    if (existingContribution) assertSameCurrency(existingContribution.amount, payload.amount, 'Community contribution');
    if (allCommunityReferences(fund).some(row => row.id === payload.contributionId || row.referenceHash === payload.referenceHash)) throw new Error('Community contribution is a duplicate.');
    fund.contributions[payload.contributionId] = {contributionId: payload.contributionId, contributorId: event.actorId, amount: cloneJson(payload.amount), referenceHash: payload.referenceHash, status: 'recorded'};
    return state;
  }
  if (event.eventType === 'COMMUNITY_CONTRIBUTION_RECEIVED') {
    const payload = event.payload as {contributionId: string};
    const contribution = fund.contributions[payload.contributionId];
    if (event.actorId !== policy.stewardId || !contribution || contribution.status !== 'recorded') throw new Error('Only the steward may confirm a recorded community contribution.');
    contribution.status = 'received';
    return state;
  }
  if (event.eventType === 'COMMUNITY_PROPOSAL_CREATED') {
    const payload = event.payload as {proposalId: string; recipientId: string; summary: string; purposeDigest: string; amount: MoneyV1; expiresAt: string};
    requiredId(payload.proposalId, 'Community proposal');
    requireMember(payload.recipientId, context.members, 'Community proposal recipient');
    requiredText(payload.summary, 'Community proposal');
    requiredDigest(payload.purposeDigest, 'Community proposal purpose');
    assertPositiveMoney(payload.amount, 'Community proposal amount');
    assertIso(payload.expiresAt, 'Community proposal expiry');
    if (Date.parse(payload.expiresAt) <= Date.parse(event.occurredAt)) throw new Error('Community proposal expiry must be in the future.');
    if (fund.proposals[payload.proposalId]) throw new Error('Community proposal identifier is a duplicate.');
    assertCommunityAvailable(fund, payload.amount);
    fund.proposals[payload.proposalId] = {
      proposalId: payload.proposalId,
      proposerId: event.actorId,
      recipientId: payload.recipientId,
      summary: payload.summary.trim(),
      purposeDigest: payload.purposeDigest,
      amount: cloneJson(payload.amount),
      expiresAt: payload.expiresAt,
      revision: 1,
      approvedBy: [],
      status: 'open',
      release: null,
    };
    return state;
  }
  if (event.eventType === 'COMMUNITY_STEWARD_HANDOFF_PROPOSED') {
    const payload = event.payload as {handoffId: string; nextStewardId: string};
    if (event.actorId !== policy.stewardId || fund.pendingHandoff) throw new Error('Only the current steward may propose one handoff.');
    requiredId(payload.handoffId, 'Community handoff');
    requireMember(payload.nextStewardId, context.members, 'Next community steward');
    if (payload.nextStewardId === policy.stewardId) throw new Error('Community steward handoff must name another member.');
    fund.pendingHandoff = {handoffId: payload.handoffId, fromStewardId: policy.stewardId, nextStewardId: payload.nextStewardId};
    return state;
  }
  if (event.eventType === 'COMMUNITY_STEWARD_HANDOFF_ACCEPTED') {
    const payload = event.payload as {handoffId: string};
    const handoff = fund.pendingHandoff;
    if (!handoff || handoff.handoffId !== payload.handoffId || event.actorId !== handoff.nextStewardId) throw new Error('Only the named next steward may accept this handoff.');
    policy.stewardId = event.actorId;
    fund.pendingHandoff = null;
    return state;
  }
  if (event.eventType === 'COMMUNITY_REPORT_ADDED') {
    const payload = event.payload as {reportId: string; summary: string; reportDigest: string; periodStart: string; periodEnd: string};
    if (event.actorId !== policy.stewardId) throw new Error('Only the current steward may add a community report.');
    requiredId(payload.reportId, 'Community report');
    requiredText(payload.summary, 'Community report');
    requiredDigest(payload.reportDigest, 'Community report');
    assertIso(payload.periodStart, 'Community report start');
    assertIso(payload.periodEnd, 'Community report end');
    if (Date.parse(payload.periodEnd) < Date.parse(payload.periodStart)) throw new Error('Community report period is invalid.');
    if (fund.reports.some(row => row.reportId === payload.reportId)) throw new Error('Community report identifier is a duplicate.');
    fund.reports.push({...payload, eventId: event.eventId});
    return state;
  }
  if (event.eventType === 'COMMUNITY_FUND_CLOSED') {
    const payload = event.payload as {recordId: string};
    if (event.actorId !== policy.stewardId) throw new Error('Only the current steward may close the community fund.');
    if (fund.pendingHandoff) throw new Error('Finish the steward handoff before closing the community fund.');
    if (Object.values(fund.contributions).some(row => row.status !== 'received')) throw new Error('Confirm every recorded contribution before closing the community fund.');
    if (Object.values(fund.proposals).some(row => !['confirmed', 'rejected', 'expired'].includes(row.status))) {
      throw new Error('Resolve every community proposal before closing the fund.');
    }
    requiredId(payload.recordId, 'Community fund record');
    fund.closedRecordId = payload.recordId;
    return state;
  }
  const proposalPayload = event.payload as {proposalId: string};
  const proposal = fund.proposals[proposalPayload.proposalId];
  if (!proposal) throw new Error('Community proposal is missing.');
  if (event.eventType === 'COMMUNITY_PROPOSAL_AMENDED') {
    const payload = event.payload as {summary: string; purposeDigest: string; amount: MoneyV1; expiresAt: string};
    if (event.actorId !== proposal.proposerId || proposal.status !== 'open') throw new Error('Only the proposer may amend an open community proposal.');
    requiredText(payload.summary, 'Community proposal');
    requiredDigest(payload.purposeDigest, 'Community proposal purpose');
    assertPositiveMoney(payload.amount, 'Community proposal amount');
    assertIso(payload.expiresAt, 'Community proposal expiry');
    if (Date.parse(payload.expiresAt) <= Date.parse(event.occurredAt)) throw new Error('Community proposal expiry must be in the future.');
    assertCommunityAvailable(fund, payload.amount);
    proposal.summary = payload.summary.trim();
    proposal.purposeDigest = payload.purposeDigest;
    proposal.amount = cloneJson(payload.amount);
    proposal.expiresAt = payload.expiresAt;
    proposal.revision += 1;
    proposal.approvedBy = [];
    return state;
  }
  if (event.eventType === 'COMMUNITY_PROPOSAL_APPROVED') {
    if (!policy.approverIds.includes(event.actorId) || proposal.status !== 'open') throw new Error('Only a named approver may approve an open community proposal.');
    if (Date.parse(event.occurredAt) >= Date.parse(proposal.expiresAt)) throw new Error('An expired community proposal cannot be approved.');
    if (proposal.approvedBy.includes(event.actorId)) throw new Error('Community approval is a duplicate.');
    proposal.approvedBy.push(event.actorId);
    proposal.approvedBy.sort();
    if (proposal.approvedBy.length >= policy.approvalThreshold) proposal.status = 'approved';
    return state;
  }
  if (event.eventType === 'COMMUNITY_PROPOSAL_REJECTED') {
    const payload = event.payload as {reasonDigest: string};
    if (!policy.approverIds.includes(event.actorId) || proposal.status !== 'open') throw new Error('Only a named approver may reject an open community proposal.');
    requiredDigest(payload.reasonDigest, 'Community rejection reason');
    proposal.status = 'rejected';
    proposal.rejectionReasonDigest = payload.reasonDigest;
    return state;
  }
  if (event.eventType === 'COMMUNITY_PROPOSAL_EXPIRED') {
    if (proposal.status !== 'open' || Date.parse(event.occurredAt) < Date.parse(proposal.expiresAt)) throw new Error('Community proposal is not expired.');
    proposal.status = 'expired';
    return state;
  }
  if (event.eventType === 'COMMUNITY_RELEASE_RECORDED') {
    const payload = event.payload as {releaseId: string; amount: MoneyV1; referenceHash: string};
    if (event.actorId !== policy.stewardId || proposal.status !== 'approved' || proposal.release) throw new Error('Only the steward may record one threshold-approved community release.');
    requiredId(payload.releaseId, 'Community release');
    requiredDigest(payload.referenceHash, 'Community release reference');
    if (allCommunityReferences(fund).some(row => row.id === payload.releaseId || row.referenceHash === payload.referenceHash)) throw new Error('Community release reference is a duplicate.');
    if (!moneyEquals(payload.amount, proposal.amount)) throw new Error('Community release must match the approved proposal amount exactly.');
    assertCommunityAvailable(fund, payload.amount);
    proposal.release = {releaseId: payload.releaseId, amount: cloneJson(payload.amount), referenceHash: payload.referenceHash};
    proposal.status = 'released';
    return state;
  }
  const payload = event.payload as {releaseId: string};
  if (event.actorId !== proposal.recipientId || proposal.status !== 'released' || proposal.release?.releaseId !== payload.releaseId) {
    throw new Error('Only the proposal recipient may confirm this community release.');
  }
  proposal.status = 'confirmed';
  return state;
}

export interface AppliedCanonicalExpenseCorrectionV1 {
  expenseId: string;
  correctionEventId: string;
  reason: string;
  total: MoneyV1;
}

/**
 * Complete the recoverable second half of a Spend Card adjustment. The money
 * kernel calls this only after the canonical expense correction itself has
 * passed actor, conservation, frontier, and signature validation.
 */
export function applyCanonicalExpenseCorrectionToModeStateV1(
  state: CanonicalModeStateV1 | undefined,
  correction: AppliedCanonicalExpenseCorrectionV1,
): CanonicalModeStateV1 | undefined {
  if (!state?.spendCard) return state;
  const next = cloneJson(state);
  const transaction = Object.values(next.spendCard!.transactions).find(row => row.pendingExpenseCorrection?.expenseId === correction.expenseId);
  const pending = transaction?.pendingExpenseCorrection;
  if (!transaction || !pending || correction.reason !== pending.correctionReason) return next;
  if (!moneyEquals(correction.total, pending.nextTotal)) throw new Error('Spend Card expense correction does not match the pending adjustment total.');
  if (transaction.completedExpenseCorrections.some(row => row.adjustmentId === pending.adjustmentId || row.correctionEventId === correction.correctionEventId)) {
    throw new Error('Spend Card expense correction is a duplicate.');
  }
  transaction.completedExpenseCorrections.push({
    adjustmentId: pending.adjustmentId,
    expenseId: pending.expenseId,
    correctionEventId: correction.correctionEventId,
    total: cloneJson(correction.total),
  });
  transaction.pendingExpenseCorrection = null;
  return next;
}

export function hasOutstandingModeWorkV1(state: CanonicalModeStateV1 | undefined): boolean {
  return Object.values(state?.spendCard?.transactions ?? {}).some(transaction => Boolean(transaction.pendingExpenseCorrection)
    || transaction.settledAdjustmentFollowUps.some(row => row.confirmedBy.length !== row.requiredConfirmationIds.length));
}

export interface RedactedModeRecordV1 {
  v: 1;
  mode: ModeWorkflowGroupModeV1;
  summary: unknown;
}

/** Minimum-disclosure history. No external references, reason digests, receipt digests, or request-specific recipients leave the encrypted group record. */
export function createRedactedModeRecordV1(mode: ModeWorkflowGroupModeV1, state: CanonicalModeStateV1 | undefined): RedactedModeRecordV1 {
  if (mode === 'spend_card') return {v: 1, mode, summary: {complete: !hasOutstandingModeWorkV1(state), transactions: Object.values(state?.spendCard?.transactions ?? {}).sort((left, right) => left.transactionId.localeCompare(right.transactionId)).map((row, index) => ({transactionNumber: index + 1, total: row.total, remaining: row.remaining, receiptOutcome: row.receipt?.outcome ?? 'missing', adjustmentKinds: row.adjustments.map(value => value.kind), expenseCorrectionPending: Boolean(row.pendingExpenseCorrection), settledFollowUpsPending: row.settledAdjustmentFollowUps.filter(value => value.confirmedBy.length !== value.requiredConfirmationIds.length).length}))}};
  if (mode === 'savings_circle') return {v: 1, mode, summary: {rulesAccepted: state?.savingsCircle?.rules?.acceptedBy.length ?? 0, completedRounds: state?.savingsCircle?.completedRounds.length ?? 0, activeRoundSequence: state?.savingsCircle?.activeRound?.sequence ?? null, closed: Boolean(state?.savingsCircle?.closedRecordId)}};
  if (mode === 'emergency_pot') return {v: 1, mode, summary: Object.values(state?.emergencyPot?.requests ?? {}).sort((left, right) => left.requestId.localeCompare(right.requestId)).map((row, index) => ({requestNumber: index + 1, target: row.target, contributionCount: Object.keys(row.contributions).length, approvalCount: row.approvedBy.length, releaseStatus: row.release?.status ?? 'not_released', correctedReleaseCount: row.releaseHistory.length, closed: Boolean(row.closedRecordId)}))};
  if (mode === 'community_fund') return {v: 1, mode, summary: {contributionCount: Object.keys(state?.communityFund?.contributions ?? {}).length, proposals: Object.values(state?.communityFund?.proposals ?? {}).sort((left, right) => left.proposalId.localeCompare(right.proposalId)).map((row, index) => ({proposalNumber: index + 1, summary: row.summary, amount: row.amount, status: row.status, approvalCount: row.approvedBy.length})), reports: (state?.communityFund?.reports ?? []).map(row => row.summary), closed: Boolean(state?.communityFund?.closedRecordId)}};
  return {v: 1, mode, summary: null};
}

function newCircleRound(roundId: string, sequence: number, recipientId: string, dueAt: string): SavingsCircleRoundV1 {
  return {roundId, sequence, recipientId, dueAt, contributions: {}, exitedParticipantIds: [], payout: null};
}

function allCircleContributions(circle: NonNullable<CanonicalModeStateV1['savingsCircle']>): SavingsCircleContributionV1[] {
  return [...circle.completedRounds, ...(circle.activeRound ? [circle.activeRound] : [])].flatMap(round => Object.values(round.contributions));
}

function allCirclePayouts(circle: NonNullable<CanonicalModeStateV1['savingsCircle']>): Array<NonNullable<SavingsCircleRoundV1['payout']>> {
  return [...circle.completedRounds, ...(circle.activeRound ? [circle.activeRound] : [])].flatMap(round => round.payout ? [round.payout] : []);
}

function allEmergencyReferences(emergency: NonNullable<CanonicalModeStateV1['emergencyPot']>): Array<{id: string; referenceHash: string}> {
  return Object.values(emergency.requests).flatMap(request => [
    ...Object.values(request.contributions).map(row => ({id: row.contributionId, referenceHash: row.referenceHash})),
    ...(request.release ? [{id: request.release.releaseId, referenceHash: request.release.referenceHash}] : []),
    ...request.releaseHistory.map(row => ({id: row.releaseId, referenceHash: row.referenceHash})),
  ]);
}

function allCommunityReferences(fund: NonNullable<CanonicalModeStateV1['communityFund']>): Array<{id: string; referenceHash: string}> {
  return [
    ...Object.values(fund.contributions).map(row => ({id: row.contributionId, referenceHash: row.referenceHash})),
    ...Object.values(fund.proposals).flatMap(row => row.release ? [{id: row.release.releaseId, referenceHash: row.release.referenceHash}] : []),
  ];
}

function assertCommunityAvailable(fund: NonNullable<CanonicalModeStateV1['communityFund']>, amount: MoneyV1): void {
  assertPositiveMoney(amount, 'Community amount');
  const received = Object.values(fund.contributions).filter(row => row.status === 'received').map(row => row.amount);
  const released = Object.values(fund.proposals).filter(row => row.release).map(row => row.release!.amount);
  const available = sumMoney(received, amount);
  const spent = sumMoney(released, amount);
  if (BigInt(amount.minorUnits) > BigInt(available.minorUnits) - BigInt(spent.minorUnits)) throw new Error('Community proposal exceeds recorded available contributions.');
}

function sumMoney(values: MoneyV1[], partition: MoneyV1): MoneyV1 {
  return values.reduce((sum, value) => {
    assertSameCurrency(partition, value, 'Money total');
    return addMoney(sum, value);
  }, moneyFromMinorUnits(0n, partition.currency, partition.exponent));
}

function proportionalAllocations(current: MoneyAllocationV1[], adjustment: MoneyV1): MoneyAllocationV1[] {
  if (current.length === 0) throw new Error('The linked expense has no canonical shares for a settled adjustment follow-up.');
  for (const row of current) assertSameCurrency(adjustment, row.amount, 'Settled adjustment allocation');
  const currentTotal = current.reduce((total, row) => total + BigInt(row.amount.minorUnits), 0n);
  if (currentTotal <= 0n) throw new Error('The linked expense has no positive canonical shares for a settled adjustment follow-up.');
  const target = BigInt(adjustment.minorUnits);
  const rows = [...current]
    .sort((left, right) => left.participantId.localeCompare(right.participantId))
    .map(row => {
      const scaled = target * BigInt(row.amount.minorUnits);
      return {participantId: row.participantId, minorUnits: scaled / currentTotal, remainder: scaled % currentTotal};
    });
  let undistributed = target - rows.reduce((total, row) => total + row.minorUnits, 0n);
  for (const row of [...rows].sort((left, right) => left.remainder === right.remainder
    ? left.participantId.localeCompare(right.participantId)
    : left.remainder > right.remainder ? -1 : 1)) {
    if (undistributed === 0n) break;
    row.minorUnits += 1n;
    undistributed -= 1n;
  }
  return rows.map(row => ({participantId: row.participantId, amount: moneyFromMinorUnits(row.minorUnits, adjustment.currency, adjustment.exponent)}));
}

function assertPositiveMoney(value: MoneyV1, label: string): void {
  assertMoney(value);
  if (BigInt(value.minorUnits) <= 0n) throw new Error(`${label} must be positive.`);
}

function assertSameCurrency(left: MoneyV1, right: MoneyV1, label: string): void {
  assertMoney(left);
  assertMoney(right);
  if (left.currency !== right.currency || left.exponent !== right.exponent) throw new Error(`${label} currency partition does not match.`);
}

function assertIso(value: string, label: string): void {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) throw new Error(`${label} is invalid.`);
}

function requiredId(value: string, label: string): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized || value !== normalized || normalized.length > 128 || !/^[0-9a-z:_-]+$/iu.test(normalized)) throw new Error(`${label} identifier is invalid.`);
  return normalized;
}

function requiredText(value: string, label: string): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized || normalized.length > 160) throw new Error(`${label} is invalid.`);
  return normalized;
}

function spendCorrectionReason(transactionId: string, adjustmentId: string): string {
  return `spend-adjustment:${transactionId}:${adjustmentId}`;
}

function requiredDigest(value: string, label: string): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (value !== normalized || !/^0x[0-9a-f]{64}$/u.test(normalized)) throw new Error(`${label} digest is invalid.`);
  return normalized;
}

function requireMember(participantId: string, members: Record<string, ModeWorkflowMemberV1>, label: string): void {
  if (!participantId?.trim() || !members[participantId]) throw new Error(`${label} is not a group member.`);
}

function requireInactiveMember(participantId: string, members: Record<string, ModeWorkflowMemberV1>, label: string): void {
  if (!participantId?.trim() || !members[participantId] || members[participantId].active !== false) {
    throw new Error(`${label} must be a canonically removed group member.`);
  }
}

function requireActiveMember(participantId: string, members: Record<string, ModeWorkflowMemberV1>, label: string): void {
  const member = members[participantId];
  if (!participantId?.trim() || !member || member.active === false) {
    throw new Error(`${label} must be an active group member.`);
  }
}

function requireActiveAcceptedMember(participantId: string, members: Record<string, ModeWorkflowMemberV1>, label: string): void {
  const member = members[participantId];
  if (!participantId?.trim() || !member || member.active === false || !member.acceptedAt || Number.isNaN(Date.parse(member.acceptedAt))) {
    throw new Error(`${label} must hold active accepted membership.`);
  }
}

function uniqueMembers(participantIds: string[], members: Record<string, ModeWorkflowMemberV1>, label: string): string[] {
  if (!Array.isArray(participantIds) || participantIds.length === 0) throw new Error(`${label} are required.`);
  const normalized = participantIds.map(value => value.trim());
  if (normalized.some(value => !members[value]) || new Set(normalized).size !== normalized.length) throw new Error(`${label} must name distinct group members.`);
  return normalized;
}

function uniqueActiveMembers(participantIds: string[], members: Record<string, ModeWorkflowMemberV1>, label: string): string[] {
  const normalized = uniqueMembers(participantIds, members, label);
  if (normalized.some(id => members[id].active === false)) throw new Error(`${label} must contain active group members only.`);
  return normalized;
}

function assertThreshold(value: number, roleCount: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 1 || value > roleCount) throw new Error(`${label} approval threshold is invalid.`);
}
