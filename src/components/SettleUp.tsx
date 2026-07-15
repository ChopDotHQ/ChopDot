import { ArrowLeft, Send, Check } from 'lucide-react';
import { useState } from 'react';
import { useAppState } from '../state/AppStateContext';
import { getCurrencySymbol } from '../utils';
import { getMemberBalance, getOpenSplits } from '../state/store';
import { getInitials } from '../utils';
import { shareOrCopyText } from '../environment';
import { buildPayerRequestUrl } from '../requestLinks';
import {connectPasWallet} from '../payments/pasWallet';

type LinkDeliveryStatus = 'shared' | 'copied' | 'ready';

const paymentMethodLabels: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  link: 'Payment Link',
};

export function SettleUp({
  groupId,
  onBack,
  onOpenPayerView,
  onFinishGroup,
}: {
  groupId: string;
  onBack: () => void;
  onOpenPayerView: (memberId: string) => void;
  onFinishGroup: () => void;
}) {
  const { state, dispatch } = useAppState();
  const [linkDelivery, setLinkDelivery] = useState<Record<string, LinkDeliveryStatus>>({});
  const [walletError, setWalletError] = useState('');
  const group = state.groups[groupId];
  const groupExpenses = Object.values(state.expenses).filter(expense => expense.groupId === groupId);
  const currency = groupExpenses[0]?.currency ?? state.currency;
  const sym = getCurrencySymbol(currency);

  if (!group) return null;

  // 1. Compute net balances
  const balances = group.memberIds.map(id => ({
    id,
    balance: getMemberBalance(state, groupId, id)
  }));

  // 2. Generate moves
  const debtors = balances.filter(b => b.balance < -0.005).sort((a, b) => a.balance - b.balance);
  const creditors = balances.filter(b => b.balance > 0.005).sort((a, b) => b.balance - a.balance);

  const moves: { from: string, to: string, amount: number }[] = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];
    const amount = Math.min(-debtor.balance, creditor.balance);

    if (amount > 0.005) {
      moves.push({ from: debtor.id, to: creditor.id, amount });
    }

    debtor.balance += amount;
    creditor.balance -= amount;

    if (Math.abs(debtor.balance) < 0.005) d++;
    if (Math.abs(creditor.balance) < 0.005) c++;
  }

  const handleRequest = async (memberId: string, amount: number, receiverName: string, payerName: string) => {
    const requestId = `req-${crypto.randomUUID()}`;
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const requestedSplits = getOpenSplits(state, groupId).filter(
      split => split.userId === memberId && ['open', 'request_sent'].includes(split.status),
    );
    requestedSplits.forEach(split => {
      dispatch({ type: 'SEND_REQUEST', payload: { splitId: split.id, requestId, expiresAt } });
    });

    const payerUrl = buildPayerRequestUrl(groupId, memberId, {
      requestId,
      groupName: group.name,
      requesterName: receiverName,
      payerName,
      amount,
      currency,
      paymentMethodLabel: currency === 'PAS'
        ? 'PAS wallet'
        : state.preferredPaymentMethod ? paymentMethodLabels[state.preferredPaymentMethod] : 'Cash',
      recipientWalletAddress: state.users[state.currentUserId!]?.walletAddress,
      createdAt: createdAt.toISOString(),
      expiresAt,
    });
    const result = await shareOrCopyText({
      title: 'ChopDot payment request',
      text: `${receiverName} requested ${sym}${amount.toFixed(2)} for ${group.name}.`,
      url: payerUrl,
    });

    setLinkDelivery(previous => ({
      ...previous,
      [memberId]: result,
    }));
  };

  const handleConnectWallet = async () => {
    if (!state.currentUserId) return;
    setWalletError('');
    try {
      const walletAddress = await connectPasWallet();
      dispatch({type: 'SET_WALLET_ADDRESS', payload: {userId: state.currentUserId, walletAddress}});
    } catch (reason) {
      setWalletError(reason instanceof Error ? reason.message : 'The wallet could not connect.');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 transition-colors h-full overflow-hidden">
      <header className="px-6 pt-12 pb-4 flex items-center bg-white dark:bg-[#0a0a0a] border-b border-gray-100 dark:border-[#1a1a1a] shadow-sm z-10 transition-colors shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Back">
          <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-gray-100" />
        </button>
        <h1 className="flex-1 text-center font-semibold text-gray-900 dark:text-white pr-7">Settle up</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Who pays who</h2>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2">
            The simplest way to clear this group.
          </p>
        </div>

        <div className="space-y-4">
          {currency === 'PAS' && state.currentUserId && !state.users[state.currentUserId]?.walletAddress && moves.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => void handleConnectWallet()}
                className="w-full py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-sm font-semibold"
              >
                Connect wallet
              </button>
              {walletError && <p role="alert" className="text-sm text-red-600 dark:text-red-400 mt-3">{walletError}</p>}
            </div>
          )}
          {moves.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 font-medium">
              Everyone is settled up!
            </div>
          ) : (
            moves.map((move, idx) => {
              const fromUser = state.users[move.from];
              const toUser = state.users[move.to];
              
              const debtorSplits = getOpenSplits(state, groupId).filter(s => s.userId === move.from);
              const hasMarkedPaid = debtorSplits.some(s => s.status === 'marked_paid');
              const hasRequestSent = debtorSplits.some(s => s.status === 'request_sent');
              const hasUnrequested = debtorSplits.some(s => s.status === 'open');
              const deliveryStatus = linkDelivery[move.from];
              
              let statusText = '';
              if (hasMarkedPaid) statusText = 'Needs confirm';
              else if (hasRequestSent && hasUnrequested) statusText = 'Request needs update';
              else if (hasRequestSent && deliveryStatus === 'shared') statusText = 'Link shared';
              else if (hasRequestSent && deliveryStatus === 'copied') statusText = 'Link copied';
              else if (hasRequestSent && deliveryStatus === 'ready') statusText = 'Link ready';
              else if (hasRequestSent) statusText = 'Request sent';
              
              const isCurrentUserReceiver = move.to === state.currentUserId;

              return (
                <div key={idx} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-sm shrink-0">
                        {getInitials(fromUser?.name || '')}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">
                          {fromUser?.name}
                        </span>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Pays</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-gray-900 dark:text-white text-lg">
                        {sym}{move.amount.toFixed(2)}
                      </span>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">To {toUser?.name}</span>
                    </div>
                  </div>

                  {statusText && (
                    <div className="mb-3 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg inline-block">
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                        {statusText}
                      </span>
                    </div>
                  )}

                  <div className="flex space-x-2 border-t border-gray-50 dark:border-gray-800 pt-3">
                    {isCurrentUserReceiver && !hasMarkedPaid && (!hasRequestSent || hasUnrequested) && (currency !== 'PAS' || Boolean(toUser?.walletAddress)) && (
                      <button 
                        onClick={() => void handleRequest(move.from, move.amount, toUser?.name ?? 'ChopDot', fromUser?.name ?? 'Friend')}
                        aria-label={`${hasRequestSent ? 'Send updated link' : 'Send link'} to ${fromUser?.name}`}
                        className="flex-1 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {hasRequestSent ? 'Send updated link' : 'Send link'}
                      </button>
                    )}
                    {isCurrentUserReceiver && hasRequestSent && !hasMarkedPaid && !hasUnrequested && (
                      <button
                        onClick={() => onOpenPayerView(move.from)}
                        aria-label={`View request for ${fromUser?.name}`}
                        className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
                      >
                        View request
                      </button>
                    )}
                    {isCurrentUserReceiver && hasMarkedPaid && (
                      <button 
                        onClick={() => {
                          // Dispatch confirm for all marked_paid splits
                          debtorSplits.filter(s => s.status === 'marked_paid').forEach(s => {
                            dispatch({ type: 'CONFIRM_RECEIVED', payload: { splitId: s.id, currentUserId: state.currentUserId! } });
                          });
                        }}
                        aria-label={`Confirm received from ${fromUser?.name}`}
                        className="flex-1 py-2 bg-green-600 dark:bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-700 dark:hover:bg-green-400 transition-colors flex items-center justify-center"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Confirm received
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      {moves.length === 0 && (
        <div className="p-6 bg-white dark:bg-[#0a0a0a] border-t border-gray-100 dark:border-[#1a1a1a] shrink-0">
          <button
            type="button"
            onClick={onFinishGroup}
            className="w-full py-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full font-semibold shadow-sm"
          >
            Finish group
          </button>
        </div>
      )}
    </div>
  );
}
