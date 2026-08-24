import assert from 'node:assert/strict';
import test from 'node:test';
import type {CanonicalGroupStateV1} from '../core/moneyEventKernel.ts';
import {initialModeStateV1, MODE_WORKFLOW_EVENT_TYPES_V1} from '../core/modeWorkflows.ts';
import {moneyFromMinorUnits} from '../core/money.ts';
import {allModeEventsHaveUiLabels, deriveNamedModeWorkspace, MODE_UI_EVENT_LABELS, proportionalExpenseAllocations} from './NamedModeWorkspace.tsx';

const money = (minorUnits: number) => moneyFromMinorUnits(BigInt(minorUnits), 'CHF', 2);

test('every signed named-mode event has a normal-language UI action without forbidden product jargon', () => {
  assert.equal(allModeEventsHaveUiLabels(), true);
  assert.deepEqual(Object.keys(MODE_UI_EVENT_LABELS).sort(), [...MODE_WORKFLOW_EVENT_TYPES_V1].sort());
  const visible = Object.values(MODE_UI_EVENT_LABELS).join(' ').toLowerCase();
  for (const forbidden of ['evidence', 'rail', 'claim', 'kernel', 'adapter', 'obligation', 'chapter', 'test-token', 'raw json', 'protocol', 'settlement', 'native', 'host', 'state machine']) {
    assert.equal(visible.includes(forbidden), false, `unexpected visible word: ${forbidden}`);
  }
});

test('Spend Card moves from purchase to receipt review to the ordinary split path', () => {
  const state = group('spend_card');
  assert.equal(deriveNamedModeWorkspace(state, 'mina', now()).primary?.key, 'SPEND_TRANSACTION_IMPORTED');
  state.modeState!.spendCard!.transactions.tx = {
    transactionId: 'tx', cardholderId: 'mina', transactionReferenceHash: digest('1'), merchantLabel: 'Gusto', total: money(1200), transactedAt: now().toISOString(), receipt: null, linkedExpenseId: null, pendingExpenseCorrection: null, completedExpenseCorrections: [], settledAdjustmentFollowUps: [], adjustments: [], remaining: money(1200),
  };
  assert.equal(deriveNamedModeWorkspace(state, 'mina', now()).primary?.key, 'SPEND_RECEIPT_REVIEWED');
  state.modeState!.spendCard!.transactions.tx.receipt = {receiptId: 'receipt', receiptDigest: digest('2'), reviewedTotal: money(1200), outcome: 'matched', eventId: 'receipt-event'};
  assert.equal(deriveNamedModeWorkspace(state, 'mina', now()).primary?.key, 'SPEND_SPLIT_PURCHASE');
  state.expenses.expense = {expenseId: 'expense', description: 'Gusto', paidBy: 'mina', originalTotal: money(1200), total: money(1200), revisions: []};
  assert.equal(deriveNamedModeWorkspace(state, 'mina', now()).primary?.key, 'SPEND_TRANSACTION_LINKED');
  state.modeState!.spendCard!.transactions.tx.linkedExpenseId = 'expense';
  assert.equal(deriveNamedModeWorkspace(state, 'mina', now()).primary?.key, 'OPEN_GROUP_PAYMENTS');
  state.shares.one = {shareId: 'one', expenseId: 'expense', participantId: 'mina', originalAmount: money(401), amount: money(401), status: 'open', adjustments: []};
  state.shares.two = {shareId: 'two', expenseId: 'expense', participantId: 'leo', originalAmount: money(399), amount: money(399), status: 'open', adjustments: []};
  state.modeState!.spendCard!.transactions.tx.pendingExpenseCorrection = {adjustmentId: 'refund', expenseId: 'expense', previousTotal: money(800), nextTotal: money(600), correctionReason: 'spend-adjustment:tx:refund'};
  assert.equal(deriveNamedModeWorkspace(state, 'mina', now()).primary?.key, 'SPEND_APPLY_EXPENSE_CORRECTION');
  assert.deepEqual(proportionalExpenseAllocations(state, 'expense', money(600)).map(row => [row.participantId, row.amount.minorUnits]), [['leo', '299'], ['mina', '301']]);
});

