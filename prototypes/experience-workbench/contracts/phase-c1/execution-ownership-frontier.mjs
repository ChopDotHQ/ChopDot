// Phase C1 rail-neutral execution-ownership anti-rollback frontier.
//
// materialization-state.mjs owns the deterministic execution-correlation/effect-owner
// model. This wrapper adds the independently authoritative, namespace-bound monotonic
// frontier required for dispatch/replay safety across restart. The frontier covers all
// state that can reopen or reassign execution authority before financial materialization:
// pending/unknown correlations, observed external-effect bindings and request tombstones.
// Materialization-only status changes are normalized so the financial commit path can
// advance independently without weakening replay protection.
//
// Namespace genesis is a separate durable authority. A missing ownership frontier is
// never proof that a namespace is new: once genesis exists, loss/reset/unavailability of
// the frontier fails closed rather than empty-bootstrapping replay authority.

import { createHash } from 'node:crypto';
import { createInMemoryExecutionOwnershipAuthority } from './materialization-state.mjs';

const FRONTIER_VERSION = 1;
const GENESIS_VERSION = 1;
const present = value => value !== null && value !== undefined && (typeof value !== 'string' || value.trim().length > 0);
const clone = value => structuredClone(value);
const keyOf = value => JSON.stringify([
  value.financial_authority_namespace,
  value.execution_request_ref
]);
const ownerKeyOf = value => JSON.stringify([
  value.financial_authority_namespace,
  value.external_effect_identity?.adapter_id,
  value.external_effect_identity?.rail_identity,
  value.external_effect_identity?.authoritative_effect_ref
]);
const normalizeCorrelationStatus = status => ['effect_observed', 'materialized'].includes(status) ? 'effect_bound' : status;

const replayRows = snapshot => ({
  correlations: (snapshot?.correlations ?? []).map(value => ({
    financial_authority_namespace: value.financial_authority_namespace,
    execution_request_ref: value.execution_request_ref,
    spend_intent_id: value.spend_intent_id,
    operation_id: value.operation_id,
    adapter_id: value.adapter_id,
    rail_identity: value.rail_identity,
    status: normalizeCorrelationStatus(value.status)
  })).sort((a, b) => keyOf(a).localeCompare(keyOf(b))),
  effect_owners: (snapshot?.effect_owners ?? []).map(value => ({
    financial_authority_namespace: value.financial_authority_namespace,
    execution_request_ref: value.execution_request_ref,
    external_effect_identity: { ...value.external_effect_identity },
    status: 'effect_bound'
  })).sort((a, b) => ownerKeyOf(a).localeCompare(ownerKeyOf(b))),
  tombstoned_requests: [...(snapshot?.tombstoned_requests ?? [])].sort()
});

export const executionOwnershipReplayDigest = snapshot =>
  createHash('sha256').update(JSON.stringify(replayRows(snapshot))).digest('hex');

const sameHead = (left, right) =>
  left?.version === FRONTIER_VERSION && right?.version === FRONTIER_VERSION &&
  left?.financial_authority_namespace === right?.financial_authority_namespace &&
  left?.sequence === right?.sequence && left?.digest === right?.digest;

const headFor = (financialAuthorityNamespace, sequence, snapshot) => ({
  version: FRONTIER_VERSION,
  financial_authority_namespace: financialAuthorityNamespace,
  sequence,
  digest: executionOwnershipReplayDigest(snapshot)
});

const validGenesis = (record, financialAuthorityNamespace) => record &&
  record.version === GENESIS_VERSION &&
  record.financial_authority_namespace === financialAuthorityNamespace &&
  present(record.genesis_replay_digest);

const genesisFor = (financialAuthorityNamespace, snapshot) => ({
  version: GENESIS_VERSION,
  financial_authority_namespace: financialAuthorityNamespace,
  genesis_replay_digest: executionOwnershipReplayDigest(snapshot)
});

