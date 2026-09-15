// Canonical Phase C1 rail-neutral materialization state model.
// This module carries the security-revision-7 integrated parent-consumption invariant.

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

export const createCanonicalMaterializationState = () => {
  const materializedAuthoritativeEffects = new Set();
  const materializedByIntent = new Map();
  const materializedEffects = new Map();

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
      money: cloneMoney(effectMoney),
      authoritative_parent_effect_ref: expected.authoritative_parent_effect_ref
    } : {
      kind: expected.effect_kind,
      spend_intent_id: expected.spend_intent_id,
      operation_id: expected.operation_id,
      money: cloneMoney(effectMoney),
      original_units: effectMoney.minorUnits,
      remaining_unadjusted_units: effectMoney.minorUnits
    });
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

  const snapshot = () => ({
    authoritativeEffects: [...materializedAuthoritativeEffects],
    intents: [...materializedByIntent.entries()].map(([key, value]) => [key, {
      minorUnits: value.minorUnits.toString(),
      currency: value.currency,
      exponent: value.exponent
    }]),
    effects: [...materializedEffects.entries()].map(([key, value]) => [key, {
      ...value,
      money: {
        minorUnits: value.money.minorUnits.toString(),
        currency: value.money.currency,
        exponent: value.money.exponent
      },
      ...(typeof value.original_units === 'bigint' ? { original_units: value.original_units.toString() } : {}),
      ...(typeof value.remaining_unadjusted_units === 'bigint' ? { remaining_unadjusted_units: value.remaining_unadjusted_units.toString() } : {})
    }])
  });

  const restore = persisted => {
    const nextAuthoritative = new Set(persisted?.authoritativeEffects ?? []);
    const nextIntents = new Map();
    const nextEffects = new Map();

    for (const [key, value] of persisted?.intents ?? []) {
      const minorUnits = BigInt(value.minorUnits);
      if (minorUnits < 0n) throw new Error('invalid restored intent units');
      nextIntents.set(key, { minorUnits, currency: value.currency, exponent: value.exponent });
    }

    for (const [key, value] of persisted?.effects ?? []) {
      const money = {
        minorUnits: BigInt(value.money.minorUnits),
        currency: value.money.currency,
        exponent: value.money.exponent
      };
      const restored = { ...value, money };
      if (value.original_units !== undefined) restored.original_units = BigInt(value.original_units);
      if (value.remaining_unadjusted_units !== undefined) restored.remaining_unadjusted_units = BigInt(value.remaining_unadjusted_units);
      if (['capture', 'partial_capture'].includes(restored.kind)) {
        if (typeof restored.original_units !== 'bigint' || typeof restored.remaining_unadjusted_units !== 'bigint') {
          throw new Error('missing restored parent conservation state');
        }
        if (restored.original_units <= 0n || restored.remaining_unadjusted_units < 0n || restored.remaining_unadjusted_units > restored.original_units) {
          throw new Error('invalid restored parent conservation state');
        }
      }
      nextEffects.set(key, restored);
    }

    materializedAuthoritativeEffects.clear();
    for (const value of nextAuthoritative) materializedAuthoritativeEffects.add(value);
    materializedByIntent.clear();
    for (const [key, value] of nextIntents) materializedByIntent.set(key, value);
    materializedEffects.clear();
    for (const [key, value] of nextEffects) materializedEffects.set(key, value);
    return true;
  };

  return { materialize, getIntentMoney, getEffect, snapshot, restore };
};
