import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {
  DEFAULT_MNEMONIC,
  DotNS,
  derivePoolAccounts,
  loadEnvironments,
  resolveEndpoints,
} from '@polkadot-community-foundation/polkadot-app-deploy';
import {
  BLAKE2B_256_MULTIHASH_CODE,
  computeStorageCid,
  createCID,
  encodeContenthash,
  storeChunkedContent,
  storeFile,
} from '@polkadot-community-foundation/polkadot-app-deploy/deploy';
import {createClient} from 'polkadot-api';
import {getWsProvider} from 'polkadot-api/ws';
import {ethers} from 'ethers';
import {
  inspectCar,
  safeRepoPath,
  sha256,
  verifyEnvironmentAnchors,
  verifyLockedDeploymentCli,
  verifyReleaseDirectory,
} from './release-evidence.mjs';
import {
  CONTENT_RESOLVER_ABI,
  DEVINSON_OWNER,
  PASEO_WORKER,
  REGISTRAR_ABI,
  REGISTRY_ABI,
  RELEASE_BUILD_ID,
  RELEASE_CAR_SHA256,
  RELEASE_DOMAIN,
  RELEASE_ROOT_CID,
  appHandoffCalls,
  assertFinalizedHeadPair,
  assertFinalizedStorageProof,
  assertFrozenEnvironmentBinding,
  assertReleaseAuthorityState,
  assertReleaseRecords,
  expectedReleaseManifests,
  planHandoff,
  readFrozenRelease,
  readReleaseAuthorityState,
  releaseNodes,
  requireFinalizedResolution,
  verifyDirectIpfsFile,
  verifyFinalizedTransactions,
} from './worker-paseo-release.mjs';

const ENVIRONMENT = 'paseo-next-v2';
const ENVIRONMENT_FILE = 'deployment/pad-environments-2026-08-23.json';
const CAR_FILE = `deployment/releases/${RELEASE_BUILD_ID}.car`;
const ICON_FILE = 'dist-dot-host/chopdot-icon.png';
const MODES = new Set(['preflight', 'release', 'verify-final']);
const ZERO = ethers.constants.AddressZero.toLowerCase();
const PERSONHOOD_ADDRESS = '0x000000000000000000000000000000000a010000';
const PERSONHOOD_CONTEXT = '0x646f746e73000000000000000000000000000000000000000000000000000000';
const PERSONHOOD_ABI = Object.freeze([
  'function personhoodStatus(address account,bytes32 context) view returns (uint8)',
]);
const POP_RULES_ABI = Object.freeze([
  'function transferFloor(string name,address from,address to) view returns (uint256)',
]);
export const REGISTRAR_CONTROLLER_ABI = Object.freeze([
  {inputs: [{name: 'registration', type: 'tuple', components: [
    {name: 'label', type: 'string'},
    {name: 'owner', type: 'address'},
    {name: 'secret', type: 'bytes32'},
    {name: 'reserved', type: 'bool'},
  ]}], name: 'makeCommitment', outputs: [{name: '', type: 'bytes32'}], stateMutability: 'view', type: 'function'},
  {inputs: [{name: 'commitment', type: 'bytes32'}], name: 'commit', outputs: [], stateMutability: 'nonpayable', type: 'function'},
  {inputs: [{name: 'commitment', type: 'bytes32'}], name: 'commitments', outputs: [{name: '', type: 'uint256'}], stateMutability: 'view', type: 'function'},
  {inputs: [{name: 'registration', type: 'tuple', components: [
    {name: 'label', type: 'string'},
    {name: 'owner', type: 'address'},
    {name: 'secret', type: 'bytes32'},
    {name: 'reserved', type: 'bool'},
  ]}], name: 'register', outputs: [], stateMutability: 'payable', type: 'function'},
]);

const deployEntry = fileURLToPath(import.meta.resolve('@polkadot-community-foundation/polkadot-app-deploy/deploy'));
const padDist = path.dirname(deployEntry);
const {rebuildOrderedCarFromBytes} = await import(pathToFileURL(path.join(padDist, 'chunk-7W5KOX5X.js')).href);
const {probeChunks} = await import(pathToFileURL(path.join(padDist, 'chunk-OTFKKQV4.js')).href);

function manifestOptions(verified) {
  return {
    expectedRootManifest: verified.manifests.rootManifest,
    expectedExecutableManifest: verified.manifests.executableManifest,
  };
}

export function assertRecipientRetryState(state, resolver, verified) {
  const observedResolver = state.appResolver.toLowerCase();
  if (![ZERO, resolver.toLowerCase()].includes(observedResolver)) {
    throw new Error(`Recipient-owned app has unexpected resolver ${state.appResolver}.`);
  }
  assertReleaseRecords({...state, appResolver: resolver}, {
    resolver,
    ...manifestOptions(verified),
  });
  return {needsResolverRepair: observedResolver === ZERO};
}

