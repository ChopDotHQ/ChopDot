import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GROUP_CREATION_DRAFT_STORAGE_KEY,
  readGroupCreationSessionDraft,
  readGroupCreationSessionOwner,
  rotateGroupCreationSession,
  writeGroupCreationSessionDraft,
} from './groupCreationSessionDraft.ts';

class MemorySessionStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const supported = (mode: string) => mode === 'normal_pot';

test('one tab-local owner restores its draft without claiming product authority', () => {
  const storage = new MemorySessionStorage();
  const ownerSessionId = readGroupCreationSessionOwner(storage);
  const draft = {
    v: 1 as const,
    ownerSessionId,
    draftId: 'draft-dinner',
    candidateGroupId: 'group-dinner',
    name: 'Zurich dinner',
    mode: 'normal_pot' as const,
  };
  writeGroupCreationSessionDraft(draft, storage);

  assert.deepEqual(readGroupCreationSessionDraft(supported, storage), draft);
  assert.doesNotMatch(storage.getItem(GROUP_CREATION_DRAFT_STORAGE_KEY) ?? '', /accountPublicKeyHex|organizer|membership|personhood/iu);
});

test('clear-app-data rotation removes the private draft and gives the next person a new owner session', () => {
  const storage = new MemorySessionStorage();
  const firstOwner = readGroupCreationSessionOwner(storage);
  writeGroupCreationSessionDraft({
    v: 1,
    ownerSessionId: firstOwner,
    draftId: 'draft-private',
    candidateGroupId: 'group-private',
    name: 'Private emergency',
    mode: 'normal_pot',
  }, storage);

  rotateGroupCreationSession(storage);
  const nextOwner = readGroupCreationSessionOwner(storage);

  assert.notEqual(nextOwner, firstOwner);
  assert.equal(readGroupCreationSessionDraft(supported, storage), null);
  assert.equal(storage.getItem(GROUP_CREATION_DRAFT_STORAGE_KEY), null);
});

test('a draft copied from another owner session is ignored', () => {
  const storage = new MemorySessionStorage();
  readGroupCreationSessionOwner(storage);
  storage.setItem(GROUP_CREATION_DRAFT_STORAGE_KEY, JSON.stringify({
    v: 1,
    ownerSessionId: 'owner-someone-else',
    draftId: 'draft-foreign',
    candidateGroupId: 'group-foreign',
    name: 'Someone else\'s group',
    mode: 'normal_pot',
  }));

  assert.equal(readGroupCreationSessionDraft(supported, storage), null);
});
