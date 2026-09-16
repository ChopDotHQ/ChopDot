import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createCanonicalMaterializationState, createInMemoryExecutionOwnershipAuthority } from './materialization-state.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const spend = JSON.parse(fs.readFileSync(path.join(here, 'spend-intent.contract.json'), 'utf8'));
let checks = 0;
const eq = (actual, expected, message) => { checks += 1; assert.deepEqual(actual, expected, message); };
const throws = (fn, pattern, message) => { checks += 1; assert.throws(fn, pattern, message); };

const money = units => ({ minorUnits: BigInt(units), currency: 'USD', exponent: 2 });
const authorizedMoney = money(100000);
const FIN = 'phase-c1:financial-authority:shared';
const identityOf = expected => ({ adapter_id: expected.adapter_id, rail_identity: expected.rail_identity, authoritative_effect_ref: expected.authoritative_effect_ref });
const sameHead = (left, right) =>
  left?.head_version === right?.head_version && left?.domain === right?.domain && left?.namespace === right?.namespace &&
  left?.snapshot_version === right?.snapshot_version && left?.generation === right?.generation && left?.lineage_digest === right?.lineage_digest &&
  left?.external_identity_version === right?.external_identity_version && left?.external_identity_digest === right?.external_identity_digest &&
  left?.execution_ownership_version === right?.execution_ownership_version && left?.financial_authority_namespace === right?.financial_authority_namespace;

const expected = ({ spendId = 'sp_a', operation = 'op_a', request = 'req_a', adapter = 'adapter_a', rail = 'rail_a', ref, kind = 'capture', parent = null, units = 1000 }) => ({
  spend_intent_id: spendId,
  operation_id: operation,
  execution_request_ref: request,
  adapter_id: adapter,
  rail_identity: rail,
  authoritative_effect_ref: ref,
  effect_kind: kind,
  authoritative_parent_effect_ref: parent,
  money_minor_units: String(units)
});

const readbacks = new Map();
const reserve = (authority, financialNamespace, effect) => authority.reserveCorrelation({
  financial_authority_namespace: financialNamespace,
  execution_request_ref: effect.execution_request_ref,
  spend_intent_id: effect.spend_intent_id,
  operation_id: effect.operation_id,
  adapter_id: effect.adapter_id,
  rail_identity: effect.rail_identity,
  status: 'pending'
});
const bindEffect = (authority, financialNamespace, effect) => authority.bindAuthoritativeExternalEffect({
  financial_authority_namespace: financialNamespace,
  execution_request_ref: effect.execution_request_ref,
  external_effect_identity: identityOf(effect)
});
const registerAuthoritative = ({ authority, financialNamespace = FIN, readback, effect }) => {
  eq(reserve(authority, financialNamespace, effect), true, `${readback} reserves exact outbound execution correlation`);
  eq(bindEffect(authority, financialNamespace, effect), true, `${readback} binds authoritative external effect to reserved request`);
  readbacks.set(readback, {
    spend_intent_id: effect.spend_intent_id,
    operation_id: effect.operation_id,
    execution_request_ref: effect.execution_request_ref,
    adapter_id: effect.adapter_id,
    rail_identity: effect.rail_identity,
    authoritative_effect_ref: effect.authoritative_effect_ref,
    units: BigInt(effect.money_minor_units),
    kind: effect.effect_kind,
    parent: effect.authoritative_parent_effect_ref ?? null
  });
};
const proofAccepted = (readback, effect) => {
  const actual = readbacks.get(readback);
  if (!actual) return false;
  return actual.spend_intent_id === effect.spend_intent_id && actual.operation_id === effect.operation_id &&
    actual.execution_request_ref === effect.execution_request_ref && actual.adapter_id === effect.adapter_id &&
    actual.rail_identity === effect.rail_identity && actual.authoritative_effect_ref === effect.authoritative_effect_ref &&
    actual.units === BigInt(effect.money_minor_units) && actual.kind === effect.effect_kind &&
    (actual.parent ?? null) === (effect.authoritative_parent_effect_ref ?? null);
};
const stateFor = ({ authority, persistence = 'phase-c1:state', financialNamespace = FIN, headRef = null, fence = null }) => createCanonicalMaterializationState({
  persistenceNamespace: persistence,
  financialAuthorityNamespace: financialNamespace,
  executionOwnershipAuthority: authority,
  ...(headRef ? { resolveAuthoritativeHead: () => headRef.current } : {}),
  ...(fence ? { commitUnderAuthoritativeHeadFence: fence } : {})
});
const apply = (state, effect, readback, { units = BigInt(effect.money_minor_units), authorized = authorizedMoney, forceProof = null } = {}) => state.materialize({
  state: ['refund','reversal'].includes(effect.effect_kind) ? 'reversed' : (effect.effect_kind === 'partial_capture' ? 'partial' : 'captured'),
  proofAccepted: forceProof ?? proofAccepted(readback, effect),
  expected: effect,
  effectMoney: money(units),
  authorizedMoney: authorized
});

