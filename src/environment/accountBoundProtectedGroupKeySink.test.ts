import assert from 'node:assert/strict';
import test from 'node:test';
import type {KeyValueStorage} from './livePayerSync.ts';
import {AccountBoundProtectedGroupKeySink} from './accountBoundProtectedGroupKeySink.ts';

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  read(key: string) { return this.values.get(key) ?? null; }
  write(key: string, value: string) { this.values.set(key, value); }
  remove(key: string) { this.values.delete(key); }
}

const access = {
  groupId: 'group-1', participantId: 'nina', accountPublicKeyHex: `0x${'33'.repeat(32)}`,
  keyVersion: 1, groupKeyEnvelopeId: 'envelope-1', groupKey: new Uint8Array(32).fill(8),
};

test('protected sink stores only wrapped account-bound key and proves recovery after recreation', async () => {
  const storage = new MemoryStorage();
  const entropy = {deriveAccountEntropy: async (context: Uint8Array) => new Uint8Array(await crypto.subtle.digest('SHA-256', context))};
  const first = new AccountBoundProtectedGroupKeySink({productId: 'chopdotproof02.dot', storage, entropy});
  await first.save(access);
  const serialized = [...storage.values.values()].join('');
  assert.equal(serialized.includes(Buffer.from(access.groupKey).toString('hex')), false);
  const recreated = new AccountBoundProtectedGroupKeySink({productId: 'chopdotproof02.dot', storage, entropy});
  assert.equal(await recreated.has(access), true);
});

test('wrong account entropy and tampered envelope fail readiness closed', async () => {
  const storage = new MemoryStorage();
  const entropy = (marker: number) => ({deriveAccountEntropy: async (context: Uint8Array) => {
    const input = new Uint8Array(context.byteLength + 1);
    input[0] = marker;
    input.set(context, 1);
    return new Uint8Array(await crypto.subtle.digest('SHA-256', input));
  }});
  await new AccountBoundProtectedGroupKeySink({productId: 'chopdotproof02.dot', storage, entropy: entropy(1)}).save(access);
  assert.equal(await new AccountBoundProtectedGroupKeySink({productId: 'chopdotproof02.dot', storage, entropy: entropy(2)}).has(access), false);
  const [key, raw] = [...storage.values.entries()][0];
  storage.write(key, raw.replace(/"ciphertext":"./u, '"ciphertext":"A'));
  assert.equal(await new AccountBoundProtectedGroupKeySink({productId: 'chopdotproof02.dot', storage, entropy: entropy(1)}).has(access), false);
});
