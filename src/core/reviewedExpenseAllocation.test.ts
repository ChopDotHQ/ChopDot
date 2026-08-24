import assert from 'node:assert/strict';
import test from 'node:test';
import {moneyFromDecimal} from './money.ts';
import {calculateReviewedExpenseAllocations} from './reviewedExpenseAllocation.ts';

const total = moneyFromDecimal('10.00', 'CHF');
const participants = ['mina', 'leo', 'nina'];

test('reviewed allocations conserve minor units for equal, exclusion, percentage, and share splits', () => {
  const equal = calculateReviewedExpenseAllocations({method: 'equal', total, participantIds: participants});
  assert.deepEqual(equal.allocations.map(row => row.amount.minorUnits), ['334', '333', '333']);

  const excluded = calculateReviewedExpenseAllocations({
    method: 'exclude', total, participantIds: participants, excluded: new Set(['leo']),
  });
  assert.deepEqual(excluded.allocations.map(row => row.amount.minorUnits), ['500', '0', '500']);

  const percent = calculateReviewedExpenseAllocations({
    method: 'percent', total, participantIds: participants,
    percentages: {mina: '33.33', leo: '33.33', nina: '33.34'},
  });
  assert.deepEqual(percent.allocations.map(row => row.amount.minorUnits), ['333', '333', '334']);

  const shares = calculateReviewedExpenseAllocations({
    method: 'shares', total: moneyFromDecimal('0.01', 'CHF'), participantIds: participants,
    shares: {mina: '1', leo: '1', nina: '1'},
  });
  assert.deepEqual(shares.allocations.map(row => row.amount.minorUnits), ['0', '1', '0']);
});

test('reviewed exact amounts use decimal strings and fail closed on any conservation mismatch', () => {
  const exact = calculateReviewedExpenseAllocations({
    method: 'exact', total, participantIds: participants,
    exactAmounts: {mina: '3.33', leo: '3.33', nina: '3.34'},
  });
  assert.deepEqual(exact.allocations.map(row => row.amount.minorUnits), ['333', '333', '334']);
  assert.equal(exact.validationMessage, '');

  const mismatch = calculateReviewedExpenseAllocations({
    method: 'exact', total, participantIds: participants,
    exactAmounts: {mina: '3.33', leo: '3.33', nina: '3.33'},
  });
  assert.deepEqual(mismatch.allocations, []);
  assert.match(mismatch.validationMessage, /add up/u);
});

test('invalid percentage, precision, duplicate participant, and exclusion inputs fail without allocations', () => {
  assert.deepEqual(calculateReviewedExpenseAllocations({
    method: 'percent', total, participantIds: participants,
    percentages: {mina: '30', leo: '30', nina: '30'},
  }).allocations, []);
  assert.deepEqual(calculateReviewedExpenseAllocations({
    method: 'shares', total, participantIds: participants,
    shares: {mina: '0.0000001', leo: '1', nina: '1'},
  }).allocations, []);
  assert.deepEqual(calculateReviewedExpenseAllocations({method: 'equal', total, participantIds: ['mina', 'mina']}).allocations, []);
  assert.deepEqual(calculateReviewedExpenseAllocations({
    method: 'exclude', total, participantIds: participants, excluded: new Set(participants),
  }).allocations, []);
});
