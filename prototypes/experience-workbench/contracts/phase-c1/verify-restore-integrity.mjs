import assert from 'node:assert/strict';
import { createCanonicalMaterializationState } from './materialization-state.mjs';

let checks = 0;
const eq = (actual, expected, message) => { checks += 1; assert.deepEqual(actual, expected, message); };
const rejects = (fn, message) => { checks += 1; assert.throws(fn, undefined, message); };

const NAMESPACE = 'phase-c1:sp_restore';
const authorizedMoney = { minorUnits: 10000n, currency: 'USD', exponent: 2 };
const money = minorUnits => ({ minorUnits: BigInt(minorUnits), currency: 'USD', exponent: 2 });
const expected = ({ ref, kind, parent = null, spend = 'sp_restore', operation = 'op_restore' }) => ({
  spend_intent_id: spend,
  operation_id: operation,
  authoritative_effect_ref: ref,
  effect_kind: kind,
  authoritative_parent_effect_ref: parent
});

const apply = (state, { ref, kind, units, parent = null, spend = 'sp_restore', operation = 'op_restore' }) =>
  state.materialize({
    state: ['refund', 'reversal'].includes(kind) ? 'reversed' : (kind === 'partial_capture' ? 'partial' : 'captured'),
    proofAccepted: true,
    expected: expected({ ref, kind, parent, spend, operation }),
    effectMoney: money(units),
    authorizedMoney
  });

const sameHead = (left, right) =>
  left?.head_version === right?.head_version &&
  left?.domain === right?.domain &&
  left?.namespace === right?.namespace &&
  left?.snapshot_version === right?.snapshot_version &&
  left?.generation === right?.generation &&
  left?.lineage_digest === right?.lineage_digest &&
  (left?.prior_generation ?? null) === (right?.prior_generation ?? null) &&
  (left?.prior_lineage_digest ?? null) === (right?.prior_lineage_digest ?? null) &&
  (left?.owner_scoped_cas_token ?? null) === (right?.owner_scoped_cas_token ?? null);

const fenceFor = (resolveHead, beforeCommit = () => {}) => ({ expected_head, commit }) => {
  if (!sameHead(resolveHead(), expected_head)) return false;
  beforeCommit();
  if (!sameHead(resolveHead(), expected_head)) return false;
  return commit() === true;
};

const stateForHead = (head, namespace = NAMESPACE, verifyAuthoritativeHeadTransition) => {
  const resolveHead = () => head;
  return createCanonicalMaterializationState({
    persistenceNamespace: namespace,
    resolveAuthoritativeHead: resolveHead,
    verifyAuthoritativeHeadTransition,
    commitUnderAuthoritativeHeadFence: fenceFor(resolveHead)
  });
};
const findEffect = (snapshot, key) => snapshot.effects.find(([candidate]) => candidate === key)?.[1];
const findIntent = (snapshot, key) => snapshot.intents.find(([candidate]) => candidate === key)?.[1];
const transitionToken = (prior, next) =>
  `cas:${prior.generation}:${prior.lineage_digest}->${next.generation}:${next.lineage_digest}`;
const transitionHead = (next, prior, token = transitionToken(prior, next)) => ({
  ...next,
  prior_generation: prior.generation,
  prior_lineage_digest: prior.lineage_digest,
  owner_scoped_cas_token: token
});
const verifyTransitionShape = ({ prior_head, next_head, owner_scoped_cas_token }) =>
  owner_scoped_cas_token === transitionToken(prior_head, next_head);

