import { useState } from 'react';
import { Palette, Trash2, Info } from 'lucide-react';
import { useAppState } from '../state/AppStateContext';
import { Screen, ScreenHeader, ScreenContent, Button } from './primitives';

export function Settings({ onBack, onGoToStyleGuide, onGoToStateProof }: { onBack: () => void, onGoToStyleGuide: () => void, onGoToStateProof: () => void }) {
  const isDev = new URLSearchParams(window.location.search).get("dev") === "1";
  const { state, dispatch } = useAppState();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const currencies = [
    { code: 'CHF', symbol: 'CHF', label: 'CHF' },
    { code: 'USD', symbol: '$', label: 'USD ($)' },
    { code: 'EUR', symbol: '€', label: 'EUR (€)' },
    { code: 'GBP', symbol: '£', label: 'GBP (£)' },
    { code: 'PAS', symbol: 'PAS', label: 'PAS' },
  ];

  const handleClearData = () => {
    if (showClearConfirm) {
      dispatch({ type: 'RESET_TO_CLEAN' });
      setShowClearConfirm(false);
      onBack();
    } else {
      setShowClearConfirm(true);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Settings" onBack={onBack} />
      
      <ScreenContent className="p-6 space-y-8">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">Appearance</h2>
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900 dark:text-white">Dark mode</span>
              <button 
                onClick={() => dispatch({ type: 'SET_THEME', payload: { theme: state.theme === 'dark' ? 'light' : 'dark' } })}
                className={`w-12 h-6 rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 dark:focus:ring-gray-100 ${state.theme === 'dark' ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                aria-label="Toggle dark mode"
                role="switch"
                aria-checked={state.theme === 'dark'}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${state.theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">Preferences</h2>
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900 dark:text-white">Currency</span>
              <select 
                value={state.currency}
                onChange={(e) => dispatch({ type: 'SET_CURRENCY', payload: { currency: e.target.value } })}
                className="bg-transparent font-medium text-gray-500 dark:text-gray-400 text-right outline-none cursor-pointer focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 rounded-md"
                aria-label="Select currency"
              >
                {currencies.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">Privacy & Data</h2>
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            {showClearConfirm ? (
              <div className="space-y-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white">This will delete all local groups, friends, and history. Are you sure?</p>
                <div className="flex space-x-3">
                  <Button variant="secondary" onClick={() => setShowClearConfirm(false)} className="flex-1">Cancel</Button>
                  <Button variant="danger" onClick={handleClearData} className="flex-1">Delete All Data</Button>
                </div>
              </div>
            ) : (
              <button 
                onClick={handleClearData}
                className="w-full flex items-center justify-between py-2 text-left hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center text-orange-600 dark:text-orange-500">
                  <Trash2 className="w-5 h-5 mr-3" />
                  <span className="font-medium">Clear app data</span>
                </div>
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">About</h2>
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
              <Info className="w-6 h-6 text-gray-400 dark:text-gray-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-lg">ChopDot</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Version 1.0.0 (Local)</p>
            </div>
          </div>
        </div>

        {isDev && (
        <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">Developer</h2>
          <button 
            onClick={onGoToStyleGuide}
            className="w-full bg-white dark:bg-gray-900 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors flex items-center justify-between hover:border-gray-300 dark:hover:border-gray-600"
          >
            <div className="flex items-center">
              <Palette className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-3" />
              <span className="font-medium text-gray-900 dark:text-white">Design Style Guide</span>
            </div>
          </button>
          
          <button 
            onClick={onGoToStateProof}
            className="w-full bg-white dark:bg-gray-900 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors flex items-center justify-between hover:border-gray-300 dark:hover:border-gray-600 mt-2"
          >
            <div className="flex items-center text-gray-900 dark:text-white">
              <span className="font-medium">State Proof</span>
            </div>
          </button>
        </div>
        )}
      </ScreenContent>
    </Screen>
  );
}