// Contract-level revision-9 authority rules are machine checked before state tests.
eq(spend.security_revision, 9, 'security revision 9 is active');
eq(spend.execution_correlation.required_before_dispatch_or_at_dispatch, true, 'execution correlation is established before/at dispatch');
eq(spend.execution_correlation.callback_or_readback_order_may_choose_owner, false, 'callback ordering cannot choose owner');
eq(spend.execution_correlation.release_or_rebind_requires_authoritative_no_effect, true, 'rebind requires authoritative no-effect truth');
eq(spend.materialization.external_identity_unique_across_state_instances_within_financial_authority_namespace, true, 'external identity is unique across state instances in one authority domain');
eq(spend.recovery.restore_commit_fence_binds_external_identity_digest, true, 'restore fence binds external identity digest');

// P0: wrong first claimant is rejected BEFORE the legitimate A materializes.
{
  const authority = createInMemoryExecutionOwnershipAuthority();
  const rootA = expected({ ref:'effect:first-claim', request:'req:first:A' });
  registerAuthoritative({ authority, readback:'rb:first:A', effect:rootA });
  const wrongB = expected({ spendId:'sp_b', operation:'op_b', request:'req:first:B', ref:'effect:first-claim' });
  eq(reserve(authority, FIN, wrongB), true, 'competing B request may exist without owning A external effect');
  const state = stateFor({ authority, persistence:'phase-c1:first-claim' });
  eq(proofAccepted('rb:first:A', wrongB), false, 'authoritative readback binds A request and rejects B proof substitution');
  eq(apply(state, wrongB, 'rb:first:A', { forceProof:true }), false, 'ownership primitive rejects wrong-first claimant even if caller asserts proof accepted');
  eq(apply(state, rootA, 'rb:first:A'), true, 'correct A succeeds after wrong-first rejection');
  eq(state.getIntentMoney('sp_a').minorUnits, 1000n, 'wrong-first rejection leaves one exact canonical value');
  eq(apply(state, rootA, 'rb:first:A'), false, 'materialized external effect cannot execute twice');
}

// Real effect + local rejection: ownership survives; another lineage cannot steal it.
{
  const authority = createInMemoryExecutionOwnershipAuthority();
  const rootA = expected({ ref:'effect:local-reject', request:'req:reject:A' });
  registerAuthoritative({ authority, readback:'rb:reject:A', effect:rootA });
  const wrongB = expected({ spendId:'sp_b', operation:'op_b', request:'req:reject:B', ref:'effect:local-reject' });
  eq(reserve(authority, FIN, wrongB), true, 'B correlation can coexist before ownership validation');
  const state = stateFor({ authority, persistence:'phase-c1:local-reject' });
  eq(apply(state, rootA, 'rb:reject:A', { authorized:money(500) }), false, 'real effect can fail local conservation without losing external ownership');
  eq(apply(state, wrongB, 'rb:reject:A', { forceProof:true }), false, 'locally rejected real effect cannot be reassigned to B');
  eq(apply(state, rootA, 'rb:reject:A'), true, 'same correct A may reconcile after local rejection');
}

