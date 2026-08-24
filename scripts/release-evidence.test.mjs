import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {access, mkdir, mkdtemp, readFile, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {CarWriter} from '@ipld/car';
import {importer} from 'ipfs-unixfs-importer';
import {CID} from 'multiformats/cid';
import * as raw from 'multiformats/codecs/raw';
import {sha256 as mfSha256} from 'multiformats/hashes/sha2';
import {
  LOCKED_PAD,
  assertSuccessfulExtrinsic,
  buildInstalledDeploymentRuntimeManifest,
  inspectCar,
  parseDeployLog,
  safeRepoPath,
  sha256,
  verifyReleaseDirectory,
  verifyLockedDeploymentCli,
} from './lib/release-evidence.mjs';
import {parseLockedDeployArgs, parseWhoamiAddress, validateLockedDeployInvocation} from './lib/locked-deploy-driver.mjs';
import {assertCanonicalReceipt, assertStaleRejectedForOwner} from './lib/recovery-head-verification.mjs';
import {extractGitArchive} from './lib/git-archive-snapshot.mjs';
import {rebuildOrderedCarFromBytes} from '../node_modules/@polkadot-community-foundation/polkadot-app-deploy/dist/chunk-7W5KOX5X.js';

const root = process.cwd();
const cid = CID.createV1(raw.code, await mfSha256.digest(new TextEncoder().encode('candidate'))).toString();
const carRoot = cid;
const header = {
  schema: 'chopdot.locked-pad-attestation.v2',
  package: LOCKED_PAD.package,
  version: LOCKED_PAD.version,
  integrity: LOCKED_PAD.integrity,
  packageAggregateSha256: 'aa'.repeat(32),
  runtimePackages: LOCKED_PAD.runtimePackages,
  runtimeFiles: LOCKED_PAD.runtimeFiles,
  runtimeAggregateSha256: LOCKED_PAD.runtimeAggregateSha256,
  releaseJsonSha256: 'bb'.repeat(32),
  commandMode: 'stage',
  environment: 'devnet',
  domain: 'chopdotapp01.dot',
  expectedDevinsonOwner: `0x${'12'.repeat(20)}`,
  signedInAddress: `0x${'12'.repeat(20)}`,
  whoamiAddress: `0x${'12'.repeat(20)}`,
  whoamiOutputSha256: 'cc'.repeat(32),
  ownershipMode: 'direct-devinson',
  source: {
    commit: 'dd'.repeat(20),
    tree: 'ee'.repeat(20),
    packageLockSha256: 'ac'.repeat(32),
    configFileSha256: 'ff'.repeat(32),
    directory: {aggregateSha256: 'ab'.repeat(32), files: 8},
  },
};
const expectedLog = {
  environment: 'devnet',
  domain: 'chopdotapp01.dot',
  expectedOwner: header.expectedDevinsonOwner,
  carRootCid: carRoot,
  commit: header.source.commit,
  tree: header.source.tree,
  packageLockSha256: header.source.packageLockSha256,
  configFileSha256: header.source.configFileSha256,
  directoryAggregateSha256: header.source.directory.aggregateSha256,
  directoryFiles: header.source.directory.files,
};

test('the deployment package is exact, local, versioned, and integrity-pinned', async () => {
  const evidence = await verifyLockedDeploymentCli(root, {verifyRuntime: false});
  assert.equal(evidence.package, LOCKED_PAD.package);
  assert.equal(evidence.version, LOCKED_PAD.version);
  assert.equal(evidence.integrity, LOCKED_PAD.integrity);
  assert.match(evidence.executableSha256, /^[0-9a-f]{64}$/);
  assert.equal(evidence.packageFiles, LOCKED_PAD.packageFiles);
  assert.equal(evidence.packageAggregateSha256, LOCKED_PAD.packageAggregateSha256);
  assert.equal(evidence.runtimeAggregateSha256, null);
  assert.equal(evidence.runtimeVersionOutputSha256, LOCKED_PAD.runtimeVersionOutputSha256);
});

test('release launcher is built-ins-only and strips Node preload injection before bootstrap', async () => {
  const bootstrap = await readFile(path.join(root, 'scripts/run-locked-polkadot-app-deploy.mjs'), 'utf8');
  const imports = [...bootstrap.matchAll(/from\s+['"]([^'"]+)['"]/gu)].map(match => match[1]);
  assert.equal(imports.length > 0, true);
  assert.equal(imports.every(specifier => specifier.startsWith('node:')), true);

  const directory = await mkdtemp(path.join(os.tmpdir(), 'chopdot-node-options-'));
  const canary = path.join(directory, 'canary.cjs');
  const marker = path.join(directory, 'executed');
  await writeFile(canary, `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'unsafe');\n`);
  const result = spawnSync('sh', ['scripts/deploy-locked.sh'], {
    cwd: root,
    env: {...process.env, NODE_OPTIONS: `--require=${canary}`, NODE_PATH: path.join(directory, 'modules')},
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /bootstrap refuses a dirty exact worktree/u);
  await assert.rejects(() => access(marker), /ENOENT/u);
});

test('release launcher resolves its bootstrap from the launcher location', () => {
  const launcher = path.join(root, 'scripts/deploy-locked.sh');
  const result = spawnSync('sh', [launcher], {
    cwd: path.join(root, 'scripts'),
    env: {...process.env},
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  const output = `${result.stdout}\n${result.stderr}`;
  assert.match(output, /exact worktree root/u);
  assert.doesNotMatch(output, /Cannot find module/u);
});

test('runtime closure hashing includes transitive installed bytes and rejects ancestry escape', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'chopdot-runtime-closure-'));
  const appRoot = path.join(directory, 'app');
  const packageRoot = path.join(appRoot, 'node_modules', ...LOCKED_PAD.package.split('/'));
  const dependencyRoot = path.join(appRoot, 'node_modules/dependency');
  await Promise.all([mkdir(packageRoot, {recursive: true}), mkdir(dependencyRoot, {recursive: true})]);
  await Promise.all([
    writeFile(path.join(packageRoot, 'package.json'), JSON.stringify({name: LOCKED_PAD.package, version: LOCKED_PAD.version, dependencies: {dependency: '1.0.0'}})),
    writeFile(path.join(packageRoot, 'index.js'), 'export {value} from "dependency";'),
    writeFile(path.join(dependencyRoot, 'package.json'), JSON.stringify({name: 'dependency', version: '1.0.0'})),
    writeFile(path.join(dependencyRoot, 'index.js'), 'export const value = 1;'),
  ]);
  const first = await buildInstalledDeploymentRuntimeManifest(appRoot);
  assert.equal(first.packageCount, 2);
  assert.equal(first.files.some((entry) => entry.path.endsWith('/dependency/index.js')), true);
  await writeFile(path.join(dependencyRoot, 'index.js'), 'export const value = 2;');
  const second = await buildInstalledDeploymentRuntimeManifest(appRoot);
  assert.notEqual(second.aggregateSha256, first.aggregateSha256);

  const escapedRoot = path.join(directory, 'escaped-app');
  const escapedPackage = path.join(escapedRoot, 'node_modules', ...LOCKED_PAD.package.split('/'));
  const ancestorDependency = path.join(directory, 'node_modules/dependency');
  await Promise.all([mkdir(escapedPackage, {recursive: true}), mkdir(ancestorDependency, {recursive: true})]);
  await Promise.all([
    writeFile(path.join(escapedPackage, 'package.json'), JSON.stringify({name: LOCKED_PAD.package, version: LOCKED_PAD.version, dependencies: {dependency: '1.0.0'}})),
    writeFile(path.join(ancestorDependency, 'package.json'), JSON.stringify({name: 'dependency', version: '1.0.0'})),
  ]);
  await assert.rejects(() => buildInstalledDeploymentRuntimeManifest(escapedRoot), /escaped worktree-local node_modules/u);
});

test('release source snapshots stream archives larger than the Node sync buffer', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'chopdot-git-archive-'));
  const source = path.join(directory, 'source');
  const destination = path.join(directory, 'destination');
  await Promise.all([mkdir(source), mkdir(destination)]);
  for (const args of [
    ['init', '--quiet'],
    ['config', 'user.name', 'ChopDot release test'],
    ['config', 'user.email', 'release-test@chopdot.invalid'],
  ]) {
    const result = spawnSync('git', args, {cwd: source, encoding: 'utf8'});
    assert.equal(result.status, 0, result.stderr);
  }
  const largeBytes = Buffer.alloc(2 * 1024 * 1024, 0x61);
  await writeFile(path.join(source, 'large.bin'), largeBytes);
  for (const args of [['add', 'large.bin'], ['commit', '--quiet', '-m', 'fixture']]) {
    const result = spawnSync('git', args, {cwd: source, encoding: 'utf8'});
    assert.equal(result.status, 0, result.stderr);
  }
  await extractGitArchive({source, destination});
  assert.deepEqual(await readFile(path.join(destination, 'large.bin')), largeBytes);
});

