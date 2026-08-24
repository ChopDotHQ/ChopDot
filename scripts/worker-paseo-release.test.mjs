import assert from 'node:assert/strict';
import test from 'node:test';
import {ethers} from 'ethers';
import {
  DEVINSON_OWNER,
  PASEO_WORKER,
  RELEASE_ROOT_CID,
  appHandoffCalls,
  assertReleaseAuthorityState,
  assertReleaseRecords,
  expectedReleaseManifests,
  planHandoff,
  releaseNodes,
  requireFinalizedResolution,
} from './lib/worker-paseo-release.mjs';
import {validateReleaseInvocation} from './run-worker-paseo-release.mjs';

const resolver = '0x7F74D7CD50f5a834270E2ad395a01b01891AB37d';
const manifests = expectedReleaseManifests(RELEASE_ROOT_CID);
const manifestOptions = {
  expectedRootManifest: manifests.rootManifest,
  expectedExecutableManifest: manifests.executableManifest,
};
const base = {
  baseRegistrarOwner: PASEO_WORKER.h160,
  baseRegistryOwner: PASEO_WORKER.h160,
  appOwner: PASEO_WORKER.h160,
  baseResolver: resolver,
  appResolver: resolver,
  baseContentCid: RELEASE_ROOT_CID,
  appContentCid: RELEASE_ROOT_CID,
  ...manifests,
};

test('app handoff sets owner before restoring the anchored resolver', () => {
  const calls = appHandoffCalls({resolver});
  assert.deepEqual(calls.map(call => call.functionName), ['setSubnodeOwner', 'setSubnodeResolver']);
  assert.equal(calls[0].args[0].owner.toLowerCase(), DEVINSON_OWNER);
  assert.equal(calls[1].args[0].resolver, ethers.utils.getAddress(resolver));
  assert.equal(calls[0].args[0].parentNode, releaseNodes().baseNode);
});

test('handoff planner preserves app-first ordering and supports bounded retry', () => {
  assert.deepEqual(planHandoff(base, {resolver}), ['handoff-app', 'transfer-base']);
  assert.deepEqual(planHandoff({...base, appOwner: DEVINSON_OWNER}, {resolver}), ['transfer-base']);
  assert.deepEqual(
    planHandoff({...base, appOwner: DEVINSON_OWNER, appResolver: ethers.constants.AddressZero}, {resolver}),
    ['restore-app-resolver', 'transfer-base'],
  );
  assert.deepEqual(planHandoff({
    ...base,
    baseRegistrarOwner: DEVINSON_OWNER,
    baseRegistryOwner: DEVINSON_OWNER,
    appOwner: DEVINSON_OWNER,
  }, {resolver}), []);
});

test('handoff planner rejects reversed or third-party authority', () => {
  assert.throws(() => planHandoff({
    ...base,
    baseRegistrarOwner: DEVINSON_OWNER,
    baseRegistryOwner: DEVINSON_OWNER,
  }, {resolver}), /worker recovery is no longer authorized/u);
  assert.throws(() => planHandoff({...base, appOwner: '0x1111111111111111111111111111111111111111'}, {resolver}), /third party/u);
  assert.throws(() => planHandoff({...base, baseRegistryOwner: DEVINSON_OWNER}, {resolver}), /owners differ/u);
});

test('authority proof requires triple ownership, both resolvers, and both frozen CIDs', () => {
  assert.doesNotThrow(() => assertReleaseAuthorityState(base, {phase: 'worker', resolver, ...manifestOptions}));
  const final = {
    ...base,
    baseRegistrarOwner: DEVINSON_OWNER,
    baseRegistryOwner: DEVINSON_OWNER,
    appOwner: DEVINSON_OWNER,
  };
  assert.doesNotThrow(() => assertReleaseAuthorityState(final, {phase: 'final', resolver, ...manifestOptions}));
  assert.throws(() => assertReleaseAuthorityState({...final, appResolver: ethers.constants.AddressZero}, {phase: 'final', resolver, ...manifestOptions}), /app resolver/u);
  assert.throws(() => assertReleaseAuthorityState({...final, appContentCid: 'bafybad'}, {phase: 'final', resolver, ...manifestOptions}), /frozen CAR/u);
});

