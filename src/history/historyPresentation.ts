import type {ActivityEvent, AppState} from '../types';

export interface HistoryRow {
  id: string;
  timestamp: string;
  title: string;
  subtitle?: string;
  amount?: number;
  currency?: string;
  tone: 'neutral' | 'positive' | 'warning';
}

export function projectHistoryRows(state: AppState): HistoryRow[] {
  return Object.values(state.activityEvents)
    .map(event => projectHistoryEvent(state, event))
    .filter((row): row is HistoryRow => row !== null)
    .sort((a, b) => timestampValue(b.timestamp) - timestampValue(a.timestamp));
}

export function projectHistoryEvent(state: AppState, event: ActivityEvent): HistoryRow | null {
  const details = event.details ?? {};
  const expense = typeof details.expenseId === 'string' ? state.expenses[details.expenseId] : undefined;
  const groupId = typeof details.groupId === 'string' ? details.groupId : expense?.groupId;
  const group = groupId ? state.groups[groupId] : undefined;
  const payer = personName(state, details.payerUserId ?? details.userId);
  const receiver = personName(state, details.receiverUserId ?? expense?.paidByUserId);
  const amount = finiteNumber(details.amount ?? details.oldAmount);
  const currency = nonEmptyString(details.currency ?? expense?.currency) ?? state.currency;

  if (event.type === 'expense_added') {
    return row(event, `${personName(state, details.paidByUserId)} added ${nonEmptyString(details.description) ?? 'an expense'}`, group?.name, finiteNumber(details.amount), currency);
  }
  if (event.type === 'request_sent') {
    return row(event, `${receiver} requested payment from ${payer}`, group?.name ?? expense?.description, amount, currency);
  }
  if (event.type === 'request_invalidated') {
    return row(event, 'Payment request updated', expense?.description ?? group?.name, finiteNumber(details.replacementAmount ?? details.oldAmount), currency, 'warning');
  }
  if (event.type === 'expense_correction_recorded') {
    return row(event, expense?.description ? `Expense corrected · ${expense.description}` : 'Expense corrected', group?.name, undefined, undefined, 'warning');
  }
  if (event.type === 'payment_marked_paid') {
    const kind = nonEmptyString(details.evidence?.kind);
    const subtitle = kind === 'native_chain_transaction'
      ? 'Polkadot transaction recorded · waiting for confirmation'
      : kind === 'chain_transaction'
        ? 'Wallet transaction recorded · waiting for confirmation'
        : 'Waiting for receiver confirmation';
    return row(event, `${payer} marked payment sent to ${receiver}`, subtitle, amount, currency);
  }
  if (event.type === 'payment_marked_paid_retracted') {
    return row(event, `${payer} undid the paid acknowledgement`, group?.name ?? expense?.description, amount, currency, 'warning');
  }
  if (event.type === 'payment_confirmed') {
    return row(event, `${receiver} confirmed payment from ${payer}`, group?.name ?? expense?.description, amount, currency, 'positive');
  }
  if (event.type === 'group_saved') {
    const open = finiteNumber(details.openAmount) ?? 0;
    return row(event, `${group?.name ?? 'Group'} saved to history`, undefined, finiteNumber(details.totalAmount), currency, open > 0 ? 'warning' : 'positive');
  }
  return null;
}

function row(event: ActivityEvent, title: string, subtitle?: string, amount?: number, currency?: string, tone: HistoryRow['tone'] = 'neutral'): HistoryRow {
  return {id: event.id, timestamp: event.timestamp, title, subtitle, amount, currency, tone};
}

function personName(state: AppState, id: unknown): string {
  return typeof id === 'string' && state.users[id]?.name ? state.users[id].name : 'Someone';
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function timestampValue(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}
