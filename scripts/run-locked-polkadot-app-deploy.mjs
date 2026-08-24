import {createHash} from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
import {copyFile, mkdir, mkdtemp, readFile, realpath, rm, stat} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const DRIVER_SOURCE = 'scripts/lib/locked-deploy-driver.mjs';
const EVIDENCE_SOURCE = 'scripts/lib/release-evidence.mjs';
const CONFIG_FILE = 'polkadot-app-deploy.config.ts';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function git(root, ...args) {
  return execFileSync('git', args, {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
}

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

async function assertNoAncestorNodeModules(directory) {
  let ancestor = path.dirname(directory);
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
}

async function verifyBuiltinsOnlySourceGate(root) {
  const topLevel = await realpath(git(root, 'rev-parse', '--show-toplevel'));
  if (topLevel !== root) throw new Error('Locked deployment must start in the exact worktree root.');
  const status = git(root, 'status', '--porcelain=v1', '--untracked-files=all');
  if (status) throw new Error('Locked deployment bootstrap refuses a dirty exact worktree.');
  const releaseBytes = await readFile(path.join(root, 'dist-dot-host/release.json'));
  const release = JSON.parse(releaseBytes);
  if (release.dirty) throw new Error('Locked deployment bootstrap refuses a dirty release.');
  if (git(root, 'rev-parse', 'HEAD') !== release.commit || git(root, 'rev-parse', 'HEAD^{tree}') !== release.tree) {
    throw new Error('Locked deployment bootstrap commit/tree differs from release.json.');
  }
  const packageLockBytes = await readFile(path.join(root, 'package-lock.json'));
  if (sha256(packageLockBytes) !== release.packageLockSha256) {
    throw new Error('Locked deployment bootstrap package-lock differs from release.json.');
  }
  if (release.polkadotAppDeploy?.configFile !== CONFIG_FILE) {
    throw new Error('Locked deployment bootstrap config path differs from release.json.');
  }
  const configBytes = await readFile(path.join(root, CONFIG_FILE));
  if (sha256(configBytes) !== release.polkadotAppDeploy.configFileSha256) {
    throw new Error('Locked deployment bootstrap config bytes differ from release.json.');
  }
  const launcher = release.polkadotAppDeploy?.launcher;
  const launcherFiles = [
    ['shellFile', 'shellFileSha256', 'scripts/deploy-locked.sh'],
    ['bootstrapFile', 'bootstrapFileSha256', 'scripts/run-locked-polkadot-app-deploy.mjs'],
    ['driverFile', 'driverFileSha256', DRIVER_SOURCE],
    ['evidenceLibraryFile', 'evidenceLibraryFileSha256', EVIDENCE_SOURCE],
  ];
  for (const [pathField, hashField, expectedPath] of launcherFiles) {
    if (launcher?.[pathField] !== expectedPath
      || sha256(await readFile(path.join(root, expectedPath))) !== launcher?.[hashField]) {
      throw new Error(`Locked deployment launcher source ${expectedPath} differs from release.json.`);
    }
  }
  const copiedSources = [
    ['package.json', 'package.json'],
    ['package-lock.json', 'package-lock.json'],
    [DRIVER_SOURCE, 'runner/locked-deploy-driver.mjs'],
    [EVIDENCE_SOURCE, 'runner/release-evidence.mjs'],
  ];
  return {
    release,
    copiedSources: await Promise.all(copiedSources.map(async ([sourcePath, targetPath]) => ({
      sourcePath,
      targetPath,
      sha256: sha256(await readFile(path.join(root, sourcePath))),
    }))),
  };
}

async function main() {
  if (process.env.CHOPDOT_LOCKED_SHELL !== '1') {
    throw new Error('Run the locked deployment only through ./scripts/deploy-locked.sh.');
  }
  if (process.env.NODE_OPTIONS || process.env.NODE_PATH) {
    throw new Error('Invoke the locked deploy launcher with NODE_OPTIONS and NODE_PATH removed.');
  }
  const root = await realpath(process.cwd());
  const {copiedSources} = await verifyBuiltinsOnlySourceGate(root);
  const commonGitDirectory = path.resolve(root, git(root, 'rev-parse', '--git-common-dir'));
  const commonWorktreeRoot = path.basename(commonGitDirectory) === '.git'
    ? path.dirname(commonGitDirectory)
    : root;
  const isolatedRoot = await mkdtemp(path.join(os.tmpdir(), 'chopdot-pad-runtime-'));
  try {
    const canonicalIsolatedRoot = await realpath(isolatedRoot);
    if (isInside(commonWorktreeRoot, canonicalIsolatedRoot) || isInside(canonicalIsolatedRoot, commonWorktreeRoot)) {
      throw new Error('Isolated deployment runtime must be outside the ChopDot/common-worktree ancestry.');
    }
    await assertNoAncestorNodeModules(canonicalIsolatedRoot);
    const runner = path.join(canonicalIsolatedRoot, 'runner');
    await mkdir(runner);
    await Promise.all([
      copyFile(path.join(root, 'package.json'), path.join(canonicalIsolatedRoot, 'package.json')),
      copyFile(path.join(root, 'package-lock.json'), path.join(canonicalIsolatedRoot, 'package-lock.json')),
      copyFile(path.join(root, DRIVER_SOURCE), path.join(runner, 'locked-deploy-driver.mjs')),
      copyFile(path.join(root, EVIDENCE_SOURCE), path.join(runner, 'release-evidence.mjs')),
    ]);
    for (const copied of copiedSources) {
      if (sha256(await readFile(path.join(canonicalIsolatedRoot, copied.targetPath))) !== copied.sha256) {
        throw new Error(`Copied isolated source ${copied.sourcePath} differs from the source gate.`);
      }
    }
    const childEnv = {...process.env};
    delete childEnv.NODE_OPTIONS;
    delete childEnv.NODE_PATH;
    execFileSync('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], {
      cwd: canonicalIsolatedRoot,
      env: childEnv,
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    const result = spawnSync(process.execPath, [path.join(runner, 'locked-deploy-driver.mjs'), ...process.argv.slice(2)], {
      cwd: root,
      env: childEnv,
      stdio: 'inherit',
    });
    if (result.error) throw result.error;
    return result.status ?? 1;
  } finally {
    await rm(isolatedRoot, {recursive: true, force: true});
  }
}

process.exit(await main());
