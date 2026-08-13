import { useState, FormEvent } from 'react';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { useAppState } from '../state/AppStateContext';
import { getInitials } from '../utils';

export function CreateGroup({ onBack, onCreated }: { onBack: () => void, onCreated: (groupId: string) => void }) {
  const { state, dispatch } = useAppState();
  const [groupName, setGroupName] = useState('');
  const [friendName, setFriendName] = useState('');
  const [friends, setFriends] = useState<{name: string, tempId: string}[]>([]);
  const [friendError, setFriendError] = useState('');

  const addFriend = () => {
    const name = friendName.trim();
    if (!name) return;
    const duplicate = normalizeName(state.users[state.currentUserId!]?.name ?? '') === normalizeName(name)
      || friends.some(friend => normalizeName(friend.name) === normalizeName(name));
    if (duplicate) {
      setFriendError(`${name} is already in this group.`);
      return;
    }
    setFriends([...friends, {name, tempId: crypto.randomUUID()}]);
    setFriendName('');
    setFriendError('');
  };

  const handleAddFriend = (e: FormEvent) => {
    e.preventDefault();
    addFriend();
  };

  const removeFriend = (tempId: string) => {
    setFriends(friends.filter(f => f.tempId !== tempId));
  };

  const handleCreate = () => {
    if (!groupName.trim() || friends.length === 0) return;
    
    const memberIds = [state.currentUserId!];
    
    friends.forEach(f => {
      const existingUser = Object.values(state.users).find(user =>
        user.id !== state.currentUserId && normalizeName(user.name) === normalizeName(f.name),
      );
      if (existingUser) {
        memberIds.push(existingUser.id);
        return;
      }
      const newUserId = `u-${crypto.randomUUID()}`;
      dispatch({ type: 'ADD_USER', payload: { user: { id: newUserId, name: f.name } } });
      memberIds.push(newUserId);
    });

    const groupId = `g-${crypto.randomUUID()}`;
    dispatch({ 
      type: 'CREATE_GROUP', 
      payload: { 
        group: { id: groupId, name: groupName.trim(), memberIds } 
      } 
    });

    onCreated(groupId);
  };

  const isValid = groupName.trim().length > 0 && friends.length > 0;

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 transition-colors h-full overflow-hidden">
      <header className="px-6 pt-12 pb-4 flex items-center bg-white dark:bg-[#0a0a0a] border-b border-gray-100 dark:border-[#1a1a1a] shadow-sm z-10 transition-colors shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Back">
          <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-gray-100" />
        </button>
        <h1 className="flex-1 text-center font-semibold text-gray-900 dark:text-white pr-7">New Group</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Group name</label>
          <input 
            type="text"
            placeholder="e.g. Weekend Trip"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full text-2xl border-b-2 border-gray-200 dark:border-gray-700 py-2 focus:outline-none focus:border-gray-900 dark:focus:border-gray-100 transition-colors placeholder:text-gray-300 dark:placeholder:text-gray-600 font-medium bg-transparent text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">Friends</label>
          
          <div className="space-y-3 mb-4">
            <div className="flex items-center p-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-colors">
              <div className="w-10 h-10 rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 flex items-center justify-center font-semibold mr-3 shadow-sm transition-colors">
                {state.users[state.currentUserId!]?.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 font-medium text-gray-900 dark:text-white">{state.users[state.currentUserId!]?.name} (You)</div>
            </div>

            {friends.map(friend => (
              <div key={friend.tempId} className="flex items-center p-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-colors">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center font-semibold mr-3 transition-colors">
                  {getInitials(friend.name)}
                </div>
                <div className="flex-1 font-medium text-gray-900 dark:text-white">{friend.name}</div>
                <button onClick={() => removeFriend(friend.tempId)} className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" aria-label={`Remove ${friend.name}`}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddFriend} className="flex items-center">
            <input 
              type="text"
              placeholder="Add friend by name"
              value={friendName}
              onChange={(e) => {
                setFriendName(e.target.value);
                setFriendError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addFriend();
                }
              }}
              className="flex-1 text-base border border-gray-200 dark:border-gray-700 rounded-l-xl py-3 px-4 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
              aria-label="Friend name"
            />
            <button 
              type="submit"
              disabled={!friendName.trim()}
              className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-3 rounded-r-xl border border-gray-900 dark:border-gray-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center font-semibold transition-colors"
              aria-label="Add friend"
            >
              Add
            </button>
          </form>
          {friendError && <p role="alert" className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">{friendError}</p>}
        </div>
      </div>

      <div className="p-6 bg-white dark:bg-[#0a0a0a] border-t border-gray-100 dark:border-[#1a1a1a] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] shrink-0 transition-colors">
        <button 
          onClick={handleCreate}
          disabled={!isValid}
          className="w-full py-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm"
        >
          Create group
        </button>
      </div>
    </div>
  );
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').toLocaleLowerCase();
}
