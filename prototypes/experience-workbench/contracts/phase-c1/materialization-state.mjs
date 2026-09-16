// Canonical Phase C1 rail-neutral materialization state model.
//
// Revision 9 execution ownership is a separate durable authority that pre-binds one
// outbound request to one SpendIntent operation before an external effect may be
// materialized. This wrapper keeps that ownership authority and canonical financial
// state on one fail-closed acceptance path: local/pre-authority work is quarantined,
// accepted live mutations commit both authorities in one fenced callback, and restore
// reconstructs or rejects ownership before financial state can be accepted.

import { createHash } from 'node:crypto';
import { createCanonicalMaterializationState as createCoreMaterializationState } from './_authoritative-external-effect-state.mjs';

const EXECUTION_OWNERSHIP_VERSION = 1;
const present = value => value !== null && value !== undefined && (typeof value !== 'string' || value.trim().length > 0);
const digestRows = rows => createHash('sha256').update(JSON.stringify(rows)).digest('hex');

const sameCoreHeadIdentity = (left, right) =>
  left?.head_version === right?.head_version && left?.domain === right?.domain && left?.namespace === right?.namespace &&
  left?.snapshot_version === right?.snapshot_version && left?.generation === right?.generation && left?.lineage_digest === right?.lineage_digest;
const sameHeadIdentity = (left, right) =>
  sameCoreHeadIdentity(left, right) && left?.external_identity_version === right?.external_identity_version &&
  left?.external_identity_digest === right?.external_identity_digest &&
  left?.execution_ownership_version === right?.execution_ownership_version &&
  left?.execution_ownership_digest === right?.execution_ownership_digest &&
  left?.financial_authority_namespace === right?.financial_authority_namespace;
const sameRestoreHeadIdentity = (left, right) =>
  sameHeadIdentity(left, right) &&
  (left?.prior_generation ?? null) === (right?.prior_generation ?? null) &&
  (left?.prior_lineage_digest ?? null) === (right?.prior_lineage_digest ?? null) &&
  (left?.owner_scoped_cas_token ?? null) === (right?.owner_scoped_cas_token ?? null);

const externalIdentityKey = value => JSON.stringify([value.adapter_id, value.rail_identity, value.authoritative_effect_ref]);
const correlationKey = (namespace, requestRef) => JSON.stringify([namespace, requestRef]);
const effectOwnerKey = (namespace, identity) => JSON.stringify([namespace, externalIdentityKey(identity)]);
const cloneCorrelation = value => ({
  financial_authority_namespace: value.financial_authority_namespace,
  execution_request_ref: value.execution_request_ref,
  spend_intent_id: value.spend_intent_id,
  operation_id: value.operation_id,
  adapter_id: value.adapter_id,
  rail_identity: value.rail_identity,
  status: value.status
});
const sameCorrelation = (left, right) =>
  left?.financial_authority_namespace === right?.financial_authority_namespace &&
  left?.execution_request_ref === right?.execution_request_ref && left?.spend_intent_id === right?.spend_intent_id &&
  left?.operation_id === right?.operation_id && left?.adapter_id === right?.adapter_id && left?.rail_identity === right?.rail_identity;
const validCorrelation = value => value && present(value.financial_authority_namespace) && present(value.execution_request_ref) &&
  present(value.spend_intent_id) && present(value.operation_id) && present(value.adapter_id) && present(value.rail_identity);
const validExternalIdentity = value => value && present(value.adapter_id) && present(value.rail_identity) && present(value.authoritative_effect_ref);
const effectDescriptor = value => {
  const identity = value?.external_effect_identity;
  if (!validExternalIdentity(identity) || !present(value?.spend_intent_id) || !present(value?.operation_id)) {
    throw new Error('financial effect missing execution-ownership identity');
  }
  return {
    spend_intent_id: value.spend_intent_id,
    operation_id: value.operation_id,
    external_effect_identity: { ...identity }
  };
};
const descriptorsFromFinancialSnapshot = persisted => (persisted?.effects ?? []).map(entry => {
  if (!Array.isArray(entry) || entry.length !== 2) throw new Error('invalid financial effect entry for execution ownership');
  return effectDescriptor(entry[1]);
});

