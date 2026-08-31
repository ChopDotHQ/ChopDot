import type {AppState, Group, Split} from '../types';

export type HomeContextualPrompt = {
  kind: 'confirm_received' | 'payment_requested';
  groupId: string;
  eyebrow: string;
  title: string;
  detail: string;
  actionLabel: 'Open group';
};

export type HomePresentation = {
  state: 'empty' | 'returning';
  openGroupIds: string[];
  prompt: HomeContextualPrompt | null;
};

type HomePresentationState = Pick<AppState, 'groups' | 'expenses' | 'splits'>;
type PromptCandidate = {
  priority: number;
  groupIndex: number;
  prompt: HomeContextualPrompt;
};

export function deriveHomePresentation(
  state: HomePresentationState,
  currentUserId: string,
): HomePresentation {
  const openGroups = (Object.values(state.groups) as Group[])
    .filter(group => group.memberIds.includes(currentUserId) && !group.closedRecordId)
    .sort(compareGroups);

  if (openGroups.length === 0) {
    return {state: 'empty', openGroupIds: [], prompt: null};
  }

  const candidates: PromptCandidate[] = [];
  openGroups.forEach((group, groupIndex) => {
    const expenses = Object.values(state.expenses).filter(expense => expense.groupId === group.id);
    const expenseById = new Map(expenses.map(expense => [expense.id, expense]));
    const splits = (Object.values(state.splits) as Split[]).filter(split => expenseById.has(split.expenseId));
    const needsConfirmation = splits.some(split => (
      ['marked_paid', 'cleared'].includes(split.status)
      && expenseById.get(split.expenseId)?.paidByUserId === currentUserId
      && split.userId !== currentUserId
    ));
    if (needsConfirmation) {
      candidates.push({
        priority: 0,
        groupIndex,
        prompt: {
          kind: 'confirm_received',
          groupId: group.id,
          eyebrow: 'Needs your confirmation',
          title: `Confirm a payment in ${group.name}`,
          detail: 'Someone marked a payment as sent. Check what arrived before confirming it.',
          actionLabel: 'Open group',
        },
      });
      return;
    }
    const paymentRequested = splits.some(split => split.userId === currentUserId && split.status === 'request_sent');
    if (paymentRequested) {
      candidates.push({
        priority: 1,
        groupIndex,
        prompt: {
          kind: 'payment_requested',
          groupId: group.id,
          eyebrow: 'Payment requested',
          title: `Your share is ready in ${group.name}`,
          detail: 'Open the group to review the amount and choose how you want to pay.',
          actionLabel: 'Open group',
        },
      });
    }
  });
  candidates.sort((left, right) => left.priority - right.priority || left.groupIndex - right.groupIndex);

  return {
    state: 'returning',
    openGroupIds: openGroups.map(group => group.id),
    prompt: candidates[0]?.prompt ?? null,
  };
}

function compareGroups(left: Group, right: Group): number {
  const leftName = left.name.toLocaleLowerCase('en');
  const rightName = right.name.toLocaleLowerCase('en');
  if (leftName < rightName) return -1;
  if (leftName > rightName) return 1;
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}
