import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const spend = JSON.parse(fs.readFileSync(path.join(here, 'spend-intent.contract.json'), 'utf8'));

let checks = 0;
const ok = (value, message) => { checks += 1; assert.ok(value, message); };
const eq = (actual, expected, message) => { checks += 1; assert.deepEqual(actual, expected, message); };

eq(spend.security_revision, 5, 'proof/materialization authority security revision is active');
eq(spend.operation_value.immutable_within_authorization_version, true, 'authorized value is immutable within an authorization version');
eq(spend.operation_value.cumulative_capture_or_partial_may_exceed_authorized_amount, false, 'capture total cannot exceed authorized amount');
eq(spend.operation_value.bound_change_requires_explicit_versioned_authorized_adjustment, true, 'bound change requires explicit versioned authorization');
eq(spend.operation_value.versioned_authorized_adjustment_rebinds_policy_and_approval_snapshots, true, 'bound change rebinds policy/approval snapshots');
eq(spend.operation_value.operation_asset_must_remain_constant, true, 'asset is conserved across an operation lineage');
eq(spend.operation_value.authorization_adjustment_requires_fresh_current_authority, true, 'bound change requires fresh current authority');
eq(spend.operation_value.authorization_adjustment_requires_unique_replay_protected_id, true, 'authorization adjustment has replay-protected identity');
eq(spend.operation_value.pending_or_unknown_prior_execution_may_gain_fresh_dispatch_authority_from_adjustment, false, 'unresolved execution cannot gain fresh dispatch authority');
eq(spend.authorization_adjustment.unique_id_required, true, 'authorization adjustment ID is required');
eq(spend.authorization_adjustment.replay_allowed, false, 'authorization adjustment replay is forbidden');
eq(spend.authorization_adjustment.effect_time_authority_revalidation_required, true, 'authorization adjustment authority revalidates at effect time');
eq(spend.authorization_adjustment.pending_or_unknown_prior_execution_blocks_adjustment, true, 'pending/unknown execution blocks bound adjustment');
eq(spend.proof.authoritative_effect_ref_must_be_stable_for_same_external_effect, true, 'external effect identity is stable');
eq(spend.proof.same_authoritative_effect_ref_may_materialize_multiple_internal_effect_ids, false, 'fresh internal IDs cannot duplicate one external effect');
eq(spend.proof.exact_binding_required_fields_must_be_present_non_null_non_empty, true, 'exact proof bindings must be present and non-empty');
eq(spend.materialization.internal_effect_id_is_not_authoritative_dedupe_identity, true, 'internal effect ID is not the dedupe authority');
eq(spend.materialization.authoritative_effect_ref_required_before_dedupe, true, 'authoritative external effect identity is required before materialization');
eq(spend.materialization.one_authoritative_effect_ref_maps_to_at_most_one_canonical_effect, true, 'external effect materializes at most once');
eq(spend.lineage.authoritative_effect_ref_unique_within_operation, true, 'authoritative effect refs are unique in an operation');
eq(spend.lineage.adjustment_requires_parent_capture_effect_id, true, 'adjustment references a proven parent capture');
eq(spend.lineage.adjustment_asset_must_equal_parent_capture_asset, true, 'adjustment asset matches parent capture');
eq(spend.lineage.adjustment_amount_may_exceed_parent_remaining_consumable, false, 'adjustment cannot exceed remaining captured value');
eq(spend.lineage.refund_and_reversal_share_parent_remaining_consumable, true, 'refund and reversal consume the same remaining capture balance');
eq(spend.lineage.duplicate_authoritative_adjustment_effect_allowed, false, 'duplicate authoritative adjustment effects fail closed');
ok(spend.proof.shape.includes('authoritative_effect_ref'), 'proof shape contains authoritative_effect_ref');
ok(spend.proof.exact_binding_required.includes('authoritative_effect_ref'), 'proof binding requires authoritative_effect_ref');
ok(spend.proof.shape.includes('authorization_version'), 'proof shape contains authorization_version');
ok(spend.proof.exact_binding_required.includes('authorization_version'), 'proof binding requires authorization_version');
for (const field of ['authorized_amount', 'authorized_asset', 'authorization_version']) {
  ok(spend.required_fields.includes(field), `required field ${field}`);
}
for (const field of spend.authorization_adjustment.required_fields) {
  ok(typeof field === 'string' && field.length > 0, `authorization adjustment field ${field}`);
}

