import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createCanonicalMaterializationState, createInMemoryExecutionOwnershipAuthority } from './materialization-state.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const spend = JSON.parse(fs.readFileSync(path.join(here, 'spend-intent.contract.json'), 'utf8'));
const ownershipAcceptance = JSON.parse(fs.readFileSync(path.join(here, 'execution-ownership.acceptance.json'), 'utf8'));
let checks = 0;
const eq = (actual, expected, message) => { checks += 1; assert.deepEqual(actual, expected, message); };
const throws = (fn, pattern, message) => { checks += 1; assert.throws(fn, pattern, message); };

const FIN = 'phase-c1:financial-authority:atomic';
const PERSIST = 'phase-c1:atomic-state';
const money = units => ({ minorUnits: BigInt(units), currency: 'USD', exponent: 2 });
const authorizedMoney = money(100000);
const expected = ({ spendId = 'sp_a', operation = 'op_a', request = 'req_a', ref = 'effect_a', units = 1000 }) => ({
  spend_intent_id: spendId,
  operation_id: operation,
  execution_request_ref: request,
  adapter_id: 'adapter_atomic',
  rail_identity: 'rail_atomic',
  authoritative_effect_ref: ref,
  effect_kind: 'capture',
  authoritative_parent_effect_ref: null,
  money_minor_units: String(units)
});
const correlation = effect => ({
  financial_authority_namespace: FIN,
  execution_request_ref: effect.execution_request_ref,
  spend_intent_id: effect.spend_intent_id,
  operation_id: effect.operation_id,
  adapter_id: effect.adapter_id,
  rail_identity: effect.rail_identity,
  status: 'pending'
});
const identity = effect => ({
  adapter_id: effect.adapter_id,
  rail_identity: effect.rail_identity,
  authoritative_effect_ref: effect.authoritative_effect_ref
});
const register = (authority, effect) => {
  const reservation = authority.reserveCorrelationForDispatch(correlation(effect));
  eq(reservation?.accepted, true, 'dispatch correlation is durably accepted');
  eq(reservation?.created, true, 'new dispatch correlation reports newly created ownership');
  eq(reservation?.dispatch_allowed, true, 'only newly created reservation grants fresh dispatch authority');
  eq(authority.bindAuthoritativeExternalEffect({
    financial_authority_namespace: FIN,
    execution_request_ref: effect.execution_request_ref,
    external_effect_identity: identity(effect)
  }), true, 'authoritative effect binds to exact outbound request');
};
const apply = (state, effect) => state.materialize({
  state: 'captured',
  proofAccepted: true,
  expected: effect,
  effectMoney: money(effect.money_minor_units),
  authorizedMoney
});
const sameHead = (left, right) =>
  left?.head_version === right?.head_version && left?.domain === right?.domain && left?.namespace === right?.namespace &&
  left?.snapshot_version === right?.snapshot_version && left?.generation === right?.generation && left?.lineage_digest === right?.lineage_digest &&
  left?.external_identity_version === right?.external_identity_version && left?.external_identity_digest === right?.external_identity_digest &&
  left?.execution_ownership_version === right?.execution_ownership_version && left?.execution_ownership_digest === right?.execution_ownership_digest &&
  left?.financial_authority_namespace === right?.financial_authority_namespace;
const makeFence = headRef => ({ expected_head, next_head, commit }) => {
  if (!sameHead(headRef.current, expected_head)) return false;
  const committed = commit();
  if (committed !== true) return false;
  if (next_head) headRef.current = { ...next_head };
  return true;
};
const stateFor = ({ authority, headRef = null, persistence = PERSIST }) => createCanonicalMaterializationState({
  persistenceNamespace: persistence,
  financialAuthorityNamespace: FIN,
  executionOwnershipAuthority: authority,
  ...(headRef ? { resolveAuthoritativeHead: () => headRef.current, commitUnderAuthoritativeHeadFence: makeFence(headRef) } : {})
});
const ownerStatus = (authority, ref) => authority.snapshot().effect_owners.find(row => row.external_effect_identity.authoritative_effect_ref === ref)?.materialization_status ?? null;
const scopeRows = authority => authority.snapshot().accepted_scopes;

// Contract acceptance rules for the complete adjacent authority family.
eq(spend.security_revision, 9, 'revision-9 ownership family remains active');
eq(ownershipAcceptance.dispatch_reservation.fresh_dispatch_requires_newly_created_reservation, true, 'fresh dispatch requires newly-created durable reservation');
eq(ownershipAcceptance.dispatch_reservation.boolean_idempotent_success_is_dispatch_authority, false, 'boolean idempotent success is not fresh dispatch authority');
eq(ownershipAcceptance.no_effect_release.released_request_ref_is_tombstoned_non_reusable, true, 'released request refs are namespace-wide tombstoned');
eq(ownershipAcceptance.cross_authority_atomicity.financial_and_execution_ownership_commit_is_atomic_or_crash_safe, true, 'financial and ownership commit must be atomic/crash-safe');
eq(ownershipAcceptance.pre_authority_quarantine.materialization_is_quarantined, true, 'pre-authority materialization is quarantined');
eq(ownershipAcceptance.pre_authority_quarantine.may_finalize_shared_ownership, false, 'quarantine cannot burn shared execution ownership');
eq(ownershipAcceptance.recovery.restore_reconciles_financial_and_execution_ownership, true, 'restore reconciles both authorities');
eq(ownershipAcceptance.recovery.execution_ownership_digest_binds_financial_effect_owner_set, true, 'restore/head bind exact financial-effect owner set');

