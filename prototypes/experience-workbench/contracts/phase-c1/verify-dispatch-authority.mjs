import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createInMemoryExecutionOwnershipAuthority } from './materialization-state.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const spend = JSON.parse(fs.readFileSync(path.join(here, 'spend-intent.contract.json'), 'utf8'));
let checks = 0;
const eq = (actual, expected, message) => { checks += 1; assert.deepEqual(actual, expected, message); };

const FIN = 'phase-c1:financial-authority:dispatch';
const base = {
  financial_authority_namespace: FIN,
  execution_request_ref: 'req:fresh-unknown:A',
  spend_intent_id: 'sp_fresh_unknown',
  operation_id: 'op_fresh_unknown',
  adapter_id: 'adapter_a',
  rail_identity: 'rail_a'
};

// Bind the executable authority model to the already-approved rail-neutral contract law.
eq(spend.identity.unknown_allows_fresh_dispatch, false, 'contract forbids fresh dispatch from unknown');
eq(spend.recovery.unknown_may_create_new_authority, false, 'unknown cannot create new execution authority');
eq(spend.recovery.unknown_may_dispatch_fresh_value, false, 'unknown cannot dispatch fresh value');
eq(spend.execution_correlation.unknown_preserves_mapping, true, 'unknown preserves an existing durable correlation');
eq(spend.execution_correlation.release_or_rebind_requires_authoritative_no_effect, true, 'rebind requires authoritative no-effect truth');

// A previously absent correlation presented as unknown must fail closed. It may not
// manufacture the durable pre-dispatch row that grants one fresh execution attempt.
{
  const authority = createInMemoryExecutionOwnershipAuthority();
  eq(authority.reserveCorrelationForDispatch({ ...base, status: 'unknown' }), null, 'fresh unknown cannot create dispatch authority');
  eq(authority.snapshot().correlations.length, 0, 'fresh unknown rejection creates no durable correlation');

  const pending = authority.reserveCorrelationForDispatch({ ...base, status: 'pending' });
  eq(pending?.accepted, true, 'fresh pending reservation is accepted');
  eq(pending?.created, true, 'fresh pending reservation creates the exact correlation once');
  eq(pending?.dispatch_allowed, true, 'only the fresh pending reservation mints dispatch authority');
  eq(pending?.status, 'pending', 'fresh dispatch authority starts pending');

  eq(authority.markUnknown({
    financial_authority_namespace: FIN,
    execution_request_ref: base.execution_request_ref,
    spend_intent_id: base.spend_intent_id,
    operation_id: base.operation_id
  }), true, 'possible-effect outcome converts the existing correlation to unknown');

  const existingUnknown = authority.reserveCorrelationForDispatch({ ...base, status: 'unknown' });
  eq(existingUnknown?.accepted, true, 'existing unknown remains admitted for reconciliation');
  eq(existingUnknown?.created, false, 'existing unknown does not create new authority');
  eq(existingUnknown?.dispatch_allowed, false, 'existing unknown never redispatches fresh value');
  eq(existingUnknown?.status, 'unknown', 'existing unknown remains reconciliation-only');

  const restarted = createInMemoryExecutionOwnershipAuthority(authority.snapshot());
  const restartedUnknown = restarted.reserveCorrelationForDispatch({ ...base, status: 'unknown' });
  eq(restartedUnknown?.accepted, true, 'restored unknown remains a valid existing correlation');
  eq(restartedUnknown?.created, false, 'restored unknown cannot recreate dispatch authority');
  eq(restartedUnknown?.dispatch_allowed, false, 'restored unknown remains reconciliation-only after restart');

  eq(restarted.releaseCorrelationAfterNoEffect({
    financial_authority_namespace: FIN,
    execution_request_ref: base.execution_request_ref,
    authoritative_no_effect: false
  }), false, 'unknown correlation cannot release without authoritative no-effect truth');
  eq(restarted.releaseCorrelationAfterNoEffect({
    financial_authority_namespace: FIN,
    execution_request_ref: base.execution_request_ref,
    authoritative_no_effect: true
  }), true, 'authoritative no-effect may retire the unknown correlation');

  eq(restarted.reserveCorrelationForDispatch({ ...base, status: 'pending' }), null, 'tombstoned request reference cannot be rebound');
  const retry = restarted.reserveCorrelationForDispatch({
    ...base,
    execution_request_ref: 'req:fresh-unknown:B',
    operation_id: 'op_fresh_unknown_retry',
    status: 'pending'
  });
  eq(retry?.accepted, true, 'new operation/request may reserve after authoritative no-effect retirement');
  eq(retry?.created, true, 'new operation/request creates a fresh correlation');
  eq(retry?.dispatch_allowed, true, 'new operation/request may mint one fresh dispatch authority');
}

console.log(JSON.stringify({ suite: 'phase-c1-fresh-unknown-dispatch-authority', checks, result: 'pass' }));