// partial_capture is a rail-neutral root capture, not an adjustment.
let partialCaptureHead = null;
const partialCaptureLive = createCanonicalMaterializationState({
  persistenceNamespace: NAMESPACE,
  resolveAuthoritativeHead: () => partialCaptureHead
});
eq(apply(partialCaptureLive, { ref: 'rail:partial:root', kind: 'partial_capture', units: 750 }), true, 'partial capture materializes as a root capture without parent lineage');
eq(apply(partialCaptureLive, { ref: 'rail:partial:with-parent', kind: 'partial_capture', units: 100, parent: 'rail:partial:root' }), false, 'partial capture cannot smuggle an adjustment parent');
eq(apply(partialCaptureLive, { ref: 'rail:partial:wrong-parent', kind: 'partial_capture', units: 100, parent: 'rail:missing' }), false, 'partial capture rejects substituted parent lineage');
const partialCaptureSnapshot = partialCaptureLive.snapshot();
const partialCaptureCheckpoint = partialCaptureLive.checkpoint();
partialCaptureHead = partialCaptureLive.headCandidate();
const partialCaptureRestart = stateForHead(partialCaptureHead);
eq(partialCaptureRestart.restore(partialCaptureSnapshot, partialCaptureCheckpoint), true, 'root partial capture survives exact restart/restore inside fence');
eq(partialCaptureRestart.getEffect('sp_restore', 'op_restore', 'rail:partial:root').kind, 'partial_capture', 'restored partial capture keeps its economic kind');
eq(partialCaptureRestart.getEffect('sp_restore', 'op_restore', 'rail:partial:root').authoritative_parent_effect_ref ?? null, null, 'restored root partial capture has no parent lineage');
eq(partialCaptureRestart.getEffect('sp_restore', 'op_restore', 'rail:partial:root').remaining_unadjusted_units, 750n, 'root partial capture preserves adjustable remaining capacity');

// Build C3: parent A has only 400 units remaining.
let resolvedHead = null;
let live = createCanonicalMaterializationState({
  persistenceNamespace: NAMESPACE,
  resolveAuthoritativeHead: () => resolvedHead
});
eq(apply(live, { ref: 'rail:cap:A', kind: 'capture', units: 1000 }), true, 'capture A materializes');
eq(apply(live, { ref: 'rail:cap:B', kind: 'capture', units: 4000 }), true, 'capture B materializes');
eq(apply(live, { ref: 'rail:refund:A:600', kind: 'refund', units: 600, parent: 'rail:cap:A' }), true, 'refund consumes 600 from parent A');
eq(live.getEffect('sp_restore', 'op_restore', 'rail:cap:A').remaining_unadjusted_units, 400n, 'live parent remainder is 400');
eq(live.getIntentMoney('sp_restore').minorUnits, 4400n, 'live aggregate net is 4400');

const partialSnapshot = live.snapshot();
const partialCheckpoint = live.checkpoint();
const partialHead = live.headCandidate();
resolvedHead = partialHead;

const restarted = stateForHead(partialHead);
eq(restarted.restore(partialSnapshot, partialCheckpoint), true, 'clean snapshot restores against independent head/checkpoint inside exact-head fence');
eq(restarted.getEffect('sp_restore', 'op_restore', 'rail:cap:A').remaining_unadjusted_units, 400n, 'clean restore reconstructs parent remainder');
eq(restarted.getIntentMoney('sp_restore').minorUnits, 4400n, 'clean restore reconstructs aggregate net');

rejects(() => createCanonicalMaterializationState({ persistenceNamespace: NAMESPACE }).restore(partialSnapshot, partialCheckpoint), 'restore without authoritative-head resolver fails closed');
rejects(() => stateForHead(partialHead).restore(partialSnapshot), 'restore without backup checkpoint fails closed');
rejects(() => createCanonicalMaterializationState({ resolveAuthoritativeHead: () => partialHead }).restore(partialSnapshot, partialCheckpoint), 'restore without persistence namespace fails closed');
rejects(() => createCanonicalMaterializationState({
  persistenceNamespace: NAMESPACE,
  resolveAuthoritativeHead: () => partialHead
}).restore(partialSnapshot, partialCheckpoint), 'restart/process recreation without authoritative commit-fence reacquisition fails closed');

const inflatedRemainder = structuredClone(partialSnapshot);
findEffect(inflatedRemainder, 'sp_restore:op_restore:rail:cap:A').remaining_unadjusted_units = '1000';
rejects(() => stateForHead(partialHead).restore(inflatedRemainder, partialCheckpoint), 'inflated remaining_unadjusted_units is rejected');

const missingDedupe = structuredClone(partialSnapshot);
missingDedupe.authoritativeEffects = missingDedupe.authoritativeEffects.filter(value => value !== 'sp_restore:rail:refund:A:600');
rejects(() => stateForHead(partialHead).restore(missingDedupe, partialCheckpoint), 'missing authoritative-effect dedupe entry is rejected');
const replayedDedupe = structuredClone(partialSnapshot);
replayedDedupe.authoritativeEffects.push(replayedDedupe.authoritativeEffects[0]);
rejects(() => stateForHead(partialHead).restore(replayedDedupe, partialCheckpoint), 'replayed authoritative-effect dedupe entry is rejected');

