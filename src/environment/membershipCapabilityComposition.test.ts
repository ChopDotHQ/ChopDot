import assert from 'node:assert/strict';
import test from 'node:test';
import type {KeyValueStorage} from './livePayerSync.ts';
import {composeHostMembershipCapabilities} from './membershipCapabilityComposition.ts';

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  read(key: string) { return this.values.get(key) ?? null; }
  write(key: string, value: string) { this.values.set(key, value); }
  remove(key: string) { this.values.delete(key); }
}

test('composition reports missing trust and key-vault capabilities instead of inventing authority', async () => {
  const result = await composeHostMembershipCapabilities({
    storage: new MemoryStorage(),
    bridge: {
      async requestIdentity() { throw new Error('outside host'); },
    } as never,
    chatFactory: async () => null,
  });
  assert.deepEqual(result, {status: 'blocked', blockers: [
    'durable_pending_key_vault_unavailable',
    'host_identity_unavailable',
    'chat_unavailable',
  ]});
});
