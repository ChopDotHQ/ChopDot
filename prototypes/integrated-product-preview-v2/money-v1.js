// Preview-local adapter for the already-governing MoneyV1 equal-allocation law.
// The canonical implementation lives in src/core/money.ts on the production lineage:
// integer minor units, one explicit partition, stable participant ordering, and
// deterministic remainder assignment independent of participant input order.

export const PREVIEW_MONEY_EXPONENT = 2;
export const MONEY_V1_MAX_ABS_MINOR_UNITS = 10n ** 30n;

export function moneyFromPreviewDecimal(decimal, currency, exponent = PREVIEW_MONEY_EXPONENT) {
  if (typeof decimal !== 'string' || !/^(?:\d+)(?:\.\d+)?$/u.test(decimal)) {
    throw new Error('Money decimal is invalid.');
  }
  if (!/^[A-Z][A-Z0-9]{2,11}$/u.test(currency)) throw new Error('Money currency is invalid.');
  if (!Number.isSafeInteger(exponent) || exponent < 0 || exponent > 12) throw new Error('Money exponent is invalid.');
  const [whole, fraction = ''] = decimal.split('.');
  if (fraction.length > exponent) throw new Error('Money exceeds the supported currency precision.');
  const minorUnits = BigInt(`${whole}${fraction.padEnd(exponent, '0')}`);
  return moneyFromMinorUnits(minorUnits, currency, exponent);
}

export function moneyFromMinorUnits(minorUnits, currency, exponent = PREVIEW_MONEY_EXPONENT) {
  if (!/^[A-Z][A-Z0-9]{2,11}$/u.test(currency)) throw new Error('Money currency is invalid.');
  if (!Number.isSafeInteger(exponent) || exponent < 0 || exponent > 12) throw new Error('Money exponent is invalid.');
  const amount = typeof minorUnits === 'bigint' ? minorUnits : parseCanonicalInteger(minorUnits);
  if (amount < 0n) throw new Error('Money amount cannot be negative.');
  assertLimit(amount);
  return { v: 1, minorUnits: amount.toString(), currency, exponent };
}

export function allocateMoneyEvenly(total, participantIds) {
  assertMoney(total);
  const ids = [...new Set((Array.isArray(participantIds) ? participantIds : [])
    .map(id => String(id).trim())
    .filter(Boolean))].sort();
  if (ids.length === 0) throw new Error('At least one participant is required.');
  const amount = BigInt(total.minorUnits);
  const count = BigInt(ids.length);
  const base = amount / count;
  let remainder = amount % count;
  const allocations = ids.map(participantId => {
    const minorUnits = base + (remainder > 0n ? 1n : 0n);
    if (remainder > 0n) remainder -= 1n;
    return { participantId, amount: moneyFromMinorUnits(minorUnits, total.currency, total.exponent) };
  });
  assertConservation(total, allocations);
  return allocations;
}

export function makeAllocationSnapshot(decimal, currency, participantIds) {
  const total = moneyFromPreviewDecimal(decimal, currency, PREVIEW_MONEY_EXPONENT);
  const allocations = allocateMoneyEvenly(total, participantIds);
  return { version: 1, total, allocations };
}

export function assertAllocationSnapshot(snapshot, participantIds = null) {
  if (!snapshot || snapshot.version !== 1) throw new Error('Money allocation snapshot is invalid.');
  assertMoney(snapshot.total);
  if (!Array.isArray(snapshot.allocations) || snapshot.allocations.length === 0) {
    throw new Error('Money allocations are required.');
  }
  assertConservation(snapshot.total, snapshot.allocations);
  const canonicalIds = snapshot.allocations.map(row => row.participantId);
  if (participantIds) {
    const expected = [...new Set(participantIds.map(id => String(id).trim()).filter(Boolean))].sort();
    if (canonicalIds.length !== expected.length || canonicalIds.some((id, index) => id !== expected[index])) {
      throw new Error('Money allocation participants do not match the selected participants.');
    }
  }
  return snapshot;
}

export function allocationView(snapshot, participantIds = null) {
  assertAllocationSnapshot(snapshot, participantIds);
  const byParticipant = Object.fromEntries(snapshot.allocations.map(row => [row.participantId, row.amount]));
  const units = snapshot.allocations.map(row => row.amount.minorUnits);
  const equal = units.every(value => value === units[0]);
  return {
    ids: snapshot.allocations.map(row => row.participantId),
    total: snapshot.total,
    allocations: snapshot.allocations,
    amountByParticipant: byParticipant,
    count: snapshot.allocations.length,
    equal,
    each: equal ? snapshot.allocations[0].amount : null,
    self: byParticipant.self || moneyFromMinorUnits(0n, snapshot.total.currency, snapshot.total.exponent),
  };
}

export function assertConservation(total, allocations) {
  assertMoney(total);
  const seen = new Set();
  let sum = 0n;
  for (const row of allocations) {
    if (!row || typeof row.participantId !== 'string' || !row.participantId.trim() || seen.has(row.participantId)) {
      throw new Error('Money allocation participant is invalid.');
    }
    seen.add(row.participantId);
    assertMoney(row.amount);
    if (row.amount.currency !== total.currency || row.amount.exponent !== total.exponent) {
      throw new Error('Money allocation partition mismatch.');
    }
    sum += BigInt(row.amount.minorUnits);
  }
  if (sum !== BigInt(total.minorUnits)) throw new Error('Money allocations do not conserve the expense total.');
}

export function formatPreviewMoney(value) {
  assertMoney(value);
  const decimal = moneyToDecimal(value);
  if (value.currency === 'EUR') return `€${decimal}`;
  if (value.currency === 'USD') return `$${decimal}`;
  if (value.currency === 'CHF') return `CHF ${decimal}`;
  return `${value.currency} ${decimal}`;
}

export function moneyToDecimal(value) {
  assertMoney(value);
  const amount = BigInt(value.minorUnits);
  const digits = amount.toString().padStart(value.exponent + 1, '0');
  return value.exponent === 0
    ? digits
    : `${digits.slice(0, -value.exponent)}.${digits.slice(-value.exponent)}`;
}

function assertMoney(value) {
  if (!value || value.v !== 1 || typeof value.minorUnits !== 'string' || typeof value.currency !== 'string' || typeof value.exponent !== 'number') {
    throw new Error('Money value is invalid.');
  }
  const parsed = parseCanonicalInteger(value.minorUnits);
  if (parsed < 0n || parsed.toString() !== value.minorUnits) throw new Error('Money amount is not canonical.');
  assertLimit(parsed);
  if (!/^[A-Z][A-Z0-9]{2,11}$/u.test(value.currency)) throw new Error('Money currency is invalid.');
  if (!Number.isSafeInteger(value.exponent) || value.exponent < 0 || value.exponent > 12) throw new Error('Money exponent is invalid.');
}

function parseCanonicalInteger(value) {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d*)$/u.test(value)) throw new Error('Money minor units must be a canonical integer.');
  return BigInt(value);
}

function assertLimit(value) {
  if (value > MONEY_V1_MAX_ABS_MINOR_UNITS || value < -MONEY_V1_MAX_ABS_MINOR_UNITS) {
    throw new Error('Money amount exceeds the supported limit.');
  }
}
