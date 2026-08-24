import { CircleAlert, Check } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { appStorage } from '../environment';
import {derivePayerSessionConfig, PayerActionOutbox} from '../environment/livePayerSync';
import {observeReceiptConfirmation, publishPendingPayerAction} from '../environment/payerDelivery';
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
  const deliveredKey = `chopdot-payer-delivered-v1:${request.requestId}`;
  const confirmedKey = `chopdot-payer-confirmed-v1:${request.requestId}`;
  const outbox = useMemo(() => new PayerActionOutbox(appStorage), []);
  const [deliveryStatus, setDeliveryStatus] = useState<'ready' | 'sending' | 'pending' | 'delivered' | 'confirmed'>(() => (
    appStorage.read(confirmedKey)
      ? 'confirmed'
      : appStorage.read(deliveredKey)
        ? 'delivered'
        : outbox.has(request.requestId) ? 'pending' : 'ready'
  ));
  const [syncError, setSyncError] = useState('');

  const deliver = useCallback(async () => {
    if (appStorage.read(deliveredKey)) {
      setDeliveryStatus('delivered');
      return;
    }
    setDeliveryStatus('sending');
    const requestSession = await derivePayerSessionConfig(request.requestId, request.live.memberCapability);
    await outbox.enqueue({
      eventId: `paid-${crypto.randomUUID()}`,
      requestId: request.requestId,
      groupId,
      memberId,
      amount: request.amount,
      currency: request.currency,
      memberCapability: request.live.memberCapability,
      roomId: requestSession.roomId,
      secret: requestSession.secret,
      occurredAt: new Date().toISOString(),
      expiresAt: request.expiresAt,
    });
    const result = await outbox.flush(publishPendingPayerAction);
    if (result.published.includes(request.requestId)) {
      appStorage.write(deliveredKey, new Date().toISOString());
      setDeliveryStatus('delivered');
      return;
    }
    setDeliveryStatus('pending');
  }, [deliveredKey, groupId, memberId, outbox, request]);

  useEffect(() => {
    if (deliveryStatus !== 'pending') return;
    const retry = () => void deliver();
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [deliver, deliveryStatus]);

  useEffect(() => {
    if (request.live.authority !== 'native') return;
    let cancelled = false;
    let close: (() => void) | undefined;
    void observeReceiptConfirmation({
      request,
      groupId,
      memberId,
      onConfirmed: () => {
        if (cancelled) return;
        appStorage.write(confirmedKey, new Date().toISOString());
        appStorage.write(deliveredKey, new Date().toISOString());
        setSyncError('');
        setDeliveryStatus('confirmed');
      },
      onError: reason => {
        if (!cancelled) setSyncError(reason instanceof Error ? reason.message : 'Confirmation could not reconnect.');
      },
    }).then(connection => {
      if (cancelled) connection.close();
      else close = () => connection.close();
    }).catch(reason => {
      if (!cancelled) setSyncError(reason instanceof Error ? reason.message : 'Confirmation could not reconnect.');
    });
    return () => {
      cancelled = true;
      close?.();
    };
  }, [confirmedKey, deliveredKey, groupId, memberId, request]);

  if (deliveryStatus === 'delivered' || deliveryStatus === 'pending' || deliveryStatus === 'confirmed') {
    return (
      <Screen>
        <ScreenHeader title={request.groupName} />
        <ScreenContent className="p-6 flex flex-col items-center justify-center text-center space-y-5 pb-24">
          <div className={`w-24 h-24 rounded-full border-4 border-white dark:border-[#0a0a0a] flex items-center justify-center font-bold text-3xl shadow-sm transition-colors ${
            deliveryStatus === 'confirmed' || deliveryStatus === 'delivered'
              ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
          }`}>
            {deliveryStatus === 'confirmed' || deliveryStatus === 'delivered'
              ? <Check className="w-10 h-10" />
              : <CircleAlert className="w-10 h-10" />}
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              {deliveryStatus === 'confirmed'
                ? 'Payment confirmed'
                : deliveryStatus === 'delivered' ? 'Marked as paid' : `Couldn't update the group`}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium mt-3">
              {deliveryStatus === 'confirmed'
                ? `${request.requesterName} confirmed receipt.`
                : deliveryStatus === 'delivered'
                  ? `${request.requesterName} still needs to confirm.`
                : `Your payment hasn't been marked yet.`}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 font-medium mt-2">
              {deliveryStatus === 'confirmed'
                ? 'You are settled'
                : deliveryStatus === 'delivered'
                  ? 'Waiting for the receiver to confirm'
                : 'Try again when you are ready.'}
            </p>
            {syncError && deliveryStatus !== 'confirmed' && (
              <p className="text-sm text-amber-700 dark:text-amber-400 font-medium mt-2">
                Waiting to reconnect for confirmation.
              </p>
            )}
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
          {deliveryStatus === 'pending' && (
            <Button variant="secondary" fullWidth onClick={() => void deliver()}>
              Try again
            </Button>
          )}
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
        <Button
          variant="primary"
          fullWidth
          disabled={deliveryStatus === 'sending'}
          onClick={() => void deliver()}
          className="h-14 text-lg shadow-sm"
        >
          <Check className="w-5 h-5 mr-2" />
          {deliveryStatus === 'sending' ? 'Waiting for approval' : `I paid ${request.requesterName}`}
        </Button>
      </BottomAction>
    </Screen>
  );
}
