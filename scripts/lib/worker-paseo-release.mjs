import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {CID} from 'multiformats/cid';
import {ethers} from 'ethers';
import {createClient} from 'polkadot-api';
import {getWsProvider} from 'polkadot-api/ws';
import {blake2AsHex} from '@polkadot/util-crypto';

export const PASEO_WORKER = Object.freeze({
  ss58: '5DfhGyQdFobKM8NsWvEeAKk5EQQgYe9AydgJ7rMB6E1EqRzV',
  h160: '0x35cdb23ff7fc86e8dccd577ca309bfea9c978d20',
});

export const DEVINSON_OWNER = '0xb76021eefd3932c51dec30fe9c681984d72f923e';
export const RELEASE_DOMAIN = 'chopdotapp01.dot';
export const RELEASE_CAR_SHA256 = 'b9fa8263b7f83c05a32547803078db1bbb47c232c5fc8d07b4f8f5657a34a6ae';
export const RELEASE_ROOT_CID = 'bafybeifuwlobydydh2ezprm57qix6s6xwnm47fy3u6zvsnghd27i6cdztq';
export const RELEASE_BUILD_ID = 'chopdot-cd61093b2af1-68ce7c04192f';
export const RELEASE_DESCRIPTION = 'Split shared spending, collect payments, and keep one clear group record.';
export const RELEASE_APP_VERSION = Object.freeze([0, 1, 0]);

export const REGISTRY_ABI = Object.freeze([
  'function owner(bytes32 node) view returns (address)',
  'function resolver(bytes32 node) view returns (address)',
  'function setSubnodeOwner((bytes32 parentNode,string subLabel,string parentLabel,address owner) record) returns (bytes32 subnode)',
  'function setSubnodeResolver((bytes32 parentNode,string subLabel,string parentLabel,address resolver) record)',
  'function setResolver(bytes32 node,address resolver)',
]);
export const REGISTRAR_ABI = Object.freeze([
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function transferFrom(address from,address to,uint256 tokenId)',
]);
export const CONTENT_RESOLVER_ABI = Object.freeze([
  'function contenthash(bytes32 node) view returns (bytes)',
  'function text(bytes32 node,string key) view returns (string)',
  'function setContenthash(bytes32 node,bytes hash)',
  'function setText(bytes32 node,string key,string value)',
]);

