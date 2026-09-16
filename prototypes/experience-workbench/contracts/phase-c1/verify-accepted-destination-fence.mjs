import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import {
  createFencedExecutionOwnershipAuthority,
  createInMemoryExecutionOwnershipFrontierAuthority,
  createInMemoryExecutionOwnershipNamespaceAuthority
} from './execution-ownership-frontier.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const acceptance = JSON.parse(fs.readFileSync(path.join(here, 'execution-ownership.acceptance.json'), 'utf8'));
let checks = 0;
const eq = (actual, expected, message) => { checks += 1; assert.deepEqual(actual, expected, message); };
const throws = (fn, pattern, message) => { checks += 1; assert.throws(fn, pattern, message); };

const effect = tag => ({
  spend_intent_id: `sp:${tag}`,
  operation_id: `op:${tag}`,
  execution_request_ref: `req:${tag}`,
  adapter_id: 'adapter_destination_fence',
  rail_identity: 'rail_neutral_destination_fence',
  authoritative_effect_ref: `effect:${tag}`
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
const ownershipInput = (fin, value) => ({
  financial_authority_namespace: fin,
  execution_request_ref: value.execution_request_ref,
  spend_intent_id: value.spend_intent_id,
  operation_id: value.operation_id,
  external_effect_identity: identity(value)
});
const descriptor = value => ({
  spend_intent_id: value.spend_intent_id,
  operation_id: value.operation_id,
  external_effect_identity: identity(value)
});
const register = (fin, authority, value) => {
  const reservation = authority.reserveCorrelationForDispatch(correlation(fin, value));
  eq(reservation?.created, true, `${value.operation_id}: correlation is newly reserved`);
  eq(reservation?.dispatch_allowed, true, `${value.operation_id}: only a new reservation grants dispatch`);
  eq(authority.bindAuthoritativeExternalEffect({
    financial_authority_namespace: fin,
    execution_request_ref: value.execution_request_ref,
    external_effect_identity: identity(value)
  }), true, `${value.operation_id}: authoritative external effect binds to its request`);
};

const makeShared = tag => {
  const fin = `phase-c1:financial-authority:destination:${tag}`;
  const namespaceAuthority = createInMemoryExecutionOwnershipNamespaceAuthority({ financialAuthorityNamespace: fin });
  const frontierAuthority = createInMemoryExecutionOwnershipFrontierAuthority({ financialAuthorityNamespace: fin });
  const authority = createFencedExecutionOwnershipAuthority(null, {
    financialAuthorityNamespace: fin,
    frontierAuthority,
    namespaceAuthority
  });
  return { fin, namespaceAuthority, frontierAuthority, authority };
};

eq(acceptance.accepted_destination_revision, 1, 'SI-13 accepted destination fence revision is active');
eq(acceptance.execution_ownership_frontier.accepted_effect_destination_is_shared_financial_namespace_authority, true, 'accepted destination is shared by financial authority namespace');
eq(acceptance.execution_ownership_frontier.one_to_one_financial_to_persistence_namespace_binding, true, 'FIN to persistence binding is one-to-one');
eq(acceptance.execution_ownership_frontier.competing_persistence_namespace_fails_before_financial_commit, true, 'competing persistence namespace must fail before canonical commit');
eq(acceptance.cross_authority_atomicity.accepted_destination_fence_is_shared_by_live_and_restore, true, 'live and restore use the same destination fence');
eq(acceptance.recovery.accepted_destination_binding_survives_restart_and_rollback, true, 'destination binding survives restart and rollback');
eq(acceptance.recovery.missing_destination_binding_after_materialized_use_fails_closed, true, 'missing destination binding after accepted use fails closed');

// Reviewer SI-13 two-instance family: P1 accepts a provider effect under FIN. P2 may
// reconstruct the same execution owner, but cannot canonically commit that effect under
// another persistence namespace. The rejection happens before the financial callback.
{
  const { fin, namespaceAuthority, frontierAuthority, authority } = makeShared('two-instance');
  const p1 = 'phase-c1:persistence:P1';
  const p2 = 'phase-c1:persistence:P2';
  const root = effect('two-instance:root');
  register(fin, authority, root);

  const claim = authority.beginMaterialization(ownershipInput(fin, root));
  eq(Boolean(claim), true, 'P1 obtains the exact observed-effect materialization claim');
  let p1Commits = 0;
  const p1Receipt = authority.prepareMaterializationCommit({ claim, persistence_namespace: p1 }, () => {
    p1Commits += 1;
    return true;
  });
  eq(Boolean(p1Receipt), true, 'P1 is admitted through the shared accepted-destination fence');
  eq(p1Commits, 1, 'P1 financial commit callback executes exactly once');
  eq(p1Receipt.finalize(), true, 'P1 ownership finalization succeeds');
  eq(authority.acceptedPersistenceNamespace(), p1, 'FIN is durably bound to P1');

  const persisted = authority.snapshot();
  const competitor = createFencedExecutionOwnershipAuthority(persisted, {
    financialAuthorityNamespace: fin,
    frontierAuthority,
    namespaceAuthority
  });
  const p2Plan = competitor.planAcceptedLineage({
    financial_authority_namespace: fin,
    persistence_namespace: p2,
    effects: [descriptor(root)]
  });
  let p2RestoreCommits = 0;
  eq(competitor.prepareAcceptedLineageCommit(p2Plan, () => {
    p2RestoreCommits += 1;
    return true;
  }), null, 'P2 cannot restore/accept the already canonical provider effect');
  eq(p2RestoreCommits, 0, 'P2 restore is rejected before any second financial commit');
  eq(competitor.acceptedPersistenceNamespace(), p1, 'P2 cannot rewrite the FIN to persistence binding');

  const next = effect('two-instance:next');
  register(fin, competitor, next);
  const p2Claim = competitor.beginMaterialization(ownershipInput(fin, next));
  eq(Boolean(p2Claim), true, 'P2 can observe another exact owner but still lacks destination authority');
  let p2LiveCommits = 0;
  eq(competitor.prepareMaterializationCommit({ claim: p2Claim, persistence_namespace: p2 }, () => {
    p2LiveCommits += 1;
    return true;
  }), null, 'P2 live materialization is fenced by the same FIN destination binding');
  eq(p2LiveCommits, 0, 'P2 live path is rejected before canonical financial commit');
  eq(competitor.abortMaterialization(p2Claim), true, 'blocked P2 live claim is released locally');

  const durableGenesis = competitor.namespaceGenesisRecord();
  const durableOwnership = competitor.snapshot();
  const durableFrontier = competitor.frontierHead();
  const restartedNamespace = createInMemoryExecutionOwnershipNamespaceAuthority({
    financialAuthorityNamespace: fin,
    initialRecord: durableGenesis
  });
  const restartedFrontier = createInMemoryExecutionOwnershipFrontierAuthority({
    financialAuthorityNamespace: fin,
    initialHead: durableFrontier
  });
  const restarted = createFencedExecutionOwnershipAuthority(durableOwnership, {
    financialAuthorityNamespace: fin,
    frontierAuthority: restartedFrontier,
    namespaceAuthority: restartedNamespace
  });
  eq(restarted.acceptedPersistenceNamespace(), p1, 'restart preserves the create-once P1 destination binding');
  const restartPlan = restarted.planAcceptedLineage({
    financial_authority_namespace: fin,
    persistence_namespace: p2,
    effects: [descriptor(root)]
  });
  let restartCommits = 0;
  eq(restarted.prepareAcceptedLineageCommit(restartPlan, () => {
    restartCommits += 1;
    return true;
  }), null, 'restart cannot replay the accepted effect into P2');
  eq(restartCommits, 0, 'restart replay is fenced before a second financial commit');

  const resetGenesis = { ...durableGenesis, accepted_persistence_namespace: null };
  const resetNamespace = createInMemoryExecutionOwnershipNamespaceAuthority({
    financialAuthorityNamespace: fin,
    initialRecord: resetGenesis
  });
  const resetFrontier = createInMemoryExecutionOwnershipFrontierAuthority({
    financialAuthorityNamespace: fin,
    initialHead: durableFrontier
  });
  throws(
    () => createFencedExecutionOwnershipAuthority(durableOwnership, {
      financialAuthorityNamespace: fin,
      frontierAuthority: resetFrontier,
      namespaceAuthority: resetNamespace
    }),
    /missing accepted persistence destination authority for materialized namespace/,
    'accepted ownership plus reset destination authority freezes instead of re-binding'
  );
}

// A failed financial publication does not release or reassign the FIN namespace itself.
// The structural destination assignment remains create-once, so a later P2 cannot win by
// racing after P1's local/financial rollback.
{
  const { fin, namespaceAuthority, frontierAuthority, authority } = makeShared('rollback');
  const p1 = 'phase-c1:persistence:rollback:P1';
  const p2 = 'phase-c1:persistence:rollback:P2';
  const value = effect('rollback:root');
  register(fin, authority, value);
  const claim = authority.beginMaterialization(ownershipInput(fin, value));
  eq(Boolean(claim), true, 'rollback family obtains observed-effect claim');
  let failedCommits = 0;
  eq(authority.prepareMaterializationCommit({ claim, persistence_namespace: p1 }, () => {
    failedCommits += 1;
    return false;
  }), null, 'failed P1 financial publication returns no ownership receipt');
  eq(failedCommits, 1, 'failed P1 financial callback is attempted once');
  eq(authority.acceptedPersistenceNamespace(), p1, 'P1 namespace assignment survives financial rollback');
  eq(authority.abortMaterialization(claim), true, 'failed P1 active claim is released');

  const competitor = createFencedExecutionOwnershipAuthority(authority.snapshot(), {
    financialAuthorityNamespace: fin,
    frontierAuthority,
    namespaceAuthority
  });
  const p2Claim = competitor.beginMaterialization(ownershipInput(fin, value));
  eq(Boolean(p2Claim), true, 'P2 can inspect the still-observed owner after rollback');
  let p2Commits = 0;
  eq(competitor.prepareMaterializationCommit({ claim: p2Claim, persistence_namespace: p2 }, () => {
    p2Commits += 1;
    return true;
  }), null, 'P2 cannot seize destination authority after P1 rollback');
  eq(p2Commits, 0, 'P2 rollback-race path fails before financial commit');
  eq(competitor.abortMaterialization(p2Claim), true, 'blocked rollback-race claim is released');
}

console.log(JSON.stringify({ suite: 'phase-c1-accepted-destination-fence', checks, result: 'pass' }));
