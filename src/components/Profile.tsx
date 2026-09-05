import { useAppState } from '../state/AppStateContext';
import { getInitials } from '../utils';
import { Screen, ScreenHeader, ScreenContent, BottomAction, Button } from './primitives';

export function Profile({ onBack }: { onBack: () => void }) {
  const { state, dispatch } = useAppState();
  const user = state.currentUserId ? state.users[state.currentUserId] : null;

  if (!user) return null;

  return (
    <Screen>
      <ScreenHeader title="Profile" onBack={onBack} />
      
      <ScreenContent className="p-6 space-y-6 pb-24">
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-blue-50 dark:bg-blue-900/30 border-4 border-white dark:border-gray-900 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-4xl shadow-sm transition-colors mb-4">
            {getInitials(user.name)}
          </div>
          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full text-xs font-semibold mb-6">
            Local profile
          </span>
        </div>
        
        <div className="w-full space-y-2">
          <label className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">Display Name</label>
          <input 
            type="text" 
            value={user.name}
            onChange={(e) => dispatch({ type: 'UPDATE_USER_NAME', payload: { name: e.target.value } })}
            className="w-full p-4 rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 outline-none transition-colors shadow-sm"
          />
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors mt-8">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Account Status</h3>
          <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
            <p>You are using a local guest account.</p>
            <p>Your data is stored only on this device.</p>
          </div>
        </div>
      </ScreenContent>
      
      <BottomAction>
         <Button variant="primary" fullWidth onClick={onBack} className="h-14 text-lg shadow-sm">
           Done
         </Button>
      </BottomAction>
    </Screen>
  );
}