const SCALE = 2n;
const TEN = 10n;
const POW = TEN ** SCALE;
const toUnits = (value) => {
  assert.match(value, /^\d+(?:\.\d{1,2})?$/, `fixture decimal ${value}`);
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * POW + BigInt((fraction + '00').slice(0, 2));
};
const fromUnits = (value) => {
  const whole = value / POW;
  const frac = (value % POW).toString().padStart(Number(SCALE), '0');
  return `${whole}.${frac}`;
};
const present = value =>
  value !== null &&
  value !== undefined &&
  (typeof value !== 'string' || value.trim().length > 0);

const makeOperation = ({
  spend_intent_id = 'sp_1',
  operation_id = 'op_1',
  authorized_amount = '100.00',
  authorized_asset = 'USD',
  authorization_version = 1,
  policy_snapshot_digest = 'policy:p1',
  approval_snapshot_digest = 'approval:a1',
  execution_state = 'not_started'
} = {}) => ({
  spend_intent_id,
  operation_id,
  authorized_asset,
  authorization_version,
  authorized_units: toUnits(authorized_amount),
  policy_snapshot_digest,
  approval_snapshot_digest,
  execution_state,
  captures: new Map(),
  adjustments: new Map(),
  authoritative_effect_refs: new Set(),
  authorization_adjustment_ids: new Set(),
  captured_units: 0n,
  adjusted_units: 0n,
  current_authority: {
    participant_id: 'participant:owner',
    capability_id: 'cap:spend-adjust',
    capability_version: 7,
    scope: 'spend_authorization_adjustment',
    revoked: false
  }
});

const validateCommon = (op, effect) =>
  effect.spend_intent_id === op.spend_intent_id &&
  effect.operation_id === op.operation_id &&
  effect.asset === op.authorized_asset &&
  effect.policy_snapshot_digest === op.policy_snapshot_digest &&
  effect.approval_snapshot_digest === op.approval_snapshot_digest &&
  effect.authorization_version === op.authorization_version &&
  present(effect.effect_id) &&
  present(effect.authoritative_effect_ref);

const applyCapture = (op, effect) => {
  if (!['capture', 'partial_capture'].includes(effect.kind)) return false;
  if (!validateCommon(op, effect)) return false;
  if (op.captures.has(effect.effect_id)) return false;
  if (op.authoritative_effect_refs.has(effect.authoritative_effect_ref)) return false;

  const amount = toUnits(effect.amount);
  if (amount <= 0n) return false;
  if (op.captured_units + amount > op.authorized_units) return false;

  op.captures.set(effect.effect_id, {
    amount_units: amount,
    remaining_units: amount,
    asset: effect.asset,
    authoritative_effect_ref: effect.authoritative_effect_ref
  });
  op.authoritative_effect_refs.add(effect.authoritative_effect_ref);
  op.captured_units += amount;
  return true;
};

const applyAdjustment = (op, effect) => {
  if (!['refund', 'reversal'].includes(effect.kind)) return false;
  if (!validateCommon(op, effect)) return false;
  if (op.adjustments.has(effect.effect_id)) return false;
  if (op.authoritative_effect_refs.has(effect.authoritative_effect_ref)) return false;
  if (!effect.parent_capture_effect_id) return false;

  const parent = op.captures.get(effect.parent_capture_effect_id);
  if (!parent || parent.asset !== effect.asset) return false;

  const amount = toUnits(effect.amount);
  if (amount <= 0n || amount > parent.remaining_units) return false;

  parent.remaining_units -= amount;
  op.adjustments.set(effect.effect_id, {
    amount_units: amount,
    kind: effect.kind,
    parent_capture_effect_id: effect.parent_capture_effect_id,
    authoritative_effect_ref: effect.authoritative_effect_ref
  });
  op.authoritative_effect_refs.add(effect.authoritative_effect_ref);
  op.adjusted_units += amount;
  return true;
};

