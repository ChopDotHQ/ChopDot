// Canonical Phase C1 rail-neutral materialization state model.
//
// Revision 9 adds an independently durable execution-ownership seam above the
// previously-reviewed proof/MoneyV1/external-effect identity core. A real external
// effect may materialize only when adapter authority has already correlated the
// outbound request to the exact SpendIntent/operation and independently bound the
// authoritative external effect back to that request. Callback/readback ordering
// therefore cannot choose the economic owner. The same authority also serializes
// materialization of one external effect across state objects in one financial domain.
//
// Restore is fenced against the full decorated revision-8 head, including
// external_identity_digest, through the exact commit interval. The inner revision-7
// core validates its projection; this wrapper keeps the decorated head valid at the
// commit seam so a digest-only TOCTOU change fails closed.

import { createCanonicalMaterializationState as createCoreMaterializationState } from './_authoritative-external-effect-state.mjs';

const EXECUTION_OWNERSHIP_VERSION = 1;
const present = value => value !== null && value !== undefined && (typeof value !== 'string' || value.trim().length > 0);

const sameCoreHeadIdentity = (left, right) =>
  left?.head_version === right?.head_version && left?.domain === right?.domain && left?.namespace === right?.namespace &&
  left?.snapshot_version === right?.snapshot_version && left?.generation === right?.generation && left?.lineage_digest === right?.lineage_digest;
const sameHeadIdentity = (left, right) =>
  sameCoreHeadIdentity(left, right) && left?.external_identity_version === right?.external_identity_version &&
  left?.external_identity_digest === right?.external_identity_digest &&
  left?.execution_ownership_version === right?.execution_ownership_version &&
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

