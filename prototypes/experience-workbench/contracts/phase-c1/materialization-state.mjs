// Canonical Phase C1 rail-neutral materialization state model.
//
// The internal core retains the already-reviewed proof, MoneyV1, lineage,
// conservation, snapshot and restore rules. The authoritative external-effect layer
// adds adapter/rail-scoped identity, cross-Intent uniqueness and parent-namespace
// preservation. This public wrapper then enforces the accepted-head invariant for
// live mutation after a state has become authoritative: every namespace-bound
// post-restore financial materialization is prepared off to the side, then admitted
// only by commitUnderAuthoritativeHeadFence while the exact independently resolved
// current head remains valid. Fence/CAS/storage failure or a stale head therefore
// causes zero mutation of accepted local financial state.
//
// A namespace-bound state that has never successfully restored/accepted an
// authoritative head remains a local candidate/quarantine. It may be built to
// propose an initial head, but it is not accepted authoritative financial state.

import { createCanonicalMaterializationState as createCoreMaterializationState } from './_authoritative-external-effect-state.mjs';

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
  left?.external_identity_digest === right?.external_identity_digest;

const cloneAcceptedCore = ({
  persisted,
  checkpoint,
  authoritativeHead,
  persistenceNamespace,
  verifyAuthoritativeHeadTransition
}) => {
  const resolveCloneHead = () => authoritativeHead;
  const cloneFence = ({ expected_head, commit }) => {
    // The revision-8 external-effect layer validates the decorated authoritative
    // head (including external_identity_digest) before it delegates restore into
    // the revision-7 core. The inner core intentionally projects that head to its
    // own canonical fields before invoking its restore fence. Compare that exact
    // projection here; the outer live-materialization fence below still requires
    // the full decorated revision-8 head identity before accepted state can move.
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
  persistenceNamespace
} = {}) => {
  let core = createCoreMaterializationState({
    resolveAuthoritativeHead,
    verifyAuthoritativeHeadTransition,
    commitUnderAuthoritativeHeadFence,
    persistenceNamespace
  });
  let authoritativeAccepted = false;

  const namespaceBound = present(persistenceNamespace);

  const materialize = args => {
    // Before any authoritative head has been accepted, this object is only a local
    // candidate/quarantine used to construct a proposed initial head. Preserve the
    // existing deterministic model path, but do not treat it as accepted authority.
    if (!namespaceBound || !authoritativeAccepted) {
      return core.materialize(args);
    }

    // Accepted namespace-bound state may never mutate outside the exact-head fence.
    if (
      typeof resolveAuthoritativeHead !== 'function' ||
      typeof commitUnderAuthoritativeHeadFence !== 'function'
    ) {
      return false;
    }

    const authoritativeHead = resolveAuthoritativeHead();
    const localHead = core.headCandidate();
    if (!sameHeadIdentity(authoritativeHead, localHead)) {
      return false;
    }

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
    if (speculative.materialize(args) !== true) {
      return false;
    }

    const nextHead = speculative.headCandidate();
    const previousCore = core;
    let commitInvoked = false;

    const commit = () => {
      if (commitInvoked) {
        throw new Error('authoritative live materialization fence invoked commit more than once');
      }
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
    const accepted = core.restore(persisted, trustedCheckpoint);
    if (accepted === true) authoritativeAccepted = true;
    return accepted;
  };

  return {
    materialize,
    getIntentMoney: spendIntentId => core.getIntentMoney(spendIntentId),
    getEffect: (...args) => core.getEffect(...args),
    checkpoint: () => core.checkpoint(),
    headCandidate: () => core.headCandidate(),
    snapshot: () => core.snapshot(),
    restore
  };
};