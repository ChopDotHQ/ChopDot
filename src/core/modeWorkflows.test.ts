import assert from 'node:assert/strict';
import test from 'node:test';
import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign, sr25519Verify} from '@polkadot/util-crypto';
import {createCleanState} from '../state/store.ts';
import type {AppState, GroupMode} from '../types.ts';
import {
  ProductionAuthority,
  createCanonicalAuthorityEventEnvelope,
  type AuthorityIdentityResolver,
  type AuthorityJournalStore,
  type ModeAuthorityCommandV1,
  type PersistedAuthorityGroupV1,
} from './authority/productionAuthority.ts';
import {projectCanonicalEvents, type CanonicalSigner, type CanonicalVerifier} from './moneyEventKernel.ts';
import {createRedactedModeRecordV1} from './modeWorkflows.ts';
import type {ModeWorkflowEventTypeV1, ModeWorkflowPayloadByTypeV1} from './modeWorkflows.ts';
import {moneyFromMinorUnits, type MoneyV1} from './money.ts';

await cryptoWaitReady();

const pairs = {
  mina: sr25519PairFromSeed(new Uint8Array(32).fill(11)),
  leo: sr25519PairFromSeed(new Uint8Array(32).fill(22)),
  nina: sr25519PairFromSeed(new Uint8Array(32).fill(33)),
  noah: sr25519PairFromSeed(new Uint8Array(32).fill(44)),
};
const publicKey = (participantId: keyof typeof pairs) => `0x${Buffer.from(pairs[participantId].publicKey).toString('hex')}`;
const verify: CanonicalVerifier = async (bytes, signature, key) => sr25519Verify(bytes, signature, Buffer.from(key.slice(2), 'hex'));
const chf = (minorUnits: number): MoneyV1 => moneyFromMinorUnits(BigInt(minorUnits), 'CHF', 2);
const digest = (character: string) => `0x${character.repeat(64)}`;
const allocations = (minorUnits: [number, number, number]) => ['mina', 'leo', 'nina'].map((participantId, index) => ({participantId, amount: chf(minorUnits[index])}));
const requestAction = (splitId: string) => ({type: 'SEND_REQUEST' as const, payload: {splitId, requestId: `request-${splitId}`, createdAt: '2026-08-23T12:00:00.000Z', expiresAt: '2026-08-24T12:00:00.000Z', capabilityHash: `hash-${splitId}`}});

