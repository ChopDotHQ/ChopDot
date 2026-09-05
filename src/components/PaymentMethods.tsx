import { useState } from 'react';
import { Wallet, Building2, Link as LinkIcon, Check } from 'lucide-react';
import { useAppState } from '../state/AppStateContext';
import { Screen, ScreenHeader, ScreenContent } from './primitives';
import {connectPasWallet} from '../payments/pasWallet';

export function PaymentMethods({ onBack }: { onBack: () => void }) {
  const { state, dispatch } = useAppState();
  const [connecting, setConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const currentUser = state.currentUserId ? state.users[state.currentUserId] : null;

  const methods = [
    { id: 'cash', label: 'Cash', desc: 'Hand it over in person', icon: Wallet, colorClass: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30' },
    { id: 'bank_transfer', label: 'Bank Details', desc: 'Share sort code & account', icon: Building2, colorClass: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' },
    { id: 'link', label: 'Payment Link', desc: 'Monzo, Revolut, etc.', icon: LinkIcon, colorClass: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30' }
  ];

  const handleConnectWallet = async () => {
    if (!currentUser) return;
    setConnecting(true);
    setConnectionError('');
    try {
      const walletAddress = await connectPasWallet();
      dispatch({type: 'SET_WALLET_ADDRESS', payload: {userId: currentUser.id, walletAddress}});
      dispatch({type: 'SET_PREFERRED_PAYMENT_METHOD', payload: {methodId: 'pas_wallet'}});
      dispatch({type: 'SET_CURRENCY', payload: {currency: 'PAS'}});
    } catch (reason) {
      setConnectionError(reason instanceof Error ? reason.message : 'The wallet could not connect.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Receive Money" onBack={onBack} />
      
      <ScreenContent className="p-6 space-y-6">
        <p className="text-gray-500 dark:text-gray-400 text-center text-sm font-medium">
          Choose a default way to receive money.
        </p>

        <div className="space-y-3">
          {methods.map(m => {
            const isSelected = state.preferredPaymentMethod === m.id;
            return (
              <button 
                key={m.id}
                onClick={() => dispatch({ type: 'SET_PREFERRED_PAYMENT_METHOD', payload: { methodId: m.id } })}
                className={`w-full flex items-center p-4 bg-white dark:bg-gray-900 rounded-3xl shadow-sm border transition-colors text-left ${isSelected ? 'border-gray-900 dark:border-gray-100 ring-1 ring-gray-900 dark:ring-gray-100' : 'border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 shrink-0 ${m.colorClass}`}>
                  <m.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">{m.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{m.desc}</div>
                </div>
                {isSelected && (
                  <Check className="w-5 h-5 text-gray-900 dark:text-white shrink-0 ml-2" />
                )}
              </button>
            )
          })}
        </div>
        
        <div className="pt-6 border-t border-gray-100 dark:border-gray-800 space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Wallet</h3>
          <button
            type="button"
            onClick={() => void handleConnectWallet()}
            disabled={connecting}
            className="w-full bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-left transition-colors disabled:opacity-60"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {currentUser?.walletAddress ? 'PAS wallet connected' : 'Connect PAS wallet'}
                </p>
                {currentUser?.walletAddress && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {currentUser.walletAddress.slice(0, 6)}...{currentUser.walletAddress.slice(-4)}
                  </p>
                )}
              </div>
              {currentUser?.walletAddress ? <Check className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
            </div>
          </button>
          {connectionError && <p className="text-sm text-red-600 dark:text-red-400">{connectionError}</p>}
        </div>
      </ScreenContent>
    </Screen>
  );
}
