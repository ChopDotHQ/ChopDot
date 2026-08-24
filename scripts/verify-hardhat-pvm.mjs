import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const canonical = JSON.parse(
  await readFile(path.join(root, 'contracts/recovery-head-index/artifacts/pvm-manifest.json'), 'utf8'),
);
const hardhat = JSON.parse(
  await readFile(
    path.join(
      root,
      'node_modules/.cache/chopdot-recovery-head/hardhat-artifacts/src/RecoveryHeadIndex.sol/RecoveryHeadIndex.json',
    ),
    'utf8',
  ),
);
if (hardhat._format !== 'hh-resolc-artifact-1') throw new Error(`Unexpected Hardhat artifact ${hardhat._format}.`);
const bytecode = Buffer.from(hardhat.bytecode?.slice(2) ?? '', 'hex');
const bytecodeSha256 = createHash('sha256').update(bytecode).digest('hex');
if (bytecodeSha256 !== canonical.bytecode.sha256 || bytecode.byteLength !== canonical.bytecode.bytes) {
  throw new Error('Hardhat Polkadot output differs from the compile-once PVM artifact.');
}
console.log(JSON.stringify({
  status: 'pass',
  hardhatFormat: hardhat._format,
  bytecodeSha256,
  bytecodeBytes: bytecode.byteLength,
}, null, 2));