test('shape-only CID arguments without a locked deploy log cannot become evidence', () => {
  assert.throws(
    () => parseDeployLog(Buffer.from(`CID: ${cid}\nDomain: chopdotapp01.dot\n`), expectedLog),
    /locked-CLI attestation/,
  );
});

test('a locked log still fails without independently verifiable tx and block references', () => {
  const log = [
    `CHOPDOT_LOCKED_PAD ${JSON.stringify(header)}`,
    `Root CID: ${carRoot}`,
    `Setting contenthash on app.chopdotapp01.dot → ${cid}`,
    `Verified on-chain: ${cid}`,
    `Verified on-chain: ${cid}`,
    `CID: ${cid}`,
    'Domain: chopdotapp01.dot',
  ].join('\n');
  assert.throws(
    () => parseDeployLog(Buffer.from(log), expectedLog),
    /hash-and-block finalization/,
  );
});

test('deploy-log parser retains only valid CID and transaction inclusion inputs', () => {
  const log = [
    `CHOPDOT_LOCKED_PAD ${JSON.stringify(header)}`,
    `Root CID: ${carRoot}`,
    `Setting contenthash on app.chopdotapp01.dot → ${cid}`,
    `Verified on-chain: ${cid}`,
    `Verified on-chain: ${cid}`,
    `finalised @ block 12 (tx 0x${'11'.repeat(32)})`,
    `finalised @ block 13 (tx 0x${'22'.repeat(32)})`,
    `CID: ${cid}`,
    'Domain: chopdotapp01.dot',
  ].join('\n');
  const parsed = parseDeployLog(Buffer.from(log), expectedLog);
  assert.equal(parsed.finalContentCid, cid);
  assert.equal(parsed.transactions.length, 2);
  assert.equal(parsed.transactions[1].blockNumber, 13);
});

