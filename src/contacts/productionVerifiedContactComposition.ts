import {getHostLocalStorage} from '@parity/product-sdk-host';
import {PolkadotHostBridge} from '../environment/polkadotHostBridge.ts';
import {VerifiedContactCeremonyService} from './verifiedContactCeremonyService.ts';
import {HostLocalStorageJsonStorage, VerifiedContactRepository} from './verifiedContactRepository.ts';

export async function createProductionVerifiedContactCeremony(input: {
  bridge?: PolkadotHostBridge;
  baseUrl?: string;
} = {}): Promise<VerifiedContactCeremonyService> {
  const bridge = input.bridge ?? new PolkadotHostBridge();
  const [identity, storage] = await Promise.all([bridge.requestIdentity(), getHostLocalStorage()]);
  if (!identity.signBytes || !storage) throw new Error('Verified contacts require a compatible signed host account.');
  const accountPublicKeyHex = bytesToHex(identity.publicKey);
  const jsonStorage = new HostLocalStorageJsonStorage(storage);
  const service = new VerifiedContactCeremonyService({
    actor: {participantId: identity.username, accountPublicKeyHex, signer: {signBytes: identity.signBytes}},
    repository: new VerifiedContactRepository(jsonStorage),
    draftStorage: jsonStorage,
    baseUrl: input.baseUrl ?? cleanBaseUrl(window.location.href),
  });
  await service.restore();
  return service;
}

function cleanBaseUrl(value: string): string {
  const url = new URL(value);
  url.hash = '';
  return url.toString();
}

function bytesToHex(value: Uint8Array): string {
  return `0x${Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}
