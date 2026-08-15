import { AppState, User, Group, Expense, Split, SavedRecord, PaymentMethod, WalletPaymentReceipt } from '../types';
import {normalizeEvmAddress, pasToBaseUnits, POLKADOT_HUB_TESTNET_CHAIN_ID} from '../payments/pasWallet';
import type { GroupInvitePacket } from '../requestLinks.ts';

export const createCleanState = (): AppState => ({
  mode: 'clean',
  theme: 'light',
  currency: 'USD',
  preferredPaymentMethod: null,
  currentUserId: null,
  users: {},
  groups: {},
  expenses: {},
  splits: {},
  paymentMethods: {},
  activityEvents: {},
  savedRecords: {}
});

export const createDemoState = (): AppState => {
  return {
    ...createCleanState(),
    mode: 'demo',
  };
};

export type Action =
  | { type: 'RESET_TO_CLEAN' }
  | { type: 'LOAD_DEMO' }
  | { type: 'SET_CURRENT_USER'; payload: { userId: string } }
  | { type: 'ADD_USER'; payload: { user: User } }
  | { type: 'SET_WALLET_ADDRESS'; payload: { userId: string; walletAddress: string } }
  | { type: 'CREATE_GROUP'; payload: { group: Group } }
  | { type: 'ACCEPT_GROUP_INVITE'; payload: { invite: GroupInvitePacket } }
  | { type: 'ADD_EXPENSE'; payload: { expense: Expense; splits: Split[] } }
  | { type: 'UPDATE_EXPENSE'; payload: { expense: Expense; splits: Split[] } }
  | { type: 'DELETE_EXPENSE'; payload: { expenseId: string } }
  | {
      type: 'CORRECT_EXPENSE';
      payload: {
        expense: Expense;
        splits: Split[];
        correctionId: string;
        occurredAt: string;
        replacementRequests?: Record<string, {requestId: string; expiresAt?: string}>;
      };
    }
  | { type: 'SEND_REQUEST'; payload: { splitId: string; requestId?: string; expiresAt?: string } }
  | { type: 'MARK_PAID'; payload: { splitId: string; userId: string } }
  | { type: 'CONFIRM_RECEIVED'; payload: { splitId: string; currentUserId: string } }
  | { type: 'RECORD_MATCHED_PAYMENT'; payload: { splitId: string; userId: string; receiverUserId: string; receipt: WalletPaymentReceipt } }
  | { type: 'SAVE_RECORD'; payload: { recordId: string; groupId: string; savedAt?: string } }
  | { type: 'SET_THEME'; payload: { theme: 'light' | 'dark' } }
  | { type: 'UPDATE_USER_NAME'; payload: { name: string } }
  | { type: 'ADD_PAYMENT_METHOD'; payload: { method: PaymentMethod } }
  | { type: 'SET_PREFERRED_PAYMENT_METHOD'; payload: { methodId: string } }
  | { type: 'SET_CURRENCY'; payload: { currency: string } };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'RESET_TO_CLEAN':
      return createCleanState();
    case 'LOAD_DEMO':
      return createDemoState();
    case 'SET_PREFERRED_PAYMENT_METHOD':
      return { ...state, preferredPaymentMethod: action.payload.methodId };
    case 'SET_CURRENCY':
      return { ...state, currency: action.payload.currency };
    case 'SET_THEME':
      return { ...state, theme: action.payload.theme };
    case 'UPDATE_USER_NAME':
      if (!state.currentUserId) return state;
      return {
        ...state,
        users: {
          ...state.users,
          [state.currentUserId]: { ...state.users[state.currentUserId], name: action.payload.name }
        }
      };
    case 'ADD_PAYMENT_METHOD':
      return {
        ...state,
        paymentMethods: {
          ...state.paymentMethods,
          [action.payload.method.id]: action.payload.method
        }
      };
    case 'SET_CURRENT_USER':
      return { ...state, currentUserId: action.payload.userId };
    case 'ADD_USER':
      return {
        ...state,
        users: { ...state.users, [action.payload.user.id]: action.payload.user }
      };
    case 'SET_WALLET_ADDRESS': {
      const user = state.users[action.payload.userId];
      if (!user) return state;
      let walletAddress: string;
      try {
        walletAddress = normalizeEvmAddress(action.payload.walletAddress);
      } catch {
        return state;
      }
      return {
        ...state,
        users: {...state.users, [user.id]: {...user, walletAddress}},
      };
    }
    case 'CREATE_GROUP':
      return {
        ...state,
        groups: { ...state.groups, [action.payload.group.id]: action.payload.group }
      };
    case 'ACCEPT_GROUP_INVITE': {
      // A shared snapshot, not authority. Local truth always wins: anything we
      // already hold is left untouched, so a link can never rewrite our own
      // record of who owes what. See SECURITY_FOUNDATION.md.
      const { invite } = action.payload;

      const users = { ...state.users };
      invite.members.forEach(m => {
        if (!users[m.id]) {
          users[m.id] = m.walletAddress
            ? { id: m.id, name: m.name, walletAddress: m.walletAddress }
            : { id: m.id, name: m.name };
        }
      });

      let currentUserId = state.currentUserId;
      const myName = currentUserId ? state.users[currentUserId]?.name : undefined;
      const claimed = myName
        ? invite.members.find(m => normalizeInviteName(m.name) === normalizeInviteName(myName))
        : undefined;

      if (claimed && currentUserId && claimed.id !== currentUserId) {
        delete users[currentUserId];
        currentUserId = claimed.id;
      }

      const memberIds = invite.members.map(m => m.id);
      if (currentUserId && !memberIds.includes(currentUserId)) {
        memberIds.push(currentUserId);
      }

      const groups = { ...state.groups };
      if (!groups[invite.groupId]) {
        groups[invite.groupId] = {
          id: invite.groupId,
          name: invite.groupName,
          memberIds,
        };
      }

      const expenses = { ...state.expenses };
      invite.expenses.forEach(e => {
        if (!expenses[e.id]) {
          expenses[e.id] = {
            id: e.id,
            groupId: invite.groupId,
            description: e.description,
            amount: e.amount,
            currency: e.currency,
            paidByUserId: e.paidByUserId,
            date: e.date,
          };
        }
      });

      const splits = { ...state.splits };
      invite.splits.forEach(sp => {
        if (!splits[sp.id]) {
          splits[sp.id] = {
            id: sp.id,
            expenseId: sp.expenseId,
            userId: sp.userId,
            amount: sp.amount,
            status: sp.status,
          };
        }
      });

      const currency = Object.keys(state.groups).length === 0 ? invite.currency : state.currency;

      return { ...state, currentUserId, currency, users, groups, expenses, splits };
    }
    case 'ADD_EXPENSE': {
      const { expense, splits } = action.payload;
      const newSplits = { ...state.splits };
      splits.forEach(s => newSplits[s.id] = s);
      return {
        ...state,
        expenses: { ...state.expenses, [expense.id]: expense },
        splits: newSplits
      };
    }
    case 'UPDATE_EXPENSE': {
      const {expense, splits} = action.payload;
      const existingExpense = state.expenses[expense.id];
      if (!existingExpense || existingExpense.groupId !== expense.groupId) return state;
      if (!isExpenseLocallyEditable(state, existingExpense)) return state;
      if (!isValidExpenseReplacement(state, expense, splits)) return state;

      const nextSplits = Object.fromEntries(
        Object.entries(state.splits).filter(([, split]) => split.expenseId !== expense.id),
      ) as Record<string, Split>;
      splits.forEach(split => {
        nextSplits[split.id] = split;
      });

      return {
        ...state,
        expenses: {...state.expenses, [expense.id]: expense},
        splits: nextSplits,
      };
    }
    case 'DELETE_EXPENSE': {
      const expense = state.expenses[action.payload.expenseId];
      if (!expense || !isExpenseLocallyEditable(state, expense)) return state;

      const nextExpenses = {...state.expenses};
      delete nextExpenses[expense.id];
      const nextSplits = Object.fromEntries(
        Object.entries(state.splits).filter(([, split]) => split.expenseId !== expense.id),
      ) as Record<string, Split>;

      return {...state, expenses: nextExpenses, splits: nextSplits};
    }
    case 'CORRECT_EXPENSE': {
      const {expense, splits, correctionId, occurredAt, replacementRequests = {}} = action.payload;
      const existingExpense = state.expenses[expense.id];
      if (!existingExpense || existingExpense.kind === 'adjustment') return state;
      if (existingExpense.groupId !== expense.groupId) return state;
      if (!correctionId || state.activityEvents[`correction:${correctionId}`]) return state;
      if (!isValidCorrectionSnapshot(state, expense, splits)) return state;

      const existingSplits = Object.values(state.splits).filter(split => split.expenseId === existingExpense.id);
      const counterpartySplits = existingSplits.filter(split => split.userId !== existingExpense.paidByUserId);
      const hasPaymentActivity = counterpartySplits.some(
        split => split.status === 'marked_paid' || split.status === 'confirmed' || Boolean(split.walletPayment),
      );
      const requestedSplits = counterpartySplits.filter(split => split.status === 'request_sent');

      if (!hasPaymentActivity && requestedSplits.length === 0) return state;
      if (expense.paidByUserId !== existingExpense.paidByUserId) return state;

      if (!hasPaymentActivity) {
        // Sent request scope is immutable. Every still-owed requested participant
        // must receive a fresh request id; otherwise the correction is rejected.
        const proposedByUser = new Map(splits.map(split => [split.userId, split]));
        for (const requested of requestedSplits) {
          const proposed = proposedByUser.get(requested.userId);
          if (proposed && proposed.amount > 0) {
            const replacement = replacementRequests[requested.userId];
            if (!replacement?.requestId || replacement.requestId === requested.requestId) return state;
          }
        }

        const nextSplits = Object.fromEntries(
          Object.entries(state.splits).filter(([, split]) => split.expenseId !== expense.id),
        ) as Record<string, Split>;
        for (const proposed of splits) {
          const wasRequested = requestedSplits.some(split => split.userId === proposed.userId);
          const replacement = replacementRequests[proposed.userId];
          const isSelf = proposed.userId === expense.paidByUserId;
          nextSplits[proposed.id] = {
            ...proposed,
            status: isSelf ? 'confirmed' : wasRequested && proposed.amount > 0 ? 'request_sent' : 'open',
            requestId: !isSelf && wasRequested && proposed.amount > 0 ? replacement?.requestId : undefined,
            requestExpiresAt: !isSelf && wasRequested && proposed.amount > 0 ? replacement?.expiresAt : undefined,
            walletPayment: undefined,
          };
        }

        const nextEvents = {...state.activityEvents};
        for (const requested of requestedSplits) {
          nextEvents[`correction:${correctionId}:request:${requested.id}`] = {
            id: `correction:${correctionId}:request:${requested.id}`,
            type: 'request_invalidated',
            timestamp: occurredAt,
            details: {
              correctionId,
              expenseId: existingExpense.id,
              splitId: requested.id,
              userId: requested.userId,
              oldRequestId: requested.requestId,
              oldAmount: requested.amount,
              replacementRequestId: replacementRequests[requested.userId]?.requestId,
              replacementAmount: proposedByUser.get(requested.userId)?.amount ?? 0,
            },
          };
        }
        nextEvents[`correction:${correctionId}`] = {
          id: `correction:${correctionId}`,
          type: 'expense_correction_recorded',
          timestamp: occurredAt,
          details: {correctionId, expenseId: existingExpense.id, mode: 'request_replaced'},
        };

        return {
          ...state,
          expenses: {...state.expenses, [expense.id]: expense},
          splits: nextSplits,
          activityEvents: nextEvents,
        };
      }

      // Once payment activity exists, history is immutable. Preserve the exact
      // original records and express only the financial delta as adjustments.
      const oldByUser = new Map(existingSplits.map(split => [split.userId, split.amount]));
      const newByUser = new Map(splits.map(split => [split.userId, split.amount]));
      const participantIds = new Set([...oldByUser.keys(), ...newByUser.keys()]);
      participantIds.delete(existingExpense.paidByUserId);

      const nextExpenses = {...state.expenses};
      const nextSplits = {...state.splits};
      const adjustmentIds: string[] = [];

      for (const userId of participantIds) {
        const delta = (newByUser.get(userId) ?? 0) - (oldByUser.get(userId) ?? 0);
        if (Math.abs(delta) < 1e-9) continue;
        const adjustmentId = `${correctionId}-adjustment-${userId}`;
        if (nextExpenses[adjustmentId]) return state;
        adjustmentIds.push(adjustmentId);

        if (delta > 0) {
          nextExpenses[adjustmentId] = {
            id: adjustmentId,
            groupId: existingExpense.groupId,
            description: `Adjustment · ${existingExpense.description}`,
            amount: delta,
            currency: existingExpense.currency,
            paidByUserId: existingExpense.paidByUserId,
            date: occurredAt,
            kind: 'adjustment',
            relatedExpenseId: existingExpense.id,
            correctionId,
          };
          nextSplits[`${adjustmentId}-self`] = {
            id: `${adjustmentId}-self`,
            expenseId: adjustmentId,
            userId: existingExpense.paidByUserId,
            amount: 0,
            status: 'confirmed',
          };
          nextSplits[`${adjustmentId}-${userId}`] = {
            id: `${adjustmentId}-${userId}`,
            expenseId: adjustmentId,
            userId,
            amount: delta,
            status: 'open',
          };
        } else {
          const refundAmount = Math.abs(delta);
          nextExpenses[adjustmentId] = {
            id: adjustmentId,
            groupId: existingExpense.groupId,
            description: `Refund adjustment · ${existingExpense.description}`,
            amount: refundAmount,
            currency: existingExpense.currency,
            paidByUserId: userId,
            date: occurredAt,
            kind: 'adjustment',
            relatedExpenseId: existingExpense.id,
            correctionId,
          };
          nextSplits[`${adjustmentId}-self`] = {
            id: `${adjustmentId}-self`,
            expenseId: adjustmentId,
            userId,
            amount: 0,
            status: 'confirmed',
          };
          nextSplits[`${adjustmentId}-${existingExpense.paidByUserId}`] = {
            id: `${adjustmentId}-${existingExpense.paidByUserId}`,
            expenseId: adjustmentId,
            userId: existingExpense.paidByUserId,
            amount: refundAmount,
            status: 'open',
          };
        }
      }

      return {
        ...state,
        expenses: nextExpenses,
        splits: nextSplits,
        activityEvents: {
          ...state.activityEvents,
          [`correction:${correctionId}`]: {
            id: `correction:${correctionId}`,
            type: 'expense_correction_recorded',
            timestamp: occurredAt,
            details: {
              correctionId,
              expenseId: existingExpense.id,
              mode: 'adjustment',
              correctedExpense: expense,
              correctedSplits: splits.map(split => ({userId: split.userId, amount: split.amount})),
              adjustmentIds,
            },
          },
        },
      };
    }
    case 'SEND_REQUEST': {
      const split = state.splits[action.payload.splitId];
      if (!split || !['open', 'request_sent'].includes(split.status)) return state;
      return {
        ...state,
        splits: {
          ...state.splits,
          [split.id]: {
            ...split,
            status: 'request_sent',
            requestId: action.payload.requestId ?? split.requestId,
            requestExpiresAt: action.payload.expiresAt ?? split.requestExpiresAt,
          }
        }
      };
    }
    case 'MARK_PAID': {
      const { splitId, userId } = action.payload;
      const split = state.splits[splitId];
      if (!split || split.userId !== userId || split.status !== 'request_sent') return state;
      return {
        ...state,
        splits: {
          ...state.splits,
          [split.id]: { ...split, status: 'marked_paid' }
        }
      };
    }
    case 'CONFIRM_RECEIVED': {
      const { splitId, currentUserId } = action.payload;
      const split = state.splits[splitId];
      if (!split) return state;
      const expense = state.expenses[split.expenseId];
      if (!expense || expense.paidByUserId !== currentUserId || split.status !== 'marked_paid') return state;
      return {
        ...state,
        splits: {
          ...state.splits,
          [split.id]: { ...split, status: 'confirmed' }
        }
      };
    }
    case 'RECORD_MATCHED_PAYMENT': {
      const {splitId, userId, receiverUserId, receipt} = action.payload;
      const split = state.splits[splitId];
      const expense = split ? state.expenses[split.expenseId] : undefined;
      const payer = state.users[userId];
      const receiver = state.users[receiverUserId];
      if (!split || !expense || split.userId !== userId || expense.paidByUserId !== receiverUserId) return state;
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
      return {
        ...state,
        splits: {
          ...state.splits,
          [split.id]: {...split, status: 'confirmed', walletPayment: receipt},
        },
      };
    }
    case 'SAVE_RECORD': {
      const { recordId, groupId, savedAt } = action.payload;
      const groupExpenses = Object.values(state.expenses).filter(e => e.groupId === groupId);
      const expenseIds = groupExpenses.map(e => e.id);
      const groupSplits = Object.values(state.splits).filter(s => expenseIds.includes(s.expenseId));
      
      const totalAmount = groupSplits.reduce((sum, s) => sum + s.amount, 0);
      const openAmount = groupSplits
        .filter(s => s.status !== 'confirmed')
        .reduce((sum, s) => sum + s.amount, 0);

      const record: SavedRecord = {
        id: recordId,
        groupId,
        dateSaved: savedAt ?? new Date().toISOString(),
        totalAmount,
        openAmount,
        splits: groupSplits
      };

      return {
        ...state,
        savedRecords: {
          ...state.savedRecords,
          [record.id]: record
        }
      };
    }
    default:
      return state;
  }
}

