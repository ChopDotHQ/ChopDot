import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {ethers} from 'ethers';

const root = process.cwd();

function argument(name) {
  const prefix = `--${name}=`;
  return process.argv.find(entry => entry.startsWith(prefix))?.slice(prefix.length);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function normalizePath(value) {
  const resolved = path.resolve(root, value);
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error('Path must stay inside the repository.');
  return resolved;
}

const environment = argument('environment');
if (!environment) throw new Error('Pass --environment=<id>.');
const sourceEnvironmentFile = argument('source-environment-file') ?? 'deployment/pad-environments-2026-09-10.json';
const outputPath = argument('out');
const targets = JSON.parse(await readFile(path.join(root, 'deployment/recovery-head-index-targets.json'), 'utf8'));
const target = targets.environments?.[environment];
if (!target) throw new Error(`Unknown recovery target: ${environment}`);

const existingAnchorPath = normalizePath(targets.dotnsCodeAnchors);
const existing = JSON.parse(await readFile(existingAnchorPath, 'utf8'));
const currentEnvironmentDocument = JSON.parse(await readFile(normalizePath(sourceEnvironmentFile), 'utf8'));
const currentEnvironment = currentEnvironmentDocument.environments?.find?.(entry => entry.id === environment);
if (!currentEnvironment?.contracts) throw new Error(`Environment ${environment} is missing from ${sourceEnvironmentFile}.`);
const previousEnvironment = existing.environments?.[environment];
if (!previousEnvironment?.contracts) throw new Error(`Existing anchor set has no ${environment} contract selection.`);

const provider = new ethers.providers.JsonRpcProvider(target.ethRpc);
const network = await provider.getNetwork();
if (Number(network.chainId) !== Number(target.chainId)) {
  throw new Error(`Chain id mismatch: expected ${target.chainId}, observed ${network.chainId}.`);
}
const block = await provider.getBlock('latest');
if (!block || !Number.isSafeInteger(block.number) || !/^0x[0-9a-f]{64}$/iu.test(block.hash ?? '')) {
  throw new Error('Current RPC did not return a concrete latest block.');
}

const contracts = {};
for (const name of Object.keys(previousEnvironment.contracts).sort()) {
  const address = currentEnvironment.contracts[name];
  if (!/^0x[0-9a-f]{40}$/iu.test(address ?? '')) throw new Error(`Current environment has no valid ${name} address.`);
  const codeHex = await provider.getCode(address, block.number);
  if (codeHex === '0x') throw new Error(`No code found for ${name} at ${address} in block ${block.number}.`);
  const bytes = Buffer.from(codeHex.slice(2), 'hex');
  contracts[name] = {address, bytes: bytes.byteLength, sha256: sha256(bytes)};
}

const captured = structuredClone(existing);
captured.sourceEnvironmentFile = sourceEnvironmentFile;
captured.environments[environment] = {
  ethRpc: target.ethRpc,
  observedBlock: {
    number: block.number,
    numberHex: `0x${block.number.toString(16)}`,
    hash: block.hash,
  },
  contracts,
};
const rendered = `${JSON.stringify(captured, null, 2)}\n`;
if (outputPath) await writeFile(normalizePath(outputPath), rendered);
process.stdout.write(rendered);
