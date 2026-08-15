import { CheckCircle2, Send } from 'lucide-react';
import { useState } from 'react';
import { shareOrCopyText } from '../environment';
import { buildPayerRequestUrl, type StandalonePayerRequest } from '../requestLinks';
import { useAppState } from '../state/AppStateContext';
import { Split } from '../types';
import { getInitials } from '../utils';
import { Screen, ScreenHeader, ScreenContent, BottomAction, Button, MoneyAmount } from './primitives';

const REQUEST_TTL_MS = 24 * 60 * 60 * 1000;

export function RequestPayment({
  groupId,
  memberId,
  onBack,
  onSend,
}: {
  groupId: string;
  memberId: string;
  onBack: () => void;
  onSend: () => void;
}) {
  const { state, dispatch } = useAppState();
  const [isSending, setIsSending] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  const group = state.groups[groupId];
  const member = state.users[memberId];
  const currentUser = state.currentUserId ? state.users[state.currentUserId] : undefined;

  if (!group || !member || !currentUser) return null;

  // A payment request is one exact obligation: one payer -> one receiver -> one
  // currency. Never aggregate amounts this receiver is not actually owed.
  const eligibleOpenSplits = (Object.values(state.splits) as Split[]).filter((split) => {
    const expense = state.expenses[split.expenseId];
    return split.userId === memberId
      && split.status === 'open'
      && expense?.groupId === groupId
      && expense.paidByUserId === currentUser.id;
  });

  const requestCurrency = eligibleOpenSplits.length > 0
    ? (state.expenses[eligibleOpenSplits[0].expenseId]?.currency ?? state.currency).toUpperCase()
    : state.currency.toUpperCase();

  const openSplits = eligibleOpenSplits.filter((split) => {
    const expense = state.expenses[split.expenseId];
    return (expense?.currency ?? state.currency).toUpperCase() === requestCurrency;
  });

  const amountOwed = openSplits.reduce((sum, split) => sum + split.amount, 0);

  const paymentMethodLabels: Record<string, string> = {
    cash: 'Cash',
    bank_transfer: 'Bank Transfer',
    link: 'Payment Link',
  };

  const methodLabel = state.preferredPaymentMethod
    ? paymentMethodLabels[state.preferredPaymentMethod] ?? 'Payment Link'
    : 'Cash';

  const handleSend = async () => {
    if (isSending || openSplits.length === 0 || amountOwed <= 0) return;

    setIsSending(true);
    setDeliveryError(null);

    try {
      const now = Date.now();
      const createdAt = new Date(now).toISOString();
      const expiresAt = new Date(now + REQUEST_TTL_MS).toISOString();
      const requestId = createRequestId();
      const request: StandalonePayerRequest = {
        requestId,
        groupName: group.name,
        requesterName: currentUser.name,
        payerName: member.name,
        amount: amountOwed,
        currency: requestCurrency,
        paymentMethodLabel: methodLabel,
        recipientWalletAddress: currentUser.walletAddress,
        createdAt,
        expiresAt,
      };
      const url = buildPayerRequestUrl(groupId, memberId, request);
      const delivery = await shareOrCopyText({
        title: `Pay ${currentUser.name} on ChopDot`,
        text: `${member.name}, your share for ${group.name} is ${requestCurrency} ${amountOwed.toFixed(2)}.`,
        url,
      });

      if (delivery === 'ready') {
        setDeliveryError('Could not open sharing or copy the payment link. No request was sent.');
        return;
      }

      openSplits.forEach((split) => {
        dispatch({
          type: 'SEND_REQUEST',
          payload: { splitId: split.id, requestId, expiresAt },
        });
      });
      onSend();
    } catch {
      setDeliveryError('Could not create the payment request. Nothing was changed.');
    } finally {
      setIsSending(false);
    }
  };

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
          <MoneyAmount amount={amountOwed} currency={requestCurrency} />
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors w-full flex items-center justify-between mt-4">
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Receive via</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-1 text-green-500" />
            {methodLabel}
          </span>
        </div>

        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mt-8">
          Requested by {currentUser.name} · link expires in 24 hours
        </p>

        {eligibleOpenSplits.length > openSplits.length && (
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 text-center mt-2">
            Other currencies are kept separate and must be requested individually.
          </p>
        )}

        {deliveryError && (
          <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400 text-center mt-4">
            {deliveryError}
          </p>
        )}
      </ScreenContent>

      <BottomAction>
        <Button
          variant="primary"
          fullWidth
          disabled={isSending || openSplits.length === 0 || amountOwed <= 0}
          onClick={() => void handleSend()}
          className="h-14 text-lg shadow-sm"
        >
          <Send className="w-5 h-5 mr-2" />
          {isSending ? 'Preparing request…' : 'Send payment request'}
        </Button>
      </BottomAction>
    </Screen>
  );
}

function createRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `request-${crypto.randomUUID()}`;
  }
  const random = Math.random().toString(36).slice(2);
  return `request-${Date.now().toString(36)}-${random}`;
}
