import {execFileSync, spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {
  LOCKED_PAD,
  assertDomain,
  inspectCar,
  safeRepoPath,
  sha256,
  verifyLockedDeploymentCli,
  verifyReleaseDirectory,
  verifyEnvironmentAnchors,
} from './release-evidence.mjs';

const ENVIRONMENT_FILE = 'deployment/pad-environments-2026-08-23.json';
const CONFIG_FILE = 'polkadot-app-deploy.config.ts';
const FORBIDDEN_ENV = [
  'IPFS_CID', 'PAD_DUMP_CAR', 'PAD_ENV_FILE', 'PAD_GH_PAGES_REPO',
  'GH_PAGES_MIRROR', 'BULLETIN_RPC', 'MNEMONIC', 'SEED', 'PRIVATE_KEY',
  'NODE_OPTIONS', 'NODE_PATH',
];
const VALUE_FLAGS = new Set(['env', 'environment-file', 'config', 'tag', 'dump-car', 'input-car']);
const BOOLEAN_FLAGS = new Set(['js-merkle', 'no-transfer-to-signedin-user']);

function normalizedAddress(value, label) {
  if (!/^0x[0-9a-f]{40}$/i.test(value ?? '')) throw new Error(`${label} must be an explicit H160 address.`);
  return value.toLowerCase();
}

export function parseLockedDeployArgs(argv) {
  const options = new Map();
  const positionals = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }
    const separator = token.indexOf('=');
    const name = token.slice(2, separator < 0 ? undefined : separator);
    if (!VALUE_FLAGS.has(name) && !BOOLEAN_FLAGS.has(name)) {
      throw new Error(`Deploy argument --${name} is not in the locked release allowlist.`);
    }
    if (options.has(name)) throw new Error(`Deploy argument --${name} may appear only once.`);
    if (BOOLEAN_FLAGS.has(name)) {
      if (separator >= 0) throw new Error(`Boolean deploy argument --${name} must not carry a value.`);
      options.set(name, true);
      continue;
    }
    const value = separator >= 0 ? token.slice(separator + 1) : argv[++index];
    if (!value || value.startsWith('--')) throw new Error(`Deploy argument --${name} requires one value.`);
    options.set(name, value);
  }
  return {options, positionals};
}

export function parseWhoamiAddress(output) {
  const matches = [...String(output).matchAll(/^\s*H160 \(EVM\):\s*(0x[0-9a-f]{40})\s*$/gmi)]
    .map(match => match[1].toLowerCase());
  if (matches.length !== 1) throw new Error('Locked deployment could not read exactly one signed-in H160 address from CLI whoami.');
  return matches[0];
}

function git(root, ...args) {
  return execFileSync('git', args, {cwd: root, encoding: 'utf8'}).trim();
}

async function verifyCurrentReleaseSource(root, release, releaseBytes) {
  const status = git(root, 'status', '--porcelain=v1', '--untracked-files=all');
  if (status) throw new Error('Locked deployment refuses a dirty exact worktree.');
  if (git(root, 'rev-parse', 'HEAD') !== release.commit || git(root, 'rev-parse', 'HEAD^{tree}') !== release.tree) {
    throw new Error('Current exact-worktree commit/tree differs from release.json.');
  }
  const packageLockBytes = await readFile(path.join(root, 'package-lock.json'));
  if (sha256(packageLockBytes) !== release.packageLockSha256) throw new Error('Current package-lock.json differs from release.json.');
  if (release.polkadotAppDeploy?.configFile !== CONFIG_FILE) throw new Error('release.json does not bind the locked deployment config path.');
  const configBytes = await readFile(path.join(root, CONFIG_FILE));
  if (sha256(configBytes) !== release.polkadotAppDeploy.configFileSha256) {
    throw new Error('Current deployment config differs from release.json.');
  }
  const launcher = release.polkadotAppDeploy?.launcher;
  for (const [pathField, hashField, expectedPath] of [
    ['shellFile', 'shellFileSha256', 'scripts/deploy-locked.sh'],
    ['bootstrapFile', 'bootstrapFileSha256', 'scripts/run-locked-polkadot-app-deploy.mjs'],
    ['driverFile', 'driverFileSha256', 'scripts/lib/locked-deploy-driver.mjs'],
    ['evidenceLibraryFile', 'evidenceLibraryFileSha256', 'scripts/lib/release-evidence.mjs'],
  ]) {
    if (launcher?.[pathField] !== expectedPath
      || sha256(await readFile(path.join(root, expectedPath))) !== launcher?.[hashField]) {
      throw new Error(`Current deployment launcher source ${expectedPath} differs from release.json.`);
    }
  }
  const directory = await verifyReleaseDirectory(root, releaseBytes, release);
  return {
    commit: release.commit,
    tree: release.tree,
    packageLockSha256: release.packageLockSha256,
    configFileSha256: release.polkadotAppDeploy.configFileSha256,
    directory,
  };
}