const verifyAuthorizationAdjustmentAuthority = (op, adjustment, { authorityProofValid = true } = {}) => {
  const authority = op.current_authority;
  if (!authorityProofValid || !authority || authority.revoked) return false;
  if (!present(adjustment.authorization_adjustment_id) || !present(adjustment.authority_proof_ref)) return false;
  if (op.authorization_adjustment_ids.has(adjustment.authorization_adjustment_id)) return false;
  if (adjustment.spend_intent_id !== op.spend_intent_id || adjustment.operation_id !== op.operation_id) return false;
  if (adjustment.prior_authorization_version !== op.authorization_version) return false;
  if (adjustment.authorization_version !== op.authorization_version + 1) return false;
  if (adjustment.authorized_asset !== op.authorized_asset) return false;
  if (adjustment.authorizer_participant_id !== authority.participant_id) return false;
  if (adjustment.authorizer_capability_id !== authority.capability_id) return false;
  if (adjustment.authorizer_capability_version !== authority.capability_version) return false;
  if (adjustment.authorizer_scope !== authority.scope) return false;
  if (['pending', 'unknown'].includes(op.execution_state)) return false;
  if (!present(adjustment.policy_snapshot_digest) || !present(adjustment.approval_snapshot_digest)) return false;
  if (adjustment.policy_snapshot_digest === op.policy_snapshot_digest) return false;
  if (adjustment.approval_snapshot_digest === op.approval_snapshot_digest) return false;
  const newBound = toUnits(adjustment.authorized_amount);
  if (newBound < op.captured_units) return false;
  return true;
};

const applyAuthorizationAdjustment = (op, adjustment, options = {}) => {
  if (!verifyAuthorizationAdjustmentAuthority(op, adjustment, options)) return false;

  op.authorization_adjustment_ids.add(adjustment.authorization_adjustment_id);
  op.authorization_version = adjustment.authorization_version;
  op.authorized_units = toUnits(adjustment.authorized_amount);
  op.policy_snapshot_digest = adjustment.policy_snapshot_digest;
  op.approval_snapshot_digest = adjustment.approval_snapshot_digest;
  return true;
};

const netUnits = (op) => op.captured_units - op.adjusted_units;
const effect = (overrides = {}) => ({
  spend_intent_id: 'sp_1',
  operation_id: 'op_1',
  effect_id: 'cap_1',
  authoritative_effect_ref: 'rail:tx:001',
  kind: 'partial_capture',
  amount: '40.00',
  asset: 'USD',
  authorization_version: 1,
  policy_snapshot_digest: 'policy:p1',
  approval_snapshot_digest: 'approval:a1',
  ...overrides
});
const authAdjustment = (overrides = {}) => ({
  authorization_adjustment_id: 'authadj_001',
  spend_intent_id: 'sp_1',
  operation_id: 'op_1',
  prior_authorization_version: 1,
  authorization_version: 2,
  authorized_amount: '120.00',
  authorized_asset: 'USD',
  policy_snapshot_digest: 'policy:p2',
  approval_snapshot_digest: 'approval:a2',
  authorizer_participant_id: 'participant:owner',
  authorizer_capability_id: 'cap:spend-adjust',
  authorizer_capability_version: 7,
  authorizer_scope: 'spend_authorization_adjustment',
  authority_proof_ref: 'proof:authadj:001',
  ...overrides
});

// One authoritative external effect cannot be replayed under a fresh internal effect ID.
{
  const op = makeOperation();
  eq(applyCapture(op, effect()), true, 'first authoritative partial capture accepted');
  eq(applyCapture(op, effect({ effect_id: 'cap_2' })), false, 'same authoritative external effect rejected under fresh effect_id');
  eq(fromUnits(netUnits(op)), '40.00', 'duplicate external effect does not change net value');
}

