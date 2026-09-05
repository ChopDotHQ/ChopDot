import {cloneJson} from './canonical.ts';
import type {CanonicalGroupStateV1} from './moneyEventKernel.ts';

export interface RedactedGroupExportV1 {
  v: 1;
  groupId: string;
  name: string;
  version: number;
  people: Array<{participantId: string; role: 'organizer' | 'member'}>;
  expenses: Array<{
    expenseId: string;
    description: string;
    paidBy: string;
    total: {minorUnits: string; currency: string; exponent: number};
  }>;
  shares: Array<{
    shareId: string;
    expenseId: string;
    participantId: string;
    amount: {minorUnits: string; currency: string; exponent: number};
    status: string;
  }>;
  closedRecordId: string | null;
  stateHash: string;
}

export function createRedactedGroupExport(state: CanonicalGroupStateV1, stateHash: string): RedactedGroupExportV1 {
  return cloneJson({
    v: 1,
    groupId: state.groupId,
    name: state.name,
    version: state.version,
    people: Object.values(state.members).map(member => ({participantId: member.participantId, role: member.role})),
    expenses: Object.values(state.expenses).map(expense => ({
      expenseId: expense.expenseId,
      description: expense.description,
      paidBy: expense.paidBy,
      total: expense.total,
    })),
    shares: Object.values(state.shares).map(share => ({
      shareId: share.shareId,
      expenseId: share.expenseId,
      participantId: share.participantId,
      amount: share.amount,
      status: share.status,
    })),
    closedRecordId: state.closed?.recordId ?? null,
    stateHash,
  });
}