// Deterministic acceptance-model implementation of the required durable adapter
// authority seam. Production adapters must implement equivalent durable shared
// storage/transaction semantics. reserveCorrelation() is retained only as a boolean
// compatibility helper; production dispatch authority comes from the structured
// reserveCorrelationForDispatch() result and is true only for a newly-created row.
export const createInMemoryExecutionOwnershipAuthority = (persisted = null, { faultInjector = () => {} } = {}) => {
  const correlations = new Map();
  const effectOwners = new Map();
  const tombstonedRequests = new Set();
  const acceptedScopes = new Map();
  let claimCounter = 0;

  const fault = point => faultInjector(point);

  if (persisted) {
    if (persisted.version !== EXECUTION_OWNERSHIP_VERSION) throw new Error('unsupported execution ownership authority snapshot');
    for (const value of persisted.correlations ?? []) {
      if (!validCorrelation(value) || !['pending','unknown','effect_observed','materialized'].includes(value.status)) throw new Error('invalid durable execution correlation');
      const key = correlationKey(value.financial_authority_namespace, value.execution_request_ref);
      if (correlations.has(key)) throw new Error('duplicate durable execution correlation');
      correlations.set(key, cloneCorrelation(value));
    }
    for (const key of persisted.tombstoned_requests ?? []) {
      if (!present(key) || tombstonedRequests.has(key)) throw new Error('invalid execution-request tombstone');
      tombstonedRequests.add(key);
    }
    for (const row of persisted.effect_owners ?? []) {
      if (!row || !present(row.financial_authority_namespace) || !present(row.execution_request_ref) ||
          !validExternalIdentity(row.external_effect_identity) || !['observed','materialized'].includes(row.materialization_status)) {
        throw new Error('invalid durable external-effect ownership binding');
      }
      const correlation = correlations.get(correlationKey(row.financial_authority_namespace, row.execution_request_ref));
      if (!correlation) throw new Error('external-effect ownership missing durable execution correlation');
      if (correlation.adapter_id !== row.external_effect_identity.adapter_id || correlation.rail_identity !== row.external_effect_identity.rail_identity) {
        throw new Error('external-effect ownership crosses adapter/rail correlation namespace');
      }
      const key = effectOwnerKey(row.financial_authority_namespace, row.external_effect_identity);
      if (effectOwners.has(key)) throw new Error('duplicate durable external-effect ownership');
      effectOwners.set(key, {
        financial_authority_namespace: row.financial_authority_namespace,
        execution_request_ref: row.execution_request_ref,
        external_effect_identity: { ...row.external_effect_identity },
        materialization_status: row.materialization_status,
        active_claim: null
      });
    }
    for (const row of persisted.accepted_scopes ?? []) {
      if (!row || !present(row.persistence_namespace) || !Array.isArray(row.owner_keys)) throw new Error('invalid accepted execution-ownership scope');
      const keys = new Set(row.owner_keys);
      if (keys.size !== row.owner_keys.length) throw new Error('duplicate accepted execution-ownership scope row');
      for (const key of keys) if (!effectOwners.has(key)) throw new Error('accepted execution-ownership scope references missing owner');
      acceptedScopes.set(row.persistence_namespace, keys);
    }
  }

  const reserveCorrelationForDispatch = input => {
    if (!validCorrelation(input)) return null;
    const value = { ...cloneCorrelation(input), status: input.status ?? 'pending' };
    if (!['pending','unknown'].includes(value.status)) return null;
    const key = correlationKey(value.financial_authority_namespace, value.execution_request_ref);
    if (tombstonedRequests.has(key)) return null;
    const existing = correlations.get(key);
    if (existing) {
      if (!sameCorrelation(existing, value)) return null;
      return {
        accepted: true,
        created: false,
        dispatch_allowed: false,
        status: existing.status,
        execution_request_ref: existing.execution_request_ref
      };
    }
    if (value.status !== 'pending') return null;
    correlations.set(key, value);
    return {
      accepted: true,
      created: true,
      dispatch_allowed: true,
      status: value.status,
      execution_request_ref: value.execution_request_ref
    };
  };

  const reserveCorrelation = input => reserveCorrelationForDispatch(input)?.accepted === true;

  const markUnknown = input => {
    if (!input || !present(input.financial_authority_namespace) || !present(input.execution_request_ref)) return false;
    const key = correlationKey(input.financial_authority_namespace, input.execution_request_ref);
    const existing = correlations.get(key);
    if (!existing || existing.status === 'materialized') return false;
    if ((present(input.spend_intent_id) && input.spend_intent_id !== existing.spend_intent_id) ||
        (present(input.operation_id) && input.operation_id !== existing.operation_id)) return false;
    correlations.set(key, { ...existing, status: 'unknown' });
    return true;
  };

  const bindAuthoritativeExternalEffect = input => {
    if (!input || !present(input.financial_authority_namespace) || !present(input.execution_request_ref) || !validExternalIdentity(input.external_effect_identity)) return false;
    const cKey = correlationKey(input.financial_authority_namespace, input.execution_request_ref);
    const correlation = correlations.get(cKey);
    if (!correlation || correlation.status === 'materialized') return false;
    if (correlation.adapter_id !== input.external_effect_identity.adapter_id || correlation.rail_identity !== input.external_effect_identity.rail_identity) return false;
    const ownerKey = effectOwnerKey(input.financial_authority_namespace, input.external_effect_identity);
    const existing = effectOwners.get(ownerKey);
    if (existing) return existing.execution_request_ref === input.execution_request_ref;
    effectOwners.set(ownerKey, {
      financial_authority_namespace: input.financial_authority_namespace,
      execution_request_ref: input.execution_request_ref,
      external_effect_identity: { ...input.external_effect_identity },
      materialization_status: 'observed',
      active_claim: null
    });
    correlations.set(cKey, { ...correlation, status: 'effect_observed' });
    return true;
  };

  const exactOwner = input => {
    if (!input || !present(input.financial_authority_namespace) || !present(input.execution_request_ref) ||
        !present(input.spend_intent_id) || !present(input.operation_id) || !validExternalIdentity(input.external_effect_identity)) return null;
    const correlation = correlations.get(correlationKey(input.financial_authority_namespace, input.execution_request_ref));
    if (!correlation || correlation.spend_intent_id !== input.spend_intent_id || correlation.operation_id !== input.operation_id ||
        correlation.adapter_id !== input.external_effect_identity.adapter_id || correlation.rail_identity !== input.external_effect_identity.rail_identity) return null;
    const owner = effectOwners.get(effectOwnerKey(input.financial_authority_namespace, input.external_effect_identity));
    if (!owner || owner.execution_request_ref !== input.execution_request_ref) return null;
    return owner;
  };

  const beginMaterialization = input => {
    const owner = exactOwner(input);
    if (!owner || owner.materialization_status !== 'observed' || owner.active_claim !== null) return null;
    claimCounter += 1;
    const token = `execution-claim:${claimCounter}`;
    owner.active_claim = token;
    return { token, owner_key: effectOwnerKey(input.financial_authority_namespace, input.external_effect_identity) };
  };
  const abortMaterialization = claim => {
    const owner = claim ? effectOwners.get(claim.owner_key) : null;
    if (!owner || owner.active_claim !== claim.token || owner.materialization_status !== 'observed') return false;
    owner.active_claim = null;
    return true;
  };

  const immutableOwnerRow = owner => {
    const correlation = correlations.get(correlationKey(owner.financial_authority_namespace, owner.execution_request_ref));
    if (!correlation) throw new Error('external owner missing execution correlation');
    return {
      financial_authority_namespace: owner.financial_authority_namespace,
      execution_request_ref: owner.execution_request_ref,
      spend_intent_id: correlation.spend_intent_id,
      operation_id: correlation.operation_id,
      adapter_id: owner.external_effect_identity.adapter_id,
      rail_identity: owner.external_effect_identity.rail_identity,
      authoritative_effect_ref: owner.external_effect_identity.authoritative_effect_ref
    };
  };

  const ownerForDescriptor = (financialNamespace, descriptor) => {
    const key = effectOwnerKey(financialNamespace, descriptor.external_effect_identity);
    const owner = effectOwners.get(key);
    if (!owner) throw new Error('accepted financial effect missing durable execution owner');
    const row = immutableOwnerRow(owner);
    if (row.spend_intent_id !== descriptor.spend_intent_id || row.operation_id !== descriptor.operation_id) {
      throw new Error('accepted financial effect execution owner lineage mismatch');
    }
    return { key, owner, row };
  };

  const digestForFinancialEffects = (financialNamespace, descriptors) => {
    if (!present(financialNamespace)) throw new Error('financial authority namespace required for ownership digest');
    const seen = new Set();
    const rows = descriptors.map(descriptor => {
      const { key, row } = ownerForDescriptor(financialNamespace, descriptor);
      if (seen.has(key)) throw new Error('duplicate financial effect in execution ownership digest');
      seen.add(key);
      return row;
    }).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return digestRows(rows);
  };

  const planAcceptedLineage = ({ financial_authority_namespace, persistence_namespace, effects }) => {
    if (!present(financial_authority_namespace) || !present(persistence_namespace) || !Array.isArray(effects)) {
      throw new Error('accepted execution-ownership lineage scope required');
    }
    const ownerKeys = [];
    const seen = new Set();
    for (const descriptor of effects) {
      const { key } = ownerForDescriptor(financial_authority_namespace, descriptor);
      if (seen.has(key)) throw new Error('accepted execution-ownership lineage repeats external owner');
      seen.add(key);
      ownerKeys.push(key);
    }
    ownerKeys.sort();
    const existing = acceptedScopes.get(persistence_namespace);
    if (existing) {
      const prior = [...existing].sort();
      if (JSON.stringify(prior) !== JSON.stringify(ownerKeys)) throw new Error('accepted execution-ownership scope conflicts with financial lineage');
    }
    return { financial_authority_namespace, persistence_namespace, owner_keys: ownerKeys };
  };

  const receipt = (rollbackFn) => {
    let live = true;
    return {
      finalize: () => { if (!live) return false; live = false; return true; },
      rollback: () => { if (!live) return false; live = false; rollbackFn(); return true; }
    };
  };

  const prepareMaterializationCommit = ({ claim, persistence_namespace }, commitFinancial) => {
    const owner = claim ? effectOwners.get(claim.owner_key) : null;
    if (!owner || owner.active_claim !== claim.token || owner.materialization_status !== 'observed' || !present(persistence_namespace) || typeof commitFinancial !== 'function') return null;
    const cKey = correlationKey(owner.financial_authority_namespace, owner.execution_request_ref);
    const correlation = correlations.get(cKey);
    if (!correlation) return null;
    const priorOwner = { materialization_status: owner.materialization_status, active_claim: owner.active_claim };
    const priorCorrelation = { ...correlation };
    const priorScope = acceptedScopes.has(persistence_namespace) ? new Set(acceptedScopes.get(persistence_namespace)) : null;
    const rollbackState = () => {
      owner.materialization_status = priorOwner.materialization_status;
      owner.active_claim = priorOwner.active_claim;
      correlations.set(cKey, priorCorrelation);
      if (priorScope) acceptedScopes.set(persistence_namespace, new Set(priorScope));
      else acceptedScopes.delete(persistence_namespace);
    };
    try {
      fault('before_financial_publication');
      if (commitFinancial() !== true) { rollbackState(); return null; }
      fault('after_financial_publication');
      fault('before_ownership_finalization');
      owner.materialization_status = 'materialized';
      owner.active_claim = null;
      correlations.set(cKey, { ...correlation, status: 'materialized' });
      const scope = new Set(priorScope ?? []);
      scope.add(claim.owner_key);
      acceptedScopes.set(persistence_namespace, scope);
      fault('after_ownership_finalization');
      return receipt(rollbackState);
    } catch (error) {
      rollbackState();
      throw error;
    }
  };

  const prepareAcceptedLineageCommit = (plan, commitFinancial) => {
    if (!plan || typeof commitFinancial !== 'function') return null;
    const previous = [];
    for (const key of plan.owner_keys) {
      const owner = effectOwners.get(key);
      if (!owner) return null;
      const cKey = correlationKey(owner.financial_authority_namespace, owner.execution_request_ref);
      const correlation = correlations.get(cKey);
      if (!correlation) return null;
      previous.push({ key, owner, cKey, owner_status: owner.materialization_status, active_claim: owner.active_claim, correlation: { ...correlation } });
    }
    const priorScope = acceptedScopes.has(plan.persistence_namespace) ? new Set(acceptedScopes.get(plan.persistence_namespace)) : null;
    const rollbackState = () => {
      for (const row of previous) {
        row.owner.materialization_status = row.owner_status;
        row.owner.active_claim = row.active_claim;
        correlations.set(row.cKey, row.correlation);
      }
      if (priorScope) acceptedScopes.set(plan.persistence_namespace, new Set(priorScope));
      else acceptedScopes.delete(plan.persistence_namespace);
    };
    try {
      fault('restore_before_financial_publication');
      if (commitFinancial() !== true) { rollbackState(); return null; }
      fault('restore_after_financial_publication');
      fault('restore_before_ownership_finalization');
      for (const row of previous) {
        row.owner.materialization_status = 'materialized';
        row.owner.active_claim = null;
        correlations.set(row.cKey, { ...row.correlation, status: 'materialized' });
      }
      acceptedScopes.set(plan.persistence_namespace, new Set(plan.owner_keys));
      fault('restore_after_ownership_finalization');
      return receipt(rollbackState);
    } catch (error) {
      rollbackState();
      throw error;
    }
  };

  const releaseCorrelationAfterNoEffect = input => {
    if (!input || input.authoritative_no_effect !== true || !present(input.financial_authority_namespace) || !present(input.execution_request_ref)) return false;
    const key = correlationKey(input.financial_authority_namespace, input.execution_request_ref);
    if (tombstonedRequests.has(key) || !correlations.has(key)) return false;
    for (const owner of effectOwners.values()) {
      if (owner.financial_authority_namespace === input.financial_authority_namespace && owner.execution_request_ref === input.execution_request_ref) return false;
    }
    correlations.delete(key);
    tombstonedRequests.add(key);
    return true;
  };

  const snapshot = () => ({
    version: EXECUTION_OWNERSHIP_VERSION,
    correlations: [...correlations.values()].map(cloneCorrelation).sort((a,b) => correlationKey(a.financial_authority_namespace,a.execution_request_ref).localeCompare(correlationKey(b.financial_authority_namespace,b.execution_request_ref))),
    effect_owners: [...effectOwners.values()].map(value => ({
      financial_authority_namespace: value.financial_authority_namespace,
      execution_request_ref: value.execution_request_ref,
      external_effect_identity: { ...value.external_effect_identity },
      materialization_status: value.materialization_status
    })).sort((a,b) => effectOwnerKey(a.financial_authority_namespace,a.external_effect_identity).localeCompare(effectOwnerKey(b.financial_authority_namespace,b.external_effect_identity))),
    tombstoned_requests: [...tombstonedRequests].sort(),
    accepted_scopes: [...acceptedScopes.entries()].map(([persistence_namespace, keys]) => ({
      persistence_namespace,
      owner_keys: [...keys].sort()
    })).sort((a,b) => a.persistence_namespace.localeCompare(b.persistence_namespace))
  });

  return {
    reserveCorrelation,
    reserveCorrelationForDispatch,
    markUnknown,
    bindAuthoritativeExternalEffect,
    beginMaterialization,
    abortMaterialization,
    prepareMaterializationCommit,
    prepareAcceptedLineageCommit,
    planAcceptedLineage,
    digestForFinancialEffects,
    releaseCorrelationAfterNoEffect,
    snapshot
  };
};

