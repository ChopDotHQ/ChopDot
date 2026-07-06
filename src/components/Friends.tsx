import { useState, FormEvent, KeyboardEvent } from 'react';
import { Copy, Users, Check } from 'lucide-react';
import { useAppState } from '../state/AppStateContext';
import { User } from '../types';
import { Screen, ScreenHeader, ScreenContent, PersonRow, EmptyState, Button } from './primitives';
import { copyText } from '../environment';

export function Friends({ onBack }: { onBack: () => void }) {
  const { state, dispatch } = useAppState();
  const [newFriendName, setNewFriendName] = useState('');
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const friends = (Object.values(state.users) as User[]).filter(u => u.id !== state.currentUserId);

  const handleAddFriend = (e?: FormEvent | KeyboardEvent) => {
    if (e) e.preventDefault();
    
    const nameToadd = newFriendName.trim();
    if (!nameToadd) return;
    
    if (friends.some(f => f.name.toLowerCase() === nameToadd.toLowerCase())) {
      setError(`${nameToadd} is already in your friends list.`);
      return;
    }
    
    setError('');
    dispatch({ 
      type: 'ADD_USER', 
      payload: { user: { id: `u-${Date.now() + Math.random().toString(36).substring(7)}`, name: nameToadd } } 
    });
    setNewFriendName('');
  };

  const handleCopyInvite = async (friend: User) => {
    const text = `Join me on ChopDot: ${friend.name}`;
    const result = await copyText(text);
    setCopiedId(result === 'copied' ? friend.id : `fallback-${friend.id}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Screen>
      <ScreenHeader title="Friends" onBack={onBack} />
      
      <ScreenContent className="p-6 space-y-6">
        <form onSubmit={handleAddFriend} className="flex flex-col space-y-2">
          <div className="flex space-x-2">
            <input 
              type="text" 
              placeholder="Friend's name"
              value={newFriendName}
              onChange={e => {
                setNewFriendName(e.target.value);
                if (error) setError('');
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddFriend(e);
                }
              }}
              className="flex-1 p-3 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 transition-colors shadow-sm"
            />
            <Button 
              type="submit"
              disabled={!newFriendName.trim()}
              className="px-6"
              aria-label="Add friend"
            >
              Add
            </Button>
          </div>
          {error && <p className="text-sm text-orange-600 px-4">{error}</p>}
        </form>

        <div className="space-y-3">
          {friends.length === 0 ? (
            <EmptyState 
              icon={<Users className="w-12 h-12" />}
              title="No friends yet"
              description="Add your first friend above to start splitting expenses."
            />
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors space-y-2">
              {friends.map(friend => (
                <PersonRow 
                  key={friend.id} 
                  name={friend.name}
                  rightElement={
                    <button 
                      onClick={() => handleCopyInvite(friend)}
                      className={`transition-colors p-2 flex items-center space-x-1 ${copiedId === friend.id || copiedId === ('fallback-' + friend.id) ? 'text-green-600' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`} 
                      aria-label="Copy invite link"
                    >
                      {copiedId === friend.id ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span className="text-xs font-medium">Copied</span>
                        </>
                      ) : copiedId === `fallback-${friend.id}` ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span className="text-xs font-medium">Invite ready</span>
                        </>
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </div>
      </ScreenContent>
    </Screen>
  );
}
