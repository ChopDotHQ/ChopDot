import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAccountBoundGroupKeyEnvelope,
  openAccountBoundGroupKeyEnvelope,
  type AccountEntropyProvider,
  type GroupKeyEnvelopeMetadata,
  type GroupKeyEnvelopeV1,
} from './accountBoundKeyEnvelope.ts';

const metadata: GroupKeyEnvelopeMetadata = {
  productId: 'chopdotproof02.dot',
  groupId: 'zurich-dinner',
  recipientId: 'u-host-leo',
  recipientAccountPublicKeyHex: `0x${'22'.repeat(32)}`,
  keyVersion: 1,
};

function deterministicProvider(account: string): AccountEntropyProvider {
  return {
    deriveAccountEntropy: async context => {
      const prefix = new TextEncoder().encode(`test-account:${account}:`);
      const input = new Uint8Array(prefix.byteLength + context.byteLength);
      input.set(prefix);
      input.set(context, prefix.byteLength);
      return new Uint8Array(await crypto.subtle.digest('SHA-256', input));
    },
  };
}

function groupKey(): Uint8Array {
  return Uint8Array.from({length: 32}, (_, index) => index + 1);
}

test('same account and context recover the group key after provider recreation', async () => {
  const envelope = await createAccountBoundGroupKeyEnvelope(metadata, groupKey(), deterministicProvider('leo'));
  const recovered = await openAccountBoundGroupKeyEnvelope(envelope, metadata, deterministicProvider('leo'));
  assert.deepEqual(recovered, groupKey());
});

test('another account cannot recover the group key', async () => {
  const envelope = await createAccountBoundGroupKeyEnvelope(metadata, groupKey(), deterministicProvider('leo'));
  await assert.rejects(
    () => openAccountBoundGroupKeyEnvelope(envelope, metadata, deterministicProvider('nina')),
    /Group access could not be restored/u,
  );
});

test('wrong group, recipient, account key, or key version fails closed', async () => {
  const envelope = await createAccountBoundGroupKeyEnvelope(metadata, groupKey(), deterministicProvider('leo'));
  const mismatches: GroupKeyEnvelopeMetadata[] = [
    {...metadata, groupId: 'another-group'},
    {...metadata, recipientId: 'u-host-nina'},
    {...metadata, recipientAccountPublicKeyHex: `0x${'33'.repeat(32)}`},
    {...metadata, keyVersion: 2},
  ];
  for (const mismatch of mismatches) {
    await assert.rejects(
      () => openAccountBoundGroupKeyEnvelope(envelope, mismatch, deterministicProvider('leo')),
      /Group access could not be restored/u,
    );
  }
});

test('authenticated metadata, iv, and ciphertext reject tampering', async () => {
  const envelope = await createAccountBoundGroupKeyEnvelope(metadata, groupKey(), deterministicProvider('leo'));
  const mutations: GroupKeyEnvelopeV1[] = [
    {...envelope, groupId: 'tampered-group'},
    {...envelope, recipientId: 'tampered-recipient'},
    {...envelope, keyVersion: 2},
    {...envelope, iv: `${envelope.iv.slice(0, -1)}${envelope.iv.endsWith('A') ? 'B' : 'A'}`},
    {...envelope, ciphertext: `${envelope.ciphertext.slice(0, -1)}${envelope.ciphertext.endsWith('A') ? 'B' : 'A'}`},
  ];
  for (const mutation of mutations) {
    await assert.rejects(
      () => openAccountBoundGroupKeyEnvelope(mutation, metadata, deterministicProvider('leo')),
      /Group access could not be restored/u,
    );
  }
});

test('serialized envelope contains no plaintext group key', async () => {
  const key = groupKey();
  const envelope = await createAccountBoundGroupKeyEnvelope(metadata, key, deterministicProvider('leo'));
  const serialized = JSON.stringify(envelope);
  const rawHex = Array.from(key, byte => byte.toString(16).padStart(2, '0')).join('');
  const rawBase64 = Buffer.from(key).toString('base64');
  assert.equal(serialized.includes(rawHex), false);
  assert.equal(serialized.includes(rawBase64), false);
  assert.equal('secret' in envelope, false);
});

test('host entropy failure creates no fallback envelope', async () => {
  const provider: AccountEntropyProvider = {
    deriveAccountEntropy: async () => {
      throw new Error('host unavailable');
    },
  };
  await assert.rejects(
    () => createAccountBoundGroupKeyEnvelope(metadata, groupKey(), provider),
    error => error instanceof Error
      && error.message === 'Group access could not be protected.'
      && !error.message.includes('host unavailable'),
  );
});