const cloneAcceptedCore = ({ persisted, checkpoint, authoritativeHead, persistenceNamespace, verifyAuthoritativeHeadTransition }) => {
  const resolveCloneHead = () => authoritativeHead;
  const cloneFence = ({ expected_head, commit }) => sameCoreHeadIdentity(resolveCloneHead(), expected_head) && commit() === true;
  const clone = createCoreMaterializationState({ persistenceNamespace, resolveAuthoritativeHead: resolveCloneHead, verifyAuthoritativeHeadTransition, commitUnderAuthoritativeHeadFence: cloneFence });
  clone.restore(persisted, checkpoint);
  return clone;
};

export const createCanonicalMaterializationState = ({
  resolveAuthoritativeHead,
  verifyAuthoritativeHeadTransition,
  commitUnderAuthoritativeHeadFence,
  persistenceNamespace,
  financialAuthorityNamespace,
  executionOwnershipAuthority
} = {}) => {
  const namespaceBound = present(persistenceNamespace);
  const financialNamespaceBound = present(financialAuthorityNamespace);
  const ownershipReady = financialNamespaceBound && executionOwnershipAuthority &&
    typeof executionOwnershipAuthority.beginMaterialization === 'function' &&
    typeof executionOwnershipAuthority.abortMaterialization === 'function' &&
    typeof executionOwnershipAuthority.prepareMaterializationCommit === 'function' &&
    typeof executionOwnershipAuthority.prepareAcceptedLineageCommit === 'function' &&
    typeof executionOwnershipAuthority.planAcceptedLineage === 'function' &&
    typeof executionOwnershipAuthority.digestForFinancialEffects === 'function';
  let authoritativeAccepted = false;
  let activeRestoreFullHead = null;
  let activeRestoreOwnershipPlan = null;

  const descriptorsForCore = state => descriptorsFromFinancialSnapshot(state.snapshot());
  const ownershipDigestForCore = state => executionOwnershipAuthority.digestForFinancialEffects(financialAuthorityNamespace, descriptorsForCore(state));
  const decorateOwnership = (value, state = core) => ({
    ...value,
    execution_ownership_version: EXECUTION_OWNERSHIP_VERSION,
    financial_authority_namespace: financialAuthorityNamespace,
    execution_ownership_digest: ownershipReady ? ownershipDigestForCore(state) : null
  });
  const ownershipInput = expected => ({
    financial_authority_namespace: financialAuthorityNamespace,
    execution_request_ref: expected?.execution_request_ref,
    spend_intent_id: expected?.spend_intent_id,
    operation_id: expected?.operation_id,
    external_effect_identity: { adapter_id: expected?.adapter_id, rail_identity: expected?.rail_identity, authoritative_effect_ref: expected?.authoritative_effect_ref }
  });

  const restoreFence = ({ expected_head, prior_head, relation, commit }) => {
    if (!activeRestoreFullHead || !activeRestoreOwnershipPlan || !sameCoreHeadIdentity(activeRestoreFullHead, expected_head) ||
        typeof resolveAuthoritativeHead !== 'function' || typeof commitUnderAuthoritativeHeadFence !== 'function') return false;
    if (!sameRestoreHeadIdentity(resolveAuthoritativeHead(), activeRestoreFullHead)) return false;
    let ownershipReceipt = null;
    const fencedCommit = () => {
      if (!sameRestoreHeadIdentity(resolveAuthoritativeHead(), activeRestoreFullHead)) return false;
      ownershipReceipt = executionOwnershipAuthority.prepareAcceptedLineageCommit(activeRestoreOwnershipPlan, commit);
      return ownershipReceipt !== null;
    };
    let accepted;
    try {
      accepted = commitUnderAuthoritativeHeadFence({ expected_head: activeRestoreFullHead, prior_head, relation, commit: fencedCommit });
    } catch (error) {
      ownershipReceipt?.rollback();
      throw error;
    }
    if (accepted !== true) {
      ownershipReceipt?.rollback();
      return false;
    }
    if (!ownershipReceipt || ownershipReceipt.finalize() !== true) return false;
    return true;
  };

  let core = createCoreMaterializationState({ resolveAuthoritativeHead, verifyAuthoritativeHeadTransition, commitUnderAuthoritativeHeadFence: restoreFence, persistenceNamespace });

  const materialize = args => {
    if (!args || args.proofAccepted !== true || !ownershipReady || !namespaceBound || !present(args.expected?.execution_request_ref)) return false;
    const claim = executionOwnershipAuthority.beginMaterialization(ownershipInput(args.expected));
    if (!claim) return false;

    // Before an authoritative head has been accepted, materialization is quarantined:
    // it may prepare local financial state but cannot finalize shared execution ownership.
    if (!authoritativeAccepted) {
      let accepted;
      try {
        accepted = core.materialize(args);
      } catch (error) {
        executionOwnershipAuthority.abortMaterialization(claim);
        throw error;
      }
      const aborted = executionOwnershipAuthority.abortMaterialization(claim);
      if (accepted !== true) return false;
      if (aborted !== true) throw new Error('quarantined materialization could not release active ownership claim');
      return true;
    }

    if (typeof resolveAuthoritativeHead !== 'function' || typeof commitUnderAuthoritativeHeadFence !== 'function') {
      executionOwnershipAuthority.abortMaterialization(claim);
      return false;
    }
    const authoritativeHead = resolveAuthoritativeHead();
    const localHead = decorateOwnership(core.headCandidate(), core);
    if (!sameHeadIdentity(authoritativeHead, localHead)) {
      executionOwnershipAuthority.abortMaterialization(claim);
      return false;
    }

    let speculative;
    try {
      speculative = cloneAcceptedCore({ persisted: core.snapshot(), checkpoint: core.checkpoint(), authoritativeHead, persistenceNamespace, verifyAuthoritativeHeadTransition });
    } catch (error) {
      executionOwnershipAuthority.abortMaterialization(claim);
      throw error;
    }
    if (speculative.materialize(args) !== true) {
      executionOwnershipAuthority.abortMaterialization(claim);
      return false;
    }

    const nextHead = decorateOwnership(speculative.headCandidate(), speculative);
    const previousCore = core;
    let commitInvoked = false;
    let ownershipReceipt = null;
    const commit = () => {
      if (commitInvoked) throw new Error('authoritative live materialization fence invoked commit more than once');
      commitInvoked = true;
      ownershipReceipt = executionOwnershipAuthority.prepareMaterializationCommit({ claim, persistence_namespace: persistenceNamespace }, () => {
        core = speculative;
        return true;
      });
      return ownershipReceipt !== null;
    };

    let fenceAccepted;
    try {
      fenceAccepted = commitUnderAuthoritativeHeadFence({ expected_head: authoritativeHead, prior_head: authoritativeHead, next_head: nextHead, relation: 'live_materialization', commit });
    } catch (error) {
      ownershipReceipt?.rollback();
      core = previousCore;
      executionOwnershipAuthority.abortMaterialization(claim);
      throw error;
    }
    if (fenceAccepted !== true || commitInvoked !== true || !ownershipReceipt) {
      ownershipReceipt?.rollback();
      core = previousCore;
      executionOwnershipAuthority.abortMaterialization(claim);
      return false;
    }
    if (ownershipReceipt.finalize() !== true) {
      core = previousCore;
      throw new Error('durable execution ownership finalization receipt failed');
    }
    return true;
  };

  const restore = (persisted, trustedCheckpoint) => {
    if (!namespaceBound || !financialNamespaceBound || !ownershipReady) throw new Error('authoritative financial namespace and durable execution ownership authority required');
    if (persisted?.execution_ownership_version !== EXECUTION_OWNERSHIP_VERSION || trustedCheckpoint?.execution_ownership_version !== EXECUTION_OWNERSHIP_VERSION ||
        persisted?.financial_authority_namespace !== financialAuthorityNamespace || trustedCheckpoint?.financial_authority_namespace !== financialAuthorityNamespace ||
        !present(persisted?.execution_ownership_digest) || !present(trustedCheckpoint?.execution_ownership_digest)) {
      throw new Error('execution ownership namespace/digest mismatch during restore');
    }
    if (typeof resolveAuthoritativeHead !== 'function') throw new Error('independent authoritative restore head resolver required');
    const resolved = resolveAuthoritativeHead();
    if (resolved?.execution_ownership_version !== EXECUTION_OWNERSHIP_VERSION || resolved?.financial_authority_namespace !== financialAuthorityNamespace ||
        !present(resolved?.execution_ownership_digest)) {
      throw new Error('authoritative execution ownership namespace/digest head required');
    }
    const descriptors = descriptorsFromFinancialSnapshot(persisted);
    const expectedOwnershipDigest = executionOwnershipAuthority.digestForFinancialEffects(financialAuthorityNamespace, descriptors);
    if (persisted.execution_ownership_digest !== expectedOwnershipDigest || trustedCheckpoint.execution_ownership_digest !== expectedOwnershipDigest ||
        resolved.execution_ownership_digest !== expectedOwnershipDigest) {
      throw new Error('financial and execution ownership authority digests do not reconcile');
    }
    const plan = executionOwnershipAuthority.planAcceptedLineage({
      financial_authority_namespace: financialAuthorityNamespace,
      persistence_namespace: persistenceNamespace,
      effects: descriptors
    });
    activeRestoreFullHead = { ...resolved };
    activeRestoreOwnershipPlan = plan;
    try {
      const accepted = core.restore(persisted, trustedCheckpoint);
      if (accepted === true) authoritativeAccepted = true;
      return accepted;
    } finally {
      activeRestoreFullHead = null;
      activeRestoreOwnershipPlan = null;
    }
  };

  return {
    materialize,
    getIntentMoney: spendIntentId => core.getIntentMoney(spendIntentId),
    getEffect: (...args) => core.getEffect(...args),
    checkpoint: () => decorateOwnership(core.checkpoint(), core),
    headCandidate: () => decorateOwnership(core.headCandidate(), core),
    snapshot: () => decorateOwnership(core.snapshot(), core),
    restore
  };
};