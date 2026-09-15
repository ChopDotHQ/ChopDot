// Canonical Phase C1 rail-neutral materialization state model.
// Security revision 8 is enforced across live materialization and restart/restore.
// Restore is fail-closed: a backup checkpoint proves internal snapshot integrity,
// while an independently resolved authoritative head prevents stale-but-valid rollback.

import { createHash } from 'node:crypto';

const SNAPSHOT_VERSION = 1;
const AUTHORITATIVE_HEAD_VERSION = 1;
const AUTHORITATIVE_HEAD_DOMAIN = 'SPEND-01:materialization';

const samePartition = (a, b) =>
  a?.currency === b?.currency && a?.exponent === b?.exponent;

const effectStorageKey = (spendIntentId, operationId, authoritativeEffectRef) =>
  `${spendIntentId}:${operationId}:${authoritativeEffectRef}`;

const dedupeKey = (spendIntentId, authoritativeEffectRef) =>
  `${spendIntentId}:${authoritativeEffectRef}`;

const cloneMoney = money => ({
  minorUnits: BigInt(money.minorUnits),
  currency: money.currency,
  exponent: money.exponent
});

const present = value =>
  value !== null &&
  value !== undefined &&
  (typeof value !== 'string' || value.trim().length > 0);

const canonicalIntegerString = value => typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value);

const validMoney = money =>
  money &&
  typeof money.minorUnits === 'bigint' &&
  money.minorUnits > 0n &&
  present(money.currency) &&
  Number.isInteger(money.exponent) &&
  money.exponent >= 0 &&
  money.exponent <= 18;

const serializeMoney = money => ({
  minorUnits: BigInt(money.minorUnits).toString(),
  currency: money.currency,
  exponent: money.exponent
});

const immutableLineageRow = ([key, value]) => ({
  key,
  kind: value.kind,
  spend_intent_id: value.spend_intent_id,
  operation_id: value.operation_id,
  authoritative_effect_ref: value.authoritative_effect_ref,
  authoritative_parent_effect_ref: value.authoritative_parent_effect_ref ?? null,
  money: serializeMoney(value.money),
  original_units: ['capture', 'partial_capture'].includes(value.kind)
    ? BigInt(value.original_units).toString()
    : null
});

const lineageDigest = effects => {
  const rows = [...effects.entries()]
    .map(immutableLineageRow)
    .sort((left, right) => left.key.localeCompare(right.key));
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
};

const checkpointFor = (effects, generation) => ({
  snapshot_version: SNAPSHOT_VERSION,
  generation: generation.toString(),
  lineage_digest: lineageDigest(effects)
});

const headCandidateFor = (effects, generation) => ({
  head_version: AUTHORITATIVE_HEAD_VERSION,
  domain: AUTHORITATIVE_HEAD_DOMAIN,
  ...checkpointFor(effects, generation)
});

const validateAuthoritativeHead = head => {
  if (!head || head.head_version !== AUTHORITATIVE_HEAD_VERSION) {
    throw new Error('authoritative restore head required');
  }
  if (head.domain !== AUTHORITATIVE_HEAD_DOMAIN) {
    throw new Error('authoritative restore head domain mismatch');
  }
  if (head.snapshot_version !== SNAPSHOT_VERSION) {
    throw new Error('authoritative restore head snapshot version mismatch');
  }
  if (!canonicalIntegerString(head.generation) || !present(head.lineage_digest)) {
    throw new Error('invalid authoritative restore head');
  }
  return {
    head_version: AUTHORITATIVE_HEAD_VERSION,
    domain: AUTHORITATIVE_HEAD_DOMAIN,
    snapshot_version: SNAPSHOT_VERSION,
    generation: head.generation,
    lineage_digest: head.lineage_digest
  };
};

const compareHeadToFrontier = (candidate, frontier) => {
  if (!frontier) return;
  const candidateGeneration = BigInt(candidate.generation);
  const frontierGeneration = BigInt(frontier.generation);
  if (candidateGeneration < frontierGeneration) {
    throw new Error('authoritative restore head is behind accepted frontier');
  }
  if (
    candidateGeneration === frontierGeneration &&
    candidate.lineage_digest !== frontier.lineage_digest
  ) {
    throw new Error('authoritative restore head fork at accepted generation');
  }
};

