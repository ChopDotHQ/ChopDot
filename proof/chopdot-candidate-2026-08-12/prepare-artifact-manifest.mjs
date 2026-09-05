import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {join, relative, resolve, sep} from 'node:path';

const cwd = process.cwd();
const proofRoot = resolve(process.env.CHOPDOT_B6_PROOF_ROOT
  ?? 'proof/chopdot-candidate-2026-08-12');
const distRoot = resolve(cwd, 'dist');
const head = git(['rev-parse', 'HEAD']);
const tree = git(['rev-parse', 'HEAD^{tree}']);
const candidateId = `chopdot-b6-${head.slice(0, 12)}`;
const artifactRoot = join(proofRoot, 'artifact', candidateId);

if (!lstatSync(distRoot).isDirectory()) throw new Error('dist/ is missing; run the production build first.');
const files = collectFiles(distRoot).map(path => ({
  path: relative(distRoot, path).replaceAll(sep, '/'),
  bytes: lstatSync(path).size,
  sha256: sha256(readFileSync(path)),
})).sort((left, right) => left.path.localeCompare(right.path));
if (files.length === 0) throw new Error('dist/ contains no files.');
if (files.some(file => file.path.endsWith('.map'))) throw new Error('Source maps are forbidden in the candidate artifact.');

const aggregateInput = files.map(file => `${file.path}\0${file.bytes}\0${file.sha256}`).join('\n');
const packageLock = JSON.parse(readFileSync(join(cwd, 'package-lock.json'), 'utf8'));
const manifest = {
  schemaVersion: 1,
  candidateId,
  createdAt: new Date().toISOString(),
  source: {
    head,
    tree,
    packageLockSha256: sha256(readFileSync(join(cwd, 'package-lock.json'))),
    clean: git(['status', '--porcelain']) === '',
  },
  runtime: {
    node: process.version,
    npm: execFileSync('npm', ['--version'], {encoding: 'utf8'}).trim(),
  },
  dependencies: Object.fromEntries([
    '@parity/product-sdk-host',
    '@parity/product-sdk-statement-store',
    '@parity/host-api-test-sdk',
    '@polkadot/util-crypto',
    'react',
    'vite',
  ].map(name => [name, packageLock.packages?.[`node_modules/${name}`]?.version ?? 'missing'])),
  artifact: {
    root: 'dist',
    fileCount: files.length,
    aggregateSha256: sha256(Buffer.from(aggregateInput)),
    files,
  },
  boundaries: {
    carCid: 'not-generated-no-safe-build-only-packaging-path',
    deployed: false,
    published: false,
    liveEnvironmentVerified: false,
  },
};

mkdirSync(artifactRoot, {recursive: true});
writeFileSync(join(artifactRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(join(artifactRoot, 'candidate.json'), `${JSON.stringify({
  id: candidateId,
  ...manifest.source,
  buildAggregateSha256: manifest.artifact.aggregateSha256,
  snapshotAt: manifest.createdAt,
}, null, 2)}\n`);
process.stdout.write(`${candidateId} ${manifest.artifact.aggregateSha256} ${files.length} files\n`);

function collectFiles(directory) {
  const output = [];
  for (const entry of readdirSync(directory, {withFileTypes: true})) {
    const path = join(directory, entry.name);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error(`Artifact symlink is forbidden: ${relative(distRoot, path)}`);
    if (stat.isDirectory()) output.push(...collectFiles(path));
    else if (stat.isFile()) output.push(path);
    else throw new Error(`Unsupported artifact entry: ${relative(distRoot, path)}`);
  }
  return output;
}

function git(args) {
  return execFileSync('git', args, {cwd, encoding: 'utf8'}).trim();
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}
