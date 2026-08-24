import { useState } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useAppState } from '../state/AppStateContext';
import type {GroupMode} from '../types';
import {PRODUCT_MODES} from './productModes';

export function CreateGroup({
  onBack,
  onCreated,
  mode = 'normal_pot',
  initialName,
}: {
  onBack: () => void;
  onCreated: (groupId: string) => void;
  mode?: GroupMode;
  initialName?: string;
}) {
  const { state, runAuthority, authorityBusy, authorityError } = useAppState();
  const copy = PRODUCT_MODES[mode];
  const [groupName, setGroupName] = useState(initialName ?? (mode === 'normal_pot' ? '' : copy.defaultName));

  const handleCreate = async () => {
    if (!groupName.trim() || !state.currentUserId || authorityBusy) return;
    const memberIds = [state.currentUserId];

    const groupId = `g-${crypto.randomUUID()}`;
    const created = await runAuthority({
      type: 'CREATE_GROUP', 
      payload: { 
        group: { id: groupId, name: groupName.trim(), memberIds, mode }
      } 
    });
    if (created) onCreated(groupId);
  };

  const isValid = groupName.trim().length > 0 && Boolean(state.currentUserId) && !authorityBusy;

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 transition-colors h-full overflow-hidden">
      <header className="px-6 pt-12 pb-4 flex items-center bg-white dark:bg-[#0a0a0a] border-b border-gray-100 dark:border-[#1a1a1a] shadow-sm z-10 transition-colors shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Back">
          <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-gray-100" />
        </button>
        <h1 className="flex-1 text-center font-semibold text-gray-900 dark:text-white pr-7">{mode === 'normal_pot' ? 'New Group' : `New ${copy.label}`}</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <div>
          {mode !== 'normal_pot' && (
            <p className="mb-5 text-sm leading-5 text-gray-600 dark:text-gray-300">{copy.description}</p>
          )}
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Group name</label>
          <input 
            type="text"
            placeholder="e.g. Weekend Trip"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full text-2xl border-b-2 border-gray-200 dark:border-gray-700 py-2 focus:outline-none focus:border-gray-900 dark:focus:border-gray-100 transition-colors placeholder:text-gray-300 dark:placeholder:text-gray-600 font-medium bg-transparent text-gray-900 dark:text-white"
          />
        </div>

        <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
          <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          <h2 className="mt-3 font-semibold">Start with you</h2>
          <p className="mt-1 text-sm leading-5 text-emerald-800 dark:text-emerald-200">Create the group first. Then each person chooses whether to join from their own signed invitation.</p>
          {authorityError && <p role="alert" className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">{authorityError}</p>}
        </div>
      </div>

      <div className="p-6 bg-white dark:bg-[#0a0a0a] border-t border-gray-100 dark:border-[#1a1a1a] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] shrink-0 transition-colors">
        <button 
          onClick={handleCreate}
          disabled={!isValid}
          className="w-full py-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm"
        >
          {authorityBusy ? 'Creating safely…' : 'Create group'}
        </button>
      </div>
    </div>
  );
}
