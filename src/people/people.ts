import type {AppState, Group, PaymentMethod, User} from '../types';

export const RECEIVE_METHOD_TYPES = ['cash', 'bank_transfer', 'payment_link'] as const;
export type ReceiveMethodType = typeof RECEIVE_METHOD_TYPES[number];

export function getSharedGroups(state: AppState, currentUserId: string, personId: string): Group[] {
  return Object.values(state.groups)
    .filter(group => group.memberIds.includes(currentUserId) && group.memberIds.includes(personId))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getUserPaymentMethods(state: AppState, userId: string): PaymentMethod[] {
  return Object.values(state.paymentMethods)
    .filter(method => method.userId === userId)
    .sort((a, b) => receiveMethodLabel(a.type).localeCompare(receiveMethodLabel(b.type)));
}

export function buildPaymentMethodId(userId: string, type: ReceiveMethodType): string {
  return `receive:${userId}:${type}`;
}

export function receiveMethodLabel(type: string): string {
  switch (type) {
    case 'cash':
      return 'Cash';
    case 'bank_transfer':
      return 'Bank transfer';
    case 'payment_link':
      return 'Payment link';
    default:
      return 'Other';
  }
}

export function canSetPreferredReceiveMethod(
  user: User | undefined,
  method: PaymentMethod | undefined,
): boolean {
  return Boolean(user && method && method.userId === user.id);
}

export function shortIdentity(value: string, start = 8, end = 6): string {
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}…${value.slice(-end)}`;
}