function exactKeys(value, expected, label) {
  const actual = Object.keys(value ?? {}).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label} has unexpected or missing fields.`);
  }
}

export function expectedReleaseManifests(iconCid) {
  CID.parse(iconCid);
  return {
    rootManifest: {
      $v: 1,
      displayName: 'ChopDot',
      description: RELEASE_DESCRIPTION,
      icon: {cid: iconCid, format: 'png'},
    },
    executableManifest: {$v: 1, kind: 'app', appVersion: [...RELEASE_APP_VERSION]},
  };
}

export function assertFrozenEnvironmentBinding(release, anchored, resolved) {
  if (anchored.context.target.assetHubWss !== resolved.assetHub[0]) {
    throw new Error('Pinned and independently anchored Asset Hub endpoints differ.');
  }
  const frozen = release.recoveryHeadIndex?.deployments?.['paseo-next-v2'];
  if (!frozen) throw new Error('Frozen release lacks the Paseo recovery/environment deployment binding.');
  const exactFields = [
    ['assetHubWss', anchored.context.target.assetHubWss],
    ['ethRpc', anchored.context.target.ethRpc],
    ['assetHubGenesis', anchored.context.target.assetHubGenesis],
    ['chainId', anchored.context.target.chainId],
    ['paraId', anchored.context.target.paraId],
    ['endpointCodeAnchorSha256', anchored.context.codeAnchorFileSha256],
  ];
  for (const [field, observed] of exactFields) {
    if (String(frozen[field]).toLowerCase() !== String(observed).toLowerCase()) {
      throw new Error(`Current Paseo ${field} differs from the frozen release deployment binding.`);
    }
  }
  if (anchored.context.codeAnchorFileSha256 !== release.polkadotAppDeploy?.codeAnchorFileSha256) {
    throw new Error('Current DotNS code-anchor hash differs from release.json.');
  }
  for (const [name, expected] of Object.entries(frozen.endpointCodeAnchors ?? {})) {
    const observed = anchored.evidence.contracts[name];
    if (!observed
      || observed.address.toLowerCase() !== expected.address.toLowerCase()
      || observed.bytes !== expected.bytes
      || observed.sha256 !== expected.sha256) {
      throw new Error(`Current ${name} code evidence differs from the frozen release deployment binding.`);
    }
  }
  return frozen;
}

export function assertFinalizedHeadPair(finalizedHead, ethBlock) {
  if (!Number.isSafeInteger(finalizedHead?.number) || !/^0x[0-9a-f]{64}$/i.test(finalizedHead?.hash ?? '')) {
    throw new Error('Substrate finalized head is malformed.');
  }
  if (!Number.isSafeInteger(ethBlock?.number)
    || !/^0x[0-9a-f]{64}$/i.test(ethBlock?.hash ?? '')
    || ethBlock.number !== finalizedHead.number) {
    throw new Error('ETH RPC cannot corroborate the exact finalized Asset Hub height.');
  }
  return {
    finalizedHead: {number: finalizedHead.number, hash: finalizedHead.hash},
    ethBlock: {
      number: ethBlock.number,
      hash: ethBlock.hash,
      hashDomain: 'Ethereum compatibility block hash; intentionally distinct from the Substrate finalized block hash',
    },
  };
}

function normalized(value) {
  return ethers.utils.getAddress(value).toLowerCase();
}

function decodeContenthash(value, label) {
  const bytes = Buffer.from(ethers.utils.arrayify(value));
  if (bytes.length < 4 || bytes[0] !== 0xe3 || bytes[1] !== 0x01) {
    throw new Error(`${label} is not an IPFS contenthash value.`);
  }
  return CID.decode(bytes.subarray(2)).toString();
}

export function releaseNodes(domain = RELEASE_DOMAIN) {
  if (domain !== RELEASE_DOMAIN) throw new Error(`Worker release domain must be ${RELEASE_DOMAIN}.`);
  const label = domain.slice(0, -4);
  return {
    domain,
    label,
    appDomain: `app.${domain}`,
    baseNode: ethers.utils.namehash(domain),
    appNode: ethers.utils.namehash(`app.${domain}`),
  };
}

export function appHandoffCalls({domain = RELEASE_DOMAIN, recipient = DEVINSON_OWNER, resolver}) {
  const nodes = releaseNodes(domain);
  const owner = ethers.utils.getAddress(recipient);
  const anchoredResolver = ethers.utils.getAddress(resolver);
  return [
    {
      functionName: 'setSubnodeOwner',
      args: [{
        parentNode: nodes.baseNode,
        subLabel: 'app',
        parentLabel: nodes.label,
        owner,
      }],
    },
    {
      functionName: 'setSubnodeResolver',
      args: [{
        parentNode: nodes.baseNode,
        subLabel: 'app',
        parentLabel: nodes.label,
        resolver: anchoredResolver,
      }],
    },
  ];
}

export function planHandoff(state, {
  worker = PASEO_WORKER.h160,
  recipient = DEVINSON_OWNER,
  resolver,
} = {}) {
  const workerAddress = normalized(worker);
  const recipientAddress = normalized(recipient);
  const expectedResolver = normalized(resolver);
  const baseRegistrarOwner = normalized(state.baseRegistrarOwner);
  const baseRegistryOwner = normalized(state.baseRegistryOwner);
  const appOwner = normalized(state.appOwner);
  const appResolver = normalized(state.appResolver);
  if (baseRegistrarOwner !== baseRegistryOwner) {
    throw new Error('Base registrar and registry owners differ; refusing handoff.');
  }
  if (baseRegistrarOwner === recipientAddress) {
    if (appOwner !== recipientAddress || appResolver !== expectedResolver) {
      throw new Error('Base already belongs to Devinson but app authority is incomplete; worker recovery is no longer authorized.');
    }
    return [];
  }
  if (baseRegistrarOwner !== workerAddress) {
    throw new Error(`Base is owned by an unexpected third party ${state.baseRegistrarOwner}.`);
  }
  if (appOwner === workerAddress) return ['handoff-app', 'transfer-base'];
  if (appOwner === recipientAddress) {
    return appResolver === expectedResolver
      ? ['transfer-base']
      : ['restore-app-resolver', 'transfer-base'];
  }
  throw new Error(`App subname is owned by an unexpected third party ${state.appOwner}.`);
}

export function assertReleaseAuthorityState(state, {
  phase,
  worker = PASEO_WORKER.h160,
  recipient = DEVINSON_OWNER,
  resolver,
  rootCid = RELEASE_ROOT_CID,
  expectedRootManifest,
  expectedExecutableManifest,
} = {}) {
  const expectedOwner = normalized(phase === 'worker' ? worker : recipient);
  const owners = [state.baseRegistrarOwner, state.baseRegistryOwner, state.appOwner].map(normalized);
  if (owners.some(owner => owner !== expectedOwner)) {
    throw new Error(`${phase} authority proof does not have one expected owner across registrar, base registry, and app registry.`);
  }
  return assertReleaseRecords(state, {
    resolver,
    rootCid,
    expectedRootManifest,
    expectedExecutableManifest,
  });
}

export function assertReleaseRecords(state, {
  resolver,
  rootCid = RELEASE_ROOT_CID,
  expectedRootManifest,
  expectedExecutableManifest,
} = {}) {
  const expectedResolver = normalized(resolver);
  for (const [label, observed] of [['base', state.baseResolver], ['app', state.appResolver]]) {
    if (normalized(observed) !== expectedResolver) throw new Error(`${label} resolver is not the anchored content resolver.`);
  }
  if (state.baseContentCid !== rootCid || state.appContentCid !== rootCid) {
    throw new Error('Base/app contenthash differs from the frozen CAR root CID.');
  }
  if (!expectedRootManifest || !expectedExecutableManifest) {
    throw new Error('Exact reviewed manifests are required for authority proof.');
  }
  exactKeys(state.rootManifest, ['$v', 'displayName', 'description', 'icon'], 'Root manifest');
  exactKeys(state.rootManifest.icon, ['cid', 'format'], 'Root manifest icon');
  exactKeys(state.executableManifest, ['$v', 'kind', 'appVersion'], 'Executable manifest');
  if (JSON.stringify(state.rootManifest) !== JSON.stringify(expectedRootManifest)) {
    throw new Error('Root manifest differs from the exact reviewed ChopDot manifest.');
  }
  if (JSON.stringify(state.executableManifest) !== JSON.stringify(expectedExecutableManifest)) {
    throw new Error('Executable manifest differs from the exact reviewed app manifest.');
  }
  return state;
}

export async function readReleaseAuthorityState(provider, context, domain = RELEASE_DOMAIN, blockTag = 'latest') {
  const nodes = releaseNodes(domain);
  const registrar = new ethers.Contract(context.pad.contracts.DOTNS_REGISTRAR, REGISTRAR_ABI, provider);
  const registry = new ethers.Contract(context.pad.contracts.DOTNS_REGISTRY, REGISTRY_ABI, provider);
  const resolver = new ethers.Contract(context.pad.contracts.DOTNS_CONTENT_RESOLVER, CONTENT_RESOLVER_ABI, provider);
  const [
    baseRegistrarOwner,
    baseRegistryOwner,
    appOwner,
    baseResolver,
    appResolver,
    baseContenthash,
    appContenthash,
    rootText,
    executableText,
  ] = await Promise.all([
    registrar.ownerOf(ethers.BigNumber.from(nodes.baseNode), {blockTag}),
    registry.owner(nodes.baseNode, {blockTag}),
    registry.owner(nodes.appNode, {blockTag}),
    registry.resolver(nodes.baseNode, {blockTag}),
    registry.resolver(nodes.appNode, {blockTag}),
    resolver.contenthash(nodes.baseNode, {blockTag}),
    resolver.contenthash(nodes.appNode, {blockTag}),
    resolver.text(nodes.baseNode, 'manifest', {blockTag}),
    resolver.text(nodes.appNode, 'executable', {blockTag}),
  ]);
  return {
    ...nodes,
    baseRegistrarOwner: ethers.utils.getAddress(baseRegistrarOwner),
    baseRegistryOwner: ethers.utils.getAddress(baseRegistryOwner),
    appOwner: ethers.utils.getAddress(appOwner),
    baseResolver: ethers.utils.getAddress(baseResolver),
    appResolver: ethers.utils.getAddress(appResolver),
    baseContentCid: decodeContenthash(baseContenthash, 'Base contenthash'),
    appContentCid: decodeContenthash(appContenthash, 'App contenthash'),
    rootManifest: JSON.parse(rootText),
    executableManifest: JSON.parse(executableText),
  };
}

export function requireFinalizedResolution(resolution, label) {
  if (
    resolution?.kind !== 'hash'
    || !/^0x[0-9a-f]{64}$/i.test(resolution.hash ?? '')
    || !Number.isSafeInteger(resolution.block?.number)
    || !/^0x[0-9a-f]{64}$/i.test(resolution.block?.hash ?? '')
  ) throw new Error(`${label} lacks an exact finalized transaction hash and block.`);
  return {
    transactionHash: resolution.hash.toLowerCase(),
    blockNumber: resolution.block.number,
    blockHash: resolution.block.hash.toLowerCase(),
  };
}

export async function verifyFinalizedTransactions(wss, transactions, {
  clientFactory = endpoint => createClient(getWsProvider(endpoint)),
} = {}) {
  if (!transactions.length) return [];
  const client = clientFactory(wss);
  const verified = [];
  try {
    const finalized = await client.getFinalizedBlock();
    const api = client.getUnsafeApi();
    for (const transaction of transactions) {
      if (transaction.blockNumber > finalized.number) {
        throw new Error(`${transaction.kind} is above the independently observed finalized head.`);
      }
      const observedBlockHash = await client._request('chain_getBlockHash', [transaction.blockNumber]);
      if (observedBlockHash?.toLowerCase() !== transaction.blockHash.toLowerCase()) {
        throw new Error(`${transaction.kind} returned a block hash that differs from chain readback.`);
      }
      const block = await client._request('chain_getBlock', [observedBlockHash]);
      const extrinsics = block?.block?.extrinsics ?? [];
      const hashes = extrinsics.map(extrinsic => blake2AsHex(extrinsic, 256).toLowerCase());
      const extrinsicIndex = hashes.indexOf(transaction.transactionHash.toLowerCase());
      if (extrinsicIndex < 0) throw new Error(`${transaction.kind} transaction is absent from its reported block.`);
      const events = await api.query.System.Events.getValue({at: observedBlockHash});
      const matching = events.filter(record => record?.phase?.type === 'ApplyExtrinsic'
        && Number(record.phase.value) === extrinsicIndex);
      const succeeded = matching.some(record => record?.event?.type === 'System'
        && record.event.value?.type === 'ExtrinsicSuccess');
      const failed = matching.some(record => record?.event?.type === 'System'
        && record.event.value?.type === 'ExtrinsicFailed');
      if (!succeeded || failed) throw new Error(`${transaction.kind} lacks unambiguous System.ExtrinsicSuccess.`);
      const bytes = extrinsics[extrinsicIndex].toLowerCase();
      for (const semantic of transaction.semanticCalls ?? []) {
        if (!bytes.includes(semantic.contract.toLowerCase().slice(2))
          || !bytes.includes(semantic.callData.toLowerCase().slice(2))) {
          throw new Error(`${transaction.kind} does not carry the exact ${semantic.kind} contract call.`);
        }
      }
      verified.push({
        ...transaction,
        extrinsicIndex,
        finalizedHeadNumber: finalized.number,
        finalizedHeadHash: finalized.hash,
        systemExtrinsicSuccess: true,
      });
    }
  } finally {
    client.destroy();
  }
  return verified;
}

export function assertFinalizedStorageProof(observed, expectedCids) {
  const byCid = new Map(observed.map(entry => [entry.cid, entry]));
  for (const cid of expectedCids) {
    const entry = byCid.get(cid);
    if (!entry || entry.present !== true || !Number.isSafeInteger(entry.block) || !Number.isSafeInteger(entry.index)) {
      throw new Error(`CID ${cid} lacks exact finalized Bulletin presence proof.`);
    }
  }
  if (byCid.size !== new Set(expectedCids).size) throw new Error('Bulletin proof contains unexpected CID entries.');
  return observed;
}

export async function verifyDirectIpfsFile({url, expectedBytes, sha256}) {
  const response = await fetch(url, {
    redirect: 'follow',
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}.`);
  const observed = Buffer.from(await response.arrayBuffer());
  if (observed.byteLength !== expectedBytes.byteLength || sha256(observed) !== sha256(expectedBytes)) {
    throw new Error(`${url} does not serve the frozen file bytes.`);
  }
  return {url, bytes: observed.byteLength, sha256: sha256(observed)};
}

export async function readFrozenRelease(root) {
  const releasePath = path.join(root, 'dist-dot-host/release.json');
  const releaseBytes = await readFile(releasePath);
  return {releasePath, releaseBytes, release: JSON.parse(releaseBytes)};
}
