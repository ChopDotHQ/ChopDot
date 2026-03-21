import { useMemo } from 'react';

/**
 * Groups expenses by date label (Today, Yesterday, or formatted date)
 * and sorts each group by most recent first.
 */
export function useExpenseGroups<T extends { id: string; date: string }>(expenses: T[]): Record<string, T[]> {
  return useMemo(() => {
    const sorted = expenses.slice().sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return sorted.reduce((groups, expense) => {
      const date = new Date(expense.date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let label = '';
      if (date.toDateString() === today.toDateString()) {
        label = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        label = 'Yesterday';
      } else {
        label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      if (!groups[label]) groups[label] = [];
      groups[label]!.push(expense);
      return groups;
    }, {} as Record<string, T[]>);
  }, [expenses]);
}