test('Spend Card imports, reviews mismatch, rejects duplicate receipts, and records bounded refund plus exact reversal', async () => {
  const kit = harness();
  let state = await createModeGroup(kit.authority, baseState(), 'g-card', 'spend_card');
  let result = await mode(kit.authority, state, 'mina', 'g-card', 'SPEND_TRANSACTION_IMPORTED', {
    transactionId: 'tx-1', transactionReferenceHash: digest('1'), merchantLabel: 'Corner shop', total: chf(1200), transactedAt: kit.now(),
  });
  state = result.state;
  result = await mode(kit.authority, state, 'mina', 'g-card', 'SPEND_RECEIPT_REVIEWED', {
    transactionId: 'tx-1', receiptId: 'receipt-1', receiptDigest: digest('2'), reviewedTotal: chf(1190),
  });
  state = result.state;
  assert.equal(result.canonicalState.modeState?.spendCard?.transactions['tx-1'].receipt?.outcome, 'mismatch');

  state = (await mode(kit.authority, state, 'mina', 'g-card', 'SPEND_TRANSACTION_IMPORTED', {
    transactionId: 'tx-2', transactionReferenceHash: digest('3'), merchantLabel: 'Train', total: chf(800), transactedAt: kit.now(),
  })).state;
  const beforeDuplicate = await kit.journal.read('g-card');
  await assert.rejects(mode(kit.authority, state, 'mina', 'g-card', 'SPEND_RECEIPT_REVIEWED', {
    transactionId: 'tx-2', receiptId: 'receipt-copy', receiptDigest: digest('2'), reviewedTotal: chf(800),
  }), /already matched/u);
  assert.equal((await kit.journal.read('g-card'))?.frontierHash, beforeDuplicate?.frontierHash);
  result = await mode(kit.authority, state, 'mina', 'g-card', 'SPEND_RECEIPT_REVIEWED', {
    transactionId: 'tx-2', receiptId: 'receipt-2', receiptDigest: digest('6'), reviewedTotal: chf(800),
  });
  state = result.state;
  assert.equal(result.canonicalState.modeState?.spendCard?.transactions['tx-2'].receipt?.outcome, 'matched');

  const beforeWrongActor = await kit.journal.read('g-card');
  await assert.rejects(mode(kit.authority, state, 'leo', 'g-card', 'SPEND_TRANSACTION_LINKED', {
    transactionId: 'tx-2', expenseId: 'expense-missing',
  }), /Only the cardholder/u);
  assert.equal((await kit.journal.read('g-card'))?.frontierHash, beforeWrongActor?.frontierHash);

  state = await addExpense(kit.authority, state, 'g-card', 'expense-mismatch', chf(700));
  const beforeMismatch = await kit.journal.read('g-card');
  await assert.rejects(mode(kit.authority, state, 'mina', 'g-card', 'SPEND_TRANSACTION_LINKED', {
    transactionId: 'tx-2', expenseId: 'expense-mismatch',
  }), /exactly match/u);
  assert.equal((await kit.journal.read('g-card'))?.frontierHash, beforeMismatch?.frontierHash);

  state = await addExpense(kit.authority, state, 'g-card', 'expense-tx-2', chf(800));
  result = await mode(kit.authority, state, 'mina', 'g-card', 'SPEND_TRANSACTION_LINKED', {
    transactionId: 'tx-2', expenseId: 'expense-tx-2',
  });
  state = result.state;
  assert.equal(result.canonicalState.modeState?.spendCard?.transactions['tx-2'].linkedExpenseId, 'expense-tx-2');
  const afterLink = await kit.journal.read('g-card');
  assert.ok(afterLink);
  const duplicate = await kit.authority.accept(state, createCanonicalAuthorityEventEnvelope(afterLink.events.at(-1)!));
  assert.equal(duplicate.outcome, 'duplicate');
  assert.equal(duplicate.frontierHash, afterLink.frontierHash);
  const reordered = await projectCanonicalEvents([...afterLink.events].reverse(), verify);
  assert.equal(reordered.stateHash, afterLink.stateHash);
  assert.equal(reordered.conflicts.length, 0);
  await assert.rejects(mode(kit.authority, state, 'mina', 'g-card', 'SPEND_TRANSACTION_LINKED', {
    transactionId: 'tx-2', expenseId: 'expense-tx-2',
  }), /already linked/u);

  state = (await mode(kit.authority, state, 'mina', 'g-card', 'SPEND_TRANSACTION_IMPORTED', {
    transactionId: 'tx-3', transactionReferenceHash: digest('a'), merchantLabel: 'Second train', total: chf(800), transactedAt: kit.now(),
  })).state;
  state = (await mode(kit.authority, state, 'mina', 'g-card', 'SPEND_RECEIPT_REVIEWED', {
    transactionId: 'tx-3', receiptId: 'receipt-3', receiptDigest: digest('b'), reviewedTotal: chf(800),
  })).state;
  await assert.rejects(mode(kit.authority, state, 'mina', 'g-card', 'SPEND_TRANSACTION_LINKED', {
    transactionId: 'tx-3', expenseId: 'expense-tx-2',
  }), /already linked to another/u);

  result = await mode(kit.authority, state, 'mina', 'g-card', 'SPEND_TRANSACTION_REFUNDED', {
    transactionId: 'tx-2', adjustmentId: 'refund-1', referenceHash: digest('4'), reasonDigest: digest('d'), amount: chf(200),
  });
  state = result.state;
  const pendingRefund = result.canonicalState.modeState?.spendCard?.transactions['tx-2'].pendingExpenseCorrection;
  assert.equal(pendingRefund?.nextTotal.minorUnits, '600');
  await assert.rejects(mode(kit.authority, state, 'mina', 'g-card', 'SPEND_TRANSACTION_REVERSED', {
    transactionId: 'tx-2', adjustmentId: 'reversal-too-soon', referenceHash: digest('5'), reasonDigest: digest('e'), amount: chf(600),
  }), /pending expense correction/u);
  const beforeWrongTotal = await kit.journal.read('g-card');
  await assert.rejects(kit.authority.appendExpenseCorrection(state, {
    groupId: 'g-card', expenseId: 'expense-tx-2', reason: pendingRefund!.correctionReason,
    total: chf(500), allocations: allocations([167, 167, 166]),
  }, 'mina'), /does not match the pending adjustment total/u);
  assert.equal((await kit.journal.read('g-card'))?.frontierHash, beforeWrongTotal?.frontierHash);

  result = await kit.authority.appendExpenseCorrection(state, {
    groupId: 'g-card', expenseId: 'expense-tx-2', reason: 'manual correction remains distinct',
    total: chf(600), allocations: allocations([200, 200, 200]),
  }, 'mina');
  state = result.state;
  assert.ok(result.canonicalState.modeState?.spendCard?.transactions['tx-2'].pendingExpenseCorrection);
  await assert.rejects(kit.authority.append(state, {type: 'SAVE_RECORD', payload: {recordId: 'blocked-record', groupId: 'g-card'}}, 'mina'), /pending Spend Card correction/u);

  result = await kit.authority.appendExpenseCorrection(state, {
    groupId: 'g-card', expenseId: 'expense-tx-2', reason: pendingRefund!.correctionReason,
    total: chf(600), allocations: allocations([200, 200, 200]),
  }, 'mina');
  state = result.state;
  assert.equal(result.canonicalState.modeState?.spendCard?.transactions['tx-2'].pendingExpenseCorrection, null);
  assert.equal(result.canonicalState.modeState?.spendCard?.transactions['tx-2'].completedExpenseCorrections.length, 1);

  result = await mode(kit.authority, state, 'mina', 'g-card', 'SPEND_TRANSACTION_REVERSED', {
    transactionId: 'tx-2', adjustmentId: 'reversal-1', referenceHash: digest('5'), reasonDigest: digest('f'), amount: chf(600),
  });
  state = result.state;
  const pendingReversal = result.canonicalState.modeState?.spendCard?.transactions['tx-2'].pendingExpenseCorrection;
  assert.equal(result.canonicalState.modeState?.spendCard?.transactions['tx-2'].remaining.minorUnits, '0');
  result = await kit.authority.appendExpenseCorrection(state, {
    groupId: 'g-card', expenseId: 'expense-tx-2', reason: pendingReversal!.correctionReason,
    total: chf(0), allocations: allocations([0, 0, 0]),
  }, 'mina');
  assert.equal(result.canonicalState.modeState?.spendCard?.transactions['tx-2'].pendingExpenseCorrection, null);
  await assert.rejects(mode(kit.authority, result.state, 'leo', 'g-card', 'SPEND_TRANSACTION_REFUNDED', {
    transactionId: 'tx-2', adjustmentId: 'refund-wrong-actor', referenceHash: digest('6'), reasonDigest: digest('a'), amount: chf(1),
  }), /Only the cardholder/u);
});

