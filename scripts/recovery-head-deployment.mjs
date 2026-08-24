import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {ethers} from 'ethers';
import {verifyEnvironmentAnchors} from './lib/release-evidence.mjs';

const root = process.cwd();
const targetsPath = path.join(root, 'deployment/recovery-head-index-targets.json');
const manifestPath = path.join(root, 'contracts/recovery-head-index/artifacts/pvm-manifest.json');
const targets = JSON.parse(await readFile(targetsPath, 'utf8'));
const manifestBytes = await readFile(manifestPath);
const manifest = JSON.parse(manifestBytes);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function argument(name) {
  const prefix = `--${name}=`;
  return process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length);
}

function flag(name) {
  return process.argv.includes(`--${name}`);
}

function assertHex(value, bytes, label) {
  if (!new RegExp(`^0x[0-9a-f]{${bytes * 2}}$`, 'i').test(value ?? '')) {
    throw new Error(`${label} must be 0x-prefixed ${bytes}-byte hex.`);
  }
}

const environment = argument('environment');
const target = targets.environments?.[environment];
if (!target) {
  throw new Error('Pass an explicit --environment=devnet or --environment=paseo-next-v2.');
}
const modes = ['preflight', 'readback', 'write', 'prove', 'verify-behavior'].filter(flag);
if (modes.length > 1) throw new Error('Choose only one of --preflight, --readback, --write, --prove, or --verify-behavior.');
const mode = modes[0] ?? 'preflight';

assertHex(target.assetHubGenesis, 32, 'Configured Asset Hub genesis');
assertHex(`0x${manifest.bytecode.sha256}`, 32, 'PVM bytecode SHA-256');
const bytecodePath = path.join(root, manifest.bytecode.path);
const abiPath = path.join(root, manifest.abi.path);
const bytecode = await readFile(bytecodePath);
const abi = JSON.parse(await readFile(abiPath, 'utf8'));
if (sha256(bytecode) !== manifest.bytecode.sha256 || bytecode.byteLength !== manifest.bytecode.bytes) {
  throw new Error('Recorded PVM bytecode does not match its compiler manifest.');
}
if (sha256(Buffer.from(`${JSON.stringify(abi, null, 2)}\n`)) !== manifest.abi.sha256) {
  throw new Error('Recorded ABI does not match its compiler manifest.');
}

const anchored = await verifyEnvironmentAnchors(root, environment);
const provider = anchored.provider;
const observedChainId = anchored.evidence.chainId;

const attestation = {
  environment,
  label: target.label,
  assetHubWss: target.assetHubWss,
  ethRpc: target.ethRpc,
  environmentIdentity: anchored.evidence.endpointIdentity,
  endpointCodeAnchorSha256: anchored.evidence.codeAnchorFileSha256,
  endpointCodeAnchors: anchored.evidence.contracts,
  assetHubGenesis: anchored.evidence.corroboratingAssetHubGenesis,
  chainName: anchored.evidence.corroboratingChainName,
  chainId: observedChainId,
  paraId: target.paraId,
  pvmBytecodeSha256: manifest.bytecode.sha256,
  pvmBytecodeBytes: manifest.bytecode.bytes,
  compilerManifestSha256: sha256(manifestBytes),
  sourceSha256: manifest.source.sha256,
  abiSha256: manifest.abi.sha256,
  buildInputsSha256: manifest.buildInputsSha256,
  artifactSetSha256: manifest.artifactSetSha256,
};
const requiredWriteConfirmation = `${environment}:${target.assetHubGenesis}:${anchored.evidence.codeAnchorFileSha256}:${manifest.bytecode.sha256}`;

async function readback(address) {
  assertHex(address, 20, 'Contract address');
  const codeHex = await provider.getCode(address);
  if (codeHex === '0x') throw new Error(`No contract code found at ${address}.`);
  const code = Buffer.from(codeHex.slice(2), 'hex');
  const readbackBytecodeSha256 = sha256(code);
  if (readbackBytecodeSha256 !== manifest.bytecode.sha256) {
    throw new Error(
      `Readback bytecode mismatch at ${address}: expected ${manifest.bytecode.sha256}, observed ${readbackBytecodeSha256}.`,
    );
  }
  return {address: ethers.utils.getAddress(address), readbackBytecodeSha256, readbackBytes: code.byteLength};
}