function exactEnv() {
  const required = {
    CHOPDOT_WORKER_RELEASE_ISOLATED: '1',
    DO_NOT_TRACK: '1',
    PAD_UPDATE_CHECK: '0',
    RELEASE_ENV: ENVIRONMENT,
    RELEASE_DOMAIN,
    RELEASE_EXPECTED_DEVINSON_OWNER: DEVINSON_OWNER,
    RELEASE_CAR_SHA256,
  };
  for (const [name, value] of Object.entries(required)) {
    if ((process.env[name] ?? '').toLowerCase() !== value.toLowerCase()) {
      throw new Error(`Isolated release environment ${name} differs from its approved value.`);
    }
  }
  if (!/^[0-9a-f]{40}$/.test(process.env.RELEASE_TOOLING_COMMIT ?? '')) {
    throw new Error('RELEASE_TOOLING_COMMIT is not an exact commit hash.');
  }
  if (!/^[0-9a-f]{64}$/.test(process.env.RELEASE_TOOLING_AGGREGATE_SHA256 ?? '')) {
    throw new Error('RELEASE_TOOLING_AGGREGATE_SHA256 is not an exact aggregate.');
  }
}

async function verifySnapshot(root) {
  exactEnv();
  const {releaseBytes, release} = await readFrozenRelease(root);
  if (
    release.dirty
    || release.buildId !== RELEASE_BUILD_ID
    || release.commit !== 'cd61093b2af158ca1ba08f26c84c732f30007d4d'
    || release.tree !== '3b4b2807ed02880fdc3fea060f576548fcdc1dcb'
  ) throw new Error('Frozen release identity differs from the approved candidate.');
  const packageLockBytes = await readFile(path.join(root, 'package-lock.json'));
  if (sha256(packageLockBytes) !== release.packageLockSha256) {
    throw new Error('Isolated package lock differs from the frozen release.');
  }
  for (const [pathField, hashField, expectedPath] of [
    ['shellFile', 'shellFileSha256', 'scripts/deploy-locked.sh'],
    ['bootstrapFile', 'bootstrapFileSha256', 'scripts/run-locked-polkadot-app-deploy.mjs'],
    ['driverFile', 'driverFileSha256', 'scripts/lib/locked-deploy-driver.mjs'],
    ['evidenceLibraryFile', 'evidenceLibraryFileSha256', 'scripts/lib/release-evidence.mjs'],
    ['directOwnerRuntimeFile', 'directOwnerRuntimeFileSha256', 'scripts/lib/direct-owner-runtime.mjs'],
  ]) {
    if (release.polkadotAppDeploy?.launcher?.[pathField] !== expectedPath
      || sha256(await readFile(path.join(root, expectedPath))) !== release.polkadotAppDeploy.launcher[hashField]) {
      throw new Error(`Frozen launcher source changed at ${expectedPath}.`);
    }
  }
  for (const [field, file] of [
    ['configFileSha256', 'polkadot-app-deploy.config.ts'],
    ['environmentFileSha256', ENVIRONMENT_FILE],
  ]) {
    if (sha256(await readFile(path.join(root, file))) !== release.polkadotAppDeploy?.[field]) {
      throw new Error(`Frozen release anchor changed at ${file}.`);
    }
  }
  if (release.polkadotAppDeploy?.codeAnchorFile !== 'deployment/dotns-code-anchors-2026-08-23.json'
    || sha256(await readFile(path.join(root, release.polkadotAppDeploy.codeAnchorFile)))
      !== release.polkadotAppDeploy.codeAnchorFileSha256) {
    throw new Error('DotNS code-anchor file differs from the frozen release binding.');
  }
  const carPath = safeRepoPath(root, CAR_FILE, 'Frozen promotion CAR');
  const carBytes = await readFile(carPath.absolute);
  const car = await inspectCar(carPath.absolute, releaseBytes, release);
  if (car.sha256 !== RELEASE_CAR_SHA256 || car.rootCid !== RELEASE_ROOT_CID) {
    throw new Error('Frozen CAR hash/CID differs from the explicit approval.');
  }
  const directory = await verifyReleaseDirectory(root, releaseBytes, release);
  const cli = await verifyLockedDeploymentCli(root, {childEnv: process.env});
  if (JSON.stringify(cli) !== JSON.stringify(release.polkadotAppDeploy?.lockedCli)) {
    throw new Error('Fresh isolated deployment runtime differs from the frozen attestation.');
  }
  const iconBytes = await readFile(path.join(root, ICON_FILE));
  const iconCid = createCID(iconBytes, 0x55, BLAKE2B_256_MULTIHASH_CODE).toString();
  return {
    releaseBytes,
    release,
    carPath,
    carBytes,
    car,
    directory,
    cli,
    iconBytes,
    iconCid,
    manifests: expectedReleaseManifests(iconCid),
  };
}

async function environmentContext(root, release) {
  const environmentPath = path.join(root, ENVIRONMENT_FILE);
  const [{doc}, anchored] = await Promise.all([
    loadEnvironments({userFilePath: environmentPath}),
    verifyEnvironmentAnchors(root, ENVIRONMENT),
  ]);
  const resolved = resolveEndpoints(doc, ENVIRONMENT);
  const pinned = JSON.parse(await readFile(environmentPath, 'utf8'))
    .environments.find(entry => entry.id === ENVIRONMENT);
  if (!pinned || pinned.contracts.PUBLISHER) {
    throw new Error('Paseo override is absent or unexpectedly pins a Publisher.');
  }
  assertFrozenEnvironmentBinding(release, anchored, resolved);
  return {anchored, resolved, pinned};
}

