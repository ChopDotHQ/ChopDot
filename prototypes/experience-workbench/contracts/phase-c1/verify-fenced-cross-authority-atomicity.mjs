import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createCanonicalMaterializationState } from './materialization-state.mjs';
import {
  createFencedExecutionOwnershipAuthority,
  createInMemoryExecutionOwnershipFrontierAuthority,
  createInMemoryExecutionOwnershipNamespaceAuthority,
  executionOwnershipReplayDigest
} from './execution-ownership-frontier.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const acceptance = JSON.parse(fs.readFileSync(path.join(here, 'execution-ownership.acceptance.json'), 'utf8'));
let checks = 0;
const eq = (actual, expected, message) => { checks += 1; assert.deepEqual(actual, expected, message); };
const throws = (fn, pattern, message) => { checks += 1; assert.throws(fn, pattern, message); };
const money = (units, exponent = 2) => ({ minorUnits: BigInt(units), currency: 'USD', exponent });
const effect = ({ tag, kind = 'capture', units = '1000', parent = null }) => ({
  spend_intent_id: `sp:${tag}`,
  operation_id: `op:${tag}`,
  execution_request_ref: `req:${tag}`,
  adapter_id: 'adapter_combined',
  rail_identity: 'rail_combined',
  authoritative_effect_ref: `effect:${tag}`,
  effect_kind: kind,
  authoritative_parent_effect_ref: parent,
  money_minor_units: String(units)
});
const correlation = (fin, value) => ({
  financial_authority_namespace: fin,
  execution_request_ref: value.execution_request_ref,
  spend_intent_id: value.spend_intent_id,
  operation_id: value.operation_id,
  adapter_id: value.adapter_id,
  rail_identity: value.rail_identity,
  status: 'pending'
});
const identity = value => ({
  adapter_id: value.adapter_id,
  rail_identity: value.rail_identity,
  authoritative_effect_ref: value.authoritative_effect_ref
});
const sameHead = (left, right) =>
  left?.head_version === right?.head_version && left?.domain === right?.domain && left?.namespace === right?.namespace &&
  left?.snapshot_version === right?.snapshot_version && left?.generation === right?.generation && left?.lineage_digest === right?.lineage_digest &&
  left?.external_identity_version === right?.external_identity_version && left?.external_identity_digest === right?.external_identity_digest &&
  left?.execution_ownership_version === right?.execution_ownership_version && left?.execution_ownership_digest === right?.execution_ownership_digest &&
  left?.financial_authority_namespace === right?.financial_authority_namespace;
