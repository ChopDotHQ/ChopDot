import type {GroupMode} from '../types.ts';

export const GROUP_CREATION_DRAFT_STORAGE_KEY = 'chopdot-new-group-form-v1';
export const GROUP_CREATION_OWNER_STORAGE_KEY = 'chopdot-new-group-owner-v1';

export interface GroupCreationSessionDraftV1 {
  v: 1;
  ownerSessionId: string;
  draftId: string;
  candidateGroupId: string;
  name: string;
  mode: GroupMode;
}

/**
 * The owner is a tab-local privacy boundary, not a person, account, group, or
 * authority claim. It deliberately survives the guest-to-account ceremony so
 * one person's unfinished form remains available, and is rotated whenever all
 * local app data is cleared.
 */
export function readGroupCreationSessionOwner(storage = window.sessionStorage): string {
  try {
    const existing = storage.getItem(GROUP_CREATION_OWNER_STORAGE_KEY)?.trim();
    if (existing && existing.length <= 128 && !/[\u0000-\u001f\u007f]/u.test(existing)) return existing;
    const created = `owner-${crypto.randomUUID()}`;
    storage.setItem(GROUP_CREATION_OWNER_STORAGE_KEY, created);
    return created;
  } catch {
    return `ephemeral-${crypto.randomUUID()}`;
  }
}

export function readGroupCreationSessionDraft(
  isSupportedMode: (mode: GroupMode) => boolean,
  storage = window.sessionStorage,
): GroupCreationSessionDraftV1 | null {
  try {
    const ownerSessionId = readGroupCreationSessionOwner(storage);
    const raw = storage.getItem(GROUP_CREATION_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<GroupCreationSessionDraftV1>;
    if (value.v !== 1
      || value.ownerSessionId !== ownerSessionId
      || typeof value.draftId !== 'string'
      || typeof value.candidateGroupId !== 'string'
      || typeof value.name !== 'string'
      || !value.mode
      || !isSupportedMode(value.mode)) return null;
    return value as GroupCreationSessionDraftV1;
  } catch {
    return null;
  }
}

export function writeGroupCreationSessionDraft(
  value: GroupCreationSessionDraftV1,
  storage = window.sessionStorage,
): void {
  try {
    if (value.ownerSessionId !== readGroupCreationSessionOwner(storage)) {
      throw new Error('The local group draft belongs to another app-data session.');
    }
    storage.setItem(GROUP_CREATION_DRAFT_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // The in-memory form remains usable when tab storage is unavailable.
  }
}

export function clearGroupCreationSessionDraft(storage = window.sessionStorage): void {
  try {
    storage.removeItem(GROUP_CREATION_DRAFT_STORAGE_KEY);
  } catch {
    // A completed canonical creation must not be rolled back by local cleanup.
  }
}

export function rotateGroupCreationSession(storage = window.sessionStorage): void {
  try {
    storage.removeItem(GROUP_CREATION_DRAFT_STORAGE_KEY);
    storage.removeItem(GROUP_CREATION_OWNER_STORAGE_KEY);
  } catch {
    // App-state reset still proceeds; blocked storage is already inaccessible.
  }
}