async function readFinalizedReleaseState(environment) {
  const client = createClient(getWsProvider(environment.anchored.context.target.assetHubWss));
  try {
    const finalizedHead = await client.getFinalizedBlock();
    const ethBlock = await environment.anchored.provider.getBlock(finalizedHead.number);
    const paired = assertFinalizedHeadPair(finalizedHead, ethBlock);
    const state = await readReleaseAuthorityState(
      environment.anchored.provider,
      environment.anchored.context,
      RELEASE_DOMAIN,
      finalizedHead.number,
    );
    return {
      state,
      finalizedHead: paired.finalizedHead,
      ethBlock: paired.ethBlock,
    };
  } finally {
    client.destroy();
  }
}

async function readBaseRegistrarOwner(provider, registrarAddress, blockTag = 'latest') {
  const tokenId = ethers.BigNumber.from(releaseNodes().baseNode);
  const iface = new ethers.utils.Interface(REGISTRAR_ABI);
  const data = iface.encodeFunctionData('ownerOf', [tokenId]);
  try {
    const result = await provider.call({to: registrarAddress, data}, blockTag);
    return ethers.utils.getAddress(iface.decodeFunctionResult('ownerOf', result)[0]);
  } catch (error) {
    const revert = (error.data ?? error.error?.data ?? '').toLowerCase();
    const nonexistent = ethers.utils.id('ERC721NonexistentToken(uint256)').slice(0, 10).toLowerCase();
    const expectedArgument = ethers.utils.defaultAbiCoder.encode(['uint256'], [tokenId]).slice(2).toLowerCase();
    if (revert === `${nonexistent}${expectedArgument}`) return null;
    throw new Error(`Registrar ownerOf failed with an unrecognized response: ${error.message}`);
  }
}

async function readOwnership(provider, context, blockTag = 'latest') {
  const nodes = releaseNodes();
  const registry = new ethers.Contract(context.pad.contracts.DOTNS_REGISTRY, REGISTRY_ABI, provider);
  const [baseRegistrarOwner, baseRegistryOwner, appOwner] = await Promise.all([
    readBaseRegistrarOwner(provider, context.pad.contracts.DOTNS_REGISTRAR, blockTag),
    registry.owner(nodes.baseNode, {blockTag}),
    registry.owner(nodes.appNode, {blockTag}),
  ]);
  return {
    baseRegistrarOwner,
    baseRegistryOwner: ethers.utils.getAddress(baseRegistryOwner),
    appOwner: ethers.utils.getAddress(appOwner),
  };
}

async function probeSubnodeResolver(provider, pinned, blockTag = 'latest') {
  const iface = new ethers.utils.Interface([...REGISTRY_ABI, 'error NotAuthorised()']);
  const data = iface.encodeFunctionData('setSubnodeResolver', [{
    parentNode: ethers.constants.HashZero,
    subLabel: 'app',
    parentLabel: releaseNodes().label,
    resolver: pinned.contracts.DOTNS_CONTENT_RESOLVER,
  }]);
  const result = await provider.call({
    to: pinned.contracts.DOTNS_REGISTRY,
    from: PASEO_WORKER.h160,
    data,
  }, blockTag);
  const expected = iface.getSighash('NotAuthorised()');
  if (result.toLowerCase() !== expected.toLowerCase()) {
    throw new Error('Registry did not recognize parent-authorized setSubnodeResolver.');
  }
  return {functionSelector: data.slice(0, 10), recognizedErrorSelector: result};
}

