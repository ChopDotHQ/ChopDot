import * as Y from 'yjs';
import { openPotDoc } from '../repos/y/store';
import { blake2AsHex } from '@polkadot/util-crypto';

/** Create a stable JSON representation of a pot doc, then blake2 hash it. */
export async function hashPotState(potId: string): Promise<{ hex: string; json: string }> {
  const { root, destroy } = await openPotDoc(potId);

  const toPlain = (v: any): any => {
    if (v instanceof Y.Map) {
      const obj: Record<string, any> = {};
      const keys = Array.from((v as Y.Map<any>).keys()).sort();
      keys.forEach((k) => { obj[k] = toPlain((v as Y.Map<any>).get(k)); });
      return obj;
    }
    if (v instanceof Y.Array) {
      return (v as Y.Array<any>).toArray().map(toPlain);
    }
    return v;
  };

  const meta = toPlain(root.get('meta'));
  const members = toPlain(root.get('members'));
  const expenses = toPlain(root.get('expenses'));
  const settlements = toPlain(root.get('settlements'));
  const snapshot = { meta, members, expenses, settlements };
  const json = JSON.stringify(snapshot);
  const hex = blake2AsHex(json);
  destroy();
  return { hex, json };
}


