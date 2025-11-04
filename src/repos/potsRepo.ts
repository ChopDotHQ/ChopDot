import * as Y from 'yjs';
import { openPotDoc } from './y/store';

export async function createPot(currentAddr: string, name: string): Promise<string> {
  const potId = crypto.randomUUID();
  const { root, destroy } = await openPotDoc(potId);
  (root.get('meta') as Y.Map<unknown>).set('name', name);
  (root.get('members') as Y.Array<unknown>).push([{ address: currentAddr }]);
  destroy();
  // Index locally for simple discovery
  indexPot(potId);
  return potId;
}

export async function addMember(potId: string, address: string, displayName?: string): Promise<void> {
  const { root, destroy } = await openPotDoc(potId);
  (root.get('members') as Y.Array<unknown>).push([{ address, displayName }]);
  destroy();
}

export async function getPot(potId: string) {
  const h = await openPotDoc(potId);
  return h; // caller manages lifecycle
}

export async function listMyPots(_address: string): Promise<string[]> {
  const raw = localStorage.getItem('chopdot-pot-index') || '[]';
  return JSON.parse(raw) as string[];
}

export function indexPot(potId: string): void {
  const current = JSON.parse(localStorage.getItem('chopdot-pot-index') || '[]') as string[];
  if (!current.includes(potId)) {
    current.push(potId);
    localStorage.setItem('chopdot-pot-index', JSON.stringify(current));
  }
}


