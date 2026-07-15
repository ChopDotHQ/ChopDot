import { useState, useMemo } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { getCurrencySymbol, getInitials } from '../utils';
import { useAppState } from '../state/AppStateContext';
import { Expense, Split } from '../types';
import {CaptureSource} from '../capture/receiptDraft';
import {ScreenHeader} from './primitives';

type SplitMethod = 'equal' | 'exact' | 'percent' | 'shares' | 'exclude';

export function ReviewSplit({ 
  groupId, 
  amount, 
  title, 
  source,
  onBack, 
  onSave 
}: { 
  groupId: string; 
  amount: number; 
  title: string; 
  source: CaptureSource;
  onBack: () => void; 
  onSave: () => void;
}) {
  const { state, dispatch } = useAppState();
  const sym = getCurrencySymbol(state.currency);
  const group = state.groups[groupId];
  const currentUser = state.users[state.currentUserId!];

  const [method, setMethod] = useState<SplitMethod>('equal');
  const [showMethodMenu, setShowMethodMenu] = useState(false);

  // Split state
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [shares, setShares] = useState<Record<string, string>>(
    Object.fromEntries(group?.memberIds.map(id => [id, '1']) || [])
  );
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  if (!group || !currentUser) return null;

  // Calculate split amounts
  const computedSplits = useMemo(() => {
    const splits: Record<string, number> = {};
    const members = group.memberIds;

    if (method === 'equal') {
      const splitAmount = amount / members.length;
      members.forEach(m => splits[m] = splitAmount);
    } else if (method === 'exclude') {
      const included = members.filter(m => !excluded.has(m));
      const splitAmount = included.length > 0 ? amount / included.length : 0;
      members.forEach(m => {
        splits[m] = excluded.has(m) ? 0 : splitAmount;
      });
    } else if (method === 'exact') {
      members.forEach(m => {
        splits[m] = parseFloat(exactAmounts[m]) || 0;
      });
    } else if (method === 'percent') {
      members.forEach(m => {
        const p = parseFloat(percentages[m]) || 0;
        splits[m] = (p / 100) * amount;
      });
    } else if (method === 'shares') {
      const totalShares = members.reduce((sum, m) => sum + (parseFloat(shares[m]) || 0), 0);
      members.forEach(m => {
        const s = parseFloat(shares[m]) || 0;
        splits[m] = totalShares > 0 ? (s / totalShares) * amount : 0;
      });
    }

    return splits;
  }, [method, group.memberIds, amount, excluded, exactAmounts, percentages, shares]);

  // Validation
  let isValid = true;
  let validationMessage = '';

  if (method === 'exact') {
    const total = (Object.values(computedSplits) as number[]).reduce((sum: number, v: number) => sum + v, 0);
    // Use a small epsilon for floating point comparison, but exact needs to match strictly usually, 
    // we can round to 2 decimals
    const roundedTotal = Math.round(total * 100) / 100;
    const roundedAmount = Math.round(amount * 100) / 100;
    
    if (roundedTotal !== roundedAmount) {
      isValid = false;
      const diff = roundedAmount - roundedTotal;
      validationMessage = diff > 0 
        ? `Total is ${sym}${diff.toFixed(2)} short` 
        : `Total is ${sym}${Math.abs(diff).toFixed(2)} over`;
    }
  } else if (method === 'percent') {
    const totalP = group.memberIds.reduce((sum, m) => sum + (parseFloat(percentages[m]) || 0), 0);
    if (Math.round(totalP * 100) / 100 !== 100) {
      isValid = false;
      validationMessage = `Total must be 100% (currently ${totalP}%)`;
    }
  } else if (method === 'exclude') {
    if (excluded.size === group.memberIds.length) {
      isValid = false;
      validationMessage = 'Cannot exclude everyone';
    }
  } else if (method === 'shares') {
    const totalShares = group.memberIds.reduce((sum, m) => sum + (parseFloat(shares[m]) || 0), 0);
    if (totalShares <= 0) {
      isValid = false;
      validationMessage = 'Total shares must be greater than 0';
    }
  }

  const handleSave = () => {
    if (!isValid) return;

    const expenseId = `e-${Date.now()}rnd${Math.random().toString(36).substring(7)}`;
    const expense: Expense = {
      id: expenseId,
      groupId,
      description: title,
      amount,
      currency: state.currency,
      paidByUserId: currentUser.id,
      date: new Date().toISOString(),
    };

    const splitsToSave: Split[] = group.memberIds.map(memberId => ({
      id: `s-${Date.now()}rnd${Math.random().toString(36).substring(7)}`,
      expenseId,
      userId: memberId,
      amount: computedSplits[memberId],
      status: memberId === currentUser.id ? 'confirmed' : 'open',
    }));

    dispatch({ type: 'ADD_EXPENSE', payload: { expense, splits: splitsToSave } });
    onSave();
  };

  const methodLabels: Record<SplitMethod, string> = {
    equal: 'Equal',
    exact: 'Exact',
    percent: 'Percent',
    shares: 'Shares',
    exclude: 'Exclude'
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 transition-colors h-full overflow-hidden">
      <ScreenHeader title="Review split" onBack={onBack} />

      <div className="flex-1 overflow-y-auto p-6 space-y-6 relative">
        <div className="text-center">
          {source === 'receipt' && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">From receipt</p>
          )}
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
          <div className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white mt-2">
            {sym}{amount.toFixed(2)}
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2">
            Paid by {currentUser.name}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 transition-colors relative">
          
          {/* Header & Adjust button */}
          <div className="flex justify-between items-center mb-4 border-b border-gray-50 dark:border-gray-800 pb-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {methodLabels[method]} split
            </h3>
            
            <div className="relative">
              <button 
                onClick={() => setShowMethodMenu(!showMethodMenu)}
                className="flex items-center text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                Adjust <ChevronDown className="w-4 h-4 ml-1" />
              </button>

              {showMethodMenu && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-2 z-20">
                  {(Object.keys(methodLabels) as SplitMethod[]).map(m => (
                    <button
                      key={m}
                      onClick={() => { setMethod(m); setShowMethodMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 ${method === m ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                    >
                      {methodLabels[m]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Members list */}
          <div className="space-y-3">
            {group.memberIds.map(memberId => {
              const member = state.users[memberId];
              return (
                <div key={memberId} className="flex justify-between items-center h-10">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 mr-3 transition-colors shrink-0">
                      {getInitials(member?.name || '')}
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white truncate max-w-[120px] sm:max-w-[150px]">
                      {member?.name} {memberId === currentUser.id ? '(You)' : ''}
                    </span>
                  </div>
                  
                  {/* Controls based on method */}
                  <div className="flex items-center justify-end flex-1 ml-4">
                    {method === 'exact' && (
                      <div className="flex items-center max-w-[100px]">
                        <span className="text-gray-500 mr-1">{sym}</span>
                        <input 
                          type="number"
                          aria-label={`${member?.name} amount`}
                          value={exactAmounts[memberId] || ''}
                          onChange={e => setExactAmounts(prev => ({...prev, [memberId]: e.target.value}))}
                          placeholder="0.00"
                          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-right text-gray-900 dark:text-white focus:outline-none focus:border-gray-900 dark:focus:border-white transition-colors"
                        />
                      </div>
                    )}

                    {method === 'percent' && (
                      <div className="flex items-center max-w-[100px]">
                        <input 
                          type="number"
                          aria-label={`${member?.name} percent`}
                          value={percentages[memberId] || ''}
                          onChange={e => setPercentages(prev => ({...prev, [memberId]: e.target.value}))}
                          placeholder="0"
                          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-right text-gray-900 dark:text-white focus:outline-none focus:border-gray-900 dark:focus:border-white transition-colors mr-1"
                        />
                        <span className="text-gray-500">%</span>
                      </div>
                    )}

                    {method === 'shares' && (
                      <div className="flex items-center max-w-[80px]">
                        <input 
                          type="number"
                          aria-label={`${member?.name} shares`}
                          value={shares[memberId] || ''}
                          onChange={e => setShares(prev => ({...prev, [memberId]: e.target.value}))}
                          placeholder="1"
                          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-center text-gray-900 dark:text-white focus:outline-none focus:border-gray-900 dark:focus:border-white transition-colors"
                        />
                      </div>
                    )}

                    {method === 'exclude' && (
                      <button
                        onClick={() => {
                          const next = new Set(excluded);
                          if (next.has(memberId)) next.delete(memberId);
                          else next.add(memberId);
                          setExcluded(next);
                        }}
                        aria-label={`Include ${member?.name} in this spend`}
                        className={`w-6 h-6 rounded-md flex items-center justify-center border transition-colors ${excluded.has(memberId) ? 'border-gray-300 bg-white dark:bg-gray-900 dark:border-gray-600' : 'bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100'}`}
                      >
                        {!excluded.has(memberId) && <Check className="w-4 h-4" />}
                      </button>
                    )}

                    {method === 'equal' && (
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {sym}{computedSplits[memberId]?.toFixed(2)}
                      </span>
                    )}

                    {/* Show computed amount next to input for some methods */}
                    {(method === 'percent' || method === 'shares') && (
                      <span className="ml-3 font-semibold text-gray-500 dark:text-gray-400 text-sm w-16 text-right">
                        {sym}{computedSplits[memberId]?.toFixed(2)}
                      </span>
                    )}
                    {method === 'exclude' && (
                      <span className={`ml-3 font-semibold text-sm w-16 text-right ${excluded.has(memberId) ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                        {excluded.has(memberId) ? 'Excluded' : `${sym}${computedSplits[memberId]?.toFixed(2)}`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Validation message inline */}
        {!isValid && validationMessage && (
          <div className="text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400 text-sm font-medium p-3 rounded-xl text-center transition-colors">
            {validationMessage}
          </div>
        )}
      </div>

      <div className="p-6 bg-white dark:bg-[#0a0a0a] border-t border-gray-100 dark:border-[#1a1a1a] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] shrink-0 transition-colors">
        <button 
          onClick={handleSave}
          disabled={!isValid}
          className="w-full py-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full font-semibold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm"
        >
          <Check className="w-5 h-5 mr-2" />
          Save spend
        </button>
      </div>
    </div>
  );
}