test('deploy-log parser binds source, lock, config, and directory hashes to exact release evidence', () => {
  const wrong = {...header, source: {...header.source, packageLockSha256: '00'.repeat(32)}};
  const log = [
    `CHOPDOT_LOCKED_PAD ${JSON.stringify(wrong)}`,
    `Root CID: ${carRoot}`,
    `Setting contenthash on app.chopdotapp01.dot → ${cid}`,
    `Verified on-chain: ${cid}`,
    `Verified on-chain: ${cid}`,
    `finalised @ block 12 (tx 0x${'11'.repeat(32)})`,
    `finalised @ block 13 (tx 0x${'22'.repeat(32)})`,
    `CID: ${cid}`,
    'Domain: chopdotapp01.dot',
  ].join('\n');
  assert.throws(() => parseDeployLog(Buffer.from(log), expectedLog), /attestation mismatch/u);
});

test('release evidence paths cannot escape the exact worktree', () => {
  assert.throws(() => safeRepoPath(root, '../outside.json', 'Evidence'), /inside the exact worktree/);
});

test('locked deploy arguments reject unknown and duplicated flags before invocation', () => {
  assert.throws(() => parseLockedDeployArgs(['dist-dot-host', 'x.dot', '--rpc=wss://evil']), /allowlist/);
  assert.throws(() => parseLockedDeployArgs(['x.dot', '--env=devnet', '--env=paseo-next-v2']), /only once/);
  const parsed = parseLockedDeployArgs(['dist-dot-host', 'x.dot', '--env=devnet', '--js-merkle']);
  assert.deepEqual(parsed.positionals, ['dist-dot-host', 'x.dot']);
  assert.equal(parsed.options.get('env'), 'devnet');
});

