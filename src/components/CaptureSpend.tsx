import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAppState } from '../state/AppStateContext';
import { getCurrencySymbol } from '../utils';

export function CaptureSpend({ 
  groupId, 
  onBack, 
  onNext 
}: { 
  groupId: string; 
  onBack: () => void; 
  onNext: (amount: number, title: string) => void;
}) {
  const { state } = useAppState();
  const group = state.groups[groupId];
  const sym = getCurrencySymbol(state.currency);
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');

  if (!group) return null;

  const numAmount = parseFloat(amount);
  const isValid = !isNaN(numAmount) && numAmount > 0 && title.trim().length > 0;

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 transition-colors h-full overflow-hidden">
      <header className="px-6 pt-12 pb-4 flex items-center bg-white dark:bg-[#0a0a0a] border-b border-gray-100 dark:border-[#1a1a1a] shadow-sm z-10 transition-colors shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Back">
          <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-gray-100" />
        </button>
        <h1 className="flex-1 text-center font-semibold text-gray-900 dark:text-white pr-7">Add Spend</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 transition-colors">
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 text-center">How much was it?</label>
          <div className="flex items-center justify-center text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
            <span className="text-gray-300 dark:text-gray-600 mr-1">{sym}</span>
            <input 
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-32 bg-transparent focus:outline-none text-center placeholder:text-gray-200 dark:placeholder:text-gray-700"
              autoFocus
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">What was it for?</label>
          <input 
            type="text"
            placeholder="Dinner at Gusto"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xl border-b-2 border-gray-200 dark:border-gray-700 py-3 focus:outline-none focus:border-gray-900 dark:focus:border-gray-100 transition-colors placeholder:text-gray-300 dark:placeholder:text-gray-600 font-medium bg-transparent text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="p-6 bg-white dark:bg-[#0a0a0a] border-t border-gray-100 dark:border-[#1a1a1a] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] shrink-0 transition-colors">
        <button 
          onClick={() => onNext(numAmount, title.trim())}
          disabled={!isValid}
          className="w-full py-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm"
        >
          Review split
        </button>
      </div>
    </div>
  );
}