const makeFence = headRef => ({ expected_head, next_head, commit }) => {
  if (!sameHead(headRef.current, expected_head)) return false;
  if (commit() !== true) return false;
  if (next_head) headRef.current = { ...next_head };
  return true;
};
const stateFor = ({ fin, authority, persistence, headRef = null }) => createCanonicalMaterializationState({
  persistenceNamespace: persistence,
  financialAuthorityNamespace: fin,
  executionOwnershipAuthority: authority,
  ...(headRef ? { resolveAuthoritativeHead: () => headRef.current, commitUnderAuthoritativeHeadFence: makeFence(headRef) } : {})
});
const register = (fin, authority, value) => {
  const reservation = authority.reserveCorrelationForDispatch(correlation(fin, value));
  eq(reservation?.created, true, `${value.operation_id}: reservation is new`);
  eq(reservation?.dispatch_allowed, true, `${value.operation_id}: new reservation grants one dispatch`);
  eq(authority.bindAuthoritativeExternalEffect({
    financial_authority_namespace: fin,
    execution_request_ref: value.execution_request_ref,
    external_effect_identity: identity(value)
  }), true, `${value.operation_id}: authoritative external effect binds exactly`);
};
const apply = (state, value, exponent = 2, authorizedUnits = value.money_minor_units) => state.materialize({
  state: 'captured',
  proofAccepted: true,
  expected: value,
  effectMoney: money(value.money_minor_units, exponent),
  authorizedMoney: money(authorizedUnits, exponent)
});
const bundle = (tag, { exponent = 2, units = '1000', faultInjector = () => {} } = {}) => {
  const fin = `phase-c1:financial-authority:combined:${tag}`;
  const persistence = `phase-c1:combined:${tag}`;
  const namespaceAuthority = createInMemoryExecutionOwnershipNamespaceAuthority({ financialAuthorityNamespace: fin });
  const frontierAuthority = createInMemoryExecutionOwnershipFrontierAuthority({ financialAuthorityNamespace: fin });
  const authority = createFencedExecutionOwnershipAuthority(null, {
    financialAuthorityNamespace: fin,
    frontierAuthority,
    namespaceAuthority,
    faultInjector
  });
  const root = effect({ tag: `${tag}:root`, units });
  register(fin, authority, root);
  const seed = stateFor({ fin, authority, persistence });
  eq(apply(seed, root, exponent, units), true, `${tag}: quarantined root financial candidate prepares`);
  const seedSnapshot = seed.snapshot();
  const seedCheckpoint = seed.checkpoint();
  const seedHead = seed.headCandidate();
  const persistedOwnership = authority.snapshot();
  const acceptedAuthority = createFencedExecutionOwnershipAuthority(persistedOwnership, {
    financialAuthorityNamespace: fin,
    frontierAuthority,
    namespaceAuthority,
    faultInjector
  });
  const headRef = { current: { ...seedHead } };
  const accepted = stateFor({ fin, authority: acceptedAuthority, persistence, headRef });
  eq(accepted.restore(seedSnapshot, seedCheckpoint), true, `${tag}: fenced ownership + canonical financial restore accepts exact lineage`);
  return { fin, persistence, namespaceAuthority, frontierAuthority, authority: acceptedAuthority, state: accepted, headRef, root };
};

eq(acceptance.security_revision, 11, 'security revision 11 namespace-genesis family is active');
eq(acceptance.execution_ownership_frontier.bootstrap_requires_independent_namespace_genesis_authority, true, 'combined suite requires independent genesis authority');
eq(acceptance.cross_authority_atomicity.fenced_ownership_and_canonical_materialization_combined_suite_required, true, 'combined fenced ownership/materialization suite is mandatory');
eq(acceptance.recovery.missing_frontier_after_prior_namespace_use_freezes_dispatch_and_materialization, true, 'missing frontier after prior use freezes the combined authority');

{
  const fin = 'phase-c1:financial-authority:combined:genesis';
  const namespaceAuthority = createInMemoryExecutionOwnershipNamespaceAuthority({ financialAuthorityNamespace: fin });
  const frontierAuthority = createInMemoryExecutionOwnershipFrontierAuthority({ financialAuthorityNamespace: fin });
  const authority = createFencedExecutionOwnershipAuthority(null, { financialAuthorityNamespace: fin, frontierAuthority, namespaceAuthority });
  eq(authority.frontierHead().sequence, 0, 'true first namespace bootstrap starts sequence zero');
  const pending = effect({ tag: 'genesis:pending' });
  eq(authority.reserveCorrelationForDispatch(correlation(fin, pending))?.dispatch_allowed, true, 'first namespace may reserve dispatch once');
  eq(authority.markUnknown({ financial_authority_namespace: fin, execution_request_ref: pending.execution_request_ref, spend_intent_id: pending.spend_intent_id, operation_id: pending.operation_id }), true, 'pending can become unknown before financial effect');
  const resetFrontier = createInMemoryExecutionOwnershipFrontierAuthority({ financialAuthorityNamespace: fin });
  throws(
    () => createFencedExecutionOwnershipAuthority(null, { financialAuthorityNamespace: fin, frontierAuthority: resetFrontier, namespaceAuthority }),
    /missing execution ownership frontier for existing namespace/,
    'pending to unknown plus snapshot/frontier loss freezes rather than re-bootstrap'
  );
}

