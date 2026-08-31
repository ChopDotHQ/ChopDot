import {ArrowRight, Camera, UserRound, UsersRound} from 'lucide-react';
import {useState} from 'react';

export function Welcome({onGuest, onScanReceipt, onStartGroup, onUseProductAccount}: {
  onGuest: () => void;
  onScanReceipt: () => void;
  onStartGroup: () => void;
  onUseProductAccount?: () => Promise<void>;
}) {
  const [accountState, setAccountState] = useState<'idle' | 'connecting' | 'error'>('idle');
  const connect = async () => {
    if (!onUseProductAccount || accountState === 'connecting') return;
    setAccountState('connecting');
    try {
      await onUseProductAccount();
      setAccountState('idle');
    } catch {
      setAccountState('error');
    }
  };
  return (
    <main className="flex-1 overflow-y-auto bg-[#f7f6f4] px-6 py-7 text-gray-950 transition-colors dark:bg-gray-950 dark:text-white sm:px-7">
      <header className="flex items-center justify-between">
        <p className="text-lg font-bold tracking-[-0.03em]">ChopDot</p>
      </header>

      <section className="mt-10" aria-labelledby="welcome-title">
        <div className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-white text-[#e6007a] shadow-[0_10px_30px_rgba(20,20,24,0.08)] dark:bg-gray-900">
          <UsersRound className="h-7 w-7" aria-hidden="true" />
        </div>
        <p className="mt-7 text-sm font-semibold text-[#c40068] dark:text-[#ff65b5]">Shared money, kept clear.</p>
        <h1 id="welcome-title" className="mt-2 max-w-[19rem] text-[2.75rem] font-bold leading-[0.98] tracking-[-0.065em] text-gray-950 dark:text-white">
          Start a group.
        </h1>
        <p className="mt-4 max-w-[18rem] text-[15px] leading-6 text-gray-600 dark:text-gray-300">
          Keep expenses, payments, and the group history together—from the first spend to the final balance.
        </p>
      </section>

      <button
        type="button"
        onClick={onStartGroup}
        data-primary-action="true"
        className="mt-10 flex min-h-16 w-full items-center justify-center rounded-full bg-[#e6007a] px-6 py-4 text-lg font-bold text-white shadow-[0_14px_30px_rgba(230,0,122,0.24)] transition-colors hover:bg-[#c9006b] focus:outline-none focus:ring-2 focus:ring-[#e6007a] focus:ring-offset-2 active:bg-[#b80062] dark:ring-offset-gray-950"
      >
        <UsersRound className="mr-2 h-5 w-5" aria-hidden="true" />
        Start a group
      </button>

      <button
        type="button"
        onClick={onScanReceipt}
        className="mt-3 flex min-h-12 w-full items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-black/10 transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:text-white dark:ring-white/15"
      >
        <Camera className="mr-2 h-4 w-4" aria-hidden="true" />
        Scan a receipt
      </button>

      {onUseProductAccount && (
        <button
          type="button"
          onClick={() => void connect()}
          disabled={accountState === 'connecting'}
          className="mt-3 flex min-h-12 w-full items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-black/10 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:bg-gray-900 dark:text-white dark:ring-white/15"
        >
          <UserRound className="mr-2 h-4 w-4" aria-hidden="true" />
          {accountState === 'connecting' ? 'Opening your account…' : 'Continue with my account'}
        </button>
      )}

      <button
        type="button"
        onClick={onGuest}
        className="mt-3 flex min-h-12 w-full items-center justify-center rounded-full px-5 text-sm font-semibold text-gray-700 transition-colors hover:bg-white dark:text-gray-200 dark:hover:bg-gray-900"
      >
        Continue as guest
        <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
      </button>

      {accountState === 'error' && <p role="alert" className="mt-2 text-center text-sm font-medium text-red-700">Your account did not connect. You can retry or continue another way.</p>}

      <p className="mt-3 text-center text-xs leading-5 text-gray-600 dark:text-gray-300">You choose what to share. Receipt scans stay drafts until you review them.</p>
    </main>
  );
}
