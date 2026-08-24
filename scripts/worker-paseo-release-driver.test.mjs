import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, mkdir, rm} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {blake2AsHex} from '@polkadot/util-crypto';
import {
  DEVINSON_OWNER,
  PASEO_WORKER,
  RELEASE_ROOT_CID,
  assertFinalizedHeadPair,
  assertFinalizedStorageProof,
  assertFrozenEnvironmentBinding,
  expectedReleaseManifests,
  verifyDirectIpfsFiles,
  verifyFinalizedTransactions,
} from './lib/worker-paseo-release.mjs';
import {
  assertRecipientRetryState,
  publicationCalls,
} from './lib/worker-paseo-release-driver.mjs';
import {assertIsolatedRuntimePath} from './run-worker-paseo-release.mjs';

const resolver = '0x7F74D7CD50f5a834270E2ad395a01b01891AB37d';
const registry = '0xf34054fd76BbF85f216cf9908226D5f0A72E50CA';
const manifests = expectedReleaseManifests(RELEASE_ROOT_CID);
const exactState = {
  baseRegistrarOwner: PASEO_WORKER.h160,
  baseRegistryOwner: PASEO_WORKER.h160,
  appOwner: DEVINSON_OWNER,
  baseResolver: resolver,
  appResolver: resolver,
  baseContentCid: RELEASE_ROOT_CID,
  appContentCid: RELEASE_ROOT_CID,
  ...manifests,
};

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

test('frozen environment binding rejects endpoint, genesis, code-anchor, and contract drift', () => {
  const contract = {address: registry, bytes: 130, sha256: 'ab'.repeat(32)};
  const target = {
    assetHubWss: 'wss://asset.example',
    ethRpc: 'https://eth.example',
    assetHubGenesis: `0x${'11'.repeat(32)}`,
    chainId: 420420417,
    paraId: 1500,
  };
  const anchored = {
    context: {target, codeAnchorFileSha256: 'cd'.repeat(32)},
    evidence: {contracts: {DOTNS_REGISTRY: contract}},
  };
  const release = {
    polkadotAppDeploy: {codeAnchorFileSha256: 'cd'.repeat(32)},
    recoveryHeadIndex: {deployments: {'paseo-next-v2': {
      ...target,
      endpointCodeAnchorSha256: 'cd'.repeat(32),
      endpointCodeAnchors: {DOTNS_REGISTRY: contract},
    }}},
  };
  const resolved = {assetHub: [target.assetHubWss]};
  assert.doesNotThrow(() => assertFrozenEnvironmentBinding(release, anchored, resolved));
  assert.throws(() => assertFrozenEnvironmentBinding(release, anchored, {assetHub: ['wss://wrong']}), /endpoints/u);
  assert.throws(() => assertFrozenEnvironmentBinding({
    ...release,
    recoveryHeadIndex: {deployments: {'paseo-next-v2': {
      ...release.recoveryHeadIndex.deployments['paseo-next-v2'],
      assetHubGenesis: `0x${'22'.repeat(32)}`,
    }}},
  }, anchored, resolved), /assetHubGenesis/u);
  assert.throws(() => assertFrozenEnvironmentBinding({
    ...release,
    polkadotAppDeploy: {codeAnchorFileSha256: 'ef'.repeat(32)},
  }, anchored, resolved), /code-anchor/u);
  assert.throws(() => assertFrozenEnvironmentBinding({
    ...release,
    recoveryHeadIndex: {deployments: {'paseo-next-v2': {
      ...release.recoveryHeadIndex.deployments['paseo-next-v2'],
      endpointCodeAnchors: {DOTNS_REGISTRY: {...contract, bytes: 131}},
    }}},
  }, anchored, resolved), /DOTNS_REGISTRY/u);
});

test('finalized state pairs the exact height while preserving distinct hash domains', () => {
  const pair = assertFinalizedHeadPair(
    {number: 42, hash: `0x${'11'.repeat(32)}`},
    {number: 42, hash: `0x${'22'.repeat(32)}`},
  );
  assert.equal(pair.finalizedHead.number, pair.ethBlock.number);
  assert.notEqual(pair.finalizedHead.hash, pair.ethBlock.hash);
  assert.throws(() => assertFinalizedHeadPair(
    {number: 42, hash: `0x${'11'.repeat(32)}`},
    {number: 43, hash: `0x${'22'.repeat(32)}`},
  ), /exact finalized/u);
});