{
  const fin = 'phase-c1:financial-authority:combined:observed-reset';
  const namespaceAuthority = createInMemoryExecutionOwnershipNamespaceAuthority({ financialAuthorityNamespace: fin });
  const frontierAuthority = createInMemoryExecutionOwnershipFrontierAuthority({ financialAuthorityNamespace: fin });
  const authority = createFencedExecutionOwnershipAuthority(null, { financialAuthorityNamespace: fin, frontierAuthority, namespaceAuthority });
  const observed = effect({ tag: 'observed-reset' });
  register(fin, authority, observed);
  const resetFrontier = createInMemoryExecutionOwnershipFrontierAuthority({ financialAuthorityNamespace: fin });
  throws(
    () => createFencedExecutionOwnershipAuthority(null, { financialAuthorityNamespace: fin, frontierAuthority: resetFrontier, namespaceAuthority }),
    /missing execution ownership frontier for existing namespace/,
    'effect-observed plus missing snapshot/frontier cannot recreate owner authority'
  );
}

{
  const fin = 'phase-c1:financial-authority:combined:tombstone-reset';
  const namespaceAuthority = createInMemoryExecutionOwnershipNamespaceAuthority({ financialAuthorityNamespace: fin });
  const frontierAuthority = createInMemoryExecutionOwnershipFrontierAuthority({ financialAuthorityNamespace: fin });
  const authority = createFencedExecutionOwnershipAuthority(null, { financialAuthorityNamespace: fin, frontierAuthority, namespaceAuthority });
  const released = effect({ tag: 'tombstone-reset' });
  eq(authority.reserveCorrelationForDispatch(correlation(fin, released))?.dispatch_allowed, true, 'tombstone scenario reserves once');
  eq(authority.markUnknown({ financial_authority_namespace: fin, execution_request_ref: released.execution_request_ref, spend_intent_id: released.spend_intent_id, operation_id: released.operation_id }), true, 'tombstone scenario enters unknown');
  eq(authority.releaseCorrelationAfterNoEffect({ financial_authority_namespace: fin, execution_request_ref: released.execution_request_ref, authoritative_no_effect: true }), true, 'authoritative no-effect creates tombstone');
  const resetFrontier = createInMemoryExecutionOwnershipFrontierAuthority({ financialAuthorityNamespace: fin });
  throws(
    () => createFencedExecutionOwnershipAuthority(null, { financialAuthorityNamespace: fin, frontierAuthority: resetFrontier, namespaceAuthority }),
    /missing execution ownership frontier for existing namespace/,
    'tombstoned namespace cannot reset into fresh request authority'
  );
}

{
  const sample = bundle('anti-rollback');
  const beforeAdvance = sample.authority.snapshot();
  const advance = effect({ tag: 'anti-rollback:advance' });
  eq(sample.authority.reserveCorrelationForDispatch(correlation(sample.fin, advance))?.dispatch_allowed, true, 'frontier advances after accepted financial baseline');
  throws(
    () => createFencedExecutionOwnershipAuthority(beforeAdvance, {
      financialAuthorityNamespace: sample.fin,
      frontierAuthority: sample.frontierAuthority,
      namespaceAuthority: sample.namespaceAuthority
    }),
    /stale or forked execution ownership frontier/,
    'stale valid ownership snapshot is rejected against newer frontier'
  );
  const forged = structuredClone(beforeAdvance);
  forged.tombstoned_requests = [...forged.tombstoned_requests, JSON.stringify([sample.fin, 'req:forged'])];
  forged.execution_ownership_frontier_head.digest = executionOwnershipReplayDigest(forged);
  throws(
    () => createFencedExecutionOwnershipAuthority(forged, {
      financialAuthorityNamespace: sample.fin,
      frontierAuthority: createInMemoryExecutionOwnershipFrontierAuthority({ financialAuthorityNamespace: sample.fin, initialHead: beforeAdvance.execution_ownership_frontier_head }),
      namespaceAuthority: sample.namespaceAuthority
    }),
    /stale or forked execution ownership frontier/,
    'copied and rehashed ownership snapshot cannot self-authorize a different digest'
  );
}

