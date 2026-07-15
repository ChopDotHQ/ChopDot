import { Users } from 'lucide-react';
import { useState } from 'react';
import { useAppState } from '../state/AppStateContext';
import { getGroupTotal, getMemberBalance, getOpenSplits } from '../state/store';
import { Expense, Split } from '../types';
import { Screen, ScreenHeader, ScreenContent, BottomAction, Button, MoneyAmount, EmptyState } from './primitives';




import { getInitials } from '../utils';

export function GroupDetail({ 
  groupId, 
  onBack, 
  onAddSpend, 
  onCloseGroup,
  onGoToSettleUp
}: { 
  groupId: string, 
  onBack: () => void, 
  onAddSpend: () => void, 
  onCloseGroup: () => void,
  onGoToSettleUp: () => void
}) {
  const { state, dispatch } = useAppState();
  const group = state.groups[groupId];
  const [showConfirmMenu, setShowConfirmMenu] = useState(false);
  
  if (!group) return null;

  const groupExpenses = (Object.values(state.expenses) as Expense[]).filter(e => e.groupId === groupId);
  const totalSpend = getGroupTotal(state, groupId);

  const members = group.memberIds.map(id => state.users[id]).filter(Boolean);
  
  const myMarkedSplits = (Object.values(state.splits) as Split[]).filter(
    s => s.status === 'marked_paid' && 
    state.expenses[s.expenseId]?.groupId === groupId && 
    state.expenses[s.expenseId]?.paidByUserId === state.currentUserId
  );
  
  const needsConfirm = myMarkedSplits.length > 0;
  const usersNeedingConfirm = Array.from(new Set(myMarkedSplits.map(s => s.userId))).map(id => state.users[id]);
  const confirmText = usersNeedingConfirm.length === 1 ? `Confirm received from ${usersNeedingConfirm[0]?.name}` : 'Confirm received';
  const mySentRequestSplits = (Object.values(state.splits) as Split[]).filter(
    s => s.status === 'request_sent'
    && state.expenses[s.expenseId]?.groupId === groupId
    && state.expenses[s.expenseId]?.paidByUserId === state.currentUserId
  );
  const sentRequestUserIds = Array.from(new Set(mySentRequestSplits.map(split => split.userId)));
  const sentRequestWaitText = sentRequestUserIds.length === 1
    ? `Waiting for ${state.users[sentRequestUserIds[0]]?.name ?? 'payment'}`
    : `Waiting for ${sentRequestUserIds.length} people`;
  const myNewOpenSplits = (Object.values(state.splits) as Split[]).filter(
    split => split.status === 'open'
      && state.expenses[split.expenseId]?.groupId === groupId
      && state.expenses[split.expenseId]?.paidByUserId === state.currentUserId
      && split.userId !== state.currentUserId,
  );
  const myNewOpenAmount = myNewOpenSplits.reduce((sum, split) => sum + split.amount, 0);

  const hasOpenBalances = getOpenSplits(state, groupId).length > 0;
  const currentUserBalance = state.currentUserId ? getMemberBalance(state, groupId, state.currentUserId) : 0;
  const currentUserPaymentSplits = (Object.values(state.splits) as Split[]).filter(split =>
    split.userId === state.currentUserId
    && state.expenses[split.expenseId]?.groupId === groupId
    && state.expenses[split.expenseId]?.paidByUserId !== state.currentUserId
    && split.status !== 'confirmed',
  );
  const currentUserMarkedPaid = currentUserPaymentSplits.some(split => split.status === 'marked_paid');
  const currentUserRequestSent = currentUserPaymentSplits.some(split => split.status === 'request_sent');
  const currentReceiverName = currentUserPaymentSplits.length > 0
    ? state.users[state.expenses[currentUserPaymentSplits[0].expenseId]?.paidByUserId]?.name
    : null;
  const canFinish = groupExpenses.some(expense => expense.paidByUserId === state.currentUserId);

  return (
    <Screen className="relative">
      <ScreenHeader 
        title={group.name} 
        onBack={onBack} 
        rightAction={
          <div className="flex -space-x-2">
            {members.slice(0, 3).map((m, i) => (
              <div key={m.id} className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 border-2 border-white dark:border-[#0a0a0a] flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300 z-10 transition-colors relative" style={{ zIndex: 10 - i }}>
                {getInitials(m.name)}
              </div>
            ))}
          </div>
        }
      />

      <ScreenContent className="p-6 space-y-6">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 transition-colors flex flex-col items-center justify-center min-h-[140px]">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total spend</p>
          <div className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            <MoneyAmount amount={totalSpend} currency={state.currency} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 transition-colors">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <Users className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
            Members ({members.length})
          </h3>
          <div className="space-y-2">
            {members.map(member => {
              const bal = getMemberBalance(state, group.id, member.id);
              const reqSplits = (Object.values(state.splits) as Split[]).filter(s => s.userId === member.id && s.status === 'request_sent' && state.expenses[s.expenseId]?.groupId === group.id);
              const markedSplits = (Object.values(state.splits) as Split[]).filter(s => s.userId === member.id && s.status === 'marked_paid' && state.expenses[s.expenseId]?.groupId === group.id);
              const newlyOpenSplits = (Object.values(state.splits) as Split[]).filter(s =>
                s.userId === member.id
                && s.status === 'open'
                && state.expenses[s.expenseId]?.groupId === group.id
                && state.expenses[s.expenseId]?.paidByUserId !== member.id
              );
              const newlyOpenAmount = newlyOpenSplits.reduce((sum, split) => sum + split.amount, 0);
              const memberIsCurrentUser = member.id === state.currentUserId;
              const status = markedSplits.length > 0
                ? memberIsCurrentUser
                  ? `Waiting for ${state.users[state.expenses[markedSplits[0].expenseId]?.paidByUserId]?.name ?? 'confirmation'}`
                  : 'Needs confirm'
                : reqSplits.length > 0
                  ? newlyOpenAmount > 0
                    ? memberIsCurrentUser
                      ? <>Ready to pay · <MoneyAmount amount={newlyOpenAmount} currency={state.currency} /> more</>
                      : <>Request sent · <MoneyAmount amount={newlyOpenAmount} currency={state.currency} /> more</>
                    : memberIsCurrentUser ? 'Ready to pay' : 'Request sent'
                  : null;

              return (
                <div key={member.id} className="flex flex-col p-3 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-black/5 dark:border-white/5 transition-colors">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 mr-3 shrink-0 transition-colors">
                      {getInitials(member.name)}
                    </div>
                    <div className="font-medium text-gray-900 dark:text-white text-sm flex-1 truncate">
                      {member.name} {member.id === state.currentUserId ? '(You)' : ''}
                    </div>
                    <div className={`text-sm font-semibold shrink-0 ml-2 ${status ? 'text-orange-600' : bal === 0 ? 'text-gray-400' : bal > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                      {status ?? (bal === 0 ? 'Settled' : bal > 0 ? (
                        <>Gets <MoneyAmount amount={bal} currency={state.currency} /></>
                      ) : (
                        <>Owes <MoneyAmount amount={Math.abs(bal)} currency={state.currency} /></>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {groupExpenses.length === 0 && (
          <EmptyState title="No spend yet" />
        )}
      </ScreenContent>

      <BottomAction>
        {groupExpenses.length === 0 ? (
          <Button onClick={onAddSpend} fullWidth>
            Add spend
          </Button>
        ) : needsConfirm ? (
          <Button
            variant="success"
            fullWidth
            onClick={() => {
               if (usersNeedingConfirm.length === 1) {
                 myMarkedSplits.forEach(s => {
                   dispatch({ type: 'CONFIRM_RECEIVED', payload: { splitId: s.id, currentUserId: state.currentUserId! } });
                 });
               } else {
                 setShowConfirmMenu(true);
               }
            }}
          >
            {confirmText}
          </Button>
        ) : hasOpenBalances && mySentRequestSplits.length > 0 && myNewOpenAmount > 0 ? (
          <Button onClick={onGoToSettleUp} fullWidth data-testid="group-request-more">
            Request <MoneyAmount amount={myNewOpenAmount} currency={state.currency} /> more
          </Button>
        ) : hasOpenBalances && mySentRequestSplits.length > 0 ? (
          <div className="w-full py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400" data-testid="group-request-waiting">
            {sentRequestWaitText}
          </div>
        ) : hasOpenBalances && currentUserMarkedPaid ? (
          <div className="w-full py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400">
            Waiting for {currentReceiverName ?? 'confirmation'}
          </div>
        ) : hasOpenBalances && currentUserRequestSent ? (
          <div className="w-full py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400">
            Payment requested
          </div>
        ) : hasOpenBalances && currentUserBalance > 0 ? (
          <Button onClick={onGoToSettleUp} fullWidth data-testid="group-settle-up">
            Settle up
          </Button>
        ) : hasOpenBalances ? (
          <div className="w-full py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400">
            Waiting on the group
          </div>
        ) : canFinish ? (
          <Button onClick={onCloseGroup} fullWidth>
            Finish group
          </Button>
        ) : (
          <div className="w-full py-3 text-center text-sm font-semibold text-green-600">
            Settled
          </div>
        )}
        {groupExpenses.length > 0 && (
          <Button variant="muted" onClick={onAddSpend} fullWidth data-testid="group-add-expense">
            Add expense
          </Button>
        )}
      </BottomAction>

      {showConfirmMenu && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-end justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md p-6 shadow-xl animate-in slide-in-from-bottom-10">
            <h3 className="text-xl font-bold mb-4 dark:text-white">Confirm received</h3>
            <div className="space-y-2 mb-6">
              {usersNeedingConfirm.map(u => (
                <button
                  key={u.id}
                  onClick={() => {
                    myMarkedSplits.filter(s => s.userId === u.id).forEach(s => {
                      dispatch({ type: 'CONFIRM_RECEIVED', payload: { splitId: s.id, currentUserId: state.currentUserId! } });
                    });
                    if (usersNeedingConfirm.length <= 1) {
                      setShowConfirmMenu(false);
                    }
                  }}
                  className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <span className="font-semibold dark:text-white">{u.name}</span>
                  <span className="text-green-600 font-bold text-sm">Confirm</span>
                </button>
              ))}
            </div>
            <Button 
              variant="secondary"
              fullWidth
              onClick={() => setShowConfirmMenu(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Screen>
  );
}
