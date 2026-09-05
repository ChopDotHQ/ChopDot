import {
  allocateMoneyEvenly,
  assertConservation,
  assertMoney,
  moneyFromDecimal,
  moneyFromMinorUnits,
  type MoneyAllocationV1,
  type MoneyV1,
} from './money.ts';

export type ReviewedSplitMethod = 'equal' | 'exact' | 'percent' | 'shares' | 'exclude';

export interface ReviewedExpenseAllocationDraftV1 {
  method: ReviewedSplitMethod;
  total: MoneyV1;
  participantIds: string[];
  exactAmounts?: Record<string, string>;
  percentages?: Record<string, string>;
  shares?: Record<string, string>;
  excluded?: ReadonlySet<string>;
}

export interface ReviewedExpenseAllocationResultV1 {
  allocations: MoneyAllocationV1[];
  validationMessage: string;
}

/**
 * Converts reviewed form strings directly into exact minor-unit allocations.
 * Floating-point values never participate in conservation or rounding.
 */
export function calculateReviewedExpenseAllocations(
  draft: ReviewedExpenseAllocationDraftV1,
): ReviewedExpenseAllocationResultV1 {
  try {
    assertMoney(draft.total);
    const participantIds = uniqueParticipants(draft.participantIds);
    if (draft.method === 'equal') {
      return accepted(allocateMoneyEvenly(draft.total, participantIds));
    }
    if (draft.method === 'exclude') {
      const included = participantIds.filter(id => !draft.excluded?.has(id));
      if (included.length === 0) return rejected('Cannot exclude everyone.');
      const includedAllocations = new Map(allocateMoneyEvenly(draft.total, included).map(row => [row.participantId, row.amount]));
      return accepted(participantIds.map(participantId => ({
        participantId,
        amount: includedAllocations.get(participantId)
          ?? moneyFromMinorUnits(0n, draft.total.currency, draft.total.exponent),
      })));
    }
    if (draft.method === 'exact') {
      const allocations = participantIds.map(participantId => ({
        participantId,
        amount: moneyFromDecimal(
          normalizedAmount(draft.exactAmounts?.[participantId]),
          draft.total.currency,
          draft.total.exponent,
        ),
      }));
      try {
        assertConservation(draft.total, allocations);
      } catch {
        return rejected('Exact amounts must add up to the reviewed total.');
      }
      return accepted(allocations);
    }

    const weightSource = draft.method === 'percent' ? draft.percentages : draft.shares;
    const weights = participantIds.map(participantId => ({
      participantId,
      weight: decimalWeight(weightSource?.[participantId]),
    }));
    const totalWeight = weights.reduce((sum, row) => sum + row.weight, 0n);
    if (draft.method === 'percent' && totalWeight !== 100n * WEIGHT_SCALE) {
      return rejected('Percentages must total 100%.');
    }
    if (totalWeight <= 0n) return rejected('Total shares must be greater than 0.');
    return accepted(allocateByWeights(draft.total, weights, totalWeight));
  } catch (reason) {
    return rejected(reason instanceof Error ? reason.message : 'The split could not be represented exactly.');
  }
}

const WEIGHT_SCALE = 1_000_000n;

function allocateByWeights(
  total: MoneyV1,
  weights: Array<{participantId: string; weight: bigint}>,
  totalWeight: bigint,
): MoneyAllocationV1[] {
  const totalMinorUnits = BigInt(total.minorUnits);
  const rows = weights.map(row => {
    const numerator = totalMinorUnits * row.weight;
    return {...row, minorUnits: numerator / totalWeight, remainder: numerator % totalWeight};
  });
  let undistributed = totalMinorUnits - rows.reduce((sum, row) => sum + row.minorUnits, 0n);
  const ranked = [...rows].sort((left, right) => {
    if (left.remainder !== right.remainder) return left.remainder > right.remainder ? -1 : 1;
    return left.participantId.localeCompare(right.participantId);
  });
  const incremented = new Set(ranked.slice(0, Number(undistributed)).map(row => row.participantId));
  undistributed -= BigInt(incremented.size);
  if (undistributed !== 0n) throw new Error('The exact split remainder is invalid.');
  const allocations = rows.map(row => ({
    participantId: row.participantId,
    amount: moneyFromMinorUnits(
      row.minorUnits + (incremented.has(row.participantId) ? 1n : 0n),
      total.currency,
      total.exponent,
    ),
  }));
  assertConservation(total, allocations);
  return allocations;
}

function decimalWeight(value: string | undefined): bigint {
  const normalized = value?.trim() || '0';
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/u.test(normalized)) {
    throw new Error('Split weights support up to six decimal places.');
  }
  const [whole, fraction = ''] = normalized.split('.');
  const result = BigInt(whole) * WEIGHT_SCALE + BigInt(fraction.padEnd(6, '0'));
  if (result > 10n ** 24n) throw new Error('Split weight is too large.');
  return result;
}

function normalizedAmount(value: string | undefined): string {
  const normalized = value?.trim() || '0';
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(normalized)) throw new Error('Exact amount is invalid.');
  return normalized;
}

function uniqueParticipants(values: string[]): string[] {
  const normalized = values.map(value => value.trim());
  if (normalized.length === 0 || normalized.some(value => !value) || new Set(normalized).size !== normalized.length) {
    throw new Error('Each split participant must appear exactly once.');
  }
  return normalized;
}

function accepted(allocations: MoneyAllocationV1[]): ReviewedExpenseAllocationResultV1 {
  return {allocations, validationMessage: ''};
}

function rejected(validationMessage: string): ReviewedExpenseAllocationResultV1 {
  return {allocations: [], validationMessage};
}