const aggregateDrift = structuredClone(partialSnapshot);
findIntent(aggregateDrift, 'sp_restore').minorUnits = '5000';
rejects(() => stateForHead(partialHead).restore(aggregateDrift, partialCheckpoint), 'aggregate-vs-effect drift is rejected');

const parentMismatch = structuredClone(partialSnapshot);
findEffect(parentMismatch, 'sp_restore:op_restore:rail:refund:A:600').operation_id = 'op_other';
rejects(() => stateForHead(partialHead).restore(parentMismatch, partialCheckpoint), 'parent key/intent/operation mismatch is rejected');

live = restarted;
eq(apply(live, { ref: 'rail:reversal:A:400', kind: 'reversal', units: 400, parent: 'rail:cap:A' }), true, 'post-restart reconciliation consumes exact remaining parent value once');
eq(live.getEffect('sp_restore', 'op_restore', 'rail:cap:A').remaining_unadjusted_units, 0n, 'parent A is exhausted at C4');
eq(live.getIntentMoney('sp_restore').minorUnits, 4000n, 'C4 aggregate net reflects exact adjustment');

const exhaustedSnapshot = live.snapshot();
const exhaustedCheckpoint = live.checkpoint();
const exhaustedHead = live.headCandidate();

resolvedHead = partialHead;
const beforeInProcessRollback = live.snapshot();
rejects(() => live.restore(partialSnapshot, partialCheckpoint), 'in-process stale C3 head cannot roll accepted C4 frontier backward');
eq(live.snapshot(), beforeInProcessRollback, 'rejected in-process rollback is atomic');
eq(live.getEffect('sp_restore', 'op_restore', 'rail:cap:A').remaining_unadjusted_units, 0n, 'rejected in-process rollback keeps exhausted parent at zero');

const freshAtC4 = stateForHead(exhaustedHead);
rejects(() => freshAtC4.restore(partialSnapshot, partialCheckpoint), 'fresh startup rejects valid stale C3 snapshot when authoritative head is C4');

const restoredC4 = stateForHead(exhaustedHead);
eq(restoredC4.restore(exhaustedSnapshot, exhaustedCheckpoint), true, 'exact authoritative C4 snapshot restores inside exact-head fence');
eq(restoredC4.getEffect('sp_restore', 'op_restore', 'rail:cap:A').remaining_unadjusted_units, 0n, 'exact C4 restore preserves exhausted parent');
eq(apply(restoredC4, { ref: 'rail:refund:A:fresh', kind: 'refund', units: 1, parent: 'rail:cap:A' }), false, 'C4 restart cannot rematerialize consumed parent value');

const fabricated = createCanonicalMaterializationState({ persistenceNamespace: NAMESPACE });
eq(apply(fabricated, { ref: 'rail:cap:A', kind: 'capture', units: 1000 }), true, 'fabricated capture A materializes');
eq(apply(fabricated, { ref: 'rail:cap:B', kind: 'capture', units: 4000 }), true, 'fabricated capture B materializes');
eq(apply(fabricated, { ref: 'rail:refund:B:100', kind: 'refund', units: 100, parent: 'rail:cap:B' }), true, 'fabricated alternate lineage is internally valid');
const fabricatedSnapshot = fabricated.snapshot();
const fabricatedCheckpoint = fabricated.checkpoint();
rejects(() => stateForHead(exhaustedHead).restore(fabricatedSnapshot, fabricatedCheckpoint), 'recomputed snapshot+checkpoint digest pair cannot self-authorize against independent C4 head');

