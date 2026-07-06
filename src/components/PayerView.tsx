import { Check, Info } from 'lucide-react';
import { useAppState } from '../state/AppStateContext';
import { getInitials } from '../utils';
import { Split } from '../types';
import { Screen, ScreenHeader, ScreenContent, BottomAction, Button, MoneyAmount } from './primitives';

export function PayerView({ 
  groupId, 
  memberId, 
  onBack, 
  onPaid 
}: { 
  groupId: string; 
  memberId: string; 
  onBack: () => void; 
  onPaid: () => void;
}) {
  const { state, dispatch } = useAppState();
  
  const group = state.groups[groupId];
  const member = state.users[memberId];

  // Assuming all reqSplits are for the same requester in this simplified flow
  const reqSplits = (Object.values(state.splits) as Split[]).filter(
    s => s.userId === memberId && s.status === 'request_sent' && state.expenses[s.expenseId]?.groupId === groupId
  );
  
  const amountOwed = reqSplits.reduce((sum, s) => sum + s.amount, 0);
  
  // Find requester from the first expense
  const firstExpense = reqSplits.length > 0 ? state.expenses[reqSplits[0].expenseId] : null;
  const requester = firstExpense ? state.users[firstExpense.paidByUserId] : null;

  if (!group || !member || !requester) return null;

  const handlePaid = () => {
    reqSplits.forEach(s => {
      dispatch({ type: 'MARK_PAID', payload: { splitId: s.id, userId: memberId } });
    });
    onPaid();
  };

  const paymentMethodLabels: Record<string, string> = {
    cash: 'Cash',
    bank_transfer: 'Bank Transfer',
    link: 'Payment Link'
  };

  const methodLabel = state.preferredPaymentMethod ? paymentMethodLabels[state.preferredPaymentMethod] : 'Cash';

  return (
    <Screen>
      <ScreenHeader title="Payer View" onBack={onBack} />
      
      <ScreenContent className="p-6 flex flex-col items-center justify-center space-y-2 pb-24">
        <div className="w-24 h-24 rounded-full bg-orange-50 dark:bg-orange-900/30 border-4 border-white dark:border-[#0a0a0a] flex items-center justify-center text-orange-700 dark:text-orange-400 font-bold text-3xl mb-4 shadow-sm transition-colors">
          {getInitials(member.name)}
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{member.name}</h2>
        <p className="text-gray-500 dark:text-gray-400 font-medium text-center">
          You owe {requester.name} for {group.name}
        </p>
        
        <div className="text-6xl my-8 py-8">
          <MoneyAmount amount={amountOwed} currency={state.currency} />
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-4 shadow-sm border border-orange-100 dark:border-orange-900/30 transition-colors w-full flex items-start space-x-3 mt-4">
           <Info className="w-5 h-5 text-orange-600 dark:text-orange-500 shrink-0 mt-0.5" />
           <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
             {requester.name} prefers to be paid via {methodLabel}. This app is a local prototype, so please pay them externally before confirming.
           </p>
        </div>
      </ScreenContent>

      <BottomAction>
        <Button variant="primary" fullWidth onClick={handlePaid} className="h-14 text-lg shadow-sm">
          <Check className="w-5 h-5 mr-2" />
          I paid {requester.name}
        </Button>
      </BottomAction>
    </Screen>
  );
}
