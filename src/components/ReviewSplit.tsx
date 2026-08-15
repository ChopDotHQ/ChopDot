import { useMemo, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { CaptureSource } from '../capture/receiptDraft';
import { useAppState } from '../state/AppStateContext';
import { Expense, Split } from '../types';
import { getCurrencySymbol, getInitials } from '../utils';
import { amountsMatchAtPrecision, currencyDecimals, parseNonNegativeDecimal } from '../validation/moneyInput';
import { ScreenHeader } from './primitives';

type SplitMethod = 'equal' | 'exact' | 'percent' | 'shares' | 'exclude';

const PERCENT_DECIMALS = 4;
const SHARE_DECIMALS = 6;

export function ReviewSplit({
  groupId,
  amount,
  title,
  source,
  onBack,
  onSave,
}: {
  groupId: string;
  amount: number;
  title: string;
  source: CaptureSource;
  onBack: () => void;
  onSave: () => void;
}) {
  const { state, dispatch } = useAppState();
  const currency = state.currency.toUpperCase();
  const decimals = currencyDecimals(currency);
  const sym = getCurrencySymbol(currency);
  const group = state.groups[groupId];
  const currentUser = state.currentUserId ? state.users[state.currentUserId] : undefined;

  const [method, setMethod] = useState<SplitMethod>('equal');
  const [showMethodMenu, setShowMethodMenu] = useState(false);
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [shares, setShares] = useState<Record<string, string>>(
    Object.fromEntries(group?.memberIds.map(id => [id, '1']) || []),
  );
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  if (!group || !currentUser) return null;

  const exactValues = useMemo(
    () => parseMemberInputs(group.memberIds, exactAmounts, decimals),
    [group.memberIds, exactAmounts, decimals],
  );
  const percentageValues = useMemo(
    () => parseMemberInputs(group.memberIds, percentages, PERCENT_DECIMALS),
    [group.memberIds, percentages],
  );
  const shareValues = useMemo(
    () => parseMemberInputs(group.memberIds, shares, SHARE_DECIMALS),
    [group.memberIds, shares],
  );

  const computedSplits = useMemo(() => {
    const splits: Record<string, number> = {};
    const members = group.memberIds;

    if (method === 'equal') {
      const splitAmount = members.length > 0 ? amount / members.length : 0;
      members.forEach(memberId => { splits[memberId] = splitAmount; });
    } else if (method === 'exclude') {
      const included = members.filter(memberId => !excluded.has(memberId));
      const splitAmount = included.length > 0 ? amount / included.length : 0;
      members.forEach(memberId => {
        splits[memberId] = excluded.has(memberId) ? 0 : splitAmount;
      });
    } else if (method === 'exact') {
      members.forEach(memberId => {
        splits[memberId] = exactValues.values[memberId] ?? 0;
      });
    } else if (method === 'percent') {
      members.forEach(memberId => {
        const percent = percentageValues.values[memberId] ?? 0;
        splits[memberId] = (percent / 100) * amount;
      });
    } else if (method === 'shares') {
      const totalShares = sumValues(shareValues.values);
      members.forEach(memberId => {
        const share = shareValues.values[memberId] ?? 0;
        splits[memberId] = totalShares > 0 ? (share / totalShares) * amount : 0;
      });
    }

    return splits;
  }, [method, group.memberIds, amount, excluded, exactValues.values, percentageValues.values, shareValues.values]);

  let isValid = Number.isFinite(amount) && amount > 0 && group.memberIds.length > 0;
  let validationMessage = isValid ? '' : 'This spend cannot be split.';

  if (isValid && method === 'exact') {
    if (exactValues.invalidMemberIds.length > 0) {
      isValid = false;
      validationMessage = `Use non-negative ${currency} amounts with up to ${decimals} decimal${decimals === 1 ? '' : 's'}.`;
    } else {
      const total = sumValues(computedSplits);
      if (!amountsMatchAtPrecision(total, amount, decimals)) {
        isValid = false;
        const diff = amount - total;
        validationMessage = diff > 0
          ? `Total is ${formatCurrencyDifference(diff, sym, decimals)} short`
          : `Total is ${formatCurrencyDifference(Math.abs(diff), sym, decimals)} over`;
      }
    }
  } else if (isValid && method === 'percent') {
    if (percentageValues.invalidMemberIds.length > 0) {
      isValid = false;
      validationMessage = `Percentages must be non-negative numbers with up to ${PERCENT_DECIMALS} decimals.`;
    } else {
      const totalPercent = sumValues(percentageValues.values);
      const hasOutOfRangePercentage = Object.values(percentageValues.values).some(value => value > 100);
      if (hasOutOfRangePercentage) {
        isValid = false;
        validationMessage = 'No individual percentage can be greater than 100%.';
      } else if (!amountsMatchAtPrecision(totalPercent, 100, PERCENT_DECIMALS)) {
        isValid = false;
        validationMessage = `Total must be 100% (currently ${totalPercent.toFixed(Math.min(PERCENT_DECIMALS, 2))}%)`;
      }
    }
  } else if (isValid && method === 'exclude') {
    if (excluded.size === group.memberIds.length) {
      isValid = false;
      validationMessage = 'Cannot exclude everyone.';
    }
  } else if (isValid && method === 'shares') {
    if (shareValues.invalidMemberIds.length > 0) {
      isValid = false;
      validationMessage = `Shares must be non-negative numbers with up to ${SHARE_DECIMALS} decimals.`;
    } else if (sumValues(shareValues.values) <= 0) {
      isValid = false;
      validationMessage = 'Total shares must be greater than 0.';
    }
  }

  if (isValid && Object.values(computedSplits).some(value => !Number.isFinite(value) || value < 0)) {
    isValid = false;
    validationMessage = 'The split contains an invalid amount.';
  }

  const handleSave = () => {
    if (!isValid) return;

    const expenseId = createEntityId('expense');
    const expense: Expense = {
      id: expenseId,
      groupId,
      description: title.trim(),
      amount,
      currency,
      paidByUserId: currentUser.id,
      date: new Date().toISOString(),
    };

    const splitsToSave: Split[] = group.memberIds.map(memberId => ({
      id: createEntityId('split'),
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
    exclude: 'Exclude',
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
            {sym}{formatAmount(amount, decimals)}
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2">
            Paid by {currentUser.name}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 transition-colors relative">
          <div className="flex justify-between items-center mb-4 border-b border-gray-50 dark:border-gray-800 pb-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {methodLabels[method]} split
            </h3>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMethodMenu(!showMethodMenu)}
                className="flex items-center text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                Adjust <ChevronDown className="w-4 h-4 ml-1" />
              </button>

              {showMethodMenu && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-2 z-20">
                  {(Object.keys(methodLabels) as SplitMethod[]).map(splitMethod => (
                    <button
                      type="button"
                      key={splitMethod}
                      onClick={() => { setMethod(splitMethod); setShowMethodMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 ${method === splitMethod ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                    >
                      {methodLabels[splitMethod]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {group.memberIds.map(memberId => {
              const member = state.users[memberId];
              const exactInvalid = method === 'exact' && exactValues.invalidMemberIds.includes(memberId);
              const percentInvalid = method === 'percent' && percentageValues.invalidMemberIds.includes(memberId);
              const shareInvalid = method === 'shares' && shareValues.invalidMemberIds.includes(memberId);

              return (
                <div key={memberId} className="flex justify-between items-center min-h-10">
                  <div className="flex items-center min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 mr-3 transition-colors shrink-0">
                      {getInitials(member?.name || '')}
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white truncate max-w-[120px] sm:max-w-[150px]">
                      {member?.name} {memberId === currentUser.id ? '(You)' : ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-end flex-1 ml-4">
                    {method === 'exact' && (
                      <div className="flex items-center max-w-[112px]">
                        <span className="text-gray-500 mr-1">{sym}</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label={`${member?.name} amount`}
                          aria-invalid={exactInvalid}
                          value={exactAmounts[memberId] || ''}
                          onChange={event => setExactAmounts(prev => ({ ...prev, [memberId]: event.target.value }))}
                          placeholder="0"
                          className={`w-full bg-gray-50 dark:bg-gray-800 border rounded-lg px-2 py-1 text-right text-gray-900 dark:text-white focus:outline-none transition-colors ${exactInvalid ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-gray-900 dark:focus:border-white'}`}
                        />
                      </div>
                    )}

                    {method === 'percent' && (
                      <div className="flex items-center max-w-[100px]">
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label={`${member?.name} percent`}
                          aria-invalid={percentInvalid}
                          value={percentages[memberId] || ''}
                          onChange={event => setPercentages(prev => ({ ...prev, [memberId]: event.target.value }))}
                          placeholder="0"
                          className={`w-full bg-gray-50 dark:bg-gray-800 border rounded-lg px-2 py-1 text-right text-gray-900 dark:text-white focus:outline-none transition-colors mr-1 ${percentInvalid ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-gray-900 dark:focus:border-white'}`}
                        />
                        <span className="text-gray-500">%</span>
                      </div>
                    )}

                    {method === 'shares' && (
                      <div className="flex items-center max-w-[80px]">
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label={`${member?.name} shares`}
                          aria-invalid={shareInvalid}
                          value={shares[memberId] || ''}
                          onChange={event => setShares(prev => ({ ...prev, [memberId]: event.target.value }))}
                          placeholder="1"
                          className={`w-full bg-gray-50 dark:bg-gray-800 border rounded-lg px-2 py-1 text-center text-gray-900 dark:text-white focus:outline-none transition-colors ${shareInvalid ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-gray-900 dark:focus:border-white'}`}
                        />
                      </div>
                    )}

                    {method === 'exclude' && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = new Set(excluded);
                          if (next.has(memberId)) next.delete(memberId);
                          else next.add(memberId);
                          setExcluded(next);
                        }}
                        aria-label={`${excluded.has(memberId) ? 'Include' : 'Exclude'} ${member?.name} ${excluded.has(memberId) ? 'in' : 'from'} this spend`}
                        className={`w-6 h-6 rounded-md flex items-center justify-center border transition-colors ${excluded.has(memberId) ? 'border-gray-300 bg-white dark:bg-gray-900 dark:border-gray-600' : 'bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100'}`}
                      >
                        {!excluded.has(memberId) && <Check className="w-4 h-4" />}
                      </button>
                    )}

                    {method === 'equal' && (
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {sym}{formatAmount(computedSplits[memberId] ?? 0, decimals)}
                      </span>
                    )}

                    {(method === 'percent' || method === 'shares') && (
                      <span className="ml-3 font-semibold text-gray-500 dark:text-gray-400 text-sm w-20 text-right">
                        {sym}{formatAmount(computedSplits[memberId] ?? 0, decimals)}
                      </span>
                    )}
                    {method === 'exclude' && (
                      <span className={`ml-3 font-semibold text-sm w-20 text-right ${excluded.has(memberId) ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                        {excluded.has(memberId) ? 'Excluded' : `${sym}${formatAmount(computedSplits[memberId] ?? 0, decimals)}`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {!isValid && validationMessage && (
          <div role="alert" className="text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400 text-sm font-medium p-3 rounded-xl text-center transition-colors">
            {validationMessage}
          </div>
        )}
      </div>

      <div className="p-6 bg-white dark:bg-[#0a0a0a] border-t border-gray-100 dark:border-[#1a1a1a] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] shrink-0 transition-colors">
        <button
          type="button"
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

function parseMemberInputs(memberIds: string[], inputs: Record<string, string>, decimals: number) {
  const values: Record<string, number> = {};
  const invalidMemberIds: string[] = [];

  memberIds.forEach(memberId => {
    const source = inputs[memberId]?.trim() ?? '';
    if (!source) {
      values[memberId] = 0;
      return;
    }
    const parsed = parseNonNegativeDecimal(source, decimals);
    if (parsed === null) {
      invalidMemberIds.push(memberId);
      values[memberId] = 0;
      return;
    }
    values[memberId] = parsed;
  });

  return { values, invalidMemberIds };
}

function sumValues(values: Record<string, number>): number {
  return Object.values(values).reduce((sum, value) => sum + value, 0);
}

function formatAmount(value: number, decimals: number): string {
  const visibleDecimals = decimals <= 2 ? decimals : Math.min(decimals, 6);
  return value.toFixed(visibleDecimals).replace(/(\.\d*?[1-9])0+$/u, '$1').replace(/\.0+$/u, '');
}

function formatCurrencyDifference(value: number, symbol: string, decimals: number): string {
  return `${symbol}${formatAmount(value, decimals)}`;
}

function createEntityId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
