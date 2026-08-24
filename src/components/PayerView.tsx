import { Check, ExternalLink, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useAppState } from '../state/AppStateContext';
import { getInitials } from '../utils';
import { Split, WalletPaymentReceipt } from '../types';
import { Screen, ScreenHeader, ScreenContent, BottomAction, Button, MoneyAmount } from './primitives';
import {
  connectPasWallet,
  POLKADOT_HUB_TESTNET_EXPLORER,
  sendPasPayment,
  waitForMatchingPasPayment,
} from '../payments/pasWallet';

type PaymentStep = 'ready' | 'waiting' | 'cleared';

export function PayerView({
  groupId,
  memberId,
  onBack,
  onPaid,
}: {
  groupId: string;
  memberId: string;
  onBack: () => void;
  onPaid: () => void;
}) {
  const { state, dispatch, runAuthority, authorityBusy, authorityError } = useAppState();
  const [step, setStep] = useState<PaymentStep>('ready');
  const [error, setError] = useState('');
  const [payment, setPayment] = useState<WalletPaymentReceipt | null>(null);

  const group = state.groups[groupId];
  const member = state.users[memberId];
  const memberSplits = (Object.values(state.splits) as Split[]).filter(split => {
    const expense = state.expenses[split.expenseId];
    return split.userId === memberId && expense?.groupId === groupId && expense.paidByUserId !== memberId;
  });
  const reqSplits = memberSplits.filter(split => split.status === 'request_sent');
  const amountOwed = reqSplits.reduce((sum, split) => sum + split.amount, 0);
  const firstExpense = memberSplits.length > 0 ? state.expenses[memberSplits[0].expenseId] : null;
  const requester = firstExpense ? state.users[firstExpense.paidByUserId] : null;
  const currency = firstExpense?.currency ?? state.currency;
  const displayedAmount = payment ? Number(BigInt(payment.amountBaseUnits)) / 1e18 : amountOwed;
  const usesWalletPayment = currency === 'PAS';

  const paymentMethodLabels: Record<string, string> = {
    cash: 'Cash',
    bank_transfer: 'Bank transfer',
    link: 'Payment link',
  };
  const paymentMethod = state.preferredPaymentMethod
    ? paymentMethodLabels[state.preferredPaymentMethod]
    : 'Cash';

  if (!group || !member || !requester) return null;

  const handlePaid = async () => {
    for (const split of reqSplits) {
      if (!await runAuthority({type: 'MARK_PAID', payload: {splitId: split.id, userId: memberId}})) return;
    }
    onPaid();
  };

  const handleWalletPayment = async () => {
    if (reqSplits.length !== 1 || currency !== 'PAS') {
      setError('This payment cannot be sent from this screen yet.');
      return;
    }
    if (!requester.walletAddress) {
      setError(`${requester.name} needs to connect a wallet first.`);
      return;
    }

    setStep('waiting');
    setError('');
    try {
      const walletAddress = await connectPasWallet();
      dispatch({type: 'SET_WALLET_ADDRESS', payload: {userId: memberId, walletAddress}});
      const txHash = await sendPasPayment({
        from: walletAddress,
        to: requester.walletAddress,
        amount: amountOwed,
      });
      const receipt = await waitForMatchingPasPayment({
        txHash,
        from: walletAddress,
        to: requester.walletAddress,
        amount: amountOwed,
      });
      const recorded = await runAuthority({
        type: 'RECORD_MATCHED_PAYMENT',
        payload: {
          splitId: reqSplits[0].id,
          userId: memberId,
          receiverUserId: requester.id,
          receipt,
        },
      });
      if (!recorded) throw new Error('The finalized payment could not be added to the shared record.');
      setPayment(receipt);
      setStep('cleared');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The payment could not be completed.');
      setStep('ready');
    }
  };

  if (step === 'cleared' && payment) {
    return (
      <Screen>
        <ScreenHeader title="Payment finalized" onBack={onBack} />
        <ScreenContent className="p-6 flex flex-col items-center justify-center text-center space-y-6 pb-24">
          <div className="w-24 h-24 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400">
            <Check className="w-11 h-11" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Payment finalized</h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium mt-2">Waiting for {requester.name} to confirm receipt.</p>
          </div>
          <div className="w-full bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 text-left">
            <div className="text-3xl text-gray-900 dark:text-white"><MoneyAmount amount={displayedAmount} currency="PAS" /></div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">To {requester.name}</div>
            <a
              href={`${POLKADOT_HUB_TESTNET_EXPLORER}/${payment.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mt-5"
            >
              View payment <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </ScreenContent>
        <BottomAction>
          <Button variant="primary" fullWidth onClick={onPaid} className="h-14 text-lg shadow-sm">Back to group</Button>
        </BottomAction>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title={`Pay ${requester.name}`} onBack={onBack} />
      <ScreenContent className="p-6 flex flex-col items-center justify-center space-y-2 pb-24">
        <div className="w-24 h-24 rounded-full bg-orange-50 dark:bg-orange-900/30 border-4 border-white dark:border-[#0a0a0a] flex items-center justify-center text-orange-700 dark:text-orange-400 font-bold text-3xl mb-4 shadow-sm">
          {getInitials(member.name)}
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{group.name}</h2>
        <p className="text-gray-500 dark:text-gray-400 font-medium">Your share</p>
        <div className="text-6xl my-8 py-8"><MoneyAmount amount={amountOwed} currency={currency} /></div>
        {!usesWalletPayment && (
          <div className="w-full flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-4 text-sm dark:border-gray-800 dark:bg-gray-900">
            <span className="text-gray-500 dark:text-gray-400">Pay with</span>
            <span className="font-semibold text-gray-900 dark:text-white">{paymentMethod}</span>
          </div>
        )}
        {(error || authorityError) && <p role="alert" className="max-w-[280px] text-center text-sm font-medium text-red-600 dark:text-red-400">{error || authorityError}</p>}
      </ScreenContent>
      <BottomAction>
        {usesWalletPayment ? (
          <Button
            variant="primary"
            fullWidth
            onClick={() => void handleWalletPayment()}
            disabled={step === 'waiting' || authorityBusy}
            className="h-14 text-lg shadow-sm"
          >
            <Wallet className="w-5 h-5 mr-2" />
            {step === 'waiting' ? 'Confirming payment' : `Pay ${requester.name}`}
          </Button>
        ) : (
          <Button variant="primary" fullWidth onClick={() => void handlePaid()} disabled={authorityBusy} className="h-14 text-lg shadow-sm">
            <Check className="w-5 h-5 mr-2" />
            I paid {requester.name}
          </Button>
        )}
      </BottomAction>
    </Screen>
  );
}
