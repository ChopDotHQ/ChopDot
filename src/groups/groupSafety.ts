import type {AppState, Group} from '../types';

export type GroupMemberRemovalCheck =
  | {ok: true}
  | {ok: false; reason: 'missing_group' | 'not_member' | 'current_user' | 'last_member' | 'unresolved_money'};

export function canRemoveGroupMember(state: AppState, groupId: string, userId: string): GroupMemberRemovalCheck {
  const group = state.groups[groupId];
  if (!group) return {ok: false, reason: 'missing_group'};
  if (!group.memberIds.includes(userId)) return {ok: false, reason: 'not_member'};
  if (state.currentUserId === userId) return {ok: false, reason: 'current_user'};
  if (group.memberIds.length <= 1) return {ok: false, reason: 'last_member'};

  const expenses = Object.values(state.expenses).filter(expense => expense.groupId === groupId);
  const expenseIds = new Set(expenses.map(expense => expense.id));

  const owesSomeone = Object.values(state.splits).some(split => {
    if (!expenseIds.has(split.expenseId) || split.userId !== userId || split.status === 'confirmed') return false;
    const expense = state.expenses[split.expenseId];
    return Boolean(expense && expense.paidByUserId !== userId);
  });
  if (owesSomeone) return {ok: false, reason: 'unresolved_money'};

  const isOwedMoney = expenses.some(expense => {
    if (expense.paidByUserId !== userId) return false;
    return Object.values(state.splits).some(split =>
      split.expenseId === expense.id
      && split.userId !== userId
      && split.status !== 'confirmed',
    );
  });
  if (isOwedMoney) return {ok: false, reason: 'unresolved_money'};

  return {ok: true};
}

export function renameGroup(group: Group, name: string): Group | null {
  const normalized = name.trim().replace(/\s+/gu, ' ');
  if (!normalized) return null;
  return {...group, name: normalized};
}

export function addGroupMember(group: Group, userId: string): Group | null {
  if (!userId || group.memberIds.includes(userId)) return null;
  return {...group, memberIds: [...group.memberIds, userId]};
}

export function removeGroupMember(state: AppState, groupId: string, userId: string): Group | null {
  const check = canRemoveGroupMember(state, groupId, userId);
  if (!check.ok) return null;
  const group = state.groups[groupId];
  return {...group, memberIds: group.memberIds.filter(id => id !== userId)};
}
