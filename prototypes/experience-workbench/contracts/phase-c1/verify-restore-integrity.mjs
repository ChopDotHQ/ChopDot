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

const stateForHead = (head, namespace = NAMESPACE) => createCanonicalMaterializationState({
  persistenceNamespace: namespace,
  resolveAuthoritativeHead: () => head
});
const findEffect = (snapshot, key) => snapshot.effects.find(([candidate]) => candidate === key)?.[1];
const findIntent = (snapshot, key) => snapshot.intents.find(([candidate]) => candidate === key)?.[1];

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

const newerBackupState = stateForHead(exhaustedHead);
eq(newerBackupState.restore(exhaustedSnapshot, exhaustedCheckpoint), true, 'newer-backup fixture begins at C4');
eq(apply(newerBackupState, { ref: 'rail:refund:B:1', kind: 'refund', units: 1, parent: 'rail:cap:B' }), true, 'newer-backup fixture advances to C5');
const c5Snapshot = newerBackupState.snapshot();
const c5Checkpoint = newerBackupState.checkpoint();
rejects(() => stateForHead(exhaustedHead).restore(c5Snapshot, c5Checkpoint), 'backup newer than accepted C4 head cannot self-promote authority');

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