if (mode === 'preflight') {
  console.log(JSON.stringify({
    status: 'pass',
    mode,
    writeEnabled: false,
    requiredWriteConfirmation,
    attestation,
  }, null, 2));
  process.exit(0);
}

if (mode === 'readback') {
  const result = await readback(argument('address'));
  let transaction;
  const transactionHash = argument('transaction-hash');
  if (transactionHash) {
    assertHex(transactionHash, 32, 'Deployment transaction hash');
    const expectedBlockNumber = Number(argument('block-number'));
    const expectedBlockHash = argument('block-hash');
    assertHex(expectedBlockHash, 32, 'Deployment block hash');
    if (!Number.isInteger(expectedBlockNumber) || expectedBlockNumber < 0) {
      throw new Error('Deployment block number must be a non-negative integer.');
    }
    const receipt = await provider.getTransactionReceipt(transactionHash);
    if (
      !receipt
      || receipt.status !== 1
      || receipt.contractAddress?.toLowerCase() !== result.address.toLowerCase()
      || receipt.blockNumber !== expectedBlockNumber
      || receipt.blockHash?.toLowerCase() !== expectedBlockHash.toLowerCase()
    ) {
      throw new Error('Deployment receipt does not bind the transaction, block, successful creation, and readback address.');
    }
    transaction = {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      contractAddress: receipt.contractAddress,
      status: receipt.status,
    };
  }
  console.log(JSON.stringify({status: 'pass', mode, writeEnabled: false, attestation, ...result, transaction}, null, 2));
  process.exit(0);
}

if (mode === 'verify-behavior') {
  const address = ethers.utils.getAddress(argument('address'));
  await readback(address);
  const evidencePath = path.join(root, 'deployment/recovery-head-index', `${environment}.behavior.json`);
  const evidence = JSON.parse(await readFile(evidencePath, 'utf8'));
  if (evidence.schema !== 'chopdot.recovery-head-index-live-behavior.v1'
    || evidence.environment !== environment || evidence.address?.toLowerCase() !== address.toLowerCase()
    || evidence.assetHubGenesis?.toLowerCase() !== target.assetHubGenesis.toLowerCase()
    || evidence.pvmBytecodeSha256 !== manifest.bytecode.sha256
    || !/^0x[0-9a-f]{40}$/iu.test(evidence.signerAddress ?? '')
    || !/^0x[0-9a-f]{40}$/iu.test(evidence.otherOwner ?? '')
    || !/^0x[0-9a-f]{64}$/iu.test(evidence.stream ?? '')
    || !/^0x[0-9a-f]{64}$/iu.test(evidence.isolatedStream ?? '')) {
    throw new Error('Live PVM behavior evidence identity is invalid.');
  }
  const contract = new ethers.Contract(address, abi, provider);
  const receipt = await provider.getTransactionReceipt(evidence.transaction.hash);
  if (!receipt || receipt.status !== 1 || receipt.blockNumber !== evidence.transaction.blockNumber
    || receipt.blockHash?.toLowerCase() !== evidence.transaction.blockHash.toLowerCase()) {
    throw new Error('Live PVM behavior transaction receipt is invalid.');
  }
  const parsedEvents = receipt.logs.flatMap(log => {
    try {
      const parsed = contract.interface.parseLog(log);
      return parsed.name === 'HeadAdvanced' ? [parsed.args] : [];
    } catch { return []; }
  });
  const exactEvent = parsedEvents.filter(event => event.owner.toLowerCase() === evidence.signerAddress.toLowerCase()
    && event.stream === evidence.stream && event.sequence.toString() === evidence.after.sequence
    && event.digest.toLowerCase() === evidence.after.digest.toLowerCase());
  if (exactEvent.length !== 1) throw new Error('Live PVM behavior transaction event is invalid.');
  const current = await contract.readHead(evidence.signerAddress, evidence.stream);
  if (current.sequence.lt(evidence.after.sequence)
    || (current.sequence.eq(evidence.after.sequence) && current.digest.toLowerCase() !== evidence.after.digest.toLowerCase())) {
    throw new Error('Live PVM head rolled back behind the recorded behavior proof.');
  }
  let staleRejected = false;
  try {
    await contract.callStatic.advanceHead(evidence.stream, evidence.before.sequence, evidence.before.digest, ethers.utils.keccak256(ethers.utils.toUtf8Bytes('stale-readback')));
  } catch { staleRejected = true; }
  if (!staleRejected) throw new Error('Live PVM stale compare-and-swap is no longer rejected.');
  const [isolatedOwnerHead, isolatedStreamHead] = await Promise.all([
    contract.readHead(evidence.otherOwner, evidence.stream),
    contract.readHead(evidence.signerAddress, evidence.isolatedStream),
  ]);
  if (!isolatedOwnerHead.sequence.isZero() || isolatedOwnerHead.digest !== ethers.constants.HashZero
    || !isolatedStreamHead.sequence.isZero() || isolatedStreamHead.digest !== ethers.constants.HashZero) {
    throw new Error('Live PVM behavior isolation readback failed.');
  }
  const finalized = await waitForFinalizedBlock(provider, receipt.blockNumber);
  console.log(JSON.stringify({status: 'pass', mode, writeEnabled: false, address, transactionHash: receipt.transactionHash, finalized, assertions: evidence.assertions}, null, 2));
  process.exit(0);
}

