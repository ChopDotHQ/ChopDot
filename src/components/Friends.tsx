import {useMemo, useState, FormEvent, KeyboardEvent} from 'react';
import {ChevronRight, Users} from 'lucide-react';
import {useAppState} from '../state/AppStateContext';
import {User} from '../types';
import {getSharedGroups, getUserPaymentMethods, receiveMethodLabel} from '../people/people';
import {Screen, ScreenHeader, ScreenContent, EmptyState, Button} from './primitives';
import {FriendDetail} from './FriendDetail';
import {getInitials} from '../utils';

export function Friends({onBack}: {onBack: () => void}) {
  const {state, dispatch} = useAppState();
  const [newFriendName, setNewFriendName] = useState('');
  const [error, setError] = useState('');
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);

  const friends = useMemo(
    () => (Object.values(state.users) as User[])
      .filter(user => user.id !== state.currentUserId)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [state.users, state.currentUserId],
  );

  if (selectedFriendId) {
    return <FriendDetail friendId={selectedFriendId} onBack={() => setSelectedFriendId(null)} />;
  }

  const handleAddFriend = (event?: FormEvent | KeyboardEvent) => {
    if (event) event.preventDefault();
    const nameToAdd = newFriendName.trim();
    if (!nameToAdd) return;

    if (friends.some(friend => normalizeName(friend.name) === normalizeName(nameToAdd))) {
      setError(`${nameToAdd} is already in your people list.`);
      return;
    }

    setError('');
    dispatch({
      type: 'ADD_USER',
      payload: {user: {id: `u-${crypto.randomUUID()}`, name: nameToAdd}},
    });
    setNewFriendName('');
  };

  return (
    <Screen>
      <ScreenHeader title="People" onBack={onBack} />

      <ScreenContent className="p-6 space-y-6">
        <form onSubmit={handleAddFriend} className="flex flex-col space-y-2">
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Add someone by name"
              value={newFriendName}
              onChange={event => {
                setNewFriendName(event.target.value);
                if (error) setError('');
              }}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleAddFriend(event);
                }
              }}
              className="flex-1 min-w-0 p-3 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 transition-colors shadow-sm"
              aria-label="Person name"
            />
            <Button
              type="submit"
              disabled={!newFriendName.trim()}
              className="px-6"
              aria-label="Add person"
            >
              Add
            </Button>
          </div>
          {error && <p role="alert" className="text-sm text-orange-600 px-4">{error}</p>}
        </form>

        {friends.length === 0 ? (
          <EmptyState
            icon={<Users className="w-12 h-12" />}
            title="No people yet"
            description="Add someone once, then reuse them across groups and payment requests."
          />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm divide-y divide-gray-100 dark:divide-gray-800">
            {friends.map(friend => {
              const sharedGroups = state.currentUserId ? getSharedGroups(state, state.currentUserId, friend.id) : [];
              const methods = getUserPaymentMethods(state, friend.id);
              const preferred = friend.preferredPaymentMethodId
                ? state.paymentMethods[friend.preferredPaymentMethodId]
                : undefined;
              const subtitleParts: string[] = [];
              if (sharedGroups.length > 0) subtitleParts.push(`${sharedGroups.length} shared ${sharedGroups.length === 1 ? 'group' : 'groups'}`);
              if (preferred) subtitleParts.push(receiveMethodLabel(preferred.type));
              else if (methods.length > 0) subtitleParts.push(`${methods.length} receive ${methods.length === 1 ? 'method' : 'methods'}`);
              if (friend.walletAddress || friend.accountPublicKeyHex) subtitleParts.push('Polkadot reference');

              return (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => setSelectedFriendId(friend.id)}
                  className="w-full flex items-center gap-3 p-4 text-left active:bg-gray-50 dark:active:bg-gray-800"
                  data-testid={`person-row-${friend.id}`}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-300 shrink-0">
                    {getInitials(friend.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{friend.name}</p>
                    <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                      {subtitleParts.length > 0 ? subtitleParts.join(' · ') : 'No details saved yet'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </ScreenContent>
    </Screen>
  );
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').toLocaleLowerCase();
}
