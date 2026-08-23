export interface MoneyV1 {
  readonly v: 1;
  readonly minorUnits: string;
  readonly currency: string;
  readonly exponent: number;
}

export interface MoneyAllocationV1 {
  participantId: string;
  amount: MoneyV1;
}

export interface MoneyPostingV1 {
  participantId: string;
  side: 'payer_credit' | 'participant_debit';
  amount: MoneyV1;
}

export const MONEY_V1_SCHEMA_VERSION = 1 as const;
export const MONEY_V1_MAX_ABS_MINOR_UNITS = 10n ** 30n;

export function moneyFromDecimal(decimal: string, currency: string, exponent = 2): MoneyV1 {
  if (typeof decimal !== 'string') throw new Error('Money must enter the core as a decimal string.');
  assertCurrency(currency);
  assertExponent(exponent);
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(decimal)) throw new Error('Money decimal is invalid.');
  const [whole, fraction = ''] = decimal.split('.');
  if (fraction.length > exponent) throw new Error('Money exceeds the supported currency precision.');
  const minorUnits = BigInt(`${whole}${fraction.padEnd(exponent, '0')}`);
  return moneyFromMinorUnits(minorUnits, currency, exponent);
}

export function moneyFromMinorUnits(minorUnits: bigint | string, currency: string, exponent = 2): MoneyV1 {
  assertCurrency(currency);
  assertExponent(exponent);
  const amount = typeof minorUnits === 'bigint' ? minorUnits : parseInteger(minorUnits);
  if (amount < 0n) throw new Error('Money amount cannot be negative.');
  assertLimit(amount);
  return {v: MONEY_V1_SCHEMA_VERSION, minorUnits: amount.toString(), currency, exponent};
}

/** Signed money is restricted to explicit adjustment/reversal payloads. */
export function signedMoney(minorUnits: string, currency: string, exponent = 2): MoneyV1 {
  assertCurrency(currency);
  assertExponent(exponent);
  const amount = parseInteger(minorUnits);
  assertLimit(amount);
  return {v: MONEY_V1_SCHEMA_VERSION, minorUnits: amount.toString(), currency, exponent};
}

export function assertMoney(value: unknown, options: {allowNegative?: boolean} = {}): asserts value is MoneyV1 {
  if (!value || typeof value !== 'object') throw new Error('Money value is invalid.');
  const row = value as Partial<MoneyV1>;
  if (row.v !== 1 || typeof row.minorUnits !== 'string' || typeof row.currency !== 'string' || typeof row.exponent !== 'number') {
    throw new Error('Money value is invalid.');
  }
  assertCurrency(row.currency);
  assertExponent(row.exponent);
  const amount = parseInteger(row.minorUnits);
  if (!options.allowNegative && amount < 0n) throw new Error('Money amount cannot be negative.');
  assertLimit(amount);
  if (amount.toString() !== row.minorUnits) throw new Error('Money amount is not canonical.');
}

export function addMoney(left: MoneyV1, right: MoneyV1): MoneyV1 {
  assertSamePartition(left, right);
  const total = BigInt(left.minorUnits) + BigInt(right.minorUnits);
  return total < 0n
    ? signedMoney(total.toString(), left.currency, left.exponent)
    : moneyFromMinorUnits(total, left.currency, left.exponent);
}

export function subtractMoney(left: MoneyV1, right: MoneyV1): MoneyV1 {
  assertSamePartition(left, right);
  const total = BigInt(left.minorUnits) - BigInt(right.minorUnits);
  return total < 0n
    ? signedMoney(total.toString(), left.currency, left.exponent)
    : moneyFromMinorUnits(total, left.currency, left.exponent);
}

export function moneyEquals(left: MoneyV1, right: MoneyV1): boolean {
  return left.minorUnits === right.minorUnits && left.currency === right.currency && left.exponent === right.exponent;
}

