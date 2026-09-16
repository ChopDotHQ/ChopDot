// Canonical Phase C1 rail-neutral materialization state model.
//
// Revision 9 adds an independently durable execution-ownership seam above the
// previously-reviewed proof/MoneyV1/external-effect identity core. A real external
// effect may materialize only when the adapter authority has already correlated the
// outbound execution request to the exact SpendIntent/operation and independently
// bound the authoritative external effect back to that request. Callback/readback
// ordering therefore cannot choose the economic owner.
//
// The public wrapper also fences restore against the full decorated revision-8 head
// (including external_identity_digest) through the exact commit interval. The inner
// revision-7 core still validates its own projected head, while this wrapper requires
// the independently resolved decorated head to remain unchanged immediately inside
// the authoritative commit fence. Digest-only TOCTOU changes therefore fail closed.

import { createCanonicalMaterializationState as createCoreMaterializationState } from './_authoritative-external-effect-state.mjs';

const EXECUTION_OWNERSHIP_VERSION = 1;

const present = value =>
  value !== null &&
  value !== undefined &&
  (typeof value !== 'string' || value.trim().length > 0);

const sameCoreHeadIdentity = (left, right) =>
  left?.head_version === right?.head_version &&
  left?.domain === right?.domain &&
  left?.namespace === right?.namespace &&
  left?.snapshot_version === right?.snapshot_version &&
  left?.generation === right?.generation &&
  left?.lineage_digest === right?.lineage_digest;

const sameHeadIdentity = (left, right) =>
  sameCoreHeadIdentity(left, right) &&
  left?.external_identity_version === right?.external_identity_version &&
  left?.external_identity_digest === right?.external_identity_digest &&
  left?.execution_ownership_version === right?.execution_ownership_version &&
  left?.financial_authority_namespace === right?.financial_authority_namespace;

const sameRestoreHeadIdentity = (left, right) =>
  sameHeadIdentity(left, right) &&
  (left?.prior_generation ?? null) === (right?.prior_generation ?? null) &&
  (left?.prior_lineage_digest ?? null) === (right?.prior_lineage_digest ?? null) &&
  (left?.owner_scoped_cas_token ?? null) === (right?.owner_scoped_cas_token ?? null);

const externalIdentityKey = value => JSON.stringify([
  value.adapter_id,
  value.rail_identity,
  value.authoritative_effect_ref
]);

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
  left?.execution_request_ref === right?.execution_request_ref &&
  left?.spend_intent_id === right?.spend_intent_id &&
  left?.operation_id === right?.operation_id &&
  left?.adapter_id === right?.adapter_id &&
  left?.rail_identity === right?.rail_identity;

const validCorrelation = value =>
  value &&
  present(value.financial_authority_namespace) &&
  present(value.execution_request_ref) &&
  present(value.spend_intent_id) &&
  present(value.operation_id) &&
  present(value.adapter_id) &&
  present(value.rail_identity);

const validExternalIdentity = value =>
  value &&
  present(value.adapter_id) &&
  present(value.rail_identity) &&
  present(value.authoritative_effect_ref);

