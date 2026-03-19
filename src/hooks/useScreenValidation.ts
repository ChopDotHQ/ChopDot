import { useEffect } from 'react';
import type { Pot } from '../types/app';

interface Person {
  id: string;
  [key: string]: unknown;
}

interface UseScreenValidationParams {
  screen: { type: string; expenseId?: string; memberId?: string; potId?: string; [key: string]: unknown } | null;
  pots: Pot[];
  people: Person[];
  currentPotId: string | null;
  currentPot: Pot | null | undefined;
  currentPotLoading: boolean;
  reset: (screen: { type: string }) => void;
  replace: (screen: { type: string; potId?: string }) => void;
}

const VALID_SCREEN_TYPES = [
  'activity-home', 'pots-home', 'settlements-home', 'people-home', 'you-tab',
  'settings', 'crust-storage', 'crust-auth-setup', 'payment-methods', 'insights',
  'create-pot', 'pot-home', 'add-expense', 'edit-expense', 'expense-detail',
  'settle-selection', 'settle-home', 'settlement-history', 'settlement-confirmation',
  'member-detail', 'add-contribution', 'withdraw-funds', 'checkpoint-status',
  'request-payment', 'receive-qr', 'import-pot',
];

const POT_REQUIRED_SCREENS = [
  'add-expense', 'edit-expense', 'expense-detail',
  'add-contribution', 'withdraw-funds', 'pot-home',
];

export function useScreenValidation({
  screen,
  pots,
  people,
  currentPotId,
  currentPot,
  currentPotLoading,
  reset,
  replace,
}: UseScreenValidationParams): void {
  useEffect(() => {
    if (!screen) return;
    if (currentPotLoading) return;

    const { type: screenType } = screen;

    if (POT_REQUIRED_SCREENS.includes(screenType) && !currentPot) {
      reset({ type: 'pots-home' });
      return;
    }

    if (screenType === 'edit-expense' && screen.expenseId) {
      const expense = currentPot?.expenses.find(e => e.id === screen.expenseId);
      if (!expense && currentPot) {
        replace({ type: 'pot-home', potId: currentPotId! });
        return;
      }
    }

    if (screenType === 'expense-detail' && screen.expenseId) {
      const expense = currentPot?.expenses.find(e => e.id === screen.expenseId);
      if (!expense && currentPot) {
        replace({ type: 'pot-home', potId: currentPotId! });
        return;
      }
    }

    if (screenType === 'checkpoint-status') {
      if (!currentPot || !currentPot.currentCheckpoint) {
        if (currentPotId) {
          replace({ type: 'pot-home', potId: currentPotId });
        } else {
          reset({ type: 'pots-home' });
        }
        return;
      }
    }

    if (screenType === 'member-detail' && screen.memberId) {
      const personFromPeople = people.find(p => p.id === screen.memberId);
      const foundInPots = pots.some(p => p.members.some(m => m.id === screen.memberId));
      if (!personFromPeople && !foundInPots) {
        reset({ type: 'people-home' });
        return;
      }
    }

    if (screenType === 'settle-cash' || screenType === 'settle-bank' || screenType === 'settle-dot') {
      if (currentPotId) {
        replace({ type: 'settle-selection' });
      } else {
        reset({ type: 'people-home' });
      }
      return;
    }

    if (!VALID_SCREEN_TYPES.includes(screenType)) {
      reset({ type: 'pots-home' });
    }
  }, [screen, pots, people, currentPotId, currentPot, currentPotLoading, reset, replace]);
}
