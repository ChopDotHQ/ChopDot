import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {
  RECOVERY_HEAD_INDEX_ABI,
  createRecoveryHeadIndexDeploymentMap,
  createRecoveryHeadIndexPort,
  resolveRecoveryHeadIndexAddress,
  type RecoveryHeadIndexContractRequest,
  type RecoveryHeadIndexTransport,
} from './recoveryHeadIndex.ts';

const DEVNET_GENESIS = `0x${'11'.repeat(32)}`;
const PASEO_GENESIS = `0x${'22'.repeat(32)}`;
const DEVNET_CONTRACT = `0x${'aa'.repeat(20)}`;
const PASEO_CONTRACT = `0x${'bb'.repeat(20)}`;
const OWNER = `0x${'cc'.repeat(20)}`;
const STREAM = `0x${'dd'.repeat(32)}`;
const FIRST_DIGEST = `0x${'ee'.repeat(32)}`;
const SECOND_DIGEST = `0x${'ff'.repeat(32)}`;

test('ABI exposes only readHead, advanceHead, HeadAdvanced, and bounded custom errors', () => {
  assert.deepEqual(
    RECOVERY_HEAD_INDEX_ABI.filter(item => item.type === 'function').map(item => [item.name, item.stateMutability]),
    [['readHead', 'view'], ['advanceHead', 'nonpayable']],
  );
  assert.deepEqual(
    RECOVERY_HEAD_INDEX_ABI.filter(item => item.type === 'event').map(item => item.name),
    ['HeadAdvanced'],
  );
  assert.deepEqual(
    RECOVERY_HEAD_INDEX_ABI.filter(item => item.type === 'error').map(item => item.name),
    ['EmptyStream', 'EmptyDigest', 'HeadMismatch', 'SequenceExhausted'],
  );
});

test('deployment map is injected, normalized, immutable, and selected by exact genesis', () => {
  const deployments = createRecoveryHeadIndexDeploymentMap([
    {genesisHash: DEVNET_GENESIS.toUpperCase().replace('0X', '0x'), address: DEVNET_CONTRACT.toUpperCase().replace('0X', '0x')},
    {genesisHash: PASEO_GENESIS, address: PASEO_CONTRACT},
  ]);

  assert.equal(resolveRecoveryHeadIndexAddress(deployments, DEVNET_GENESIS), DEVNET_CONTRACT);
  assert.equal(resolveRecoveryHeadIndexAddress(deployments, PASEO_GENESIS), PASEO_CONTRACT);
  assert.throws(() => resolveRecoveryHeadIndexAddress(deployments, `0x${'33'.repeat(32)}`), /not configured/u);
  assert.throws(() => createRecoveryHeadIndexDeploymentMap([
    {genesisHash: DEVNET_GENESIS, address: DEVNET_CONTRACT},
    {genesisHash: DEVNET_GENESIS, address: PASEO_CONTRACT},
  ]), /duplicate genesis/u);
  assert.throws(() => createRecoveryHeadIndexDeploymentMap([{genesisHash: '0x1234', address: DEVNET_CONTRACT}]), /genesis hash/u);
  assert.throws(() => createRecoveryHeadIndexDeploymentMap([{genesisHash: DEVNET_GENESIS, address: '0x1234'}]), /contract address/u);
  assert.equal(Object.isFrozen(deployments), true);
});

test('port reads the exact owner stream and never treats the head as event authority', async () => {
  const requests: RecoveryHeadIndexContractRequest[] = [];
  const transport: RecoveryHeadIndexTransport = {
    async readContract(request) {
      requests.push(request);
      return {sequence: 7n, digest: FIRST_DIGEST};
    },
    async writeContract() {
      throw new Error('write was not expected');
    },
  };
  const port = createRecoveryHeadIndexPort({
    genesisHash: DEVNET_GENESIS,
    deployments: createRecoveryHeadIndexDeploymentMap([{genesisHash: DEVNET_GENESIS, address: DEVNET_CONTRACT}]),
    transport,
  });

  assert.deepEqual(await port.readHead(OWNER, STREAM), {sequence: 7n, digest: FIRST_DIGEST});
  assert.deepEqual(requests, [{
    genesisHash: DEVNET_GENESIS,
    address: DEVNET_CONTRACT,
    abi: RECOVERY_HEAD_INDEX_ABI,
    functionName: 'readHead',
    args: [OWNER, STREAM],
  }]);
});

