import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSessionSecret,
  decryptSessionValue,
  encryptSessionValue,
  sessionRoutingName,
} from './encryptedSession.ts';

test('encrypted session packets round-trip without plaintext fields', async () => {
  const secret = createSessionSecret();
  const value = {type: 'payment_marked', amount: '40.00', person: 'Leo'};
  const packet = await encryptSessionValue(secret, value);
  assert.equal(JSON.stringify(packet).includes('Leo'), false);
  assert.deepEqual(await decryptSessionValue(secret, packet), value);
});

test('session routing names do not expose the group id', async () => {
  const name = await sessionRoutingName('friday-crew', createSessionSecret());
  assert.equal(name.includes('friday-crew'), false);
});

test('the wrong session secret cannot decrypt a packet', async () => {
  const packet = await encryptSessionValue(createSessionSecret(), {type: 'group_created'});
  await assert.rejects(() => decryptSessionValue(createSessionSecret(), packet));
});
