import {ArrowLeft, UserMinus} from 'lucide-react';
import {useEffect, useState} from 'react';

export interface ProductAccountRemovalAdapter {
  getStatus(): {status: 'waiting_for_members' | 'ready_to_remove' | 'removed'; acknowledged: number; required: number};
  subscribe(listener: () => void): () => void;
  retry(): Promise<void>;
  finish(): Promise<void>;
}

export interface ProductAccountMemberRemovalActions {
  listRemovable(groupId: string): Promise<Array<{id: string; name: string}>>;
  prepareRemoval(input: {groupId: string; participantId: string}): Promise<ProductAccountRemovalAdapter>;
}

type RemovalStatus = ReturnType<ProductAccountRemovalAdapter['getStatus']>;

export function RemoveMemberEntry({groupId, actions, onClose}: {
  groupId: string;
  actions: ProductAccountMemberRemovalActions;
  onClose: () => void;
}) {
  const [members, setMembers] = useState<Array<{id: string; name: string}>>([]);
  const [participantId, setParticipantId] = useState('');
  const [adapter, setAdapter] = useState<ProductAccountRemovalAdapter | null>(null);
  const [status, setStatus] = useState<RemovalStatus>({status: 'waiting_for_members', acknowledged: 0, required: 0});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void actions.listRemovable(groupId).then(values => {
      if (!active) return;
      setMembers(values);
      setParticipantId(values[0]?.id ?? '');
    }).catch(reason => {
      if (active) setError(reason instanceof Error ? reason.message : 'Members could not be loaded.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [actions, groupId]);
  useEffect(() => adapter?.subscribe(() => setStatus(adapter.getStatus())), [adapter]);
  const start = async () => {
    if (!participantId || busy) return;
    setBusy(true); setError('');
    try {
      const prepared = await actions.prepareRemoval({groupId, participantId});
      setAdapter(prepared); setStatus(prepared.getStatus());
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Removal could not start.'); }
    finally { setBusy(false); }
  };
  const finish = async () => {
    if (!adapter || busy) return;
    setBusy(true); setError('');
    try { await adapter.finish(); setStatus(adapter.getStatus()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Removal could not finish.'); }
    finally { setBusy(false); }
  };
  return (
    <main className="flex min-h-[100dvh] flex-col bg-[#f7f6f4] px-6 py-7 text-gray-950 sm:min-h-[720px]">
      <header className="flex items-center gap-3"><button type="button" onClick={onClose} aria-label="Back to group" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-white"><ArrowLeft className="h-5 w-5" /></button><p className="text-lg font-bold tracking-[-0.03em]">Remove a member</p></header>
      <section className="mt-10 flex-1">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700"><UserMinus className="h-6 w-6" /></span>
        {!adapter ? <>
          <h1 className="mt-5 text-[2rem] font-bold tracking-[-0.05em]">Who should leave?</h1>
          <p className="mt-3 max-w-[22rem] text-[15px] leading-6 text-gray-600">They keep past records they were allowed to see. Every remaining member must safely receive the next group access before removal can finish.</p>
          {loading ? <p role="status" className="mt-8 text-sm font-medium text-gray-500">Checking active members…</p> : members.length === 0 ? <p role="status" className="mt-8 text-sm font-medium text-gray-500">There is no active member you can remove.</p> : <label className="mt-8 block text-sm font-semibold text-gray-700">Active member
            <select value={participantId} onChange={event => setParticipantId(event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl bg-white px-4 ring-1 ring-black/10">{members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select>
          </label>}
        </> : status.status === 'removed' ? <>
          <h1 className="mt-5 text-[2rem] font-bold tracking-[-0.05em]">Member removed</h1>
          <p className="mt-3 text-[15px] leading-6 text-gray-600">Future group updates now use the acknowledged next access key.</p>
        </> : <>
          <h1 className="mt-5 text-[2rem] font-bold tracking-[-0.05em]">{status.status === 'ready_to_remove' ? 'Ready to remove' : 'Waiting for the group'}</h1>
          <p role="status" className="mt-3 text-[15px] leading-6 text-gray-600">{status.acknowledged} of {status.required} remaining members safely received the next group access.</p>
          {status.status === 'waiting_for_members' && <button type="button" disabled={busy} onClick={() => void adapter.retry().catch(reason => setError(reason instanceof Error ? reason.message : 'Retry failed.'))} className="mt-6 text-sm font-semibold text-gray-700 underline">Retry delivery</button>}
        </>}
        {error && <p role="alert" className="mt-4 text-sm font-medium text-red-700">{error}</p>}
      </section>
      {!adapter ? <button type="button" disabled={loading || !participantId || busy} onClick={() => void start()} className="min-h-14 w-full rounded-full bg-red-700 px-6 py-4 font-semibold text-white disabled:opacity-50">{busy ? 'Starting…' : 'Remove this member'}</button>
        : status.status === 'ready_to_remove' ? <button type="button" disabled={busy} onClick={() => void finish()} className="min-h-14 w-full rounded-full bg-red-700 px-6 py-4 font-semibold text-white disabled:opacity-50">{busy ? 'Removing…' : 'Finish removal'}</button>
          : status.status === 'removed' ? <button type="button" onClick={onClose} className="min-h-14 w-full rounded-full bg-gray-950 px-6 py-4 font-semibold text-white">Back to group</button> : null}
    </main>
  );
}
