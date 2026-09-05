import { CheckCircle } from 'lucide-react';
import { useAppState } from '../state/AppStateContext';
import { getCurrencySymbol } from '../utils';
import { Expense, Split } from '../types';
import { Screen, ScreenHeader, ScreenContent, BottomAction, Button } from './primitives';
import {modeCopy} from './productModes';



export function CloseGroup({
  groupId,
  onBack,
  onFinish
}: {
  groupId: string;
  onBack: () => void;
  onFinish: (recordId: string) => void;
}) {
  const { state, runAuthority, authorityBusy, authorityError } = useAppState();
  const group = state.groups[groupId];
  const sym = getCurrencySymbol(state.currency);

  if (!group) return null;
  const copy = modeCopy(group);

  // Calculate open amounts
  const expenses = (Object.values(state.expenses) as Expense[]).filter(e => e.groupId === groupId);
  const splits = (Object.values(state.splits) as Split[]).filter(s => expenses.some(e => e.id === s.expenseId));
  
  const openSplits = splits.filter(s => s.status !== 'confirmed');
  const openAmount = openSplits.reduce((sum, s) => sum + s.amount, 0);

  const handleFinish = async () => {
    if (group.closedRecordId) {
      onFinish(group.closedRecordId);
      return;
    }
    const recordId = `sr-${Date.now()}`;
    const saved = await runAuthority({ type: 'SAVE_RECORD', payload: { recordId, groupId, savedAt: new Date().toISOString() } });
    if (saved) onFinish(recordId);
  };

  return (
    <Screen>
      <ScreenHeader title={copy.closeAction} onBack={onBack} />

      <ScreenContent className="p-6 space-y-6">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 text-center transition-colors">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Ready to save {group.name}?</h2>
          
          {openAmount > 0 ? (
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                Wait, some members are still open!
              </p>
              <p className="text-2xl font-bold text-orange-600 mt-2">
                {sym}{openAmount.toFixed(2)} unpaid
              </p>
              <p className="text-xs text-orange-700/70 dark:text-orange-400/70 mt-2">
                Finish after every amount is resolved or explicitly corrected. Open money is never hidden in a closed record.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                Everyone is settled up!
              </p>
              <p className="text-xs text-green-700/70 dark:text-green-400/70 mt-2">
                This group is ready to be closed and saved to your history.
              </p>
            </div>
          )}
          {authorityError && <p role="alert" className="mt-4 text-sm font-medium text-red-600 dark:text-red-400">{authorityError}</p>}
        </div>
      </ScreenContent>

      <BottomAction>
        <Button onClick={() => void handleFinish()} fullWidth disabled={openAmount > 0 || authorityBusy}>
          {authorityBusy ? 'Saving safely…' : group.closedRecordId ? 'View saved summary' : 'Finish and save summary'}
        </Button>
      </BottomAction>
    </Screen>
  );
}