test('locked deploy derives the signed-in owner from exact CLI whoami output', () => {
  assert.equal(parseWhoamiAddress(`Logged in:\n  Root address: 5abc\n  Product address: 5def\n  H160 (EVM):      ${header.expectedDevinsonOwner}\n`), header.expectedDevinsonOwner);
  assert.throws(() => parseWhoamiAddress('Not logged in.'), /exactly one signed-in H160/u);
});

test('indexed transaction proof requires System.ExtrinsicSuccess and rejects failure', () => {
  const success = {phase: {type: 'ApplyExtrinsic', value: 2}, event: {type: 'System', value: {type: 'ExtrinsicSuccess', value: {}}}};
  assert.doesNotThrow(() => assertSuccessfulExtrinsic([success], 2));
  assert.throws(() => assertSuccessfulExtrinsic([{...success, event: {type: 'System', value: {type: 'ExtrinsicFailed', value: {}}}}], 2), /ExtrinsicSuccess/u);
});

test('recovery-head readback verifies stale rejection as the recorded owner', async () => {
  const owner = `0x${'12'.repeat(20)}`;
  let observed;
  const contract = {
    callStatic: {
      async advanceHead(...args) {
        observed = args;
        throw new Error('stale');
      },
    },
  };
  await assertStaleRejectedForOwner({
    contract,
    owner,
    stream: `0x${'34'.repeat(32)}`,
    sequence: '0',
    digest: `0x${'00'.repeat(32)}`,
    nextDigest: `0x${'56'.repeat(32)}`,
    errorMessage: 'stale write was accepted',
  });
  assert.deepEqual(observed.at(-1), {from: owner});

  await assert.rejects(
    () => assertStaleRejectedForOwner({
      contract: {callStatic: {advanceHead: async () => undefined}},
      owner,
      stream: `0x${'34'.repeat(32)}`,
      sequence: '0',
      digest: `0x${'00'.repeat(32)}`,
      nextDigest: `0x${'56'.repeat(32)}`,
      errorMessage: 'stale write was accepted',
    }),
    /stale write was accepted/u,
  );
});

test('recovery-head finality rejects an orphaned or changed receipt', () => {
  const expected = {
    status: 1,
    transactionHash: `0x${'12'.repeat(32)}`,
    blockNumber: 42,
    blockHash: `0x${'34'.repeat(32)}`,
  };
  assert.doesNotThrow(() => assertCanonicalReceipt({...expected}, expected));
  assert.throws(() => assertCanonicalReceipt(null, expected), /no longer canonical/u);
  assert.throws(
    () => assertCanonicalReceipt({...expected, blockHash: `0x${'56'.repeat(32)}`}, expected),
    /no longer canonical/u,
  );
});

