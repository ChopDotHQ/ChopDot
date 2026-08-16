/**
 * Shared display utilities for settlement legs and methods.
 * Single source of truth used by ChapterPanel, SettlementHistory, and any
 * future settlement UI.
 */

import type { SettlementLegStatus } from '../types/app';

export const LEG_STATUS_LABELS: Record<SettlementLegStatus, string> = {
  pending: 'Pending',
  paid: 'Paid — awaiting confirmation',
  confirmed: 'Confirmed',
};

export const LEG_STATUS_COLORS: Record<SettlementLegStatus, string> = {
  pending: 'var(--text-secondary)',
  paid: 'var(--accent)',
  confirmed: 'var(--success)',
};

export const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank: 'Bank',
  paypal: 'PayPal',
  twint: 'TWINT',
};

/** Resolves a member's display name, substituting "You" for the current user. */
export function getMemberDisplayName(
  members: Array<{ id: string; name: string }>,
  id: string,
  currentUserId?: string,
): string {
  if (id === currentUserId) return 'You';
  return members.find(m => m.id === id)?.name ?? id.slice(0, 8);
}
