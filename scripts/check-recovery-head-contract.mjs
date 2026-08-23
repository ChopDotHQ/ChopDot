import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import solc from 'solc';

const sourcePath = path.join(process.cwd(), 'contracts/recovery-head-index/src/RecoveryHeadIndex.sol');
const source = await readFile(sourcePath, 'utf8');
const input = {
  language: 'Solidity',
  sources: {'RecoveryHeadIndex.sol': {content: source}},
  settings: {
    optimizer: {enabled: true, runs: 200},
    outputSelection: {'*': {'*': ['abi'], '': ['ast']}},
  },
};
const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (output.errors ?? []).filter((entry) => entry.severity === 'error');
if (errors.length) {
  for (const error of errors) console.error(error.formattedMessage ?? error.message);
  process.exit(1);
}
const contract = output.contracts?.['RecoveryHeadIndex.sol']?.RecoveryHeadIndex;
if (!contract) throw new Error('RecoveryHeadIndex compiler output is missing.');
const functions = contract.abi.filter((entry) => entry.type === 'function').map((entry) => entry.name);
const events = contract.abi.filter((entry) => entry.type === 'event').map((entry) => entry.name);
if (JSON.stringify(functions) !== JSON.stringify(['advanceHead', 'readHead'])) {
  throw new Error(`Unexpected function surface: ${functions.join(', ')}`);
}
if (JSON.stringify(events) !== JSON.stringify(['HeadAdvanced'])) {
  throw new Error(`Unexpected event surface: ${events.join(', ')}`);
}
console.log(JSON.stringify({
  status: 'pass',
  compiler: solc.version(),
  sourceSha256: createHash('sha256').update(source).digest('hex'),
  functions,
  events,
  note: 'This proves Solidity syntax and ABI only. Deployment bytecode must be produced by the target Polkadot runtime toolchain.',
}, null, 2));
