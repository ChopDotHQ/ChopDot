// Preserve the complete previously-cleared Phase C1 regression suite unchanged.
// Its integrated materialization fixture is revision-6 history only; the canonical
// security-revision-7 proof -> materialization model and focused tests are below.
import './verify-regression-baseline.mjs';

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createCanonicalMaterializationState } from './materialization-state.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const spend = JSON.parse(fs.readFileSync(path.join(here, 'spend-intent.contract.json'), 'utf8'));

let checks = 0;
const ok = (value, message) => { checks += 1; assert.ok(value, message); };
const eq = (actual, expected, message) => { checks += 1; assert.deepEqual(actual, expected, message); };

// Security-revision-7 contract surface: integrated canonical materialization must
// conserve each exact parent capture, not merely the aggregate SpendIntent net.
eq(spend.security_revision, 7, 'security revision 7 carries integrated parent conservation');
eq(spend.materialization.adjustable_capture_state.adjustment_parent_must_match_same_spend_intent_and_operation, true, 'adjustment parent ownership is exact intent+operation');
eq(spend.materialization.adjustable_capture_state.adjustment_units_must_be_positive, true, 'adjustment units must be positive');
eq(spend.materialization.adjustable_capture_state.adjustment_units_may_exceed_parent_remaining, false, 'adjustment cannot exceed parent remaining');
eq(spend.materialization.adjustable_capture_state.refund_and_reversal_share_one_parent_remaining_balance, true, 'refund and reversal share one parent balance');
eq(spend.materialization.adjustable_capture_state.parent_remaining_decrements_atomically_after_proof_and_authoritative_effect_dedupe, true, 'parent decrement occurs only after proof and dedupe');
eq(spend.recovery.parent_adjustment_remaining_must_be_preserved_or_authoritatively_reconstructed, true, 'recovery preserves parent remaining truth');
eq(spend.recovery.restore_may_recreate_consumed_parent_value, false, 'restore cannot recreate consumed parent value');

const present = value =>
  value !== null &&
  value !== undefined &&
  (typeof value !== 'string' || value.trim().length > 0);
const canonicalIntegerString = value => typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value);
const canonicalExponent = value => Number.isInteger(value) && value >= 0 && value <= 18;
const moneyFrom = obj => {
  if (!canonicalIntegerString(obj.money_minor_units)) return null;
  if (!present(obj.money_currency) || !canonicalExponent(obj.money_exponent)) return null;
  return { minorUnits: BigInt(obj.money_minor_units), currency: obj.money_currency, exponent: obj.money_exponent };
};
const samePartition = (a, b) => a.currency === b.currency && a.exponent === b.exponent;
const parentRequired = kind => spend.proof.adjustment_parent_binding.required_for_kinds.includes(kind);

const baseExpected = {
  spend_intent_id:'sp_parent', operation_id:'op_parent', effect_id:'effect_base',
  authoritative_effect_ref:'rail:base', effect_kind:'capture', authoritative_parent_effect_ref:null,
  adapter_id:'adapter_fixture', rail_identity:'fixture_rail',
  amount:'10.00', asset:'USD', money_minor_units:'1000', money_currency:'USD', money_exponent:2,
  authorization_version:1, target_digest:'target:merchant-7',
  policy_snapshot_digest:'policy:p9', approval_snapshot_digest:'approval:a3'
};
const expectedFor = overrides => ({ ...baseExpected, ...overrides });
const readbackFor = expected =>
  `verified:${expected.adapter_id}:${expected.operation_id}:${expected.authoritative_effect_ref}:v${expected.authorization_version}:${expected.effect_kind}:${expected.authoritative_parent_effect_ref ?? 'root'}:${expected.money_minor_units}:${expected.money_currency}:e${expected.money_exponent}`;
const proofFor = expected => ({
  ...expected,
  source:'authoritative_readback',
  proof_id:`proof:${expected.effect_id}`,
  observed_at:'2026-09-15T20:00:00Z',
  finality:'final',
  readback_ref:readbackFor(expected)
});
const adapterProofPolicies = {
  adapter_fixture: {
    authoritative_sources: new Set(['authoritative_readback']),
    terminal_finality: new Set(['final']),
    verify_readback: (proof, expected) => proof.readback_ref === readbackFor(expected)
  }
};
const proofMatches = (proof, expected) => {
  for (const field of spend.proof.exact_binding_required) {
    if (!present(proof[field]) || !present(expected[field]) || proof[field] !== expected[field]) return false;
  }
  if (parentRequired(expected.effect_kind)) {
    const parentField = spend.proof.adjustment_parent_binding.field;
    if (!present(proof[parentField]) || !present(expected[parentField]) || proof[parentField] !== expected[parentField]) return false;
  } else if (proof.authoritative_parent_effect_ref !== null && proof.authoritative_parent_effect_ref !== undefined) {
    return false;
  }
  const proofMoney = moneyFrom(proof);
  const expectedMoney = moneyFrom(expected);
  if (!proofMoney || !expectedMoney || !samePartition(proofMoney, expectedMoney) || proofMoney.minorUnits !== expectedMoney.minorUnits) return false;
  const verifier = adapterProofPolicies[proof.adapter_id];
  if (!verifier || !verifier.authoritative_sources.has(proof.source) || !verifier.terminal_finality.has(proof.finality)) return false;
  if (spend.proof.explicit_nonterminal_finality_classes.includes(proof.finality)) return false;
  if (!proof.readback_ref || !verifier.verify_readback(proof, expected)) return false;
  return true;
};

