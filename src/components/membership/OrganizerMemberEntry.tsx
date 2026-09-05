import {ArrowLeft, UserPlus} from 'lucide-react';
import {useEffect, useState} from 'react';
import {MembershipOrganizerEntry, type MembershipOrganizerEntryAdapter} from './MembershipOrganizerEntry.tsx';

export interface ProductAccountOrganizerActions {
  listContacts(): Promise<Array<{id: string; label: string}>>;
  listRooms(): Promise<Array<{id: string; label: string}>>;
  prepare(input: {groupId: string; contactRecordId: string; roomId: string}): Promise<MembershipOrganizerEntryAdapter>;
}

export function OrganizerMemberEntry({groupId, groupName, actions, onClose}: {
  groupId: string;
  groupName: string;
  actions: ProductAccountOrganizerActions;
  onClose: () => void;
}) {
  const [contacts, setContacts] = useState<Array<{id: string; label: string}>>([]);
  const [rooms, setRooms] = useState<Array<{id: string; label: string}>>([]);
  const [contactId, setContactId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [adapter, setAdapter] = useState<MembershipOrganizerEntryAdapter | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'preparing' | 'error'>('loading');

  useEffect(() => {
    let active = true;
    void Promise.all([actions.listContacts(), actions.listRooms()]).then(([nextContacts, nextRooms]) => {
      if (!active) return;
      setContacts(nextContacts);
      setRooms(nextRooms);
      setContactId(nextContacts[0]?.id ?? '');
      setRoomId(nextRooms[0]?.id ?? '');
      setStatus('ready');
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [actions]);

  if (adapter) return <MembershipOrganizerEntry adapter={adapter} onClose={onClose} />;
  return (
    <main className="flex min-h-[100dvh] flex-col bg-[#f7f6f4] px-6 py-7 text-gray-950 sm:min-h-[720px]">
      <header className="flex items-center gap-3">
        <button type="button" onClick={onClose} aria-label="Back to group" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-white"><ArrowLeft className="h-5 w-5" /></button>
        <p className="text-lg font-bold tracking-[-0.03em]">Invite a member</p>
      </header>
      <section className="mt-10 flex-1">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-100 text-[#c40068]"><UserPlus className="h-6 w-6" /></span>
        <p className="mt-5 text-sm font-semibold text-gray-500">Choose a group</p>
        <h1 className="mt-1 text-[2rem] font-bold tracking-[-0.05em]">{groupName}</h1>
        <p className="mt-3 max-w-[21rem] text-[15px] leading-6 text-gray-600">Choose a verified person and an existing conversation. Neither choice adds them until they accept and you finish the signed grant.</p>
        {status === 'loading' && <p role="status" className="mt-8 text-sm font-medium text-gray-500">Loading your people and conversations…</p>}
        {status === 'error' && <p role="alert" className="mt-8 text-sm font-medium text-red-700">People or conversations are unavailable. Nothing changed.</p>}
        {status === 'ready' && (
          <div className="mt-8 space-y-5">
            <label className="block text-sm font-semibold text-gray-700">Choose a verified person
              <select value={contactId} onChange={event => setContactId(event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl bg-white px-4 ring-1 ring-black/10">
                {contacts.length === 0 && <option value="">No verified people yet</option>}
                {contacts.map(contact => <option key={contact.id} value={contact.id}>{contact.label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-gray-700">Choose a conversation
              <select value={roomId} onChange={event => setRoomId(event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl bg-white px-4 ring-1 ring-black/10">
                {rooms.length === 0 && <option value="">No conversations available</option>}
                {rooms.map(room => <option key={room.id} value={room.id}>{room.label}</option>)}
              </select>
            </label>
          </div>
        )}
      </section>
      <button type="button" disabled={status !== 'ready' || !contactId || !roomId} onClick={() => {
        setStatus('preparing');
        void actions.prepare({groupId, contactRecordId: contactId, roomId})
          .then(setAdapter)
          .catch(() => setStatus('error'));
      }} className="min-h-14 w-full rounded-full bg-[#e6007a] px-6 py-4 font-semibold text-white disabled:opacity-50">
        {status === 'preparing' ? 'Getting invitation ready…' : 'Invite this person'}
      </button>
    </main>
  );
}