async function preflight(verified, environment) {
  const client = createClient(getWsProvider(environment.anchored.context.target.assetHubWss));
  let substrate;
  try {
    const finalized = await client.getFinalizedBlock();
    const api = client.getUnsafeApi();
    const [mapping, account, nativeToEthRatioRaw] = await Promise.all([
      api.query.Revive.OriginalAccount.getValue(PASEO_WORKER.h160, {at: finalized.hash}),
      api.query.System.Account.getValue(PASEO_WORKER.ss58, {at: finalized.hash}),
      api.constants.Revive.NativeToEthRatio(),
    ]);
    substrate = {
      finalizedHead: finalized,
      mapped: mapping !== null && mapping !== undefined,
      freeBalance: BigInt(account?.data?.free ?? 0n),
      nativeToEthRatio: BigInt(nativeToEthRatioRaw),
    };
  } finally {
    client.destroy();
  }
  if (!substrate.mapped) throw new Error('Public worker is not mapped at the finalized Asset Hub head.');
  if (substrate.freeBalance < 2_000_000_000_000n) {
    throw new Error('Public worker lacks the reviewed registration storage-deposit floor.');
  }
  const {provider, context} = environment.anchored;
  const blockTag = substrate.finalizedHead.number;
  const personhood = new ethers.Contract(PERSONHOOD_ADDRESS, PERSONHOOD_ABI, provider);
  const popRules = new ethers.Contract(environment.pinned.contracts.POP_RULES, POP_RULES_ABI, provider);
  const [popStatusRaw, ownership, transferFeeWei, resolverProbe] = await Promise.all([
    personhood.personhoodStatus(PASEO_WORKER.h160, PERSONHOOD_CONTEXT, {blockTag}),
    readOwnership(provider, context, blockTag),
    popRules.transferFloor(releaseNodes().label, PASEO_WORKER.h160, DEVINSON_OWNER, {blockTag}),
    probeSubnodeResolver(provider, environment.pinned, blockTag),
  ]);
  const popStatus = Number(popStatusRaw.toString());
  if (popStatus !== 0) throw new Error('Public worker no longer has the reviewed NoStatus classification.');
  const baseOwner = ownership.baseRegistrarOwner?.toLowerCase() ?? null;
  if (baseOwner && ![PASEO_WORKER.h160, DEVINSON_OWNER].includes(baseOwner)) {
    throw new Error(`Fallback label is unexpectedly owned by ${ownership.baseRegistrarOwner}.`);
  }
  if (baseOwner === null && ownership.baseRegistryOwner.toLowerCase() !== ZERO) {
    throw new Error('Unregistered base token has a non-zero registry owner.');
  }
  if (baseOwner && ownership.baseRegistryOwner.toLowerCase() !== baseOwner) {
    throw new Error('Base registrar and registry owners differ.');
  }
  const registrarControllerProbe = await probeWorkerRegistrarController(environment);
  return {
    readOnly: true,
    worker: {
      ...PASEO_WORKER,
      mapped: substrate.mapped,
      freeBalance: substrate.freeBalance.toString(),
      popStatus,
      nativeToEthRatio: substrate.nativeToEthRatio.toString(),
    },
    ownership,
    transferFeeWei: transferFeeWei.toString(),
    resolverProbe,
    registrarControllerProbe,
    assetHubFinalizedHead: substrate.finalizedHead,
    endpoint: environment.anchored.evidence,
    candidate: {buildId: verified.release.buildId, carSha256: verified.car.sha256, cid: verified.car.rootCid},
  };
}

async function connectWorker(environment) {
  const dotns = new DotNS();
  await dotns.connect({
    mnemonic: DEFAULT_MNEMONIC,
    rpc: environment.resolved.assetHub[0],
    assetHubEndpoints: environment.resolved.assetHub,
    autoAccountMapping: false,
    environmentId: ENVIRONMENT,
    contracts: environment.pinned.contracts,
    nativeToEthRatio: environment.resolved.nativeToEthRatio,
    registerStorageDeposit: environment.resolved.registerStorageDeposit,
  });
  if (dotns.substrateAddress !== PASEO_WORKER.ss58 || dotns.evmAddress?.toLowerCase() !== PASEO_WORKER.h160) {
    dotns.disconnect();
    throw new Error('Pinned package default worker identity changed.');
  }
  return dotns;
}

async function probeWorkerRegistrarController(environment) {
  const dotns = await connectWorker(environment);
  try {
    const commitment = await dotns.contractCall(
      environment.pinned.contracts.DOTNS_REGISTRAR_CONTROLLER,
      REGISTRAR_CONTROLLER_ABI,
      'makeCommitment',
      [{
        label: releaseNodes().label,
        owner: PASEO_WORKER.h160,
        secret: `0x${randomBytes(32).toString('hex')}`,
        reserved: false,
      }],
    );
    if (!/^0x[0-9a-f]{64}$/iu.test(commitment)) {
      throw new Error('Registrar controller returned an invalid commitment shape.');
    }
    return {
      readOnly: true,
      contract: environment.pinned.contracts.DOTNS_REGISTRAR_CONTROLLER,
      functionSelector: new ethers.utils.Interface(REGISTRAR_CONTROLLER_ABI).getSighash('makeCommitment'),
      resultBytes: 32,
    };
  } finally {
    dotns.disconnect();
  }
}

async function waitForFinalizedStorage(client, cids) {
  const deadline = Date.now() + 240_000;
  let observed = [];
  while (Date.now() < deadline) {
    observed = await probeChunks(cids, {client, atFinalized: true});
    if (observed.every(entry => entry.present === true)) {
      const head = await client.getFinalizedBlock();
      return {finalizedHead: head, cids: assertFinalizedStorageProof(observed, cids)};
    }
    await new Promise(resolve => setTimeout(resolve, 4_000));
  }
  throw new Error(`Bulletin finalized storage proof timed out: ${JSON.stringify(observed)}.`);
}

async function withGatewayRetry(action) {
  let lastError;
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      if (attempt < 12) await new Promise(resolve => setTimeout(resolve, 5_000));
    }
  }
  throw lastError;
}

export async function readSystemAccountNonce(unsafeApi, ss58) {
  const account = await unsafeApi.query.System.Account.getValue(ss58);
  const nonce = Number(account?.nonce);
  if (!Number.isSafeInteger(nonce) || nonce < 0) {
    throw new Error(`Bulletin returned an invalid system nonce for ${ss58}.`);
  }
  return nonce;
}

