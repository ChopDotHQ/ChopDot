import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {copyFile, mkdtemp, readFile, readdir, realpath, rm, stat} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {CarReader} from '@ipld/car';
import * as dagPB from '@ipld/dag-pb';
import {blake2AsHex, cryptoWaitReady} from '@polkadot/util-crypto';
import {ethers} from 'ethers';
import {UnixFS} from 'ipfs-unixfs';
import {CID} from 'multiformats/cid';
import {sha256 as multiformatsSha256} from 'multiformats/hashes/sha2';
import {createWsClient} from 'polkadot-api/ws';

export const LOCKED_PAD = Object.freeze({
  package: '@polkadot-community-foundation/polkadot-app-deploy',
  version: '0.13.1',
  integrity: 'sha512-WkJSk9VP5phpXcIAzsea8oEEBGRK4vFO56YP1n+iP2PEDGhUf4KyIpgwH2jkSZndNFXtUuVCf+DPRfnkYoRmVA==',
  bin: 'node_modules/@polkadot-community-foundation/polkadot-app-deploy/bin/polkadot-app-deploy',
  packageFiles: 157,
  packageAggregateSha256: 'e6c792e015a1f824b8ee97a92e675e01a6b357c9dfd4ade9c61ce9930d8ea327',
  runtimePackages: 528,
  runtimeFiles: 39363,
  runtimeAggregateSha256: '804d0831a28d280665dbd5d3480df14229b640bedfcadaa198fd236f689c2c7d',
  runtimeVersionOutputSha256: 'e5a9b32c19b237e0f9ce98774fc0b71eb3e0922bfb2d7c6cc8e9f34875888363',
});
export const LOCKED_STORAGE_MODE = 'shared-testnet-pool';
export const LOCKED_STORAGE_POOL_ACCOUNT_INDEX = 2;
export const DIRECT_OWNER_RUNTIME_NAME = 'chopdot-direct-owner-runtime.mjs';
export const DIRECT_OWNER_MANIFEST_NAME = 'chopdot-direct-owner-publish.mjs';
export const LOCKED_MANIFEST_PUBLISH_MODULE = 'node_modules/@polkadot-community-foundation/polkadot-app-deploy/dist/chunk-VLRVCVNH.js';

export function createDirectOwnerCliSource(source) {
  const importNeedle = 'import * as readline from "readline";';
  const deployNeedle = '  const result = await deploy(buildDir, domain, {';
  const poolSizeNeedle = '    poolSize: flags.poolSize,';
  const manifestImportNeedle = '    const { tryLoadProductConfig, publishManifest } = await import("../dist/index.js");';
  const manifestOptionsNeedle = '          mnemonic: flags.mnemonic,\n          derivationPath: flags.derivationPath,';
  const successNeedle = '  if (!flags.help && !flags.version) {\n    try { writeRunState({ status: "succeeded", endedAt: Date.now() }); } catch {}';
  for (const needle of [
    importNeedle,
    deployNeedle,
    poolSizeNeedle,
    manifestImportNeedle,
    manifestOptionsNeedle,
    successNeedle,
  ]) {
    if (source.split(needle).length !== 2) {
      throw new Error(`Official deploy CLI adapter expected exactly one source anchor: ${needle}`);
    }
  }
  if (source.includes('chopdotStorageAccount') || source.includes('storageSigner:') || source.includes('chopdotSession')) {
    throw new Error('Official deploy CLI already contains a signer-adapter path; the locked adapter requires review.');
  }
  return source
    .replace(
      importNeedle,
      `${importNeedle}\nimport { derivePoolAccounts } from "../dist/index.js";\n`
        + 'import { getAuthClient } from "../dist/auth-config.js";\n'
        + `import { requireDirectOwnerSession } from "./${DIRECT_OWNER_RUNTIME_NAME}";`,
    )
    .replace(
      deployNeedle,
      '  const chopdotExpectedOwner = process.env.RELEASE_EXPECTED_DEVINSON_OWNER;\n'
        + '  const chopdotAuthClient = await getAuthClient(flags.env ?? DEFAULT_ENV_ID);\n'
        + '  const chopdotSession = await requireDirectOwnerSession(\n'
        + '    chopdotAuthClient,\n'
        + '    chopdotExpectedOwner,\n'
        + '    message => new NonRetryableError(message),\n'
        + '  );\n'
        + '  const chopdotConfirmPhoneReady = ({ label, attempt }) => new Promise((resolve, reject) => {\n'
        + '    console.log(`\\n   Check your phone → ${label}${attempt >= 2 ? ` (attempt ${attempt})` : ""}`);\n'
        + '    console.log("   Press Y when ready (Ctrl-C to abort):");\n'
        + '    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });\n'
        + '    let settled = false;\n'
        + '    const settle = fn => { if (!settled) { settled = true; rl.close(); fn(); } };\n'
        + '    rl.on("close", () => settle(() => reject(new Error("aborted by user"))));\n'
        + '    const ask = () => rl.question("   > ", line => {\n'
        + '      if (["y", ""].includes(line.trim().toLowerCase())) settle(resolve); else ask();\n'
        + '    });\n'
        + '    ask();\n'
        + '  });\n'
        + `  const chopdotStorageAccount = derivePoolAccounts(flags.poolSize ?? 10)[${LOCKED_STORAGE_POOL_ACCOUNT_INDEX}];\n`
        + '  if (!chopdotStorageAccount) throw new Error("Pinned ChopDot shared testnet storage account is unavailable.");\n'
        + deployNeedle,
    )
    .replace(
      poolSizeNeedle,
      `${poolSizeNeedle}\n    signer: chopdotSession.signer,\n`
        + '    signerAddress: chopdotSession.addresses.productAddress,\n'
        + '    storageSigner: chopdotStorageAccount.signer,\n'
        + '    storageSignerAddress: chopdotStorageAccount.address,',
    )
    .replace(
      manifestImportNeedle,
      '    const { tryLoadProductConfig } = await import("../dist/index.js");\n'
        + `    const { publishManifest } = await import("../dist/${DIRECT_OWNER_MANIFEST_NAME}");`,
    )
    .replace(
      manifestOptionsNeedle,
      `${manifestOptionsNeedle}\n          signer: chopdotSession.signer,\n`
        + '          signerAddress: chopdotSession.addresses.productAddress,\n'
        + '          expectedOwner: chopdotExpectedOwner,\n'
        + '          confirmPhoneReady: chopdotConfirmPhoneReady,',
    )
    .replace(successNeedle, `  chopdotSession.destroy();\n\n${successNeedle}`);
}

export function createDirectOwnerManifestPublishSource(source) {
  const shimNeedle = [
    '  const deployOptsShim = {',
    '    mnemonic: opts.mnemonic,',
    '    derivationPath: opts.derivationPath',
    '  };',
  ].join('\n');
  const connectNeedle = '  await dotns.connect(connectOpts);';
  for (const needle of [shimNeedle, connectNeedle]) {
    if (source.split(needle).length !== 2) {
      throw new Error(`Official manifest publisher adapter expected exactly one source anchor: ${needle}`);
    }
  }
  if (source.includes('opts.signerAddress') || source.includes('expectedOwner')) {
    throw new Error('Official manifest publisher already contains an owner-signer path; the locked adapter requires review.');
  }
  return source
    .replace(
      shimNeedle,
      [
        '  const deployOptsShim = {',
        '    signer: opts.signer,',
        '    signerAddress: opts.signerAddress',
        '  };',
      ].join('\n'),
    )
    .replace(
      connectNeedle,
      '  await dotns.connect({...connectOpts, phoneSigner: true, confirmPhoneReady: opts.confirmPhoneReady});\n'
        + '  if (dotns.evmAddress?.toLowerCase() !== String(opts.expectedOwner ?? "").toLowerCase()) {\n'
        + '    dotns.disconnect();\n'
        + '    throw new NonRetryableError("Manifest DotNS signer differs from the approved direct owner.");\n'
        + '  }',
    );
}

