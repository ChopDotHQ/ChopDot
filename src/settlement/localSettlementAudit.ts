import type {AppState, ActivityEvent, WalletPaymentReceipt} from '../types';
import {reducer, type Action} from '../state/store';
import {normalizeEvmAddress, pasToBaseUnits, POLKADOT_HUB_TESTNET_CHAIN_ID} from '../payments/pasWallet';

export type LocalSettlementAction =
  | Action
  | {type: 'RETRACT_MARK_PAID'; payload: {splitId: string; userId: string}}
  | {type: 'RECORD_VERIFIED_CHAIN_PAYMENT'; payload: {splitId: string; userId: string; receiverUserId: string; receipt: WalletPaymentReceipt}};

export function isLocalOnlySettlementAction(action: LocalSettlementAction): action is Exclude<LocalSettlementAction, Action> {
  return action.type === 'RETRACT_MARK_PAID' || action.type === 'RECORD_VERIFIED_CHAIN_PAYMENT';
}

export function reduceWithSettlementAudit(
  state: AppState,
  action: LocalSettlementAction,
  now: () => string = () => new Date().toISOString(),
): AppState {
  if (action.type === 'RECORD_VERIFIED_CHAIN_PAYMENT') {
    const {splitId, userId, receiverUserId, receipt} = action.payload;
    const split = state.splits[splitId];
    const expense = split ? state.expenses[split.expenseId] : undefined;
    const payer = state.users[userId];
    const receiver = state.users[receiverUserId];
    if (!split || !expense || split.status !== 'request_sent' || split.userId !== userId || expense.paidByUserId !== receiverUserId) return state;
    if (!payer?.walletAddress || !receiver?.walletAddress) return state;
    if (receipt.chainId.toLowerCase() !== POLKADOT_HUB_TESTNET_CHAIN_ID) return state;
    try {
      if (normalizeEvmAddress(receipt.from) !== normalizeEvmAddress(payer.walletAddress)) return state;
      if (normalizeEvmAddress(receipt.to) !== normalizeEvmAddress(receiver.walletAddress)) return state;
      if (receipt.amountBaseUnits !== pasToBaseUnits(split.amount)) return state;
    } catch {
      return state;
    }
    if (Object.values(state.splits).some(item => item.id !== splitId && item.walletPayment?.txHash === receipt.txHash)) return state;

    const nextState: AppState = {
      ...state,
      splits: {
        ...state.splits,
        [split.id]: {...split, status: 'marked_paid', walletPayment: receipt},
      },
    };
    return appendSettlementEvent(nextState, {
      type: 'payment_marked_paid',
      splitId: split.id,
      expenseId: split.expenseId,
      payerUserId: split.userId,
      receiverUserId: expense.paidByUserId,
      amount: split.amount,
      currency: expense.currency ?? state.currency,
      requestId: split.requestId,
      timestamp: now(),
      evidence: {kind: 'chain_transaction', txHash: receipt.txHash, chainId: receipt.chainId},
    });
  }

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
        evidence: {kind: 'payer_attestation'},
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
    evidence?: {kind: 'payer_attestation'} | {kind: 'chain_transaction'; txHash: string; chainId: string};
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
      evidence: input.evidence,
    },
  };
  return {
    ...state,
    activityEvents: {...state.activityEvents, [id]: event},
  };
}
