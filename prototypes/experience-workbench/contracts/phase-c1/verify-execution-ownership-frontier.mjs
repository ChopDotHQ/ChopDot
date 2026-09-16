import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import {
  createFencedExecutionOwnershipAuthority,
  createInMemoryExecutionOwnershipFrontierAuthority
} from './execution-ownership-frontier.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const spend = JSON.parse(fs.readFileSync(path.join(here, 'spend-intent.contract.json'), 'utf8'));
const acceptance = JSON.parse(fs.readFileSync(path.join(here, 'execution-ownership.acceptance.json'), 'utf8'));
let checks = 0;
const eq = (actual, expected, message) => { checks += 1; assert.deepEqual(actual, expected, message); };
const throws = (fn, pattern, message) => { checks += 1; assert.throws(fn, pattern, message); };

const FIN = 'phase-c1:financial-authority:ownership-frontier';
const base = (request, operation) => ({
  financial_authority_namespace: FIN,
  execution_request_ref: request,
  spend_intent_id: `sp:${operation}`,
  operation_id: operation,
  adapter_id: 'adapter_frontier',
  rail_identity: 'rail_frontier',
  status: 'pending'
});
const effectIdentity = ref => ({
  adapter_id: 'adapter_frontier',
  rail_identity: 'rail_frontier',
  authoritative_effect_ref: ref
});

// Contract/acceptance law: replay-critical ownership state must not roll back independently.
eq(spend.identity.unknown_allows_fresh_dispatch, false, 'unknown cannot mint fresh dispatch authority');
eq(spend.execution_correlation.pending_preserves_mapping, true, 'pending correlation is durable replay state');
eq(spend.execution_correlation.unknown_preserves_mapping, true, 'unknown correlation is durable replay state');
eq(spend.execution_correlation.restart_preserves_mapping, true, 'restart preserves execution correlation');
eq(spend.execution_correlation.release_or_rebind_requires_authoritative_no_effect, true, 'release/rebind requires authoritative no-effect truth');
eq(acceptance.execution_ownership_frontier.required_for_production_adapter_acceptance, true, 'production acceptance requires authoritative ownership frontier');
eq(acceptance.execution_ownership_frontier.covers_pending_unknown_effect_observed_and_tombstones, true, 'frontier covers complete replay-critical family');
eq(acceptance.execution_ownership_frontier.restore_requires_exact_latest_frontier, true, 'restore requires latest ownership frontier');
eq(acceptance.execution_ownership_frontier.dispatch_requires_exact_latest_frontier, true, 'dispatch requires latest ownership frontier');

const frontier = createInMemoryExecutionOwnershipFrontierAuthority({ financialAuthorityNamespace: FIN });
const authority0 = createFencedExecutionOwnershipAuthority(null, { financialAuthorityNamespace: FIN, frontierAuthority: frontier });
const O0 = authority0.snapshot();
eq(O0.execution_ownership_frontier_head.sequence, 0, 'empty ownership ledger starts at authoritative frontier sequence zero');

// O0 absent -> pending -> unknown O1. A stale O0 restart must fail before it can mint
// another dispatch; the current O1 restart remains reconciliation-only.
const reqUnknown = base('req:frontier:unknown', 'op_frontier_unknown');
const reserveUnknown = authority0.reserveCorrelationForDispatch(reqUnknown);
eq(reserveUnknown?.created, true, 'pending reservation is durably created');
eq(reserveUnknown?.dispatch_allowed, true, 'new pending reservation grants one dispatch');
eq(authority0.markUnknown({
  financial_authority_namespace: FIN,
  execution_request_ref: reqUnknown.execution_request_ref,
  spend_intent_id: reqUnknown.spend_intent_id,
  operation_id: reqUnknown.operation_id
}), true, 'possible-effect outcome advances correlation to unknown');
const O1 = authority0.snapshot();
eq(O1.execution_ownership_frontier_head.sequence > O0.execution_ownership_frontier_head.sequence, true, 'unknown transition advances monotonic frontier');
throws(
  () => createFencedExecutionOwnershipAuthority(O0, { financialAuthorityNamespace: FIN, frontierAuthority: frontier }),
  /stale or forked execution ownership frontier/,
  'stale pre-dispatch ownership snapshot is rejected against newer unknown frontier'
);
const currentUnknown = createFencedExecutionOwnershipAuthority(O1, { financialAuthorityNamespace: FIN, frontierAuthority: frontier });
const replayUnknown = currentUnknown.reserveCorrelationForDispatch({ ...reqUnknown, status: 'unknown' });
eq(replayUnknown?.created, false, 'restored unknown is not recreated');
eq(replayUnknown?.dispatch_allowed, false, 'restored unknown is reconciliation-only');