async function uploadFrozenStorage(root, verified, environment) {
  const poolAccount = derivePoolAccounts(10)[2];
  if (!poolAccount) throw new Error('Pinned shared Bulletin pool account is unavailable.');
  const carBytes = await readFile(verified.carPath.absolute);
  const rebuilt = await rebuildOrderedCarFromBytes(carBytes, []);
  if (Buffer.compare(Buffer.from(rebuilt.carBytes), carBytes) !== 0) {
    throw new Error('Pinned ordered-CAR reconstruction changes the frozen CAR bytes.');
  }
  if (computeStorageCid(rebuilt.chunks) !== RELEASE_ROOT_CID) {
    throw new Error('Frozen CAR ordered chunks do not reconstruct the approved storage CID.');
  }
  const endpoint = environment.resolved.bulletin[0];
  const client = createClient(getWsProvider(endpoint));
  try {
    const unsafeApi = client.getUnsafeApi();
    const storage = await storeChunkedContent(rebuilt.chunks, {
      client,
      unsafeApi,
      signer: poolAccount.signer,
      ss58: poolAccount.address,
      gateway: environment.pinned.ipfs,
      // polkadot-app-deploy@0.13.1 otherwise reads its compiled-in legacy
      // Paseo Bulletin endpoint here, even when an exact current client was
      // supplied above. Bind nonce reads to the same pinned unsafe API.
      fetchNonce: (_endpoints, ss58) => readSystemAccountNonce(unsafeApi, ss58),
      // Always probe deterministic frozen chunks so a finalized upload can be
      // resumed without re-submitting identical Bulletin data.
      skipCids: new Set(rebuilt.chunkCids),
    });
    if (storage.storageCid !== RELEASE_ROOT_CID) throw new Error('Bulletin stored a CID other than the frozen release CID.');
    const iconCid = await storeFile(verified.iconBytes, {
      client,
      unsafeApi,
      signer: poolAccount.signer,
      hashCode: BLAKE2B_256_MULTIHASH_CODE,
    });
    if (iconCid !== verified.iconCid) throw new Error('Bulletin icon CID differs from the frozen icon CID.');
    const finalized = await waitForFinalizedStorage(client, [...rebuilt.chunkCids, RELEASE_ROOT_CID, iconCid]);
    const [releaseGateway, iconGateway] = await Promise.all([
      withGatewayRetry(() => verifyDirectIpfsFile({
        url: `${environment.pinned.ipfs}/ipfs/${RELEASE_ROOT_CID}`,
        expectedBytes: verified.carBytes,
        sha256,
      })),
      withGatewayRetry(() => verifyDirectIpfsFile({
        url: `${environment.pinned.ipfs}/ipfs/${iconCid}`,
        expectedBytes: verified.iconBytes,
        sha256,
      })),
    ]);
    return {
      evidenceBoundary: 'finalized CID presence plus immutable gateway byte equality; Bulletin upload APIs do not expose finalized transaction receipts',
      endpoint,
      poolAccount: poolAccount.address,
      rootCid: storage.storageCid,
      iconCid,
      finalized,
      releaseGateway,
      iconGateway,
    };
  } finally {
    client.destroy();
  }
}

function txSemantic(kind, contract, abi, functionName, args) {
  const iface = new ethers.utils.Interface(abi);
  return {kind, contract, callData: iface.encodeFunctionData(functionName, args)};
}

async function recordAndVerifyResolution(environment, resolution, kind, semanticCalls) {
  const transaction = {
    kind,
    ...requireFinalizedResolution(resolution, kind),
    semanticCalls,
  };
  const [verified] = await verifyFinalizedTransactions(
    environment.anchored.context.target.assetHubWss,
    [transaction],
  );
  return verified;
}