test('post-settlement Spend adjustment preserves prior shares and closes only after every affected participant confirms the exact successor', async () => {
  const kit = harness();
  let state = await createModeGroup(kit.authority, baseState(), 'g-card-settled', 'spend_card');
  state = (await mode(kit.authority, state, 'mina', 'g-card-settled', 'SPEND_TRANSACTION_IMPORTED', {transactionId: 'tx-settled', transactionReferenceHash: digest('1'), merchantLabel: 'Settled dinner', total: chf(900), transactedAt: kit.now()})).state;
  state = (await mode(kit.authority, state, 'mina', 'g-card-settled', 'SPEND_RECEIPT_REVIEWED', {transactionId: 'tx-settled', receiptId: 'receipt-settled', receiptDigest: digest('2'), reviewedTotal: chf(900)})).state;
  state = await addExpense(kit.authority, state, 'g-card-settled', 'expense-settled', chf(900));
  state = (await mode(kit.authority, state, 'mina', 'g-card-settled', 'SPEND_TRANSACTION_LINKED', {transactionId: 'tx-settled', expenseId: 'expense-settled'})).state;
  const leoSplitId = Object.values(state.splits).find(split => split.expenseId === 'expense-settled' && split.userId === 'leo')!.id;
  const ninaSplitId = Object.values(state.splits).find(split => split.expenseId === 'expense-settled' && split.userId === 'nina')!.id;
  state = (await kit.authority.append(state, requestAction(leoSplitId), 'mina')).state;
  state = (await kit.authority.append(state, {type: 'MARK_PAID', payload: {splitId: leoSplitId, userId: 'leo'}}, 'leo')).state;
  state = (await kit.authority.append(state, {type: 'CONFIRM_RECEIVED', payload: {splitId: leoSplitId, currentUserId: 'mina'}}, 'mina')).state;
  state = (await kit.authority.append(state, requestAction(ninaSplitId), 'mina')).state;
  state = (await kit.authority.append(state, {type: 'MARK_PAID', payload: {splitId: ninaSplitId, userId: 'nina'}}, 'nina')).state;
  state = (await kit.authority.append(state, {type: 'CONFIRM_RECEIVED', payload: {splitId: ninaSplitId, currentUserId: 'mina'}}, 'mina')).state;
  const before = await kit.authority.readCanonicalGroup('g-card-settled');
  const settledShares = structuredClone(before!.shares);
  await assert.rejects(mode(kit.authority, state, 'mina', 'g-card-settled', 'SPEND_TRANSACTION_REFUNDED', {transactionId: 'tx-settled', adjustmentId: 'refund-too-large', referenceHash: digest('3'), reasonDigest: digest('4'), amount: chf(901)}), /exceeds the remaining/u);

  let result = await mode(kit.authority, state, 'mina', 'g-card-settled', 'SPEND_TRANSACTION_REFUNDED', {transactionId: 'tx-settled', adjustmentId: 'refund-settled', referenceHash: digest('5'), reasonDigest: digest('6'), amount: chf(300)});
  state = result.state;
  const followUp = result.canonicalState.modeState?.spendCard?.transactions['tx-settled'].settledAdjustmentFollowUps[0];
  assert.deepEqual(followUp?.requiredConfirmationIds, ['leo', 'nina']);
  assert.deepEqual(followUp?.allocations.map(row => [row.participantId, row.amount.minorUnits]), [['leo', '100'], ['mina', '100'], ['nina', '100']]);
  assert.deepEqual(result.canonicalState.shares, settledShares);
  await assert.rejects(kit.authority.append(state, {type: 'SAVE_RECORD', payload: {recordId: 'settled-blocked', groupId: 'g-card-settled'}}, 'mina'), /settled follow-up/u);
  await assert.rejects(mode(kit.authority, state, 'mina', 'g-card-settled', 'SPEND_SETTLED_ADJUSTMENT_CONFIRMED', {transactionId: 'tx-settled', adjustmentId: 'refund-settled', amount: chf(100), resolutionReferenceHash: digest('7')}), /affected participant/u);
  await assert.rejects(mode(kit.authority, state, 'leo', 'g-card-settled', 'SPEND_SETTLED_ADJUSTMENT_CONFIRMED', {transactionId: 'tx-settled', adjustmentId: 'refund-settled', amount: chf(99), resolutionReferenceHash: digest('7')}), /does not match/u);
  await assert.rejects(mode(kit.authority, state, 'leo', 'g-card-settled', 'SPEND_SETTLED_ADJUSTMENT_CONFIRMED', {transactionId: 'tx-settled', adjustmentId: 'refund-settled', amount: chf(100), resolutionReferenceHash: 'wrong'}), /digest is invalid/u);
  result = await mode(kit.authority, state, 'leo', 'g-card-settled', 'SPEND_SETTLED_ADJUSTMENT_CONFIRMED', {transactionId: 'tx-settled', adjustmentId: 'refund-settled', amount: chf(100), resolutionReferenceHash: digest('7')});
  state = result.state;
  await assert.rejects(mode(kit.authority, state, 'nina', 'g-card-settled', 'SPEND_SETTLED_ADJUSTMENT_CONFIRMED', {transactionId: 'tx-settled', adjustmentId: 'refund-settled', amount: chf(100), resolutionReferenceHash: digest('7')}), /reference is a duplicate/u);
  result = await mode(kit.authority, state, 'nina', 'g-card-settled', 'SPEND_SETTLED_ADJUSTMENT_CONFIRMED', {transactionId: 'tx-settled', adjustmentId: 'refund-settled', amount: chf(100), resolutionReferenceHash: digest('8')});
  state = result.state;
  assert.deepEqual(result.canonicalState.shares, settledShares);
  const persisted = await kit.journal.read('g-card-settled');
  assert.ok(persisted);
  const duplicate = await kit.authority.accept(state, createCanonicalAuthorityEventEnvelope(persisted.events.at(-1)!));
  assert.equal(duplicate.outcome, 'duplicate');
  const hydrated = await kit.authority.hydrate(baseState());
  assert.equal(hydrated.groups['g-card-settled']?.id, 'g-card-settled');
  const recovered = await kit.authority.readCanonicalGroup('g-card-settled');
  assert.equal(recovered?.modeState?.spendCard?.transactions['tx-settled'].settledAdjustmentFollowUps[0]?.confirmedBy.length, 2);
  assert.deepEqual(recovered?.shares, settledShares);
  result = await kit.authority.append(state, {type: 'SAVE_RECORD', payload: {recordId: 'settled-record', groupId: 'g-card-settled'}}, 'mina');
  assert.equal(result.canonicalState.closed?.recordId, 'settled-record');
});