const fork = createCanonicalMaterializationState({ persistenceNamespace: NAMESPACE });
eq(apply(fork, { ref: 'rail:cap:A', kind: 'capture', units: 1000 }), true, 'fork capture A materializes');
eq(apply(fork, { ref: 'rail:cap:B', kind: 'capture', units: 4000 }), true, 'fork capture B materializes');
eq(apply(fork, { ref: 'rail:refund:A:500', kind: 'refund', units: 500, parent: 'rail:cap:A' }), true, 'fork adjustment 1 materializes');
eq(apply(fork, { ref: 'rail:refund:B:100', kind: 'refund', units: 100, parent: 'rail:cap:B' }), true, 'fork adjustment 2 materializes');
const forkHead = fork.headCandidate();
let dynamicHead = exhaustedHead;
const resolveForkHead = () => dynamicHead;
const forkProbe = createCanonicalMaterializationState({
  persistenceNamespace: NAMESPACE,
  resolveAuthoritativeHead: resolveForkHead,
  commitUnderAuthoritativeHeadFence: fenceFor(resolveForkHead)
});
eq(forkProbe.restore(exhaustedSnapshot, exhaustedCheckpoint), true, 'fork probe accepts authoritative C4 first');
dynamicHead = forkHead;
rejects(() => forkProbe.restore(exhaustedSnapshot, exhaustedCheckpoint), 'same-generation different-digest authoritative head is rejected as fork');

// Build an exact C5 descendant from C4.
const newerBackupState = stateForHead(exhaustedHead);
eq(newerBackupState.restore(exhaustedSnapshot, exhaustedCheckpoint), true, 'newer-backup fixture begins at C4');
eq(apply(newerBackupState, { ref: 'rail:refund:B:1', kind: 'refund', units: 1, parent: 'rail:cap:B' }), true, 'newer-backup fixture advances to C5');
const c5Snapshot = newerBackupState.snapshot();
const c5Checkpoint = newerBackupState.checkpoint();
const c5Head = newerBackupState.headCandidate();
rejects(() => stateForHead(exhaustedHead).restore(c5Snapshot, c5Checkpoint), 'backup newer than accepted C4 head cannot self-promote authority');

// Higher head requires exact prior binding, owner-scoped CAS/equivalent and descendant lineage.
let transitionResolvedHead = exhaustedHead;
const resolveTransitionHead = () => transitionResolvedHead;
const transitionProbe = createCanonicalMaterializationState({
  persistenceNamespace: NAMESPACE,
  resolveAuthoritativeHead: resolveTransitionHead,
  verifyAuthoritativeHeadTransition: verifyTransitionShape,
  commitUnderAuthoritativeHeadFence: fenceFor(resolveTransitionHead)
});
eq(transitionProbe.restore(exhaustedSnapshot, exhaustedCheckpoint), true, 'transition probe starts from exact C4');
transitionResolvedHead = transitionHead(c5Head, exhaustedHead);
eq(transitionProbe.restore(c5Snapshot, c5Checkpoint), true, 'exact C4 to C5 descendant transition with prior-head CAS proof commits inside exact-head fence');
eq(transitionProbe.getEffect('sp_restore', 'op_restore', 'rail:cap:B').remaining_unadjusted_units, 3999n, 'valid C5 descendant applies only its new bounded adjustment');

let bareAdvanceHead = exhaustedHead;
const resolveBareAdvanceHead = () => bareAdvanceHead;
const bareAdvanceProbe = createCanonicalMaterializationState({
  persistenceNamespace: NAMESPACE,
  resolveAuthoritativeHead: resolveBareAdvanceHead,
  verifyAuthoritativeHeadTransition: verifyTransitionShape,
  commitUnderAuthoritativeHeadFence: fenceFor(resolveBareAdvanceHead)
});
eq(bareAdvanceProbe.restore(exhaustedSnapshot, exhaustedCheckpoint), true, 'bare-advance probe starts at C4');
bareAdvanceHead = c5Head;
rejects(() => bareAdvanceProbe.restore(c5Snapshot, c5Checkpoint), 'higher generation without exact prior-head/CAS transition metadata is rejected');

let noVerifierHead = exhaustedHead;
const resolveNoVerifierHead = () => noVerifierHead;
const noVerifierProbe = createCanonicalMaterializationState({
  persistenceNamespace: NAMESPACE,
  resolveAuthoritativeHead: resolveNoVerifierHead,
  commitUnderAuthoritativeHeadFence: fenceFor(resolveNoVerifierHead)
});
eq(noVerifierProbe.restore(exhaustedSnapshot, exhaustedCheckpoint), true, 'no-verifier probe starts at C4');
noVerifierHead = transitionHead(c5Head, exhaustedHead);
rejects(() => noVerifierProbe.restore(c5Snapshot, c5Checkpoint), 'higher generation without owner-scoped transition verifier is rejected');