async function registerBase(dotns, environment) {
  const label = releaseNodes().label;
  const registration = {
    label,
    owner: PASEO_WORKER.h160,
    secret: `0x${randomBytes(32).toString('hex')}`,
    reserved: false,
  };
  const controller = environment.pinned.contracts.DOTNS_REGISTRAR_CONTROLLER;
  const commitment = await dotns.contractCall(controller, REGISTRAR_CONTROLLER_ABI, 'makeCommitment', [registration]);
  const commitResolution = await dotns.contractTransaction(
    controller,
    0n,
    REGISTRAR_CONTROLLER_ABI,
    'commit',
    [commitment],
    status => console.log(`   commit: ${status}`),
    {verifyEffect: async () => BigInt(await dotns.contractCall(controller, REGISTRAR_CONTROLLER_ABI, 'commitments', [commitment])) > 0n},
  );
  const commit = await recordAndVerifyResolution(environment, commitResolution, 'base-commit', [
    txSemantic('commit', controller, REGISTRAR_CONTROLLER_ABI, 'commit', [commitment]),
  ]);
  await dotns.waitForCommitmentAge(commitment);
  const pricing = await dotns.getPriceAndValidate(label);
  const priceWei = BigInt(pricing.priceWei);
  const bufferedPaymentWei = priceWei * 110n / 100n;
  const nativeRatio = BigInt(dotns._nativeToEthRatio);
  if (nativeRatio <= 0n) throw new Error('Chain-derived native-to-ETH ratio is not positive.');
  const paymentNative = bufferedPaymentWei / nativeRatio;
  if (priceWei > 0n && paymentNative === 0n) throw new Error('Registration payment conversion underflow.');
  const nodes = releaseNodes();
  const registerResolution = await dotns.contractTransaction(
    controller,
    paymentNative,
    REGISTRAR_CONTROLLER_ABI,
    'register',
    [registration],
    status => console.log(`   register: ${status}`),
    {verifyEffect: async () => {
      const owner = await readBaseRegistrarOwner(environment.anchored.provider, environment.pinned.contracts.DOTNS_REGISTRAR);
      return owner?.toLowerCase() === PASEO_WORKER.h160;
    }},
  );
  const register = await recordAndVerifyResolution(environment, registerResolution, 'base-register', [
    txSemantic('register', controller, REGISTRAR_CONTROLLER_ABI, 'register', [registration]),
  ]);
  const owner = await readBaseRegistrarOwner(environment.anchored.provider, environment.pinned.contracts.DOTNS_REGISTRAR);
  if (owner?.toLowerCase() !== PASEO_WORKER.h160) throw new Error('Base registration did not give the worker exact ownership.');
  return {commit, register, priceWei: priceWei.toString(), paymentNative: paymentNative.toString(), tokenId: nodes.baseNode};
}

export function publicationCalls(environment, verified) {
  const nodes = releaseNodes();
  const resolver = environment.pinned.contracts.DOTNS_CONTENT_RESOLVER;
  const registry = environment.pinned.contracts.DOTNS_REGISTRY;
  const contenthash = `0x${encodeContenthash(RELEASE_ROOT_CID)}`;
  const rootText = JSON.stringify(verified.manifests.rootManifest);
  const executableText = JSON.stringify(verified.manifests.executableManifest);
  return [
    // The pinned batch helper reuses the first call's weight for later calls.
    // Put the largest text write first so the shared estimate is conservative.
    {kind: 'base-manifest', contractAddress: resolver, abi: CONTENT_RESOLVER_ABI, functionName: 'setText', args: [nodes.baseNode, 'manifest', rootText]},
    {kind: 'base-content', contractAddress: resolver, abi: CONTENT_RESOLVER_ABI, functionName: 'setContenthash', args: [nodes.baseNode, contenthash]},
    {kind: 'base-resolver', contractAddress: registry, abi: REGISTRY_ABI, functionName: 'setResolver', args: [nodes.baseNode, resolver]},
    {kind: 'app-owner', contractAddress: registry, abi: REGISTRY_ABI, functionName: 'setSubnodeOwner', args: [{parentNode: nodes.baseNode, subLabel: 'app', parentLabel: nodes.label, owner: PASEO_WORKER.h160}]},
    {kind: 'app-resolver', contractAddress: registry, abi: REGISTRY_ABI, functionName: 'setSubnodeResolver', args: [{parentNode: nodes.baseNode, subLabel: 'app', parentLabel: nodes.label, resolver}]},
    {kind: 'app-content', contractAddress: resolver, abi: CONTENT_RESOLVER_ABI, functionName: 'setContenthash', args: [nodes.appNode, contenthash]},
    {kind: 'app-executable', contractAddress: resolver, abi: CONTENT_RESOLVER_ABI, functionName: 'setText', args: [nodes.appNode, 'executable', executableText]},
  ];
}

async function publishRecords(dotns, verified, environment) {
  const calls = publicationCalls(environment, verified);
  const resolution = await dotns.submitBatchedContractCalls(
    calls,
    status => console.log(`   records: ${status}`),
    'ChopDot exact release records',
    {verifyEffect: async () => {
      try {
        const state = await readReleaseAuthorityState(environment.anchored.provider, environment.anchored.context);
        assertReleaseAuthorityState(state, {
          phase: 'worker',
          resolver: environment.pinned.contracts.DOTNS_CONTENT_RESOLVER,
          ...manifestOptions(verified),
        });
        return true;
      } catch {
        return false;
      }
    }},
  );
  const transaction = await recordAndVerifyResolution(environment, resolution, 'release-records', calls.map(call => (
    txSemantic(call.kind, call.contractAddress, call.abi, call.functionName, call.args)
  )));
  const finalized = await readFinalizedReleaseState(environment);
  const state = assertReleaseAuthorityState(
    finalized.state,
    {
      phase: 'worker',
      resolver: environment.pinned.contracts.DOTNS_CONTENT_RESOLVER,
      ...manifestOptions(verified),
    },
  );
  return {transaction, state, finalizedHead: finalized.finalizedHead};
}