// Pending/unknown/lost acknowledgement + process recreation preserves exact ownership.
{
  const authorityA = createInMemoryExecutionOwnershipAuthority();
  const rootA = expected({ ref:'effect:unknown', request:'req:unknown:A' });
  eq(reserve(authorityA, FIN, rootA), true, 'dispatch reserves durable A correlation');
  eq(authorityA.markUnknown({ financial_authority_namespace:FIN, execution_request_ref:rootA.execution_request_ref, spend_intent_id:'sp_a', operation_id:'op_a' }), true, 'lost acknowledgement marks same request unknown without releasing ownership');
  const authorityB = createInMemoryExecutionOwnershipAuthority(authorityA.snapshot());
  eq(bindEffect(authorityB, FIN, rootA), true, 'post-restart authoritative readback binds effect to persisted A request');
  readbacks.set('rb:unknown:A', { spend_intent_id:'sp_a', operation_id:'op_a', execution_request_ref:rootA.execution_request_ref, adapter_id:'adapter_a', rail_identity:'rail_a', authoritative_effect_ref:'effect:unknown', units:1000n, kind:'capture', parent:null });
  const wrongB = expected({ spendId:'sp_b', operation:'op_b', request:'req:unknown:B', ref:'effect:unknown' });
  eq(reserve(authorityB, FIN, wrongB), true, 'restart may have another request but not A ownership');
  const restarted = stateFor({ authority:authorityB, persistence:'phase-c1:unknown-restart' });
  eq(apply(restarted, wrongB, 'rb:unknown:A', { forceProof:true }), false, 'restart cannot transfer unknown A effect to B');
  eq(apply(restarted, rootA, 'rb:unknown:A'), true, 'A reconciles exact preserved operation once after restart');
}

// Shared financial authority closes namespace sharding and exact-once across state objects.
{
  const authority = createInMemoryExecutionOwnershipAuthority();
  const rootA = expected({ ref:'effect:shared-authority', request:'req:shared:A' });
  registerAuthoritative({ authority, readback:'rb:shared:A', effect:rootA });
  const left = stateFor({ authority, persistence:'phase-c1:shard:left', financialNamespace:FIN });
  const right = stateFor({ authority, persistence:'phase-c1:shard:right', financialNamespace:FIN });
  eq(apply(left, rootA, 'rb:shared:A'), true, 'first state object materializes exact owner');
  eq(apply(right, rootA, 'rb:shared:A'), false, 'second persistence shard cannot independently materialize same external effect');
  eq(right.getIntentMoney('sp_a'), null, 'rejected shard remains financially untouched');
}

// Same raw provider ref on distinct adapter/rail namespaces remains legitimately distinct.
{
  const authority = createInMemoryExecutionOwnershipAuthority();
  const rootA = expected({ ref:'shared-ref', request:'req:rail:A', units:1000 });
  const rootB = expected({ request:'req:rail:B', adapter:'adapter_b', rail:'rail_b', ref:'shared-ref', units:2000 });
  registerAuthoritative({ authority, readback:'rb:rail:A', effect:rootA });
  registerAuthoritative({ authority, readback:'rb:rail:B', effect:rootB });
  const state = stateFor({ authority, persistence:'phase-c1:raw-ref' });
  eq(apply(state, rootA, 'rb:rail:A'), true, 'rail A authoritative effect materializes');
  eq(apply(state, rootB, 'rb:rail:B'), true, 'same raw ref on distinct rail materializes as distinct authoritative identity');
  eq(state.getEffect('sp_a','op_a','shared-ref'), null, 'raw-ref-only lookup fails closed when rail identities are ambiguous');
  eq(state.getEffect('sp_a','op_a','shared-ref','adapter_a','rail_a').adapter_id, 'adapter_a', 'qualified rail A lookup resolves');
  eq(state.getEffect('sp_a','op_a','shared-ref','adapter_b','rail_b').adapter_id, 'adapter_b', 'qualified rail B lookup resolves');
}