test('locked deploy rejects dangerous environment overrides before any deployment work', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'chopdot-deploy-args-'));
  await mkdir(path.join(directory, 'dist-dot-host'));
  await writeFile(path.join(directory, 'dist-dot-host/release.json'), JSON.stringify({dirty: false, buildId: 'candidate'}));
  const env = {
    DO_NOT_TRACK: '1', PAD_UPDATE_CHECK: '0', RELEASE_ENV: 'devnet', RELEASE_COMMAND_MODE: 'stage',
    RELEASE_DOMAIN: 'chopdotapp01.dot', RELEASE_EXPECTED_DEVINSON_OWNER: header.expectedDevinsonOwner,
    RELEASE_SIGNED_IN_ADDRESS: header.expectedDevinsonOwner, RELEASE_OWNERSHIP_MODE: 'direct-devinson',
    IPFS_CID: cid,
  };
  await assert.rejects(() => validateLockedDeployInvocation({root: directory, argv: [], env}), /IPFS_CID/);
});

test('locked release requires Devinson-direct DotNS authority through manifest publication', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'chopdot-direct-owner-'));
  const env = {
    DO_NOT_TRACK: '1',
    PAD_UPDATE_CHECK: '0',
    RELEASE_ENV: 'devnet',
    RELEASE_COMMAND_MODE: 'stage',
    RELEASE_DOMAIN: 'chopdotapp01.dot',
    RELEASE_EXPECTED_DEVINSON_OWNER: header.expectedDevinsonOwner,
    RELEASE_SIGNED_IN_ADDRESS: header.expectedDevinsonOwner,
    RELEASE_OWNERSHIP_MODE: 'transfer-to-devinson',
  };
  const argv = [
    'dist-dot-host',
    'chopdotapp01.dot',
    '--env=devnet',
    '--environment-file=deployment/pad-environments-2026-08-23.json',
    '--config=polkadot-app-deploy.config.ts',
    '--js-merkle',
    '--dump-car=deployment/releases/candidate.car',
    '--tag=candidate',
  ];
  await assert.rejects(
    () => validateLockedDeployInvocation({root: directory, argv, env}),
    /must be direct-devinson/u,
  );
  await assert.rejects(
    () => validateLockedDeployInvocation({
      root: directory,
      argv,
      env: {...env, RELEASE_OWNERSHIP_MODE: 'direct-devinson'},
    }),
    /requires --no-transfer-to-signedin-user/u,
  );
});

async function makeCar(fileRecords) {
  const blocks = new Map();
  const blockstore = {
    async put(cidValue, bytes) { blocks.set(cidValue.toString(), {cid: cidValue, bytes}); },
    async get(cidValue) { return blocks.get(cidValue.toString())?.bytes; },
  };
  let rootEntry;
  for await (const entry of importer(fileRecords.map((entry) => ({path: entry.path, content: entry.bytes})), blockstore, {
    cidVersion: 1,
    rawLeaves: true,
    wrapWithDirectory: true,
  })) rootEntry = entry;
  const {writer, out} = CarWriter.create([rootEntry.cid]);
  const chunks = [];
  const draining = (async () => { for await (const chunk of out) chunks.push(Buffer.from(chunk)); })();
  for (const block of blocks.values()) await writer.put(block);
  await writer.close();
  await draining;
  return Buffer.concat(chunks);
}

async function makeDeployerCar(fileRecords, mutateManifest = (value) => value) {
  const blocks = new Map();
  const blockstore = {
    async put(cidValue, bytes) { blocks.set(cidValue.toString(), {cid: cidValue, bytes}); },
    async get(cidValue) { return blocks.get(cidValue.toString())?.bytes; },
  };
  const inputPaths = new Set(fileRecords.map((entry) => entry.path));
  const fileCids = new Map();
  for await (const entry of importer(fileRecords.map((entry) => ({path: entry.path, content: entry.bytes})), blockstore, {
    cidVersion: 1,
    rawLeaves: true,
    wrapWithDirectory: true,
  })) {
    if (inputPaths.has(entry.path)) fileCids.set(entry.path, entry.cid.toString());
  }
  assert.equal(fileCids.size, fileRecords.length);
  const deployManifest = mutateManifest({
    version: 3,
    previous_contenthash: null,
    deployed_at: '2026-08-24T00:00:00.000Z',
    framework: 'vite',
    files: Object.fromEntries(fileRecords.map((entry) => [entry.path, {
      cid: fileCids.get(entry.path),
      type: 'volatile',
      size: entry.bytes.byteLength,
    }])),
    stableBlockOrder: [],
    blocks: [],
    chunks: {},
  });
  const unordered = await makeCar([
    ...fileRecords,
    {
      path: '.bulletin-deploy/manifest.json',
      bytes: Buffer.from(JSON.stringify(deployManifest)),
    },
  ]);
  const ordered = await rebuildOrderedCarFromBytes(
    unordered,
    deployManifest.stableBlockOrder,
  );
  return Buffer.from(ordered.carBytes);
}

