import { AppState, User, Group, Expense, Split, SavedRecord, PaymentMethod, WalletPaymentReceipt } from '../types';
import {normalizeEvmAddress, pasToBaseUnits, POLKADOT_HUB_TESTNET_CHAIN_ID} from '../payments/pasWallet';

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
  | { type: 'ADD_EXPENSE'; payload: { expense: Expense; splits: Split[] } }
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
      // Law: Leo/Nina can only mark their own payment as paid.
      // Mina cannot mark Leo/Nina as paid.
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
      // Law: Leo/Nina cannot confirm received money for Mina.
      // Only the organizer (expense.paidByUserId) can confirm receipt.
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

// Pure selector functions

export const getGroupTotal = (state: AppState, groupId: string): number => {
  return Object.values(state.expenses)
    .filter(e => e.groupId === groupId)
    .reduce((sum, e) => sum + e.amount, 0);
};

export const getMemberBalance = (state: AppState, groupId: string, userId: string): number => {
  const groupExpenses = Object.values(state.expenses).filter(e => e.groupId === groupId);
  const expenseIds = groupExpenses.map(e => e.id);
  const groupSplits = Object.values(state.splits).filter(s => expenseIds.includes(s.expenseId));

  let balance = 0;
  
  // What user owes others (not confirmed yet)
  groupSplits.filter(s => s.userId === userId && s.status !== 'confirmed').forEach(s => {
    const expense = groupExpenses.find(e => e.id === s.expenseId);
    if (expense && expense.paidByUserId !== userId) {
      balance -= s.amount;
    }
  });

  // What others owe user (not confirmed yet)
  groupExpenses.filter(e => e.paidByUserId === userId).forEach(e => {
    const owedToUserSplits = groupSplits.filter(s => s.expenseId === e.id && s.userId !== userId && s.status !== 'confirmed');
    balance += owedToUserSplits.reduce((sum, s) => sum + s.amount, 0);
  });

  return balance;
};

export const getNetPosition = (state: AppState, userId: string): number => {
  let netPosition = 0;

  // What user is owed (others owe user)
  Object.values(state.expenses).filter(e => e.paidByUserId === userId).forEach(e => {
    Object.values(state.splits).filter(s => s.expenseId === e.id && s.userId !== userId && s.status !== 'confirmed').forEach(s => {
      netPosition += s.amount;
    });
  });

  // What user owes (user owes others)
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
