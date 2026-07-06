import { ArrowRight } from 'lucide-react';

export function Welcome({ onGuest }: { onGuest: () => void }) {
  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 transition-colors p-8">
      <div className="flex-1 flex flex-col justify-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight mb-4">ChopDot</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
          Split, collect, and save the truth after group spending.
        </p>
      </div>
      <div className="space-y-4 pb-8">
        <button disabled className="w-full py-4 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-full font-semibold opacity-70 cursor-not-allowed transition-colors">
          Create account
        </button>
        <button disabled className="w-full py-4 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-full font-semibold opacity-70 cursor-not-allowed transition-colors">
          Log in
        </button>
        <button disabled className="w-full py-4 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-full font-semibold opacity-70 cursor-not-allowed relative transition-colors">
          Connect wallet
          <span className="absolute right-4 text-xs font-normal text-gray-400 dark:text-gray-500 top-1/2 -translate-y-1/2">Coming soon</span>
        </button>
        <button 
          onClick={onGuest}
          className="w-full py-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full font-semibold flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm"
        >
          Continue as guest
          <ArrowRight className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  );
}
