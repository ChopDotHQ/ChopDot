import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const output = path.join(root, 'dist-dot-host');

function git(...args) {
  return execFileSync('git', args, {cwd: root, encoding: 'utf8'}).trim();
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(target));
    else if (entry.name !== 'release.json') files.push(target);
  }
  return files.sort();
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

const files = await walk(output);
const manifest = [];
for (const file of files) {
  const bytes = await readFile(file);
  manifest.push({path: path.relative(output, file), bytes: bytes.byteLength, sha256: sha256(bytes)});
}
const orderedManifest = manifest.map((entry) => `${entry.path}\0${entry.sha256}\n`).join('');
const contentSha256 = sha256(orderedManifest);
const commit = git('rev-parse', 'HEAD');
const tree = git('rev-parse', 'HEAD^{tree}');
const status = git('status', '--porcelain=v1', '--untracked-files=all');
const packageLockSha256 = sha256(await readFile(path.join(root, 'package-lock.json')));
const release = {
  schema: 'chopdot.release.v1',
  product: 'ChopDot',
  authority: 'participant-held signed ChopEventV1 log',
  commit,
  tree,
  dirty: Boolean(status),
  dirtyStatusSha256: status ? sha256(status) : null,
  buildId: `chopdot-${commit.slice(0, 12)}-${contentSha256.slice(0, 12)}`,
  contentSha256,
  packageLockSha256,
  files: manifest,
  recoveryHeadIndex: {
    sourceSha256: sha256(await readFile(path.join(root, 'contracts/recovery-head-index/src/RecoveryHeadIndex.sol'))),
    deployments: {},
  },
  promotion: {carSha256: null, rootCid: null, appCid: null},
};
await writeFile(path.join(output, 'release.json'), `${JSON.stringify(release, null, 2)}\n`);
console.log(`Prepared ${release.buildId} (${manifest.length} files, dirty=${release.dirty}).`);
