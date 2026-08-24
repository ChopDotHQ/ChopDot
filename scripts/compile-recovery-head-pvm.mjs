import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {compile, version as resolcVersion} from '@parity/resolc';
import solc from 'solc';

const root = process.cwd();
const sourceRelative = 'contracts/recovery-head-index/src/RecoveryHeadIndex.sol';
const artifactDirectoryRelative = 'contracts/recovery-head-index/artifacts';
const bytecodeRelative = `${artifactDirectoryRelative}/RecoveryHeadIndex.polkavm`;
const abiRelative = `${artifactDirectoryRelative}/RecoveryHeadIndex.abi.json`;
const manifestRelative = `${artifactDirectoryRelative}/pvm-manifest.json`;
const optimizer = {mode: 'z', enabled: true, runs: 200};
const verifyOnly = process.argv.includes('--verify');

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function packageVersion(packageName) {
  return JSON.parse(
    readFileSync(path.join(root, 'node_modules', ...packageName.split('/'), 'package.json'), 'utf8'),
  ).version;
}

const source = await readFile(path.join(root, sourceRelative), 'utf8');
const output = await compile(
  {[sourceRelative]: {content: source}},
  {optimizer},
);
const errors = (output.errors ?? []).filter((entry) => entry.severity === 'error');
if (errors.length) {
  for (const error of errors) console.error(error.formattedMessage ?? error.message);
  process.exit(1);
}

const contract = output.contracts?.[sourceRelative]?.RecoveryHeadIndex;
const bytecodeHex = contract?.evm?.bytecode?.object;
if (!contract || !bytecodeHex || !/^[0-9a-f]+$/i.test(bytecodeHex)) {
  throw new Error('resolc did not return RecoveryHeadIndex PolkaVM bytecode.');
}
const bytecode = Buffer.from(bytecodeHex, 'hex');
if (!bytecode.subarray(0, 4).equals(Buffer.from([0x50, 0x56, 0x4d, 0x00]))) {
  throw new Error('Compiler output does not carry the expected PVM header.');
}
const abi = Buffer.from(`${JSON.stringify(contract.abi, null, 2)}\n`);
const compiler = {
  package: '@parity/resolc',
  packageVersion: packageVersion('@parity/resolc'),
  resolcVersion: resolcVersion().trim(),
  solcPackageVersion: packageVersion('solc'),
  solcVersion: solc.version(),
};
if (compiler.packageVersion !== '1.4.0' || compiler.solcPackageVersion !== '0.8.28') {
  throw new Error(`Unexpected compiler pair ${compiler.packageVersion}/${compiler.solcPackageVersion}.`);
}

const bytecodeSha256 = sha256(bytecode);
const abiSha256 = sha256(abi);
const buildInputs = {
  source: {path: sourceRelative, sha256: sha256(source)},
  contract: 'RecoveryHeadIndex',
  compiler,
  optimizer,
};
const manifest = {
  schema: 'chopdot.recovery-head-index-pvm.v1',
  ...buildInputs,
  buildInputsSha256: sha256(JSON.stringify(buildInputs)),
  bytecode: {path: bytecodeRelative, bytes: bytecode.byteLength, sha256: bytecodeSha256},
  abi: {path: abiRelative, bytes: abi.byteLength, sha256: abiSha256},
  artifactSetSha256: sha256(`${bytecodeRelative}\0${bytecodeSha256}\n${abiRelative}\0${abiSha256}\n`),
};
const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);

if (verifyOnly) {
  const expected = [
    [bytecodeRelative, bytecode],
    [abiRelative, abi],
    [manifestRelative, manifestBytes],
  ];
  for (const [relative, fresh] of expected) {
    const recorded = await readFile(path.join(root, relative));
    if (!recorded.equals(fresh)) throw new Error(`${relative} is not reproducible from pinned inputs.`);
  }
  console.log(JSON.stringify({
    status: 'pass',
    mode: 'verify',
    bytecodeSha256,
    bytecodeBytes: bytecode.byteLength,
    artifactSetSha256: manifest.artifactSetSha256,
    compiler,
  }, null, 2));
} else {
  await mkdir(path.join(root, artifactDirectoryRelative), {recursive: true});
  await writeFile(path.join(root, bytecodeRelative), bytecode);
  await writeFile(path.join(root, abiRelative), abi);
  await writeFile(path.join(root, manifestRelative), manifestBytes);
  console.log(JSON.stringify({
    status: 'pass',
    mode: 'compile-once',
    bytecodeSha256,
    bytecodeBytes: bytecode.byteLength,
    artifactSetSha256: manifest.artifactSetSha256,
    compiler,
  }, null, 2));
}