export const getGroupTotal = (state: AppState, groupId: string): number => {
  return Object.values(state.expenses)
    .filter(e => e.groupId === groupId && e.kind !== 'adjustment')
    .reduce((sum, e) => sum + e.amount, 0);
};

export const getMemberBalance = (state: AppState, groupId: string, userId: string): number => {
  const groupExpenses = Object.values(state.expenses).filter(e => e.groupId === groupId);
  const expenseIds = groupExpenses.map(e => e.id);
  const groupSplits = Object.values(state.splits).filter(s => expenseIds.includes(s.expenseId));

  let balance = 0;
  
  groupSplits.filter(s => s.userId === userId && s.status !== 'confirmed').forEach(s => {
    const expense = groupExpenses.find(e => e.id === s.expenseId);
    if (expense && expense.paidByUserId !== userId) {
      balance -= s.amount;
    }
  });

  groupExpenses.filter(e => e.paidByUserId === userId).forEach(e => {
    const owedToUserSplits = groupSplits.filter(s => s.expenseId === e.id && s.userId !== userId && s.status !== 'confirmed');
    balance += owedToUserSplits.reduce((sum, s) => sum + s.amount, 0);
  });

  return balance;
};

export const getNetPosition = (state: AppState, userId: string): number => {
  let netPosition = 0;

  Object.values(state.expenses).filter(e => e.paidByUserId === userId).forEach(e => {
    Object.values(state.splits).filter(s => s.expenseId === e.id && s.userId !== userId && s.status !== 'confirmed').forEach(s => {
      netPosition += s.amount;
    });
  });

  Object.values(state.splits).filter(s => s.userId === userId && s.status !== 'confirmed').forEach(s => {
    const expense = state.expenses[s.expenseId];
    if (expense && expense.paidByUserId !== userId) {
      netPosition -= s.amount;
    }
  });

  return netPosition;
};

