import { createHash } from 'node:crypto';
import { createCanonicalMaterializationState as createRevision7MaterializationState } from './_materialization-state-core.mjs';

const EXTERNAL_IDENTITY_VERSION = 1;

const present = value =>
  value !== null &&
  value !== undefined &&
  (typeof value !== 'string' || value.trim().length > 0);

const canonicalIdentity = value => {
  if (
    !value ||
    !present(value.adapter_id) ||
    !present(value.rail_identity) ||
    !present(value.authoritative_effect_ref)
  ) return null;
  return {
    adapter_id: value.adapter_id,
    rail_identity: value.rail_identity,
    authoritative_effect_ref: value.authoritative_effect_ref
  };
};

const identityKey = identity => JSON.stringify([
  identity.adapter_id,
  identity.rail_identity,
  identity.authoritative_effect_ref
]);

const sameIdentity = (left, right) =>
  left?.adapter_id === right?.adapter_id &&
  left?.rail_identity === right?.rail_identity &&
  left?.authoritative_effect_ref === right?.authoritative_effect_ref;

const bindingLookupKey = (spendIntentId, operationId, authoritativeEffectRef) =>
  JSON.stringify([spendIntentId, operationId, authoritativeEffectRef]);

const internalCollisionRef = identity =>
  `SPEND-01:external:${createHash('sha256').update(identityKey(identity)).digest('hex')}`;

const cloneBinding = binding => ({
  external_effect_identity: { ...binding.external_effect_identity },
  spend_intent_id: binding.spend_intent_id,
  operation_id: binding.operation_id,
  effect_kind: binding.effect_kind,
  authoritative_parent_effect_ref: binding.authoritative_parent_effect_ref ?? null,
  internal_ref: binding.internal_ref
});

const immutableBindingRows = bindings => [...bindings.values()]
  .map(binding => ({
    adapter_id: binding.external_effect_identity.adapter_id,
    rail_identity: binding.external_effect_identity.rail_identity,
    authoritative_effect_ref: binding.external_effect_identity.authoritative_effect_ref,
    spend_intent_id: binding.spend_intent_id,
    operation_id: binding.operation_id,
    effect_kind: binding.effect_kind,
    authoritative_parent_effect_ref: binding.authoritative_parent_effect_ref ?? null,
    internal_ref: binding.internal_ref
  }))
  .sort((left, right) => identityKey(left).localeCompare(identityKey(right)));

const bindingDigest = bindings =>
  createHash('sha256').update(JSON.stringify(immutableBindingRows(bindings))).digest('hex');

const sameBinding = (left, right) =>
  JSON.stringify(cloneBinding(left)) === JSON.stringify(cloneBinding(right));