export async function validateLockedDeployInvocation({root, argv, env}) {
  for (const name of FORBIDDEN_ENV) {
    if (env[name] !== undefined && env[name] !== '') throw new Error(`Dangerous deploy environment override ${name} is forbidden.`);
  }
  if (env.DO_NOT_TRACK !== '1' || env.PAD_UPDATE_CHECK !== '0') {
    throw new Error('Locked deployment requires DO_NOT_TRACK=1 and PAD_UPDATE_CHECK=0.');
  }
  const environment = env.RELEASE_ENV;
  const mode = env.RELEASE_COMMAND_MODE;
  if (!['devnet', 'paseo-next-v2'].includes(environment)) throw new Error('Set RELEASE_ENV explicitly to devnet or paseo-next-v2.');
  if ((mode === 'stage') !== (environment === 'devnet') || (mode === 'promote') !== (environment === 'paseo-next-v2')) {
    throw new Error('RELEASE_COMMAND_MODE must be stage for devnet or promote for paseo-next-v2.');
  }
  const domain = assertDomain(env.RELEASE_DOMAIN);
  const expectedOwner = normalizedAddress(env.RELEASE_EXPECTED_DEVINSON_OWNER, 'RELEASE_EXPECTED_DEVINSON_OWNER');
  const signedInAddress = normalizedAddress(env.RELEASE_SIGNED_IN_ADDRESS, 'RELEASE_SIGNED_IN_ADDRESS');
  if (signedInAddress !== expectedOwner) throw new Error('Signed-in public address must equal the explicitly approved Devinson owner.');
  const ownershipMode = env.RELEASE_OWNERSHIP_MODE;
  if (!['transfer-to-devinson', 'direct-devinson'].includes(ownershipMode)) {
    throw new Error('RELEASE_OWNERSHIP_MODE must be transfer-to-devinson or direct-devinson.');
  }

  const {options, positionals} = parseLockedDeployArgs(argv);
  if (options.get('env') !== environment) throw new Error('CLI --env must equal RELEASE_ENV.');
  if (positionals.length !== (mode === 'stage' ? 2 : 1)) throw new Error('Deploy positional argument count does not match the locked command mode.');
  if (mode === 'stage' && path.normalize(positionals[0]) !== 'dist-dot-host') throw new Error('Staging must publish exactly dist-dot-host.');
  if (positionals.at(-1) !== domain) throw new Error('CLI positional domain must equal RELEASE_DOMAIN exactly.');
  if (options.get('environment-file') !== ENVIRONMENT_FILE || options.get('config') !== CONFIG_FILE) {
    throw new Error('Deploy must use the reviewed worktree-local environment and config files exactly.');
  }
  const noTransfer = options.has('no-transfer-to-signedin-user');
  if ((ownershipMode === 'direct-devinson') !== noTransfer) throw new Error('Ownership flag conflicts with RELEASE_OWNERSHIP_MODE.');

  const releaseBytes = await readFile(path.join(root, 'dist-dot-host/release.json'));
  const release = JSON.parse(releaseBytes);
  if (release.dirty) throw new Error('Locked deploy refuses a release.json built from a dirty worktree.');
  if (options.get('tag') !== release.buildId) throw new Error('CLI --tag must equal release.json buildId.');
  const expectedCar = `deployment/releases/${release.buildId}.car`;
  let carEvidence = null;
  if (mode === 'stage') {
    if (!options.has('js-merkle')) throw new Error('Devnet CAR creation requires --js-merkle.');
    if (options.has('input-car')) throw new Error('Devnet staging may not consume an input CAR.');
    if (options.get('dump-car') !== expectedCar) throw new Error(`Devnet --dump-car must be exactly ${expectedCar}.`);
    safeRepoPath(root, expectedCar, 'Dump CAR');
  } else {
    if (options.has('js-merkle') || options.has('dump-car')) throw new Error('Paseo promotion may not rebuild or dump another CAR.');
    if (options.get('input-car') !== expectedCar) throw new Error(`Paseo --input-car must be exactly ${expectedCar}.`);
    const car = safeRepoPath(root, expectedCar, 'Input CAR');
    carEvidence = await inspectCar(car.absolute, releaseBytes, release);
    if (!/^[0-9a-f]{64}$/.test(env.RELEASE_CAR_SHA256 ?? '') || env.RELEASE_CAR_SHA256 !== carEvidence.sha256) {
      throw new Error('RELEASE_CAR_SHA256 must exactly approve the fully validated Devnet CAR.');
    }
  }
  return {environment, mode, domain, expectedOwner, signedInAddress, ownershipMode, release, releaseBytes, carEvidence};
}