test('record proof rejects every manifest mutation and unexpected field', () => {
  const options = {resolver, ...manifestOptions};
  assert.doesNotThrow(() => assertReleaseRecords(base, options));
  for (const changed of [
    {...base, rootManifest: {...base.rootManifest, description: 'malicious'}},
    {...base, rootManifest: {...base.rootManifest, icon: {...base.rootManifest.icon, cid: 'bafybad'}}},
    {...base, rootManifest: {...base.rootManifest, unexpected: true}},
    {...base, executableManifest: {...base.executableManifest, appVersion: [9, 9, 9]}},
    {...base, executableManifest: {...base.executableManifest, unexpected: true}},
  ]) assert.throws(() => assertReleaseRecords(changed, options), /manifest/u);
  assert.throws(() => assertReleaseRecords({...base, rootManifest: {$v: 1}}, options), /manifest/u);
});

test('transaction evidence must include an exact hash and finalized block', () => {
  const proof = requireFinalizedResolution({
    kind: 'hash',
    hash: `0x${'12'.repeat(32)}`,
    block: {number: 42, hash: `0x${'34'.repeat(32)}`},
  }, 'handoff');
  assert.equal(proof.blockNumber, 42);
  assert.throws(() => requireFinalizedResolution({kind: 'hash', hash: `0x${'12'.repeat(32)}`}, 'handoff'), /finalized/u);
  assert.throws(() => requireFinalizedResolution({kind: 'best-block', hash: `0x${'12'.repeat(32)}`, block: {number: 42, hash: `0x${'34'.repeat(32)}`}}, 'handoff'), /finalized/u);
  assert.throws(() => requireFinalizedResolution({kind: 'nonce-advanced', hash: `0x${'12'.repeat(32)}`, block: {number: 42, hash: `0x${'34'.repeat(32)}`}}, 'handoff'), /finalized/u);
});

test('bootstrap requires the exact mode, environment, domain, owner, CAR, tooling commit, and aggregate', () => {
  const argv = ['node', 'runner', 'release'];
  const env = {
    CHOPDOT_WORKER_RELEASE_SHELL: '1',
    DO_NOT_TRACK: '1',
    PAD_UPDATE_CHECK: '0',
    RELEASE_ENV: 'paseo-next-v2',
    RELEASE_DOMAIN: 'chopdotapp01.dot',
    RELEASE_EXPECTED_DEVINSON_OWNER: DEVINSON_OWNER,
    RELEASE_CAR_SHA256: 'b9fa8263b7f83c05a32547803078db1bbb47c232c5fc8d07b4f8f5657a34a6ae',
    RELEASE_TOOLING_COMMIT: '12'.repeat(20),
    RELEASE_TOOLING_AGGREGATE_SHA256: '34'.repeat(32),
  };
  assert.equal(validateReleaseInvocation(argv, env), 'release');
  assert.equal(validateReleaseInvocation(['node', 'runner', 'identity'], {CHOPDOT_WORKER_RELEASE_SHELL: '1'}), 'identity');
  assert.throws(() => validateReleaseInvocation(['node', 'runner', 'identity'], {}), /shell/u);
  for (const [field, value] of [
    ['RELEASE_ENV', 'devnet'],
    ['RELEASE_DOMAIN', 'wrong.dot'],
    ['RELEASE_EXPECTED_DEVINSON_OWNER', PASEO_WORKER.h160],
    ['RELEASE_CAR_SHA256', '00'.repeat(32)],
    ['RELEASE_TOOLING_COMMIT', 'bad'],
    ['RELEASE_TOOLING_AGGREGATE_SHA256', 'bad'],
  ]) assert.throws(() => validateReleaseInvocation(argv, {...env, [field]: value}));
  assert.throws(() => validateReleaseInvocation(['node', 'runner', 'publish'], env), /mode/u);
  assert.throws(() => validateReleaseInvocation([...argv, 'extra'], env), /mode/u);
});