export const createCanonicalMaterializationState = (options = {}) => {
  const core = createRevision7MaterializationState(options);
  let bindingsByIdentity = new Map();
  let bindingKeysByLookup = new Map();
  let internalOwners = new Map();
  let acceptedExternalFrontier = null;

  const addLookup = (lookupMap, binding) => {
    const key = bindingLookupKey(
      binding.spend_intent_id,
      binding.operation_id,
      binding.external_effect_identity.authoritative_effect_ref
    );
    const values = lookupMap.get(key) ?? new Set();
    values.add(identityKey(binding.external_effect_identity));
    lookupMap.set(key, values);
  };

  const registerBinding = binding => {
    const key = identityKey(binding.external_effect_identity);
    if (bindingsByIdentity.has(key)) throw new Error('duplicate canonical external-effect identity');
    const owner = internalOwners.get(binding.internal_ref);
    if (owner && owner !== key) throw new Error('external-effect internal identity collision');
    bindingsByIdentity.set(key, cloneBinding(binding));
    internalOwners.set(binding.internal_ref, key);
    addLookup(bindingKeysByLookup, binding);
  };

  const chooseInternalRef = identity => {
    const raw = identity.authoritative_effect_ref;
    if (!internalOwners.has(raw)) return raw;
    const key = identityKey(identity);
    let candidate = internalCollisionRef(identity);
    let suffix = 0;
    while (internalOwners.has(candidate) && internalOwners.get(candidate) !== key) {
      suffix += 1;
      candidate = `${internalCollisionRef(identity)}:${suffix}`;
    }
    return candidate;
  };

  const decoratedCheckpoint = () => ({
    ...core.checkpoint(),
    external_identity_version: EXTERNAL_IDENTITY_VERSION,
    external_identity_digest: bindingDigest(bindingsByIdentity)
  });

  const decoratedHeadCandidate = () => ({
    ...core.headCandidate(),
    external_identity_version: EXTERNAL_IDENTITY_VERSION,
    external_identity_digest: bindingDigest(bindingsByIdentity)
  });

  const materialize = args => {
    if (!args || args.proofAccepted !== true) return false;
    const expectedIdentity = canonicalIdentity(args.expected);
    if (!expectedIdentity) return false;

    const key = identityKey(expectedIdentity);
    if (bindingsByIdentity.has(key)) return false;

    const isAdjustment = ['refund', 'reversal'].includes(args.expected?.effect_kind);
    let parentBinding = null;
    if (isAdjustment) {
      if (!present(args.expected?.authoritative_parent_effect_ref)) return false;
      const parentIdentity = {
        adapter_id: expectedIdentity.adapter_id,
        rail_identity: expectedIdentity.rail_identity,
        authoritative_effect_ref: args.expected.authoritative_parent_effect_ref
      };
      parentBinding = bindingsByIdentity.get(identityKey(parentIdentity)) ?? null;
      if (!parentBinding) return false;
      if (
        parentBinding.spend_intent_id !== args.expected.spend_intent_id ||
        parentBinding.operation_id !== args.expected.operation_id ||
        !['capture', 'partial_capture'].includes(parentBinding.effect_kind)
      ) return false;
      if (!sameIdentity(parentBinding.external_effect_identity, parentIdentity)) return false;
    } else if (present(args.expected?.authoritative_parent_effect_ref)) {
      return false;
    }

    const internalRef = chooseInternalRef(expectedIdentity);
    const internalExpected = {
      ...args.expected,
      authoritative_effect_ref: internalRef,
      authoritative_parent_effect_ref: parentBinding?.internal_ref ?? null
    };

    const accepted = core.materialize({ ...args, expected: internalExpected });
    if (accepted !== true) return false;

    registerBinding({
      external_effect_identity: expectedIdentity,
      spend_intent_id: args.expected.spend_intent_id,
      operation_id: args.expected.operation_id,
      effect_kind: args.expected.effect_kind,
      authoritative_parent_effect_ref: args.expected.authoritative_parent_effect_ref ?? null,
      internal_ref: internalRef
    });

    if (acceptedExternalFrontier) {
      const checkpoint = decoratedCheckpoint();
      acceptedExternalFrontier = {
        generation: checkpoint.generation,
        external_identity_digest: checkpoint.external_identity_digest
      };
    }
    return true;
  };

  const getEffect = (spendIntentId, operationId, authoritativeEffectRef, adapterId, railIdentity) => {
    let binding = null;
    if (present(adapterId) || present(railIdentity)) {
      if (!present(adapterId) || !present(railIdentity)) return null;
      binding = bindingsByIdentity.get(identityKey({
        adapter_id: adapterId,
        rail_identity: railIdentity,
        authoritative_effect_ref: authoritativeEffectRef
      })) ?? null;
      if (
        binding &&
        (binding.spend_intent_id !== spendIntentId || binding.operation_id !== operationId)
      ) return null;
    } else {
      const candidates = bindingKeysByLookup.get(
        bindingLookupKey(spendIntentId, operationId, authoritativeEffectRef)
      );
      if (!candidates || candidates.size !== 1) return null;
      binding = bindingsByIdentity.get([...candidates][0]) ?? null;
    }
    if (!binding) return null;
    const value = core.getEffect(spendIntentId, operationId, binding.internal_ref);
    if (!value) return null;
    return {
      ...value,
      adapter_id: binding.external_effect_identity.adapter_id,
      rail_identity: binding.external_effect_identity.rail_identity,
      authoritative_effect_ref: binding.external_effect_identity.authoritative_effect_ref,
      authoritative_parent_effect_ref: binding.authoritative_parent_effect_ref
    };
  };

  const snapshot = () => {
    const base = core.snapshot();
    const digest = bindingDigest(bindingsByIdentity);
    return {
      ...base,
      external_identity_version: EXTERNAL_IDENTITY_VERSION,
      external_identity_digest: digest,
      effects: base.effects.map(([storageKey, value]) => {
        const ownerKey = internalOwners.get(value.authoritative_effect_ref);
        const binding = ownerKey ? bindingsByIdentity.get(ownerKey) : null;
        if (!binding) throw new Error('materialized effect missing canonical external identity');
        const parentBinding = binding.authoritative_parent_effect_ref
          ? bindingsByIdentity.get(identityKey({
              adapter_id: binding.external_effect_identity.adapter_id,
              rail_identity: binding.external_effect_identity.rail_identity,
              authoritative_effect_ref: binding.authoritative_parent_effect_ref
            })) ?? null
          : null;
        if (binding.authoritative_parent_effect_ref && !parentBinding) {
          throw new Error('materialized adjustment missing canonical parent external identity');
        }
        return [storageKey, {
          ...value,
          external_effect_identity: { ...binding.external_effect_identity },
          external_parent_effect_identity: parentBinding
            ? { ...parentBinding.external_effect_identity }
            : null
        }];
      })
    };
  };

  const restore = (persisted, trustedCheckpoint) => {
    if (!persisted || persisted.external_identity_version !== EXTERNAL_IDENTITY_VERSION) {
      throw new Error('canonical external-effect identity snapshot required');
    }
    if (
      !trustedCheckpoint ||
      trustedCheckpoint.external_identity_version !== EXTERNAL_IDENTITY_VERSION ||
      !present(trustedCheckpoint.external_identity_digest)
    ) {
      throw new Error('trusted canonical external-effect identity checkpoint required');
    }

    const resolvedHead = typeof options.resolveAuthoritativeHead === 'function'
      ? options.resolveAuthoritativeHead()
      : null;
    if (
      !resolvedHead ||
      resolvedHead.external_identity_version !== EXTERNAL_IDENTITY_VERSION ||
      !present(resolvedHead.external_identity_digest)
    ) {
      throw new Error('authoritative external-effect identity head required');
    }

    const nextBindings = new Map();
    const nextLookups = new Map();
    const nextInternalOwners = new Map();
    const effectsByInternalRef = new Map();

    for (const entry of persisted.effects ?? []) {
      if (!Array.isArray(entry) || entry.length !== 2) throw new Error('invalid restored effect entry');
      const [, value] = entry;
      const externalIdentity = canonicalIdentity(value?.external_effect_identity);
      if (!externalIdentity) throw new Error('restored effect missing canonical external identity');
      if (!present(value.authoritative_effect_ref)) throw new Error('restored effect missing internal external-effect identity');
      const key = identityKey(externalIdentity);
      if (nextBindings.has(key)) throw new Error('restored canonical external-effect replay/collision');
      if (nextInternalOwners.has(value.authoritative_effect_ref)) {
        throw new Error('restored internal external-effect identity collision');
      }
      const binding = {
        external_effect_identity: externalIdentity,
        spend_intent_id: value.spend_intent_id,
        operation_id: value.operation_id,
        effect_kind: value.kind,
        authoritative_parent_effect_ref: value.external_parent_effect_identity?.authoritative_effect_ref ?? null,
        internal_ref: value.authoritative_effect_ref
      };
      nextBindings.set(key, binding);
      nextInternalOwners.set(value.authoritative_effect_ref, key);
      effectsByInternalRef.set(value.authoritative_effect_ref, value);
      addLookup(nextLookups, binding);
    }

    for (const binding of nextBindings.values()) {
      const value = effectsByInternalRef.get(binding.internal_ref);
      const isAdjustment = ['refund', 'reversal'].includes(binding.effect_kind);
      if (!isAdjustment) {
        if (value.external_parent_effect_identity !== null && value.external_parent_effect_identity !== undefined) {
          throw new Error('restored root effect cannot carry external parent identity');
        }
        continue;
      }
      const parentExternal = canonicalIdentity(value.external_parent_effect_identity);
      if (!parentExternal) throw new Error('restored adjustment missing external parent identity');
      if (
        parentExternal.adapter_id !== binding.external_effect_identity.adapter_id ||
        parentExternal.rail_identity !== binding.external_effect_identity.rail_identity
      ) {
        throw new Error('restored adjustment crosses authoritative adapter/rail namespace');
      }
      const parentBinding = nextBindings.get(identityKey(parentExternal));
      if (!parentBinding || !['capture', 'partial_capture'].includes(parentBinding.effect_kind)) {
        throw new Error('restored adjustment external parent missing or invalid');
      }
      if (
        parentBinding.spend_intent_id !== binding.spend_intent_id ||
        parentBinding.operation_id !== binding.operation_id ||
        value.authoritative_parent_effect_ref !== parentBinding.internal_ref
      ) {
        throw new Error('restored adjustment external parent lineage mismatch');
      }
      binding.authoritative_parent_effect_ref = parentExternal.authoritative_effect_ref;
    }

    const digest = bindingDigest(nextBindings);
    if (
      persisted.external_identity_digest !== digest ||
      trustedCheckpoint.external_identity_digest !== digest ||
      resolvedHead.external_identity_digest !== digest
    ) {
      throw new Error('restored canonical external-effect identity digest mismatch');
    }

    if (acceptedExternalFrontier) {
      const nextGeneration = BigInt(persisted.generation);
      const acceptedGeneration = BigInt(acceptedExternalFrontier.generation);
      if (nextGeneration < acceptedGeneration) {
        throw new Error('external-effect identity frontier rollback');
      }
      if (
        nextGeneration === acceptedGeneration &&
        digest !== acceptedExternalFrontier.external_identity_digest
      ) {
        throw new Error('external-effect identity fork at accepted generation');
      }
      if (nextGeneration > acceptedGeneration) {
        for (const [key, priorBinding] of bindingsByIdentity) {
          const nextBinding = nextBindings.get(key);
          if (!nextBinding || !sameBinding(priorBinding, nextBinding)) {
            throw new Error('higher-generation restore mutates accepted external-effect identity lineage');
          }
        }
      }
    }

    const accepted = core.restore(persisted, trustedCheckpoint);
    if (accepted !== true) return accepted;
    bindingsByIdentity = nextBindings;
    bindingKeysByLookup = nextLookups;
    internalOwners = nextInternalOwners;
    acceptedExternalFrontier = {
      generation: persisted.generation,
      external_identity_digest: digest
    };
    return true;
  };

  return {
    materialize,
    getIntentMoney: spendIntentId => core.getIntentMoney(spendIntentId),
    getEffect,
    checkpoint: decoratedCheckpoint,
    headCandidate: decoratedHeadCandidate,
    snapshot,
    restore
  };
};