async function handoff(dotns, verified, environment) {
  const resolver = environment.pinned.contracts.DOTNS_CONTENT_RESOLVER;
  const finalizedBefore = await readFinalizedReleaseState(environment);
  const before = finalizedBefore.state;
  const actions = planHandoff(before, {resolver});
  if (actions.includes('restore-app-resolver')) {
    if (!assertRecipientRetryState(before, resolver, verified).needsResolverRepair) {
      throw new Error('App resolver repair was planned without a resolver gap.');
    }
  } else {
    assertReleaseRecords(before, {resolver, ...manifestOptions(verified)});
  }
  const transactions = [];
  if (actions.includes('handoff-app')) {
    const calls = appHandoffCalls({resolver}).map(call => ({
      kind: call.functionName,
      contractAddress: environment.pinned.contracts.DOTNS_REGISTRY,
      abi: REGISTRY_ABI,
      functionName: call.functionName,
      args: call.args,
    }));
    const resolution = await dotns.submitBatchedContractCalls(
      calls,
      status => console.log(`   app handoff: ${status}`),
      'ChopDot app authority + resolver handoff',
      {verifyEffect: async () => {
        const state = await readReleaseAuthorityState(environment.anchored.provider, environment.anchored.context);
        return state.appOwner.toLowerCase() === DEVINSON_OWNER
          && state.appResolver.toLowerCase() === resolver.toLowerCase();
      }},
    );
    transactions.push(await recordAndVerifyResolution(environment, resolution, 'app-owner-and-resolver', calls.map(call => (
      txSemantic(call.kind, call.contractAddress, call.abi, call.functionName, call.args)
    ))));
  } else if (actions.includes('restore-app-resolver')) {
    const call = appHandoffCalls({resolver})[1];
    const resolution = await dotns.contractTransaction(
      environment.pinned.contracts.DOTNS_REGISTRY,
      0n,
      REGISTRY_ABI,
      call.functionName,
      call.args,
      status => console.log(`   app resolver: ${status}`),
    );
    transactions.push(await recordAndVerifyResolution(environment, resolution, 'app-resolver-repair', [
      txSemantic('app-resolver-repair', environment.pinned.contracts.DOTNS_REGISTRY, REGISTRY_ABI, call.functionName, call.args),
    ]));
  }
  const finalizedIntermediate = await readFinalizedReleaseState(environment);
  const intermediate = finalizedIntermediate.state;
  assertReleaseRecords(intermediate, {resolver, ...manifestOptions(verified)});
  if (actions.includes('transfer-base')) {
    if (
      intermediate.baseRegistrarOwner.toLowerCase() !== PASEO_WORKER.h160
      || intermediate.baseRegistryOwner.toLowerCase() !== PASEO_WORKER.h160
      || intermediate.appOwner.toLowerCase() !== DEVINSON_OWNER
      || intermediate.appResolver.toLowerCase() !== resolver.toLowerCase()
    ) throw new Error('Intermediate child handoff proof failed; refusing base transfer.');
    const quote = await dotns.quoteTransferFloorNative(releaseNodes().label, PASEO_WORKER.h160, DEVINSON_OWNER);
    const feeWei = BigInt(quote.feeWei);
    const feeNative = BigInt(quote.feeNative);
    const chainNativeToEthRatio = BigInt(dotns._nativeToEthRatio);
    if (chainNativeToEthRatio <= 0n) throw new Error('Chain-derived native-to-ETH ratio is not positive.');
    const args = [PASEO_WORKER.h160, DEVINSON_OWNER, ethers.BigNumber.from(releaseNodes().baseNode)];
    const resolution = await dotns.contractTransaction(
      environment.pinned.contracts.DOTNS_REGISTRAR,
      feeNative,
      REGISTRAR_ABI,
      'transferFrom',
      args,
      status => console.log(`   base handoff: ${status}`),
    );
    const transaction = await recordAndVerifyResolution(environment, resolution, 'base-owner', [
      txSemantic('base-owner', environment.pinned.contracts.DOTNS_REGISTRAR, REGISTRAR_ABI, 'transferFrom', args),
    ]);
    transactions.push({
      ...transaction,
      feeWei: feeWei.toString(),
      feeNative: feeNative.toString(),
      chainNativeToEthRatio: chainNativeToEthRatio.toString(),
    });
  }
  const finalizedFinal = await readFinalizedReleaseState(environment);
  const final = assertReleaseAuthorityState(
    finalizedFinal.state,
    {phase: 'final', resolver, ...manifestOptions(verified)},
  );
  return {
    actions,
    before,
    beforeFinalizedHead: finalizedBefore.finalizedHead,
    intermediate,
    intermediateFinalizedHead: finalizedIntermediate.finalizedHead,
    final,
    finalFinalizedHead: finalizedFinal.finalizedHead,
    transactions,
  };
}

async function verifyFinal(verified, environment) {
  const finalized = await readFinalizedReleaseState(environment);
  const state = assertReleaseAuthorityState(
    finalized.state,
    {
      phase: 'final',
      resolver: environment.pinned.contracts.DOTNS_CONTENT_RESOLVER,
      ...manifestOptions(verified),
    },
  );
  const [releaseGateway, iconGateway] = await Promise.all([
    verifyDirectIpfsFile({
      url: `${environment.pinned.ipfs}/ipfs/${RELEASE_ROOT_CID}`,
      expectedBytes: verified.carBytes,
      sha256,
    }),
    verifyDirectIpfsFile({
      url: `${environment.pinned.ipfs}/ipfs/${verified.iconCid}`,
      expectedBytes: verified.iconBytes,
      sha256,
    }),
  ]);
  return {state, finalizedHead: finalized.finalizedHead, ethBlock: finalized.ethBlock, releaseGateway, iconGateway};
}