const ROOT_MANIFEST_ABI = [
  'function ownerOf(uint256 tokenId) view returns (address)',
];
const REGISTRY_ABI = [
  'function owner(bytes32 node) view returns (address)',
  'function resolver(bytes32 node) view returns (address)',
];
const CONTENT_RESOLVER_ABI = [
  'function contenthash(bytes32 node) view returns (bytes)',
  'function text(bytes32 node, string key) view returns (string)',
];
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEPLOY_METADATA_PATH = '.bulletin-deploy/manifest.json';
let orderedCarToolsPromise;

async function orderedCarTools() {
  if (!orderedCarToolsPromise) {
    const deployEntry = import.meta.resolve(`${LOCKED_PAD.package}/deploy`);
    const internalModule = new URL('./chunk-7W5KOX5X.js', deployEntry);
    orderedCarToolsPromise = import(internalModule.href).then((module) => {
      if (
        typeof module.rebuildOrderedCarFromBytes !== 'function'
        || typeof module.computeStorageCid !== 'function'
      ) {
        throw new Error('Pinned deployment runtime lacks ordered-CAR reconstruction tools.');
      }
      return module;
    });
  }
  return orderedCarToolsPromise;
}

async function computeBulletinStorageCid(chunks) {
  const chunkInfo = [];
  for (const chunk of chunks) {
    const digest = await multiformatsSha256.digest(chunk);
    chunkInfo.push({cid: CID.create(1, 0x55, digest), len: chunk.byteLength});
  }
  const fileData = new UnixFS({
    type: 'file',
    blockSizes: chunkInfo.map((entry) => BigInt(entry.len)),
  });
  const dagBytes = dagPB.encode(dagPB.prepare({
    Data: fileData.marshal(),
    Links: chunkInfo.map((entry) => ({Name: '', Tsize: entry.len, Hash: entry.cid})),
  }));
  return CID.create(1, dagPB.code, await multiformatsSha256.digest(dagBytes)).toString();
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function parseArgument(name, argv = process.argv.slice(2)) {
  const prefix = `--${name}=`;
  return argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length);
}

export function requireArgument(name, argv = process.argv.slice(2)) {
  const value = parseArgument(name, argv);
  if (!value) throw new Error(`Missing explicit --${name}=...`);
  return value;
}

export function assertDomain(value) {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.dot$/.test(value ?? '')) {
    throw new Error('Domain must be one lowercase DotNS name ending in .dot.');
  }
  return value;
}

export function safeRepoPath(root, candidate, label) {
  const absolute = path.resolve(root, candidate);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`${label} must be a file inside the exact worktree.`);
  }
  return {absolute, relative};
}

async function readJson(file) {
  const bytes = await readFile(file);
  return {bytes, value: JSON.parse(bytes)};
}

async function regularFileManifest(directory, prefix = '', {skipNodeModules = false} = {}) {
  const records = [];
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    if (skipNodeModules && entry.name === 'node_modules') continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) records.push(...await regularFileManifest(absolute, relative, {skipNodeModules}));
    else if (entry.isFile()) {
      const bytes = await readFile(absolute);
      records.push({path: relative, bytes: bytes.byteLength, sha256: sha256(bytes)});
    } else {
      throw new Error(`Locked deployment CLI package contains unsupported entry ${relative}.`);
    }
  }
  return records.sort((a, b) => a.path.localeCompare(b.path));
}