if (mode === 'prove') {
  const address = ethers.utils.getAddress(argument('address'));
  await readback(address);
  const signerValue = process.env.CHOPDOT_RECOVERY_DEPLOYER_PRIVATE_KEY;
  assertHex(signerValue, 32, 'CHOPDOT_RECOVERY_DEPLOYER_PRIVATE_KEY');
  const behaviorConfirmation = `${requiredWriteConfirmation}:${address.toLowerCase()}`;
  if (process.env.CHOPDOT_RECOVERY_BEHAVIOR_CONFIRM !== behaviorConfirmation) {
    throw new Error('Behavior proof refused. Use the exact environment/genesis/anchor/bytecode/address confirmation.');
  }
  const wallet = new ethers.Wallet(signerValue, provider);
  const signerAddress = await wallet.getAddress();
  const contract = new ethers.Contract(address, abi, wallet);
  const stream = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`chopdot:pvm-live:v1:${environment}:${manifest.bytecode.sha256}:${signerAddress.toLowerCase()}`));
  const isolatedStream = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`chopdot:pvm-live:isolation:v1:${environment}:${manifest.bytecode.sha256}`));
  const otherOwner = ethers.Wallet.createRandom().address;
  const before = await contract.readHead(signerAddress, stream);
  const nextDigest = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
    ['string', 'address', 'bytes32', 'uint64'],
    ['chopdot:pvm-live-next:v1', signerAddress, stream, before.sequence.add(1)],
  ));
  const transaction = await contract.advanceHead(stream, before.sequence, before.digest, nextDigest);
  const receipt = await transaction.wait();
  if (receipt.status !== 1) throw new Error('Live PVM advanceHead transaction failed.');
  const after = await contract.readHead(signerAddress, stream);
  if (!after.sequence.eq(before.sequence.add(1)) || after.digest.toLowerCase() !== nextDigest.toLowerCase()) {
    throw new Error('Live PVM state readback differs from the successful advance.');
  }
  let staleRejected = false;
  try {
    await contract.callStatic.advanceHead(stream, before.sequence, before.digest, ethers.utils.keccak256(ethers.utils.toUtf8Bytes('stale')));
  } catch {
    staleRejected = true;
  }
  if (!staleRejected) throw new Error('Live PVM stale compare-and-swap was not rejected.');
  const [isolatedOwnerHead, isolatedStreamHead] = await Promise.all([
    contract.readHead(otherOwner, stream),
    contract.readHead(signerAddress, isolatedStream),
  ]);
  if (!isolatedOwnerHead.sequence.isZero() || isolatedOwnerHead.digest !== ethers.constants.HashZero
    || !isolatedStreamHead.sequence.isZero() || isolatedStreamHead.digest !== ethers.constants.HashZero) {
    throw new Error('Live PVM owner/stream isolation failed.');
  }
  const advancedEvents = receipt.logs.flatMap(log => {
    try {
      const parsed = contract.interface.parseLog(log);
      return parsed.name === 'HeadAdvanced' ? [parsed] : [];
    } catch { return []; }
  });
  if (advancedEvents.length !== 1) throw new Error('Live PVM transaction lacks exactly one HeadAdvanced event.');
  const event = advancedEvents[0].args;
  if (event.owner.toLowerCase() !== signerAddress.toLowerCase() || event.stream !== stream
    || !event.sequence.eq(after.sequence) || event.digest.toLowerCase() !== nextDigest.toLowerCase()) {
    throw new Error('Live PVM HeadAdvanced event differs from state readback.');
  }
  const finalizedBlock = await waitForFinalizedBlock(provider, receipt.blockNumber);
  const evidence = {
    schema: 'chopdot.recovery-head-index-live-behavior.v1',
    ...attestation,
    address,
    signerAddress,
    otherOwner,
    stream,
    isolatedStream,
    before: {sequence: before.sequence.toString(), digest: before.digest},
    after: {sequence: after.sequence.toString(), digest: after.digest},
    transaction: {
      hash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      status: receipt.status,
      gasUsed: receipt.gasUsed.toString(),
      finalizedHeadNumber: finalizedBlock.number,
      finalizedHeadHash: finalizedBlock.hash,
    },
    assertions: {
      successfulAdvance: true,
      exactEventAndStateReadback: true,
      staleCompareAndSwapRejected: true,
      ownerIsolation: true,
      streamIsolation: true,
    },
    recordedAt: new Date().toISOString(),
  };
  const evidenceDirectory = path.join(root, 'deployment/recovery-head-index');
  await mkdir(evidenceDirectory, {recursive: true});
  await writeFile(path.join(evidenceDirectory, `${environment}.behavior.json`), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({status: 'pass', mode, writeEnabled: true, behaviorConfirmation, evidence}, null, 2));
  process.exit(0);
}

