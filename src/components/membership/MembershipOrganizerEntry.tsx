import QRCode from 'qrcode';
import {Check, Link2, QrCode, UserPlus} from 'lucide-react';
import {useEffect, useState, type ReactNode} from 'react';
import {copyText} from '../../environment';
import {MembershipInvitationFlow} from './MembershipInvitationFlow.tsx';
import type {MembershipInvitationUiStatus} from './membershipInvitationView.ts';

export type MembershipOrganizerEntryStatus =
  | 'ready_to_invite'
  | Extract<MembershipInvitationUiStatus, 'pending' | 'ready_to_grant' | 'accepted' | 'grant_failed'>;

export interface MembershipOrganizerEntryAdapter {
  getStatus(): MembershipOrganizerEntryStatus;
  subscribe(listener: () => void): () => void;
  createInvitation?(route: 'join_link' | 'qr'): Promise<{url: string}>;
  finishAdding(): Promise<void>;
}

type CreationView = 'start' | 'choose' | 'creating' | 'link' | 'qr' | 'failed';

export function MembershipOrganizerEntry({adapter, onClose}: {adapter: MembershipOrganizerEntryAdapter; onClose?: () => void}) {
  // The external actor/delivery adapter owns authority; this component only
  // renders its projection and sends explicit organizer intents.
  const status = useAdapterStatus(adapter);
  const [creationView, setCreationView] = useState<CreationView>('start');
  const [invitationUrl, setInvitationUrl] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyUnavailable, setCopyUnavailable] = useState(false);

  // Once a carrier is being prepared, keep it visible until the organizer
  // explicitly says it was shared. Creating the signed invitation changes the
  // authority status to pending before this promise resolves; that transition
  // must not erase the link or QR the other person still needs.
  if (status === 'ready_to_invite' || creationView !== 'start') {
    const create = async (route: 'join_link' | 'qr') => {
      if (!adapter.createInvitation) return;
      setCreationView('creating');
      try {
        const created = await adapter.createInvitation(route);
        if (!created.url) throw new Error('Invitation unavailable.');
        setInvitationUrl(created.url);
        if (route === 'qr') {
          setQrDataUrl(await QRCode.toDataURL(created.url, {errorCorrectionLevel: 'L', margin: 4, width: 1024}));
        }
        setCreationView(route === 'qr' ? 'qr' : 'link');
      } catch {
        setCreationView('failed');
      }
    };

    return (
      <main className="flex min-h-[100dvh] w-full flex-col bg-[#f7f6f4] px-6 py-7 text-gray-950 sm:min-h-[720px]">
        <header><p className="text-lg font-bold tracking-[-0.03em]">ChopDot</p></header>
        {creationView === 'start' && (
          <CreationShell
            eyebrow="Dinner group"
            icon={<UserPlus className="h-6 w-6" aria-hidden="true" />}
            title="Invite this person"
            copy="They will choose whether to join. You will finish adding them after they accept."
          >
            <PrimaryAction onClick={() => setCreationView('choose')}>Invite this person</PrimaryAction>
          </CreationShell>
        )}
        {creationView === 'choose' && (
          <CreationShell
            eyebrow="Invitation ready"
            icon={<Link2 className="h-6 w-6" aria-hidden="true" />}
            title="How should they join?"
            copy="Both options open the same invitation and let them accept or decline."
          >
            <div className="space-y-3">
              <PrimaryAction onClick={() => void create('join_link')}>Share invitation</PrimaryAction>
              <SecondaryAction onClick={() => void create('qr')}>Show QR</SecondaryAction>
            </div>
          </CreationShell>
        )}
        {creationView === 'creating' && (
          <CreationShell eyebrow="Invitation" title="Getting it ready…" copy="This should only take a moment." />
        )}
        {creationView === 'link' && (
          <CreationShell
            eyebrow="Ready to share"
            icon={<Link2 className="h-6 w-6" aria-hidden="true" />}
            title="Send this invitation"
            copy="They can open it to accept or decline."
          >
            <div data-invitation-url={invitationUrl}>
              <PrimaryAction onClick={() => void copyText(invitationUrl).then(result => {
                setCopied(result === 'copied');
                setCopyUnavailable(result === 'unavailable');
              })}>
                {copied ? <><Check className="mr-2 h-5 w-5" aria-hidden="true" />Invitation copied</> : 'Copy invitation'}
              </PrimaryAction>
              {copyUnavailable && (
                <div className="mt-3">
                  <p role="status" className="text-sm font-semibold text-amber-700">Copy unavailable</p>
                  <label className="mt-2 block text-sm font-medium text-gray-600" htmlFor="invitation-link">Select and copy this invitation</label>
                  <input id="invitation-link" readOnly value={invitationUrl} onFocus={event => event.currentTarget.select()} className="mt-2 w-full rounded-2xl bg-white p-4 text-sm text-gray-900 shadow-sm ring-1 ring-black/10" />
                </div>
              )}
            </div>
            <SecondaryAction onClick={() => setCreationView('start')}>I’ve shared it</SecondaryAction>
            <SecondaryAction onClick={() => setCreationView('choose')}>Choose another way</SecondaryAction>
          </CreationShell>
        )}
        {creationView === 'qr' && (
          <CreationShell
            eyebrow="Ready to scan"
            icon={<QrCode className="h-6 w-6" aria-hidden="true" />}
            title="Scan to open the invitation"
            copy="They can scan this to accept or decline."
          >
            <div className="mx-auto w-fit rounded-3xl bg-white p-3 shadow-sm ring-1 ring-black/5">
              <img src={qrDataUrl} width={256} height={256} alt="Invitation QR code" className="h-56 w-56" />
            </div>
            <SecondaryAction onClick={() => setCreationView('start')}>They’ve scanned it</SecondaryAction>
            <SecondaryAction onClick={() => setCreationView('choose')}>Choose another way</SecondaryAction>
          </CreationShell>
        )}
        {creationView === 'failed' && (
          <CreationShell eyebrow="Not sent" title="This invitation isn’t ready" copy="Nothing changed. Try again when you’re ready.">
            <PrimaryAction onClick={() => setCreationView('choose')}>Try again</PrimaryAction>
          </CreationShell>
        )}
      </main>
    );
  }

  if (status === 'accepted' && onClose) {
    return (
      <div className="relative min-h-[100dvh] sm:min-h-[720px]">
        <MembershipInvitationFlow groupName="this group" inviterName="you" friendName="this person" status={status} viewer="organizer" />
        <button type="button" onClick={onClose} className="absolute inset-x-6 bottom-6 py-3 text-sm font-semibold text-gray-500">Back to group</button>
      </div>
    );
  }
  return <MembershipInvitationFlow groupName="this group" inviterName="you" friendName="this person" status={status} viewer="organizer" onGrant={() => adapter.finishAdding()} />;
}