test('CAR proof reconstructs every UnixFS file and rejects a manifested hash mismatch', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'chopdot-car-test-'));
  const appBytes = Buffer.from('console.log("real")');
  const correctRelease = {
    files: [{path: 'assets/app.js', bytes: appBytes.byteLength, sha256: sha256(appBytes)}],
  };
  correctRelease.contentSha256 = sha256(`assets/app.js\0${correctRelease.files[0].sha256}\n`);
  const correctReleaseBytes = Buffer.from(`${JSON.stringify(correctRelease)}\n`);
  const correctFiles = [
    {path: 'assets/app.js', bytes: appBytes},
    {path: 'release.json', bytes: correctReleaseBytes},
  ];
  const correctCar = await makeDeployerCar(correctFiles);
  const correctCarPath = path.join(directory, 'correct.car');
  await writeFile(correctCarPath, correctCar);
  const verified = await inspectCar(correctCarPath, correctReleaseBytes, correctRelease);
  assert.equal(verified.allManifestedFilesValidated, true);
  assert.equal(verified.files.length, 2);
  assert.equal(verified.deployMetadata.path, '.bulletin-deploy/manifest.json');

  const invalidMetadataCar = await makeDeployerCar(correctFiles, (manifest) => {
    manifest.files['assets/app.js'].size += 1;
    return manifest;
  });
  const invalidMetadataPath = path.join(directory, 'invalid-metadata.car');
  await writeFile(invalidMetadataPath, invalidMetadataCar);
  await assert.rejects(
    () => inspectCar(invalidMetadataPath, correctReleaseBytes, correctRelease),
    /bulletin-deploy\/manifest\.json entry differs/u,
  );

  const release = {
    files: [{path: 'assets/app.js', bytes: appBytes.byteLength, sha256: '00'.repeat(32)}],
  };
  release.contentSha256 = sha256(`assets/app.js\0${release.files[0].sha256}\n`);
  const releaseBytes = Buffer.from(`${JSON.stringify(release)}\n`);
  const carBytes = await makeDeployerCar([
    {path: 'assets/app.js', bytes: appBytes},
    {path: 'release.json', bytes: releaseBytes},
  ]);
  const carPath = path.join(directory, 'candidate.car');
  await writeFile(carPath, carBytes);
  await assert.rejects(() => inspectCar(carPath, releaseBytes, release), /bytes differ for assets\/app.js/);
});

test('pre-write directory proof rejects unmanifested files even below a node_modules path', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'chopdot-dist-proof-'));
  const dist = path.join(directory, 'dist-dot-host');
  await mkdir(path.join(dist, 'node_modules'), {recursive: true});
  const appBytes = Buffer.from('app');
  const release = {files: [{path: 'app.js', bytes: appBytes.byteLength, sha256: sha256(appBytes)}]};
  release.contentSha256 = sha256(`app.js\0${release.files[0].sha256}\n`);
  const releaseBytes = Buffer.from(`${JSON.stringify(release)}\n`);
  await Promise.all([
    writeFile(path.join(dist, 'app.js'), appBytes),
    writeFile(path.join(dist, 'release.json'), releaseBytes),
    writeFile(path.join(dist, 'node_modules/unmanifested.js'), 'not allowed'),
  ]);
  await assert.rejects(() => verifyReleaseDirectory(directory, releaseBytes, release), /file count differs/u);
});