const signerValue = process.env.CHOPDOT_RECOVERY_DEPLOYER_PRIVATE_KEY;
assertHex(signerValue, 32, 'CHOPDOT_RECOVERY_DEPLOYER_PRIVATE_KEY');
if (process.env.CHOPDOT_RECOVERY_DEPLOY_CONFIRM !== requiredWriteConfirmation) {
  throw new Error(
    'Write refused. Set CHOPDOT_RECOVERY_DEPLOY_CONFIRM to the exact environment:genesis:endpoint-code-anchor-sha256:bytecode-sha256 confirmation printed by --preflight.',
  );
}

const wallet = new ethers.Wallet(signerValue, provider);
const signerAddress = await wallet.getAddress();
const balance = await provider.getBalance(signerAddress);
if (balance.isZero()) throw new Error(`Signer ${signerAddress} has no testnet balance.`);
const factory = new ethers.ContractFactory(abi, `0x${bytecode.toString('hex')}`, wallet);
const contract = await factory.deploy();
const receipt = await contract.deployTransaction.wait();
if (receipt.status !== 1) throw new Error(`Deployment transaction ${receipt.transactionHash} failed.`);
const result = await readback(contract.address);
const evidence = {
  schema: 'chopdot.recovery-head-index-deployment.v1',
  ...attestation,
  address: result.address,
  signerAddress,
  transactionHash: receipt.transactionHash,
  blockNumber: receipt.blockNumber,
  blockHash: receipt.blockHash,
  gasUsed: receipt.gasUsed.toString(),
  readbackBytecodeSha256: result.readbackBytecodeSha256,
  readbackBytes: result.readbackBytes,
  recordedAt: new Date().toISOString(),
};
const evidenceDirectory = path.join(root, 'deployment/recovery-head-index');
await mkdir(evidenceDirectory, {recursive: true});
await writeFile(path.join(evidenceDirectory, `${environment}.json`), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({status: 'pass', mode, writeEnabled: true, evidence}, null, 2));

async function waitForFinalizedBlock(providerValue, minimumNumber) {
  for (let attempt = 0; attempt < 45; attempt += 1) {
    const block = await providerValue.send('eth_getBlockByNumber', ['finalized', false]);
    const number = Number.parseInt(block?.number ?? '', 16);
    if (Number.isSafeInteger(number) && number >= minimumNumber && /^0x[0-9a-f]{64}$/iu.test(block?.hash ?? '')) {
      return {number, hash: block.hash};
    }
    await new Promise(resolve => setTimeout(resolve, 2_000));
  }
  throw new Error(`Live PVM transaction block ${minimumNumber} did not become independently finalized in time.`);
}