test('settled Spend adjustment asks each affected participant for one exact follow-up confirmation', () => {
  const state = group('spend_card');
  state.modeState!.spendCard!.transactions.tx = {
    transactionId: 'tx', cardholderId: 'mina', transactionReferenceHash: digest('1'), merchantLabel: 'Dinner', total: money(900), transactedAt: now().toISOString(),
    receipt: {receiptId: 'receipt', receiptDigest: digest('2'), reviewedTotal: money(900), outcome: 'matched', eventId: 'receipt-event'}, linkedExpenseId: 'expense', pendingExpenseCorrection: null, completedExpenseCorrections: [], adjustments: [{adjustmentId: 'refund', kind: 'refund', referenceHash: digest('3'), reasonDigest: digest('4'), amount: money(300), eventId: 'refund-event'}], remaining: money(600),
    settledAdjustmentFollowUps: [{adjustmentId: 'refund', expenseId: 'expense', kind: 'refund', amount: money(300), reasonDigest: digest('4'), referenceHash: digest('3'), allocations: [{participantId: 'leo', amount: money(100)}, {participantId: 'mina', amount: money(100)}, {participantId: 'nina', amount: money(100)}], requiredConfirmationIds: ['leo', 'nina'], confirmedBy: []}],
  };
  assert.equal(deriveNamedModeWorkspace(state, 'leo', now()).primary?.key, 'SPEND_SETTLED_ADJUSTMENT_CONFIRMED');
  assert.equal(deriveNamedModeWorkspace(state, 'mina', now()).primary, null);
  state.modeState!.spendCard!.transactions.tx.settledAdjustmentFollowUps[0].confirmedBy.push({participantId: 'leo', amount: money(100), resolutionReferenceHash: digest('5'), eventId: 'confirm-leo'});
  assert.equal(deriveNamedModeWorkspace(state, 'nina', now()).primary?.key, 'SPEND_SETTLED_ADJUSTMENT_CONFIRMED');
});

test('removed mode role holders surface explicit recovery successors before ordinary work', () => {
  const circle = group('savings_circle');
  circle.modeState!.savingsCircle!.rules = {rulesId: 'rules', participantOrder: ['mina', 'leo', 'nina'], contribution: money(10000), dueEveryDays: 30, acceptedBy: ['mina', 'leo', 'nina']};
  circle.modeState!.savingsCircle!.activeRound = {roundId: 'round', sequence: 1, recipientId: 'mina', dueAt: '2026-08-24T12:00:00.000Z', contributions: {}, exitedParticipantIds: [], payout: null};
  circle.members.leo.active = false;
  circle.members.noah = {participantId: 'noah', accountPublicKeyHex: `0x${'44'.repeat(32)}`, role: 'member', active: true, acceptedAt: '2026-08-23T11:00:00.000Z'};
  assert.equal(deriveNamedModeWorkspace(circle, 'mina', now()).primary?.key, 'CIRCLE_PARTICIPANT_EXITED');
  circle.modeState!.savingsCircle!.activeRound.exitedParticipantIds.push('leo');
  assert.equal(deriveNamedModeWorkspace(circle, 'mina', now()).primary?.key, 'CIRCLE_PARTICIPANT_REPLACED');

  const emergency = group('emergency_pot');
  emergency.modeState!.emergencyPot!.policy = {trustedApproverIds: ['mina', 'leo'], approvalThreshold: 2};
  emergency.members.leo.active = false;
  assert.equal(deriveNamedModeWorkspace(emergency, 'mina', now()).primary?.key, 'EMERGENCY_POLICY_RECONCILED');

  const community = group('community_fund');
  community.modeState!.communityFund!.policy = {stewardId: 'leo', approverIds: ['leo', 'nina'], approvalThreshold: 2};
  community.members.leo.active = false;
  assert.equal(deriveNamedModeWorkspace(community, 'mina', now()).primary?.key, 'COMMUNITY_POLICY_RECONCILED');
});