const MATERIALIZATION_NAMESPACE = 'phase-c1:sp_parent';
let authoritativeHead = null;
let materializer = createCanonicalMaterializationState({
  persistenceNamespace: MATERIALIZATION_NAMESPACE,
  resolveAuthoritativeHead: () => authoritativeHead
});
const authorizedMoney = { minorUnits:10000n, currency:'USD', exponent:2 };
const deriveEffect = ({ state, proof, expected, authorized = authorizedMoney }) => {
  const effectMoney = moneyFrom(expected);
  return materializer.materialize({
    state,
    proofAccepted: proofMatches(proof, expected),
    expected,
    effectMoney,
    authorizedMoney: authorized
  });
};

// Two captures under one exact SpendIntent/operation make aggregate-net-only checks
// insufficient: parent A is deliberately smaller than parent B.
const captureA = expectedFor({
  effect_id:'cap_A', authoritative_effect_ref:'rail:cap:A', effect_kind:'capture',
  amount:'10.00', money_minor_units:'1000'
});
const captureB = expectedFor({
  effect_id:'cap_B', authoritative_effect_ref:'rail:cap:B', effect_kind:'capture',
  amount:'40.00', money_minor_units:'4000'
});
eq(deriveEffect({ state:'captured', proof:proofFor(captureA), expected:captureA }), true, 'capture A materializes');
eq(deriveEffect({ state:'captured', proof:proofFor(captureB), expected:captureB }), true, 'capture B materializes');
eq(materializer.getIntentMoney('sp_parent').minorUnits, 5000n, 'aggregate intent holds both captures');
eq(materializer.getEffect('sp_parent','op_parent','rail:cap:A').remaining_unadjusted_units, 1000n, 'capture A starts with exact remaining units');

// (a) Aggregate net would remain non-negative, but parent A cannot be over-consumed.
const overRefundA = expectedFor({
  effect_id:'refund_A_over', authoritative_effect_ref:'rail:refund:A:over', effect_kind:'refund',
  authoritative_parent_effect_ref:'rail:cap:A', amount:'15.00', money_minor_units:'1500'
});
eq(proofMatches(proofFor(overRefundA), overRefundA), true, 'over-parent adjustment can have otherwise-valid authoritative proof');
eq(deriveEffect({ state:'reversed', proof:proofFor(overRefundA), expected:overRefundA }), false, 'parent A cannot be over-refunded even when aggregate net is sufficient');
eq(materializer.getIntentMoney('sp_parent').minorUnits, 5000n, 'failed over-parent adjustment does not mutate aggregate state');
eq(materializer.getEffect('sp_parent','op_parent','rail:cap:A').remaining_unadjusted_units, 1000n, 'failed over-parent adjustment does not consume parent');

// Spend 600 of A, persist/restart, then prove the exact 400 remainder survives restore.
const refundA600 = expectedFor({
  effect_id:'refund_A_600', authoritative_effect_ref:'rail:refund:A:600', effect_kind:'refund',
  authoritative_parent_effect_ref:'rail:cap:A', amount:'6.00', money_minor_units:'600'
});
eq(deriveEffect({ state:'reversed', proof:proofFor(refundA600), expected:refundA600 }), true, 'first refund consumes part of parent A');
eq(materializer.getEffect('sp_parent','op_parent','rail:cap:A').remaining_unadjusted_units, 400n, 'parent A remainder decrements atomically');
eq(materializer.getIntentMoney('sp_parent').minorUnits, 4400n, 'first refund updates canonical intent net exactly once');

const persistedAfterRefund = materializer.snapshot();
const checkpointAfterRefund = materializer.checkpoint();
authoritativeHead = materializer.headCandidate();
const restarted = createCanonicalMaterializationState({
  persistenceNamespace: MATERIALIZATION_NAMESPACE,
  resolveAuthoritativeHead: () => authoritativeHead
});
eq(restarted.restore(persistedAfterRefund, checkpointAfterRefund), true, 'restart restores canonical materialization state against namespace-bound authoritative head');
materializer = restarted;
eq(materializer.getEffect('sp_parent','op_parent','rail:cap:A').remaining_unadjusted_units, 400n, 'restart preserves consumed parent capacity');

// (b) Refund + reversal share the same parent remainder and cannot double-consume it.
const reversalA500 = expectedFor({
  effect_id:'reversal_A_500', authoritative_effect_ref:'rail:reversal:A:500', effect_kind:'reversal',
  authoritative_parent_effect_ref:'rail:cap:A', amount:'5.00', money_minor_units:'500'
});
eq(deriveEffect({ state:'reversed', proof:proofFor(reversalA500), expected:reversalA500 }), false, 'refund plus reversal cannot exceed shared parent remainder');
eq(materializer.getEffect('sp_parent','op_parent','rail:cap:A').remaining_unadjusted_units, 400n, 'failed cumulative adjustment leaves parent remainder unchanged');