const divergent = createCanonicalMaterializationState({ persistenceNamespace: NAMESPACE });
eq(apply(divergent, { ref: 'rail:cap:A', kind: 'capture', units: 1000 }), true, 'divergent C5 capture A materializes');
eq(apply(divergent, { ref: 'rail:cap:B', kind: 'capture', units: 4000 }), true, 'divergent C5 capture B materializes');
eq(apply(divergent, { ref: 'rail:refund:A:500:fork', kind: 'refund', units: 500, parent: 'rail:cap:A' }), true, 'divergent C5 alternate refund materializes');
eq(apply(divergent, { ref: 'rail:reversal:A:500:fork', kind: 'reversal', units: 500, parent: 'rail:cap:A' }), true, 'divergent C5 alternate reversal materializes');
eq(apply(divergent, { ref: 'rail:refund:B:1:fork', kind: 'refund', units: 1, parent: 'rail:cap:B' }), true, 'divergent C5 extra effect materializes');
const divergentSnapshot = divergent.snapshot();
const divergentCheckpoint = divergent.checkpoint();
const divergentTransitionHead = transitionHead(divergent.headCandidate(), exhaustedHead);
let divergentResolvedHead = exhaustedHead;
const resolveDivergentHead = () => divergentResolvedHead;
const divergentProbe = createCanonicalMaterializationState({
  persistenceNamespace: NAMESPACE,
  resolveAuthoritativeHead: resolveDivergentHead,
  verifyAuthoritativeHeadTransition: verifyTransitionShape,
  commitUnderAuthoritativeHeadFence: fenceFor(resolveDivergentHead)
});
eq(divergentProbe.restore(exhaustedSnapshot, exhaustedCheckpoint), true, 'divergent-lineage probe starts at C4');
const beforeDivergentAdvance = divergentProbe.snapshot();
divergentResolvedHead = divergentTransitionHead;
rejects(() => divergentProbe.restore(divergentSnapshot, divergentCheckpoint), 'higher-generation fork that omits accepted immutable effects is rejected despite plausible transition metadata');
eq(divergentProbe.snapshot(), beforeDivergentAdvance, 'divergent higher-generation rejection leaves C4 state unchanged');

// Competing next-head publication rejected by transition verifier cannot become authority.
let rejectedCasHead = exhaustedHead;
const resolveRejectedCasHead = () => rejectedCasHead;
const rejectedCasProbe = createCanonicalMaterializationState({
  persistenceNamespace: NAMESPACE,
  resolveAuthoritativeHead: resolveRejectedCasHead,
  verifyAuthoritativeHeadTransition: () => false,
  commitUnderAuthoritativeHeadFence: fenceFor(resolveRejectedCasHead)
});
eq(rejectedCasProbe.restore(exhaustedSnapshot, exhaustedCheckpoint), true, 'competing-CAS probe starts at C4');
const beforeRejectedCas = rejectedCasProbe.snapshot();
rejectedCasHead = transitionHead(c5Head, exhaustedHead, 'cas:losing-writer');
rejects(() => rejectedCasProbe.restore(c5Snapshot, c5Checkpoint), 'competing next-head publication rejected by owner-scoped CAS/equivalent cannot restore');
eq(rejectedCasProbe.snapshot(), beforeRejectedCas, 'rejected competing head causes zero partial local mutation');