export const getOpenSplits = (state: AppState, groupId: string): Split[] => {
  const groupExpenses = Object.values(state.expenses).filter(e => e.groupId === groupId);
  const expenseIds = groupExpenses.map(e => e.id);
  return Object.values(state.splits).filter(s => expenseIds.includes(s.expenseId) && s.status !== 'confirmed');
};

export const getSavedRecordSummary = (state: AppState, recordId: string) => {
  const record = state.savedRecords[recordId];
  if (!record) return null;
  return {
    total: record.totalAmount,
    open: record.openAmount
  };
};

function isExpenseLocallyEditable(state: AppState, expense: Expense): boolean {
  const existingSplits = Object.values(state.splits).filter(split => split.expenseId === expense.id);
  return existingSplits.every(split => {
    if (split.userId === expense.paidByUserId) {
      return split.status === 'open' || split.status === 'confirmed';
    }
    return split.status === 'open';
  });
}

function isValidExpenseReplacement(state: AppState, expense: Expense, splits: Split[]): boolean {
  if (!isValidCorrectionSnapshot(state, expense, splits)) return false;
  return splits.every(split => {
    if (split.userId === expense.paidByUserId) {
      return split.status === 'open' || split.status === 'confirmed';
    }
    return split.status === 'open';
  });
}

function isValidCorrectionSnapshot(state: AppState, expense: Expense, splits: Split[]): boolean {
  const group = state.groups[expense.groupId];
  if (!group || !group.memberIds.includes(expense.paidByUserId)) return false;
  if (!state.users[expense.paidByUserId]) return false;
  if (!Number.isFinite(expense.amount) || expense.amount <= 0) return false;
  if (splits.length === 0) return false;

  const splitIds = new Set<string>();
  const participantIds = new Set<string>();
  let splitTotal = 0;

  for (const split of splits) {
    if (split.expenseId !== expense.id) return false;
    if (!Number.isFinite(split.amount) || split.amount < 0) return false;
    if (!state.users[split.userId] || !group.memberIds.includes(split.userId)) return false;
    if (splitIds.has(split.id) || participantIds.has(split.userId)) return false;
    splitIds.add(split.id);
    participantIds.add(split.userId);
    splitTotal += split.amount;
  }

  return Math.abs(splitTotal - expense.amount) < 1e-9;
}

function normalizeInviteName(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').toLocaleLowerCase();
}