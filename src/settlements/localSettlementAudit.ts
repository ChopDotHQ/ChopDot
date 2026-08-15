import type {AppState, ActivityEvent} from '../types';
import {reducer, type Action} from '../state/store';

export type LocalSettlementAction =
  | Action
  | {type: 'RETRACT_MARK_PAID'; payload: {splitId: string; userId: string}};

export function isLocalOnlySettlementAction(action: LocalSettlementAction): action is Extract<LocalSettlementAction, {type: 'RETRACT_MARK_PAID'}> {
  return action.type === 'RETRACT_MARK_PAID';
}

export function reduceWithSettlementAudit(
  state: AppState,
  action: LocalSettlementAction,
  now: () => string = () => new Date().toISOString(),
): AppState {
  if (action.type === 'RETRACT_MARK_PAID') {
    const split = state.splits[action.payload.splitId];
    if (!split || split.userId !== action.payload.userId || split.status !== 'marked_paid' || split.walletPayment) {
      return state;
    }
    const expense = state.expenses[split.expenseId];
    if (!expense) return state;

    const nextState: AppState = {
      ...state,
      splits: {
        ...state.splits,
        [split.id]: {...split, status: 'request_sent'},
      },
    };
    return appendSettlementEvent(nextState, {
      type: 'payment_marked_paid_retracted',
      splitId: split.id,
      expenseId: split.expenseId,
      payerUserId: split.userId,
      receiverUserId: expense.paidByUserId,
      amount: split.amount,
      currency: expense.currency ?? state.currency,
      requestId: split.requestId,
      timestamp: now(),
    });
  }

  const beforeSplit = getRelevantSplit(state, action);
  const next = reducer(state, action);
  if (next === state || !beforeSplit) return next;

  if (action.type === 'MARK_PAID') {
    const after = next.splits[beforeSplit.id];
    if (beforeSplit.status !== 'marked_paid' && after?.status === 'marked_paid') {
      const expense = next.expenses[beforeSplit.expenseId];
      if (!expense) return next;
      return appendSettlementEvent(next, {
        type: 'payment_marked_paid',
        splitId: beforeSplit.id,
        expenseId: beforeSplit.expenseId,
        payerUserId: beforeSplit.userId,
        receiverUserId: expense.paidByUserId,
        amount: beforeSplit.amount,
        currency: expense.currency ?? next.currency,
        requestId: beforeSplit.requestId,
        timestamp: now(),
      });
    }
  }

  if (action.type === 'CONFIRM_RECEIVED') {
    const after = next.splits[beforeSplit.id];
    if (beforeSplit.status !== 'confirmed' && after?.status === 'confirmed') {
      const expense = next.expenses[beforeSplit.expenseId];
      if (!expense) return next;
      return appendSettlementEvent(next, {
        type: 'payment_confirmed',
        splitId: beforeSplit.id,
        expenseId: beforeSplit.expenseId,
        payerUserId: beforeSplit.userId,
        receiverUserId: expense.paidByUserId,
        amount: beforeSplit.amount,
        currency: expense.currency ?? next.currency,
        requestId: beforeSplit.requestId,
        timestamp: now(),
      });
    }
  }

  return next;
}

function getRelevantSplit(state: AppState, action: Action) {
  if (action.type === 'MARK_PAID' || action.type === 'CONFIRM_RECEIVED') {
    return state.splits[action.payload.splitId];
  }
  return undefined;
}

function appendSettlementEvent(
  state: AppState,
  input: {
    type: 'payment_marked_paid' | 'payment_marked_paid_retracted' | 'payment_confirmed';
    splitId: string;
    expenseId: string;
    payerUserId: string;
    receiverUserId: string;
    amount: number;
    currency: string;
    requestId?: string;
    timestamp: string;
  },
): AppState {
  const prefix = `settlement:${input.type}:${input.splitId}:`;
  const sequence = Object.keys(state.activityEvents).filter(id => id.startsWith(prefix)).length + 1;
  const id = `${prefix}${sequence}`;
  const event: ActivityEvent = {
    id,
    type: input.type,
    timestamp: input.timestamp,
    details: {
      splitId: input.splitId,
      expenseId: input.expenseId,
      payerUserId: input.payerUserId,
      receiverUserId: input.receiverUserId,
      amount: input.amount,
      currency: input.currency,
      requestId: input.requestId,
    },
  };
  return {
    ...state,
    activityEvents: {...state.activityEvents, [id]: event},
  };
}
