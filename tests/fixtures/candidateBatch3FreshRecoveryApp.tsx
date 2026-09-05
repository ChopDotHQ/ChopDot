import {createRoot} from 'react-dom/client';
import App from '../../src/App.tsx';
import '../../src/index.css';
import type {CanonicalEventV1} from '../../src/core/moneyEventKernel.ts';
import type {GroupKeyEnvelopeV1} from '../../src/environment/accountBoundKeyEnvelope.ts';
import {createCleanState} from '../../src/state/store.ts';
import {
  ArrayLaterEventSource,
  GroupRecoveryService,
  MemoryCheckpointArchive,
  MemoryRecoveryLocatorStore,
  type RecoveryLocatorV1,
} from '../../src/recovery/groupRecovery.ts';
import type {EncryptedGroupCheckpointV1} from '../../src/recovery/encryptedGroupCheckpoint.ts';
import {RecoveryEntryService} from '../../src/recovery/recoveryEntryService.ts';

declare global {
  interface Window {
    __B3_RECOVERY__: {
      checkpoint: EncryptedGroupCheckpointV1;
      locator: RecoveryLocatorV1;
      keyEnvelope: GroupKeyEnvelopeV1;
      laterEvents: CanonicalEventV1[];
      productId: string;
      participantId: string;
      accountPublicKeyHex: string;
      minimumKeyVersion: number;
    };
    __b3DeriveEntropy(context: number[]): Promise<number[]>;
  }
}

const input = window.__B3_RECOVERY__;
const archive = new MemoryCheckpointArchive();
archive.replace(input.locator.checkpointRef, input.checkpoint);
const locators = new MemoryRecoveryLocatorStore();
locators.replace(input.locator);
const digestVerify = async (bytes: Uint8Array, signature: Uint8Array) => {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return digest.length === signature.length && digest.every((byte, index) => byte === signature[index]);
};
const recovery = new GroupRecoveryService({
  archive,
  locators,
  laterEvents: new ArrayLaterEventSource(input.laterEvents),
  verifyEvent: digestVerify,
  verifyCheckpoint: digestVerify,
});
const service = new RecoveryEntryService({
  actor: {participantId: input.participantId, accountPublicKeyHex: input.accountPublicKeyHex},
  recovery,
  access: {async resolve({groupId, actor}) {
    if (groupId !== input.locator.groupId || actor.participantId !== input.participantId || actor.accountPublicKeyHex !== input.accountPublicKeyHex) return null;
    return {
      productId: input.productId,
      minimumKeyVersion: input.minimumKeyVersion,
      keyEnvelope: input.keyEnvelope,
      entropy: {deriveAccountEntropy: async context => Uint8Array.from(await window.__b3DeriveEntropy(Array.from(context)))},
    };
  }},
});

const stateKey = 'chopdot-portable-shell-state-v1';
if (!localStorage.getItem(stateKey)) {
  const state = createCleanState();
  state.currentUserId = input.participantId;
  state.users[input.participantId] = {id: input.participantId, name: input.participantId === 'leo' ? 'Leo' : 'Nina', accountPublicKeyHex: input.accountPublicKeyHex};
  localStorage.setItem(stateKey, JSON.stringify(state));
}

createRoot(document.getElementById('root')!).render(<App dependencies={{groupRecovery: {service}}} />);