export function allocateMoneyEvenly(total: MoneyV1, participantIds: string[]): MoneyAllocationV1[] {
  assertMoney(total);
  const ids = [...new Set(participantIds.map(id => id.trim()).filter(Boolean))].sort();
  if (ids.length === 0) throw new Error('At least one participant is required.');
  const amount = BigInt(total.minorUnits);
  const count = BigInt(ids.length);
  const base = amount / count;
  let remainder = amount % count;
  return ids.map(participantId => {
    const minorUnits = base + (remainder > 0n ? 1n : 0n);
    if (remainder > 0n) remainder -= 1n;
    return {participantId, amount: moneyFromMinorUnits(minorUnits, total.currency, total.exponent)};
  });
}

export function assertConservation(total: MoneyV1, allocations: MoneyAllocationV1[]): void {
  assertMoney(total);
  if (allocations.length === 0) throw new Error('Money allocations are required.');
  const seen = new Set<string>();
  let allocated = 0n;
  for (const row of allocations) {
    if (!row.participantId.trim() || seen.has(row.participantId)) throw new Error('Money allocation participant is invalid.');
    seen.add(row.participantId);
    assertSamePartition(total, row.amount);
    allocated += BigInt(row.amount.minorUnits);
  }
  if (allocated !== BigInt(total.minorUnits)) throw new Error('Money allocations do not conserve the expense total.');
}

export function balancedPostingsForExpense(total: MoneyV1, allocations: MoneyAllocationV1[], paidBy: string): MoneyPostingV1[] {
  assertConservation(total, allocations);
  if (!paidBy.trim() || !allocations.some(row => row.participantId === paidBy)) throw new Error('Expense payer must be one of the allocations.');
  const postings: MoneyPostingV1[] = [
    {participantId: paidBy, side: 'payer_credit', amount: signedMoney(total.minorUnits, total.currency, total.exponent)},
    ...allocations.map(row => ({
      participantId: row.participantId,
      side: 'participant_debit' as const,
      amount: signedMoney((-BigInt(row.amount.minorUnits)).toString(), total.currency, total.exponent),
    })),
  ];
  const net = postings.reduce((sum, posting) => sum + BigInt(posting.amount.minorUnits), 0n);
  if (net !== 0n) throw new Error('Expense postings are not balanced.');
  return postings;
}

export function moneyToDecimal(value: MoneyV1): string {
  assertMoney(value, {allowNegative: true});
  const amount = BigInt(value.minorUnits);
  const negative = amount < 0n;
  const digits = (negative ? -amount : amount).toString().padStart(value.exponent + 1, '0');
  const result = value.exponent === 0
    ? digits
    : `${digits.slice(0, -value.exponent)}.${digits.slice(-value.exponent)}`;
  return negative ? `-${result}` : result;
}

export function moneyToDisplayNumber(value: MoneyV1): number {
  const decimal = moneyToDecimal(value);
  const number = Number(decimal);
  if (!Number.isFinite(number)) throw new Error('Money display value is outside the supported range.');
  return number;
}

function assertSamePartition(left: MoneyV1, right: MoneyV1): void {
  assertMoney(left, {allowNegative: true});
  assertMoney(right, {allowNegative: true});
  if (left.currency !== right.currency || left.exponent !== right.exponent) {
    throw new Error('Money currency partitions cannot be combined.');
  }
}

function assertCurrency(value: string): void {
  if (!/^[A-Z][A-Z0-9]{2,11}$/u.test(value)) throw new Error('Money currency is invalid.');
}

function assertExponent(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > 12) throw new Error('Money exponent is invalid.');
}

function parseInteger(value: string): bigint {
  if (!/^-?(?:0|[1-9]\d*)$/u.test(value)) throw new Error('Money minor units must be a canonical integer.');
  return BigInt(value);
}

function assertLimit(value: bigint): void {
  if (value > MONEY_V1_MAX_ABS_MINOR_UNITS || value < -MONEY_V1_MAX_ABS_MINOR_UNITS) throw new Error('Money amount exceeds the supported limit.');
}
