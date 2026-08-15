import { CheckCircle2, Clock, History as HistoryIcon } from 'lucide-react';
import { useAppState } from '../state/AppStateContext';
import { SavedRecord } from '../types';
import {projectHistoryRows, type HistoryRow} from '../history/historyPresentation';
import { Screen, ScreenHeader, ScreenContent, EmptyState, MoneyAmount } from './primitives';

export function History({ onBack, onOpenRecord }: { onBack: () => void, onOpenRecord: (id: string) => void }) {
  const { state } = useAppState();
  const rows = projectHistoryRows(state);
  const records = (Object.values(state.savedRecords) as SavedRecord[]).sort(
    (a, b) => new Date(b.dateSaved).getTime() - new Date(a.dateSaved).getTime(),
  );
  const hasHistory = rows.length > 0 || records.length > 0;

  return (
    <Screen>
      <ScreenHeader title="History" onBack={onBack} />
      <ScreenContent className="p-6 space-y-8 pb-24">
        {!hasHistory ? (
          <EmptyState
            icon={<Clock className="w-12 h-12" />}
            title="Nothing here yet"
            description="Requests, payments and confirmations will appear here as they happen."
          />
        ) : (
          <>
            {rows.length > 0 && (
              <section className="space-y-3">
                <div className="px-1">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Recent activity</h2>
                </div>
                <div className="rounded-3xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
                  {rows.map((item, index) => (
                    <ActivityItem key={item.id} item={item} last={index === rows.length - 1} />
                  ))}
                </div>
              </section>
            )}

            {records.length > 0 && (
              <section className="space-y-3">
                <div className="px-1">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Past groups</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Saved group summaries stay available after the activity is over.</p>
                </div>
                <div className="space-y-3">
                  {records.map(record => {
                    const group = state.groups[record.groupId];
                    return (
                      <button
                        key={record.id}
                        type="button"
                        onClick={() => onOpenRecord(record.id)}
                        className="w-full bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 text-left transition-colors hover:border-gray-300 dark:hover:border-gray-600"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <HistoryIcon className="h-4 w-4 shrink-0 text-gray-400" />
                              <span className="truncate text-lg font-semibold text-gray-900 dark:text-white">{group?.name || 'Past group'}</span>
                            </div>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{formatWhen(record.dateSaved)}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="font-semibold text-gray-900 dark:text-white"><MoneyAmount amount={record.totalAmount} currency={state.currency} /></div>
                            {record.openAmount > 0 ? (
                              <div className="mt-1 text-xs font-medium text-orange-600">Open <MoneyAmount amount={record.openAmount} currency={state.currency} /></div>
                            ) : (
                              <div className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-green-600"><CheckCircle2 className="h-3.5 w-3.5" /> Settled</div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </ScreenContent>
    </Screen>
  );
}

function ActivityItem({item, last}: {item: HistoryRow; last: boolean}) {
  return (
    <div className={`flex gap-3 px-5 py-4 ${last ? '' : 'border-b border-gray-100 dark:border-gray-800'}`}>
      <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${toneClass(item.tone)}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold leading-5 text-gray-900 dark:text-white">{item.title}</p>
          <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">{formatWhen(item.timestamp)}</span>
        </div>
        {(item.subtitle || item.amount !== undefined) && (
          <div className="mt-1 flex items-start justify-between gap-3 text-sm text-gray-500 dark:text-gray-400">
            <span className="min-w-0">{item.subtitle}</span>
            {item.amount !== undefined && item.currency && (
              <span className="shrink-0 font-medium text-gray-700 dark:text-gray-300"><MoneyAmount amount={item.amount} currency={item.currency} /></span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function toneClass(tone: HistoryRow['tone']): string {
  if (tone === 'positive') return 'bg-green-500';
  if (tone === 'warning') return 'bg-orange-500';
  return 'bg-gray-400';
}

function formatWhen(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Earlier';
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  }
  return date.toLocaleDateString([], {month: 'short', day: 'numeric'});
}