test('savings circle accepts rules, exposes delay/default, confirms payouts, advances each round once, and closes the cycle', async () => {
  const kit = harness();
  let state = await createModeGroup(kit.authority, baseState(), 'g-circle', 'savings_circle');
  state = (await mode(kit.authority, state, 'mina', 'g-circle', 'CIRCLE_RULES_SET', {
    rulesId: 'rules-1', participantOrder: ['mina', 'leo', 'nina'], contribution: chf(10000), dueEveryDays: 30,
  })).state;
  state = (await mode(kit.authority, state, 'leo', 'g-circle', 'CIRCLE_RULES_ACCEPTED', {rulesId: 'rules-1'})).state;
  state = (await mode(kit.authority, state, 'nina', 'g-circle', 'CIRCLE_RULES_ACCEPTED', {rulesId: 'rules-1'})).state;
  state = (await mode(kit.authority, state, 'mina', 'g-circle', 'CIRCLE_ROUND_OPENED', {roundId: 'round-1', sequence: 1, dueAt: '2026-08-23T12:05:00.000Z'})).state;

  state = (await mode(kit.authority, state, 'leo', 'g-circle', 'CIRCLE_CONTRIBUTION_RECORDED', {roundId: 'round-1', contributionId: 'r1-leo', amount: chf(10000), referenceHash: digest('7')})).state;
  state = (await mode(kit.authority, state, 'nina', 'g-circle', 'CIRCLE_CONTRIBUTION_RECORDED', {roundId: 'round-1', contributionId: 'r1-nina', amount: chf(10000), referenceHash: digest('8')})).state;
  state = (await mode(kit.authority, state, 'mina', 'g-circle', 'CIRCLE_CONTRIBUTION_RECEIVED', {roundId: 'round-1', contributionId: 'r1-leo'})).state;
  state = (await mode(kit.authority, state, 'nina', 'g-circle', 'CIRCLE_CONTRIBUTION_DELAYED', {roundId: 'round-1', contributionId: 'r1-nina', until: '2026-08-23T12:10:00.000Z', noteDigest: digest('9')})).state;
  kit.setNow('2026-08-23T12:11:00.000Z');
  state = (await mode(kit.authority, state, 'mina', 'g-circle', 'CIRCLE_CONTRIBUTION_DEFAULTED', {roundId: 'round-1', contributionId: 'r1-nina', noteDigest: digest('a')})).state;
  state = (await mode(kit.authority, state, 'mina', 'g-circle', 'CIRCLE_PAYOUT_RECORDED', {roundId: 'round-1', payoutId: 'payout-1', amount: chf(10000), referenceHash: digest('b')})).state;
  state = (await mode(kit.authority, state, 'mina', 'g-circle', 'CIRCLE_PAYOUT_CONFIRMED', {roundId: 'round-1', payoutId: 'payout-1'})).state;
  state = (await mode(kit.authority, state, 'mina', 'g-circle', 'CIRCLE_ROUND_ADVANCED', {roundId: 'round-1', nextRoundId: 'round-2', nextDueAt: '2026-08-23T12:20:00.000Z'})).state;
  const afterAdvance = await kit.journal.read('g-circle');
  await assert.rejects(mode(kit.authority, state, 'mina', 'g-circle', 'CIRCLE_ROUND_ADVANCED', {roundId: 'round-1', nextRoundId: 'round-duplicate', nextDueAt: '2026-08-23T12:30:00.000Z'}), /another round/u);
  assert.equal((await kit.journal.read('g-circle'))?.frontierHash, afterAdvance?.frontierHash);

  state = await completeCircleRound(kit.authority, state, 'g-circle', 'round-2', 'leo', ['mina', 'nina'], 2, digest('c'));
  state = (await mode(kit.authority, state, 'mina', 'g-circle', 'CIRCLE_ROUND_ADVANCED', {roundId: 'round-2', nextRoundId: 'round-3', nextDueAt: '2026-08-23T12:40:00.000Z'})).state;
  state = await completeCircleRound(kit.authority, state, 'g-circle', 'round-3', 'nina', ['mina', 'leo'], 3, digest('d'));
  const closed = await mode(kit.authority, state, 'mina', 'g-circle', 'CIRCLE_CLOSED', {roundId: 'round-3', recordId: 'circle-record-1'});
  assert.equal(closed.canonicalState.modeState?.savingsCircle?.closedRecordId, 'circle-record-1');
  assert.equal(closed.canonicalState.modeState?.savingsCircle?.completedRounds.length, 3);

  const persisted = await kit.journal.read('g-circle');
  assert.ok(persisted);
  const reordered = await projectCanonicalEvents([...persisted.events].reverse(), verify);
  assert.equal(reordered.stateHash, persisted.stateHash);
  assert.equal(reordered.conflicts.length, 0);
  const duplicated = await projectCanonicalEvents([...persisted.events, persisted.events.at(-1)!], verify);
  assert.equal(duplicated.stateHash, persisted.stateHash);
  assert.equal(duplicated.duplicates.length, 1);
  const accepted = await kit.authority.accept(closed.state, createCanonicalAuthorityEventEnvelope(persisted.events.at(-1)!));
  assert.equal(accepted.outcome, 'duplicate');
  assert.equal(accepted.frontierHash, persisted.frontierHash);
});