// Deterministic acceptance-model implementation of the required durable adapter
// authority seam. Production adapters must implement the same semantics with durable,
// shared storage/transactions; this helper itself is only a model/test primitive.
export const createInMemoryExecutionOwnershipAuthority = (persisted = null) => {
  const correlations = new Map();
  const effectOwners = new Map();
  let claimCounter = 0;

  if (persisted) {
    if (persisted.version !== EXECUTION_OWNERSHIP_VERSION) throw new Error('unsupported execution ownership authority snapshot');
    for (const value of persisted.correlations ?? []) {
      if (!validCorrelation(value) || !['pending','unknown','effect_observed'].includes(value.status)) throw new Error('invalid durable execution correlation');
      const key = correlationKey(value.financial_authority_namespace, value.execution_request_ref);
      if (correlations.has(key)) throw new Error('duplicate durable execution correlation');
      correlations.set(key, cloneCorrelation(value));
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
  }

  const reserveCorrelation = input => {
    if (!validCorrelation(input)) return false;
    const value = { ...cloneCorrelation(input), status: input.status ?? 'pending' };
    if (!['pending','unknown'].includes(value.status)) return false;
    const key = correlationKey(value.financial_authority_namespace, value.execution_request_ref);
    const existing = correlations.get(key);
    if (existing) return sameCorrelation(existing, value);
    correlations.set(key, value);
    return true;
  };

  const markUnknown = input => {
    if (!input || !present(input.financial_authority_namespace) || !present(input.execution_request_ref)) return false;
    const key = correlationKey(input.financial_authority_namespace, input.execution_request_ref);
    const existing = correlations.get(key);
    if (!existing) return false;
    if ((present(input.spend_intent_id) && input.spend_intent_id !== existing.spend_intent_id) ||
        (present(input.operation_id) && input.operation_id !== existing.operation_id)) return false;
    correlations.set(key, { ...existing, status: 'unknown' });
    return true;
  };

  const bindAuthoritativeExternalEffect = input => {
    if (!input || !present(input.financial_authority_namespace) || !present(input.execution_request_ref) || !validExternalIdentity(input.external_effect_identity)) return false;
    const cKey = correlationKey(input.financial_authority_namespace, input.execution_request_ref);
    const correlation = correlations.get(cKey);
    if (!correlation) return false;
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
  const commitMaterialization = claim => {
    const owner = claim ? effectOwners.get(claim.owner_key) : null;
    if (!owner || owner.active_claim !== claim.token || owner.materialization_status !== 'observed') return false;
    owner.active_claim = null;
    owner.materialization_status = 'materialized';
    return true;
  };

  const releaseCorrelationAfterNoEffect = input => {
    if (!input || input.authoritative_no_effect !== true || !present(input.financial_authority_namespace) || !present(input.execution_request_ref)) return false;
    const key = correlationKey(input.financial_authority_namespace, input.execution_request_ref);
    if (!correlations.has(key)) return false;
    for (const owner of effectOwners.values()) {
      if (owner.financial_authority_namespace === input.financial_authority_namespace && owner.execution_request_ref === input.execution_request_ref) return false;
    }
    correlations.delete(key);
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
    })).sort((a,b) => effectOwnerKey(a.financial_authority_namespace,a.external_effect_identity).localeCompare(effectOwnerKey(b.financial_authority_namespace,b.external_effect_identity)))
  });

  return { reserveCorrelation, markUnknown, bindAuthoritativeExternalEffect, beginMaterialization, abortMaterialization, commitMaterialization, releaseCorrelationAfterNoEffect, snapshot };
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
    typeof executionOwnershipAuthority.commitMaterialization === 'function';
  let authoritativeAccepted = false;
  let activeRestoreFullHead = null;

  const decorateOwnership = value => ({ ...value, execution_ownership_version: EXECUTION_OWNERSHIP_VERSION, financial_authority_namespace: financialAuthorityNamespace });
  const ownershipInput = expected => ({
    financial_authority_namespace: financialAuthorityNamespace,
    execution_request_ref: expected?.execution_request_ref,
    spend_intent_id: expected?.spend_intent_id,
    operation_id: expected?.operation_id,
    external_effect_identity: { adapter_id: expected?.adapter_id, rail_identity: expected?.rail_identity, authoritative_effect_ref: expected?.authoritative_effect_ref }
  });

  const restoreFence = ({ expected_head, prior_head, relation, commit }) => {
    if (!activeRestoreFullHead || !sameCoreHeadIdentity(activeRestoreFullHead, expected_head) ||
        typeof resolveAuthoritativeHead !== 'function' || typeof commitUnderAuthoritativeHeadFence !== 'function') return false;
    if (!sameRestoreHeadIdentity(resolveAuthoritativeHead(), activeRestoreFullHead)) return false;
    const fencedCommit = () => sameRestoreHeadIdentity(resolveAuthoritativeHead(), activeRestoreFullHead) && commit() === true;
    return commitUnderAuthoritativeHeadFence({ expected_head: activeRestoreFullHead, prior_head, relation, commit: fencedCommit });
  };

  let core = createCoreMaterializationState({ resolveAuthoritativeHead, verifyAuthoritativeHeadTransition, commitUnderAuthoritativeHeadFence: restoreFence, persistenceNamespace });

  const materialize = args => {
    if (!args || args.proofAccepted !== true || !ownershipReady || !present(args.expected?.execution_request_ref)) return false;
    const claim = executionOwnershipAuthority.beginMaterialization(ownershipInput(args.expected));
    if (!claim) return false;

    if (!namespaceBound || !authoritativeAccepted) {
      const accepted = core.materialize(args);
      if (accepted !== true) {
        executionOwnershipAuthority.abortMaterialization(claim);
        return false;
      }
      if (executionOwnershipAuthority.commitMaterialization(claim) !== true) throw new Error('durable execution ownership commit failed');
      return true;
    }

    if (typeof resolveAuthoritativeHead !== 'function' || typeof commitUnderAuthoritativeHeadFence !== 'function') {
      executionOwnershipAuthority.abortMaterialization(claim);
      return false;
    }
    const authoritativeHead = resolveAuthoritativeHead();
    const localHead = decorateOwnership(core.headCandidate());
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

    const nextHead = decorateOwnership(speculative.headCandidate());
    const previousCore = core;
    let commitInvoked = false;
    const commit = () => {
      if (commitInvoked) throw new Error('authoritative live materialization fence invoked commit more than once');
      commitInvoked = true;
      core = speculative;
      return true;
    };

    let fenceAccepted;
    try {
      fenceAccepted = commitUnderAuthoritativeHeadFence({ expected_head: authoritativeHead, prior_head: authoritativeHead, next_head: nextHead, relation: 'live_materialization', commit });
    } catch (error) {
      core = previousCore;
      executionOwnershipAuthority.abortMaterialization(claim);
      throw error;
    }
    if (fenceAccepted !== true || commitInvoked !== true) {
      core = previousCore;
      executionOwnershipAuthority.abortMaterialization(claim);
      return false;
    }
    if (executionOwnershipAuthority.commitMaterialization(claim) !== true) {
      core = previousCore;
      throw new Error('durable execution ownership commit failed');
    }
    return true;
  };

  const restore = (persisted, trustedCheckpoint) => {
    if (!namespaceBound || !financialNamespaceBound || !ownershipReady) throw new Error('authoritative financial namespace and durable execution ownership authority required');
    if (persisted?.execution_ownership_version !== EXECUTION_OWNERSHIP_VERSION || trustedCheckpoint?.execution_ownership_version !== EXECUTION_OWNERSHIP_VERSION ||
        persisted?.financial_authority_namespace !== financialAuthorityNamespace || trustedCheckpoint?.financial_authority_namespace !== financialAuthorityNamespace) {
      throw new Error('execution ownership namespace mismatch during restore');
    }
    if (typeof resolveAuthoritativeHead !== 'function') throw new Error('independent authoritative restore head resolver required');
    const resolved = resolveAuthoritativeHead();
    if (resolved?.execution_ownership_version !== EXECUTION_OWNERSHIP_VERSION || resolved?.financial_authority_namespace !== financialAuthorityNamespace) {
      throw new Error('authoritative execution ownership namespace head required');
    }
    activeRestoreFullHead = { ...resolved };
    try {
      const accepted = core.restore(persisted, trustedCheckpoint);
      if (accepted === true) authoritativeAccepted = true;
      return accepted;
    } finally {
      activeRestoreFullHead = null;
    }
  };

  return {
    materialize,
    getIntentMoney: spendIntentId => core.getIntentMoney(spendIntentId),
    getEffect: (...args) => core.getEffect(...args),
    checkpoint: () => decorateOwnership(core.checkpoint()),
    headCandidate: () => decorateOwnership(core.headCandidate()),
    snapshot: () => decorateOwnership(core.snapshot()),
    restore
  };
};
