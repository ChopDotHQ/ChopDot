import {useMemo, useState} from 'react';
import {Building2, Check, Link as LinkIcon, ShieldCheck, Wallet} from 'lucide-react';
import {useAppState} from '../state/AppStateContext';
import type {PaymentMethod} from '../types';
import {
  buildPaymentMethodId,
  canSetPreferredReceiveMethod,
  getSharedGroups,
  getUserPaymentMethods,
  receiveMethodLabel,
  ReceiveMethodType,
  shortIdentity,
} from '../people/people';
import {Button, EmptyState, Screen, ScreenContent, ScreenHeader} from './primitives';

export function FriendDetail({friendId, onBack}: {friendId: string; onBack: () => void}) {
  const {state, dispatch} = useAppState();
  const friend = state.users[friendId];
  const [methodType, setMethodType] = useState<ReceiveMethodType>('cash');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const sharedGroups = useMemo(
    () => state.currentUserId ? getSharedGroups(state, state.currentUserId, friendId) : [],
    [state, friendId],
  );
  const methods = useMemo(() => getUserPaymentMethods(state, friendId), [state, friendId]);

  if (!friend || friend.id === state.currentUserId) return null;

  const preferredMethod = friend.preferredPaymentMethodId
    ? state.paymentMethods[friend.preferredPaymentMethodId]
    : undefined;

  const changeMethodType = (type: ReceiveMethodType) => {
    setMethodType(type);
    const existing = state.paymentMethods[buildPaymentMethodId(friend.id, type)];
    setDetails(existing?.details ?? '');
    setError('');
    setSaved(false);
  };

  const saveMethod = () => {
    const trimmed = details.trim();
    if (methodType !== 'cash' && !trimmed) {
      setError(methodType === 'payment_link' ? 'Add the payment link.' : 'Add the bank instructions.');
      return;
    }
    if (methodType === 'payment_link' && !isHttpUrl(trimmed)) {
      setError('Use a full http or https payment link.');
      return;
    }

    const method: PaymentMethod = {
      id: buildPaymentMethodId(friend.id, methodType),
      userId: friend.id,
      type: methodType,
      details: methodType === 'cash' ? '' : trimmed,
    };
    dispatch({type: 'ADD_PAYMENT_METHOD', payload: {method}});

    if (!friend.preferredPaymentMethodId) {
      dispatch({
        type: 'ADD_USER',
        payload: {user: {...friend, preferredPaymentMethodId: method.id}},
      });
    }
    setError('');
    setSaved(true);
  };

  const setPreferred = (method: PaymentMethod) => {
    if (!canSetPreferredReceiveMethod(friend, method)) return;
    dispatch({
      type: 'ADD_USER',
      payload: {user: {...friend, preferredPaymentMethodId: method.id}},
    });
  };

  return (
    <Screen>
      <ScreenHeader title={friend.name} onBack={onBack} />
      <ScreenContent className="p-6 space-y-6">
        <section className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Together in ChopDot</p>
          {sharedGroups.length > 0 ? (
            <div className="mt-3 space-y-2">
              {sharedGroups.map(group => (
                <div key={group.id} className="rounded-2xl bg-gray-50 dark:bg-gray-950 px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                  {group.name}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">You do not share an active group yet.</p>
          )}
        </section>

        <section className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Polkadot identity</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              References shown here are read-only until ChopDot can verify identity through the Polkadot host.
            </p>
          </div>
          {friend.walletAddress || friend.accountPublicKeyHex || friend.statementSignerHex ? (
            <div className="space-y-3">
              {friend.walletAddress && (
                <IdentityRow icon={<Wallet className="w-4 h-4" />} label="Wallet reference" value={shortIdentity(friend.walletAddress)} />
              )}
              {friend.accountPublicKeyHex && (
                <IdentityRow icon={<ShieldCheck className="w-4 h-4" />} label="Account reference" value={shortIdentity(friend.accountPublicKeyHex)} />
              )}
              {friend.statementSignerHex && (
                <IdentityRow icon={<ShieldCheck className="w-4 h-4" />} label="Statement signer" value={shortIdentity(friend.statementSignerHex)} />
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No Polkadot identity reference saved yet.</p>
          )}
        </section>

        <section className="space-y-3">
          <div className="px-1">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">How {friend.name} receives money</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Saved locally for convenience. Bank details and links are not verified by ChopDot.
            </p>
          </div>

          {methods.length === 0 ? (
            <div className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
              <EmptyState title="No receive method saved" description="Add one below so you do not have to ask again next time." />
            </div>
          ) : (
            <div className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 shadow-sm space-y-2">
              {methods.map(method => {
                const preferred = preferredMethod?.id === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPreferred(method)}
                    className="w-full rounded-2xl bg-gray-50 dark:bg-gray-950 p-4 text-left flex items-start gap-3"
                    aria-label={`Make ${receiveMethodLabel(method.type)} preferred for ${friend.name}`}
                  >
                    <div className="mt-0.5 text-gray-500 dark:text-gray-400">{methodIcon(method.type)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{receiveMethodLabel(method.type)}</p>
                        {preferred && <span className="text-[10px] font-semibold uppercase tracking-wide text-green-600">Preferred</span>}
                      </div>
                      {method.details && <p className="mt-1 break-all text-xs text-gray-500 dark:text-gray-400">{method.details}</p>}
                    </div>
                    {preferred && <Check className="w-4 h-4 text-green-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Add or update a receive method</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Saving the same type updates the existing entry.</p>
          </div>

          <select
            value={methodType}
            onChange={event => changeMethodType(event.target.value as ReceiveMethodType)}
            className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm text-gray-900 dark:text-white"
            aria-label="Receive method type"
          >
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="payment_link">Payment link</option>
          </select>

          {methodType !== 'cash' && (
            <textarea
              value={details}
              onChange={event => {
                setDetails(event.target.value);
                setError('');
                setSaved(false);
              }}
              rows={3}
              placeholder={methodType === 'payment_link' ? 'https://…' : 'IBAN, account name, or transfer instructions'}
              className="w-full resize-none rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
              aria-label={methodType === 'payment_link' ? 'Payment link' : 'Bank transfer instructions'}
            />
          )}

          {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
          {saved && <p role="status" className="text-sm font-medium text-green-600">Saved for {friend.name}.</p>}
          <Button onClick={saveMethod} fullWidth>Save receive method</Button>
        </section>
      </ScreenContent>
    </Screen>
  );
}

function IdentityRow({icon, label, value}: {icon: React.ReactNode; label: string; value: string}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-gray-50 dark:bg-gray-950 px-4 py-3">
      <div className="text-gray-500 dark:text-gray-400">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="truncate font-mono text-sm font-medium text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function methodIcon(type: string) {
  if (type === 'bank_transfer') return <Building2 className="w-4 h-4" />;
  if (type === 'payment_link') return <LinkIcon className="w-4 h-4" />;
  return <Wallet className="w-4 h-4" />;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}