test('signed circle exit and accepted replacement preserve order and unblock a removed due participant', async () => {
  const kit = harness();
  let state = await createModeGroup(kit.authority, baseState(), 'g-circle-recovery', 'savings_circle');
  state = (await mode(kit.authority, state, 'mina', 'g-circle-recovery', 'CIRCLE_RULES_SET', {rulesId: 'rules-recovery', participantOrder: ['mina', 'leo', 'nina'], contribution: chf(10000), dueEveryDays: 30})).state;
  state = (await mode(kit.authority, state, 'leo', 'g-circle-recovery', 'CIRCLE_RULES_ACCEPTED', {rulesId: 'rules-recovery'})).state;
  state = (await mode(kit.authority, state, 'nina', 'g-circle-recovery', 'CIRCLE_RULES_ACCEPTED', {rulesId: 'rules-recovery'})).state;
  state = (await mode(kit.authority, state, 'mina', 'g-circle-recovery', 'CIRCLE_ROUND_OPENED', {roundId: 'recovery-round-1', sequence: 1, dueAt: '2026-08-24T12:00:00.000Z'})).state;
  state = (await kit.authority.appendMembership(state, {groupId: 'g-circle-recovery', type: 'add', grant: {
    groupId: 'g-circle-recovery', participantId: 'noah', accountPublicKeyHex: publicKey('noah'), role: 'member', acceptedAt: '2026-08-23T11:59:00.000Z', invitationId: 'accepted-noah', keyVersion: 1, groupKeyEnvelopeId: 'envelope-noah',
  }}, 'mina')).state;
  state = (await kit.authority.appendMembership(state, {groupId: 'g-circle-recovery', type: 'remove', participantId: 'leo', nextKeyVersion: 2, groupKeyEnvelopeIds: {mina: 'v2-mina', nina: 'v2-nina', noah: 'v2-noah'}}, 'mina')).state;
  await assert.rejects(mode(kit.authority, state, 'mina', 'g-circle-recovery', 'CIRCLE_PARTICIPANT_REPLACED', {departedParticipantId: 'leo', replacementParticipantId: 'nina', reasonDigest: digest('1')}), /active accepted membership/u);
  state = (await mode(kit.authority, state, 'mina', 'g-circle-recovery', 'CIRCLE_PARTICIPANT_EXITED', {participantId: 'leo', reasonDigest: digest('2')})).state;
  state = (await mode(kit.authority, state, 'mina', 'g-circle-recovery', 'CIRCLE_PARTICIPANT_REPLACED', {departedParticipantId: 'leo', replacementParticipantId: 'noah', reasonDigest: digest('3')})).state;
  let canonical = await kit.authority.readCanonicalGroup('g-circle-recovery');
  assert.deepEqual(canonical?.modeState?.savingsCircle?.rules?.participantOrder, ['mina', 'noah', 'nina']);
  assert.deepEqual(canonical?.modeState?.savingsCircle?.activeRound?.exitedParticipantIds, ['leo']);
  state = (await mode(kit.authority, state, 'noah', 'g-circle-recovery', 'CIRCLE_RULES_ACCEPTED', {rulesId: 'rules-recovery'})).state;
  state = (await mode(kit.authority, state, 'noah', 'g-circle-recovery', 'CIRCLE_CONTRIBUTION_RECORDED', {roundId: 'recovery-round-1', contributionId: 'recovery-noah', amount: chf(10000), referenceHash: digest('6')})).state;
  state = (await mode(kit.authority, state, 'nina', 'g-circle-recovery', 'CIRCLE_CONTRIBUTION_RECORDED', {roundId: 'recovery-round-1', contributionId: 'recovery-nina', amount: chf(10000), referenceHash: digest('4')})).state;
  state = (await mode(kit.authority, state, 'mina', 'g-circle-recovery', 'CIRCLE_CONTRIBUTION_RECEIVED', {roundId: 'recovery-round-1', contributionId: 'recovery-noah'})).state;
  state = (await mode(kit.authority, state, 'mina', 'g-circle-recovery', 'CIRCLE_CONTRIBUTION_RECEIVED', {roundId: 'recovery-round-1', contributionId: 'recovery-nina'})).state;
  state = (await mode(kit.authority, state, 'mina', 'g-circle-recovery', 'CIRCLE_PAYOUT_RECORDED', {roundId: 'recovery-round-1', payoutId: 'recovery-payout-1', amount: chf(20000), referenceHash: digest('5')})).state;
  state = (await mode(kit.authority, state, 'mina', 'g-circle-recovery', 'CIRCLE_PAYOUT_CONFIRMED', {roundId: 'recovery-round-1', payoutId: 'recovery-payout-1'})).state;
  canonical = (await mode(kit.authority, state, 'mina', 'g-circle-recovery', 'CIRCLE_ROUND_ADVANCED', {roundId: 'recovery-round-1', nextRoundId: 'recovery-round-2', nextDueAt: '2026-09-23T12:00:00.000Z'})).canonicalState;
  assert.equal(canonical.modeState?.savingsCircle?.activeRound?.recipientId, 'noah');
});

test('emergency pot keeps private reason out of redacted history and cannot bypass trusted approval or recipient confirmation', async () => {
  const kit = harness();
  let state = await createModeGroup(kit.authority, baseState(), 'g-emergency', 'emergency_pot');
  state = (await mode(kit.authority, state, 'mina', 'g-emergency', 'EMERGENCY_POLICY_SET', {trustedApproverIds: ['mina', 'leo'], approvalThreshold: 2})).state;
  const privateReason = 'urgent-medical-detail-never-in-event';
  state = (await mode(kit.authority, state, 'leo', 'g-emergency', 'EMERGENCY_REQUEST_OPENED', {requestId: 'help-1', recipientId: 'nina', reasonDigest: digest('e'), target: chf(10000)})).state;
  state = (await mode(kit.authority, state, 'leo', 'g-emergency', 'EMERGENCY_CONTRIBUTION_RECORDED', {requestId: 'help-1', contributionId: 'help-leo', amount: chf(6000), referenceHash: digest('f')})).state;
  state = (await mode(kit.authority, state, 'mina', 'g-emergency', 'EMERGENCY_CONTRIBUTION_RECORDED', {requestId: 'help-1', contributionId: 'help-mina', amount: chf(4000), referenceHash: digest('1')})).state;
  state = (await mode(kit.authority, state, 'mina', 'g-emergency', 'EMERGENCY_CONTRIBUTION_RECEIVED', {requestId: 'help-1', contributionId: 'help-leo'})).state;
  state = (await mode(kit.authority, state, 'mina', 'g-emergency', 'EMERGENCY_CONTRIBUTION_RECEIVED', {requestId: 'help-1', contributionId: 'help-mina'})).state;
  state = (await mode(kit.authority, state, 'mina', 'g-emergency', 'EMERGENCY_REQUEST_APPROVED', {requestId: 'help-1'})).state;
  const beforeThresholdFailure = await kit.journal.read('g-emergency');
  await assert.rejects(mode(kit.authority, state, 'mina', 'g-emergency', 'EMERGENCY_RELEASE_RECORDED', {requestId: 'help-1', releaseId: 'release-1', amount: chf(10000), referenceHash: digest('2')}), /threshold/u);
  assert.equal((await kit.journal.read('g-emergency'))?.frontierHash, beforeThresholdFailure?.frontierHash);
  state = (await mode(kit.authority, state, 'leo', 'g-emergency', 'EMERGENCY_REQUEST_APPROVED', {requestId: 'help-1'})).state;
  state = (await mode(kit.authority, state, 'mina', 'g-emergency', 'EMERGENCY_RELEASE_RECORDED', {requestId: 'help-1', releaseId: 'release-1', amount: chf(10000), referenceHash: digest('2')})).state;
  await assert.rejects(mode(kit.authority, state, 'mina', 'g-emergency', 'EMERGENCY_RELEASE_CONFIRMED', {requestId: 'help-1', releaseId: 'release-1'}), /Only the emergency recipient/u);
  let result = await mode(kit.authority, state, 'nina', 'g-emergency', 'EMERGENCY_RELEASE_CONFIRMED', {requestId: 'help-1', releaseId: 'release-1'});
  state = result.state;
  result = await mode(kit.authority, state, 'mina', 'g-emergency', 'EMERGENCY_REQUEST_CLOSED', {requestId: 'help-1', recordId: 'help-record-1'});
  state = result.state;

  state = (await mode(kit.authority, state, 'leo', 'g-emergency', 'EMERGENCY_REQUEST_OPENED', {requestId: 'help-2', recipientId: 'nina', reasonDigest: digest('3'), target: chf(5000)})).state;
  state = (await mode(kit.authority, state, 'leo', 'g-emergency', 'EMERGENCY_CONTRIBUTION_RECORDED', {requestId: 'help-2', contributionId: 'help2-leo', amount: chf(5000), referenceHash: digest('4')})).state;
  state = (await mode(kit.authority, state, 'mina', 'g-emergency', 'EMERGENCY_CONTRIBUTION_RECEIVED', {requestId: 'help-2', contributionId: 'help2-leo'})).state;
  state = (await mode(kit.authority, state, 'mina', 'g-emergency', 'EMERGENCY_REQUEST_APPROVED', {requestId: 'help-2'})).state;
  state = (await mode(kit.authority, state, 'leo', 'g-emergency', 'EMERGENCY_REQUEST_APPROVED', {requestId: 'help-2'})).state;
  state = (await mode(kit.authority, state, 'mina', 'g-emergency', 'EMERGENCY_RELEASE_RECORDED', {requestId: 'help-2', releaseId: 'release-2', amount: chf(5000), referenceHash: digest('5')})).state;
  result = await mode(kit.authority, state, 'nina', 'g-emergency', 'EMERGENCY_RELEASE_DISPUTED', {requestId: 'help-2', releaseId: 'release-2', reasonDigest: digest('6')});
  state = result.state;
  assert.equal(result.canonicalState.modeState?.emergencyPot?.requests['help-2'].release?.status, 'disputed');
  await assert.rejects(mode(kit.authority, state, 'mina', 'g-emergency', 'EMERGENCY_RELEASE_CORRECTED', {requestId: 'help-2', disputedReleaseId: 'release-2', releaseId: 'release-2-corrected', amount: chf(4500), referenceHash: digest('7'), reasonDigest: digest('8')}), /correction approval threshold/u);
  state = (await mode(kit.authority, state, 'mina', 'g-emergency', 'EMERGENCY_CORRECTION_APPROVED', {requestId: 'help-2', releaseId: 'release-2'})).state;
  state = (await mode(kit.authority, state, 'leo', 'g-emergency', 'EMERGENCY_CORRECTION_APPROVED', {requestId: 'help-2', releaseId: 'release-2'})).state;
  await assert.rejects(mode(kit.authority, state, 'leo', 'g-emergency', 'EMERGENCY_RELEASE_CORRECTED', {requestId: 'help-2', disputedReleaseId: 'release-2', releaseId: 'release-wrong-actor', amount: chf(4500), referenceHash: digest('7'), reasonDigest: digest('8')}), /Only the organizer/u);
  result = await mode(kit.authority, state, 'mina', 'g-emergency', 'EMERGENCY_RELEASE_CORRECTED', {requestId: 'help-2', disputedReleaseId: 'release-2', releaseId: 'release-2-corrected', amount: chf(4500), referenceHash: digest('7'), reasonDigest: digest('8')});
  state = result.state;
  assert.equal(result.canonicalState.modeState?.emergencyPot?.requests['help-2'].releaseHistory[0]?.status, 'disputed');
  assert.equal(result.canonicalState.modeState?.emergencyPot?.requests['help-2'].release?.correctionOfReleaseId, 'release-2');
  result = await mode(kit.authority, state, 'nina', 'g-emergency', 'EMERGENCY_RELEASE_CONFIRMED', {requestId: 'help-2', releaseId: 'release-2-corrected'});
  const redacted = JSON.stringify(createRedactedModeRecordV1('emergency_pot', result.canonicalState.modeState));
  assert.equal(redacted.includes(privateReason), false);
  assert.equal(redacted.includes(digest('e')), false);
  assert.equal(redacted.includes('nina'), false);
  const persisted = await kit.journal.read('g-emergency');
  assert.ok(persisted);
  assert.equal(JSON.stringify(persisted.events).includes(privateReason), false);
});

