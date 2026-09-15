import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const spend = JSON.parse(fs.readFileSync(path.join(here, 'spend-intent.contract.json'), 'utf8'));

let checks = 0;
const ok = (value, message) => { checks += 1; assert.ok(value, message); };
const eq = (actual, expected, message) => { checks += 1; assert.deepEqual(actual, expected, message); };

eq(spend.security_revision, 4, 'cumulative-conservation security revision is active');
eq(spend.operation_value.immutable_within_authorization_version, true, 'authorized value is immutable within an authorization version');
eq(spend.operation_value.cumulative_capture_or_partial_may_exceed_authorized_amount, false, 'capture total cannot exceed authorized amount');
eq(spend.operation_value.bound_change_requires_explicit_versioned_authorized_adjustment, true, 'bound change requires explicit versioned authorization');
eq(spend.operation_value.versioned_authorized_adjustment_rebinds_policy_and_approval_snapshots, true, 'bound change rebinds policy/approval snapshots');
eq(spend.operation_value.operation_asset_must_remain_constant, true, 'asset is conserved across an operation lineage');
eq(spend.proof.authoritative_effect_ref_must_be_stable_for_same_external_effect, true, 'external effect identity is stable');
eq(spend.proof.same_authoritative_effect_ref_may_materialize_multiple_internal_effect_ids, false, 'fresh internal IDs cannot duplicate one external effect');
eq(spend.materialization.internal_effect_id_is_not_authoritative_dedupe_identity, true, 'internal effect ID is not the dedupe authority');
eq(spend.materialization.one_authoritative_effect_ref_maps_to_at_most_one_canonical_effect, true, 'external effect materializes at most once');
eq(spend.lineage.authoritative_effect_ref_unique_within_operation, true, 'authoritative effect refs are unique in an operation');
eq(spend.lineage.adjustment_requires_parent_capture_effect_id, true, 'adjustment references a proven parent capture');
eq(spend.lineage.adjustment_asset_must_equal_parent_capture_asset, true, 'adjustment asset matches parent capture');
eq(spend.lineage.adjustment_amount_may_exceed_parent_remaining_consumable, false, 'adjustment cannot exceed remaining captured value');
eq(spend.lineage.refund_and_reversal_share_parent_remaining_consumable, true, 'refund and reversal consume the same remaining capture balance');
eq(spend.lineage.duplicate_authoritative_adjustment_effect_allowed, false, 'duplicate authoritative adjustment effects fail closed');
ok(spend.proof.shape.includes('authoritative_effect_ref'), 'proof shape contains authoritative_effect_ref');
ok(spend.proof.exact_binding_required.includes('authoritative_effect_ref'), 'proof binding requires authoritative_effect_ref');
for (const field of ['authorized_amount', 'authorized_asset', 'authorization_version']) {
  ok(spend.required_fields.includes(field), `required field ${field}`);
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

const makeOperation = ({
  spend_intent_id = 'sp_1',
  operation_id = 'op_1',
  authorized_amount = '100.00',
  authorized_asset = 'USD',
  authorization_version = 1,
  policy_snapshot_digest = 'policy:p1',
  approval_snapshot_digest = 'approval:a1'
} = {}) => ({
  spend_intent_id,
  operation_id,
  authorized_asset,
  authorization_version,
  authorized_units: toUnits(authorized_amount),
  policy_snapshot_digest,
  approval_snapshot_digest,
  captures: new Map(),
  adjustments: new Map(),
  authoritative_effect_refs: new Set(),
  captured_units: 0n,
  adjusted_units: 0n
});

const validateCommon = (op, effect) =>
  effect.spend_intent_id === op.spend_intent_id &&
  effect.operation_id === op.operation_id &&
  effect.asset === op.authorized_asset &&
  effect.policy_snapshot_digest === op.policy_snapshot_digest &&
  effect.approval_snapshot_digest === op.approval_snapshot_digest &&
  effect.authorization_version === op.authorization_version &&
  typeof effect.effect_id === 'string' && effect.effect_id.length > 0 &&
  typeof effect.authoritative_effect_ref === 'string' && effect.authoritative_effect_ref.length > 0;

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

const applyAuthorizationAdjustment = (op, adjustment) => {
  if (adjustment.authorization_version !== op.authorization_version + 1) return false;
  if (adjustment.authorized_asset !== op.authorized_asset) return false;
  if (!adjustment.policy_snapshot_digest || !adjustment.approval_snapshot_digest) return false;
  const newBound = toUnits(adjustment.authorized_amount);
  if (newBound < op.captured_units) return false;

  op.authorization_version = adjustment.authorization_version;
  op.authorized_units = newBound;
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

// A bound may change only through an explicit versioned authorization adjustment.
{
  const op = makeOperation({ authorized_amount: '100.00' });
  eq(applyCapture(op, effect({ effect_id: 'cap_a', authoritative_effect_ref: 'rail:tx:a', amount: '100.00' })), true, 'original authorization may be fully captured');
  eq(applyCapture(op, effect({ effect_id: 'cap_b', authoritative_effect_ref: 'rail:tx:b', amount: '10.00' })), false, 'fresh capture cannot silently widen old bound');
  eq(applyAuthorizationAdjustment(op, {
    authorization_version: 2,
    authorized_amount: '120.00',
    authorized_asset: 'USD',
    policy_snapshot_digest: 'policy:p2',
    approval_snapshot_digest: 'approval:a2'
  }), true, 'explicit next authorization version may widen bound');
  eq(applyCapture(op, effect({
    effect_id: 'cap_b',
    authoritative_effect_ref: 'rail:tx:b',
    amount: '10.00',
    authorization_version: 2,
    policy_snapshot_digest: 'policy:p2',
    approval_snapshot_digest: 'approval:a2'
  })), true, 'capture under the explicit new authorization version is accepted');
  eq(fromUnits(netUnits(op)), '110.00', 'versioned bound adjustment preserves exact net');
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
