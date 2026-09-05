import { useState, useMemo } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { getCurrencySymbol, getInitials } from '../utils';
import { useAppState } from '../state/AppStateContext';
import { Expense, Split } from '../types';
import {CaptureSource} from '../capture/receiptDraft';
import {moneyFromDecimal, moneyToDecimal, moneyToDisplayNumber} from '../core/money';
import {calculateReviewedExpenseAllocations, type ReviewedSplitMethod} from '../core/reviewedExpenseAllocation';
import {ScreenHeader} from './primitives';
import {modeCopy} from './productModes';

type SplitMethod = ReviewedSplitMethod;

export function ReviewSplit({ 
  groupId, 
  amount, 
  title, 
  source,
  spendCardTransactionId,
  onBack, 
  onSave 
}: { 
  groupId: string; 
  amount: string;
  title: string; 
  source: CaptureSource;
  spendCardTransactionId?: string;
  onBack: () => void; 
  onSave: () => void;
}) {
  const { state, runAuthority, runModeAuthority, authorityBusy, authorityError } = useAppState();
  const sym = getCurrencySymbol(state.currency);
  const group = state.groups[groupId];
  const currentUser = state.users[state.currentUserId!];
  const copy = modeCopy(group);

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

  const total = useMemo(() => {
    try {
      return moneyFromDecimal(amount.trim(), state.currency, state.currency === 'PAS' ? 18 : 2);
    } catch {
      return null;
    }
  }, [amount, state.currency]);
  const splitResult = useMemo(() => total
    ? calculateReviewedExpenseAllocations({
      method,
      total,
      participantIds: group.memberIds,
      exactAmounts,
      percentages,
      shares,
      excluded,
    })
    : {allocations: [], validationMessage: 'Enter an amount supported by this currency.'},
  [method, total, group.memberIds, exactAmounts, percentages, shares, excluded]);
  const computedSplits = useMemo(() => Object.fromEntries(
    splitResult.allocations.map(row => [row.participantId, moneyToDisplayNumber(row.amount)]),
  ), [splitResult.allocations]);
  const isValid = Boolean(total && !splitResult.validationMessage && splitResult.allocations.length === group.memberIds.length);
  const validationMessage = splitResult.validationMessage;

  const handleSave = async () => {
    if (!isValid || !total || authorityBusy) return;

    const expenseId = `e-${Date.now()}rnd${Math.random().toString(36).substring(7)}`;
    const expense: Expense = {
      id: expenseId,
      groupId,
      description: title,
      amount: moneyToDisplayNumber(total),
      currency: state.currency,
      paidByUserId: currentUser.id,
      date: new Date().toISOString(),
    };

    const allocationByParticipant = new Map(splitResult.allocations.map(row => [row.participantId, row.amount]));
    const splitsToSave: Split[] = group.memberIds.map(memberId => ({
      id: `s-${Date.now()}rnd${Math.random().toString(36).substring(7)}`,
      expenseId,
      userId: memberId,
      amount: moneyToDisplayNumber(allocationByParticipant.get(memberId)!),
      status: memberId === currentUser.id ? 'confirmed' : 'open',
    }));

    const saved = await runAuthority({
      type: 'ADD_EXPENSE',
      payload: {expense, splits: splitsToSave, exact: {total, allocations: splitResult.allocations}},
    });
    if (!saved) return;
    if (spendCardTransactionId) {
      const linked = await runModeAuthority({
        groupId,
        eventType: 'SPEND_TRANSACTION_LINKED',
        payload: {transactionId: spendCardTransactionId, expenseId},
      });
      if (!linked) return;
    }
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
      <ScreenHeader title={copy.reviewTitle} onBack={onBack} />

      <div className="flex-1 overflow-y-auto p-6 space-y-6 relative">
        <div className="text-center">
          {source === 'receipt' && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">From receipt</p>
          )}
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
          <div className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white mt-2">
            {sym}{total ? moneyToDecimal(total) : amount}
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
        {authorityError && (
          <div role="alert" className="rounded-xl bg-red-50 p-3 text-center text-sm font-medium text-red-700 dark:bg-red-950/30 dark:text-red-300">
            {authorityError}
          </div>
        )}
      </div>

      <div className="p-6 bg-white dark:bg-[#0a0a0a] border-t border-gray-100 dark:border-[#1a1a1a] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] shrink-0 transition-colors">
        <button 
          onClick={handleSave}
          disabled={!isValid || authorityBusy}
          className="w-full py-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full font-semibold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm"
        >
          <Check className="w-5 h-5 mr-2" />
          {authorityBusy ? 'Saving safely…' : copy.saveAction}
        </button>
      </div>
    </div>
  );
}