async function resolveInstalledDependency(packageRoot, dependencyName) {
  let searchRoot = packageRoot;
  while (searchRoot !== path.dirname(searchRoot)) {
    const candidate = path.join(searchRoot, 'node_modules', ...dependencyName.split('/'));
    try {
      const packageRecord = await readJson(path.join(candidate, 'package.json'));
      if (packageRecord.value.name !== dependencyName) {
        throw new Error(`resolved package name is ${packageRecord.value.name}.`);
      }
      return candidate;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    searchRoot = path.dirname(searchRoot);
  }
  throw new Error('package is not installed in the Node resolution ancestry.');
}

export async function buildInstalledDeploymentRuntimeManifest(root) {
  const canonicalWorktreeRoot = await realpath(root);
  const nodeModulesRoot = await realpath(path.join(root, 'node_modules'));
  const entryRoot = path.join(nodeModulesRoot, ...LOCKED_PAD.package.split('/'));
  const queue = [entryRoot];
  const visited = new Set();
  const packages = [];
  const files = [];

  while (queue.length > 0) {
    const packageRoot = queue.shift();
    const canonicalRoot = await realpath(packageRoot);
    const relativeRoot = path.relative(canonicalWorktreeRoot, canonicalRoot).split(path.sep).join('/');
    const nodeModulesRelative = path.relative(nodeModulesRoot, canonicalRoot);
    if (!relativeRoot.startsWith('node_modules/') || nodeModulesRelative.startsWith(`..${path.sep}`) || path.isAbsolute(nodeModulesRelative)) {
      throw new Error(`Deployment runtime package escaped worktree-local node_modules: ${relativeRoot}.`);
    }
    if (visited.has(canonicalRoot)) continue;
    visited.add(canonicalRoot);

    const packageRecord = await readJson(path.join(canonicalRoot, 'package.json'));
    const packageFiles = await regularFileManifest(canonicalRoot, '', {skipNodeModules: true});
    packages.push({
      name: packageRecord.value.name,
      version: packageRecord.value.version,
      root: relativeRoot,
      packageJsonSha256: sha256(packageRecord.bytes),
    });
    files.push(...packageFiles.map((entry) => ({...entry, path: `${relativeRoot}/${entry.path}`})));

    const mandatory = new Set(Object.keys(packageRecord.value.dependencies ?? {}));
    const optional = new Set(Object.keys(packageRecord.value.optionalDependencies ?? {}));
    const peers = new Set(Object.keys(packageRecord.value.peerDependencies ?? {}));
    const optionalPeers = packageRecord.value.peerDependenciesMeta ?? {};
    for (const dependencyName of [...new Set([...mandatory, ...optional, ...peers])].sort()) {
      try {
        queue.push(await resolveInstalledDependency(canonicalRoot, dependencyName));
      } catch (error) {
        if (optional.has(dependencyName) || optionalPeers[dependencyName]?.optional === true) continue;
        throw new Error(`${packageRecord.value.name}@${packageRecord.value.version} cannot resolve runtime dependency ${dependencyName}: ${error.message}`);
      }
    }
  }

  packages.sort((a, b) => a.root.localeCompare(b.root));
  files.sort((a, b) => a.path.localeCompare(b.path));
  return {
    packages,
    files,
    packageCount: packages.length,
    fileCount: files.length,
    aggregateSha256: sha256(files.map((entry) => `${entry.path}\0${entry.sha256}\n`).join('')),
  };
}

export async function verifyLockedDeploymentCli(root, {verifyRuntime = true, childEnv = process.env} = {}) {
  const packageJson = await readJson(path.join(root, 'package.json'));
  const lock = await readJson(path.join(root, 'package-lock.json'));
  const installedPackagePath = path.join(root, 'node_modules', ...LOCKED_PAD.package.split('/'), 'package.json');
  const installedPackageRoot = path.dirname(installedPackagePath);
  const installed = await readJson(installedPackagePath);
  const binPath = path.join(root, LOCKED_PAD.bin);
  const binBytes = await readFile(binPath);
  const lockEntry = lock.value.packages?.[`node_modules/${LOCKED_PAD.package}`];
  if (packageJson.value.devDependencies?.[LOCKED_PAD.package] !== LOCKED_PAD.version) {
    throw new Error(`package.json must pin ${LOCKED_PAD.package} exactly to ${LOCKED_PAD.version}.`);
  }
  if (lockEntry?.version !== LOCKED_PAD.version || lockEntry?.integrity !== LOCKED_PAD.integrity) {
    throw new Error('package-lock.json does not carry the reviewed deployment CLI version/integrity.');
  }
  if (installed.value.name !== LOCKED_PAD.package || installed.value.version !== LOCKED_PAD.version) {
    throw new Error('The worktree-local deployment CLI installation does not match the lock.');
  }
  if (installed.value.bin?.['polkadot-app-deploy'] !== './bin/polkadot-app-deploy') {
    throw new Error('The locked package no longer exposes the expected deployment executable.');
  }
  const packageFiles = await regularFileManifest(installedPackageRoot, '', {skipNodeModules: true});
  if (packageFiles.length !== LOCKED_PAD.packageFiles) throw new Error('Locked deployment CLI package file count differs from the reviewed package.');
  const packageAggregateSha256 = sha256(packageFiles.map((entry) => `${entry.path}\0${entry.sha256}\n`).join(''));
  if (packageAggregateSha256 !== LOCKED_PAD.packageAggregateSha256) throw new Error('Locked deployment CLI package-owned file aggregate differs from the reviewed package.');
  const runtime = verifyRuntime ? await buildInstalledDeploymentRuntimeManifest(root) : null;
  if (runtime && (
    runtime.packageCount !== LOCKED_PAD.runtimePackages
    || runtime.fileCount !== LOCKED_PAD.runtimeFiles
    || runtime.aggregateSha256 !== LOCKED_PAD.runtimeAggregateSha256
  )) throw new Error('Installed deployment CLI runtime dependency closure differs from the reviewed bytes.');
  let versionOutput;
  try {
    versionOutput = execFileSync(binPath, ['--version'], {cwd: root, env: childEnv, encoding: 'utf8'}).trim();
  } catch (error) {
    throw new Error(`Locked deployment CLI cannot report its version: ${error.stderr?.toString() ?? error.message}`);
  }
  if (!versionOutput.includes(LOCKED_PAD.version)) throw new Error('Locked deployment CLI runtime version differs from package lock.');
  if (sha256(versionOutput) !== LOCKED_PAD.runtimeVersionOutputSha256) throw new Error('Locked deployment CLI runtime version output differs from review.');
  return {
    package: LOCKED_PAD.package,
    version: LOCKED_PAD.version,
    integrity: LOCKED_PAD.integrity,
    executable: LOCKED_PAD.bin,
    executableSha256: sha256(binBytes),
    packageFiles: packageFiles.length,
    packageAggregateSha256,
    runtimePackages: runtime?.packageCount ?? null,
    runtimeFiles: runtime?.fileCount ?? null,
    runtimeAggregateSha256: runtime?.aggregateSha256 ?? null,
    runtimeVersionOutputSha256: sha256(versionOutput),
    installedPackageJsonSha256: sha256(installed.bytes),
    packageLockSha256: sha256(lock.bytes),
  };
}

export async function withIsolatedDeploymentRuntime(sourceRoot, action = async ({evidence}) => evidence) {
  const isolatedRoot = await mkdtemp(path.join(os.tmpdir(), 'chopdot-pad-runtime-'));
  const childEnv = {...process.env};
  delete childEnv.NODE_OPTIONS;
  delete childEnv.NODE_PATH;
  try {
    let ancestor = path.dirname(isolatedRoot);
    while (true) {
      try {
        await stat(path.join(ancestor, 'node_modules'));
        throw new Error(`Isolated deployment runtime has an ancestor node_modules at ${ancestor}.`);
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
      const parent = path.dirname(ancestor);
      if (parent === ancestor) break;
      ancestor = parent;
    }
    const sourcePackage = path.join(sourceRoot, 'package.json');
    const sourceLock = path.join(sourceRoot, 'package-lock.json');
    await Promise.all([
      copyFile(sourcePackage, path.join(isolatedRoot, 'package.json')),
      copyFile(sourceLock, path.join(isolatedRoot, 'package-lock.json')),
    ]);
    execFileSync('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], {
      cwd: isolatedRoot,
      env: childEnv,
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    const evidence = await verifyLockedDeploymentCli(isolatedRoot, {childEnv});
    if (evidence.packageLockSha256 !== sha256(await readFile(sourceLock))) {
      throw new Error('Isolated deployment runtime package-lock differs from the exact source worktree.');
    }
    return await action({root: isolatedRoot, evidence, childEnv});
  } finally {
    await rm(isolatedRoot, {recursive: true, force: true});
  }
}

async function websocketRequests(url, requests, timeoutMs = 25_000) {
  if (typeof WebSocket !== 'function') throw new Error('Node.js WebSocket support is required.');
  return new Promise((resolve, reject) => {
    const replies = new Map();
    const pending = new Set(requests.map((request) => request.id));
    const socket = new WebSocket(url);
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { socket.close(); } catch {}
      fn(value);
    };
    const timer = setTimeout(
      () => finish(reject, new Error(`Timed out reading ${url}.`)),
      timeoutMs,
    );
    socket.onopen = () => {
      for (const request of requests) socket.send(JSON.stringify(request));
    };
    socket.onerror = () => finish(reject, new Error(`WebSocket read failed for ${url}.`));
    socket.onmessage = (message) => {
      const reply = JSON.parse(String(message.data));
      if (!pending.has(reply.id)) return;
      if (reply.error) {
        finish(reject, new Error(`RPC ${reply.id} failed: ${JSON.stringify(reply.error)}`));
        return;
      }
      replies.set(reply.id, reply.result);
      pending.delete(reply.id);
      if (pending.size === 0) finish(resolve, replies);
    };
  });
}

export async function loadDeploymentContext(root, environment) {
  const [targetsRecord, padRecord, anchorsRecord] = await Promise.all([
    readJson(path.join(root, 'deployment/recovery-head-index-targets.json')),
    readJson(path.join(root, 'deployment/pad-environments-2026-08-23.json')),
    readJson(path.join(root, 'deployment/dotns-code-anchors-2026-08-23.json')),
  ]);
  const target = targetsRecord.value.environments?.[environment];
  const pad = padRecord.value.environments?.find((entry) => entry.id === environment);
  const anchors = anchorsRecord.value.environments?.[environment];
  if (!target || !pad || !anchors) {
    throw new Error('Environment must be explicit devnet or paseo-next-v2.');
  }
  if (anchors.ethRpc !== target.ethRpc) throw new Error(`${environment} ETH endpoint/anchor mismatch.`);
  for (const [key, anchor] of Object.entries(anchors.contracts)) {
    if (pad.contracts?.[key]?.toLowerCase() !== anchor.address.toLowerCase()) {
      throw new Error(`${environment} ${key} address differs between official override and code anchor.`);
    }
  }
  return {
    target,
    pad,
    anchors,
    targetFileSha256: sha256(targetsRecord.bytes),
    environmentFileSha256: sha256(padRecord.bytes),
    codeAnchorFileSha256: sha256(anchorsRecord.bytes),
  };
}

export async function verifyEnvironmentAnchors(root, environment) {
  const context = await loadDeploymentContext(root, environment);
  const {target, anchors} = context;
  const provider = new ethers.providers.JsonRpcProvider(target.ethRpc);
  const observedNetwork = await provider.getNetwork();
  if (observedNetwork.chainId !== target.chainId) {
    throw new Error(`${environment} EVM chain id mismatch.`);
  }
  const latestBlockNumber = await provider.getBlockNumber();
  const latestBlock = await provider.getBlock(latestBlockNumber);
  if (!latestBlock?.hash) throw new Error(`${environment} ETH RPC did not return its latest block hash.`);
  const contracts = {};
  await Promise.all(Object.entries(anchors.contracts).map(async ([key, expected]) => {
    const code = await provider.getCode(expected.address, latestBlockNumber);
    if (code === '0x') throw new Error(`${environment} ${key} has no code at ${expected.address}.`);
    const bytes = Buffer.from(code.slice(2), 'hex');
    const observed = {address: ethers.utils.getAddress(expected.address), bytes: bytes.byteLength, sha256: sha256(bytes)};
    if (observed.bytes !== expected.bytes || observed.sha256 !== expected.sha256) {
      throw new Error(`${environment} ${key} code differs from the endpoint-bound immutable anchor.`);
    }
    contracts[key] = observed;
  }));
  const substrate = await websocketRequests(target.assetHubWss, [
    {jsonrpc: '2.0', id: 1, method: 'chain_getBlockHash', params: [0]},
    {jsonrpc: '2.0', id: 2, method: 'system_chain', params: []},
  ]);
  if (substrate.get(1)?.toLowerCase() !== target.assetHubGenesis.toLowerCase()) {
    throw new Error(`${environment} corroborating Substrate genesis mismatch.`);
  }
  return {
    context,
    provider,
    evidence: {
      environment,
      ethRpc: target.ethRpc,
      chainId: observedNetwork.chainId,
      endpointIdentity: 'environment-specific DotNS code set read through the same ETH RPC endpoint',
      latestEthBlock: {number: latestBlockNumber, hash: latestBlock.hash},
      codeAnchorFileSha256: context.codeAnchorFileSha256,
      contracts: Object.fromEntries(Object.entries(contracts).sort(([a], [b]) => a.localeCompare(b))),
      corroboratingAssetHubWss: target.assetHubWss,
      corroboratingAssetHubGenesis: substrate.get(1),
      corroboratingChainName: substrate.get(2),
    },
  };
}

function validateReleaseFileManifest(release) {
  if (!Array.isArray(release?.files) || release.files.length === 0) throw new Error('release.files must be a non-empty array.');
  const seen = new Set();
  for (const entry of release.files) {
    if (
      typeof entry?.path !== 'string'
      || entry.path !== entry.path.normalize?.('NFC')
      || entry.path.startsWith('/')
      || entry.path.split('/').some((part) => !part || part === '.' || part === '..')
      || !Number.isSafeInteger(entry.bytes)
      || entry.bytes < 0
      || !/^[0-9a-f]{64}$/.test(entry.sha256 ?? '')
    ) throw new Error('release.files contains an unsafe or malformed entry.');
    if (entry.path === 'release.json' || seen.has(entry.path)) throw new Error(`release.files contains duplicate/reserved path ${entry.path}.`);
    seen.add(entry.path);
  }
  const ordered = [...release.files].sort((a, b) => a.path.localeCompare(b.path));
  if (JSON.stringify(ordered) !== JSON.stringify(release.files)) throw new Error('release.files must be strictly path-sorted.');
  const aggregate = sha256(release.files.map((entry) => `${entry.path}\0${entry.sha256}\n`).join(''));
  if (aggregate !== release.contentSha256) throw new Error('release.files aggregate differs from release.contentSha256.');
}

export async function verifyReleaseDirectory(root, releaseBytes, release = JSON.parse(releaseBytes)) {
  validateReleaseFileManifest(release);
  const directory = path.join(root, 'dist-dot-host');
  const observed = await regularFileManifest(directory);
  const expected = [...release.files, {
    path: 'release.json',
    bytes: releaseBytes.byteLength,
    sha256: sha256(releaseBytes),
  }].sort((a, b) => a.path.localeCompare(b.path));
  if (observed.length !== expected.length) throw new Error('dist-dot-host file count differs from the immutable release manifest.');
  for (let index = 0; index < expected.length; index += 1) {
    if (JSON.stringify(observed[index]) !== JSON.stringify(expected[index])) {
      throw new Error(`dist-dot-host bytes differ for ${expected[index]?.path ?? observed[index]?.path ?? 'an unknown path'}.`);
    }
  }
  return {
    files: observed.length,
    aggregateSha256: sha256(observed.map((entry) => `${entry.path}\0${entry.sha256}\n`).join('')),
  };
}

async function reconstructUnixFs(reader, rootCid) {
  const blocks = new Map();
  for await (const block of reader.blocks()) {
    if (block.cid.multihash.code !== multiformatsSha256.code) throw new Error(`CAR block ${block.cid} uses a non-SHA-256 multihash.`);
    const digest = await multiformatsSha256.digest(block.bytes);
    const recomputed = CID.create(block.cid.version, block.cid.code, digest);
    if (!recomputed.equals(block.cid)) throw new Error(`CAR block ${block.cid} failed content verification.`);
    blocks.set(block.cid.toString(), Buffer.from(block.bytes));
  }
  if (!blocks.size) throw new Error('Promotion CAR contains no blocks.');
  const visited = new Set();
  const decoded = new Map();
  async function decode(cid) {
    const key = cid.toString();
    if (decoded.has(key)) return decoded.get(key);
    const bytes = blocks.get(key);
    if (!bytes) throw new Error(`CAR DAG references missing block ${key}.`);
    visited.add(key);
    if (cid.code === 0x55) {
      const value = {kind: 'file', bytes};
      decoded.set(key, value);
      return value;
    }
    if (cid.code !== dagPB.code) throw new Error(`CAR DAG uses unsupported codec ${cid.code}.`);
    const node = dagPB.decode(bytes);
    const unixfs = UnixFS.unmarshal(node.Data ?? new Uint8Array());
    if (unixfs.type === 'directory') {
      const names = new Set();
      const entries = [];
      for (const link of node.Links) {
        const name = link.Name ?? '';
        if (!name || name.includes('/') || name === '.' || name === '..' || names.has(name)) throw new Error('CAR directory contains an unsafe or duplicate name.');
        names.add(name);
        entries.push({name, cid: link.Hash.toString(), value: await decode(link.Hash)});
      }
      const value = {kind: 'directory', entries};
      decoded.set(key, value);
      return value;
    }
    if (unixfs.type !== 'file' && unixfs.type !== 'raw') throw new Error(`Unsupported UnixFS entry type ${unixfs.type}.`);
    const pieces = [Buffer.from(unixfs.data ?? new Uint8Array())];
    for (const link of node.Links) {
      const child = await decode(link.Hash);
      if (child.kind !== 'file') throw new Error('UnixFS file links to a non-file child.');
      pieces.push(child.bytes);
    }
    const value = {kind: 'file', bytes: Buffer.concat(pieces)};
    decoded.set(key, value);
    return value;
  }
  const root = await decode(rootCid);
  if (root.kind !== 'directory') throw new Error('Promotion CAR root must be a wrapped UnixFS directory.');
  if (visited.size !== blocks.size) throw new Error(`Promotion CAR contains ${blocks.size - visited.size} unreachable block(s).`);
  const files = new Map();
  function flatten(directory, prefix = '') {
    for (const entry of directory.entries) {
      const entryPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.value.kind === 'directory') flatten(entry.value, entryPath);
      else {
        if (files.has(entryPath)) throw new Error(`CAR contains duplicate file path ${entryPath}.`);
        files.set(entryPath, {bytes: entry.value.bytes, cid: entry.cid});
      }
    }
  }
  flatten(root);
  return {files, blocks: blocks.size, reachableBlocks: visited.size};
}

export async function inspectCar(carPath, releaseBytes, release = JSON.parse(releaseBytes)) {
  validateReleaseFileManifest(release);
  const file = await stat(carPath);
  if (!file.isFile() || file.size === 0) throw new Error('Promotion CAR is missing or empty.');
  if (file.size > 128 * 1024 * 1024) throw new Error('Promotion CAR exceeds the bounded 128 MiB release limit.');
  const bytes = await readFile(carPath);
  const reader = await CarReader.fromBytes(bytes);
  const roots = await reader.getRoots();
  if (roots.length !== 1) throw new Error('Promotion CAR must contain exactly one root CID.');
  const rootCid = CID.parse(roots[0].toString()).toString();
  const reconstructed = await reconstructUnixFs(reader, roots[0]);
  const expectedProductFiles = [
    ...release.files,
    {path: 'release.json', bytes: releaseBytes.byteLength, sha256: sha256(releaseBytes)},
  ];
  const expectedPaths = new Set(expectedProductFiles.map((entry) => entry.path));
  if (reconstructed.files.size !== expectedPaths.size + 1) {
    throw new Error('CAR UnixFS file count differs from the release files plus exact deploy metadata.');
  }
  const metadataRecord = reconstructed.files.get(DEPLOY_METADATA_PATH);
  if (!metadataRecord) throw new Error(`CAR lacks ${DEPLOY_METADATA_PATH}.`);
  let deployMetadata;
  try {
    deployMetadata = JSON.parse(metadataRecord.bytes.toString('utf8'));
  } catch (error) {
    throw new Error(`CAR ${DEPLOY_METADATA_PATH} is not valid JSON: ${error.message}`);
  }
  const deployedAt = Date.parse(deployMetadata.deployed_at);
  if (
    deployMetadata.version !== 3
    || deployMetadata.framework !== 'vite'
    || !(deployMetadata.previous_contenthash === null || typeof deployMetadata.previous_contenthash === 'string')
    || !Number.isFinite(deployedAt)
    || !deployMetadata.files
    || typeof deployMetadata.files !== 'object'
    || Array.isArray(deployMetadata.files)
    || !Array.isArray(deployMetadata.stableBlockOrder)
    || !Array.isArray(deployMetadata.blocks)
    || !deployMetadata.chunks
    || typeof deployMetadata.chunks !== 'object'
    || Array.isArray(deployMetadata.chunks)
  ) {
    throw new Error(`CAR ${DEPLOY_METADATA_PATH} has an invalid v3 deployment manifest shape.`);
  }
  if (deployMetadata.previous_contenthash !== null) CID.parse(deployMetadata.previous_contenthash);
  const metadataPaths = Object.keys(deployMetadata.files).sort();
  if (JSON.stringify(metadataPaths) !== JSON.stringify([...expectedPaths].sort())) {
    throw new Error(`CAR ${DEPLOY_METADATA_PATH} does not index exactly the immutable release files.`);
  }
  const verifiedFiles = [];
  for (const entry of expectedProductFiles) {
    const observed = reconstructed.files.get(entry.path);
    if (!observed || observed.bytes.byteLength !== entry.bytes || sha256(observed.bytes) !== entry.sha256) {
      throw new Error(`CAR UnixFS bytes differ for ${entry.path}.`);
    }
    const metadataEntry = deployMetadata.files[entry.path];
    if (
      !metadataEntry
      || metadataEntry.size !== entry.bytes
      || metadataEntry.cid !== observed.cid
      || !['stable', 'volatile'].includes(metadataEntry.type)
    ) {
      throw new Error(`CAR ${DEPLOY_METADATA_PATH} entry differs for ${entry.path}.`);
    }
    CID.parse(metadataEntry.cid);
    expectedPaths.delete(entry.path);
    verifiedFiles.push({path: entry.path, bytes: observed.bytes.byteLength, sha256: sha256(observed.bytes)});
  }
  for (const observedPath of reconstructed.files.keys()) {
    if (!new Set([...expectedProductFiles.map((entry) => entry.path), DEPLOY_METADATA_PATH]).has(observedPath)) {
      throw new Error(`CAR contains unmanifested file ${observedPath}.`);
    }
  }
  const {rebuildOrderedCarFromBytes, computeStorageCid} = await orderedCarTools();
  const orderedCar = await rebuildOrderedCarFromBytes(bytes, deployMetadata.stableBlockOrder);
  if (
    orderedCar.carBytes.byteLength !== bytes.byteLength
    || sha256(orderedCar.carBytes) !== sha256(bytes)
  ) {
    throw new Error('Pinned deployer cannot reconstruct the exact ordered CAR bytes.');
  }
  const storageCid = await computeBulletinStorageCid(orderedCar.chunks);
  if (storageCid !== computeStorageCid(orderedCar.chunks)) {
    throw new Error('Independent Bulletin storage CID differs from the pinned deployer prediction.');
  }
  verifiedFiles.sort((a, b) => a.path.localeCompare(b.path));
  return {
    bytes: bytes.byteLength,
    sha256: sha256(bytes),
    rootCid: storageCid,
    unixFsRootCid: rootCid,
    storageChunks: orderedCar.chunks.length,
    orderedCarReproduced: true,
    blocks: reconstructed.blocks,
    reachableBlocks: reconstructed.reachableBlocks,
    releaseJsonBytesObserved: true,
    allManifestedFilesValidated: true,
    deployMetadata: {
      path: DEPLOY_METADATA_PATH,
      bytes: metadataRecord.bytes.byteLength,
      sha256: sha256(metadataRecord.bytes),
      cid: metadataRecord.cid,
      version: deployMetadata.version,
      previousContenthash: deployMetadata.previous_contenthash,
      deployedAt: deployMetadata.deployed_at,
      framework: deployMetadata.framework,
      fileCount: metadataPaths.length,
    },
    files: verifiedFiles,
    filesAggregateSha256: sha256(verifiedFiles.map((entry) => `${entry.path}\0${entry.sha256}\n`).join('')),
  };
}

function stripAnsi(value) {
  return value.replaceAll(/\u001b\[[0-9;]*m/g, '');
}

export function parseDeployLog(logBytes, expected) {
  const text = stripAnsi(logBytes.toString('utf8'));
  const headerLine = text.split(/\r?\n/).find((line) => line.startsWith('CHOPDOT_LOCKED_PAD '));
  if (!headerLine) throw new Error('Deploy log lacks the locked-CLI attestation header.');
  const header = JSON.parse(headerLine.slice('CHOPDOT_LOCKED_PAD '.length));
  if (
    header.schema !== 'chopdot.locked-pad-attestation.v3'
    || header.package !== LOCKED_PAD.package
    || header.version !== LOCKED_PAD.version
    || header.integrity !== LOCKED_PAD.integrity
    || header.environment !== expected.environment
    || header.commandMode !== (expected.environment === 'devnet' ? 'stage' : 'promote')
    || header.domain !== expected.domain
    || header.expectedDevinsonOwner?.toLowerCase() !== expected.expectedOwner?.toLowerCase()
    || header.signedInAddress?.toLowerCase() !== expected.expectedOwner?.toLowerCase()
    || header.whoamiAddress?.toLowerCase() !== expected.expectedOwner?.toLowerCase()
    || !/^[0-9a-f]{64}$/.test(header.whoamiOutputSha256 ?? '')
    || header.ownershipMode !== 'direct-devinson'
    || header.storageMode !== LOCKED_STORAGE_MODE
    || header.storagePoolAccountIndex !== LOCKED_STORAGE_POOL_ACCOUNT_INDEX
    || !/^[0-9a-f]{64}$/.test(header.adaptedExecutableSha256 ?? '')
    || !/^[0-9a-f]{64}$/.test(header.directOwnerRuntimeSha256 ?? '')
    || !/^[0-9a-f]{64}$/.test(header.adaptedManifestPublisherSha256 ?? '')
    || !/^[0-9a-f]{64}$/.test(header.packageAggregateSha256 ?? '')
    || header.runtimePackages !== LOCKED_PAD.runtimePackages
    || header.runtimeFiles !== LOCKED_PAD.runtimeFiles
    || header.runtimeAggregateSha256 !== LOCKED_PAD.runtimeAggregateSha256
    || !/^[0-9a-f]{64}$/.test(header.releaseJsonSha256 ?? '')
    || header.source?.commit !== expected.commit
    || header.source?.tree !== expected.tree
    || header.source?.packageLockSha256 !== expected.packageLockSha256
    || header.source?.configFileSha256 !== expected.configFileSha256
    || header.source?.directory?.aggregateSha256 !== expected.directoryAggregateSha256
    || header.source?.directory?.files !== expected.directoryFiles
  ) {
    throw new Error('Deploy log locked-CLI/environment/domain attestation mismatch.');
  }
  const finalCids = [...text.matchAll(/^CID:\s*(\S+)\s*$/gm)].map((match) => CID.parse(match[1]).toString());
  const domains = [...text.matchAll(/^Domain:\s*(\S+)\s*$/gm)].map((match) => match[1]);
  const rootCids = [...text.matchAll(/Root CID:\s*(\S+)/g)].map((match) => CID.parse(match[1]).toString());
  if (finalCids.length !== 1) throw new Error('Deploy log must contain exactly one final CLI CID line.');
  if (finalCids[0] !== expected.carRootCid) throw new Error('Published content CID differs from the fully reconstructed CAR root CID.');
  if (domains.length !== 1 || domains[0] !== expected.domain) throw new Error('Deploy log final domain mismatch.');
  if (!rootCids.includes(expected.carRootCid)) throw new Error('Deploy log does not identify the parsed CAR root CID.');
  if (!text.includes(`Setting contenthash on app.${expected.domain}`)) {
    throw new Error('Deploy log does not show app-subname contenthash publication.');
  }
  const verifiedEffects = [...text.matchAll(/^\s*Verified on-chain:\s*(\S+)\s*$/gm)].map((match) => CID.parse(match[1]).toString());
  if (verifiedEffects.filter((value) => value === finalCids[0]).length < 2) {
    throw new Error('Deploy log lacks successful post-transaction readback for both base and app contenthash writes.');
  }
  const transactions = [];
  const seen = new Set();
  for (const match of text.matchAll(/finalised @ block\s+(\d+)\s+\(tx\s+(0x[0-9a-f]{64})\)/gi)) {
    const key = match[2].toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    transactions.push({blockNumber: Number(match[1]), transactionHash: key});
  }
  if (transactions.length < 2) {
    throw new Error('Deploy log lacks at least two hash-and-block finalization records for base/app publication proof.');
  }
  return {
    header,
    finalContentCid: finalCids[0],
    carRootCids: [...new Set(rootCids)],
    transactions,
    verifiedContenthashEffects: verifiedEffects,
  };
}

function contenthashCall(node, cidValue) {
  const cid = CID.parse(cidValue);
  const contenthash = ethers.utils.hexlify(Buffer.concat([Buffer.from([0xe3, 0x01]), Buffer.from(cid.bytes)]));
  const iface = new ethers.utils.Interface(['function setContenthash(bytes32 node, bytes hash)']);
  return iface.encodeFunctionData('setContenthash', [node, contenthash]);
}

export function assertSuccessfulExtrinsic(events, extrinsicIndex) {
  const matching = events.filter((record) => record?.phase?.type === 'ApplyExtrinsic'
    && Number(record.phase.value) === extrinsicIndex);
  const succeeded = matching.some((record) => record?.event?.type === 'System'
    && record.event.value?.type === 'ExtrinsicSuccess');
  const failed = matching.some((record) => record?.event?.type === 'System'
    && record.event.value?.type === 'ExtrinsicFailed');
  if (!succeeded || failed) throw new Error(`Extrinsic ${extrinsicIndex} lacks an unambiguous System.ExtrinsicSuccess event.`);
}

async function verifyTransactions(wss, transactions, contentResolver, semanticCalls) {
  await cryptoWaitReady();
  const verified = [];
  const client = createWsClient(wss);
  try {
    const finalized = await client.getFinalizedBlock();
    const api = client.getUnsafeApi();
    for (let index = 0; index < transactions.length; index += 1) {
      const item = transactions[index];
      if (!Number.isSafeInteger(item.blockNumber) || item.blockNumber > finalized.number) {
        throw new Error(`Transaction ${item.transactionHash} is not below the independently observed finalized head.`);
      }
      const replies = await websocketRequests(wss, [
        {jsonrpc: '2.0', id: index * 2 + 1, method: 'chain_getBlockHash', params: [item.blockNumber]},
      ]);
      const blockHash = replies.get(index * 2 + 1);
      if (!/^0x[0-9a-f]{64}$/i.test(blockHash ?? '')) throw new Error(`No block hash for ${item.blockNumber}.`);
      const blockReply = await websocketRequests(wss, [
        {jsonrpc: '2.0', id: index * 2 + 2, method: 'chain_getBlock', params: [blockHash]},
      ]);
      const extrinsics = blockReply.get(index * 2 + 2)?.block?.extrinsics ?? [];
      const hashes = extrinsics.map((extrinsic) => blake2AsHex(extrinsic, 256).toLowerCase());
      const extrinsicIndex = hashes.indexOf(item.transactionHash.toLowerCase());
      if (extrinsicIndex < 0) {
        throw new Error(`Transaction ${item.transactionHash} was not found in independently read block ${item.blockNumber}.`);
      }
      const events = await api.query.System.Events.getValue({at: blockHash});
      assertSuccessfulExtrinsic(events, extrinsicIndex);
      const extrinsic = extrinsics[extrinsicIndex].toLowerCase();
      const resolverBytes = contentResolver.toLowerCase().slice(2);
      const semanticMatches = semanticCalls.filter((entry) => (
        extrinsic.includes(resolverBytes) && extrinsic.includes(entry.callData.toLowerCase().slice(2))
      ));
      verified.push({
        ...item,
        blockHash,
        extrinsicIndex,
        finality: {
          finalizedHeadNumber: finalized.number,
          finalizedHeadHash: finalized.hash,
          systemExtrinsicSuccess: true,
        },
        extrinsicBytes: (extrinsic.length - 2) / 2,
        extrinsicSha256: sha256(Buffer.from(extrinsic.slice(2), 'hex')),
        semanticProofs: semanticMatches.map((entry) => ({
          kind: entry.kind,
          contract: ethers.utils.getAddress(contentResolver),
          node: entry.node,
          callDataSha256: sha256(Buffer.from(entry.callData.slice(2), 'hex')),
        })),
      });
    }
  } finally {
    client.destroy();
  }
  for (const expected of semanticCalls) {
    if (!verified.some((entry) => entry.semanticProofs.some((proof) => proof.kind === expected.kind))) {
      throw new Error(`No independently included transaction carries the exact ${expected.kind} DotNS contenthash call.`);
    }
  }
  return verified;
}

function decodeContenthash(value, label) {
  const bytes = Buffer.from(ethers.utils.arrayify(value));
  if (bytes.length < 4 || bytes[0] !== 0xe3 || bytes[1] !== 0x01) {
    throw new Error(`${label} is not an IPFS contenthash value.`);
  }
  return CID.decode(bytes.subarray(2)).toString();
}

function exactKeys(value, expected, label) {
  const actualKeys = Object.keys(value ?? {}).sort();
  const expectedKeys = [...expected].sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) throw new Error(`${label} has unexpected or missing fields.`);
}

async function readDotns(provider, context, domain, expectedOwner) {
  const label = domain.slice(0, -4);
  const baseNode = ethers.utils.namehash(domain);
  const appDomain = `app.${domain}`;
  const appNode = ethers.utils.namehash(appDomain);
  const registrar = new ethers.Contract(context.pad.contracts.DOTNS_REGISTRAR, ROOT_MANIFEST_ABI, provider);
  const registry = new ethers.Contract(context.pad.contracts.DOTNS_REGISTRY, REGISTRY_ABI, provider);
  const resolver = new ethers.Contract(context.pad.contracts.DOTNS_CONTENT_RESOLVER, CONTENT_RESOLVER_ABI, provider);
  const [baseOwner, appOwner, baseResolver, appResolver, baseContenthash, appContenthash, rootText, executableText] = await Promise.all([
    registrar.ownerOf(ethers.BigNumber.from(baseNode)),
    registry.owner(appNode),
    registry.resolver(baseNode),
    registry.resolver(appNode),
    resolver.contenthash(baseNode),
    resolver.contenthash(appNode),
    resolver.text(baseNode, 'manifest'),
    resolver.text(appNode, 'executable'),
  ]);
  const expectedResolver = context.pad.contracts.DOTNS_CONTENT_RESOLVER;
  for (const [name, address] of [['base owner', baseOwner], ['app owner', appOwner]]) {
    if (address.toLowerCase() === ZERO_ADDRESS) throw new Error(`${name} is zero for ${domain}.`);
  }
  if (baseOwner.toLowerCase() !== appOwner.toLowerCase()) throw new Error('Base/app DotNS owners differ.');
  if (baseOwner.toLowerCase() !== expectedOwner.toLowerCase()) throw new Error('DotNS owner is not the explicitly approved Devinson public address.');
  if (baseResolver.toLowerCase() !== expectedResolver.toLowerCase() || appResolver.toLowerCase() !== expectedResolver.toLowerCase()) {
    throw new Error('Base/app DotNS resolver does not match the anchored content resolver.');
  }
  const rootManifest = JSON.parse(rootText);
  const executableManifest = JSON.parse(executableText);
  exactKeys(rootManifest, ['$v', 'displayName', 'description', 'icon'], 'Root DotNS manifest');
  exactKeys(rootManifest.icon, ['cid', 'format'], 'Root DotNS icon manifest');
  exactKeys(executableManifest, ['$v', 'kind', 'appVersion'], 'App DotNS executable manifest');
  if (
    rootManifest.$v !== 1
    || rootManifest.displayName !== 'ChopDot'
    || rootManifest.description !== 'Split shared spending, collect payments, and keep one clear group record.'
    || rootManifest.icon.format !== 'png'
  ) throw new Error('Root DotNS manifest differs from the exact reviewed ChopDot manifest.');
  CID.parse(rootManifest.icon.cid);
  if (
    executableManifest.$v !== 1
    || executableManifest.kind !== 'app'
    || JSON.stringify(executableManifest.appVersion) !== JSON.stringify([0, 1, 0])
  ) throw new Error('App DotNS executable manifest differs from the exact reviewed manifest.');
  return {
    label,
    domain,
    appDomain,
    baseNode,
    appNode,
    owner: ethers.utils.getAddress(baseOwner),
    baseResolver: ethers.utils.getAddress(baseResolver),
    appResolver: ethers.utils.getAddress(appResolver),
    rootContentCid: decodeContenthash(baseContenthash, 'Base contenthash'),
    appContentCid: decodeContenthash(appContenthash, 'App contenthash'),
    rootManifest,
    executableManifest,
  };
}

function urlPath(base, relativePath, query = '') {
  const encoded = relativePath.split('/').map(encodeURIComponent).join('/');
  return `${base.replace(/\/$/, '')}/${encoded}${query}`;
}

async function fetchExactFile(url, expected) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(url, {redirect: 'follow', signal: controller.signal, cache: 'no-store'});
    if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}.`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength !== expected.bytes || sha256(bytes) !== expected.sha256) throw new Error(`${url} does not serve exact bytes for ${expected.path}.`);
    return {path: expected.path, url, finalUrl: response.url, status: response.status, bytes: bytes.byteLength, sha256: sha256(bytes)};
  } finally {
    clearTimeout(timer);
  }
}

async function fetchGatewayManifest(base, query, release, releaseBytes) {
  const expected = [...release.files, {path: 'release.json', bytes: releaseBytes.byteLength, sha256: sha256(releaseBytes)}];
  const files = [];
  for (const entry of expected) files.push(await fetchExactFile(urlPath(base, entry.path, query), entry));
  files.sort((a, b) => a.path.localeCompare(b.path));
  return {
    baseUrl: base,
    files,
    fileCount: files.length,
    htmlJsCssCount: files.filter((entry) => /\.(?:html|js|css)$/.test(entry.path)).length,
    filesAggregateSha256: sha256(files.map((entry) => `${entry.path}\0${entry.sha256}\n`).join('')),
  };
}

export async function generateReadbackEvidence({root, environment, domain, car, deployLog, expectedOwner}) {
  domain = assertDomain(domain);
  expectedOwner = ethers.utils.getAddress(expectedOwner);
  const carPath = safeRepoPath(root, car, 'Promotion CAR');
  const deployLogPath = safeRepoPath(root, deployLog, 'Deploy log');
  const releasePath = path.join(root, 'dist-dot-host/release.json');
  const releaseBytes = await readFile(releasePath);
  const release = JSON.parse(releaseBytes);
  if (release.dirty) throw new Error('Live release readback refuses a dirty candidate.');
  const carEvidence = await inspectCar(carPath.absolute, releaseBytes, release);
  const logBytes = await readFile(deployLogPath.absolute);
  const cli = await withIsolatedDeploymentRuntime(root, async ({root: isolatedRoot, evidence}) => {
    const officialExecutableBytes = await readFile(path.join(isolatedRoot, LOCKED_PAD.bin), 'utf8');
    const officialManifestPublisherBytes = await readFile(path.join(isolatedRoot, LOCKED_MANIFEST_PUBLISH_MODULE), 'utf8');
    return {
      ...evidence,
      adaptedExecutableSha256: sha256(createDirectOwnerCliSource(officialExecutableBytes)),
      directOwnerRuntimeSha256: sha256(await readFile(path.join(root, 'scripts/lib/direct-owner-runtime.mjs'))),
      adaptedManifestPublisherSha256: sha256(createDirectOwnerManifestPublishSource(officialManifestPublisherBytes)),
    };
  });
  const log = parseDeployLog(logBytes, {
    environment,
    domain,
    expectedOwner,
    carRootCid: carEvidence.rootCid,
    commit: release.commit,
    tree: release.tree,
    packageLockSha256: release.packageLockSha256,
    configFileSha256: release.polkadotAppDeploy.configFileSha256,
    directoryAggregateSha256: carEvidence.filesAggregateSha256,
    directoryFiles: release.files.length + 1,
  });
  if (
    log.header.executableSha256 !== cli.executableSha256
    || log.header.packageAggregateSha256 !== cli.packageAggregateSha256
    || log.header.runtimePackages !== cli.runtimePackages
    || log.header.runtimeFiles !== cli.runtimeFiles
    || log.header.runtimeAggregateSha256 !== cli.runtimeAggregateSha256
    || log.header.adaptedExecutableSha256 !== cli.adaptedExecutableSha256
    || log.header.directOwnerRuntimeSha256 !== cli.directOwnerRuntimeSha256
    || log.header.adaptedManifestPublisherSha256 !== cli.adaptedManifestPublisherSha256
    || log.header.releaseJsonSha256 !== sha256(releaseBytes)
    || log.header.environmentFileSha256 !== release.polkadotAppDeploy?.environmentFileSha256
  ) {
    throw new Error('Deploy log tool/environment hash differs from the immutable release.');
  }
  const anchored = await verifyEnvironmentAnchors(root, environment);
  const dotns = await readDotns(anchored.provider, anchored.context, domain, expectedOwner);
  if (dotns.rootContentCid !== log.finalContentCid || dotns.appContentCid !== log.finalContentCid) {
    throw new Error('Independent base/app DotNS content readback differs from the deploy CID.');
  }
  const semanticCalls = [
    {kind: 'base-contenthash', node: dotns.baseNode, callData: contenthashCall(dotns.baseNode, log.finalContentCid)},
    {kind: 'app-contenthash', node: dotns.appNode, callData: contenthashCall(dotns.appNode, log.finalContentCid)},
  ];
  const transactions = await verifyTransactions(
    anchored.context.target.assetHubWss,
    log.transactions,
    anchored.context.pad.contracts.DOTNS_CONTENT_RESOLVER,
    semanticCalls,
  );
  const browserBase = `https://${dotns.label}.${anchored.context.pad.webGateway}`;
  const directIpfsBase = `${anchored.context.pad.ipfs.replace(/\/$/, '')}/ipfs/${log.finalContentCid}`;
  const [browser, directIpfs, icon] = await Promise.all([
    fetchGatewayManifest(browserBase, '?chainBackend=rpc-gateway', release, releaseBytes),
    fetchGatewayManifest(directIpfsBase, '', release, releaseBytes),
    fetchExactFile(`${anchored.context.pad.ipfs.replace(/\/$/, '')}/ipfs/${dotns.rootManifest.icon.cid}`, release.icon),
  ]);
  if (icon.path !== release.icon.path) throw new Error('DotNS icon proof path mismatch.');
  return {
    schema: 'chopdot.dot-host-live-readback.v3',
    environment,
    domain,
    checkedAt: new Date().toISOString(),
    release: {
      path: 'dist-dot-host/release.json',
      sha256: sha256(releaseBytes),
      buildId: release.buildId,
      commit: release.commit,
      tree: release.tree,
    },
    car: {path: carPath.relative, ...carEvidence},
    deployLog: {
      path: deployLogPath.relative,
      bytes: logBytes.byteLength,
      sha256: sha256(logBytes),
      lockedTool: cli,
      finalContentCid: log.finalContentCid,
      carRootCids: log.carRootCids,
      verifiedContenthashEffects: log.verifiedContenthashEffects,
    },
    endpoint: anchored.evidence,
    dotns,
    expectedDevinsonOwner: expectedOwner,
    icon,
    transactions,
    gateways: {browser, directIpfs},
  };
}

