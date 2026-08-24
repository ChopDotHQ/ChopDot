import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdir, mkdtemp, readFile, readdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
async function manifest(directory) {
  const records = [];
  async function visit(current, prefix = '') {
    for (const entry of await readdir(current, {withFileTypes: true})) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(absolute, relative);
      else if (entry.isFile()) {
        const bytes = await readFile(absolute);
        records.push({path: relative, bytes: bytes.byteLength, sha256: sha256(bytes)});
      } else throw new Error(`Unsupported rebuild output entry ${relative}.`);
    }
  }
  await visit(directory);
  return records.sort((a, b) => a.path.localeCompare(b.path));
}
async function build(source, directory) {
  execFileSync('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], {
    cwd: source,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
  const tree = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], {cwd: root, encoding: 'utf8'}).trim();
  execFileSync(path.join(source, 'node_modules/.bin/vite'), ['build', '--outDir', directory, '--emptyOutDir'], {
    cwd: source,
    env: {...process.env, VITE_BUILD_PROFILE: 'dot-host'},
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  execFileSync(process.execPath, [path.join(source, 'scripts/prepare-dot-host-release.mjs')], {
    cwd: source,
    env: {
      ...process.env,
      DOT_HOST_OUTPUT_DIR: directory,
      RELEASE_SOURCE_COMMIT: commit,
      RELEASE_SOURCE_TREE: tree,
      RELEASE_SOURCE_CLEAN: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return manifest(directory);
}

const isolatedRoot = await mkdtemp(path.join(os.tmpdir(), 'chopdot-dot-host-rebuild-'));
const dirty = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {cwd: root, encoding: 'utf8'}).trim();
if (dirty) throw new Error('Strict release rebuild requires a clean exact worktree.');
async function sourceSnapshot(name) {
  const directory = path.join(isolatedRoot, name);
  await mkdir(directory);
  const archive = execFileSync('git', ['archive', '--format=tar', 'HEAD'], {cwd: root});
  execFileSync('tar', ['-xf', '-', '-C', directory], {input: archive});
  return directory;
}
const firstSource = await sourceSnapshot('first-source');
const secondSource = await sourceSnapshot('second-source');
const first = await build(firstSource, path.join(isolatedRoot, 'first'));
const second = await build(secondSource, path.join(isolatedRoot, 'second'));
const candidate = await manifest(path.join(root, 'dist-dot-host'));
function differences(left, right) {
  const leftMap = new Map(left.map((entry) => [entry.path, entry]));
  const rightMap = new Map(right.map((entry) => [entry.path, entry]));
  return [...new Set([...leftMap.keys(), ...rightMap.keys()])].sort().filter((filePath) => (
    JSON.stringify(leftMap.get(filePath)) !== JSON.stringify(rightMap.get(filePath))
  ));
}
const betweenRebuilds = differences(first, second);
if (betweenRebuilds.length) throw new Error(`Two output-isolated rebuilds differ at: ${betweenRebuilds.join(', ')}`);
const fromCandidate = differences(first, candidate);
if (fromCandidate.length) throw new Error(`Output-isolated rebuild differs from the release candidate at: ${fromCandidate.join(', ')}`);
console.log(JSON.stringify({
  status: 'pass',
  mode: 'two-output-isolated-rebuilds',
  sourceIsolation: 'two-independent-git-archive-head-snapshots-with-independent-lockfile-installs',
  files: first.length,
  aggregateSha256: sha256(first.map((entry) => `${entry.path}\0${entry.sha256}\n`).join('')),
}, null, 2));