const exactSetEqualsArray = (expectedSet, serialized) => {
  if (!Array.isArray(serialized) || serialized.length !== expectedSet.size) return false;
  const serializedSet = new Set(serialized);
  if (serializedSet.size !== serialized.length) return false;
  if (serializedSet.size !== expectedSet.size) return false;
  for (const value of expectedSet) if (!serializedSet.has(value)) return false;
  return true;
};

export const createCanonicalMaterializationState = ({ resolveAuthoritativeHead } = {}) => {
  const materializedAuthoritativeEffects = new Set();
  const materializedByIntent = new Map();
  const materializedEffects = new Map();
  let generation = 0n;
  let acceptedFrontier = null;

  const currentHeadCandidate = () => headCandidateFor(materializedEffects, generation);
  const advanceLocalFrontier = () => {
    acceptedFrontier = currentHeadCandidate();
  };

  const materialize = ({ state, proofAccepted, expected, effectMoney, authorizedMoney }) => {
    if (!['captured', 'partial', 'reversed'].includes(state) || proofAccepted !== true) return false;
    if (!expected?.spend_intent_id || !expected?.operation_id || !expected?.authoritative_effect_ref) return false;
    if (!effectMoney || !authorizedMoney || !samePartition(effectMoney, authorizedMoney)) return false;
    if (typeof effectMoney.minorUnits !== 'bigint' || effectMoney.minorUnits <= 0n) return false;

    const authoritativeKey = dedupeKey(expected.spend_intent_id, expected.authoritative_effect_ref);
    if (materializedAuthoritativeEffects.has(authoritativeKey)) return false;

    const isAdjustment = ['refund', 'reversal'].includes(expected.effect_kind);
    let parent = null;
    let parentKey = null;
    let parentRemainingAfter = null;

    if (isAdjustment) {
      if (!expected.authoritative_parent_effect_ref) return false;
      parentKey = effectStorageKey(
        expected.spend_intent_id,
        expected.operation_id,
        expected.authoritative_parent_effect_ref
      );
      parent = materializedEffects.get(parentKey);
      if (!parent || !['capture', 'partial_capture'].includes(parent.kind)) return false;
      if (parent.spend_intent_id !== expected.spend_intent_id || parent.operation_id !== expected.operation_id) return false;
      if (!samePartition(parent.money, effectMoney)) return false;
      if (effectMoney.minorUnits > parent.remaining_unadjusted_units) return false;
      parentRemainingAfter = parent.remaining_unadjusted_units - effectMoney.minorUnits;
    }

    const current = materializedByIntent.get(expected.spend_intent_id) ?? {
      minorUnits: 0n,
      currency: authorizedMoney.currency,
      exponent: authorizedMoney.exponent
    };
    if (!samePartition(current, authorizedMoney)) return false;

    const delta = isAdjustment ? -effectMoney.minorUnits : effectMoney.minorUnits;
    const next = current.minorUnits + delta;
    if (next < 0n || next > authorizedMoney.minorUnits) return false;

    // Commit only after proof, dedupe, lineage, partition and value checks all pass.
    materializedAuthoritativeEffects.add(authoritativeKey);
    materializedByIntent.set(expected.spend_intent_id, { ...current, minorUnits: next });

    if (parent) {
      materializedEffects.set(parentKey, {
        ...parent,
        remaining_unadjusted_units: parentRemainingAfter
      });
    }

    const storageKey = effectStorageKey(
      expected.spend_intent_id,
      expected.operation_id,
      expected.authoritative_effect_ref
    );
    materializedEffects.set(storageKey, isAdjustment ? {
      kind: expected.effect_kind,
      spend_intent_id: expected.spend_intent_id,
      operation_id: expected.operation_id,
      authoritative_effect_ref: expected.authoritative_effect_ref,
      money: cloneMoney(effectMoney),
      authoritative_parent_effect_ref: expected.authoritative_parent_effect_ref
    } : {
      kind: expected.effect_kind,
      spend_intent_id: expected.spend_intent_id,
      operation_id: expected.operation_id,
      authoritative_effect_ref: expected.authoritative_effect_ref,
      money: cloneMoney(effectMoney),
      original_units: effectMoney.minorUnits,
      remaining_unadjusted_units: effectMoney.minorUnits
    });
    generation += 1n;
    // Live effects advance the in-process monotonic floor immediately. A stale
    // externally resolved head can never authorize rolling this process backward.
    advanceLocalFrontier();
    return true;
  };

  const getIntentMoney = spendIntentId => {
    const value = materializedByIntent.get(spendIntentId);
    return value ? cloneMoney(value) : null;
  };

  const getEffect = (spendIntentId, operationId, authoritativeEffectRef) => {
    const value = materializedEffects.get(effectStorageKey(spendIntentId, operationId, authoritativeEffectRef));
    if (!value) return null;
    return {
      ...value,
      money: cloneMoney(value.money),
      ...(typeof value.original_units === 'bigint' ? { original_units: value.original_units } : {}),
      ...(typeof value.remaining_unadjusted_units === 'bigint' ? { remaining_unadjusted_units: value.remaining_unadjusted_units } : {})
    };
  };

  const checkpoint = () => checkpointFor(materializedEffects, generation);

  // This is a deterministic candidate representation only. It becomes authority
  // only after an independent runtime/store accepts it. Backups must not treat a
  // self-computed head candidate as proof that they are the latest accepted head.
  const headCandidate = () => currentHeadCandidate();

  const snapshot = () => ({
    ...checkpoint(),
    authoritativeEffects: [...materializedAuthoritativeEffects],
    intents: [...materializedByIntent.entries()].map(([key, value]) => [key, serializeMoney(value)]),
    effects: [...materializedEffects.entries()].map(([key, value]) => [key, {
      ...value,
      money: serializeMoney(value.money),
      ...(typeof value.original_units === 'bigint' ? { original_units: value.original_units.toString() } : {}),
      ...(typeof value.remaining_unadjusted_units === 'bigint' ? { remaining_unadjusted_units: value.remaining_unadjusted_units.toString() } : {})
    }])
  });

  const restore = (persisted, trustedCheckpoint) => {
    // The authoritative head is deliberately not accepted as a restore argument:
    // startup/in-process recovery must resolve it through an independently owned
    // adapter/runtime so a backup cannot self-supply its own authority.
    if (typeof resolveAuthoritativeHead !== 'function') {
      throw new Error('independent authoritative restore head resolver required');
    }
    const authoritativeHead = validateAuthoritativeHead(resolveAuthoritativeHead());
    compareHeadToFrontier(authoritativeHead, acceptedFrontier);

    // A restart must also be anchored to a separately persisted backup checkpoint.
    // Snapshot + checkpoint establish internal integrity; they do not establish
    // freshness or authority, which comes only from authoritativeHead above.
    if (!trustedCheckpoint || trustedCheckpoint.snapshot_version !== SNAPSHOT_VERSION) {
      throw new Error('trusted restore checkpoint required');
    }
    if (!persisted || persisted.snapshot_version !== SNAPSHOT_VERSION) {
      throw new Error('unsupported restored snapshot version');
    }
    if (!canonicalIntegerString(persisted.generation) || !canonicalIntegerString(trustedCheckpoint.generation)) {
      throw new Error('invalid restored snapshot generation');
    }
    if (!present(persisted.lineage_digest) || !present(trustedCheckpoint.lineage_digest)) {
      throw new Error('missing restored lineage digest');
    }
    if (
      persisted.generation !== trustedCheckpoint.generation ||
      persisted.lineage_digest !== trustedCheckpoint.lineage_digest
    ) {
      throw new Error('restored snapshot does not match trusted checkpoint');
    }
    if (
      persisted.generation !== authoritativeHead.generation ||
      persisted.lineage_digest !== authoritativeHead.lineage_digest
    ) {
      throw new Error('restored snapshot is not the current authoritative head');
    }

    const nextEffects = new Map();
    for (const entry of persisted.effects ?? []) {
      if (!Array.isArray(entry) || entry.length !== 2) throw new Error('invalid restored effect entry');
      const [key, value] = entry;
      if (!present(key) || !value || nextEffects.has(key)) throw new Error('duplicate or invalid restored effect key');
      if (!['capture', 'partial_capture', 'refund', 'reversal'].includes(value.kind)) {
        throw new Error('invalid restored effect kind');
      }
      if (!present(value.spend_intent_id) || !present(value.operation_id) || !present(value.authoritative_effect_ref)) {
        throw new Error('missing restored effect identity');
      }
      if (key !== effectStorageKey(value.spend_intent_id, value.operation_id, value.authoritative_effect_ref)) {
        throw new Error('restored effect key/lineage mismatch');
      }
      if (!value.money || !canonicalIntegerString(value.money.minorUnits)) {
        throw new Error('invalid restored effect money');
      }
      const money = {
        minorUnits: BigInt(value.money.minorUnits),
        currency: value.money.currency,
        exponent: value.money.exponent
      };
      if (!validMoney(money)) throw new Error('invalid restored effect money');

      const restored = {
        kind: value.kind,
        spend_intent_id: value.spend_intent_id,
        operation_id: value.operation_id,
        authoritative_effect_ref: value.authoritative_effect_ref,
        money
      };

      if (['capture', 'partial_capture'].includes(restored.kind)) {
        if (!canonicalIntegerString(value.original_units) || !canonicalIntegerString(value.remaining_unadjusted_units)) {
          throw new Error('missing restored parent conservation state');
        }
        restored.original_units = BigInt(value.original_units);
        restored.remaining_unadjusted_units = BigInt(value.remaining_unadjusted_units);
        if (
          restored.original_units <= 0n ||
          restored.original_units !== money.minorUnits ||
          restored.remaining_unadjusted_units < 0n ||
          restored.remaining_unadjusted_units > restored.original_units
        ) {
          throw new Error('invalid restored parent conservation state');
        }
        if (value.authoritative_parent_effect_ref !== undefined && value.authoritative_parent_effect_ref !== null) {
          throw new Error('capture cannot restore with parent lineage');
        }
      } else {
        if (!present(value.authoritative_parent_effect_ref)) {
          throw new Error('missing restored adjustment parent');
        }
        if (value.original_units !== undefined || value.remaining_unadjusted_units !== undefined) {
          throw new Error('adjustment cannot restore parent capacity fields');
        }
        restored.authoritative_parent_effect_ref = value.authoritative_parent_effect_ref;
      }
      nextEffects.set(key, restored);
    }

    const persistedGeneration = BigInt(persisted.generation);
    if (persistedGeneration !== BigInt(nextEffects.size)) {
      throw new Error('restored generation/effect count mismatch');
    }

    const computedDigest = lineageDigest(nextEffects);
    if (
      computedDigest !== persisted.lineage_digest ||
      computedDigest !== trustedCheckpoint.lineage_digest ||
      computedDigest !== authoritativeHead.lineage_digest
    ) {
      throw new Error('restored lineage digest mismatch');
    }

    // Reconstruct every derived structure from immutable effect lineage. Nothing
    // serialized in authoritativeEffects/intents/remaining capacity is trusted.
    const derivedAuthoritative = new Set();
    const derivedIntents = new Map();
    const consumedByParent = new Map();

    const addIntentDelta = (spendIntentId, money, delta) => {
      const current = derivedIntents.get(spendIntentId) ?? {
        minorUnits: 0n,
        currency: money.currency,
        exponent: money.exponent
      };
      if (!samePartition(current, money)) throw new Error('restored intent money partition mismatch');
      derivedIntents.set(spendIntentId, { ...current, minorUnits: current.minorUnits + delta });
    };

    for (const [, effect] of nextEffects) {
      const authoritativeKey = dedupeKey(effect.spend_intent_id, effect.authoritative_effect_ref);
      if (derivedAuthoritative.has(authoritativeKey)) {
        throw new Error('restored authoritative effect replay/collision');
      }
      derivedAuthoritative.add(authoritativeKey);
      if (['capture', 'partial_capture'].includes(effect.kind)) {
        addIntentDelta(effect.spend_intent_id, effect.money, effect.money.minorUnits);
      }
    }

    for (const [, effect] of nextEffects) {
      if (!['refund', 'reversal'].includes(effect.kind)) continue;
      const parentKey = effectStorageKey(
        effect.spend_intent_id,
        effect.operation_id,
        effect.authoritative_parent_effect_ref
      );
      const parent = nextEffects.get(parentKey);
      if (!parent || !['capture', 'partial_capture'].includes(parent.kind)) {
        throw new Error('restored adjustment parent missing or invalid');
      }
      if (
        parent.spend_intent_id !== effect.spend_intent_id ||
        parent.operation_id !== effect.operation_id ||
        !samePartition(parent.money, effect.money)
      ) {
        throw new Error('restored adjustment parent ownership mismatch');
      }
      const consumed = (consumedByParent.get(parentKey) ?? 0n) + effect.money.minorUnits;
      if (consumed > parent.original_units) throw new Error('restored parent over-consumed');
      consumedByParent.set(parentKey, consumed);
      addIntentDelta(effect.spend_intent_id, effect.money, -effect.money.minorUnits);
    }

    for (const [key, effect] of nextEffects) {
      if (!['capture', 'partial_capture'].includes(effect.kind)) continue;
      const expectedRemaining = effect.original_units - (consumedByParent.get(key) ?? 0n);
      if (effect.remaining_unadjusted_units !== expectedRemaining) {
        throw new Error('restored parent remainder contradicts authoritative lineage');
      }
    }

    for (const value of derivedIntents.values()) {
      if (value.minorUnits < 0n) throw new Error('restored intent net is negative');
    }

    if (!exactSetEqualsArray(derivedAuthoritative, persisted.authoritativeEffects)) {
      throw new Error('restored authoritative-effect dedupe drift');
    }

    const serializedIntents = new Map();
    for (const entry of persisted.intents ?? []) {
      if (!Array.isArray(entry) || entry.length !== 2) throw new Error('invalid restored intent entry');
      const [key, value] = entry;
      if (!present(key) || serializedIntents.has(key) || !value || !canonicalIntegerString(value.minorUnits)) {
        throw new Error('duplicate or invalid restored intent entry');
      }
      const money = {
        minorUnits: BigInt(value.minorUnits),
        currency: value.currency,
        exponent: value.exponent
      };
      if (
        money.minorUnits < 0n ||
        !present(money.currency) ||
        !Number.isInteger(money.exponent) ||
        money.exponent < 0 ||
        money.exponent > 18
      ) {
        throw new Error('invalid restored intent units');
      }
      serializedIntents.set(key, money);
    }
    if (serializedIntents.size !== derivedIntents.size) throw new Error('restored aggregate intent drift');
    for (const [key, expectedMoney] of derivedIntents) {
      const serializedMoney = serializedIntents.get(key);
      if (
        !serializedMoney ||
        !samePartition(serializedMoney, expectedMoney) ||
        serializedMoney.minorUnits !== expectedMoney.minorUnits
      ) {
        throw new Error('restored aggregate intent drift');
      }
    }

    // Atomic commit only after authoritative freshness, checkpoint, lineage,
    // dedupe, aggregate and parent conservation all agree. Any throw above leaves
    // the current state and accepted frontier untouched.
    materializedAuthoritativeEffects.clear();
    for (const value of derivedAuthoritative) materializedAuthoritativeEffects.add(value);
    materializedByIntent.clear();
    for (const [key, value] of derivedIntents) materializedByIntent.set(key, value);
    materializedEffects.clear();
    for (const [key, value] of nextEffects) materializedEffects.set(key, value);
    generation = persistedGeneration;
    acceptedFrontier = authoritativeHead;
    return true;
  };

  return { materialize, getIntentMoney, getEffect, checkpoint, headCandidate, snapshot, restore };
};
