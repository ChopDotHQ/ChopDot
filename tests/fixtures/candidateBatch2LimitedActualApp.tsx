import {createRoot} from 'react-dom/client';
import App from '../../src/App.tsx';
import '../../src/index.css';
import type {KeyValueStorage} from '../../src/environment/livePayerSync.ts';
import type {AccountMessageSigner} from '../../src/membership/groupKeyHandoff.ts';
import {LimitedNoAppActionService} from '../../src/membership/limitedNoAppActionService.ts';
import type {MembershipGrant} from '../../src/membership/membershipLifecycle.ts';
import type {SignedLimitedNoAppResponseV1} from '../../src/membership/limitedNoAppAction.ts';
import {createCleanState} from '../../src/state/store.ts';

declare global {
  interface Window {
    __B2_LIMITED_CAPABILITIES__: {
      organizer: MembershipGrant;
      recipientAccountPublicKeyHex: string;
    };
    __b2SignLimitedRecipient(bytes: number[]): Promise<number[]>;
    __b2DeliverLimitedResponse(response: SignedLimitedNoAppResponseV1): Promise<void>;
  }
}

class BrowserStorage implements KeyValueStorage {
  read(key: string) { return localStorage.getItem(`b2-limited:${key}`); }
  write(key: string, value: string) { localStorage.setItem(`b2-limited:${key}`, value); }
  remove(key: string) { localStorage.removeItem(`b2-limited:${key}`); }
}

const capabilities = window.__B2_LIMITED_CAPABILITIES__;
const signer: AccountMessageSigner = {signBytes: async data => Uint8Array.from(await window.__b2SignLimitedRecipient(Array.from(data)))};
const service = new LimitedNoAppActionService({
  actor: {participantId: 'omar', accountPublicKeyHex: capabilities.recipientAccountPublicKeyHex, signer},
  storage: new BrowserStorage(),
  organizerAuthority: {async verify(input) {
    const organizer = capabilities.organizer;
    return input.groupId === organizer.groupId
      && input.organizerId === organizer.participantId
      && input.organizerAccountPublicKeyHex === organizer.accountPublicKeyHex;
  }},
  delivery: {async send(response) {
    await window.__b2DeliverLimitedResponse(response);
    return {messageId: `limited-${response.responseId}`};
  }},
});
if (!localStorage.getItem('chopdot-portable-shell-state-v1')) {
  const state = createCleanState();
  state.currentUserId = 'omar';
  state.users.omar = {id: 'omar', name: 'Omar', accountPublicKeyHex: capabilities.recipientAccountPublicKeyHex};
  localStorage.setItem('chopdot-portable-shell-state-v1', JSON.stringify(state));
}

createRoot(document.getElementById('root')!).render(<App dependencies={{limitedNoAppAction: {service}}} />);