// Acceptance-model seam for an independently durable, create-once namespace existence
// record. Production adapters must provide equivalent replay-protected/append-only
// semantics. Resetting the ownership frontier does not reset this authority.
export const createInMemoryExecutionOwnershipNamespaceAuthority = ({ financialAuthorityNamespace, initialRecord = null } = {}) => {
  if (!present(financialAuthorityNamespace)) throw new Error('execution ownership namespace authority requires financial authority namespace');
  let current = initialRecord ? clone(initialRecord) : null;
  if (current && !validGenesis(current, financialAuthorityNamespace)) throw new Error('invalid execution ownership namespace genesis record');

  const read = () => current ? clone(current) : null;
  const claimGenesis = snapshot => {
    if (current !== null) return null;
    current = genesisFor(financialAuthorityNamespace, snapshot);
    return read();
  };

  return { read, claimGenesis };
};

export const createInMemoryExecutionOwnershipFrontierAuthority = ({ financialAuthorityNamespace, initialHead = null } = {}) => {
  if (!present(financialAuthorityNamespace)) throw new Error('execution ownership frontier requires financial authority namespace');
  let current = initialHead ? clone(initialHead) : null;
  if (current && (current.version !== FRONTIER_VERSION || current.financial_authority_namespace !== financialAuthorityNamespace ||
      !Number.isSafeInteger(current.sequence) || current.sequence < 0 || !present(current.digest))) {
    throw new Error('invalid execution ownership frontier head');
  }

  const read = () => current ? clone(current) : null;
  const bootstrap = snapshot => {
    if (current !== null) return null;
    current = headFor(financialAuthorityNamespace, 0, snapshot);
    return read();
  };
  const commit = ({ expected_head, next_snapshot, commit: apply }) => {
    if (!sameHead(current, expected_head) || typeof apply !== 'function') return null;
    const next = headFor(financialAuthorityNamespace, current.sequence + 1, next_snapshot);
    if (next.digest === current.digest) return null;
    if (apply() !== true) return null;
    current = next;
    return read();
  };

  return { read, bootstrap, commit };
};

const failureFor = method => method === 'reserveCorrelationForDispatch' ? null : false;

