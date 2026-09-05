import {CircleAlert} from 'lucide-react';

export function BoundedEntryUnavailable({kind, onClose}: {kind: 'invitation' | 'request' | 'group'; onClose: () => void}) {
  const noun = kind === 'invitation' ? 'invitation' : kind === 'request' ? 'request' : 'group';
  return (
    <main className="flex min-h-[100dvh] w-full flex-col bg-[#f7f6f4] px-6 py-7 text-gray-950 sm:min-h-[720px]">
      <header><p className="text-lg font-bold tracking-[-0.03em]">ChopDot</p></header>
      <section className="mt-12 flex-1">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700">
          <CircleAlert className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-[2rem] font-bold tracking-[-0.05em]">This {noun} can’t be opened</h1>
        <p className="mt-3 max-w-[22rem] text-[15px] leading-6 text-gray-600">
          {kind === 'group' ? 'This recovery link may be incomplete or damaged. Open the group again from your account.' : 'The link may be incomplete or damaged. Ask the organizer to send a new one.'}
        </p>
      </section>
      <button type="button" onClick={onClose} className="min-h-14 w-full rounded-full bg-gray-950 px-6 py-4 font-semibold text-white">
        Close
      </button>
    </main>
  );
}
