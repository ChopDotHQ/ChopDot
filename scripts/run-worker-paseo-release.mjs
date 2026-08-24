import {execFileSync, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cp, mkdtemp, mkdir, readFile, realpath, rm, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {pathToFileURL} from 'node:url';

const EXACT_ROOT = '/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch';
const CANDIDATE_COMMIT = 'cd61093b2af158ca1ba08f26c84c732f30007d4d';
const CANDIDATE_TREE = '3b4b2807ed02880fdc3fea060f576548fcdc1dcb';
const ENVIRONMENT = 'paseo-next-v2';
const DOMAIN = 'chopdotapp01.dot';
const OWNER = '0xb76021eefd3932c51dec30fe9c681984d72f923e';
const CAR_SHA256 = 'b9fa8263b7f83c05a32547803078db1bbb47c232c5fc8d07b4f8f5657a34a6ae';
const GIT = '/usr/bin/git';
const TAR = '/usr/bin/tar';
const NPM = path.join(path.dirname(process.execPath), 'npm');
const SAFE_PATH = `${path.dirname(process.execPath)}:/usr/bin:/bin`;
const MODES = new Set(['identity', 'preflight', 'release', 'verify-final']);
const TOOL_FILES = Object.freeze([
  'package.json',
  'scripts/run-worker-paseo-release.sh',
  'scripts/run-worker-paseo-release.mjs',
  'scripts/lib/worker-paseo-release-driver.mjs',
  'scripts/lib/worker-paseo-release.mjs',
  'scripts/worker-paseo-release-driver.test.mjs',
  'scripts/worker-paseo-release.test.mjs',
  'deployment/README.md',
  'docs/adr/0003-immutable-testnet-promotion.md',
  'docs/wiki/07-quality/release-checklist.md',
  'docs/superpowers/plans/2026-08-22-chopdot-full-product-dot-devnet-deployment-execution.md',
]);
const FROZEN_CAR = 'deployment/releases/chopdot-cd61093b2af1-68ce7c04192f.car';

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function git(root, ...args) {
  return execFileSync(GIT, args, {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
}

export function validateReleaseInvocation(argv, env) {
  if (argv.length !== 3 || !MODES.has(argv[2])) {
    throw new Error(`Worker release mode must be exactly one of ${[...MODES].join(', ')}.`);
  }
  if (argv[2] === 'identity') {
    if (env.CHOPDOT_WORKER_RELEASE_SHELL !== '1') {
      throw new Error('Tooling identity must run through the release shell.');
    }
    return argv[2];
  }
  const exact = {
    CHOPDOT_WORKER_RELEASE_SHELL: '1',
    DO_NOT_TRACK: '1',
    PAD_UPDATE_CHECK: '0',
    RELEASE_ENV: ENVIRONMENT,
    RELEASE_DOMAIN: DOMAIN,
    RELEASE_EXPECTED_DEVINSON_OWNER: OWNER,
    RELEASE_CAR_SHA256: CAR_SHA256,
  };
  for (const [name, value] of Object.entries(exact)) {
    if ((env[name] ?? '').toLowerCase() !== value.toLowerCase()) {
      throw new Error(`${name} differs from the approved release value.`);
    }
  }
  if (!/^[0-9a-f]{40}$/.test(env.RELEASE_TOOLING_COMMIT ?? '')) {
    throw new Error('RELEASE_TOOLING_COMMIT must be an explicit full Git hash.');
  }
  if (!/^[0-9a-f]{64}$/.test(env.RELEASE_TOOLING_AGGREGATE_SHA256 ?? '')) {
    throw new Error('RELEASE_TOOLING_AGGREGATE_SHA256 must be an explicit SHA-256 aggregate.');
  }
  return argv[2];
}

async function verifyCleanPinnedSource(root, env, requireExternalPin = true) {
  const canonical = await realpath(root);
  if (canonical !== EXACT_ROOT || await realpath(git(root, 'rev-parse', '--show-toplevel')) !== EXACT_ROOT) {
    throw new Error('Worker release must run from the exact launch worktree.');
  }
  const status = git(root, 'status', '--porcelain=v1', '--untracked-files=all');
  if (status) throw new Error('Worker release refuses a dirty exact worktree.');
  const commit = git(root, 'rev-parse', 'HEAD');
  const tree = git(root, 'rev-parse', 'HEAD^{tree}');
  if (requireExternalPin && commit !== env.RELEASE_TOOLING_COMMIT) {
    throw new Error('HEAD differs from the explicitly approved tooling commit.');
  }
  const ancestor = spawnSync(GIT, ['merge-base', '--is-ancestor', CANDIDATE_COMMIT, commit], {cwd: root});
  if (ancestor.status !== 0) throw new Error('Frozen candidate is not an ancestor of the tooling commit.');
  const release = JSON.parse(await readFile(path.join(root, 'dist-dot-host/release.json')));
  if (release.commit !== CANDIDATE_COMMIT || release.tree !== CANDIDATE_TREE || release.dirty) {
    throw new Error('Frozen release identity differs from the approved clean candidate.');
  }
  const files = [];
  for (const file of TOOL_FILES) {
    const bytes = await readFile(path.join(root, file));
    const committed = execFileSync(GIT, ['show', `${commit}:${file}`], {cwd: root});
    if (sha256(bytes) !== sha256(committed)) throw new Error(`Tooling source differs from ${commit}:${file}.`);
    files.push({path: file, sha256: sha256(bytes), bytes: bytes.byteLength});
  }
  const aggregateSha256 = sha256(files.map(entry => `${entry.path}\0${entry.sha256}\n`).join(''));
  if (requireExternalPin && aggregateSha256 !== env.RELEASE_TOOLING_AGGREGATE_SHA256) {
    throw new Error('Tooling source aggregate differs from the explicitly approved aggregate.');
  }
  return {commit, tree, aggregateSha256, files};
}

async function materializeSnapshot(root, target, commit) {
  const archive = path.join(target, 'approved-source.tar');
  const archived = spawnSync(GIT, ['archive', '--format=tar', '--output', archive, commit], {
    cwd: root,
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  if (archived.status !== 0) throw new Error(`git archive failed with status ${archived.status}.`);
  const extracted = spawnSync(TAR, ['-xf', archive, '-C', target], {stdio: 'inherit'});
  if (extracted.status !== 0) throw new Error(`Approved source extraction failed with status ${extracted.status}.`);
  await rm(archive, {force: true});
  await cp(path.join(root, 'dist-dot-host'), path.join(target, 'dist-dot-host'), {
    recursive: true,
    errorOnExist: true,
    force: false,
  });
  const carDestination = path.join(target, FROZEN_CAR);
  await mkdir(path.dirname(carDestination), {recursive: true});
  await cp(path.join(root, FROZEN_CAR), carDestination, {errorOnExist: true, force: false});
}

export async function assertIsolatedRuntimePath(isolatedPath, chopdotPath = '/Users/devinsonpena/ChopDot') {
  const isolated = await realpath(isolatedPath);
  const chopdotRoot = await realpath(chopdotPath);
  if (isolated === chopdotRoot || isolated.startsWith(`${chopdotRoot}${path.sep}`)) {
    throw new Error('Isolated runtime resolved inside ChopDot ancestry.');
  }
  for (let ancestor = path.dirname(isolated); ; ancestor = path.dirname(ancestor)) {
    try {
      const entry = await stat(path.join(ancestor, 'node_modules'));
      if (entry.isDirectory()) throw new Error(`Isolated runtime ancestor contains node_modules: ${ancestor}.`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (ancestor === path.dirname(ancestor)) break;
  }
  return isolated;
}

function childEnvironment(root, sourceManifest, env) {
  return {
    PATH: SAFE_PATH,
    HOME: root,
    LANG: process.env.LANG ?? 'C.UTF-8',
    TMPDIR: '/private/tmp',
    CI: 'true',
    CHOPDOT_WORKER_RELEASE_ISOLATED: '1',
    CHOPDOT_RELEASE_SNAPSHOT: root,
    CHOPDOT_RELEASE_WORKTREE: EXACT_ROOT,
    CHOPDOT_TOOLING_MANIFEST_JSON: JSON.stringify(sourceManifest),
    DO_NOT_TRACK: '1',
    PAD_UPDATE_CHECK: '0',
    RELEASE_ENV: ENVIRONMENT,
    RELEASE_DOMAIN: DOMAIN,
    RELEASE_EXPECTED_DEVINSON_OWNER: OWNER,
    RELEASE_CAR_SHA256: CAR_SHA256,
    RELEASE_TOOLING_COMMIT: env.RELEASE_TOOLING_COMMIT,
    RELEASE_TOOLING_AGGREGATE_SHA256: env.RELEASE_TOOLING_AGGREGATE_SHA256,
  };
}

async function runIsolated(mode, root, sourceManifest, env) {
  const isolated = await realpath(await mkdtemp('/private/tmp/chopdot-paseo-worker-'));
  try {
    await assertIsolatedRuntimePath(isolated);
    await materializeSnapshot(root, isolated, sourceManifest.commit);
    const npmrc = path.join(isolated, '.npmrc');
    await writeFile(npmrc, 'ignore-scripts=true\naudit=false\nfund=false\nupdate-notifier=false\n', {mode: 0o600});
    const installEnv = {
      PATH: SAFE_PATH,
      HOME: isolated,
      LANG: process.env.LANG ?? 'C.UTF-8',
      TMPDIR: '/private/tmp',
      npm_config_userconfig: npmrc,
      npm_config_cache: path.join(isolated, '.npm-cache'),
      npm_config_ignore_scripts: 'true',
      npm_config_audit: 'false',
      npm_config_fund: 'false',
      npm_config_update_notifier: 'false',
    };
    const install = spawnSync(NPM, ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], {
      cwd: isolated,
      env: installEnv,
      stdio: 'inherit',
    });
    if (install.status !== 0) throw new Error(`Fresh isolated npm ci failed with status ${install.status}.`);
    for (const entry of sourceManifest.files.filter(item => item.path.startsWith('scripts/'))) {
      const copied = await readFile(path.join(isolated, entry.path));
      if (sha256(copied) !== entry.sha256) throw new Error(`Isolated source copy changed ${entry.path}.`);
    }
    const driver = path.join(isolated, 'scripts/lib/worker-paseo-release-driver.mjs');
    const child = spawnSync(process.execPath, [driver, mode], {
      cwd: isolated,
      env: childEnvironment(isolated, sourceManifest, env),
      stdio: 'inherit',
    });
    if (child.status !== 0) throw new Error(`Isolated worker release failed with status ${child.status}.`);
  } finally {
    await rm(isolated, {recursive: true, force: true});
  }
}

async function main() {
  const mode = validateReleaseInvocation(process.argv, process.env);
  const root = await realpath(process.cwd());
  const sourceManifest = await verifyCleanPinnedSource(root, process.env, mode !== 'identity');
  if (mode === 'identity') {
    console.log(`CHOPDOT_PASEO_TOOLING_IDENTITY ${JSON.stringify(sourceManifest)}`);
    return;
  }
  await runIsolated(mode, root, sourceManifest, process.env);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    await main();
  } catch (error) {
    console.error(`Worker Paseo release bootstrap failed: ${error.message}`);
    process.exit(1);
  }
}