// Deterministic acceptance-model implementation of the required durable adapter
// authority seam. Production adapters must back the same semantics with durable,
// authoritative storage; this helper is intentionally only a model/test primitive.
export const createInMemoryExecutionOwnershipAuthority = (persisted = null) => {
  const correlations = new Map();
  const effectOwners = new Map();

  const hydrate = source => {
    if (!source) return;
    if (source.version !== EXECUTION_OWNERSHIP_VERSION) {
      throw new Error('unsupported execution ownership authority snapshot');
    }
    for (const value of source.correlations ?? []) {
      if (!validCorrelation(value) || !['pending','unknown','effect_observed'].includes(value.status)) {
        throw new Error('invalid durable execution correlation');
      }
      const key = correlationKey(value.financial_authority_namespace, value.execution_request_ref);
      if (correlations.has(key)) throw new Error('duplicate durable execution correlation');
      correlations.set(key, cloneCorrelation(value));
    }
    for (const row of source.effect_owners ?? []) {
      if (
        !row ||
        !present(row.financial_authority_namespace) ||
        !present(row.execution_request_ref) ||
        !validExternalIdentity(row.external_effect_identity)
      ) throw new Error('invalid durable external-effect ownership binding');
      const correlation = correlations.get(correlationKey(
        row.financial_authority_namespace,
        row.execution_request_ref
      ));
      if (!correlation) throw new Error('external-effect ownership missing durable execution correlation');
      if (
        correlation.adapter_id !== row.external_effect_identity.adapter_id ||
        correlation.rail_identity !== row.external_effect_identity.rail_identity
      ) throw new Error('external-effect ownership crosses adapter/rail correlation namespace');
      const key = effectOwnerKey(row.financial_authority_namespace, row.external_effect_identity);
      if (effectOwners.has(key)) throw new Error('duplicate durable external-effect ownership');
      effectOwners.set(key, {
        financial_authority_namespace: row.financial_authority_namespace,
        execution_request_ref: row.execution_request_ref,
        external_effect_identity: { ...row.external_effect_identity }
      });
    }
  };

  hydrate(persisted);

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
    if (
      present(input.spend_intent_id) && input.spend_intent_id !== existing.spend_intent_id ||
      present(input.operation_id) && input.operation_id !== existing.operation_id
    ) return false;
    correlations.set(key, { ...existing, status: 'unknown' });
    return true;
  };

  const bindAuthoritativeExternalEffect = input => {
    if (
      !input ||
      !present(input.financial_authority_namespace) ||
      !present(input.execution_request_ref) ||
      !validExternalIdentity(input.external_effect_identity)
    ) return false;
    const correlation = correlations.get(correlationKey(
      input.financial_authority_namespace,
      input.execution_request_ref
    ));
    if (!correlation) return false;
    if (
      correlation.adapter_id !== input.external_effect_identity.adapter_id ||
      correlation.rail_identity !== input.external_effect_identity.rail_identity
    ) return false;

    const ownerKey = effectOwnerKey(input.financial_authority_namespace, input.external_effect_identity);
    const existingOwner = effectOwners.get(ownerKey);
    if (existingOwner) return existingOwner.execution_request_ref === input.execution_request_ref;

    effectOwners.set(ownerKey, {
      financial_authority_namespace: input.financial_authority_namespace,
      execution_request_ref: input.execution_request_ref,
      external_effect_identity: { ...input.external_effect_identity }
    });
    const cKey = correlationKey(input.financial_authority_namespace, input.execution_request_ref);
    correlations.set(cKey, { ...correlation, status: 'effect_observed' });
    return true;
  };

  const validateMaterialization = input => {
    if (
      !input ||
      !present(input.financial_authority_namespace) ||
      !present(input.execution_request_ref) ||
      !present(input.spend_intent_id) ||
      !present(input.operation_id) ||
      !validExternalIdentity(input.external_effect_identity)
    ) return false;
    const correlation = correlations.get(correlationKey(
      input.financial_authority_namespace,
      input.execution_request_ref
    ));
    if (!correlation) return false;
    if (
      correlation.spend_intent_id !== input.spend_intent_id ||
      correlation.operation_id !== input.operation_id ||
      correlation.adapter_id !== input.external_effect_identity.adapter_id ||
      correlation.rail_identity !== input.external_effect_identity.rail_identity
    ) return false;
    const owner = effectOwners.get(effectOwnerKey(
      input.financial_authority_namespace,
      input.external_effect_identity
    ));
    return Boolean(owner && owner.execution_request_ref === input.execution_request_ref);
  };

  const releaseCorrelationAfterNoEffect = input => {
    if (
      !input ||
      input.authoritative_no_effect !== true ||
      !present(input.financial_authority_namespace) ||
      !present(input.execution_request_ref)
    ) return false;
    const key = correlationKey(input.financial_authority_namespace, input.execution_request_ref);
    const correlation = correlations.get(key);
    if (!correlation) return false;
    for (const owner of effectOwners.values()) {
      if (
        owner.financial_authority_namespace === input.financial_authority_namespace &&
        owner.execution_request_ref === input.execution_request_ref
      ) return false;
    }
    correlations.delete(key);
    return true;
  };

  const snapshot = () => ({
    version: EXECUTION_OWNERSHIP_VERSION,
    correlations: [...correlations.values()]
      .map(cloneCorrelation)
      .sort((a, b) => correlationKey(a.financial_authority_namespace, a.execution_request_ref)
        .localeCompare(correlationKey(b.financial_authority_namespace, b.execution_request_ref))),
    effect_owners: [...effectOwners.values()]
      .map(value => ({
        financial_authority_namespace: value.financial_authority_namespace,
        execution_request_ref: value.execution_request_ref,
        external_effect_identity: { ...value.external_effect_identity }
      }))
      .sort((a, b) => effectOwnerKey(a.financial_authority_namespace, a.external_effect_identity)
        .localeCompare(effectOwnerKey(b.financial_authority_namespace, b.external_effect_identity)))
  });

  return {
    reserveCorrelation,
    markUnknown,
    bindAuthoritativeExternalEffect,
    validateMaterialization,
    releaseCorrelationAfterNoEffect,
    snapshot
  };
};

