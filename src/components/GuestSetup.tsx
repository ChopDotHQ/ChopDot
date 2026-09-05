import { useState, FormEvent } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAppState } from '../state/AppStateContext';
import { getTelegramUserDisplayName } from '../environment';

export function GuestSetup({ onBack, onComplete }: { onBack: () => void, onComplete: () => void }) {
  const suggestedName = getTelegramUserDisplayName();
  const [name, setName] = useState(suggestedName ?? '');
  const { dispatch, hostParticipant } = useAppState();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const userId = hostParticipant?.userId ?? `u-${Date.now()}`;
    dispatch({
      type: 'ADD_USER',
      payload: {
        user: {
          id: userId,
          name: name.trim(),
          accountPublicKeyHex: hostParticipant?.publicKeyHex,
        },
      },
    });
    dispatch({ type: 'SET_CURRENT_USER', payload: { userId } });
    onComplete();
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      <header className="px-6 pt-12 pb-4 flex items-center bg-white dark:bg-[#0a0a0a] border-b border-gray-100 dark:border-[#1a1a1a] shadow-sm z-10 transition-colors shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Back">
          <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-gray-100" />
        </button>
      </header>
      <div className="flex-1 px-6 pt-4 flex flex-col">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">What should we call you?</h2>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <input 
            type="text"
            placeholder="Display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-2xl border-b-2 border-gray-200 py-3 focus:outline-none focus:border-gray-900 transition-colors placeholder:text-gray-300 font-medium bg-transparent"
            autoFocus
          />
          {suggestedName && (
            <p className="mt-3 text-sm font-medium text-gray-500">
              Suggested from your account. You can edit it.
            </p>
          )}
          <div className="flex-1" />
          <div className="pb-8 pt-4">
            <button 
              type="submit"
              disabled={!name.trim()}
              className="w-full py-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm"
            >
              {name.trim() ? `Continue as ${name.trim()}` : 'Start'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