function stableReadbackIdentity(value) {
  return {
    schema: value.schema,
    environment: value.environment,
    domain: value.domain,
    release: value.release,
    expectedDevinsonOwner: value.expectedDevinsonOwner,
    car: value.car,
    deployLog: value.deployLog,
    dotns: value.dotns,
    icon: value.icon,
    transactions: value.transactions,
    gateways: value.gateways,
    endpoint: {
      environment: value.endpoint?.environment,
      ethRpc: value.endpoint?.ethRpc,
      chainId: value.endpoint?.chainId,
      codeAnchorFileSha256: value.endpoint?.codeAnchorFileSha256,
      contracts: value.endpoint?.contracts,
      corroboratingAssetHubWss: value.endpoint?.corroboratingAssetHubWss,
      corroboratingAssetHubGenesis: value.endpoint?.corroboratingAssetHubGenesis,
    },
  };
}

export async function verifyReadbackEvidence(root, evidencePath) {
  const safe = safeRepoPath(root, evidencePath, 'Readback evidence');
  const record = await readJson(safe.absolute);
  if (record.value.schema !== 'chopdot.dot-host-live-readback.v3') throw new Error('Readback evidence schema mismatch.');
  const fresh = await generateReadbackEvidence({
    root,
    environment: record.value.environment,
    domain: record.value.domain,
    car: record.value.car.path,
    deployLog: record.value.deployLog.path,
    expectedOwner: record.value.expectedDevinsonOwner,
  });
  if (JSON.stringify(stableReadbackIdentity(fresh)) !== JSON.stringify(stableReadbackIdentity(record.value))) {
    throw new Error(`Live readback no longer matches ${safe.relative}.`);
  }
  return {path: safe.relative, sha256: sha256(record.bytes), value: record.value, fresh};
}
