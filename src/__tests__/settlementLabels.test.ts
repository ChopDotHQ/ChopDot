import { describe, it, expect } from 'vitest';
import { getMemberDisplayName } from '../utils/settlementLabels';

const members = [
  { id: 'user-abc', name: 'Alice' },
  { id: 'user-def', name: 'Bob' },
];

describe('getMemberDisplayName', () => {
  it('returns "You" when the id matches the current user', () => {
    expect(getMemberDisplayName(members, 'user-abc', 'user-abc')).toBe('You');
  });

  it('returns the member name for a known member who is not the current user', () => {
    expect(getMemberDisplayName(members, 'user-def', 'user-abc')).toBe('Bob');
  });

  it('returns the first 8 characters of the id when the member is not found', () => {
    expect(getMemberDisplayName(members, 'unknown-xyz-longid', 'user-abc')).toBe('unknown-');
  });

  it('returns the member name when currentUserId is undefined', () => {
    expect(getMemberDisplayName(members, 'user-abc', undefined)).toBe('Alice');
  });

  it('returns the first 8 chars of an unknown id when currentUserId is undefined', () => {
    expect(getMemberDisplayName(members, 'zz-123456789', undefined)).toBe('zz-12345');
  });

  it('returns "You" even when the matching member is not in the members array', () => {
    // id matches currentUserId — the self-check happens before the lookup
    expect(getMemberDisplayName([], 'user-abc', 'user-abc')).toBe('You');
  });

  it('works with an empty members array for an unknown user', () => {
    expect(getMemberDisplayName([], 'abcdefghij', 'other')).toBe('abcdefgh');
  });
});
