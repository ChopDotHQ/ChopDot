import * as Y from 'yjs';
import { openPotDoc } from './y/store';

export interface ExpenseSplit { to: string; share: number }
export interface ExpenseRecord {
  id: string;
  payer: string;
  amountPlanck: string;
  memo?: string;
  splits: ExpenseSplit[];
  ts: number;
}

export async function addExpense(potId: string, e: Omit<ExpenseRecord, 'id' | 'ts'>): Promise<void> {
  const { root, destroy } = await openPotDoc(potId);
  const exp: ExpenseRecord = { id: crypto.randomUUID(), ts: Date.now(), ...e };
  (root.get('expenses') as Y.Array<unknown>).push([exp]);
  destroy();
}

export async function listExpenses(potId: string): Promise<ExpenseRecord[]> {
  const { root, destroy } = await openPotDoc(potId);
  const vals = (root.get('expenses') as Y.Array<unknown>).toArray() as ExpenseRecord[];
  destroy();
  return vals;
}