test('community fund requires role threshold, supports amend/reject/expire, receiver confirmation, accepted steward handoff, and digest-only reporting', async () => {
  const kit = harness();
  let state = await createModeGroup(kit.authority, baseState(), 'g-community', 'community_fund');
  state = (await mode(kit.authority, state, 'mina', 'g-community', 'COMMUNITY_POLICY_SET', {stewardId: 'mina', approverIds: ['mina', 'leo'], approvalThreshold: 2})).state;
  state = (await mode(kit.authority, state, 'nina', 'g-community', 'COMMUNITY_CONTRIBUTION_RECORDED', {contributionId: 'fund-1', amount: chf(30000), referenceHash: digest('3')})).state;
  state = (await mode(kit.authority, state, 'mina', 'g-community', 'COMMUNITY_CONTRIBUTION_RECEIVED', {contributionId: 'fund-1'})).state;
  state = (await mode(kit.authority, state, 'leo', 'g-community', 'COMMUNITY_PROPOSAL_CREATED', {proposalId: 'proposal-1', recipientId: 'nina', summary: 'Repair the shared garden', purposeDigest: digest('4'), amount: chf(10000), expiresAt: '2026-08-24T12:00:00.000Z'})).state;
  state = (await mode(kit.authority, state, 'mina', 'g-community', 'COMMUNITY_PROPOSAL_APPROVED', {proposalId: 'proposal-1'})).state;
  const beforeBypass = await kit.journal.read('g-community');
  await assert.rejects(mode(kit.authority, state, 'mina', 'g-community', 'COMMUNITY_RELEASE_RECORDED', {proposalId: 'proposal-1', releaseId: 'fund-release-1', amount: chf(10000), referenceHash: digest('5')}), /threshold-approved/u);
  assert.equal((await kit.journal.read('g-community'))?.frontierHash, beforeBypass?.frontierHash);
  state = (await mode(kit.authority, state, 'leo', 'g-community', 'COMMUNITY_PROPOSAL_APPROVED', {proposalId: 'proposal-1'})).state;
  state = (await mode(kit.authority, state, 'mina', 'g-community', 'COMMUNITY_RELEASE_RECORDED', {proposalId: 'proposal-1', releaseId: 'fund-release-1', amount: chf(10000), referenceHash: digest('5')})).state;
  let result = await mode(kit.authority, state, 'nina', 'g-community', 'COMMUNITY_RELEASE_CONFIRMED', {proposalId: 'proposal-1', releaseId: 'fund-release-1'});
  state = result.state;
  assert.equal(result.canonicalState.modeState?.communityFund?.proposals['proposal-1'].status, 'confirmed');

  state = (await mode(kit.authority, state, 'leo', 'g-community', 'COMMUNITY_PROPOSAL_CREATED', {proposalId: 'proposal-2', recipientId: 'leo', summary: 'Buy folding chairs', purposeDigest: digest('6'), amount: chf(5000), expiresAt: '2026-08-24T12:00:00.000Z'})).state;
  state = (await mode(kit.authority, state, 'mina', 'g-community', 'COMMUNITY_PROPOSAL_APPROVED', {proposalId: 'proposal-2'})).state;
  result = await mode(kit.authority, state, 'leo', 'g-community', 'COMMUNITY_PROPOSAL_AMENDED', {proposalId: 'proposal-2', summary: 'Buy four folding chairs', purposeDigest: digest('7'), amount: chf(4000), expiresAt: '2026-08-25T12:00:00.000Z'});
  state = result.state;
  assert.deepEqual(result.canonicalState.modeState?.communityFund?.proposals['proposal-2'].approvedBy, []);
  state = (await mode(kit.authority, state, 'mina', 'g-community', 'COMMUNITY_PROPOSAL_REJECTED', {proposalId: 'proposal-2', reasonDigest: digest('8')})).state;

  state = (await mode(kit.authority, state, 'leo', 'g-community', 'COMMUNITY_PROPOSAL_CREATED', {proposalId: 'proposal-3', recipientId: 'leo', summary: 'Old idea', purposeDigest: digest('9'), amount: chf(3000), expiresAt: '2026-08-23T12:30:00.000Z'})).state;
  kit.setNow('2026-08-23T12:31:00.000Z');
  state = (await mode(kit.authority, state, 'nina', 'g-community', 'COMMUNITY_PROPOSAL_EXPIRED', {proposalId: 'proposal-3'})).state;
  state = (await mode(kit.authority, state, 'mina', 'g-community', 'COMMUNITY_STEWARD_HANDOFF_PROPOSED', {handoffId: 'handoff-1', nextStewardId: 'leo'})).state;
  state = (await mode(kit.authority, state, 'leo', 'g-community', 'COMMUNITY_STEWARD_HANDOFF_ACCEPTED', {handoffId: 'handoff-1'})).state;
  const beforeOldSteward = await kit.journal.read('g-community');
  await assert.rejects(mode(kit.authority, state, 'mina', 'g-community', 'COMMUNITY_REPORT_ADDED', {reportId: 'report-wrong', summary: 'August update', reportDigest: digest('a'), periodStart: '2026-08-01T00:00:00.000Z', periodEnd: '2026-08-23T00:00:00.000Z'}), /current steward/u);
  assert.equal((await kit.journal.read('g-community'))?.frontierHash, beforeOldSteward?.frontierHash);
  result = await mode(kit.authority, state, 'leo', 'g-community', 'COMMUNITY_REPORT_ADDED', {reportId: 'report-1', summary: 'August contributions and garden repair', reportDigest: digest('b'), periodStart: '2026-08-01T00:00:00.000Z', periodEnd: '2026-08-23T00:00:00.000Z'});
  assert.equal(result.canonicalState.modeState?.communityFund?.reports.length, 1);
  state = result.state;
  await assert.rejects(mode(kit.authority, state, 'mina', 'g-community', 'COMMUNITY_FUND_CLOSED', {recordId: 'wrong-steward-close'}), /current steward/u);
  result = await mode(kit.authority, state, 'leo', 'g-community', 'COMMUNITY_FUND_CLOSED', {recordId: 'community-record-1'});
  assert.equal(result.canonicalState.modeState?.communityFund?.closedRecordId, 'community-record-1');
  await assert.rejects(mode(kit.authority, result.state, 'leo', 'g-community', 'COMMUNITY_PROPOSAL_CREATED', {proposalId: 'proposal-after-close', recipientId: 'nina', summary: 'Must not reopen', purposeDigest: digest('c'), amount: chf(100), expiresAt: '2026-08-25T12:00:00.000Z'}), /already closed/u);
});