test('disputed emergency release and resolved community fund expose bounded successor actions', () => {
  const emergency = group('emergency_pot');
  emergency.modeState!.emergencyPot!.policy = {trustedApproverIds: ['mina', 'leo'], approvalThreshold: 2};
  emergency.modeState!.emergencyPot!.requests.help = {requestId: 'help', requesterId: 'leo', recipientId: 'nina', reasonDigest: digest('c'), target: money(10000), contributions: {}, approvedBy: ['mina', 'leo'], release: {releaseId: 'release', amount: money(10000), referenceHash: digest('d'), status: 'disputed'}, releaseHistory: [], correctionApprovedBy: [], closedRecordId: null};
  assert.equal(deriveNamedModeWorkspace(emergency, 'mina', now()).primary?.key, 'EMERGENCY_CORRECTION_APPROVED');
  emergency.modeState!.emergencyPot!.requests.help.correctionApprovedBy = ['mina', 'leo'];
  assert.equal(deriveNamedModeWorkspace(emergency, 'mina', now()).primary?.key, 'EMERGENCY_RELEASE_CORRECTED');

  const community = group('community_fund');
  community.modeState!.communityFund!.policy = {stewardId: 'mina', approverIds: ['mina', 'leo'], approvalThreshold: 2};
  community.modeState!.communityFund!.contributions.one = {contributionId: 'one', contributorId: 'nina', amount: money(10000), referenceHash: digest('e'), status: 'received'};
  community.modeState!.communityFund!.proposals.one = {proposalId: 'one', proposerId: 'leo', recipientId: 'nina', summary: 'Done', purposeDigest: digest('f'), amount: money(10000), expiresAt: '2026-08-24T12:00:00.000Z', revision: 1, approvedBy: ['mina', 'leo'], status: 'confirmed', release: {releaseId: 'paid', amount: money(10000), referenceHash: digest('1')}};
  assert.equal(deriveNamedModeWorkspace(community, 'mina', now()).primary?.key, 'COMMUNITY_FUND_CLOSED');
  community.modeState!.communityFund!.closedRecordId = 'record';
  assert.equal(deriveNamedModeWorkspace(community, 'mina', now()).primary, null);
});

test('savings-circle next action follows actor authority through acceptance, contribution, receipt, and one advance', () => {
  const state = group('savings_circle');
  state.modeState!.savingsCircle!.rules = {rulesId: 'rules', participantOrder: ['mina', 'leo', 'nina'], contribution: money(10000), dueEveryDays: 30, acceptedBy: ['mina']};
  assert.equal(deriveNamedModeWorkspace(state, 'leo', now()).primary?.key, 'CIRCLE_RULES_ACCEPTED');
  state.modeState!.savingsCircle!.rules!.acceptedBy = ['leo', 'mina', 'nina'];
  state.modeState!.savingsCircle!.activeRound = {roundId: 'round', sequence: 1, recipientId: 'mina', dueAt: '2026-08-24T12:00:00.000Z', contributions: {}, exitedParticipantIds: [], payout: null};
  assert.equal(deriveNamedModeWorkspace(state, 'leo', now()).primary?.key, 'CIRCLE_CONTRIBUTION_RECORDED');
  state.modeState!.savingsCircle!.activeRound!.contributions.leo = {contributionId: 'leo', participantId: 'leo', amount: money(10000), referenceHash: digest('3'), status: 'recorded', corrections: []};
  assert.equal(deriveNamedModeWorkspace(state, 'mina', now()).primary?.key, 'CIRCLE_CONTRIBUTION_RECEIVED');
  state.modeState!.savingsCircle!.activeRound!.contributions.leo.status = 'received';
  state.modeState!.savingsCircle!.activeRound!.contributions.nina = {contributionId: 'nina', participantId: 'nina', amount: money(10000), referenceHash: digest('4'), status: 'received', corrections: []};
  state.modeState!.savingsCircle!.activeRound!.payout = {payoutId: 'payout', amount: money(20000), referenceHash: digest('5'), recordedBy: 'mina', status: 'confirmed'};
  assert.equal(deriveNamedModeWorkspace(state, 'mina', now()).primary?.key, 'CIRCLE_ROUND_ADVANCED');
});

