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

const stateForHead = (head, namespace = NAMESPACE, verifyAuthoritativeHeadTransition) => createCanonicalMaterializationState({
  persistenceNamespace: namespace,
  resolveAuthoritativeHead: () => head,
  verifyAuthoritativeHeadTransition
});
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

// Reviewer REVISE: partial_capture is one rail-neutral root capture kind, not an adjustment.
// Missing parent is the valid case; any supplied parent fails rather than being silently discarded.
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
eq(partialCaptureRestart.restore(partialCaptureSnapshot, partialCaptureCheckpoint), true, 'root partial capture survives exact restart/restore');
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
eq(restarted.restore(partialSnapshot, partialCheckpoint), true, 'clean snapshot restores against independent namespace-bound head and backup checkpoint');
eq(restarted.getEffect('sp_restore', 'op_restore', 'rail:cap:A').remaining_unadjusted_units, 400n, 'clean restore reconstructs parent remainder');
eq(restarted.getIntentMoney('sp_restore').minorUnits, 4400n, 'clean restore reconstructs aggregate net');

rejects(() => createCanonicalMaterializationState({ persistenceNamespace: NAMESPACE }).restore(partialSnapshot, partialCheckpoint), 'restore without authoritative-head resolver fails closed');
rejects(() => stateForHead(partialHead).restore(partialSnapshot), 'restore without backup checkpoint fails closed');
rejects(() => createCanonicalMaterializationState({ resolveAuthoritativeHead: () => partialHead }).restore(partialSnapshot, partialCheckpoint), 'restore without persistence namespace fails closed');

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
eq(restoredC4.restore(exhaustedSnapshot, exhaustedCheckpoint), true, 'exact authoritative C4 snapshot restores');
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
const forkProbe = createCanonicalMaterializationState({ persistenceNamespace: NAMESPACE, resolveAuthoritativeHead: () => dynamicHead });
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

// Reviewer REVISE: a higher head is accepted only as an exact-prior-bound, owner-scoped
// CAS/equivalent transition whose immutable effect lineage extends the accepted frontier.
let transitionResolvedHead = exhaustedHead;
const transitionProbe = createCanonicalMaterializationState({
  persistenceNamespace: NAMESPACE,
  resolveAuthoritativeHead: () => transitionResolvedHead,
  verifyAuthoritativeHeadTransition: verifyTransitionShape
});
eq(transitionProbe.restore(exhaustedSnapshot, exhaustedCheckpoint), true, 'transition probe starts from exact C4');
transitionResolvedHead = transitionHead(c5Head, exhaustedHead);
eq(transitionProbe.restore(c5Snapshot, c5Checkpoint), true, 'exact C4 to C5 descendant transition with prior-head CAS proof is accepted');
eq(transitionProbe.getEffect('sp_restore', 'op_restore', 'rail:cap:B').remaining_unadjusted_units, 3999n, 'valid C5 descendant applies only its new bounded adjustment');

let bareAdvanceHead = exhaustedHead;
const bareAdvanceProbe = createCanonicalMaterializationState({
  persistenceNamespace: NAMESPACE,
  resolveAuthoritativeHead: () => bareAdvanceHead,
  verifyAuthoritativeHeadTransition: verifyTransitionShape
});
eq(bareAdvanceProbe.restore(exhaustedSnapshot, exhaustedCheckpoint), true, 'bare-advance probe starts at C4');
bareAdvanceHead = c5Head;
rejects(() => bareAdvanceProbe.restore(c5Snapshot, c5Checkpoint), 'higher generation without exact prior-head/CAS transition metadata is rejected');

let noVerifierHead = exhaustedHead;
const noVerifierProbe = createCanonicalMaterializationState({
  persistenceNamespace: NAMESPACE,
  resolveAuthoritativeHead: () => noVerifierHead
});
eq(noVerifierProbe.restore(exhaustedSnapshot, exhaustedCheckpoint), true, 'no-verifier probe starts at C4');
noVerifierHead = transitionHead(c5Head, exhaustedHead);
rejects(() => noVerifierProbe.restore(c5Snapshot, c5Checkpoint), 'higher generation without owner-scoped transition verifier is rejected');

