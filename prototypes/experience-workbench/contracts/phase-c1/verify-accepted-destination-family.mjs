import assert from 'node:assert/strict';
import {
  createFencedExecutionOwnershipAuthority,
  createInMemoryExecutionOwnershipFrontierAuthority,
  createInMemoryExecutionOwnershipNamespaceAuthority
} from './execution-ownership-frontier.mjs';

let checks = 0;
const eq = (actual, expected, message) => { checks += 1; assert.deepEqual(actual, expected, message); };

const effect = ({ tag, kind, parent = null }) => ({
  spend_intent_id: `sp:${tag}`,
  operation_id: `op:${tag}`,
  execution_request_ref: `req:${tag}`,
  adapter_id: 'adapter_destination_family',
  rail_identity: 'rail_neutral_destination_family',
  authoritative_effect_ref: `effect:${tag}`,
  effect_kind: kind,
  authoritative_parent_effect_ref: parent
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

for (const kind of ['capture', 'refund', 'reversal']) {
  const fin = `phase-c1:financial-authority:destination-family:${kind}`;
  const p1 = `phase-c1:persistence:destination-family:${kind}:P1`;
  const p2 = `phase-c1:persistence:destination-family:${kind}:P2`;
  const namespaceAuthority = createInMemoryExecutionOwnershipNamespaceAuthority({ financialAuthorityNamespace: fin });
  const frontierAuthority = createInMemoryExecutionOwnershipFrontierAuthority({ financialAuthorityNamespace: fin });
  const seed = createFencedExecutionOwnershipAuthority(null, { financialAuthorityNamespace: fin, frontierAuthority, namespaceAuthority });
  const value = effect({
    tag: kind,
    kind,
    parent: kind === 'capture' ? null : 'effect:destination-family:capture-parent'
  });

  const reservation = seed.reserveCorrelationForDispatch(correlation(fin, value));
  eq(reservation?.dispatch_allowed, true, `${kind}: exact request receives one dispatch authority`);
  eq(seed.bindAuthoritativeExternalEffect({
    financial_authority_namespace: fin,
    execution_request_ref: value.execution_request_ref,
    external_effect_identity: identity(value)
  }), true, `${kind}: authoritative external effect is bound before the race`);

  // Two exact-current state instances fork before any accepted destination exists.
  const shared = seed.snapshot();
  const left = createFencedExecutionOwnershipAuthority(shared, { financialAuthorityNamespace: fin, frontierAuthority, namespaceAuthority });
  const right = createFencedExecutionOwnershipAuthority(shared, { financialAuthorityNamespace: fin, frontierAuthority, namespaceAuthority });
  const leftClaim = left.beginMaterialization(ownershipInput(fin, value));
  const rightClaim = right.beginMaterialization(ownershipInput(fin, value));
  eq(Boolean(leftClaim), true, `${kind}: P1 exact-current fork obtains an observed-effect claim`);
  eq(Boolean(rightClaim), true, `${kind}: P2 exact-current fork independently obtains the same observed-effect claim`);

  let p1Commits = 0;
  const p1Receipt = left.prepareMaterializationCommit({ claim: leftClaim, persistence_namespace: p1 }, () => {
    p1Commits += 1;
    return true;
  });
  eq(Boolean(p1Receipt), true, `${kind}: P1 wins the shared FIN destination claim`);
  eq(p1Commits, 1, `${kind}: P1 canonical callback executes once`);
  eq(p1Receipt.finalize(), true, `${kind}: P1 ownership finalizes once`);

  let p2Commits = 0;
  eq(right.prepareMaterializationCommit({ claim: rightClaim, persistence_namespace: p2 }, () => {
    p2Commits += 1;
    return true;
  }), null, `${kind}: competing exact-current P2 is rejected by the shared destination fence`);
  eq(p2Commits, 0, `${kind}: P2 loses before canonical financial publication`);
  eq(right.abortMaterialization(rightClaim), true, `${kind}: losing P2 claim is released locally`);
  eq(left.acceptedPersistenceNamespace(), p1, `${kind}: FIN remains create-once bound to P1`);

  // Restart from durable accepted ownership + durable namespace record and prove the same
  // effect cannot be restored into P2. This is intentionally repeated for every terminal
  // effect family while parent/value conservation stays covered by the existing combined
  // and operation-conservation suites.
  const restartedNamespace = createInMemoryExecutionOwnershipNamespaceAuthority({
    financialAuthorityNamespace: fin,
    initialRecord: left.namespaceGenesisRecord()
  });
  const restartedFrontier = createInMemoryExecutionOwnershipFrontierAuthority({
    financialAuthorityNamespace: fin,
    initialHead: left.frontierHead()
  });
  const restarted = createFencedExecutionOwnershipAuthority(left.snapshot(), {
    financialAuthorityNamespace: fin,
    frontierAuthority: restartedFrontier,
    namespaceAuthority: restartedNamespace
  });
  const p2Plan = restarted.planAcceptedLineage({
    financial_authority_namespace: fin,
    persistence_namespace: p2,
    effects: [descriptor(value)]
  });
  let restartCommits = 0;
  eq(restarted.prepareAcceptedLineageCommit(p2Plan, () => {
    restartCommits += 1;
    return true;
  }), null, `${kind}: restart cannot rematerialize accepted effect into P2`);
  eq(restartCommits, 0, `${kind}: restart P2 is rejected before financial publication`);
  eq(restarted.acceptedPersistenceNamespace(), p1, `${kind}: restart preserves P1 destination authority`);
}

console.log(JSON.stringify({ suite: 'phase-c1-accepted-destination-family', checks, result: 'pass' }));