test('emergency and community workspaces never let organizer display bypass threshold or recipient confirmation', () => {
  const emergency = group('emergency_pot');
  emergency.modeState!.emergencyPot!.policy = {trustedApproverIds: ['mina', 'leo'], approvalThreshold: 2};
  emergency.modeState!.emergencyPot!.requests.help = {requestId: 'help', requesterId: 'leo', recipientId: 'nina', reasonDigest: digest('6'), target: money(10000), contributions: {}, approvedBy: ['mina'], release: null, releaseHistory: [], correctionApprovedBy: [], closedRecordId: null};
  assert.equal(deriveNamedModeWorkspace(emergency, 'mina', now()).primary?.key, 'EMERGENCY_CONTRIBUTION_RECORDED');
  assert.equal(deriveNamedModeWorkspace(emergency, 'leo', now()).primary?.key, 'EMERGENCY_REQUEST_APPROVED');
  emergency.modeState!.emergencyPot!.requests.help.approvedBy.push('leo');
  emergency.modeState!.emergencyPot!.requests.help.contributions.one = {contributionId: 'one', contributorId: 'leo', amount: money(10000), referenceHash: digest('7'), status: 'received'};
  assert.equal(deriveNamedModeWorkspace(emergency, 'mina', now()).primary?.key, 'EMERGENCY_RELEASE_RECORDED');
  emergency.modeState!.emergencyPot!.requests.help.release = {releaseId: 'release', amount: money(10000), referenceHash: digest('8'), status: 'recorded'};
  assert.equal(deriveNamedModeWorkspace(emergency, 'nina', now()).primary?.key, 'EMERGENCY_RELEASE_CONFIRMED');
  assert.equal(deriveNamedModeWorkspace(emergency, 'mina', now()).primary, null);

  const community = group('community_fund');
  community.modeState!.communityFund!.policy = {stewardId: 'mina', approverIds: ['mina', 'leo'], approvalThreshold: 2};
  community.modeState!.communityFund!.contributions.one = {contributionId: 'one', contributorId: 'nina', amount: money(10000), referenceHash: digest('9'), status: 'received'};
  community.modeState!.communityFund!.proposals.one = {proposalId: 'one', proposerId: 'leo', recipientId: 'nina', summary: 'Repair the garden', purposeDigest: digest('a'), amount: money(10000), expiresAt: '2026-08-24T12:00:00.000Z', revision: 1, approvedBy: ['mina'], status: 'open', release: null};
  assert.equal(deriveNamedModeWorkspace(community, 'leo', now()).primary?.key, 'COMMUNITY_PROPOSAL_APPROVED');
  community.modeState!.communityFund!.proposals.one.approvedBy.push('leo');
  community.modeState!.communityFund!.proposals.one.status = 'approved';
  assert.equal(deriveNamedModeWorkspace(community, 'mina', now()).primary?.key, 'COMMUNITY_RELEASE_RECORDED');
  community.modeState!.communityFund!.proposals.one.release = {releaseId: 'release', amount: money(10000), referenceHash: digest('b')};
  community.modeState!.communityFund!.proposals.one.status = 'released';
  assert.equal(deriveNamedModeWorkspace(community, 'nina', now()).primary?.key, 'COMMUNITY_RELEASE_CONFIRMED');
});

function group(mode: NonNullable<CanonicalGroupStateV1['mode']>): CanonicalGroupStateV1 {
  return {
    v: 1,
    groupId: `g-${mode}`,
    name: mode,
    mode,
    version: 1,
    currentEventId: 'created',
    organizerId: 'mina',
    groupKeyVersion: 1,
    members: {
      mina: {participantId: 'mina', accountPublicKeyHex: `0x${'11'.repeat(32)}`, role: 'organizer', active: true},
      leo: {participantId: 'leo', accountPublicKeyHex: `0x${'22'.repeat(32)}`, role: 'member', active: true},
      nina: {participantId: 'nina', accountPublicKeyHex: `0x${'33'.repeat(32)}`, role: 'member', active: true},
    },
    expenses: {}, shares: {}, closed: null, successorRecords: [], modeState: initialModeStateV1(mode), eventIds: ['created'],
  };
}

function digest(character: string): string { return `0x${character.repeat(64)}`; }
function now(): Date { return new Date('2026-08-23T12:00:00.000Z'); }