// Internally-valid higher-generation fork that claims C4 as predecessor still fails because
// its immutable lineage omits/substitutes previously accepted effects.
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
const divergentProbe = createCanonicalMaterializationState({
  persistenceNamespace: NAMESPACE,
  resolveAuthoritativeHead: () => divergentResolvedHead,
  verifyAuthoritativeHeadTransition: verifyTransitionShape
});
eq(divergentProbe.restore(exhaustedSnapshot, exhaustedCheckpoint), true, 'divergent-lineage probe starts at C4');
const beforeDivergentAdvance = divergentProbe.snapshot();
divergentResolvedHead = divergentTransitionHead;
rejects(() => divergentProbe.restore(divergentSnapshot, divergentCheckpoint), 'higher-generation fork that omits accepted immutable effects is rejected despite plausible transition metadata');
eq(divergentProbe.snapshot(), beforeDivergentAdvance, 'divergent higher-generation rejection leaves C4 state unchanged');

// A competing next-head publication that loses owner-scoped CAS cannot become restore authority.
let rejectedCasHead = exhaustedHead;
const rejectedCasProbe = createCanonicalMaterializationState({
  persistenceNamespace: NAMESPACE,
  resolveAuthoritativeHead: () => rejectedCasHead,
  verifyAuthoritativeHeadTransition: () => false
});
eq(rejectedCasProbe.restore(exhaustedSnapshot, exhaustedCheckpoint), true, 'competing-CAS probe starts at C4');
const beforeRejectedCas = rejectedCasProbe.snapshot();
rejectedCasHead = transitionHead(c5Head, exhaustedHead, 'cas:losing-writer');
rejects(() => rejectedCasProbe.restore(c5Snapshot, c5Checkpoint), 'competing next-head publication rejected by owner-scoped CAS/equivalent cannot restore');
eq(rejectedCasProbe.snapshot(), beforeRejectedCas, 'rejected competing head causes zero partial local mutation');

// TOCTOU: re-resolve the authority immediately before commit. If another writer advances
// the head after validation, the stale read cannot commit backward over the newer frontier.
eq(apply(newerBackupState, { ref: 'rail:refund:B:1:second', kind: 'refund', units: 1, parent: 'rail:cap:B' }), true, 'C5 fixture can advance to C6 for concurrent-head simulation');
const c6Head = newerBackupState.headCandidate();
const c6TransitionHead = transitionHead(c6Head, c5Head);
let resolverMode = 'baseline';
let transitionResolveCalls = 0;
const concurrentProbe = createCanonicalMaterializationState({
  persistenceNamespace: NAMESPACE,
  resolveAuthoritativeHead: () => {
    if (resolverMode === 'baseline') return exhaustedHead;
    transitionResolveCalls += 1;
    return transitionResolveCalls === 1 ? transitionHead(c5Head, exhaustedHead) : c6TransitionHead;
  },
  verifyAuthoritativeHeadTransition: verifyTransitionShape
});
eq(concurrentProbe.restore(exhaustedSnapshot, exhaustedCheckpoint), true, 'concurrency probe starts at C4');
const beforeConcurrentAdvance = concurrentProbe.snapshot();
resolverMode = 'concurrent';
transitionResolveCalls = 0;
rejects(() => concurrentProbe.restore(c5Snapshot, c5Checkpoint), 'head changing from C5 to C6 between validation and commit rejects stale restore');
eq(concurrentProbe.snapshot(), beforeConcurrentAdvance, 'TOCTOU head-change rejection is atomic');

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
eq(reorderedState.restore(reordered, exhaustedCheckpoint), true, 'out-of-order persisted rows reconstruct deterministically');
eq(reorderedState.getEffect('sp_restore', 'op_restore', 'rail:cap:A').remaining_unadjusted_units, 0n, 'out-of-order recovery preserves exhausted parent');

const atomicProbe = stateForHead(partialHead);
eq(atomicProbe.restore(partialSnapshot, partialCheckpoint), true, 'atomic probe starts from valid restored state');
const beforeFailedRestore = atomicProbe.snapshot();
rejects(() => atomicProbe.restore(aggregateDrift, partialCheckpoint), 'inconsistent restore is rejected before commit');
eq(atomicProbe.snapshot(), beforeFailedRestore, 'failed restore leaves prior state byte-for-byte structurally unchanged');

console.log(JSON.stringify({ suite: 'phase-c1-restore-integrity', checks, result: 'pass' }));