const reversalA400 = expectedFor({
  effect_id:'reversal_A_400', authoritative_effect_ref:'rail:reversal:A:400', effect_kind:'reversal',
  authoritative_parent_effect_ref:'rail:cap:A', amount:'4.00', money_minor_units:'400'
});
eq(deriveEffect({ state:'reversed', proof:proofFor(reversalA400), expected:reversalA400 }), true, 'reversal may consume exactly the final parent remainder');
eq(materializer.getEffect('sp_parent','op_parent','rail:cap:A').remaining_unadjusted_units, 0n, 'parent A is exhausted exactly once');
eq(materializer.getIntentMoney('sp_parent').minorUnits, 4000n, 'parent A full adjustment leaves only capture B net');

// (c) Fresh internal and authoritative adjustment IDs do not recreate exhausted capacity.
const freshAfterExhaustion = expectedFor({
  effect_id:'refund_A_fresh', authoritative_effect_ref:'rail:refund:A:fresh', effect_kind:'refund',
  authoritative_parent_effect_ref:'rail:cap:A', amount:'0.01', money_minor_units:'1'
});
eq(deriveEffect({ state:'reversed', proof:proofFor(freshAfterExhaustion), expected:freshAfterExhaustion }), false, 'fresh adjustment IDs cannot bypass exhausted parent capacity');

const replayRefund = expectedFor({
  effect_id:'refund_A_600_new_internal', authoritative_effect_ref:'rail:refund:A:600', effect_kind:'refund',
  authoritative_parent_effect_ref:'rail:cap:A', amount:'6.00', money_minor_units:'600'
});
eq(deriveEffect({ state:'reversed', proof:proofFor(replayRefund), expected:replayRefund }), false, 'same authoritative adjustment effect cannot rematerialize under a fresh internal ID');

// (d) Same-money parent refs from another operation or intent cannot satisfy ownership.
const crossOperation = expectedFor({
  operation_id:'op_other', effect_id:'refund_cross_op', authoritative_effect_ref:'rail:refund:cross-op', effect_kind:'refund',
  authoritative_parent_effect_ref:'rail:cap:B', amount:'1.00', money_minor_units:'100'
});
eq(proofMatches(proofFor(crossOperation), crossOperation), true, 'cross-operation candidate may have internally consistent proof fields');
eq(deriveEffect({ state:'reversed', proof:proofFor(crossOperation), expected:crossOperation }), false, 'parent from another operation cannot be substituted');

const crossIntent = expectedFor({
  spend_intent_id:'sp_other', effect_id:'refund_cross_intent', authoritative_effect_ref:'rail:refund:cross-intent', effect_kind:'refund',
  authoritative_parent_effect_ref:'rail:cap:B', amount:'1.00', money_minor_units:'100'
});
eq(proofMatches(proofFor(crossIntent), crossIntent), true, 'cross-intent candidate may have internally consistent proof fields');
eq(deriveEffect({ state:'reversed', proof:proofFor(crossIntent), expected:crossIntent }), false, 'parent from another SpendIntent cannot be substituted');

// Out-of-order adjustment before its parent must fail closed.
const orderedState = createCanonicalMaterializationState();
const missingParentAdjustment = expectedFor({
  spend_intent_id:'sp_order', operation_id:'op_order', effect_id:'refund_before_parent',
  authoritative_effect_ref:'rail:refund:before-parent', effect_kind:'refund',
  authoritative_parent_effect_ref:'rail:cap:not-yet-seen', amount:'1.00', money_minor_units:'100'
});
eq(orderedState.materialize({
  state:'reversed',
  proofAccepted:proofMatches(proofFor(missingParentAdjustment), missingParentAdjustment),
  expected:missingParentAdjustment,
  effectMoney:moneyFrom(missingParentAdjustment),
  authorizedMoney
}), false, 'out-of-order adjustment cannot materialize before authoritative parent');

// Recovery after full exhaustion cannot recreate already-consumed value.
const exhaustedSnapshot = materializer.snapshot();
const exhaustedCheckpoint = materializer.checkpoint();
authoritativeHead = materializer.headCandidate();
const restoredExhausted = createCanonicalMaterializationState({
  persistenceNamespace: MATERIALIZATION_NAMESPACE,
  resolveAuthoritativeHead: () => authoritativeHead
});
eq(restoredExhausted.restore(exhaustedSnapshot, exhaustedCheckpoint), true, 'exhausted parent state restores against namespace-bound authoritative head');
eq(restoredExhausted.getEffect('sp_parent','op_parent','rail:cap:A').remaining_unadjusted_units, 0n, 'restore keeps exhausted parent at zero');
materializer = restoredExhausted;
eq(deriveEffect({ state:'reversed', proof:proofFor(freshAfterExhaustion), expected:freshAfterExhaustion }), false, 'restore cannot recreate consumed parent capacity');

console.log(JSON.stringify({ suite:'phase-c1-integrated-parent-conservation', checks, result:'pass' }));