{
  const sample = bundle('cas-loss');
  const shared = sample.authority.snapshot();
  const left = createFencedExecutionOwnershipAuthority(shared, { financialAuthorityNamespace: sample.fin, frontierAuthority: sample.frontierAuthority, namespaceAuthority: sample.namespaceAuthority });
  const right = createFencedExecutionOwnershipAuthority(shared, { financialAuthorityNamespace: sample.fin, frontierAuthority: sample.frontierAuthority, namespaceAuthority: sample.namespaceAuthority });
  const leftReq = effect({ tag: 'cas-loss:left' });
  const rightReq = effect({ tag: 'cas-loss:right' });
  eq(left.reserveCorrelationForDispatch(correlation(sample.fin, leftReq))?.dispatch_allowed, true, 'left writer wins ownership frontier CAS');
  const before = right.snapshot();
  eq(right.reserveCorrelationForDispatch(correlation(sample.fin, rightReq)), null, 'right writer loses CAS and cannot dispatch');
  eq(right.snapshot(), before, 'CAS loser rolls local replay state back exactly');
}

{
  const sample = bundle('lineage');
  const second = effect({ tag: 'lineage:second', units: '200' });
  register(sample.fin, sample.authority, second);
  const wrong = { ...second, operation_id: 'op:lineage:wrong' };
  eq(apply(sample.state, wrong, 2, '1000'), false, 'wrong operation lineage cannot claim observed effect');
  eq(apply(sample.state, second, 2, '1000'), true, 'exact observed owner can materialize under accepted head');
  eq(sample.authority.bindAuthoritativeExternalEffect({ financial_authority_namespace: sample.fin, execution_request_ref: sample.root.execution_request_ref, external_effect_identity: identity(second) }), false, 'external effect cannot be rebound to a different first request');
}

{
  const sample = bundle('parent', { units: '1000' });
  const refund = effect({ tag: 'parent:refund', kind: 'refund', units: '400', parent: sample.root.authoritative_effect_ref });
  refund.spend_intent_id = sample.root.spend_intent_id;
  refund.operation_id = sample.root.operation_id;
  register(sample.fin, sample.authority, refund);
  eq(apply(sample.state, refund, 2, '1000'), true, 'parent-bound refund materializes once');
  const acceptedFinancial = sample.state.snapshot();
  const acceptedCheckpoint = sample.state.checkpoint();
  const acceptedHead = sample.state.headCandidate();
  const persistedOwnership = sample.authority.snapshot();
  const restartedAuthority = createFencedExecutionOwnershipAuthority(persistedOwnership, { financialAuthorityNamespace: sample.fin, frontierAuthority: sample.frontierAuthority, namespaceAuthority: sample.namespaceAuthority });
  const restartedHead = { current: { ...acceptedHead } };
  const restarted = stateFor({ fin: sample.fin, authority: restartedAuthority, persistence: sample.persistence, headRef: restartedHead });
  eq(restarted.restore(acceptedFinancial, acceptedCheckpoint), true, 'restart reconstructs parent/dedupe/aggregate lineage from exact authorities');
  eq(restarted.snapshot(), acceptedFinancial, 'restart preserves exact materialized financial snapshot');
  eq(apply(restarted, refund, 2, '1000'), false, 'duplicate exact refund effect is idempotently non-materializing');
}

for (const exponent of [0, 3, 8, 12]) {
  const units = '900719925474099312345678';
  const sample = bundle(`money-${exponent}`, { exponent, units });
  const persistedFinancial = sample.state.snapshot();
  const persistedCheckpoint = sample.state.checkpoint();
  const persistedHead = sample.state.headCandidate();
  const persistedOwnership = sample.authority.snapshot();
  const restartedAuthority = createFencedExecutionOwnershipAuthority(persistedOwnership, { financialAuthorityNamespace: sample.fin, frontierAuthority: sample.frontierAuthority, namespaceAuthority: sample.namespaceAuthority });
  const headRef = { current: { ...persistedHead } };
  const restarted = stateFor({ fin: sample.fin, authority: restartedAuthority, persistence: sample.persistence, headRef });
  eq(restarted.restore(persistedFinancial, persistedCheckpoint), true, `MoneyV1 exponent ${exponent} restores exactly`);
  eq(restarted.snapshot(), persistedFinancial, `MoneyV1 exponent ${exponent} preserves large integer partition`);
}