// Bind an authoritative effect without financial materialization. The observed binding is
// independently authoritative, so stale O1 cannot erase it and enable first-claim substitution.
eq(currentUnknown.bindAuthoritativeExternalEffect({
  financial_authority_namespace: FIN,
  execution_request_ref: reqUnknown.execution_request_ref,
  external_effect_identity: effectIdentity('effect:frontier:observed')
}), true, 'authoritative effect binds to the exact durable request');
const O2 = currentUnknown.snapshot();
throws(
  () => createFencedExecutionOwnershipAuthority(O1, { financialAuthorityNamespace: FIN, frontierAuthority: frontier }),
  /stale or forked execution ownership frontier/,
  'stale pre-observation snapshot cannot erase observed effect ownership'
);
const currentObserved = createFencedExecutionOwnershipAuthority(O2, { financialAuthorityNamespace: FIN, frontierAuthority: frontier });
eq(currentObserved.assertAuthoritativeFrontier(), true, 'current observed-effect snapshot matches authoritative frontier');

// No-effect release is an ABA-sensitive authority transition. A tombstone must survive
// restart and a stale pre-release snapshot must not make the request reusable.
const reqRelease = base('req:frontier:tombstone', 'op_frontier_tombstone');
eq(currentObserved.reserveCorrelationForDispatch(reqRelease)?.dispatch_allowed, true, 'second pending request is durably reserved');
eq(currentObserved.markUnknown({
  financial_authority_namespace: FIN,
  execution_request_ref: reqRelease.execution_request_ref,
  spend_intent_id: reqRelease.spend_intent_id,
  operation_id: reqRelease.operation_id
}), true, 'second request enters unknown before no-effect reconciliation');
const preRelease = currentObserved.snapshot();
eq(currentObserved.releaseCorrelationAfterNoEffect({
  financial_authority_namespace: FIN,
  execution_request_ref: reqRelease.execution_request_ref,
  authoritative_no_effect: true
}), true, 'authoritative no-effect release creates durable tombstone');
const postRelease = currentObserved.snapshot();
throws(
  () => createFencedExecutionOwnershipAuthority(preRelease, { financialAuthorityNamespace: FIN, frontierAuthority: frontier }),
  /stale or forked execution ownership frontier/,
  'stale pre-tombstone snapshot is rejected'
);
const released = createFencedExecutionOwnershipAuthority(postRelease, { financialAuthorityNamespace: FIN, frontierAuthority: frontier });
eq(released.reserveCorrelationForDispatch(reqRelease), null, 'tombstoned request remains non-reusable after restart');

// Concurrent frontier advancement: two state objects may begin from the same exact
// current snapshot, but after one advances the shared frontier the other cannot dispatch
// or participate in restore/reconciliation from its stale local state.
const shared = released.snapshot();
const left = createFencedExecutionOwnershipAuthority(shared, { financialAuthorityNamespace: FIN, frontierAuthority: frontier });
const right = createFencedExecutionOwnershipAuthority(shared, { financialAuthorityNamespace: FIN, frontierAuthority: frontier });
const leftReq = base('req:frontier:left', 'op_frontier_left');
eq(left.reserveCorrelationForDispatch(leftReq)?.dispatch_allowed, true, 'left writer wins one frontier advancement');
eq(right.assertAuthoritativeFrontier(), false, 'right state detects concurrent frontier advancement');
const rightBefore = right.snapshot();
eq(right.reserveCorrelationForDispatch(base('req:frontier:right', 'op_frontier_right')), null, 'stale right writer cannot mint dispatch authority');
eq(right.snapshot(), rightBefore, 'failed stale dispatch leaves right local ownership state unchanged');
throws(
  () => right.digestForFinancialEffects(FIN, []),
  /stale execution ownership frontier/,
  'restore/reconciliation read path fails closed after concurrent frontier advancement'
);

// Namespace binding is part of the authoritative head; a frontier cannot be replayed
// under another financial namespace.
throws(
  () => createFencedExecutionOwnershipAuthority(left.snapshot(), {
    financialAuthorityNamespace: `${FIN}:other`,
    frontierAuthority: frontier
  }),
  /stale or forked execution ownership frontier/,
  'ownership frontier is financial-namespace bound'
);

console.log(JSON.stringify({ suite: 'phase-c1-execution-ownership-frontier', checks, result: 'pass' }));
