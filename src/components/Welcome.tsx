import { ArrowRight } from 'lucide-react';
import {SpendingGroupCard, zurichDinnerPreviewCard} from './journey/SpendingGroupCard';

export function Welcome({ onGuest }: { onGuest: () => void }) {
  return (
    <main className="flex-1 overflow-y-auto bg-[#f7f6f4] px-6 py-7 text-gray-950 transition-colors dark:bg-gray-950 dark:text-white sm:px-7">
      <header className="flex items-center justify-between">
        <p className="text-lg font-bold tracking-[-0.03em]">ChopDot</p>
      </header>

      <section className="mt-5" aria-labelledby="preview-title">
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Shared dinner</p>
        <h1 id="preview-title" className="mt-1 text-[1.85rem] font-bold tracking-[-0.05em] text-gray-950 dark:text-white">
          Zurich Dinner
        </h1>
        <p className="mt-2 max-w-[18rem] text-[15px] leading-6 text-gray-600 dark:text-gray-300">
          Mina paid. Review the split before anyone is asked to pay.
        </p>
      </section>

      <SpendingGroupCard model={zurichDinnerPreviewCard} />

      <button
        type="button"
        onClick={onGuest}
        aria-label="Review this spend — Continue as guest"
        data-primary-action="true"
        className="mt-4 flex min-h-14 w-full items-center justify-center rounded-full bg-[#e6007a] px-6 py-4 font-semibold text-white shadow-[0_10px_24px_rgba(230,0,122,0.24)] transition-colors hover:bg-[#c9006b] focus:outline-none focus:ring-2 focus:ring-[#e6007a] focus:ring-offset-2 active:bg-[#b80062] dark:ring-offset-gray-950"
      >
        Review this spend
        <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
      </button>

      <p className="mt-3 text-center text-xs leading-5 text-gray-500 dark:text-gray-400">
        Nothing is saved until you add your name.
      </p>
    </main>
  );
}
