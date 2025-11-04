import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { WebrtcProvider } from 'y-webrtc';

export interface YHandles {
  doc: Y.Doc;
  root: Y.Map<unknown>;
  destroy: () => void;
}

/** Open a Y Doc per pot, persisted locally + P2P synced with y-webrtc */
export async function openPotDoc(potId: string): Promise<YHandles> {
  const doc = new Y.Doc();
  const root = doc.getMap<unknown>('root');

  // Persist locally
  const idb = new IndexeddbPersistence(`chopdot-pot-${potId}`, doc);
  await idb.whenSynced;

  // P2P sync (room = potId)
  const rtc = new WebrtcProvider(`chopdot-${potId}`, doc, {
    signaling: ['wss://signaling.yjs.dev'],
  });

  const destroy = () => {
    rtc.destroy();
    doc.destroy();
  };

  // Initialize structure if first time
  if (!root.has('meta')) root.set('meta', new Y.Map());
  if (!root.has('members')) root.set('members', new Y.Array());
  if (!root.has('expenses')) root.set('expenses', new Y.Array());
  if (!root.has('settlements')) root.set('settlements', new Y.Array());

  return { doc, root, destroy };
}