const cloneAcceptedCore = ({
  persisted,
  checkpoint,
  authoritativeHead,
  persistenceNamespace,
  verifyAuthoritativeHeadTransition
}) => {
  const resolveCloneHead = () => authoritativeHead;
  const cloneFence = ({ expected_head, commit }) => {
    if (!sameCoreHeadIdentity(resolveCloneHead(), expected_head)) return false;
    return commit() === true;
  };
  const clone = createCoreMaterializationState({
    persistenceNamespace,
    resolveAuthoritativeHead: resolveCloneHead,
    verifyAuthoritativeHeadTransition,
    commitUnderAuthoritativeHeadFence: cloneFence
  });
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
  const ownershipReady =
    financialNamespaceBound &&
    executionOwnershipAuthority &&
    typeof executionOwnershipAuthority.validateMaterialization === 'function';

  let authoritativeAccepted = false;
  let activeRestoreFullHead = null;

  const decorateOwnership = value => ({
    ...value,
    execution_ownership_version: EXECUTION_OWNERSHIP_VERSION,
    financial_authority_namespace: financialAuthorityNamespace
  });

  const validateOwnershipEnvelope = expected => {
    if (!ownershipReady || !expected || !present(expected.execution_request_ref)) return false;
    const externalIdentity = {
      adapter_id: expected.adapter_id,
      rail_identity: expected.rail_identity,
      authoritative_effect_ref: expected.authoritative_effect_ref
    };
    if (!validExternalIdentity(externalIdentity)) return false;
    return executionOwnershipAuthority.validateMaterialization({
      financial_authority_namespace: financialAuthorityNamespace,
      execution_request_ref: expected.execution_request_ref,
      spend_intent_id: expected.spend_intent_id,
      operation_id: expected.operation_id,
      external_effect_identity: externalIdentity
    }) === true;
  };

  const restoreFence = ({ expected_head, prior_head, relation, commit }) => {
    if (!activeRestoreFullHead) return false;
    if (!sameCoreHeadIdentity(activeRestoreFullHead, expected_head)) return false;
    if (typeof resolveAuthoritativeHead !== 'function' || typeof commitUnderAuthoritativeHeadFence !== 'function') {
      return false;
    }
    if (!sameRestoreHeadIdentity(resolveAuthoritativeHead(), activeRestoreFullHead)) return false;

    const fencedCommit = () => {
      if (!sameRestoreHeadIdentity(resolveAuthoritativeHead(), activeRestoreFullHead)) return false;
      return commit() === true;
    };

    return commitUnderAuthoritativeHeadFence({
      expected_head: activeRestoreFullHead,
      prior_head,
      relation,
      commit: fencedCommit
    });
  };

  let core = createCoreMaterializationState({
    resolveAuthoritativeHead,
    verifyAuthoritativeHeadTransition,
    commitUnderAuthoritativeHeadFence: restoreFence,
    persistenceNamespace
  });

  const materialize = args => {
    if (!args || args.proofAccepted !== true || !validateOwnershipEnvelope(args.expected)) return false;

    // Before any authoritative head has been accepted, this object is only a local
    // candidate/quarantine. Ownership is still independently pre-bound, so even a
    // quarantine build cannot make callback ordering choose the economic owner.
    if (!namespaceBound || !authoritativeAccepted) {
      return core.materialize(args);
    }

    // Accepted namespace-bound state may never mutate outside the exact-head fence.
    if (
      typeof resolveAuthoritativeHead !== 'function' ||
      typeof commitUnderAuthoritativeHeadFence !== 'function'
    ) return false;

    const authoritativeHead = resolveAuthoritativeHead();
    const localHead = decorateOwnership(core.headCandidate());
    if (!sameHeadIdentity(authoritativeHead, localHead)) return false;

    // Prepare the full mutation against an isolated reconstruction. Invalid proof,
    // duplicate/out-of-order effects, parent exhaustion and MoneyV1 mismatches all
    // fail here without touching accepted local state or invoking the authority seam.
    const speculative = cloneAcceptedCore({
      persisted: core.snapshot(),
      checkpoint: core.checkpoint(),
      authoritativeHead,
      persistenceNamespace,
      verifyAuthoritativeHeadTransition
    });
    if (speculative.materialize(args) !== true) return false;

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
      fenceAccepted = commitUnderAuthoritativeHeadFence({
        expected_head: authoritativeHead,
        prior_head: authoritativeHead,
        next_head: nextHead,
        relation: 'live_materialization',
        commit
      });
    } catch (error) {
      core = previousCore;
      throw error;
    }

    if (fenceAccepted !== true || commitInvoked !== true) {
      core = previousCore;
      return false;
    }
    return true;
  };

  const restore = (persisted, trustedCheckpoint) => {
    if (!namespaceBound || !financialNamespaceBound || !ownershipReady) {
      throw new Error('authoritative financial namespace and durable execution ownership authority required');
    }
    if (
      persisted?.execution_ownership_version !== EXECUTION_OWNERSHIP_VERSION ||
      trustedCheckpoint?.execution_ownership_version !== EXECUTION_OWNERSHIP_VERSION ||
      persisted?.financial_authority_namespace !== financialAuthorityNamespace ||
      trustedCheckpoint?.financial_authority_namespace !== financialAuthorityNamespace
    ) throw new Error('execution ownership namespace mismatch during restore');
    if (typeof resolveAuthoritativeHead !== 'function') {
      throw new Error('independent authoritative restore head resolver required');
    }
    const resolved = resolveAuthoritativeHead();
    if (
      resolved?.execution_ownership_version !== EXECUTION_OWNERSHIP_VERSION ||
      resolved?.financial_authority_namespace !== financialAuthorityNamespace
    ) throw new Error('authoritative execution ownership namespace head required');

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
