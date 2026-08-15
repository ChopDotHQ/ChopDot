import type {User} from '../types';

export function normalizeDisplayName(value: string): string {
  return value.trim().replace(/\s+/gu, ' ');
}

export function validDisplayName(value: string): boolean {
  const normalized = normalizeDisplayName(value);
  return normalized.length >= 1 && normalized.length <= 80;
}

export function createLocalUserId(uuid: () => string = () => crypto.randomUUID()): string {
  const value = uuid().trim();
  if (!value) throw new Error('Could not create a local profile id.');
  return `u-local-${value}`;
}

export function profileRecoveryMessage(user: User): string {
  if (user.hostIdentity) {
    return 'Your Polkadot product identity can be connected again, but this build does not yet restore your groups and history onto another device.';
  }
  return 'Your groups and history are stored on this device in this build. Cross-device recovery is not enabled yet.';
}
