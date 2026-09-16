import assert from 'node:assert/strict';
import { createCanonicalMaterializationState } from './materialization-state.mjs';

let checks = 0;
const eq = (actual, expected, message) => { checks += 1; assert.deepEqual(actual, expected, message); };

const money = units => ({ minorUnits: BigInt(units), currency: 'USD', exponent: 2 });
const authorizedMoney = money(100000);
const identityOf = expected => ({
  adapter_id: expected.adapter_id,
  rail_identity: expected.rail_identity,
  authoritative_effect_ref: expected.authoritative_effect_ref
});
const identityKey = identity => JSON.stringify([
  identity.adapter_id,
  identity.rail_identity,
  identity.authoritative_effect_ref
]);

// Independent adapter-side fixture: the authoritative readback table is keyed by
// adapter-issued proof references, not by the caller's expected SpendIntent fields.
const authoritativeReadbacks = new Map();
const registerAuthoritative = ({ readback, adapter_id, rail_identity, authoritative_effect_ref, units, kind, parent = null }) => {
  authoritativeReadbacks.set(readback, {
    adapter_id,
    rail_identity,
    authoritative_effect_ref,
    units: BigInt(units),
    kind,
    parent
  });
};
const proofAccepted = (readback, expected) => {
  const actual = authoritativeReadbacks.get(readback);
  if (!actual) return false;
  return actual.adapter_id === expected.adapter_id &&
    actual.rail_identity === expected.rail_identity &&
    actual.authoritative_effect_ref === expected.authoritative_effect_ref &&
    actual.units === BigInt(expected.money_minor_units) &&
    actual.kind === expected.effect_kind &&
    (actual.parent ?? null) === (expected.authoritative_parent_effect_ref ?? null);
};

const expected = ({
  spend = 'sp_a', operation = 'op_a', adapter = 'adapter_a', rail = 'rail_a',
  ref, kind = 'capture', parent = null, units = 1000
}) => ({
  spend_intent_id: spend,
  operation_id: operation,
  adapter_id: adapter,
  rail_identity: rail,
  authoritative_effect_ref: ref,
  effect_kind: kind,
  authoritative_parent_effect_ref: parent,
  money_minor_units: String(units)
});

const apply = (state, effect, readback, units = Number(effect.money_minor_units)) =>
  state.materialize({
    state: ['refund', 'reversal'].includes(effect.effect_kind) ? 'reversed' : 'captured',
    proofAccepted: proofAccepted(readback, effect),
    expected: effect,
    effectMoney: money(units),
    authorizedMoney
  });

registerAuthoritative({ readback:'rb:a:root', adapter_id:'adapter_a', rail_identity:'rail_a', authoritative_effect_ref:'shared-ref', units:1000, kind:'capture' });
registerAuthoritative({ readback:'rb:b:root', adapter_id:'adapter_b', rail_identity:'rail_b', authoritative_effect_ref:'shared-ref', units:2000, kind:'capture' });
registerAuthoritative({ readback:'rb:a:refund', adapter_id:'adapter_a', rail_identity:'rail_a', authoritative_effect_ref:'refund-a', units:200, kind:'refund', parent:'shared-ref' });
registerAuthoritative({ readback:'rb:b:refund', adapter_id:'adapter_b', rail_identity:'rail_b', authoritative_effect_ref:'refund-b', units:200, kind:'refund', parent:'shared-ref' });

const state = createCanonicalMaterializationState();
const rootA = expected({ ref:'shared-ref', units:1000 });
eq(apply(state, rootA, 'rb:a:root'), true, 'first authoritative external capture materializes');
const persistedA = state.getEffect('sp_a', 'op_a', 'shared-ref');
eq(persistedA.adapter_id, 'adapter_a', 'immutable effect state exposes adapter identity');
eq(persistedA.rail_identity, 'rail_a', 'immutable effect state exposes rail identity');
eq(persistedA.authoritative_effect_ref, 'shared-ref', 'immutable effect state exposes authoritative external ref');

// Same exact authoritative identity cannot mint fresh authority by switching intent.
const crossIntentReplay = expected({ spend:'sp_b', operation:'op_b', ref:'shared-ref', units:1000 });
eq(proofAccepted('rb:a:root', crossIntentReplay), true, 'cross-intent replay can carry the same independently verified external identity');
eq(apply(state, crossIntentReplay, 'rb:a:root'), false, 'same external identity cannot rematerialize under another SpendIntent');

// Same exact authoritative identity cannot mint fresh authority by switching operation.
const crossOperationReplay = expected({ operation:'op_other', ref:'shared-ref', units:1000 });
eq(proofAccepted('rb:a:root', crossOperationReplay), true, 'cross-operation replay can carry the same independently verified external identity');
eq(apply(state, crossOperationReplay, 'rb:a:root'), false, 'same external identity cannot rematerialize under another operation');