function CreationShell({eyebrow, icon, title, copy, children}: {eyebrow: string; icon?: ReactNode; title: string; copy: string; children?: ReactNode}) {
  return (
    <section className="mt-9 flex flex-1 flex-col">
      <p className="text-sm font-semibold text-gray-500">{eyebrow}</p>
      {icon && <span className="mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-pink-100 text-[#c40068]">{icon}</span>}
      <h1 className="mt-5 text-[2rem] font-bold tracking-[-0.05em]">{title}</h1>
      <p className="mt-3 max-w-[20rem] text-[15px] leading-6 text-gray-600">{copy}</p>
      {children && <div className="mt-auto space-y-3 pb-3 pt-8">{children}</div>}
    </section>
  );
}

function PrimaryAction({children, onClick}: {children: ReactNode; onClick: () => void}) {
  return <button type="button" onClick={onClick} className="flex min-h-14 w-full items-center justify-center rounded-full bg-[#e6007a] px-6 py-4 font-semibold text-white shadow-[0_10px_24px_rgba(230,0,122,0.22)]">{children}</button>;
}

function SecondaryAction({children, onClick}: {children: ReactNode; onClick: () => void}) {
  return <button type="button" onClick={onClick} className="flex min-h-14 w-full items-center justify-center rounded-full bg-white px-6 py-4 font-semibold text-gray-900 shadow-sm ring-1 ring-black/10">{children}</button>;
}

function useAdapterStatus(adapter: MembershipOrganizerEntryAdapter) {
  const [status, setStatus] = useState(adapter.getStatus());
  useEffect(() => adapter.subscribe(() => setStatus(adapter.getStatus())), [adapter]);
  return status;
}
