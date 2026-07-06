import { Wallet, Building2, Link as LinkIcon, Check } from 'lucide-react';
import { useAppState } from '../state/AppStateContext';
import { Screen, ScreenHeader, ScreenContent } from './primitives';

export function PaymentMethods({ onBack }: { onBack: () => void }) {
  const { state, dispatch } = useAppState();

  const methods = [
    { id: 'cash', label: 'Cash', desc: 'Hand it over in person', icon: Wallet, colorClass: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30' },
    { id: 'bank_transfer', label: 'Bank Details', desc: 'Share sort code & account', icon: Building2, colorClass: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' },
    { id: 'link', label: 'Payment Link', desc: 'Monzo, Revolut, etc.', icon: LinkIcon, colorClass: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30' }
  ];

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
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Connected Accounts</h3>
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 text-center transition-colors">
             <p className="text-sm font-medium text-gray-900 dark:text-white">Not connected yet</p>
             <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Real payment processing is coming soon.</p>
          </div>
        </div>
      </ScreenContent>
    </Screen>
  );
}
