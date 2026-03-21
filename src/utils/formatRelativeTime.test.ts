import { describe, it, expect } from 'vitest';
import { formatRelativeTime } from './formatRelativeTime';

describe('formatRelativeTime', () => {
  const now = new Date('2026-03-16T12:00:00Z');

  it('returns "Just now" for less than a minute ago', () => {
    const ts = new Date('2026-03-16T11:59:30Z');
    expect(formatRelativeTime(ts, now)).toBe('Just now');
  });

  it('returns minutes ago', () => {
    const ts = new Date('2026-03-16T11:55:00Z');
    expect(formatRelativeTime(ts, now)).toBe('5m ago');
  });

  it('returns hours ago', () => {
    const ts = new Date('2026-03-16T09:00:00Z');
    expect(formatRelativeTime(ts, now)).toBe('3h ago');
  });

  it('returns days ago for less than a week', () => {
    const ts = new Date('2026-03-14T12:00:00Z');
    expect(formatRelativeTime(ts, now)).toBe('2d ago');
  });

  it('returns formatted date for a week or more', () => {
    const ts = new Date('2026-03-01T12:00:00Z');
    const result = formatRelativeTime(ts, now);
    expect(result).toContain('Mar');
    expect(result).toContain('1');
  });

  it('accepts string timestamps', () => {
    expect(formatRelativeTime('2026-03-16T11:59:30Z', now)).toBe('Just now');
  });
});
