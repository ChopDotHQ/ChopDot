import type { Suggestion } from '../services/settlement/calc';
import type { SettlementLeg } from './types';

const AMOUNT_EPSILON = 1e-6;

function legKey(from: string, to: string): string {
  return `${from}->${to}`;
}

export function reconcileLegs(
  suggestions: Suggestion[],
  existing: SettlementLeg[],
  currency: string,
): SettlementLeg[] {
  const existingByKey = new Map(existing.map((leg) => [legKey(leg.fromMemberId, leg.toMemberId), leg]));

  return suggestions.map((suggestion, index) => {
    const key = legKey(suggestion.from, suggestion.to);
    const prior = existingByKey.get(key);
    const amountChanged =
      prior !== undefined && Math.abs(prior.amount - suggestion.amount) > AMOUNT_EPSILON;

    if (prior && !amountChanged) {
      return {
        ...prior,
        amount: suggestion.amount,
        currency,
      };
    }

    if (prior && amountChanged && prior.state === 'confirmed') {
      return {
        id: prior.id,
        fromMemberId: suggestion.from,
        toMemberId: suggestion.to,
        amount: suggestion.amount,
        currency,
        state: 'open',
      };
    }

    if (prior && amountChanged) {
      return {
        id: prior.id,
        fromMemberId: suggestion.from,
        toMemberId: suggestion.to,
        amount: suggestion.amount,
        currency,
        state: 'open',
      };
    }

    return {
      id: prior?.id ?? `leg_${key}_${index}`,
      fromMemberId: suggestion.from,
      toMemberId: suggestion.to,
      amount: suggestion.amount,
      currency,
      state: 'open',
    };
  });
}