// Adjustment lineage remains rail-scoped and parent-bound.
{
  const authority = createInMemoryExecutionOwnershipAuthority();
  const rootA = expected({ ref:'parent-ref', request:'req:parent:A', units:1000 });
  const refundA = expected({ request:'req:refund:A', ref:'refund-a', kind:'refund', parent:'parent-ref', units:200 });
  const refundB = expected({ request:'req:refund:B', adapter:'adapter_b', rail:'rail_b', ref:'refund-b', kind:'refund', parent:'parent-ref', units:200 });
  registerAuthoritative({ authority, readback:'rb:parent:A', effect:rootA });
  registerAuthoritative({ authority, readback:'rb:refund:A', effect:refundA });
  registerAuthoritative({ authority, readback:'rb:refund:B', effect:refundB });
  const state = stateFor({ authority, persistence:'phase-c1:adjustment' });
  eq(apply(state, rootA, 'rb:parent:A'), true, 'parent capture materializes');
  eq(apply(state, refundB, 'rb:refund:B'), false, 'cross-rail adjustment cannot substitute parent with same raw ref');
  eq(apply(state, refundA, 'rb:refund:A'), true, 'same-rail refund consumes exact parent');
  eq(state.getIntentMoney('sp_a').minorUnits, 800n, 'bounded adjustment conserves canonical net');
}

// Authoritative no-effect is the only release path for an unused request correlation.
{
  const authority = createInMemoryExecutionOwnershipAuthority();
  const attempt = expected({ ref:'never-executed', request:'req:no-effect' });
  eq(reserve(authority, FIN, attempt), true, 'pre-effect request correlation is durable');
  eq(authority.releaseCorrelationAfterNoEffect({ financial_authority_namespace:FIN, execution_request_ref:'req:no-effect', authoritative_no_effect:false }), false, 'request cannot release without authoritative no-effect truth');
  eq(authority.releaseCorrelationAfterNoEffect({ financial_authority_namespace:FIN, execution_request_ref:'req:no-effect', authoritative_no_effect:true }), true, 'authoritative no-effect permits release/rebind');
}

// Restart restores external identity mapping and durable ownership without callback replay.
let restoreFixture;
{
  const authority = createInMemoryExecutionOwnershipAuthority();
  const rootA = expected({ ref:'effect:restore', request:'req:restore:A' });
  registerAuthoritative({ authority, readback:'rb:restore:A', effect:rootA });
  const seed = stateFor({ authority, persistence:'phase-c1:restore', financialNamespace:FIN });
  eq(apply(seed, rootA, 'rb:restore:A'), true, 'restore seed materializes exact A owner');
  const snapshot = seed.snapshot();
  const checkpoint = seed.checkpoint();
  const head = seed.headCandidate();
  const authoritySnapshot = authority.snapshot();
  const restartedAuthority = createInMemoryExecutionOwnershipAuthority(authoritySnapshot);
  const headRef = { current:head };
  const fence = ({ expected_head, commit }) => sameHead(headRef.current, expected_head) && commit() === true;
  const restarted = stateFor({ authority:restartedAuthority, persistence:'phase-c1:restore', financialNamespace:FIN, headRef, fence });
  eq(restarted.restore(snapshot, checkpoint), true, 'restart restores under full decorated authoritative head fence');
  eq(restarted.getEffect('sp_a','op_a','effect:restore','adapter_a','rail_a').rail_identity, 'rail_a', 'restart preserves canonical external identity');
  eq(apply(restarted, rootA, 'rb:restore:A'), false, 'durable authority remembers materialized external effect after restart');
  restoreFixture = { snapshot, checkpoint, head, authoritySnapshot };
}

// Full decorated restore fence: digest-only change after precheck but before commit fails closed.
{
  const authority = createInMemoryExecutionOwnershipAuthority(restoreFixture.authoritySnapshot);
  const headRef = { current:{ ...restoreFixture.head } };
  let flipped = false;
  const fence = ({ expected_head, commit }) => {
    eq(sameHead(headRef.current, expected_head), true, 'outer restore fence receives full decorated expected head');
    if (!flipped) {
      flipped = true;
      headRef.current = { ...headRef.current, external_identity_digest:`${headRef.current.external_identity_digest}:fork` };
    }
    return commit() === true;
  };
  const probe = stateFor({ authority, persistence:'phase-c1:restore', financialNamespace:FIN, headRef, fence });
  throws(() => probe.restore(restoreFixture.snapshot, restoreFixture.checkpoint), /fence|authoritative|identity|restore/i, 'digest-only restore TOCTOU is rejected atomically');
  eq(probe.getIntentMoney('sp_a'), null, 'failed decorated-head restore commits zero local financial state');
}

console.log(JSON.stringify({ suite:'phase-c1-authoritative-external-effect-identity-revision9', checks, result:'pass' }));
