import { ArrowRight, ShieldCheck } from 'lucide-react';

export function Welcome({ onGuest }: { onGuest: () => void }) {
  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 transition-colors p-8">
      <div className="flex-1 flex flex-col justify-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight mb-4">ChopDot</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
          Split shared spending, settle what matters, and keep a clear record of what happened.
        </p>
        <div className="mt-8 flex items-start gap-3 text-sm text-gray-500 dark:text-gray-400">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <p>Start with a local profile. You can connect Polkadot later when a host-supported identity or payment adds value.</p>
        </div>
      </div>
      <div className="pb-8">
        <button
          type="button"
          onClick={onGuest}
          className="w-full py-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full font-semibold flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm"
        >
          Start using ChopDot
          <ArrowRight className="w-5 h-5 ml-2" />
        </button>
        <p className="mt-3 text-center text-xs text-gray-400 dark:text-gray-500">No wallet or account setup required.</p>
      </div>
    </div>
  );
}
