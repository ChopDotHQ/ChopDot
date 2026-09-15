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

const findEffect = (snapshot, key) => snapshot.effects.find(([candidate]) => candidate === key)?.[1];
const findIntent = (snapshot, key) => snapshot.intents.find(([candidate]) => candidate === key)?.[1];

// Build one authoritative lineage where parent A has only 400 units remaining.
let live = createCanonicalMaterializationState();
eq(apply(live, { ref: 'rail:cap:A', kind: 'capture', units: 1000 }), true, 'capture A materializes');
eq(apply(live, { ref: 'rail:cap:B', kind: 'capture', units: 4000 }), true, 'capture B materializes');
eq(apply(live, { ref: 'rail:refund:A:600', kind: 'refund', units: 600, parent: 'rail:cap:A' }), true, 'refund consumes 600 from parent A');
eq(live.getEffect('sp_restore', 'op_restore', 'rail:cap:A').remaining_unadjusted_units, 400n, 'live parent remainder is 400');
eq(live.getIntentMoney('sp_restore').minorUnits, 4400n, 'live aggregate net is 4400');

const partialSnapshot = live.snapshot();
const partialCheckpoint = live.checkpoint();

// Clean restart must reconstruct the same derived state from immutable effect lineage.
const restarted = createCanonicalMaterializationState();
eq(restarted.restore(partialSnapshot, partialCheckpoint), true, 'clean snapshot restores against trusted checkpoint');
eq(restarted.getEffect('sp_restore', 'op_restore', 'rail:cap:A').remaining_unadjusted_units, 400n, 'clean restore reconstructs parent remainder');
eq(restarted.getIntentMoney('sp_restore').minorUnits, 4400n, 'clean restore reconstructs aggregate net');

// A separately trusted checkpoint is mandatory; a snapshot cannot self-authorize.
rejects(() => createCanonicalMaterializationState().restore(partialSnapshot), 'restore without trusted checkpoint fails closed');

// Reviewer-required negative: inflated parent remainder cannot resurrect consumed value.
const inflatedRemainder = structuredClone(partialSnapshot);
findEffect(inflatedRemainder, 'sp_restore:op_restore:rail:cap:A').remaining_unadjusted_units = '1000';
rejects(
  () => createCanonicalMaterializationState().restore(inflatedRemainder, partialCheckpoint),
  'inflated remaining_unadjusted_units is rejected'
);

// Reviewer-required negative: missing or replayed dedupe state cannot drift from effects.
const missingDedupe = structuredClone(partialSnapshot);
missingDedupe.authoritativeEffects = missingDedupe.authoritativeEffects.filter(value => value !== 'sp_restore:rail:refund:A:600');
rejects(
  () => createCanonicalMaterializationState().restore(missingDedupe, partialCheckpoint),
  'missing authoritative-effect dedupe entry is rejected'
);
const replayedDedupe = structuredClone(partialSnapshot);
replayedDedupe.authoritativeEffects.push(replayedDedupe.authoritativeEffects[0]);
rejects(
  () => createCanonicalMaterializationState().restore(replayedDedupe, partialCheckpoint),
  'replayed authoritative-effect dedupe entry is rejected'
);

// Reviewer-required negative: aggregate totals are derived truth, never independently trusted.
const aggregateDrift = structuredClone(partialSnapshot);
findIntent(aggregateDrift, 'sp_restore').minorUnits = '5000';
rejects(
  () => createCanonicalMaterializationState().restore(aggregateDrift, partialCheckpoint),
  'aggregate-vs-effect drift is rejected'
);

// Reviewer-required negative: parent ownership/key/operation lineage mismatch fails closed.
const parentMismatch = structuredClone(partialSnapshot);
const refundRow = findEffect(parentMismatch, 'sp_restore:op_restore:rail:refund:A:600');
refundRow.operation_id = 'op_other';
rejects(
  () => createCanonicalMaterializationState().restore(parentMismatch, partialCheckpoint),
  'parent key/intent/operation mismatch is rejected'
);

// Positive restart/reconciliation: the exact remaining 400 may be consumed once.
live = restarted;
eq(apply(live, { ref: 'rail:reversal:A:400', kind: 'reversal', units: 400, parent: 'rail:cap:A' }), true, 'post-restart reconciliation may consume exact remaining parent value once');
eq(live.getEffect('sp_restore', 'op_restore', 'rail:cap:A').remaining_unadjusted_units, 0n, 'parent A is exhausted after reconciled reversal');
eq(live.getIntentMoney('sp_restore').minorUnits, 4000n, 'aggregate net reflects exact post-restart adjustment');

const exhaustedSnapshot = live.snapshot();
const exhaustedCheckpoint = live.checkpoint();

// Reviewer-required negative: stale/forked and mixed-generation checkpoints are rejected.
rejects(
  () => createCanonicalMaterializationState().restore(partialSnapshot, exhaustedCheckpoint),
  'stale/forked snapshot cannot satisfy newer trusted checkpoint'
);
const mixedGeneration = structuredClone(exhaustedSnapshot);
mixedGeneration.effects = structuredClone(partialSnapshot.effects);
rejects(
  () => createCanonicalMaterializationState().restore(mixedGeneration, exhaustedCheckpoint),
  'partial/mixed-generation snapshot is rejected'
);

// Reviewer-required negative: an exhausted parent cannot be resurrected by restore.
const resurrectedParent = structuredClone(exhaustedSnapshot);
findEffect(resurrectedParent, 'sp_restore:op_restore:rail:cap:A').remaining_unadjusted_units = '1';
rejects(
  () => createCanonicalMaterializationState().restore(resurrectedParent, exhaustedCheckpoint),
  'exhausted parent resurrection is rejected'
);

// Duplicate persisted effect rows fail closed; row order itself is not authority.
const duplicateEffect = structuredClone(exhaustedSnapshot);
duplicateEffect.effects.push(structuredClone(duplicateEffect.effects[0]));
rejects(
  () => createCanonicalMaterializationState().restore(duplicateEffect, exhaustedCheckpoint),
  'duplicate persisted effect row is rejected'
);
const reordered = structuredClone(exhaustedSnapshot);
reordered.effects.reverse();
reordered.intents.reverse();
reordered.authoritativeEffects.reverse();
const reorderedState = createCanonicalMaterializationState();
eq(reorderedState.restore(reordered, exhaustedCheckpoint), true, 'out-of-order persisted rows reconstruct deterministically');
eq(reorderedState.getEffect('sp_restore', 'op_restore', 'rail:cap:A').remaining_unadjusted_units, 0n, 'out-of-order recovery preserves exhausted parent');
eq(apply(reorderedState, { ref: 'rail:refund:A:fresh', kind: 'refund', units: 1, parent: 'rail:cap:A' }), false, 'out-of-order recovery cannot rematerialize consumed parent value');

// A failed restore is atomic: no partially validated structure may leak into state.
const atomicProbe = createCanonicalMaterializationState();
eq(atomicProbe.restore(partialSnapshot, partialCheckpoint), true, 'atomic probe starts from valid restored state');
const beforeFailedRestore = atomicProbe.snapshot();
rejects(
  () => atomicProbe.restore(aggregateDrift, partialCheckpoint),
  'inconsistent restore is rejected before commit'
);
eq(atomicProbe.snapshot(), beforeFailedRestore, 'failed restore leaves prior state byte-for-byte structurally unchanged');

console.log(JSON.stringify({ suite: 'phase-c1-restore-integrity', checks, result: 'pass' }));
