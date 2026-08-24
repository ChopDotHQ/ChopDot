import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAppState } from '../state/AppStateContext';
import type {GroupMode} from '../types';
import {PRODUCT_MODES, PRODUCT_MODE_ORDER} from './productModes';
import type {GroupCreationInputV1} from '../membership/groupCreationEntryService';
import {
  clearGroupCreationSessionDraft,
  readGroupCreationSessionDraft,
  readGroupCreationSessionOwner,
  writeGroupCreationSessionDraft,
  type GroupCreationSessionDraftV1,
} from '../membership/groupCreationSessionDraft';

type SharedActionSetup = () => Promise<{participantId: string}>;
type SharedGroupCreator = (input: GroupCreationInputV1) => Promise<boolean>;

export function CreateGroup({
  onBack,
  onCreated,
  onPrepareSharedAction,
  onCreateSharedGroup,
  mode = 'normal_pot',
  initialName,
}: {
  onBack: () => void;
  onCreated: (groupId: string) => void;
  onPrepareSharedAction?: SharedActionSetup;
  onCreateSharedGroup?: SharedGroupCreator;
  mode?: GroupMode;
  initialName?: string;
}) {
  const { state, runAuthority, authorityBusy } = useAppState();
  const [storedDraft] = useState(() => readStoredDraft(mode, initialName));
  const [selectedMode, setSelectedMode] = useState<GroupMode>(storedDraft.mode);
  const copy = PRODUCT_MODES[selectedMode];
  const [groupName, setGroupName] = useState(storedDraft.name);
  const [setupBusy, setSetupBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    writeGroupCreationSessionDraft({...storedDraft, name: groupName, mode: selectedMode});
  }, [groupName, selectedMode, storedDraft]);

  const handleCreate = async () => {
    if (!groupName.trim() || !state.currentUserId || authorityBusy || setupBusy) return;
    setCreateError(null);

    const groupId = storedDraft.candidateGroupId;
    let created = false;
    if (onCreateSharedGroup) {
      setSetupBusy(true);
      try {
        created = await onCreateSharedGroup({
          draftId: storedDraft.draftId,
          candidateGroupId: groupId,
          name: groupName.trim(),
          mode: selectedMode,
          intent: 'shared',
        });
      } catch {
        setCreateError('We couldn’t finish setting up. Try again—your group name is still here.');
        return;
      } finally {
        setSetupBusy(false);
      }
    } else {
      let organizerId = state.currentUserId;
      const organizer = state.users[organizerId];
      if (!organizer?.accountPublicKeyHex) {
        if (!onPrepareSharedAction) {
          setCreateError('Finish setting up, then try again. Your group name is still here.');
          return;
        }
        setSetupBusy(true);
        try {
          organizerId = (await onPrepareSharedAction()).participantId;
        } catch {
          setCreateError('We couldn’t finish setting up. Try again—your group name is still here.');
          return;
        } finally {
          setSetupBusy(false);
        }
      }
      created = await runAuthority({
        type: 'CREATE_GROUP',
        payload: {group: {id: groupId, name: groupName.trim(), memberIds: [organizerId], mode: selectedMode}},
      });
    }
    if (created) {
      clearGroupCreationSessionDraft();
      onCreated(groupId);
    } else {
      setCreateError('We couldn’t create the group yet. Try again—your group name is still here.');
    }
  };

  const isBusy = setupBusy || authorityBusy;
  const isValid = groupName.trim().length > 0 && Boolean(state.currentUserId) && !isBusy;

  const updateMode = (nextMode: GroupMode) => {
    const previousDefault = selectedMode === 'normal_pot' ? '' : PRODUCT_MODES[selectedMode].defaultName;
    setSelectedMode(nextMode);
    if (!groupName.trim() || groupName === previousDefault) {
      setGroupName(nextMode === 'normal_pot' ? '' : PRODUCT_MODES[nextMode].defaultName);
    }
  };

  return (
    <main className="flex h-full flex-1 flex-col overflow-hidden bg-[#f7f6f4] text-gray-950 transition-colors dark:bg-gray-950 dark:text-white">
      <header className="flex shrink-0 items-center px-6 pb-4 pt-12">
        <button onClick={onBack} className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10" aria-label="Back">
          <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-gray-100" />
        </button>
        <h1 className="flex-1 pr-9 text-center text-lg font-bold tracking-[-0.03em]">New group</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-8 pt-6">
        <section>
          <p className="text-sm font-semibold text-[#c40068] dark:text-[#ff65b5]">Start with you</p>
          <label id="group-name-label" htmlFor="group-name" className="mt-3 block text-sm font-semibold text-gray-700 dark:text-gray-300">Group name</label>
          <input 
            id="group-name"
            type="text"
            placeholder="e.g. Weekend Trip"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            autoComplete="off"
            autoFocus
            className="w-full border-b-2 border-gray-300 bg-transparent py-3 text-2xl font-bold tracking-[-0.03em] text-gray-950 outline-none transition-colors placeholder:text-gray-400 focus:border-[#e6007a] dark:border-gray-700 dark:text-white dark:placeholder:text-gray-600"
          />
        </section>

        <section className="mt-8">
          <label id="group-type-label" htmlFor="group-type" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">What is it for?</label>
          <select
            id="group-type"
            value={selectedMode}
            onChange={event => updateMode(event.target.value as GroupMode)}
            className="mt-2 min-h-12 w-full rounded-2xl border border-gray-300 bg-white px-4 text-base font-semibold text-gray-950 outline-none transition-colors focus:border-[#e6007a] focus:ring-2 focus:ring-[#e6007a]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            {PRODUCT_MODE_ORDER.map(value => (
              <option key={value} value={value}>{PRODUCT_MODES[value].label}</option>
            ))}
          </select>
          <p className="mt-2 text-sm leading-5 text-gray-600 dark:text-gray-300">{copy.description}</p>
        </section>

        <p className="mt-8 border-t border-gray-200 pt-5 text-sm leading-5 text-gray-600 dark:border-gray-800 dark:text-gray-300">
          Only you are added now. Invite people after the group is ready.
        </p>

        {createError && (
          <p role="alert" className="mt-4 text-sm font-semibold leading-5 text-red-700 dark:text-red-300">
            {createError}
          </p>
        )}
      </div>

      <div className="shrink-0 border-t border-gray-200 bg-[#f7f6f4] p-6 dark:border-gray-800 dark:bg-gray-950">
        <button 
          onClick={handleCreate}
          disabled={!isValid}
          data-primary-action="true"
          className="flex min-h-14 w-full items-center justify-center rounded-full bg-[#e6007a] px-6 text-base font-bold text-white shadow-[0_12px_28px_rgba(230,0,122,0.22)] transition-colors hover:bg-[#c9006b] focus:outline-none focus:ring-2 focus:ring-[#e6007a] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 dark:ring-offset-gray-950"
        >
          {setupBusy ? 'Finishing setup…' : authorityBusy ? 'Creating group…' : createError ? 'Try again' : 'Create my group'}
        </button>
      </div>
    </main>
  );
}

function readStoredDraft(mode: GroupMode, initialName?: string): GroupCreationSessionDraftV1 {
  const stored = readGroupCreationSessionDraft(value => PRODUCT_MODE_ORDER.includes(value));
  if (stored) return stored;
  const selectedMode = mode;
  return {
    v: 1,
    ownerSessionId: readGroupCreationSessionOwner(),
    draftId: `draft-${crypto.randomUUID()}`,
    candidateGroupId: `g-${crypto.randomUUID()}`,
    name: initialName ?? (selectedMode === 'normal_pot' ? '' : PRODUCT_MODES[selectedMode].defaultName),
    mode: selectedMode,
  };
}
