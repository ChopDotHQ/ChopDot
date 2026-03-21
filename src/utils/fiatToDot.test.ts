import { describe, it, expect } from 'vitest';
import { fiatToDot, settlementAmountInDot } from './fiatToDot';

describe('fiatToDot', () => {
  it('converts fiat to DOT using price', () => {
    expect(fiatToDot(100, 5)).toBe(20);
  });

  it('returns absolute value for negative amounts', () => {
    expect(fiatToDot(-100, 5)).toBe(20);
  });

  it('returns null when price is null', () => {
    expect(fiatToDot(100, null)).toBeNull();
  });

  it('returns null when price is zero', () => {
    expect(fiatToDot(100, 0)).toBeNull();
  });

  it('returns null when price is undefined', () => {
    expect(fiatToDot(100, undefined)).toBeNull();
  });
});

describe('settlementAmountInDot', () => {
  it('returns null when totalAmount is zero', () => {
    expect(settlementAmountInDot(0, false, 5)).toBeNull();
  });

  it('returns absolute amount for DOT pots', () => {
    expect(settlementAmountInDot(42, true, null)).toBe(42);
  });

  it('converts fiat to DOT for non-DOT pots', () => {
    expect(settlementAmountInDot(100, false, 5)).toBe(20);
  });

  it('returns null for non-DOT pot with no price', () => {
    expect(settlementAmountInDot(100, false, null)).toBeNull();
  });
});