// Cumulative partial captures cannot overrun immutable authorized value.
{
  const op = makeOperation({ authorized_amount: '100.00' });
  eq(applyCapture(op, effect({ effect_id: 'cap_a', authoritative_effect_ref: 'rail:tx:a', amount: '60.00' })), true, 'first bounded partial accepted');
  eq(applyCapture(op, effect({ effect_id: 'cap_b', authoritative_effect_ref: 'rail:tx:b', amount: '40.00' })), true, 'second bounded partial reaches authorization exactly');
  eq(applyCapture(op, effect({ effect_id: 'cap_c', authoritative_effect_ref: 'rail:tx:c', amount: '0.01' })), false, 'cumulative over-capture rejected');
  eq(fromUnits(netUnits(op)), '100.00', 'over-capture rejection preserves exact net');
}

// A bound change requires fresh exact current authority and replay protection.
{
  const op = makeOperation({ authorized_amount: '100.00' });
  eq(applyCapture(op, effect({ effect_id: 'cap_a', authoritative_effect_ref: 'rail:tx:a', amount: '100.00' })), true, 'original authorization may be fully captured');
  eq(applyCapture(op, effect({ effect_id: 'cap_b', authoritative_effect_ref: 'rail:tx:b', amount: '10.00' })), false, 'fresh capture cannot silently widen old bound');

  eq(applyAuthorizationAdjustment(op, authAdjustment({ authorization_adjustment_id: '' })), false, 'missing authorization adjustment ID fails');
  eq(applyAuthorizationAdjustment(op, authAdjustment({ authorizer_capability_version: 6 })), false, 'stale authorizer capability fails');
  eq(applyAuthorizationAdjustment(op, authAdjustment({ authorizer_participant_id: 'participant:attacker' })), false, 'wrong authorizer fails');
  eq(applyAuthorizationAdjustment(op, authAdjustment({ prior_authorization_version: 0 })), false, 'wrong prior authorization version fails');
  eq(applyAuthorizationAdjustment(op, authAdjustment({ policy_snapshot_digest: 'policy:p1' })), false, 'reused policy snapshot fails fresh-authority adjustment');
  eq(applyAuthorizationAdjustment(op, authAdjustment({ approval_snapshot_digest: 'approval:a1' })), false, 'reused approval snapshot fails fresh-authority adjustment');
  eq(applyAuthorizationAdjustment(op, authAdjustment(), { authorityProofValid: false }), false, 'unverified authority proof fails');
  eq(applyAuthorizationAdjustment(op, authAdjustment()), true, 'fresh replay-protected current authority may widen bound');
  eq(applyAuthorizationAdjustment(op, authAdjustment()), false, 'authorization adjustment replay fails');

  eq(applyCapture(op, effect({
    effect_id: 'cap_old',
    authoritative_effect_ref: 'rail:tx:old-version',
    amount: '10.00',
    authorization_version: 1,
    policy_snapshot_digest: 'policy:p1',
    approval_snapshot_digest: 'approval:a1'
  })), false, 'effect evidence bound to prior authorization version fails after adjustment');
  eq(applyCapture(op, effect({
    effect_id: 'cap_b',
    authoritative_effect_ref: 'rail:tx:b',
    amount: '10.00',
    authorization_version: 2,
    policy_snapshot_digest: 'policy:p2',
    approval_snapshot_digest: 'approval:a2'
  })), true, 'capture under fresh authorized version is accepted');
  eq(fromUnits(netUnits(op)), '110.00', 'authorized adjustment preserves exact net');
}

// Pending/unknown prior execution blocks an adjustment from creating fresh dispatch authority.
for (const execution_state of ['pending', 'unknown']) {
  const op = makeOperation({ execution_state });
  eq(applyAuthorizationAdjustment(op, authAdjustment()), false, `${execution_state} prior execution blocks authorization adjustment`);
  eq(op.authorization_version, 1, `${execution_state} block preserves authorization version`);
}

// Duplicate refund under a fresh internal ID is rejected by authoritative adjustment identity.
{
  const op = makeOperation();
  eq(applyCapture(op, effect({ effect_id: 'cap_parent', authoritative_effect_ref: 'rail:cap:parent' })), true, 'parent capture accepted');
  const refund = effect({
    effect_id: 'refund_1',
    authoritative_effect_ref: 'rail:refund:001',
    kind: 'refund',
    amount: '10.00',
    parent_capture_effect_id: 'cap_parent'
  });
  eq(applyAdjustment(op, refund), true, 'first authoritative refund accepted');
  eq(applyAdjustment(op, { ...refund, effect_id: 'refund_2' }), false, 'same authoritative refund rejected under fresh effect_id');
  eq(fromUnits(netUnits(op)), '30.00', 'duplicate refund rejection preserves net');
}

