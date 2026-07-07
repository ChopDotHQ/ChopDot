import { useAppState } from "../state/AppStateContext";
import { Expense } from '../types';
import { Screen, ScreenHeader, ScreenContent, BottomAction, Button, MoneyAmount, PersonRow } from './primitives';





export function SavedRecordView({
  recordId,
  onBack
}: {
  recordId: string;
  onBack: () => void;
}) {
  const { state } = useAppState();
  const record = state.savedRecords[recordId];
  const group = record ? state.groups[record.groupId] : null;

  if (!record || !group) return null;

  const members = group.memberIds.map(id => state.users[id]).filter(Boolean);

  return (
    <Screen>
      <ScreenHeader title="Group Summary" onBack={onBack} />
      <ScreenContent className="px-6 py-6 pb-32 space-y-6">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 text-center transition-colors">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{group.name}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Saved group summary</p>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total spend</p>
          <div className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            <MoneyAmount amount={record.totalAmount} currency={state.currency} />
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Still open</p>
            <div className="text-xl font-bold text-orange-600">
              <MoneyAmount amount={record.openAmount} currency={state.currency} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 transition-colors">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center border-b border-gray-50 dark:border-gray-800 pb-2 transition-colors">
            Member Statuses
          </h3>
          <div className="space-y-3">
            {members.map(member => {
              let bal = 0;
              
              // What member owes others (not confirmed)
              record.splits.filter(s => s.userId === member.id && s.status !== 'confirmed').forEach(s => {
                const expense = state.expenses[s.expenseId];
                if (expense && expense.paidByUserId !== member.id) {
                  bal -= s.amount;
                }
              });

              // What others owe member (not confirmed)
              const memberExpenses = (Object.values(state.expenses) as Expense[]).filter(e => e.groupId === group.id && e.paidByUserId === member.id);
              memberExpenses.forEach(e => {
                const owedToMemberSplits = record.splits.filter(s => s.expenseId === e.id && s.userId !== member.id && s.status !== 'confirmed');
                bal += owedToMemberSplits.reduce((sum, s) => sum + s.amount, 0);
              });

              const isSettled = Math.abs(bal) < 0.005;

              return (
                <PersonRow 
                  key={member.id}
                  name={member.name}
                  rightElement={
                    <div className={`text-sm font-semibold ${isSettled ? 'text-gray-400 dark:text-gray-500' : bal > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                      {isSettled ? 'Settled' : bal > 0 ? (
                        <>Gets <MoneyAmount amount={bal} currency={state.currency} /></>
                      ) : (
                        <>Owes <MoneyAmount amount={Math.abs(bal)} currency={state.currency} /></>
                      )}
                    </div>
                  }
                />
              );
            })}
          </div>
        </div>
      </ScreenContent>
      
      <BottomAction>
        <Button onClick={onBack} fullWidth>
          Done
        </Button>
      </BottomAction>
    </Screen>
  );
}