// Build C6 and inject it after C5 validation but inside the commit fence.
eq(apply(newerBackupState, { ref: 'rail:refund:B:1:second', kind: 'refund', units: 1, parent: 'rail:cap:B' }), true, 'C5 fixture advances to C6 for fenced TOCTOU simulation');
const c6Head = newerBackupState.headCandidate();
const c6TransitionHead = transitionHead(c6Head, c5Head);
let concurrentHead = exhaustedHead;
let injectCompetingHead = false;
const resolveConcurrentHead = () => concurrentHead;
const concurrentProbe = createCanonicalMaterializationState({
  persistenceNamespace: NAMESPACE,
  resolveAuthoritativeHead: resolveConcurrentHead,
  verifyAuthoritativeHeadTransition: verifyTransitionShape,
  commitUnderAuthoritativeHeadFence: fenceFor(resolveConcurrentHead, () => {
    if (injectCompetingHead) concurrentHead = c6TransitionHead;
  })
});
eq(concurrentProbe.restore(exhaustedSnapshot, exhaustedCheckpoint), true, 'concurrency probe starts at C4');
const beforeConcurrentAdvance = concurrentProbe.snapshot();
concurrentHead = transitionHead(c5Head, exhaustedHead);
injectCompetingHead = true;
rejects(() => concurrentProbe.restore(c5Snapshot, c5Checkpoint), 'C5 to C6 publication inside commit fence rejects stale C5 restore before local mutation');
eq(concurrentProbe.snapshot(), beforeConcurrentAdvance, 'fenced C5/C6 race leaves authoritative local financial state unchanged');
eq(concurrentProbe.getEffect('sp_restore', 'op_restore', 'rail:cap:B').remaining_unadjusted_units, 4000n, 'fenced race preserves C4 parent capacity rather than admitting stale C5 consumption');

// Simulated fence/storage failure before commit leaves every local financial structure unchanged.
let storageFenceHead = exhaustedHead;
let failStorageFence = false;
const resolveStorageFenceHead = () => storageFenceHead;
const storageFenceProbe = createCanonicalMaterializationState({
  persistenceNamespace: NAMESPACE,
  resolveAuthoritativeHead: resolveStorageFenceHead,
  verifyAuthoritativeHeadTransition: verifyTransitionShape,
  commitUnderAuthoritativeHeadFence: ({ expected_head, commit }) => {
    if (!sameHead(resolveStorageFenceHead(), expected_head)) return false;
    if (failStorageFence) throw new Error('simulated authoritative fence/storage failure');
    return commit() === true;
  }
});
eq(storageFenceProbe.restore(exhaustedSnapshot, exhaustedCheckpoint), true, 'storage-failure probe starts at C4');
const beforeStorageFailure = storageFenceProbe.snapshot();
storageFenceHead = transitionHead(c5Head, exhaustedHead);
failStorageFence = true;
rejects(() => storageFenceProbe.restore(c5Snapshot, c5Checkpoint), 'storage/fence failure rejects C5 restore');
eq(storageFenceProbe.snapshot(), beforeStorageFailure, 'storage/fence failure preserves parent capacity, dedupe, aggregates and lineage');

// Even a fence implementation that commits then reports failure is rolled back locally.
let postCommitFenceHead = exhaustedHead;
let rejectAfterCommit = false;
const resolvePostCommitFenceHead = () => postCommitFenceHead;
const postCommitFenceProbe = createCanonicalMaterializationState({
  persistenceNamespace: NAMESPACE,
  resolveAuthoritativeHead: resolvePostCommitFenceHead,
  verifyAuthoritativeHeadTransition: verifyTransitionShape,
  commitUnderAuthoritativeHeadFence: ({ expected_head, commit }) => {
    if (!sameHead(resolvePostCommitFenceHead(), expected_head)) return false;
    const committed = commit();
    return rejectAfterCommit ? false : committed;
  }
});
eq(postCommitFenceProbe.restore(exhaustedSnapshot, exhaustedCheckpoint), true, 'post-commit fence probe starts at C4');
const beforePostCommitReject = postCommitFenceProbe.snapshot();
postCommitFenceHead = transitionHead(c5Head, exhaustedHead);
rejectAfterCommit = true;
rejects(() => postCommitFenceProbe.restore(c5Snapshot, c5Checkpoint), 'fence invalidation after callback commit is treated as failed restore');
eq(postCommitFenceProbe.snapshot(), beforePostCommitReject, 'failed fence rolls back any tentative local commit byte-for-byte structurally');