// Refund cannot exceed the remaining proven capture value.
{
  const op = makeOperation();
  eq(applyCapture(op, effect({ effect_id: 'cap_parent', authoritative_effect_ref: 'rail:cap:parent' })), true, 'capture accepted for remaining-value test');
  eq(applyAdjustment(op, effect({
    effect_id: 'refund_1',
    authoritative_effect_ref: 'rail:refund:001',
    kind: 'refund',
    amount: '30.00',
    parent_capture_effect_id: 'cap_parent'
  })), true, 'bounded refund accepted');
  eq(applyAdjustment(op, effect({
    effect_id: 'refund_2',
    authoritative_effect_ref: 'rail:refund:002',
    kind: 'refund',
    amount: '10.01',
    parent_capture_effect_id: 'cap_parent'
  })), false, 'refund greater than remaining capture rejected');
  eq(fromUnits(netUnits(op)), '10.00', 'oversized refund rejection preserves net');
}

// Refund and reversal share one remaining consumable capture balance.
{
  const op = makeOperation();
  eq(applyCapture(op, effect({ effect_id: 'cap_parent', authoritative_effect_ref: 'rail:cap:parent' })), true, 'capture accepted for shared-consumption test');
  eq(applyAdjustment(op, effect({
    effect_id: 'refund_1',
    authoritative_effect_ref: 'rail:refund:001',
    kind: 'refund',
    amount: '25.00',
    parent_capture_effect_id: 'cap_parent'
  })), true, 'refund consumes part of capture');
  eq(applyAdjustment(op, effect({
    effect_id: 'reversal_1',
    authoritative_effect_ref: 'rail:reversal:001',
    kind: 'reversal',
    amount: '20.00',
    parent_capture_effect_id: 'cap_parent'
  })), false, 'reversal cannot double-consume already-refunded value');
  eq(fromUnits(netUnits(op)), '15.00', 'double-consumption rejection preserves exact net');
}

// Cross-asset adjustments fail closed.
{
  const op = makeOperation();
  eq(applyCapture(op, effect({ effect_id: 'cap_parent', authoritative_effect_ref: 'rail:cap:parent' })), true, 'capture accepted for asset-conservation test');
  eq(applyAdjustment(op, effect({
    effect_id: 'refund_eur',
    authoritative_effect_ref: 'rail:refund:eur',
    kind: 'refund',
    amount: '5.00',
    asset: 'EUR',
    parent_capture_effect_id: 'cap_parent'
  })), false, 'cross-asset adjustment rejected');
  eq(fromUnits(netUnits(op)), '40.00', 'cross-asset rejection leaves capture intact');
}

// Positive lineage: legitimate partial captures within authorization plus bounded adjustment yield exact net value.
{
  const op = makeOperation({ authorized_amount: '100.00' });
  eq(applyCapture(op, effect({ effect_id: 'cap_30', authoritative_effect_ref: 'rail:cap:30', amount: '30.00' })), true, 'legitimate partial 30 accepted');
  eq(applyCapture(op, effect({ effect_id: 'cap_40', authoritative_effect_ref: 'rail:cap:40', amount: '40.00' })), true, 'legitimate partial 40 accepted');
  eq(applyAdjustment(op, effect({
    effect_id: 'refund_15',
    authoritative_effect_ref: 'rail:refund:15',
    kind: 'refund',
    amount: '15.00',
    parent_capture_effect_id: 'cap_30'
  })), true, 'bounded adjustment accepted');
  eq(fromUnits(op.captured_units), '70.00', 'proven capture sum is exact');
  eq(fromUnits(op.adjusted_units), '15.00', 'proven adjustment sum is exact');
  eq(fromUnits(netUnits(op)), '55.00', 'net canonical value equals proven captures minus proven adjustments exactly once');
}

console.log(JSON.stringify({ suite: 'phase-c1-spend-operation-conservation', checks, result: 'pass' }));
