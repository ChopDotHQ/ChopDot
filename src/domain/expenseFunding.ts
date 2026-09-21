/**
 * Research funding read adapter. No storage, UI, chain or schema imports.
 *
 * Numeric inputs retain the existing application API. Equality is checked on
 * their canonical decimal spellings, without an epsilon or rounding. This does
 * NOT choose asset precision, restore digits lost before the call, or implement
 * a split-remainder policy. Native funding is not a supported storage format.
 */
export interface ExpenseFundingContribution {
  memberId: string;
  amount: number;
}

export class ExpenseFundingError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ExpenseFundingError';
    this.code = code;
  }
}

export type FundingValidation =
  | { success: true }
  | { success: false; code: string; error: string };

type RecordValue = Record<string, unknown>;

function object(value: unknown): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ExpenseFundingError('FUNDING_SHAPE', 'Expense funding requires an object');
  }
  return value as RecordValue;
}

function amount(value: unknown, allowZero = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) ||
      (allowZero ? value < 0 : value <= 0)) {
    throw new ExpenseFundingError('FUNDING_AMOUNT', 'Amounts must be finite and positive');
  }
  return value;
}

function member(value: unknown, memberIds?: readonly string[], code = 'FUND-003'): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ExpenseFundingError('FUNDING_MEMBER', 'A member ID is required');
  }
  if (memberIds && !memberIds.includes(value)) {
    throw new ExpenseFundingError(code, 'All participants must be valid member IDs');
  }
  return value;
}

// Values have already passed finite/nonnegative validation. Align decimal
// exponents into integer coefficients so even tiny mismatches remain visible.
function decimal(value: number): { coefficient: bigint; exponent: number } {
  const [mantissa = '', power = '0'] = value.toString().toLowerCase().split('e');
  const [whole = '', fraction = ''] = mantissa.split('.');
  return { coefficient: BigInt(whole + fraction), exponent: Number(power) - fraction.length };
}

function conserves(values: readonly number[], total: number): boolean {
  const parts = [total, ...values].map(decimal);
  const exponent = parts.reduce((lowest, part) => Math.min(lowest, part.exponent), 0);
  const integers = parts.map(part => part.coefficient * (10n ** BigInt(part.exponent - exponent)));
  const [expected, ...entries] = integers;
  return entries.reduce((sum, entry) => sum + entry, 0n) === expected;
}

export function hasNativeExpenseFunding(value: unknown): boolean {
  return !!value && typeof value === 'object' && 'funding' in value &&
    (value as RecordValue).funding !== undefined;
}

/** Native data is for read/calculation experiments only; legacy data is adapted. */
export function getExpenseFunding(value: unknown, memberIds?: readonly string[]): ExpenseFundingContribution[] {
  const expense = object(value);
  const total = amount(expense.amount);
  if (expense.currency !== undefined && (typeof expense.currency !== 'string' || !expense.currency.trim())) {
    throw new ExpenseFundingError('FUND-002', 'Expense currency must be a non-empty string when supplied');
  }
  if (!hasNativeExpenseFunding(expense)) {
    return [{ memberId: member(expense.paidBy, memberIds), amount: total }];
  }
  if (!Array.isArray(expense.funding) || expense.funding.length === 0) {
    throw new ExpenseFundingError('FUNDING_SHAPE', 'Explicit funding must be a non-empty array');
  }
  const funding = expense.funding.map(value => {
    const entry = object(value);
    if (entry.currency !== undefined && entry.currency !== expense.currency) {
      throw new ExpenseFundingError('FUND-002', 'Contribution currency must match the expense currency');
    }
    return { memberId: member(entry.memberId, memberIds), amount: amount(entry.amount) };
  });
  if (!conserves(funding.map(entry => entry.amount), total)) {
    throw new ExpenseFundingError('FUND-001', 'Funding contributions must equal the expense amount exactly');
  }
  return funding;
}

function validation(check: () => void): FundingValidation {
  try {
    check();
    return { success: true };
  } catch (error) {
    if (error instanceof ExpenseFundingError) {
      return { success: false, code: error.code, error: error.message };
    }
    throw error;
  }
}

export function validateExpenseFunding(value: unknown, memberIds?: readonly string[]): FundingValidation {
  return validation(() => { getExpenseFunding(value, memberIds); });
}

/** Prevent the existing scalar-payer storage paths from silently dropping data. */
export function validateLegacyExpenseWrite(value: unknown, memberIds?: readonly string[]): FundingValidation {
  if (hasNativeExpenseFunding(value)) {
    return {
      success: false,
      code: 'FUNDING_WRITE_UNSUPPORTED',
      error: 'Native funding writes are not supported; no expense was saved',
    };
  }
  return validation(() => {
    getExpenseFunding(value, memberIds);
    const expense = object(value);
    if (expense.split !== undefined && !Array.isArray(expense.split)) {
      throw new ExpenseFundingError('SPLIT_SHAPE', 'Explicit beneficiary allocations must be an array');
    }
    // Preserve the existing legacy fallback when no allocations are recorded.
    // Once allocations exist, an amount-only edit must not invalidate them.
    if (Array.isArray(expense.split) && expense.split.length > 0) {
      assertExplicitFundingSplit(value, memberIds);
    }
  });
}

/** Native experiments require explicit allocations; never invent a remainder. */
export function assertExplicitFundingSplit(value: unknown, memberIds?: readonly string[]): void {
  const expense = object(value);
  const total = amount(expense.amount);
  if (!Array.isArray(expense.split) || expense.split.length === 0) {
    throw new ExpenseFundingError('SPLIT_REQUIRED', 'Native funding requires explicit beneficiary allocations');
  }
  const allocations = expense.split.map(value => {
    const entry = object(value);
    member(entry.memberId, memberIds, 'SPLIT-001');
    if (entry.currency !== undefined && entry.currency !== expense.currency) {
      throw new ExpenseFundingError('SPLIT-002', 'Allocation currency must match the expense currency');
    }
    return amount(entry.amount, true);
  });
  if (!conserves(allocations, total)) {
    throw new ExpenseFundingError('SPLIT-003', 'Beneficiary allocations must equal the expense amount exactly');
  }
}
