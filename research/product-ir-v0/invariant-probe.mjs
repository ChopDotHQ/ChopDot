// Product IR V0 executable invariant probe.
// Research-only: no production imports and no product-policy invention.

import assert from 'node:assert/strict';

const scales = { CHF: 2, EUR: 2, USD: 2, DOT: 6 };

function toMinor(currency, value) {
  const scale = scales[currency];
  assert.notEqual(scale, undefined, `unsupported currency ${currency}`);
  const factor = 10 ** scale;
  const minor = Math.round(Number(value) * factor);
  assert.ok(Number.isSafeInteger(minor), 'amount must fit safe integer minor units');
  return minor;
}

function money(currency, value) {
  return { currency, minorUnits: toMinor(currency, value) };
}

function sum(items) {
  return items.reduce((n, x) => n + x.amount.minorUnits, 0);
}

function validateExpense(expense) {
  const errors = [];
  const total = expense.amount.minorUnits;
  const currency = expense.amount.currency;
  if (sum(expense.funding) !== total) errors.push('FUND-001');
  if (expense.funding.some(x => x.amount.currency !== currency)) errors.push('FUND-002');
  if (expense.funding.some(x => !expense.groupParticipants.includes(x.participant))) errors.push('FUND-003');
  if (sum(expense.allocations) !== total) errors.push('SPLIT-003');
  if (expense.allocations.some(x => x.amount.currency !== currency)) errors.push('SPLIT-002');

  const ids = new Set([...expense.groupParticipants, ...expense.funding.map(x => x.participant), ...expense.allocations.map(x => x.participant)]);
  const deltas = [...ids].map(participant => ({
    participant,
    minorUnits:
      expense.funding.filter(x => x.participant === participant).reduce((n,x)=>n+x.amount.minorUnits,0) -
      expense.allocations.filter(x => x.participant === participant).reduce((n,x)=>n+x.amount.minorUnits,0),
  }));
  if (deltas.reduce((n,x)=>n+x.minorUnits,0) !== 0) errors.push('POSITION-CONSERVATION');
  return { ok: errors.length === 0, errors, deltas };
}

const cases = [
  {
    name: 'two funders, three beneficiaries',
    valid: true,
    expense: {
      amount: money('CHF', 100),
      groupParticipants: ['dev','jeanine','marc'],
      funding: [
        { participant:'dev', amount:money('CHF',70) },
        { participant:'jeanine', amount:money('CHF',30) },
      ],
      allocations: [
        { participant:'dev', amount:money('CHF',20) },
        { participant:'jeanine', amount:money('CHF',40) },
        { participant:'marc', amount:money('CHF',40) },
      ],
    },
    expectedDeltas: { dev:5000, jeanine:-1000, marc:-4000 },
  },
  {
    name: 'funding does not conserve',
    valid: false,
    expectedError: 'FUND-001',
    expense: {
      amount: money('CHF', 100),
      groupParticipants: ['dev','jeanine','marc'],
      funding: [{ participant:'dev', amount:money('CHF',99) }],
      allocations: [
        { participant:'dev', amount:money('CHF',20) },
        { participant:'jeanine', amount:money('CHF',40) },
        { participant:'marc', amount:money('CHF',40) },
      ],
    },
  },
  {
    name: 'beneficiary split does not conserve',
    valid: false,
    expectedError: 'SPLIT-003',
    expense: {
      amount: money('CHF', 10),
      groupParticipants: ['a','b','c'],
      funding: [{ participant:'a', amount:money('CHF',10) }],
      // Deliberately models the common 3.33 x 3 failure.
      allocations: [
        { participant:'a', amount:money('CHF',3.33) },
        { participant:'b', amount:money('CHF',3.33) },
        { participant:'c', amount:money('CHF',3.33) },
      ],
    },
  },
  {
    name: 'exact minor-unit allocation conserves 10 CHF',
    valid: true,
    expense: {
      amount: money('CHF', 10),
      groupParticipants: ['a','b','c'],
      funding: [{ participant:'a', amount:money('CHF',10) }],
      // This proves conservation, NOT which participant should receive the remainder.
      allocations: [
        { participant:'a', amount:money('CHF',3.34) },
        { participant:'b', amount:money('CHF',3.33) },
        { participant:'c', amount:money('CHF',3.33) },
      ],
    },
  },
  {
    name: 'currency mismatch rejected',
    valid: false,
    expectedError: 'FUND-002',
    expense: {
      amount: money('CHF', 10),
      groupParticipants: ['a','b'],
      funding: [{ participant:'a', amount:money('EUR',10) }],
      allocations: [
        { participant:'a', amount:money('CHF',5) },
        { participant:'b', amount:money('CHF',5) },
      ],
    },
  },
];

let passed = 0;
for (const test of cases) {
  const result = validateExpense(test.expense);
  assert.equal(result.ok, test.valid, test.name);
  if (test.expectedError) assert.ok(result.errors.includes(test.expectedError), `${test.name}: expected ${test.expectedError}`);
  if (test.expectedDeltas) {
    const actual = Object.fromEntries(result.deltas.map(x => [x.participant, x.minorUnits]));
    assert.deepEqual(actual, test.expectedDeltas, test.name);
  }
  passed++;
}
console.log(JSON.stringify({ passed, total: cases.length }, null, 2));