async function main() {
  const root = process.cwd();
  const argv = process.argv.slice(2);
  const validated = await validateLockedDeployInvocation({root, argv, env: process.env});
  const [anchors, source] = await Promise.all([
    verifyEnvironmentAnchors(root, validated.environment),
    verifyCurrentReleaseSource(root, validated.release, validated.releaseBytes),
  ]);
  const environmentFile = path.join(root, ENVIRONMENT_FILE);
  if (validated.release.polkadotAppDeploy?.environmentFileSha256 !== sha256(await readFile(environmentFile))) {
    throw new Error('Deploy environment file differs from release.json.');
  }
  const driverDirectory = path.dirname(fileURLToPath(import.meta.url));
  const runtimeRoot = path.dirname(driverDirectory);
  const childEnv = {...process.env};
  delete childEnv.NODE_OPTIONS;
  delete childEnv.NODE_PATH;
  if (!driverDirectory.startsWith(`${runtimeRoot}${path.sep}`) || path.resolve(runtimeRoot) === path.resolve(root)) {
    throw new Error('Locked deployment driver is not running from the isolated runtime.');
  }
  const tool = await verifyLockedDeploymentCli(runtimeRoot, {childEnv});
  if (JSON.stringify(tool) !== JSON.stringify(validated.release.polkadotAppDeploy?.lockedCli)) {
    throw new Error('Fresh isolated deployment runtime differs from the immutable release attestation.');
  }
  let whoamiOutput;
  try {
    whoamiOutput = execFileSync(process.execPath, [path.join(runtimeRoot, LOCKED_PAD.bin), 'whoami', '--env', validated.environment], {
      cwd: root,
      env: childEnv,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    throw new Error(`Locked deployment could not verify the current CLI login: ${error.stderr?.toString().trim() || error.message}`);
  }
  const actualSignedInAddress = parseWhoamiAddress(whoamiOutput);
  if (actualSignedInAddress !== validated.expectedOwner || actualSignedInAddress !== validated.signedInAddress) {
    throw new Error('CLI whoami address does not equal the explicitly approved Devinson owner.');
  }
  const header = {
    schema: 'chopdot.locked-pad-attestation.v2',
    package: tool.package,
    version: tool.version,
    integrity: tool.integrity,
    packageAggregateSha256: tool.packageAggregateSha256,
    runtimePackages: tool.runtimePackages,
    runtimeFiles: tool.runtimeFiles,
    runtimeAggregateSha256: tool.runtimeAggregateSha256,
    executableSha256: tool.executableSha256,
    commandMode: validated.mode,
    environment: validated.environment,
    domain: validated.domain,
    expectedDevinsonOwner: validated.expectedOwner,
    signedInAddress: validated.signedInAddress,
    whoamiAddress: actualSignedInAddress,
    whoamiOutputSha256: sha256(whoamiOutput.trim()),
    ownershipMode: validated.ownershipMode,
    environmentFileSha256: validated.release.polkadotAppDeploy.environmentFileSha256,
    releaseJsonSha256: sha256(validated.releaseBytes),
    buildId: validated.release.buildId,
    carSha256: validated.carEvidence?.sha256 ?? null,
    endpointCodeAnchorSha256: anchors.evidence.codeAnchorFileSha256,
    source,
  };
  console.log(`CHOPDOT_LOCKED_PAD ${JSON.stringify(header)}`);
  const result = spawnSync(process.execPath, [path.join(runtimeRoot, LOCKED_PAD.bin), ...argv], {
    cwd: root,
    env: childEnv,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await main();