// Same raw provider ref is allowed when the authoritative adapter/rail namespace differs.
const rootB = expected({ adapter:'adapter_b', rail:'rail_b', ref:'shared-ref', units:2000 });
eq(apply(state, rootB, 'rb:b:root'), true, 'same raw ref on a distinct adapter/rail is a distinct authoritative effect');
eq(state.getEffect('sp_a', 'op_a', 'shared-ref'), null, 'raw-ref-only lookup fails closed when multiple rail identities are ambiguous');
eq(state.getEffect('sp_a', 'op_a', 'shared-ref', 'adapter_a', 'rail_a').adapter_id, 'adapter_a', 'namespace-qualified lookup resolves rail A');
eq(state.getEffect('sp_a', 'op_a', 'shared-ref', 'adapter_b', 'rail_b').adapter_id, 'adapter_b', 'namespace-qualified lookup resolves rail B');

// Cross-rail adjustment cannot consume a capture from another authoritative namespace.
const crossRailRefund = expected({ adapter:'adapter_b', rail:'rail_b', ref:'refund-b', kind:'refund', parent:'shared-ref', units:200 });
eq(proofAccepted('rb:b:refund', crossRailRefund), true, 'cross-rail adjustment may have an independently valid proof for its own rail observation');
eq(apply(state, crossRailRefund, 'rb:b:refund', 200), true, 'rail B refund consumes rail B parent when exact namespace exists');
const onlyA = createCanonicalMaterializationState();
eq(apply(onlyA, rootA, 'rb:a:root'), true, 'isolated rail A capture materializes');
eq(apply(onlyA, crossRailRefund, 'rb:b:refund', 200), false, 'rail B adjustment cannot substitute rail A parent with the same raw ref');

// Authoritative ref substitution fails before materialization because independent readback disagrees.
const substituted = expected({ ref:'caller-substituted-ref', units:1000 });
eq(proofAccepted('rb:a:root', substituted), false, 'independent verifier rejects caller authoritative-ref substitution');
eq(apply(onlyA, substituted, 'rb:a:root'), false, 'unverified substituted authoritative ref cannot materialize');

// Adjustment before parent remains fail-closed.
const outOfOrder = createCanonicalMaterializationState();
const refundA = expected({ ref:'refund-a', kind:'refund', parent:'shared-ref', units:200 });
eq(proofAccepted('rb:a:refund', refundA), true, 'refund proof is independently valid');
eq(apply(outOfOrder, refundA, 'rb:a:refund', 200), false, 'out-of-order adjustment cannot materialize before parent');

// Snapshot/restore revalidates the exact canonical external-identity map.
const namespace = 'phase-c1:external-identity';
let head = null;
const seed = createCanonicalMaterializationState({ persistenceNamespace:namespace, resolveAuthoritativeHead:() => head });
eq(apply(seed, rootA, 'rb:a:root'), true, 'restart seed materializes rail A capture');
const snapshot = seed.snapshot();
const checkpoint = seed.checkpoint();
head = seed.headCandidate();
const sameHead = (left, right) =>
  left?.head_version === right?.head_version &&
  left?.domain === right?.domain &&
  left?.namespace === right?.namespace &&
  left?.snapshot_version === right?.snapshot_version &&
  left?.generation === right?.generation &&
  left?.lineage_digest === right?.lineage_digest;
const restarted = createCanonicalMaterializationState({
  persistenceNamespace:namespace,
  resolveAuthoritativeHead:() => head,
  commitUnderAuthoritativeHeadFence:({ expected_head, commit }) => sameHead(head, expected_head) && commit() === true
});
eq(restarted.restore(snapshot, checkpoint), true, 'restart restores exact external identity mapping');
eq(restarted.getEffect('sp_a', 'op_a', 'shared-ref', 'adapter_a', 'rail_a').rail_identity, 'rail_a', 'restart preserves adapter/rail identity on immutable effect');
eq(apply(restarted, crossIntentReplay, 'rb:a:root'), false, 'restart cannot forget cross-intent external identity uniqueness');

const tampered = structuredClone(snapshot);
tampered.effects[0][1].external_effect_identity.rail_identity = 'rail_tampered';
assert.throws(() => {
  const probe = createCanonicalMaterializationState({
    persistenceNamespace:namespace,
    resolveAuthoritativeHead:() => head,
    commitUnderAuthoritativeHeadFence:({ expected_head, commit }) => sameHead(head, expected_head) && commit() === true
  });
  probe.restore(tampered, checkpoint);
}, /external|identity|lineage|dedupe|snapshot/i);
checks += 1;

// Duplicate delivery is rejected without multiplying canonical value.
eq(apply(restarted, rootA, 'rb:a:root'), false, 'duplicate delivery stays idempotently non-materializing');
eq(restarted.getIntentMoney('sp_a').minorUnits, 1000n, 'duplicate delivery does not change canonical value');

eq(identityKey(identityOf(rootA)), identityKey({ adapter_id:'adapter_a', rail_identity:'rail_a', authoritative_effect_ref:'shared-ref' }), 'canonical identity tuple is adapter + rail + authoritative ref');

console.log(JSON.stringify({ suite:'phase-c1-authoritative-external-effect-identity', checks, result:'pass' }));
