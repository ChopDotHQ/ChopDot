import {ArrowLeft, Check, CloudUpload, RotateCcw} from 'lucide-react';
import {useState} from 'react';

export interface ProductAccountRecoveryActions {
  protect(groupId: string): Promise<void>;
  recover(groupId: string): Promise<'applied' | 'duplicate'>;
}

export function GroupProtectionEntry({groupId, actions, onClose}: {
  groupId: string;
  actions: ProductAccountRecoveryActions;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<'ready' | 'protecting' | 'recovering' | 'protected' | 'recovered' | 'error'>('ready');
  const [error, setError] = useState('');
  const run = async (kind: 'protect' | 'recover') => {
    setStatus(kind === 'protect' ? 'protecting' : 'recovering');
    setError('');
    try {
      if (kind === 'protect') {
        await actions.protect(groupId);
        setStatus('protected');
      } else {
        await actions.recover(groupId);
        setStatus('recovered');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'This group could not be updated.');
      setStatus('error');
    }
  };
  return (
    <main className="flex min-h-[100dvh] flex-col bg-[#f7f6f4] px-6 py-7 text-gray-950 sm:min-h-[720px]">
      <header className="flex items-center gap-3">
        <button type="button" onClick={onClose} aria-label="Back to group" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-white"><ArrowLeft className="h-5 w-5" /></button>
        <p className="text-lg font-bold tracking-[-0.03em]">Keep this group safe</p>
      </header>
      <section className="mt-10 flex-1">
        {['protected', 'recovered'].includes(status) ? (
          <>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-6 w-6" /></span>
            <h1 className="mt-5 text-[2rem] font-bold tracking-[-0.05em]">{status === 'protected' ? 'Protected copy ready' : 'Group restored'}</h1>
            <p className="mt-3 max-w-[21rem] text-[15px] leading-6 text-gray-600">{status === 'protected' ? 'The copy is encrypted. Availability is bounded, so keep access on another participant or make a recovery kit too.' : 'The signed group history was verified and imported before this success message appeared.'}</p>
          </>
        ) : (
          <>
            <h1 className="text-[2rem] font-bold tracking-[-0.05em]">Protect or restore</h1>
            <p className="mt-3 max-w-[21rem] text-[15px] leading-6 text-gray-600">Protection is optional. If you skip it and lose this account, restoring the group may require another participant.</p>
            <div className="mt-8 space-y-3">
              <button type="button" disabled={status === 'protecting' || status === 'recovering'} onClick={() => void run('protect')} className="flex min-h-14 w-full items-center justify-center rounded-full bg-[#e6007a] px-6 py-4 font-semibold text-white disabled:opacity-60"><CloudUpload className="mr-2 h-5 w-5" />{status === 'protecting' ? 'Protecting…' : 'Protect this group'}</button>
              <button type="button" disabled={status === 'protecting' || status === 'recovering'} onClick={() => void run('recover')} className="flex min-h-14 w-full items-center justify-center rounded-full bg-white px-6 py-4 font-semibold text-gray-900 shadow-sm ring-1 ring-black/10 disabled:opacity-60"><RotateCcw className="mr-2 h-5 w-5" />{status === 'recovering' ? 'Restoring…' : 'Recover this group'}</button>
            </div>
            {status === 'error' && <p role="alert" className="mt-4 text-sm font-medium text-red-700">{error || 'Nothing changed. Check this account and try again.'}</p>}
          </>
        )}
      </section>
      {['protected', 'recovered'].includes(status) && <button type="button" onClick={onClose} className="min-h-14 w-full rounded-full bg-gray-950 px-6 py-4 font-semibold text-white">Back to group</button>}
    </main>
  );
}