test('departed approvers and stewards require explicit signed policy reconciliation', async () => {
  const emergencyKit = harness();
  let emergency = await createModeGroup(emergencyKit.authority, baseState(), 'g-emergency-policy', 'emergency_pot');
  emergency = (await mode(emergencyKit.authority, emergency, 'mina', 'g-emergency-policy', 'EMERGENCY_POLICY_SET', {trustedApproverIds: ['mina', 'leo'], approvalThreshold: 2})).state;
  emergency = (await mode(emergencyKit.authority, emergency, 'nina', 'g-emergency-policy', 'EMERGENCY_REQUEST_OPENED', {requestId: 'policy-help', recipientId: 'nina', reasonDigest: digest('1'), target: chf(1000)})).state;
  emergency = (await mode(emergencyKit.authority, emergency, 'leo', 'g-emergency-policy', 'EMERGENCY_REQUEST_APPROVED', {requestId: 'policy-help'})).state;
  emergency = (await emergencyKit.authority.appendMembership(emergency, {groupId: 'g-emergency-policy', type: 'remove', participantId: 'leo', nextKeyVersion: 2, groupKeyEnvelopeIds: {mina: 'v2-mina', nina: 'v2-nina'}}, 'mina')).state;
  await assert.rejects(mode(emergencyKit.authority, emergency, 'nina', 'g-emergency-policy', 'EMERGENCY_POLICY_RECONCILED', {trustedApproverIds: ['mina', 'nina'], approvalThreshold: 2}), /Only the organizer/u);
  let reconciled = await mode(emergencyKit.authority, emergency, 'mina', 'g-emergency-policy', 'EMERGENCY_POLICY_RECONCILED', {trustedApproverIds: ['mina', 'nina'], approvalThreshold: 2});
  assert.deepEqual(reconciled.canonicalState.modeState?.emergencyPot?.policy?.trustedApproverIds, ['mina', 'nina']);
  assert.deepEqual(reconciled.canonicalState.modeState?.emergencyPot?.requests['policy-help'].approvedBy, []);

  const communityKit = harness();
  let community = await createModeGroup(communityKit.authority, baseState(), 'g-community-policy', 'community_fund');
  community = (await mode(communityKit.authority, community, 'mina', 'g-community-policy', 'COMMUNITY_POLICY_SET', {stewardId: 'leo', approverIds: ['leo', 'nina'], approvalThreshold: 2})).state;
  community = (await communityKit.authority.appendMembership(community, {groupId: 'g-community-policy', type: 'remove', participantId: 'leo', nextKeyVersion: 2, groupKeyEnvelopeIds: {mina: 'v2-mina', nina: 'v2-nina'}}, 'mina')).state;
  await assert.rejects(mode(communityKit.authority, community, 'nina', 'g-community-policy', 'COMMUNITY_POLICY_RECONCILED', {stewardId: 'mina', approverIds: ['mina', 'nina'], approvalThreshold: 2}), /Only the organizer/u);
  reconciled = await mode(communityKit.authority, community, 'mina', 'g-community-policy', 'COMMUNITY_POLICY_RECONCILED', {stewardId: 'mina', approverIds: ['mina', 'nina'], approvalThreshold: 2});
  assert.deepEqual(reconciled.canonicalState.modeState?.communityFund?.policy, {stewardId: 'mina', approverIds: ['mina', 'nina'], approvalThreshold: 2});
});

