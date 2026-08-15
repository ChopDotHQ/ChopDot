import {FormEvent, useMemo, useState} from 'react';
import {Plus, X} from 'lucide-react';
import {useAppState} from '../state/AppStateContext';
import {addGroupMember, canRemoveGroupMember, removeGroupMember, renameGroup} from '../groups/groupSafety';
import {getInitials} from '../utils';
import {BottomAction, Button, Screen, ScreenContent, ScreenHeader} from './primitives';

export function GroupSettings({groupId, onBack}: {groupId: string; onBack: () => void}) {
  const {state, dispatch} = useAppState();
  const group = state.groups[groupId];
  const [name, setName] = useState(group?.name ?? '');
  const [newPerson, setNewPerson] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const members = useMemo(
    () => group?.memberIds.map(id => state.users[id]).filter(Boolean) ?? [],
    [group, state.users],
  );

  if (!group) return null;

  const saveName = () => {
    const renamed = renameGroup(group, name);
    if (!renamed) {
      setStatus('Add a group name.');
      return;
    }
    dispatch({type: 'CREATE_GROUP', payload: {group: renamed}});
    setStatus('Group name updated.');
  };

  const addPerson = (event: FormEvent) => {
    event.preventDefault();
    const displayName = newPerson.trim().replace(/\s+/gu, ' ');
    if (!displayName) return;

    const existing = Object.values(state.users).find(user => normalizeName(user.name) === normalizeName(displayName));
    const userId = existing?.id ?? `u-${crypto.randomUUID()}`;
    if (group.memberIds.includes(userId)) {
      setStatus(`${existing?.name ?? displayName} is already in this group.`);
      return;
    }

    if (!existing) dispatch({type: 'ADD_USER', payload: {user: {id: userId, name: displayName}}});
    const updated = addGroupMember(group, userId);
    if (!updated) return;
    dispatch({type: 'CREATE_GROUP', payload: {group: updated}});
    setNewPerson('');
    setStatus(`${displayName} added.`);
  };

  const removePerson = (userId: string) => {
    const user = state.users[userId];
    const updated = removeGroupMember(state, group.id, userId);
    if (!updated) {
      const check = canRemoveGroupMember(state, group.id, userId);
      setStatus(removalMessage(check.ok ? undefined : check.reason, user?.name ?? 'This person'));
      return;
    }
    dispatch({type: 'CREATE_GROUP', payload: {group: updated}});
    setStatus(`${user?.name ?? 'Person'} removed from the active group. Their history is preserved.`);
  };

  return (
    <Screen>
      <ScreenHeader title="Manage group" onBack={onBack} />
      <ScreenContent className="p-6 space-y-7">
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Group name</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Renaming does not change any expenses or balances.</p>
          </div>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={event => setName(event.target.value)}
              className="min-w-0 flex-1 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500"
              aria-label="Group name"
            />
            <button type="button" onClick={saveName} className="rounded-2xl bg-gray-900 dark:bg-gray-100 px-4 py-3 text-sm font-semibold text-white dark:text-gray-900">
              Save
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">People</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Someone with open money must settle before they can leave the active group.</p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
            {members.map(member => {
              const check = canRemoveGroupMember(state, group.id, member.id);
              const isMe = member.id === state.currentUserId;
              return (
                <div key={member.id} className="flex items-center gap-3 p-4">
                  <div className="w-9 h-9 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                    {getInitials(member.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{member.name}{isMe ? ' (You)' : ''}</p>
                    {!check.ok && !isMe && check.reason === 'unresolved_money' && (
                      <p className="text-xs text-amber-600 dark:text-amber-300">Settle this person's open money first.</p>
                    )}
                  </div>
                  {!isMe && (
                    <button
                      type="button"
                      onClick={() => removePerson(member.id)}
                      disabled={!check.ok}
                      aria-label={`Remove ${member.name}`}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <form onSubmit={addPerson} className="flex gap-2">
            <input
              value={newPerson}
              onChange={event => setNewPerson(event.target.value)}
              placeholder="Add person by name"
              aria-label="Person name"
              className="min-w-0 flex-1 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500"
            />
            <button
              type="submit"
              disabled={!newPerson.trim()}
              className="w-12 rounded-2xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 flex items-center justify-center disabled:opacity-40"
              aria-label="Add person"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </section>

        {status && <p role="status" className="text-sm text-center text-gray-600 dark:text-gray-300">{status}</p>}
      </ScreenContent>
      <BottomAction>
        <Button onClick={onBack} fullWidth>Done</Button>
      </BottomAction>
    </Screen>
  );
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').toLocaleLowerCase();
}

function removalMessage(reason: string | undefined, name: string): string {
  if (reason === 'unresolved_money') return `Settle ${name}'s open money before removing them.`;
  if (reason === 'current_user') return 'You cannot remove yourself from this group yet.';
  if (reason === 'last_member') return 'A group needs at least one member.';
  return `${name} cannot be removed right now.`;
}