const wrongDomainHead = { ...exhaustedHead, domain: 'OTHER:materialization' };
rejects(() => stateForHead(wrongDomainHead).restore(exhaustedSnapshot, exhaustedCheckpoint), 'wrong authoritative-head domain is rejected');
const wrongNamespaceHead = { ...exhaustedHead, namespace: 'phase-c1:other-dataset' };
rejects(() => stateForHead(wrongNamespaceHead).restore(exhaustedSnapshot, exhaustedCheckpoint), 'head from another persistence namespace is rejected');
rejects(() => stateForHead(exhaustedHead, 'phase-c1:other-dataset').restore(exhaustedSnapshot, exhaustedCheckpoint), 'snapshot cannot transplant an authoritative head into another dataset namespace');
const wrongVersionHead = { ...exhaustedHead, head_version: 999 };
rejects(() => stateForHead(wrongVersionHead).restore(exhaustedSnapshot, exhaustedCheckpoint), 'wrong authoritative-head version is rejected');

const mixedGeneration = structuredClone(exhaustedSnapshot);
mixedGeneration.effects = structuredClone(partialSnapshot.effects);
rejects(() => stateForHead(exhaustedHead).restore(mixedGeneration, exhaustedCheckpoint), 'partial/mixed-generation snapshot is rejected');
const resurrectedParent = structuredClone(exhaustedSnapshot);
findEffect(resurrectedParent, 'sp_restore:op_restore:rail:cap:A').remaining_unadjusted_units = '1';
rejects(() => stateForHead(exhaustedHead).restore(resurrectedParent, exhaustedCheckpoint), 'exhausted parent resurrection is rejected');
const duplicateEffect = structuredClone(exhaustedSnapshot);
duplicateEffect.effects.push(structuredClone(duplicateEffect.effects[0]));
rejects(() => stateForHead(exhaustedHead).restore(duplicateEffect, exhaustedCheckpoint), 'duplicate persisted effect row is rejected');

const reordered = structuredClone(exhaustedSnapshot);
reordered.effects.reverse();
reordered.intents.reverse();
reordered.authoritativeEffects.reverse();
const reorderedState = stateForHead(exhaustedHead);
eq(reorderedState.restore(reordered, exhaustedCheckpoint), true, 'out-of-order persisted rows reconstruct deterministically inside fence');
eq(reorderedState.getEffect('sp_restore', 'op_restore', 'rail:cap:A').remaining_unadjusted_units, 0n, 'out-of-order recovery preserves exhausted parent');

const atomicProbe = stateForHead(partialHead);
eq(atomicProbe.restore(partialSnapshot, partialCheckpoint), true, 'atomic probe starts from valid restored state');
const beforeFailedRestore = atomicProbe.snapshot();
rejects(() => atomicProbe.restore(aggregateDrift, partialCheckpoint), 'inconsistent restore is rejected before fenced commit');
eq(atomicProbe.snapshot(), beforeFailedRestore, 'failed restore leaves prior state byte-for-byte structurally unchanged');

// MoneyV1 exactness: large integer units and representative exponents survive fenced restart without Number conversion.
for (const exponent of [0, 3, 8, 12]) {
  const namespace = `phase-c1:money-e${exponent}`;
  const units = 9007199254740993123456789n + BigInt(exponent);
  const authorized = { minorUnits: units + 1000n, currency: 'XTS', exponent };
  const exact = createCanonicalMaterializationState({ persistenceNamespace: namespace });
  eq(exact.materialize({
    state: 'captured',
    proofAccepted: true,
    expected: {
      spend_intent_id: `sp_e${exponent}`,
      operation_id: `op_e${exponent}`,
      authoritative_effect_ref: `rail:e${exponent}`,
      effect_kind: 'capture',
      authoritative_parent_effect_ref: null
    },
    effectMoney: { minorUnits: units, currency: 'XTS', exponent },
    authorizedMoney: authorized
  }), true, `MoneyV1 exponent ${exponent} capture materializes exactly`);
  const exactSnapshot = exact.snapshot();
  const exactCheckpoint = exact.checkpoint();
  const exactHead = exact.headCandidate();
  const exactRestart = stateForHead(exactHead, namespace);
  eq(exactRestart.restore(exactSnapshot, exactCheckpoint), true, `MoneyV1 exponent ${exponent} restores inside exact-head fence`);
  eq(exactRestart.getIntentMoney(`sp_e${exponent}`).minorUnits, units, `MoneyV1 exponent ${exponent} preserves large integer units exactly`);
}

console.log(JSON.stringify({ suite: 'phase-c1-restore-integrity', checks, result: 'pass' }));
