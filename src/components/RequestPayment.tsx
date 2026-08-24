import { Send, CheckCircle2 } from 'lucide-react';
import { useAppState } from '../state/AppStateContext';
import { getInitials } from '../utils';
import { getCurrencySymbol } from '../utils';
import { Split } from '../types';
import { Screen, ScreenHeader, ScreenContent, BottomAction, Button, MoneyAmount } from './primitives';
import {createMemberCapability, hashMemberCapability} from '../environment/livePayerSync';

export function RequestPayment({ 
  groupId, 
  memberId, 
  onBack, 
  onSend 
}: { 
  groupId: string; 
  memberId: string; 
  onBack: () => void; 
  onSend: () => void;
}) {
  const { state, runAuthority, authorityBusy, authorityError } = useAppState();
  
  const group = state.groups[groupId];
  const member = state.users[memberId];
  const currentUser = state.users[state.currentUserId!];
  const sym = getCurrencySymbol(state.currency);

  if (!group || !member || !currentUser) return null;

  const openSplits = (Object.values(state.splits) as Split[]).filter(
    s => s.userId === memberId && s.status === 'open' && state.expenses[s.expenseId]?.groupId === groupId
  );
  
  const amountOwed = openSplits.reduce((sum, s) => sum + s.amount, 0);

  const handleSend = async () => {
    if (authorityBusy) return;
    const requestId = `req-${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.parse(createdAt) + 24 * 60 * 60 * 1000).toISOString();
    const requestEntryCapability = createMemberCapability();
    const capabilityHash = await hashMemberCapability(requestEntryCapability);
    for (const split of openSplits) {
      if (!await runAuthority({type: 'SEND_REQUEST', payload: {
        splitId: split.id, requestId, createdAt, expiresAt, capabilityHash, requestEntryCapability,
      }})) return;
    }
    onSend();
  };

  const paymentMethodLabels: Record<string, string> = {
    cash: 'Cash',
    bank_transfer: 'Bank Transfer',
    link: 'Payment Link'
  };

  const methodLabel = state.preferredPaymentMethod ? paymentMethodLabels[state.preferredPaymentMethod] : 'Cash';

  return (
    <Screen>
      <ScreenHeader title="Request Payment" onBack={onBack} />
      
      <ScreenContent className="p-6 flex flex-col items-center justify-center space-y-2 pb-24">
        <div className="w-24 h-24 rounded-full bg-blue-50 dark:bg-blue-900/30 border-4 border-white dark:border-[#0a0a0a] flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-3xl mb-4 shadow-sm transition-colors">
          {getInitials(member.name)}
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{member.name}</h2>
        <p className="text-gray-500 dark:text-gray-400 font-medium text-center">
          Owes you for {group.name}
        </p>
        
        <div className="text-6xl my-8 py-8">
          <MoneyAmount amount={amountOwed} currency={state.currency} />
        </div>
        
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors w-full flex items-center justify-between mt-4">
           <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Receive via</span>
           <span className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
             <CheckCircle2 className="w-4 h-4 mr-1 text-green-500" />
             {methodLabel}
           </span>
        </div>

        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mt-8">
          Requested by {currentUser.name}
        </p>
        {authorityError && <p role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">{authorityError}</p>}
      </ScreenContent>

      <BottomAction>
        <Button variant="primary" fullWidth onClick={() => void handleSend()} disabled={authorityBusy || openSplits.length === 0} className="h-14 text-lg shadow-sm">
          <Send className="w-5 h-5 mr-2" />
          {authorityBusy ? 'Preparing safely…' : 'Send / Copy link'}
        </Button>
      </BottomAction>
    </Screen>
  );
}
