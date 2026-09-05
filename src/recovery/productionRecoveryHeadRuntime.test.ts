import assert from 'node:assert/strict';
import test from 'node:test';
import {
  decodeReadHead,
  encodeAdvanceHead,
  encodeReadHead,
  recoveryDeploymentsFromRelease,
  selectSupportedRecoveryDeployment,
} from './productionRecoveryHeadRuntime.ts';

const DEVNET = `0x${'11'.repeat(32)}`;
const PASEO = `0x${'22'.repeat(32)}`;
const CONTRACT = `0x${'33'.repeat(20)}`;

test('release deployment parsing binds deployment to exact genesis and PVM readback', () => {
  const release = {
    schema: 'chopdot.release.v3' as const,
    recoveryHeadIndex: {
      targetGeneses: {devnet: DEVNET},
      deployments: {devnet: {
        assetHubGenesis: DEVNET,
        address: CONTRACT,
        pvmBytecodeSha256: 'same',
        readbackBytecodeSha256: 'same',
      }},
    },
  };
  assert.deepEqual(recoveryDeploymentsFromRelease(release), [{genesisHash: DEVNET, address: CONTRACT}]);
  assert.throws(() => recoveryDeploymentsFromRelease({
    ...release,
    recoveryHeadIndex: {...release.recoveryHeadIndex, deployments: {devnet: {
      ...release.recoveryHeadIndex.deployments.devnet,
      readbackBytecodeSha256: 'different',
    }}},
  }), /frozen PVM bytecode/u);
});

test('network selection fails closed on zero or multiple exact supported geneses', async () => {
  const deployments = [
    {genesisHash: DEVNET, address: CONTRACT},
    {genesisHash: PASEO, address: `0x${'44'.repeat(20)}`},
  ];
  await assert.rejects(selectSupportedRecoveryDeployment({deployments, supports: async () => false}), /does not support/u);
  await assert.rejects(selectSupportedRecoveryDeployment({deployments, supports: async () => true}), /ambiguous/u);
  assert.equal((await selectSupportedRecoveryDeployment({
    deployments,
    supports: async genesis => genesis === PASEO,
  })).genesisHash, PASEO);
});

test('bounded ABI encoding exposes only readHead and advanceHead shapes', () => {
  const stream = `0x${'55'.repeat(32)}`;
  const digest = `0x${'66'.repeat(32)}`;
  const next = `0x${'77'.repeat(32)}`;
  const read = encodeReadHead(CONTRACT, stream);
  assert.equal(read.slice(0, 10), '0x635f4200');
  assert.equal(read.length, 2 + 8 + 64 + 64);
  const write = encodeAdvanceHead(stream, 7n, digest, next);
  assert.equal(write.slice(0, 10), '0x1a97482d');
  assert.equal(write.length, 2 + 8 + (64 * 4));
  assert.throws(() => encodeAdvanceHead(stream, 1n << 64n, digest, next), /sequence/u);
});

test('readHead ABI decoding rejects malformed and non-uint64 results', () => {
  const digest = 'ab'.repeat(32);
  assert.deepEqual(decodeReadHead(`0x${'0'.repeat(63)}7${digest}`), [7n, `0x${digest}`]);
  assert.throws(() => decodeReadHead('0x01'), /malformed/u);
  assert.throws(() => decodeReadHead(`0x${'1'.repeat(64)}${digest}`), /uint64/u);
});
