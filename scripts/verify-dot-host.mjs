import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const output = path.join(root, 'dist-dot-host');
const release = JSON.parse(await readFile(path.join(output, 'release.json'), 'utf8'));
const failures = [];

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
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

const actual = [];
for (const file of await walk(output)) {
  const bytes = await readFile(file);
  actual.push({path: path.relative(output, file), bytes: bytes.byteLength, sha256: sha256(bytes)});
}
const aggregate = sha256(actual.map((entry) => `${entry.path}\0${entry.sha256}\n`).join(''));
if (JSON.stringify(actual) !== JSON.stringify(release.files)) failures.push('file manifest does not match release.json');
if (aggregate !== release.contentSha256) failures.push('content aggregate does not match release.json');
if (actual.some((entry) => entry.path.endsWith('.map'))) failures.push('source maps remain in dot-host output');
const index = await readFile(path.join(output, 'index.html'), 'utf8');
if (!index.includes('<title>ChopDot</title>')) failures.push('index title is not ChopDot');
if (process.env.DOT_RELEASE_STRICT === '1') {
  if (release.dirty) failures.push('strict release was built from a dirty worktree');
  if (!Object.keys(release.recoveryHeadIndex?.deployments ?? {}).length) failures.push('strict release lacks recovery contract deployments');
  if (!release.promotion?.carSha256) failures.push('strict release lacks CAR SHA-256');
  if (!release.promotion?.rootCid || !release.promotion?.appCid) failures.push('strict release lacks root/app CIDs');
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Dot-host release verified (${release.buildId}, ${actual.length} files, dirty=${release.dirty}).`);