test('finalized transaction proof requires block identity, inclusion, success, and exact calldata', async () => {
  const contract = `0x${'33'.repeat(20)}`;
  const callData = `0x${'44'.repeat(8)}`;
  const extrinsic = `0xaa${contract.slice(2)}${callData.slice(2)}bb`;
  const transactionHash = blake2AsHex(extrinsic, 256).toLowerCase();
  const blockHash = `0x${'55'.repeat(32)}`;
  const transaction = {
    kind: 'semantic-write',
    transactionHash,
    blockNumber: 40,
    blockHash,
    semanticCalls: [{kind: 'exact-call', contract, callData}],
  };
  function factory({reportedHash = blockHash, extrinsics = [extrinsic], failed = false} = {}) {
    return () => ({
      getFinalizedBlock: async () => ({number: 42, hash: `0x${'66'.repeat(32)}`}),
      _request: async method => method === 'chain_getBlockHash'
        ? reportedHash
        : {block: {extrinsics}},
      getUnsafeApi: () => ({
        query: {
          System: {
            Events: {
              getValue: async () => [{
                phase: {type: 'ApplyExtrinsic', value: 0},
                event: {type: 'System', value: {type: failed ? 'ExtrinsicFailed' : 'ExtrinsicSuccess'}},
              }],
            },
          },
        },
      }),
      destroy() {},
    });
  }
  const [proof] = await verifyFinalizedTransactions('wss://mock', [transaction], {clientFactory: factory()});
  assert.equal(proof.systemExtrinsicSuccess, true);
  await assert.rejects(() => verifyFinalizedTransactions('wss://mock', [transaction], {
    clientFactory: factory({reportedHash: `0x${'77'.repeat(32)}`}),
  }), /block hash/u);
  await assert.rejects(() => verifyFinalizedTransactions('wss://mock', [transaction], {
    clientFactory: factory({failed: true}),
  }), /ExtrinsicSuccess/u);
  await assert.rejects(() => verifyFinalizedTransactions('wss://mock', [transaction], {
    clientFactory: factory({extrinsics: ['0xaabb']}),
  }), /absent/u);
  const wrongSemanticExtrinsic = `0xaa${contract.slice(2)}bb`;
  await assert.rejects(() => verifyFinalizedTransactions('wss://mock', [{
    ...transaction,
    transactionHash: blake2AsHex(wrongSemanticExtrinsic, 256).toLowerCase(),
  }], {
    clientFactory: factory({extrinsics: [wrongSemanticExtrinsic]}),
  }), /exact exact-call/u);
});

test('publication batch begins with the conservative text estimate and preserves authority order', () => {
  const calls = publicationCalls({pinned: {contracts: {
    DOTNS_CONTENT_RESOLVER: resolver,
    DOTNS_REGISTRY: registry,
  }}}, {manifests});
  assert.equal(calls.length, 7);
  assert.equal(calls[0].kind, 'base-manifest');
  assert.ok(calls.findIndex(call => call.kind === 'app-owner') < calls.findIndex(call => call.kind === 'app-content'));
  assert.ok(calls.findIndex(call => call.kind === 'app-resolver') < calls.findIndex(call => call.kind === 'app-content'));
  assert.equal(calls.filter(call => call.kind.endsWith('content')).length, 2);
});

test('recipient retry accepts only the resolver-reset gap with every release record exact', () => {
  const verified = {manifests};
  assert.deepEqual(assertRecipientRetryState({...exactState, appResolver: resolver}, resolver, verified), {needsResolverRepair: false});
  assert.deepEqual(assertRecipientRetryState({...exactState, appResolver: '0x0000000000000000000000000000000000000000'}, resolver, verified), {needsResolverRepair: true});
  assert.throws(() => assertRecipientRetryState({...exactState, appResolver: `0x${'99'.repeat(20)}`}, resolver, verified), /unexpected resolver/u);
  assert.throws(() => assertRecipientRetryState({
    ...exactState,
    appResolver: '0x0000000000000000000000000000000000000000',
    executableManifest: {...exactState.executableManifest, appVersion: [9, 9, 9]},
  }, resolver, verified), /manifest/u);
});

test('Bulletin proof requires exactly every expected finalized CID', () => {
  const expected = ['cid-a', 'cid-b'];
  const observed = expected.map((cid, index) => ({cid, present: true, block: 10 + index, index}));
  assert.doesNotThrow(() => assertFinalizedStorageProof(observed, expected));
  assert.throws(() => assertFinalizedStorageProof(observed.slice(0, 1), expected), /cid-b/u);
  assert.throws(() => assertFinalizedStorageProof([...observed, {cid: 'cid-c', present: true, block: 12, index: 2}], expected), /unexpected/u);
  assert.throws(() => assertFinalizedStorageProof([{...observed[0], present: null}, observed[1]], expected), /cid-a/u);
});

test('direct gateway proof covers every file and rejects one-byte drift', async () => {
  const releaseBytes = Buffer.from('{"release":true}');
  const fileBytes = new Map([
    ['https://gateway.test/root/app.js', Buffer.from('app')],
    ['https://gateway.test/root/index.html', Buffer.from('index')],
    ['https://gateway.test/root/release.json', releaseBytes],
  ]);
  const release = {files: [
    {path: 'app.js', bytes: 3, sha256: sha256(Buffer.from('app'))},
    {path: 'index.html', bytes: 5, sha256: sha256(Buffer.from('index'))},
  ]};
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => new Response(fileBytes.get(String(url)) ?? Buffer.from('missing'), {status: 200});
  try {
    const proof = await verifyDirectIpfsFiles({
      baseUrl: 'https://gateway.test/root',
      release,
      releaseBytes,
      sha256,
    });
    assert.equal(proof.files, 3);
    fileBytes.set('https://gateway.test/root/app.js', Buffer.from('bad'));
    await assert.rejects(() => verifyDirectIpfsFiles({
      baseUrl: 'https://gateway.test/root',
      release,
      releaseBytes,
      sha256,
    }), /frozen bytes/u);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('isolated runtime rejects ChopDot placement and ancestor node_modules', async () => {
  await assert.rejects(() => assertIsolatedRuntimePath(
    '/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch',
  ), /inside ChopDot/u);
  const parent = await mkdtemp('/private/tmp/chopdot-isolation-policy-');
  try {
    const child = path.join(parent, 'child');
    await mkdir(child);
    assert.equal(await assertIsolatedRuntimePath(child), child);
    await mkdir(path.join(parent, 'node_modules'));
    await assert.rejects(() => assertIsolatedRuntimePath(child), /ancestor contains node_modules/u);
  } finally {
    await rm(parent, {recursive: true, force: true});
  }
});
