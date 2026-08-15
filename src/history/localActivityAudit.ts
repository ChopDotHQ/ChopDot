import type {ActivityEvent, AppState} from '../types';
import type {Action} from '../state/store';

export function appendStableActivityForAction(before: AppState, after: AppState, action: Action): AppState {
  if (after === before) return after;

  if (action.type === 'ADD_EXPENSE') {
    const {expense} = action.payload;
    if (before.expenses[expense.id] || !after.expenses[expense.id]) return after;
    return appendOnce(after, {
      id: `expense:add:${expense.id}`,
      type: 'expense_added',
      timestamp: expense.date,
      details: {
        expenseId: expense.id,
        groupId: expense.groupId,
        paidByUserId: expense.paidByUserId,
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency ?? after.currency,
      },
    });
  }

  if (action.type === 'SEND_REQUEST') {
    const requestId = action.payload.requestId;
    if (!requestId) return after;
    const split = after.splits[action.payload.splitId];
    const expense = split ? after.expenses[split.expenseId] : undefined;
    if (!split || !expense || split.status !== 'request_sent' || split.requestId !== requestId) return after;
    return appendOnce(after, {
      id: `request:sent:${requestId}`,
      type: 'request_sent',
      timestamp: new Date().toISOString(),
      details: {
        requestId,
        splitId: split.id,
        expenseId: expense.id,
        groupId: expense.groupId,
        payerUserId: split.userId,
        receiverUserId: expense.paidByUserId,
        amount: split.amount,
        currency: expense.currency ?? after.currency,
        expiresAt: split.requestExpiresAt,
      },
    });
  }

  if (action.type === 'SAVE_RECORD') {
    const record = after.savedRecords[action.payload.recordId];
    if (!record) return after;
    return appendOnce(after, {
      id: `group:saved:${record.id}`,
      type: 'group_saved',
      timestamp: record.dateSaved,
      details: {
        recordId: record.id,
        groupId: record.groupId,
        totalAmount: record.totalAmount,
        openAmount: record.openAmount,
        currency: after.currency,
      },
    });
  }

  return after;
}

function appendOnce(state: AppState, event: ActivityEvent): AppState {
  if (state.activityEvents[event.id]) return state;
  return {
    ...state,
    activityEvents: {...state.activityEvents, [event.id]: event},
  };
}
