import assert from 'node:assert/strict';
import { createCanonicalMaterializationState } from './materialization-state.mjs';

let checks = 0;
const eq = (actual, expected, message) => { checks += 1; assert.deepEqual(actual, expected, message); };
const rejects = (fn, message) => { checks += 1; assert.throws(fn, undefined, message); };

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

const stateForHead = head => createCanonicalMaterializationState({ resolveAuthoritativeHead: () => head });
const findEffect = (snapshot, key) => snapshot.effects.find(([candidate]) => candidate === key)?.[1];
const findIntent = (snapshot, key) => snapshot.intents.find(([candidate]) => candidate === key)?.[1];

// Build C3: parent A has only 400 units remaining.
let resolvedHead = null;
let live = createCanonicalMaterializationState({ resolveAuthoritativeHead: () => resolvedHead });
eq(apply(live, { ref: 'rail:cap:A', kind: 'capture', units: 1000 }), true, 'capture A materializes');
eq(apply(live, { ref: 'rail:cap:B', kind: 'capture', units: 4000 }), true, 'capture B materializes');
eq(apply(live, { ref: 'rail:refund:A:600', kind: 'refund', units: 600, parent: 'rail:cap:A' }), true, 'refund consumes 600 from parent A');
eq(live.getEffect('sp_restore', 'op_restore', 'rail:cap:A').remaining_unadjusted_units, 400n, 'live parent remainder is 400');
eq(live.getIntentMoney('sp_restore').minorUnits, 4400n, 'live aggregate net is 4400');

const partialSnapshot = live.snapshot();
const partialCheckpoint = live.checkpoint();
const partialHead = live.headCandidate();
resolvedHead = partialHead;

// Clean startup resolves the independently owned current head first, then restores.
const restarted = stateForHead(partialHead);
eq(restarted.restore(partialSnapshot, partialCheckpoint), true, 'clean snapshot restores against independent authoritative head and backup checkpoint');
eq(restarted.getEffect('sp_restore', 'op_restore', 'rail:cap:A').remaining_unadjusted_units, 400n, 'clean restore reconstructs parent remainder');
eq(restarted.getIntentMoney('sp_restore').minorUnits, 4400n, 'clean restore reconstructs aggregate net');

// Snapshot/checkpoint alone are evidence, never freshness authority.
rejects(() => createCanonicalMaterializationState().restore(partialSnapshot, partialCheckpoint), 'restore without authoritative-head resolver fails closed');
rejects(() => stateForHead(partialHead).restore(partialSnapshot), 'restore without backup checkpoint fails closed');

// Reviewer-required integrity negatives continue to fail under an otherwise-current head.
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

// Advance the accepted frontier to C4 by exhausting parent A.
live = restarted;
eq(apply(live, { ref: 'rail:reversal:A:400', kind: 'reversal', units: 400, parent: 'rail:cap:A' }), true, 'post-restart reconciliation consumes exact remaining parent value once');
eq(live.getEffect('sp_restore', 'op_restore', 'rail:cap:A').remaining_unadjusted_units, 0n, 'parent A is exhausted at C4');
eq(live.getIntentMoney('sp_restore').minorUnits, 4000n, 'C4 aggregate net reflects exact adjustment');

const exhaustedSnapshot = live.snapshot();
const exhaustedCheckpoint = live.checkpoint();
const exhaustedHead = live.headCandidate();

// P0 anti-rollback: an in-process restore can never move the already accepted C4
// frontier back to a stale-but-internally-valid C3 snapshot + matching C3 checkpoint.
resolvedHead = partialHead;
const beforeInProcessRollback = live.snapshot();
rejects(() => live.restore(partialSnapshot, partialCheckpoint), 'in-process stale C3 head cannot roll accepted C4 frontier backward');
eq(live.snapshot(), beforeInProcessRollback, 'rejected in-process rollback is atomic');
eq(live.getEffect('sp_restore', 'op_restore', 'rail:cap:A').remaining_unadjusted_units, 0n, 'rejected in-process rollback keeps exhausted parent at zero');

// Fresh startup must resolve C4 independently before considering a C3 backup.
const freshAtC4 = stateForHead(exhaustedHead);
rejects(() => freshAtC4.restore(partialSnapshot, partialCheckpoint), 'fresh startup rejects valid stale C3 snapshot when authoritative head is C4');

// Exact C4 still restores and preserves exhausted parent capacity.
const restoredC4 = stateForHead(exhaustedHead);
eq(restoredC4.restore(exhaustedSnapshot, exhaustedCheckpoint), true, 'exact authoritative C4 snapshot restores');
eq(restoredC4.getEffect('sp_restore', 'op_restore', 'rail:cap:A').remaining_unadjusted_units, 0n, 'exact C4 restore preserves exhausted parent');
eq(apply(restoredC4, { ref: 'rail:refund:A:fresh', kind: 'refund', units: 1, parent: 'rail:cap:A' }), false, 'C4 restart cannot rematerialize consumed parent value');

