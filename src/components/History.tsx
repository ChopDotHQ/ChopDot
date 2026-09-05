import { Clock } from 'lucide-react';
import { useAppState } from '../state/AppStateContext';
import { SavedRecord } from '../types';
import { Screen, ScreenHeader, ScreenContent, EmptyState, MoneyAmount } from './primitives';

export function History({ onBack, onOpenRecord }: { onBack: () => void, onOpenRecord: (id: string) => void }) {
  const { state } = useAppState();
  
  const records = (Object.values(state.savedRecords) as SavedRecord[]).sort(
    (a, b) => new Date(b.dateSaved).getTime() - new Date(a.dateSaved).getTime()
  );

  return (
    <Screen>
      <ScreenHeader title="History" onBack={onBack} />
      
      <ScreenContent className="p-6 space-y-4">
        {records.length === 0 ? (
          <EmptyState 
            icon={<Clock className="w-12 h-12" />}
            title="No past groups yet"
            description="When you finish a group, its summary will be saved here."
          />
        ) : (
          <div className="space-y-3">
            {records.map(record => {
              const group = state.groups[record.groupId];
              const date = new Date(record.dateSaved).toLocaleDateString();
              return (
                <button
                  key={record.id}
                  onClick={() => onOpenRecord(record.id)}
                  className="w-full bg-white dark:bg-gray-900 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 text-left hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900 dark:text-white text-lg truncate pr-2">
                      {group?.name || 'Unknown Group'}
                    </span>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">
                      {date}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      Total: <MoneyAmount amount={record.totalAmount} currency={state.currency} />
                    </span>
                    {record.openAmount > 0 ? (
                      <span className="text-orange-600 font-medium">
                        Open: <MoneyAmount amount={record.openAmount} currency={state.currency} />
                      </span>
                    ) : (
                      <span className="text-green-600 font-medium">Fully settled</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScreenContent>
    </Screen>
  );
}
