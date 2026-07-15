import { Check } from 'lucide-react';
import { useState } from 'react';
import { shareOrCopyText } from '../environment';
import { buildPayerMarkedPaidReturnUrl } from '../requestLinks';
import { getInitials } from '../utils';
import { StandalonePayerRequest as StandalonePayerRequestData } from '../requestLinks';
import { Screen, ScreenHeader, ScreenContent, BottomAction, Button, MoneyAmount } from './primitives';

export function StandalonePayerRequest({
  request,
  groupId,
  memberId,
}: {
  request: StandalonePayerRequestData;
  groupId: string;
  memberId: string;
}) {
  const [markedPaid, setMarkedPaid] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<'shared' | 'copied' | 'ready' | null>(null);

  const markPaidAndNotify = async () => {
    const updateUrl = buildPayerMarkedPaidReturnUrl(groupId, memberId, request);
    const result = await shareOrCopyText({
      title: 'ChopDot payment update',
      text: `${request.payerName} marked ${request.currency} ${request.amount.toFixed(2)} as paid for ${request.groupName}.`,
      url: updateUrl,
    });
    setDeliveryStatus(result);
    setMarkedPaid(true);
  };

  if (markedPaid) {
    return (
      <Screen>
        <ScreenHeader title={request.groupName} />
        <ScreenContent className="p-6 flex flex-col items-center justify-center text-center space-y-5 pb-24">
          <div className="w-24 h-24 rounded-full bg-green-50 dark:bg-green-900/30 border-4 border-white dark:border-[#0a0a0a] flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-3xl shadow-sm transition-colors">
            <Check className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Marked as paid
            </h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium mt-3">
              {request.requesterName} still needs to confirm.
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 font-medium mt-2">
              {deliveryStatus === 'shared'
                ? `Update sent to ${request.requesterName}`
                : deliveryStatus === 'copied'
                  ? 'Update link copied'
                  : `Send the update to ${request.requesterName}`}
            </p>
          </div>
          <div className="w-full bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 transition-colors text-left">
            <div className="flex justify-between text-sm font-medium text-gray-500 dark:text-gray-400">
              <span>{request.groupName}</span>
              <span>{request.paymentMethodLabel}</span>
            </div>
            <div className="mt-3 text-2xl text-gray-900 dark:text-white">
              <MoneyAmount amount={request.amount} currency={request.currency} />
            </div>
          </div>
        </ScreenContent>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title={request.groupName} />

      <ScreenContent className="p-6 flex flex-col items-center justify-center space-y-2 pb-24">
        <div className="w-24 h-24 rounded-full bg-orange-50 dark:bg-orange-900/30 border-4 border-white dark:border-[#0a0a0a] flex items-center justify-center text-orange-700 dark:text-orange-400 font-bold text-3xl mb-4 shadow-sm transition-colors">
          {getInitials(request.payerName)}
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Pay {request.requesterName}</h2>
        <p className="text-gray-500 dark:text-gray-400 font-medium text-center">Your share</p>

        <div className="text-6xl my-8 py-8">
          <MoneyAmount amount={request.amount} currency={request.currency} />
        </div>

        <div className="w-full flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-4 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <span className="text-gray-500 dark:text-gray-400">Pay with</span>
          <span className="font-semibold text-gray-900 dark:text-white">{request.paymentMethodLabel}</span>
        </div>
      </ScreenContent>

      <BottomAction>
        <Button variant="primary" fullWidth onClick={() => void markPaidAndNotify()} className="h-14 text-lg shadow-sm">
          <Check className="w-5 h-5 mr-2" />
          I paid {request.requesterName}
        </Button>
      </BottomAction>
    </Screen>
  );
}
