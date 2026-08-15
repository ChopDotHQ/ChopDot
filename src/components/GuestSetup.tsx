import { useState, FormEvent } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAppState } from '../state/AppStateContext';
import { getTelegramUserDisplayName } from '../environment';
import {createLocalUserId, normalizeDisplayName, validDisplayName} from '../identity/profileLifecycle';

export function GuestSetup({ onBack, onComplete }: { onBack: () => void, onComplete: () => void }) {
  const suggestedName = getTelegramUserDisplayName();
  const [name, setName] = useState(suggestedName ?? '');
  const { dispatch, hostParticipant } = useAppState();
  const normalizedName = normalizeDisplayName(name);
  const canContinue = validDisplayName(name);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canContinue) return;
    const userId = hostParticipant?.userId ?? createLocalUserId();
    dispatch({
      type: 'ADD_USER',
      payload: {
        user: {
          id: userId,
          name: normalizedName,
          // Legacy shared-session identity stays compatible here, but this is not
          // equivalent to POLKADOT-001 hostIdentity provenance.
          accountPublicKeyHex: hostParticipant?.publicKeyHex,
        },
      },
    });
    dispatch({ type: 'SET_CURRENT_USER', payload: { userId } });
    onComplete();
  };

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#0a0a0a] transition-colors">
      <header className="px-6 pt-12 pb-4 flex items-center border-b border-gray-100 dark:border-[#1a1a1a] shrink-0">
        <button type="button" onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors" aria-label="Back">
          <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-gray-100" />
        </button>
      </header>
      <div className="flex-1 px-6 pt-8 flex flex-col">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">What should we call you?</h2>
          <p className="mt-3 text-base text-gray-500 dark:text-gray-400">This is your ChopDot display name. You can change it later.</p>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col pt-8">
          <label htmlFor="profile-name" className="sr-only">Display name</label>
          <input
            id="profile-name"
            type="text"
            placeholder="Display name"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-2xl border-b-2 border-gray-200 dark:border-gray-700 py-3 focus:outline-none focus:border-gray-900 dark:focus:border-gray-100 transition-colors placeholder:text-gray-300 dark:placeholder:text-gray-600 font-medium bg-transparent text-gray-900 dark:text-white"
            autoFocus
            autoComplete="name"
          />
          {suggestedName && (
            <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">Suggested from this host. You stay in control of the display name.</p>
          )}
          <div className="mt-5 rounded-2xl bg-gray-50 dark:bg-gray-900 p-4 text-sm text-gray-500 dark:text-gray-400">
            Your profile and group data are stored on this device in this build. Connecting Polkadot later does not automatically upload or restore them elsewhere.
          </div>
          <div className="flex-1" />
          <div className="pb-8 pt-6">
            <button
              type="submit"
              disabled={!canContinue}
              className="w-full py-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm"
            >
              {canContinue ? `Continue as ${normalizedName}` : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