async function release(root, verified, environment) {
  const before = await preflight(verified, environment);
  const owner = before.ownership.baseRegistrarOwner?.toLowerCase() ?? null;
  if (owner === DEVINSON_OWNER) return {
    before,
    alreadyFinal: true,
    final: await verifyFinal(verified, environment),
    retryEvidenceBoundary: 'exact finalized owner/resolver/content/manifest state; prior transaction attribution is not claimed after lost acknowledgement',
  };
  const storage = await uploadFrozenStorage(root, verified, environment);
  const raceCheck = await readOwnership(environment.anchored.provider, environment.anchored.context);
  const raceOwner = raceCheck.baseRegistrarOwner?.toLowerCase() ?? null;
  if (raceOwner && raceOwner !== PASEO_WORKER.h160) {
    throw new Error(`Fallback label changed owner during storage publication: ${raceCheck.baseRegistrarOwner}.`);
  }
  const dotns = await connectWorker(environment);
  try {
    const registration = raceOwner === null ? await registerBase(dotns, environment) : {status: 'already-worker-owned'};
    const currentOwnership = await readOwnership(environment.anchored.provider, environment.anchored.context);
    let publication;
    if ([ZERO, PASEO_WORKER.h160].includes(currentOwnership.appOwner.toLowerCase())) {
      publication = await publishRecords(dotns, verified, environment);
    } else if (currentOwnership.appOwner.toLowerCase() === DEVINSON_OWNER) {
      const finalized = await readFinalizedReleaseState(environment);
      const state = finalized.state;
      const resolver = environment.pinned.contracts.DOTNS_CONTENT_RESOLVER;
      assertRecipientRetryState(state, resolver, verified);
      publication = {
        status: 'records-already-exact-app-already-handed-off',
        state,
        finalizedHead: finalized.finalizedHead,
        evidenceBoundary: 'exact finalized state; prior app-handoff transaction attribution is not claimed',
      };
    } else {
      throw new Error(`App subname is unexpectedly owned by ${currentOwnership.appOwner}.`);
    }
    const transfer = await handoff(dotns, verified, environment);
    const final = await verifyFinal(verified, environment);
    return {
      before,
      storage,
      registration,
      publication,
      transfer,
      final,
      sharedWorkerRisk: 'accepted testnet availability risk bounded to this one uninterrupted release command',
      retryEvidenceBoundary: 'writes acknowledged in this run carry independently verified transaction proof; writes already landed before this run are accepted only through exact finalized state and prior transaction attribution is not claimed',
    };
  } finally {
    dotns.disconnect();
  }
}

async function main() {
  const mode = process.argv[2];
  if (!MODES.has(mode) || process.argv.length !== 3) {
    throw new Error(`Mode must be exactly one of ${[...MODES].join(', ')}.`);
  }
  const root = process.env.CHOPDOT_RELEASE_SNAPSHOT;
  if (!root || path.resolve(root) !== root) throw new Error('CHOPDOT_RELEASE_SNAPSHOT must be an absolute isolated path.');
  const verified = await verifySnapshot(root);
  const environment = await environmentContext(root, verified.release);
  let result;
  try {
    if (mode === 'preflight') result = await preflight(verified, environment);
    else if (mode === 'release') result = await release(root, verified, environment);
    else result = await verifyFinal(verified, environment);
  } finally {
    environment.anchored.provider.destroy?.();
  }
  const attestation = {
    schema: 'chopdot.paseo-worker-release.v2',
    mode,
    checkedAt: new Date().toISOString(),
    environment: ENVIRONMENT,
    domain: RELEASE_DOMAIN,
    worker: PASEO_WORKER,
    expectedFinalOwner: DEVINSON_OWNER,
    candidate: {
      commit: verified.release.commit,
      tree: verified.release.tree,
      buildId: verified.release.buildId,
      car: {path: CAR_FILE, sha256: verified.car.sha256, rootCid: verified.car.rootCid, bytes: verified.car.bytes},
      directory: verified.directory,
      icon: {path: ICON_FILE, cid: verified.iconCid, sha256: sha256(verified.iconBytes)},
    },
    tooling: {
      commit: process.env.RELEASE_TOOLING_COMMIT,
      aggregateSha256: process.env.RELEASE_TOOLING_AGGREGATE_SHA256,
      sourceManifest: JSON.parse(process.env.CHOPDOT_TOOLING_MANIFEST_JSON),
      isolatedRuntimeRootOutsideChopDot: !root.startsWith('/Users/devinsonpena/ChopDot/'),
    },
    lockedRuntime: verified.cli,
    endpoint: environment.anchored.evidence,
    result,
  };
  console.log(`CHOPDOT_PASEO_WORKER_RELEASE ${JSON.stringify(attestation)}`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    await main();
  } catch (error) {
    console.error(`Worker Paseo release failed: ${error.message}`);
    process.exit(1);
  }
}