export const createFencedExecutionOwnershipAuthority = (persisted = null, {
  financialAuthorityNamespace,
  frontierAuthority,
  namespaceAuthority,
  faultInjector = () => {}
} = {}) => {
  if (!present(financialAuthorityNamespace)) throw new Error('fenced execution ownership requires financial authority namespace');
  if (!frontierAuthority || typeof frontierAuthority.read !== 'function' || typeof frontierAuthority.bootstrap !== 'function' ||
      typeof frontierAuthority.commit !== 'function') {
    throw new Error('independent execution ownership frontier authority required');
  }
  if (!namespaceAuthority || typeof namespaceAuthority.read !== 'function' || typeof namespaceAuthority.claimGenesis !== 'function') {
    throw new Error('independent execution ownership namespace genesis authority required');
  }

  const persistedHead = persisted?.execution_ownership_frontier_head ? clone(persisted.execution_ownership_frontier_head) : null;
  const rawPersisted = persisted ? clone(persisted) : null;
  if (rawPersisted) delete rawPersisted.execution_ownership_frontier_head;
  let raw = createInMemoryExecutionOwnershipAuthority(rawPersisted, { faultInjector });
  let localHead;

  const rawDigest = () => executionOwnershipReplayDigest(raw.snapshot());
  const authoritative = frontierAuthority.read();
  let genesis = namespaceAuthority.read();
  if (genesis !== null && !validGenesis(genesis, financialAuthorityNamespace)) {
    throw new Error('invalid execution ownership namespace genesis authority');
  }

  if (persisted) {
    if (genesis === null) throw new Error('missing execution ownership namespace genesis authority');
    if (!persistedHead || persistedHead.version !== FRONTIER_VERSION ||
        persistedHead.financial_authority_namespace !== financialAuthorityNamespace ||
        persistedHead.digest !== rawDigest() || !sameHead(authoritative, persistedHead)) {
      throw new Error('stale or forked execution ownership frontier');
    }
    localHead = persistedHead;
  } else if (authoritative === null) {
    if (genesis !== null) throw new Error('missing execution ownership frontier for existing namespace');
    genesis = namespaceAuthority.claimGenesis(raw.snapshot());
    if (!genesis || !validGenesis(genesis, financialAuthorityNamespace) || genesis.genesis_replay_digest !== rawDigest()) {
      throw new Error('execution ownership namespace genesis race');
    }
    localHead = frontierAuthority.bootstrap(raw.snapshot());
    if (!localHead) throw new Error('execution ownership frontier bootstrap race');
  } else {
    if (genesis === null) throw new Error('missing execution ownership namespace genesis authority');
    const emptyHead = headFor(financialAuthorityNamespace, authoritative.sequence, raw.snapshot());
    if (authoritative.financial_authority_namespace !== financialAuthorityNamespace || authoritative.digest !== emptyHead.digest) {
      throw new Error('existing execution ownership frontier requires exact current snapshot');
    }
    localHead = authoritative;
  }

  const assertAuthoritativeFrontier = () => sameHead(frontierAuthority.read(), localHead) && rawDigest() === localHead.digest;
  const frontierHead = () => clone(localHead);
  const namespaceGenesisRecord = () => clone(genesis);
  const snapshot = () => ({ ...raw.snapshot(), execution_ownership_frontier_head: frontierHead() });

  const mutateReplayAuthority = (method, input) => {
    if (!assertAuthoritativeFrontier()) return failureFor(method);
    const beforeSnapshot = raw.snapshot();
    const beforeHead = frontierHead();
    const beforeDigest = executionOwnershipReplayDigest(beforeSnapshot);
    const result = raw[method](input);
    const failed = method === 'reserveCorrelationForDispatch' ? result === null : result !== true;
    if (failed) return result;
    const nextSnapshot = raw.snapshot();
    const nextDigest = executionOwnershipReplayDigest(nextSnapshot);
    if (nextDigest === beforeDigest) return result;
    const nextHead = frontierAuthority.commit({ expected_head: beforeHead, next_snapshot: nextSnapshot, commit: () => true });
    if (!nextHead) {
      raw = createInMemoryExecutionOwnershipAuthority(beforeSnapshot, { faultInjector });
      return failureFor(method);
    }
    localHead = nextHead;
    return result;
  };

  const reserveCorrelationForDispatch = input => mutateReplayAuthority('reserveCorrelationForDispatch', input);
  const reserveCorrelation = input => reserveCorrelationForDispatch(input)?.accepted === true;
  const markUnknown = input => mutateReplayAuthority('markUnknown', input);
  const bindAuthoritativeExternalEffect = input => mutateReplayAuthority('bindAuthoritativeExternalEffect', input);
  const releaseCorrelationAfterNoEffect = input => mutateReplayAuthority('releaseCorrelationAfterNoEffect', input);

  const requireFresh = (method, ...args) => {
    if (!assertAuthoritativeFrontier()) throw new Error('stale execution ownership frontier');
    return raw[method](...args);
  };

  return {
    reserveCorrelation,
    reserveCorrelationForDispatch,
    markUnknown,
    bindAuthoritativeExternalEffect,
    releaseCorrelationAfterNoEffect,
    beginMaterialization: input => assertAuthoritativeFrontier() ? raw.beginMaterialization(input) : null,
    abortMaterialization: claim => raw.abortMaterialization(claim),
    prepareMaterializationCommit: (input, commitFinancial) => assertAuthoritativeFrontier() ? raw.prepareMaterializationCommit(input, commitFinancial) : null,
    prepareAcceptedLineageCommit: (plan, commitFinancial) => assertAuthoritativeFrontier() ? raw.prepareAcceptedLineageCommit(plan, commitFinancial) : null,
    planAcceptedLineage: input => requireFresh('planAcceptedLineage', input),
    digestForFinancialEffects: (...args) => requireFresh('digestForFinancialEffects', ...args),
    assertAuthoritativeFrontier,
    frontierHead,
    namespaceGenesisRecord,
    snapshot
  };
};