// Unknown/existing reservation can reconcile only; it never becomes fresh dispatch authority.
{
  const authority = createInMemoryExecutionOwnershipAuthority();
  const effect = expected({ request:'req:unknown-gate', ref:'effect:unknown-gate' });
  const first = authority.reserveCorrelationForDispatch(correlation(effect));
  eq(first?.created, true, 'first reservation is created');
  eq(first?.dispatch_allowed, true, 'first reservation may dispatch');
  eq(authority.markUnknown({ financial_authority_namespace:FIN, execution_request_ref:effect.execution_request_ref, spend_intent_id:effect.spend_intent_id, operation_id:effect.operation_id }), true, 'possible-effect transport loss becomes unknown');
  const existing = authority.reserveCorrelationForDispatch(correlation(effect));
  eq(existing?.created, false, 'existing unknown reservation is not recreated');
  eq(existing?.dispatch_allowed, false, 'existing unknown reservation may reconcile only');
  eq(existing?.status, 'unknown', 'structured reservation preserves unknown truth');
}

// Authoritative no-effect release tombstones the request ref, so a stale proof can
// never delete/release a later binding that reused the same request identity.
{
  const authority = createInMemoryExecutionOwnershipAuthority();
  const effect = expected({ request:'req:tombstone', ref:'effect:none' });
  eq(authority.reserveCorrelation(correlation(effect)), true, 'unused request is reserved');
  eq(authority.releaseCorrelationAfterNoEffect({ financial_authority_namespace:FIN, execution_request_ref:effect.execution_request_ref, authoritative_no_effect:true }), true, 'authoritative no-effect releases unused correlation');
  eq(authority.reserveCorrelationForDispatch(correlation(effect)), null, 'released request ref is permanently tombstoned and cannot be rebound');
}

// Pre-authority materialization is a local candidate only: the financial candidate may
// be prepared, but shared external ownership stays observed until the same snapshot is
// accepted through the canonical restore fence.
const bootstrapAuthority = createInMemoryExecutionOwnershipAuthority();
const root = expected({ request:'req:bootstrap', ref:'effect:bootstrap', units:1000 });
register(bootstrapAuthority, root);
const seed = stateFor({ authority:bootstrapAuthority });
eq(apply(seed, root), true, 'quarantined candidate may prepare exact financial effect');
eq(ownerStatus(bootstrapAuthority, root.authoritative_effect_ref), 'observed', 'quarantine does not finalize shared external ownership');
eq(scopeRows(bootstrapAuthority), [], 'quarantine does not publish accepted ownership scope');
const seedSnapshot = seed.snapshot();
const seedCheckpoint = seed.checkpoint();
const seedHead = seed.headCandidate();
const bootstrapAuthoritySnapshot = bootstrapAuthority.snapshot();

const acceptedAuthority = createInMemoryExecutionOwnershipAuthority(bootstrapAuthoritySnapshot);
const acceptedHead = { current:{ ...seedHead } };
const accepted = stateFor({ authority:acceptedAuthority, headRef:acceptedHead });
eq(accepted.restore(seedSnapshot, seedCheckpoint), true, 'canonical restore accepts quarantined financial state and ownership together');
eq(ownerStatus(acceptedAuthority, root.authoritative_effect_ref), 'materialized', 'accepted restore finalizes exact external owner');
eq(scopeRows(acceptedAuthority)[0]?.owner_keys.length, 1, 'accepted restore publishes exact ownership scope');
eq(sameHead(acceptedHead.current, accepted.headCandidate()), true, 'accepted financial head remains bound to exact ownership digest');

