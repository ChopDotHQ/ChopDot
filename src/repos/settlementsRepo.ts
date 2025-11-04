import * as Y from 'yjs';
import { openPotDoc } from './y/store';

export type SettlementStatus = 'pending' | 'included' | 'finalized';

export interface SettlementRecord {
  id: string;
  from: string;
  to: string;
  amountPlanck: string;
  method: 'dot' | 'cash' | 'bank';
  txHash?: string;
  includedBlock?: string;
  ts: number;
  status: SettlementStatus;
}

export async function recordSettlement(potId: string, s: Omit<SettlementRecord, 'id' | 'ts' | 'status'>): Promise<string> {
  const { root, destroy } = await openPotDoc(potId);
  const rec: SettlementRecord = { id: crypto.randomUUID(), ts: Date.now(), status: 'pending', ...s };
  (root.get('settlements') as Y.Array<unknown>).push([rec]);
  destroy();
  return rec.id;
}

export async function markVerified(potId: string, id: string, includedBlock: string): Promise<void> {
  const { root, destroy } = await openPotDoc(potId);
  const arr = root.get('settlements') as Y.Array<unknown>;
  const list = arr.toArray() as SettlementRecord[];
  const idx = list.findIndex((r) => r.id === id);
  if (idx >= 0) {
    const rec = list[idx]!;
    (rec as any).includedBlock = includedBlock;
    (rec as any).status = 'included';
    arr.delete(idx, 1);
    arr.insert(idx, [rec]);
  }
  destroy();
}

export async function listSettlements(potId: string): Promise<SettlementRecord[]> {
  const { root, destroy } = await openPotDoc(potId);
  const vals = (root.get('settlements') as Y.Array<unknown>).toArray() as SettlementRecord[];
  destroy();
  return vals;
}


