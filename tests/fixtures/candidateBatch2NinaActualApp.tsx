import {createRoot} from 'react-dom/client';
import App from '../../src/App.tsx';
import '../../src/index.css';
import type {KeyValueStorage} from '../../src/environment/livePayerSync.ts';
import type {AccountMessageSigner} from '../../src/membership/groupKeyHandoff.ts';
import type {MembershipGrant} from '../../src/membership/membershipLifecycle.ts';
import {MembershipBootstrapEntryService} from '../../src/membership/membershipBootstrapEntryService.ts';
import {bootstrapFromUrl} from '../../src/membership/recipientBoundBootstrap.ts';
import type {SignedMembershipEventV1} from '../../src/membership/signedMembershipEvents.ts';
import type {
  PendingAcceptanceRecord,
  PendingAcceptanceVault,
  ProtectedGroupKeySink,
} from '../../src/membership/trustedContactInvitationCoordinator.ts';
import {createCleanState} from '../../src/state/store.ts';

declare global {
  interface Window {
    __B2_HOST_CAPABILITIES__: {
      minaAccountPublicKeyHex: string;
      ninaAccountPublicKeyHex: string;
      organizer: MembershipGrant;
    };
    __b2SignNina(bytes: number[]): Promise<number[]>;
    __b2SendFromNina(event: SignedMembershipEventV1): Promise<void>;
    __b2ReceiveForNina(): Promise<SignedMembershipEventV1[]>;
  }
}

const DB_NAME = 'chopdot-b2-nina-actual-app';
const PENDING_STORE = 'pending-acceptances';
const KEY_STORE = 'protected-group-keys';
const APP_STATE_KEY = 'chopdot-portable-shell-state-v1';

class BrowserStorage implements KeyValueStorage {
  read(key: string) { return localStorage.getItem(`b2-nina:${key}`); }
  write(key: string, value: string) { localStorage.setItem(`b2-nina:${key}`, value); }
  remove(key: string) { localStorage.removeItem(`b2-nina:${key}`); }
}

class IndexedDbPendingVault implements PendingAcceptanceVault {
  async load(invitationId: string) { return (await idbGet<PendingAcceptanceRecord>(PENDING_STORE, invitationId)) ?? null; }
  async save(invitationId: string, record: PendingAcceptanceRecord) { await idbPut(PENDING_STORE, record, invitationId); }
  async remove(invitationId: string) { await idbDelete(PENDING_STORE, invitationId); }
}

class IndexedDbProtectedKeySink implements ProtectedGroupKeySink {
  async save(input: Parameters<ProtectedGroupKeySink['save']>[0]) { await idbPut(KEY_STORE, input, keyId(input)); }
  async has(input: Parameters<NonNullable<ProtectedGroupKeySink['has']>>[0]) { return Boolean(await idbGet(KEY_STORE, keyId(input))); }
}

const capabilities = window.__B2_HOST_CAPABILITIES__;
const signer: AccountMessageSigner = {
  signBytes: async data => Uint8Array.from(await window.__b2SignNina(Array.from(data))),
};
const bootstrap = bootstrapFromUrl(window.location.href);
const outboundListeners = new Set<() => void>();
const service = new MembershipBootstrapEntryService({
  actor: {participantId: 'nina', accountPublicKeyHex: capabilities.ninaAccountPublicKeyHex, signer},
  storage: new BrowserStorage(),
  organizerAuthority: {async resolve(input) {
    const organizer = capabilities.organizer;
    return input.groupId === organizer.groupId
      && input.organizerId === organizer.participantId
      && input.organizerAccountPublicKeyHex === organizer.accountPublicKeyHex
      ? {grant: organizer, proof: {source: 'external_trust_registry', proofId: 'b2-test-registry-mina', verifiedAt: '2026-08-13T00:00:30.000Z'}}
      : null;
  }},
  delivery: {async send(_roomId, event) {
    await window.__b2SendFromNina(event);
    return {messageId: `nina-${event.eventId}`};
  }},
  pendingAcceptances: new IndexedDbPendingVault(),
  protectedKeys: new IndexedDbProtectedKeySink(),
});

if (!localStorage.getItem(APP_STATE_KEY)) {
  const appState = createCleanState();
  appState.currentUserId = 'nina';
  appState.users.nina = {id: 'nina', name: 'Nina', accountPublicKeyHex: capabilities.ninaAccountPublicKeyHex};
  localStorage.setItem(APP_STATE_KEY, JSON.stringify(appState));
}

window.setInterval(() => {
  void window.__b2ReceiveForNina().then(async events => {
    for (const event of events) {
      await service.receive({roomId: bootstrap.returnRoute.roomId, peer: 'mina-device', event});
      outboundListeners.forEach(listener => listener());
    }
  });
}, 25);

createRoot(document.getElementById('root')!).render(
  <App dependencies={{membershipBootstrapEntry: {
    service,
    subscribeToState(listener) {
      outboundListeners.add(listener);
      return () => outboundListeners.delete(listener);
    },
  }}} />,
);

function keyId(input: {groupId: string; participantId: string; accountPublicKeyHex: string; keyVersion: number; groupKeyEnvelopeId: string}) {
  return [input.groupId, input.participantId, input.accountPublicKeyHex, input.keyVersion, input.groupKeyEnvelopeId].join(':');
}

async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PENDING_STORE)) db.createObjectStore(PENDING_STORE);
      if (!db.objectStoreNames.contains(KEY_STORE)) db.createObjectStore(KEY_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet<T = unknown>(store: string, key: string): Promise<T | undefined> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction(store, 'readonly').objectStore(store).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

async function idbPut(store: string, value: unknown, key: string): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, 'readwrite');
    transaction.objectStore(store).put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function idbDelete(store: string, key: string): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, 'readwrite');
    transaction.objectStore(store).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
