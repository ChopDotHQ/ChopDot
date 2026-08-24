import {ChevronRight, Plus} from 'lucide-react';
import {useAppState} from '../state/AppStateContext';
import type {Group} from '../types';
import {modeCopy} from './productModes';
import type {ReviewableReceiptDraft} from './ReceiptFirstStart';
import {Screen, ScreenContent, ScreenHeader} from './primitives';

export function ChooseGroupForDraft({
  draft,
  onBack,
  onChoose,
  onCreate,
}: {
  draft: ReviewableReceiptDraft;
  onBack: () => void;
  onChoose: (groupId: string) => void;
  onCreate: () => void;
}) {
  const {state} = useAppState();
  const groups = (Object.values(state.groups) as Group[]).filter(group => (
    Boolean(state.currentUserId)
    && group.memberIds.includes(state.currentUserId!)
    && !group.closedRecordId
  ));

  return (
    <Screen>
      <ScreenHeader title="Choose the group" onBack={onBack} />
      <ScreenContent className="bg-[#f7f6f4] px-6 py-7 dark:bg-gray-950">
        <div className="border-b border-gray-200 pb-5 dark:border-gray-800">
          <p className="text-sm font-semibold text-[#e6007a]">Draft only</p>
          <h1 className="mt-1 truncate text-2xl font-bold tracking-[-0.04em] text-gray-950 dark:text-white">{draft.title}</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Pick who this is for. The split is still yours to review.</p>
        </div>

        {groups.length > 0 && (
          <section className="mt-6" aria-labelledby="choose-group-list-title">
            <h2 id="choose-group-list-title" className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Open groups</h2>
            <div className="mt-2 divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800">
              {groups.map(group => {
                const copy = modeCopy(group);
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => onChoose(group.id)}
                    className="flex min-h-[4.6rem] w-full items-center gap-3 py-3 text-left"
                    aria-label={`Use ${group.name}`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-bold text-[#e6007a] shadow-sm dark:bg-gray-900">{group.name.slice(0, 1).toUpperCase()}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-gray-950 dark:text-white">{group.name}</span>
                      <span className="mt-0.5 block truncate text-sm text-gray-500 dark:text-gray-400">{copy.label} · {group.memberIds.length} people</span>
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <button
          type="button"
          onClick={onCreate}
          className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-gray-950 px-5 font-semibold text-white dark:bg-white dark:text-gray-950"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          {groups.length > 0 ? 'Create a new group' : 'Add the people'}
        </button>
      </ScreenContent>
    </Screen>
  );
}