for (const point of ['before_financial_publication','after_financial_publication','before_ownership_finalization','after_ownership_finalization']) {
  let armed = false;
  const sample = bundle(`live-fault-${point}`, { faultInjector: candidate => { if (armed && candidate === point) throw new Error(`fault:${point}`); } });
  const next = effect({ tag: `live-fault-${point}:next`, units: '100' });
  register(sample.fin, sample.authority, next);
  const before = sample.state.snapshot();
  const beforeHead = { ...sample.headRef.current };
  armed = true;
  throws(() => apply(sample.state, next, 2, '1000'), new RegExp(`fault:${point}`), `${point}: combined live fault is surfaced`);
  eq(sample.state.snapshot(), before, `${point}: financial state rolls back exactly`);
  eq(sample.headRef.current, beforeHead, `${point}: authoritative financial head does not advance`);
}

for (const point of ['restore_before_financial_publication','restore_after_financial_publication','restore_before_ownership_finalization','restore_after_ownership_finalization']) {
  const fin = `phase-c1:financial-authority:combined:restore-fault:${point}`;
  const persistence = `phase-c1:combined:restore-fault:${point}`;
  const namespaceAuthority = createInMemoryExecutionOwnershipNamespaceAuthority({ financialAuthorityNamespace: fin });
  const frontierAuthority = createInMemoryExecutionOwnershipFrontierAuthority({ financialAuthorityNamespace: fin });
  let armed = false;
  const authority = createFencedExecutionOwnershipAuthority(null, { financialAuthorityNamespace: fin, frontierAuthority, namespaceAuthority, faultInjector: candidate => { if (armed && candidate === point) throw new Error(`fault:${point}`); } });
  const targetRoot = effect({ tag: `restore-fault:${point}:root`, units: '1000' });
  register(fin, authority, targetRoot);
  const targetSeed = stateFor({ fin, authority, persistence });
  eq(apply(targetSeed, targetRoot, 2, '1000'), true, `${point}: target quarantined candidate prepares`);
  const targetSnapshot = targetSeed.snapshot();
  const targetCheckpoint = targetSeed.checkpoint();
  const targetHead = targetSeed.headCandidate();
  const persistedOwnership = authority.snapshot();
  const restoreAuthority = createFencedExecutionOwnershipAuthority(persistedOwnership, { financialAuthorityNamespace: fin, frontierAuthority, namespaceAuthority, faultInjector: candidate => { if (armed && candidate === point) throw new Error(`fault:${point}`); } });
  const headRef = { current: { ...targetHead } };
  const target = stateFor({ fin, authority: restoreAuthority, persistence, headRef });
  const before = target.snapshot();
  armed = true;
  throws(() => target.restore(targetSnapshot, targetCheckpoint), new RegExp(`fault:${point}`), `${point}: combined restore fault is surfaced`);
  eq(target.snapshot(), before, `${point}: failed restore leaves local financial state untouched`);
}

{
  const sample = bundle('materialization-freeze');
  const resetFrontier = createInMemoryExecutionOwnershipFrontierAuthority({ financialAuthorityNamespace: sample.fin });
  throws(
    () => createFencedExecutionOwnershipAuthority(null, { financialAuthorityNamespace: sample.fin, frontierAuthority: resetFrontier, namespaceAuthority: sample.namespaceAuthority }),
    /missing execution ownership frontier for existing namespace/,
    'missing frontier after prior financial acceptance freezes future materialization authority'
  );
}

console.log(JSON.stringify({ suite: 'phase-c1-fenced-cross-authority-atomicity', checks, result: 'pass' }));
