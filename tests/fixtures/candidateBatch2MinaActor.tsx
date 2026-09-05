import {createRoot} from 'react-dom/client';
import '../../src/index.css';
import App from '../../src/App.tsx';
import type {MembershipOrganizerEntryAdapter} from '../../src/components/membership/MembershipOrganizerEntry.tsx';
import type {KeyValueStorage} from '../../src/environment/livePayerSync.ts';
import type {AccountMessageSigner} from '../../src/membership/groupKeyHandoff.ts';
import type {MembershipGrant} from '../../src/membership/membershipLifecycle.ts';
import {recipientBoundBootstrapQrText, recipientBoundBootstrapUrl} from '../../src/membership/recipientBoundBootstrap.ts';
import type {SignedMembershipEventV1} from '../../src/membership/signedMembershipEvents.ts';
import {TrustedContactInvitationCoordinator, type PendingAcceptanceRecord, type PendingAcceptanceVault, type ProtectedGroupKeySink} from '../../src/membership/trustedContactInvitationCoordinator.ts';
import {projectMembershipInvitationStatus} from '../../src/components/membership/membershipInvitationView.ts';
import {createCleanState} from '../../src/state/store.ts';

declare global {
  interface Window {
    __B2_HOST_CAPABILITIES__: {minaAccountPublicKeyHex: string; ninaAccountPublicKeyHex: string; organizer: MembershipGrant};
    __b2SignMina(bytes: number[]): Promise<number[]>;
    __b2SendFromMina(event: SignedMembershipEventV1): Promise<void>;
    __b2ReceiveForMina(): Promise<SignedMembershipEventV1[]>;
    __B2_MINA__?: {lastInboundType(): string | null};
  }
}

class BrowserStorage implements KeyValueStorage {
  read(key: string) { return localStorage.getItem(`b2-mina:${key}`); }
  write(key: string, value: string) { localStorage.setItem(`b2-mina:${key}`, value); }
  remove(key: string) { localStorage.removeItem(`b2-mina:${key}`); }
}
class MemoryPendingVault implements PendingAcceptanceVault {
  private readonly records = new Map<string, PendingAcceptanceRecord>();
  async load(id: string) { return this.records.get(id) ?? null; }
  async save(id: string, record: PendingAcceptanceRecord) { this.records.set(id, record); }
  async remove(id: string) { this.records.delete(id); }
}
const noKeySink: ProtectedGroupKeySink = {async save() {}};
const capabilities = window.__B2_HOST_CAPABILITIES__;
const signer: AccountMessageSigner = {signBytes: async data => Uint8Array.from(await window.__b2SignMina(Array.from(data)))};
const listeners = new Set<() => void>();
let invitationId = '';
let lastInbound: SignedMembershipEventV1 | null = null;
const coordinator = new TrustedContactInvitationCoordinator({
  actor: {participantId: 'mina', accountPublicKeyHex: capabilities.minaAccountPublicKeyHex, signer},
  organizerRoots: [capabilities.organizer], storage: new BrowserStorage(), contacts: {async resolve() { return null; }},
  delivery: {async send(_roomId, event) { await window.__b2SendFromMina(event); return {messageId: `mina-${event.eventId}`}; }},
  pendingAcceptances: new MemoryPendingVault(), protectedKeys: noKeySink,
});
if (!localStorage.getItem('chopdot-portable-shell-state-v1')) {
  const state = createCleanState();
  state.currentUserId = 'mina';
  state.users.mina = {id: 'mina', name: 'Mina', accountPublicKeyHex: capabilities.minaAccountPublicKeyHex};
  localStorage.setItem('chopdot-portable-shell-state-v1', JSON.stringify(state));
}
const adapter: MembershipOrganizerEntryAdapter = {
  getStatus() {
    if (!invitationId) return 'ready_to_invite';
    const status = projectMembershipInvitationStatus({state: coordinator.state, invitationId, groupId: capabilities.organizer.groupId, participantId: 'nina'});
    return status === 'ready_to_grant' ? status : status === 'accepted' ? status : 'pending';
  },
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  async createInvitation(route) {
    invitationId = `invite-nina-${route}`;
    const created = await coordinator.createBootstrapInvitation({returnRoomId: 'mina-nina-room', recipientId: 'nina', recipientAccountPublicKeyHex: capabilities.ninaAccountPublicKeyHex, groupId: capabilities.organizer.groupId, invitationId, eventId: `event-invite-nina-${route}`, role: 'member', route, createdAt: '2026-08-13T00:01:00.000Z', expiresAt: '2099-08-13T08:01:00.000Z'});
    const recipientUrl = `${window.location.origin}/tests/fixtures/candidate-batch2-nina-actual-app.html`;
    const url = route === 'qr'
      ? recipientBoundBootstrapQrText(recipientUrl, created.bootstrap)
      : recipientBoundBootstrapUrl(recipientUrl, created.bootstrap);
    return {url};
  },
  async finishAdding() {
    await coordinator.grantAcceptedInvitation({invitationId, eventId: 'event-grant-nina', groupKeyEnvelopeId: 'nina-envelope-v1', keyVersion: 1, groupKey: new Uint8Array(32).fill(8), createdAt: new Date().toISOString(), expiresAt: '2099-08-13T08:01:00.000Z'});
    await coordinator.flush();
    listeners.forEach(listener => listener());
  },
};

window.__B2_MINA__ = {lastInboundType() { return lastInbound?.event.type ?? null; }};

window.setInterval(() => {
  void window.__b2ReceiveForMina().then(async events => {
    for (const event of events) {
      lastInbound = event;
      await coordinator.receive({roomId: 'mina-nina-room', peer: 'nina-device', event});
      listeners.forEach(listener => listener());
    }
  });
}, 25);

createRoot(document.getElementById('root')!).render(<App dependencies={{membershipOrganizerEntry: adapter}} />);
