import assert from 'node:assert/strict';
import test from 'node:test';
import type {HostLocalStorage} from '@parity/product-sdk-host';
import {
  HostLocalStorageJsonStorage,
  type AsyncJsonStorage,
  VerifiedContactRepository,
} from './verifiedContactRepository.ts';
import {verifiedContactFixture} from '../../tests/fixtures/verifiedContactFixture.ts';

class MemoryAsyncStorage implements AsyncJsonStorage {
  values = new Map<string, unknown>();
  async readJSON(key: string) { return structuredClone(this.values.get(key) ?? null); }
  async writeJSON(key: string, value: unknown) { this.values.set(key, structuredClone(value)); }
  async clear(key: string) { this.values.delete(key); }
}

test('repository partitions reciprocal records by local account and exact replay is idempotent', async () => {
  const fixture = await verifiedContactFixture();
  const storage = new MemoryAsyncStorage();
  const repository = new VerifiedContactRepository(storage);
  await repository.save(fixture.minaRecord);
  await repository.save(fixture.minaRecord);
  await repository.save(fixture.leoRecord);

  assert.deepEqual((await repository.list(fixture.mina.accountPublicKeyHex)).map(record => record.remoteParticipantId), ['leo']);
  assert.deepEqual((await repository.list(fixture.leo.accountPublicKeyHex)).map(record => record.remoteParticipantId), ['mina']);

  const conflict = structuredClone(fixture.minaRecord);
  conflict.remoteParticipantId = 'nina';
  await assert.rejects(() => repository.save(conflict), /invalid/u);
  assert.equal((await repository.list(fixture.mina.accountPublicKeyHex))[0].remoteParticipantId, 'leo');
});

test('host adapter uses only official async host storage methods and restart restores signed records', async () => {
  const fixture = await verifiedContactFixture();
  const values = new Map<string, unknown>();
  const calls: string[] = [];
  const host = {
    async readJSON(key: string) { calls.push(`read:${key}`); return structuredClone(values.get(key) ?? null); },
    async writeJSON(key: string, value: unknown) { calls.push(`write:${key}`); values.set(key, structuredClone(value)); },
    async clear(key: string) { calls.push(`clear:${key}`); values.delete(key); },
  } satisfies Pick<HostLocalStorage, 'readJSON' | 'writeJSON' | 'clear'>;
  const first = new VerifiedContactRepository(new HostLocalStorageJsonStorage(host));
  await first.save(fixture.minaRecord);
  const recreated = new VerifiedContactRepository(new HostLocalStorageJsonStorage(host));
  assert.equal((await recreated.list(fixture.mina.accountPublicKeyHex))[0].recordId, fixture.minaRecord.recordId);
  assert.equal(calls.some(call => call.startsWith('write:chopdot:verified-contacts:v1:')), true);
  assert.equal(calls.some(call => call.startsWith('read:chopdot:verified-contacts:v1:')), true);
});