async function completeCircleRound(authority: ProductionAuthority, initial: AppState, groupId: string, roundId: string, recipientId: keyof typeof pairs, contributors: Array<keyof typeof pairs>, sequence: number, referenceBase: string): Promise<AppState> {
  let state = initial;
  for (const [index, contributorId] of contributors.entries()) {
    state = (await mode(authority, state, contributorId, groupId, 'CIRCLE_CONTRIBUTION_RECORDED', {roundId, contributionId: `${roundId}-${contributorId}`, amount: chf(10000), referenceHash: `${referenceBase.slice(0, -1)}${index}`})).state;
    state = (await mode(authority, state, recipientId, groupId, 'CIRCLE_CONTRIBUTION_RECEIVED', {roundId, contributionId: `${roundId}-${contributorId}`})).state;
  }
  state = (await mode(authority, state, 'mina', groupId, 'CIRCLE_PAYOUT_RECORDED', {roundId, payoutId: `payout-${sequence}`, amount: chf(20000), referenceHash: digest(sequence === 2 ? 'e' : 'f')})).state;
  return (await mode(authority, state, recipientId, groupId, 'CIRCLE_PAYOUT_CONFIRMED', {roundId, payoutId: `payout-${sequence}`})).state;
}

async function createModeGroup(authority: ProductionAuthority, state: AppState, groupId: string, groupMode: GroupMode): Promise<AppState> {
  return (await authority.append(state, {type: 'CREATE_GROUP', payload: {group: {id: groupId, name: groupId, memberIds: ['mina', 'leo', 'nina'], mode: groupMode}}}, 'mina')).state;
}

async function addExpense(authority: ProductionAuthority, state: AppState, groupId: string, expenseId: string, total: MoneyV1): Promise<AppState> {
  const minorUnits = Number(total.minorUnits);
  const shares = [Math.floor(minorUnits / 3), Math.floor(minorUnits / 3), minorUnits - 2 * Math.floor(minorUnits / 3)];
  const memberIds = ['mina', 'leo', 'nina'];
  return (await authority.append(state, {
    type: 'ADD_EXPENSE',
    payload: {
      expense: {id: expenseId, groupId, description: expenseId, amount: minorUnits / 100, currency: total.currency, paidByUserId: 'mina', date: '2026-08-23T12:00:00.000Z'},
      splits: memberIds.map((userId, index) => ({id: `${expenseId}-${userId}`, expenseId, userId, amount: shares[index] / 100, status: userId === 'mina' ? 'confirmed' as const : 'open' as const})),
      exact: {total, allocations: memberIds.map((participantId, index) => ({
        participantId,
        amount: moneyFromMinorUnits(BigInt(shares[index]), total.currency, total.exponent),
      }))},
    },
  }, 'mina')).state;
}

function mode<Type extends ModeWorkflowEventTypeV1>(authority: ProductionAuthority, state: AppState, actorId: keyof typeof pairs, groupId: string, eventType: Type, payload: ModeWorkflowPayloadByTypeV1[Type]) {
  return authority.appendMode(state, {groupId, eventType, payload} as ModeAuthorityCommandV1, actorId);
}

function baseState(): AppState {
  return {
    ...createCleanState(),
    currency: 'CHF',
    currentUserId: 'mina',
    users: {
      mina: {id: 'mina', name: 'Mina', accountPublicKeyHex: publicKey('mina')},
      leo: {id: 'leo', name: 'Leo', accountPublicKeyHex: publicKey('leo')},
      nina: {id: 'nina', name: 'Nina', accountPublicKeyHex: publicKey('nina')},
      noah: {id: 'noah', name: 'Noah', accountPublicKeyHex: publicKey('noah')},
    },
  };
}

function harness() {
  const journal = new MemoryJournal();
  let clock = '2026-08-23T12:00:00.000Z';
  let sequence = 0;
  const identities: AuthorityIdentityResolver = {
    async resolve(participantId, expectedPublicKeyHex) {
      const pair = pairs[participantId as keyof typeof pairs];
      if (!pair) throw new Error('test signer missing');
      const actual = publicKey(participantId as keyof typeof pairs);
      if (expectedPublicKeyHex && expectedPublicKeyHex !== actual) throw new Error('wrong key');
      const signer: CanonicalSigner = {sign: async bytes => sr25519Sign(bytes, pair)};
      return {participantId, publicKeyHex: actual, signer};
    },
  };
  const authority = new ProductionAuthority({
    journal,
    identities,
    verify,
    memberships: {async resolve(groupId, participantId) {
      return {groupId, participantId, accountPublicKeyHex: publicKey(participantId as keyof typeof pairs), role: 'member', acceptedAt: '2026-08-23T11:59:00.000Z', invitationId: `accepted-${participantId}`, keyVersion: 1, groupKeyEnvelopeId: `envelope-${participantId}`};
    }},
    membershipChanges: {async authorize() { return true; }},
    now: () => clock,
    randomId: () => `mode-${++sequence}`,
  });
  return {authority, journal, now: () => clock, setNow: (value: string) => { clock = value; }};
}

class MemoryJournal implements AuthorityJournalStore {
  private readonly records = new Map<string, PersistedAuthorityGroupV1>();
  async listGroupIds(): Promise<string[]> { return [...this.records.keys()]; }
  async read(groupId: string): Promise<PersistedAuthorityGroupV1 | null> { return structuredClone(this.records.get(groupId) ?? null); }
  async compareAndSwap(groupId: string, expectedFrontierHash: string | null, value: PersistedAuthorityGroupV1): Promise<boolean> {
    if ((this.records.get(groupId)?.frontierHash ?? null) !== expectedFrontierHash) return false;
    this.records.set(groupId, structuredClone(value));
    return true;
  }
  async clear(): Promise<void> { this.records.clear(); }
}
