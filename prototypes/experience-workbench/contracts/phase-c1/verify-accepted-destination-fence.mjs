import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import {
  acceptedPersistenceDestinationDigest,
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

eq(acceptance.security_revision, 12, 'security revision 12 SI-13A anti-rollback family is active');
eq(acceptance.accepted_destination_revision, 2, 'accepted destination revision 2 is active');
eq(acceptance.execution_ownership_frontier.accepted_effect_destination_is_shared_financial_namespace_authority, true, 'accepted destination is shared by financial authority namespace');
eq(acceptance.execution_ownership_frontier.one_to_one_financial_to_persistence_namespace_binding, true, 'FIN to persistence binding is one-to-one');
eq(acceptance.execution_ownership_frontier.accepted_destination_binding_is_monotonic_frontier_head, true, 'destination binding lives in the independently resolved monotonic frontier');
eq(acceptance.execution_ownership_frontier.accepted_destination_head_has_sequence_and_digest, true, 'destination head carries sequence and digest');
eq(acceptance.execution_ownership_frontier.stale_destination_head_fails_closed, true, 'stale destination head must fail closed');
eq(acceptance.cross_authority_atomicity.accepted_destination_cas_loss_fails_closed_before_financial_commit, true, 'destination CAS loser fails before financial commit');
eq(acceptance.recovery.stale_null_or_competing_destination_backup_cannot_rebind_authority, true, 'stale null/P2 backup cannot rebind destination authority');

// Reviewer SI-13A exact sequence: O0/N0/F -> P1 claim + canonical materialization ->
// restore stale O0/N0/F -> attempt P2. The P1 claim advances the independently resolved
// frontier even though the replay digest is unchanged by materialization-only status.
{
  const { fin, namespaceAuthority, frontierAuthority, authority } = makeShared('anti-rollback');
  const p1 = 'phase-c1:persistence:P1';
  const p2 = 'phase-c1:persistence:P2';
  const root = effect('anti-rollback:root');
  register(fin, authority, root);

  const staleOwnership = authority.snapshot();
  const staleHead = authority.frontierHead();
  const staleGenesis = authority.namespaceGenesisRecord();
  const left = createFencedExecutionOwnershipAuthority(staleOwnership, { financialAuthorityNamespace: fin, frontierAuthority, namespaceAuthority });
  const right = createFencedExecutionOwnershipAuthority(staleOwnership, { financialAuthorityNamespace: fin, frontierAuthority, namespaceAuthority });
  const leftClaim = left.beginMaterialization(ownershipInput(fin, root));
  const rightClaim = right.beginMaterialization(ownershipInput(fin, root));
  eq(Boolean(leftClaim), true, 'P1 exact-current fork obtains observed-effect claim');
  eq(Boolean(rightClaim), true, 'P2 exact-current fork obtains the same pre-destination claim');

  let p1Commits = 0;
  const p1Receipt = left.prepareMaterializationCommit({ claim: leftClaim, persistence_namespace: p1 }, () => {
    p1Commits += 1;
    return true;
  });
  eq(Boolean(p1Receipt), true, 'P1 wins the monotonic destination head and reaches canonical callback');
  eq(p1Commits, 1, 'P1 canonical callback executes exactly once');
  const wonHead = left.frontierHead();
  eq(wonHead.sequence > staleHead.sequence, true, 'P1 destination claim advances the outer frontier sequence');
  eq(wonHead.accepted_destination_head.sequence > staleHead.accepted_destination_head.sequence, true, 'P1 advances destination-head sequence');
  eq(wonHead.accepted_destination_head.persistence_namespace, p1, 'destination head binds FIN to P1');
  eq(wonHead.accepted_destination_head.digest !== staleHead.accepted_destination_head.digest, true, 'destination claim changes its independently checked digest');

  let p2Commits = 0;
  eq(right.prepareMaterializationCommit({ claim: rightClaim, persistence_namespace: p2 }, () => {
    p2Commits += 1;
    return true;
  }), null, 'concurrent P2 loses because its destination/frontier expected head is stale');
  eq(p2Commits, 0, 'P2 CAS loser fails before financial callback');
  eq(right.abortMaterialization(rightClaim), true, 'losing local P2 claim can be abandoned without changing shared destination authority');
  eq(p1Receipt.finalize(), true, 'P1 ownership finalization succeeds after canonical publication');
  eq(left.acceptedPersistenceNamespace(), p1, 'P1 remains the authoritative destination after finalization');

  throws(
    () => createFencedExecutionOwnershipAuthority(staleOwnership, { financialAuthorityNamespace: fin, frontierAuthority, namespaceAuthority }),
    /stale or forked execution ownership frontier/,
    'stale O0/N0/F cannot restore after P1 destination acceptance'
  );

  // A copied/rehashed portable head is still not authority. Rehash both null and P2
  // variants correctly, then prove the independently resolved current P1 head wins.
  for (const candidate of [null, p2]) {
    const forged = structuredClone(left.snapshot());
    const destination = forged.execution_ownership_frontier_head.accepted_destination_head;
    destination.persistence_namespace = candidate;
    destination.digest = acceptedPersistenceDestinationDigest({
      financial_authority_namespace: fin,
      sequence: destination.sequence,
      persistence_namespace: candidate
    });
    throws(
      () => createFencedExecutionOwnershipAuthority(forged, { financialAuthorityNamespace: fin, frontierAuthority, namespaceAuthority }),
      /stale or forked execution ownership frontier/,
      `same-version rehashed ${candidate ?? 'null'} destination record cannot override current P1 head`
    );
  }

  // Namespace genesis may be copied from before P1 because it no longer carries mutable
  // destination truth. Restart succeeds only because destination freshness comes from the
  // exact independently resolved frontier head.
  const restartedNamespace = createInMemoryExecutionOwnershipNamespaceAuthority({
    financialAuthorityNamespace: fin,
    initialRecord: staleGenesis
  });
  const restartedFrontier = createInMemoryExecutionOwnershipFrontierAuthority({
    financialAuthorityNamespace: fin,
    initialHead: wonHead
  });
  const restarted = createFencedExecutionOwnershipAuthority(left.snapshot(), {
    financialAuthorityNamespace: fin,
    frontierAuthority: restartedFrontier,
    namespaceAuthority: restartedNamespace
  });
  eq(restarted.acceptedPersistenceNamespace(), p1, 'restart resolves P1 from frontier destination head, not mutable genesis');
  const p2Plan = restarted.planAcceptedLineage({
    financial_authority_namespace: fin,
    persistence_namespace: p2,
    effects: [descriptor(root)]
  });
  let restartCommits = 0;
  eq(restarted.prepareAcceptedLineageCommit(p2Plan, () => {
    restartCommits += 1;
    return true;
  }), null, 'restart cannot replay accepted lineage into P2');
  eq(restartCommits, 0, 'restart P2 fails before canonical financial callback');
}

// Crash/failure after destination claim but before financial publication must strand the
// namespace on P1 rather than reopen P2. This is deliberately fail-closed.
{
  const { fin, namespaceAuthority, frontierAuthority, authority } = makeShared('pre-publication-failure');
  const p1 = 'phase-c1:persistence:failure:P1';
  const p2 = 'phase-c1:persistence:failure:P2';
  const value = effect('pre-publication-failure:root');
  register(fin, authority, value);
  const claim = authority.beginMaterialization(ownershipInput(fin, value));
  let failedCommits = 0;
  eq(authority.prepareMaterializationCommit({ claim, persistence_namespace: p1 }, () => {
    failedCommits += 1;
    return false;
  }), null, 'failed P1 financial publication returns no receipt');
  eq(failedCommits, 1, 'P1 callback was attempted once after destination claim');
  eq(authority.acceptedPersistenceNamespace(), p1, 'destination authority stays on P1 after publication failure');
  eq(authority.abortMaterialization(claim), true, 'failed P1 local materialization claim is released');

  const current = createFencedExecutionOwnershipAuthority(authority.snapshot(), { financialAuthorityNamespace: fin, frontierAuthority, namespaceAuthority });
  const retryClaim = current.beginMaterialization(ownershipInput(fin, value));
  let p2Commits = 0;
  eq(current.prepareMaterializationCommit({ claim: retryClaim, persistence_namespace: p2 }, () => {
    p2Commits += 1;
    return true;
  }), null, 'P2 cannot seize destination after P1 publication failure/crash cut');
  eq(p2Commits, 0, 'P2 remains fenced before financial publication');
  eq(current.abortMaterialization(retryClaim), true, 'blocked retry claim is released locally');
}

console.log(JSON.stringify({ suite: 'phase-c1-accepted-destination-fence', checks, result: 'pass' }));