test('port advances only the caller-owned head with explicit compare-and-swap inputs', async () => {
  const requests: RecoveryHeadIndexContractRequest[] = [];
  const transport: RecoveryHeadIndexTransport = {
    async readContract() {
      throw new Error('read was not expected');
    },
    async writeContract(request) {
      requests.push(request);
      return {transactionHash: `0x${'44'.repeat(32)}`};
    },
  };
  const port = createRecoveryHeadIndexPort({
    genesisHash: PASEO_GENESIS,
    deployments: createRecoveryHeadIndexDeploymentMap([{genesisHash: PASEO_GENESIS, address: PASEO_CONTRACT}]),
    transport,
  });

  assert.deepEqual(
    await port.advanceHead({stream: STREAM, expectedSequence: 7n, expectedDigest: FIRST_DIGEST, nextDigest: SECOND_DIGEST}),
    {transactionHash: `0x${'44'.repeat(32)}`},
  );
  assert.deepEqual(requests, [{
    genesisHash: PASEO_GENESIS,
    address: PASEO_CONTRACT,
    abi: RECOVERY_HEAD_INDEX_ABI,
    functionName: 'advanceHead',
    args: [STREAM, 7n, FIRST_DIGEST, SECOND_DIGEST],
  }]);
});

test('port rejects malformed data, empty values, and out-of-range sequences before transport', async () => {
  let calls = 0;
  const transport: RecoveryHeadIndexTransport = {
    async readContract() {
      calls += 1;
      return {sequence: 0n, digest: `0x${'00'.repeat(32)}`};
    },
    async writeContract() {
      calls += 1;
      return {transactionHash: `0x${'44'.repeat(32)}`};
    },
  };
  const port = createRecoveryHeadIndexPort({
    genesisHash: DEVNET_GENESIS,
    deployments: createRecoveryHeadIndexDeploymentMap([{genesisHash: DEVNET_GENESIS, address: DEVNET_CONTRACT}]),
    transport,
  });

  await assert.rejects(() => port.readHead('0x1234', STREAM), /owner address/u);
  await assert.rejects(() => port.readHead(OWNER, '0x1234'), /stream/u);
  await assert.rejects(() => port.advanceHead({stream: `0x${'00'.repeat(32)}`, expectedSequence: 0n, expectedDigest: `0x${'00'.repeat(32)}`, nextDigest: FIRST_DIGEST}), /stream/u);
  await assert.rejects(() => port.advanceHead({stream: STREAM, expectedSequence: -1n, expectedDigest: FIRST_DIGEST, nextDigest: SECOND_DIGEST}), /sequence/u);
  await assert.rejects(() => port.advanceHead({stream: STREAM, expectedSequence: (1n << 64n), expectedDigest: FIRST_DIGEST, nextDigest: SECOND_DIGEST}), /sequence/u);
  await assert.rejects(() => port.advanceHead({stream: STREAM, expectedSequence: 0n, expectedDigest: FIRST_DIGEST, nextDigest: `0x${'00'.repeat(32)}`}), /next digest/u);
  assert.equal(calls, 0);
});

test('Solidity source is pinned and contains no admin, upgrade, custody, delete, or external-call surface', async () => {
  const sourcePath = fileURLToPath(new URL('../../contracts/recovery-head-index/src/RecoveryHeadIndex.sol', import.meta.url));
  const source = await readFile(sourcePath, 'utf8');

  assert.match(source, /pragma solidity 0\.8\.28;/u);
  assert.match(source, /function readHead\(address owner, bytes32 stream\)[\s\S]*returns \(uint64 sequence, bytes32 digest\)/u);
  assert.match(source, /function advanceHead\([\s\S]*bytes32 stream,[\s\S]*uint64 expectedSequence,[\s\S]*bytes32 expectedDigest,[\s\S]*bytes32 nextDigest[\s\S]*\) external/u);
  assert.match(source, /event HeadAdvanced\([\s\S]*address indexed owner,[\s\S]*bytes32 indexed stream,[\s\S]*uint64 sequence,[\s\S]*bytes32 digest/u);
  assert.doesNotMatch(source, /\b(?:admin|owner\s*=|onlyOwner|upgrade|proxy|delegatecall|selfdestruct|tx\.origin|payable|fallback|receive|transferFrom|approve)\b/iu);
  assert.doesNotMatch(source, /\.call\s*(?:\{|\()/u);
  assert.equal([...source.matchAll(/\bfunction\s+[A-Za-z0-9_]+\s*\(/gu)].length, 2);
});