// A copied/recomputed snapshot+checkpoint pair cannot self-authorize. Build a
// different internally valid C3 lineage with its own correctly recomputed digest.
const fabricated = createCanonicalMaterializationState();
eq(apply(fabricated, { ref: 'rail:cap:A', kind: 'capture', units: 1000 }), true, 'fabricated capture A materializes');
eq(apply(fabricated, { ref: 'rail:cap:B', kind: 'capture', units: 4000 }), true, 'fabricated capture B materializes');
eq(apply(fabricated, { ref: 'rail:refund:B:100', kind: 'refund', units: 100, parent: 'rail:cap:B' }), true, 'fabricated alternate lineage is internally valid');
const fabricatedSnapshot = fabricated.snapshot();
const fabricatedCheckpoint = fabricated.checkpoint();
rejects(() => stateForHead(exhaustedHead).restore(fabricatedSnapshot, fabricatedCheckpoint), 'recomputed snapshot+checkpoint digest pair cannot self-authorize against independent C4 head');

// Same generation with a different lineage digest is a fork and fails closed.
const fork = createCanonicalMaterializationState();
eq(apply(fork, { ref: 'rail:cap:A', kind: 'capture', units: 1000 }), true, 'fork capture A materializes');
eq(apply(fork, { ref: 'rail:cap:B', kind: 'capture', units: 4000 }), true, 'fork capture B materializes');
eq(apply(fork, { ref: 'rail:refund:A:500', kind: 'refund', units: 500, parent: 'rail:cap:A' }), true, 'fork adjustment 1 materializes');
eq(apply(fork, { ref: 'rail:refund:B:100', kind: 'refund', units: 100, parent: 'rail:cap:B' }), true, 'fork adjustment 2 materializes');
const forkHead = fork.headCandidate();
let dynamicHead = exhaustedHead;
const forkProbe = createCanonicalMaterializationState({ resolveAuthoritativeHead: () => dynamicHead });
eq(forkProbe.restore(exhaustedSnapshot, exhaustedCheckpoint), true, 'fork probe accepts authoritative C4 first');
dynamicHead = forkHead;
rejects(() => forkProbe.restore(exhaustedSnapshot, exhaustedCheckpoint), 'same-generation different-digest authoritative head is rejected as fork');

// Backup data cannot promote itself ahead of an independently accepted head.
const newerBackupState = stateForHead(exhaustedHead);
eq(newerBackupState.restore(exhaustedSnapshot, exhaustedCheckpoint), true, 'newer-backup fixture begins at C4');
eq(apply(newerBackupState, { ref: 'rail:refund:B:1', kind: 'refund', units: 1, parent: 'rail:cap:B' }), true, 'newer-backup fixture advances to C5');
const c5Snapshot = newerBackupState.snapshot();
const c5Checkpoint = newerBackupState.checkpoint();
rejects(() => stateForHead(exhaustedHead).restore(c5Snapshot, c5Checkpoint), 'backup newer than accepted C4 head cannot self-promote authority');

// Resolver scope/version are fail-closed too.
const wrongDomainHead = { ...exhaustedHead, domain: 'OTHER:materialization' };
rejects(() => stateForHead(wrongDomainHead).restore(exhaustedSnapshot, exhaustedCheckpoint), 'wrong authoritative-head domain is rejected');
const wrongVersionHead = { ...exhaustedHead, head_version: 999 };
rejects(() => stateForHead(wrongVersionHead).restore(exhaustedSnapshot, exhaustedCheckpoint), 'wrong authoritative-head version is rejected');

// Existing stale/mixed snapshot integrity checks remain active.
const mixedGeneration = structuredClone(exhaustedSnapshot);
mixedGeneration.effects = structuredClone(partialSnapshot.effects);
rejects(() => stateForHead(exhaustedHead).restore(mixedGeneration, exhaustedCheckpoint), 'partial/mixed-generation snapshot is rejected');
const resurrectedParent = structuredClone(exhaustedSnapshot);
findEffect(resurrectedParent, 'sp_restore:op_restore:rail:cap:A').remaining_unadjusted_units = '1';
rejects(() => stateForHead(exhaustedHead).restore(resurrectedParent, exhaustedCheckpoint), 'exhausted parent resurrection is rejected');
const duplicateEffect = structuredClone(exhaustedSnapshot);
duplicateEffect.effects.push(structuredClone(duplicateEffect.effects[0]));
rejects(() => stateForHead(exhaustedHead).restore(duplicateEffect, exhaustedCheckpoint), 'duplicate persisted effect row is rejected');

// Row order is non-authoritative; exact current lineage still reconstructs.
const reordered = structuredClone(exhaustedSnapshot);
reordered.effects.reverse();
reordered.intents.reverse();
reordered.authoritativeEffects.reverse();
const reorderedState = stateForHead(exhaustedHead);
eq(reorderedState.restore(reordered, exhaustedCheckpoint), true, 'out-of-order persisted rows reconstruct deterministically');
eq(reorderedState.getEffect('sp_restore', 'op_restore', 'rail:cap:A').remaining_unadjusted_units, 0n, 'out-of-order recovery preserves exhausted parent');

// Failed restore is atomic: no partially validated structure or frontier leaks.
const atomicProbe = stateForHead(partialHead);
eq(atomicProbe.restore(partialSnapshot, partialCheckpoint), true, 'atomic probe starts from valid restored state');
const beforeFailedRestore = atomicProbe.snapshot();
rejects(() => atomicProbe.restore(aggregateDrift, partialCheckpoint), 'inconsistent restore is rejected before commit');
eq(atomicProbe.snapshot(), beforeFailedRestore, 'failed restore leaves prior state byte-for-byte structurally unchanged');

console.log(JSON.stringify({ suite: 'phase-c1-restore-integrity', checks, result: 'pass' }));
