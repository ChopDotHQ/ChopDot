import assert from 'node:assert/strict';
import test from 'node:test';
import {amountsMatchAtPrecision, currencyDecimals, parseNonNegativeDecimal, parseStrictDecimal} from './moneyInput.ts';

test('currency decimal policy is explicit', () => {
  assert.equal(currencyDecimals('USD'), 2);
  assert.equal(currencyDecimals('PAS'), 10);
  assert.equal(currencyDecimals('USDC'), 6);
});

test('strict decimal rejects partial and exponent parsing', () => {
  assert.equal(parseStrictDecimal('12abc', 2), null);
  assert.equal(parseStrictDecimal('1e3', 2), null);
  assert.equal(parseStrictDecimal('-1', 2), null);
  assert.equal(parseStrictDecimal('0', 2), null);
});

test('strict decimal accepts only configured precision', () => {
  assert.equal(parseStrictDecimal('12.34', 2), 12.34);
  assert.equal(parseStrictDecimal('12.345', 2), null);
  assert.equal(parseStrictDecimal('0.0000000001', 10), 0.0000000001);
});

test('non-negative parsing accepts zero but not negatives or malformed values', () => {
  assert.equal(parseNonNegativeDecimal('0', 2), 0);
  assert.equal(parseNonNegativeDecimal('2.5', 2), 2.5);
  assert.equal(parseNonNegativeDecimal('-0.1', 2), null);
  assert.equal(parseNonNegativeDecimal('2x', 2), null);
});

test('precision comparison uses currency scale', () => {
  assert.equal(amountsMatchAtPrecision(10.001, 10, 2), true);
  assert.equal(amountsMatchAtPrecision(10.006, 10, 2), false);
});