// Fault injection at every live cross-authority cut point must leave canonical
// financial state unchanged and the new external owner merely observed/reconcilable.
for (const point of ['before_financial_publication','after_financial_publication','before_ownership_finalization','after_ownership_finalization']) {
  let armed = false;
  const authority = createInMemoryExecutionOwnershipAuthority(acceptedAuthority.snapshot(), {
    faultInjector: candidate => { if (armed && candidate === point) throw new Error(`fault:${point}`); }
  });
  const headRef = { current:{ ...accepted.headCandidate() } };
  const state = stateFor({ authority, headRef });
  eq(state.restore(accepted.snapshot(), accepted.checkpoint()), true, `${point}: accepted baseline restores`);
  const next = expected({ operation:`op_${point}`, request:`req:${point}`, ref:`effect:${point}`, units:100 });
  register(authority, next);
  const before = state.snapshot();
  const beforeHead = { ...headRef.current };
  armed = true;
  throws(() => apply(state, next), new RegExp(`fault:${point}`), `${point}: injected fault is surfaced`);
  eq(state.snapshot(), before, `${point}: financial state rolls back exactly`);
  eq(headRef.current, beforeHead, `${point}: authoritative head is not advanced`);
  eq(ownerStatus(authority, next.authoritative_effect_ref), 'observed', `${point}: external owner stays observed/reconcilable`);
}

// Restore faults obey the same rule: no cut point may leave financial acceptance and
// ownership finalization on opposite sides of a durable boundary.
for (const point of ['restore_before_financial_publication','restore_after_financial_publication','restore_before_ownership_finalization','restore_after_ownership_finalization']) {
  let armed = true;
  const authority = createInMemoryExecutionOwnershipAuthority(bootstrapAuthoritySnapshot, {
    faultInjector: candidate => { if (armed && candidate === point) throw new Error(`fault:${point}`); }
  });
  const headRef = { current:{ ...seedHead } };
  const state = stateFor({ authority, headRef });
  const before = state.snapshot();
  throws(() => state.restore(seedSnapshot, seedCheckpoint), new RegExp(`fault:${point}`), `${point}: restore fault is surfaced`);
  eq(state.snapshot(), before, `${point}: restore leaves local financial state untouched`);
  eq(ownerStatus(authority, root.authoritative_effect_ref), 'observed', `${point}: restore leaves external owner observed`);
  eq(scopeRows(authority), [], `${point}: restore does not strand accepted ownership scope`);
  armed = false;
}

// Missing/forked ownership state must fail before any financial mutation. A stale
// observed status with intact immutable owner lineage is reconstructable and succeeds.
{
  const missingSnapshot = structuredClone(bootstrapAuthoritySnapshot);
  missingSnapshot.effect_owners = [];
  const missing = createInMemoryExecutionOwnershipAuthority(missingSnapshot);
  const headRef = { current:{ ...seedHead } };
  const state = stateFor({ authority:missing, headRef });
  const before = state.snapshot();
  throws(() => state.restore(seedSnapshot, seedCheckpoint), /missing durable execution owner/, 'missing execution owner fails closed before restore');
  eq(state.snapshot(), before, 'missing owner leaves financial state untouched');
}
{
  const forkSnapshot = structuredClone(acceptedAuthority.snapshot());
  forkSnapshot.accepted_scopes[0].owner_keys = [];
  const forked = createInMemoryExecutionOwnershipAuthority(forkSnapshot);
  const headRef = { current:{ ...accepted.headCandidate() } };
  const state = stateFor({ authority:forked, headRef });
  const before = state.snapshot();
  throws(() => state.restore(accepted.snapshot(), accepted.checkpoint()), /scope conflicts/, 'forked ownership scope fails closed');
  eq(state.snapshot(), before, 'forked ownership scope leaves financial state untouched');
}
{
  const stale = structuredClone(acceptedAuthority.snapshot());
  stale.effect_owners[0].materialization_status = 'observed';
  stale.correlations[0].status = 'effect_observed';
  const reconstructable = createInMemoryExecutionOwnershipAuthority(stale);
  const headRef = { current:{ ...accepted.headCandidate() } };
  const state = stateFor({ authority:reconstructable, headRef });
  eq(state.restore(accepted.snapshot(), accepted.checkpoint()), true, 'stale ownership status reconstructs from immutable accepted lineage');
  eq(ownerStatus(reconstructable, root.authoritative_effect_ref), 'materialized', 'reconstruction finalizes exact owner without fresh dispatch authority');
}

// Two state objects sharing one financial authority still cannot consume one external
// effect twice after the first canonical acceptance.
{
  const authority = createInMemoryExecutionOwnershipAuthority();
  const effect = expected({ request:'req:shared-two', ref:'effect:shared-two' });
  register(authority, effect);
  const leftSeed = stateFor({ authority, persistence:'phase-c1:atomic-left' });
  eq(apply(leftSeed, effect), true, 'left candidate prepares shared effect');
  const leftHead = { current:leftSeed.headCandidate() };
  const left = stateFor({ authority, headRef:leftHead, persistence:'phase-c1:atomic-left' });
  eq(left.restore(leftSeed.snapshot(), leftSeed.checkpoint()), true, 'left canonical acceptance finalizes shared effect once');
  const right = stateFor({ authority, persistence:'phase-c1:atomic-right' });
  eq(apply(right, effect), false, 'second state instance cannot re-materialize already accepted shared effect');
}

console.log(JSON.stringify({ suite:'phase-c1-cross-authority-atomicity', checks, result:'pass' }));
