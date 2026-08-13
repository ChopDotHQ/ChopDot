import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync, lstatSync, readFileSync, readdirSync} from 'node:fs';
import {join, relative, resolve, sep} from 'node:path';

const cwd = process.cwd();
const proofRoot = resolve(process.env.CHOPDOT_B6_PROOF_ROOT
  ?? 'proof/chopdot-candidate-2026-08-12');
const distRoot = resolve(cwd, 'dist');
const head = git(['rev-parse', 'HEAD']);
const candidateId = `chopdot-b6-${head.slice(0, 12)}`;
const manifestPath = join(proofRoot, 'artifact', candidateId, 'manifest.json');
if (!existsSync(manifestPath)) throw new Error(`Artifact manifest is missing: ${manifestPath}`);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

assert(manifest.schemaVersion === 1, 'artifact manifest schema mismatch');
assert(manifest.candidateId === candidateId, 'candidate ID mismatch');
assert(manifest.source?.head === head, 'source commit mismatch');
assert(manifest.source?.tree === git(['rev-parse', 'HEAD^{tree}']), 'source tree mismatch');
assert(manifest.source?.packageLockSha256 === sha256(readFileSync(join(cwd, 'package-lock.json'))), 'lockfile hash mismatch');
assert(manifest.source?.clean === true, 'manifest was not prepared from a clean source tree');
assert(manifest.boundaries?.deployed === false && manifest.boundaries?.published === false, 'artifact boundary mismatch');

const files = collectFiles(distRoot).map(path => ({
  path: relative(distRoot, path).replaceAll(sep, '/'),
  bytes: lstatSync(path).size,
  sha256: sha256(readFileSync(path)),
})).sort((left, right) => left.path.localeCompare(right.path));
assert(JSON.stringify(files) === JSON.stringify(manifest.artifact?.files), 'artifact file set or hash mismatch');
const aggregateInput = files.map(file => `${file.path}\0${file.bytes}\0${file.sha256}`).join('\n');
assert(sha256(Buffer.from(aggregateInput)) === manifest.artifact?.aggregateSha256, 'artifact aggregate hash mismatch');
assert(!files.some(file => file.path.endsWith('.map')), 'source maps are forbidden');

const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/u,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/u,
  /\bsk_(?:live|test)_[A-Za-z0-9]{20,}\b/u,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/u,
];
for (const file of files.filter(item => /\.(?:html|css|js|json|txt)$/u.test(item.path))) {
  const text = readFileSync(join(distRoot, file.path), 'utf8');
  assert(!secretPatterns.some(pattern => pattern.test(text)), `credential pattern found in ${file.path}`);
  assert(!/sr25519PairFromSeed|naclKeypairFromSeed/u.test(text), `deterministic signer primitive found in ${file.path}`);
}

process.stdout.write(`Artifact verified: ${candidateId} ${manifest.artifact.aggregateSha256} ${files.length} files\n`);

function collectFiles(directory) {
  assert(existsSync(directory) && lstatSync(directory).isDirectory(), 'dist/ is missing');
  const output = [];
  for (const entry of readdirSync(directory, {withFileTypes: true})) {
    const path = join(directory, entry.name);
    const stat = lstatSync(path);
    assert(!stat.isSymbolicLink(), `artifact symlink is forbidden: ${relative(distRoot, path)}`);
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
