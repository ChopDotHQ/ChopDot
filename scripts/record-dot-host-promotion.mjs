import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  inspectCar,
  requireArgument,
  safeRepoPath,
  sha256,
  verifyReadbackEvidence,
} from './lib/release-evidence.mjs';

const root = process.cwd();
const releaseBytes = await readFile(path.join(root, 'dist-dot-host/release.json'));
const release = JSON.parse(releaseBytes);
if (release.dirty) throw new Error('Promotion evidence cannot be recorded for a dirty release.');
const expectedDevinsonOwner = requireArgument('expected-devinson-owner');
if (!/^0x[0-9a-f]{40}$/i.test(expectedDevinsonOwner)) throw new Error('Expected Devinson owner must be an explicit H160 address.');
const car = safeRepoPath(root, requireArgument('car'), 'Promotion CAR');
const carEvidence = await inspectCar(car.absolute, releaseBytes, release);
const [devnet, paseo] = await Promise.all([
  verifyReadbackEvidence(root, requireArgument('devnet-readback')),
  verifyReadbackEvidence(root, requireArgument('paseo-readback')),
]);
if (devnet.value.environment !== 'devnet' || paseo.value.environment !== 'paseo-next-v2') {
  throw new Error('Promotion requires one independently verified readback from each exact environment.');
}
if (devnet.value.domain !== paseo.value.domain) throw new Error('Devnet and Paseo domains differ.');
for (const record of [devnet, paseo]) {
  if (
    record.value.release.sha256 !== sha256(releaseBytes)
    || record.value.release.buildId !== release.buildId
    || record.value.release.commit !== release.commit
    || record.value.release.tree !== release.tree
    || record.value.car.path !== car.relative
    || record.value.car.sha256 !== carEvidence.sha256
    || record.value.car.rootCid !== carEvidence.rootCid
  ) {
    throw new Error(`${record.value.environment} readback does not describe the exact candidate/CAR.`);
  }
  if (
    record.value.expectedDevinsonOwner?.toLowerCase() !== expectedDevinsonOwner.toLowerCase()
    || record.value.dotns.owner?.toLowerCase() !== expectedDevinsonOwner.toLowerCase()
  ) throw new Error(`${record.value.environment} ownership proof is not the explicitly approved Devinson address.`);
  if (record.value.dotns.rootContentCid !== record.value.dotns.appContentCid) {
    throw new Error(`${record.value.environment} base/app DotNS content CIDs differ.`);
  }
}
if (devnet.value.dotns.rootContentCid !== paseo.value.dotns.rootContentCid) {
  throw new Error('Promotion refused: Devnet and Paseo resolve to different content CIDs.');
}
const evidence = {
  schema: 'chopdot.dot-host-promotion.v3',
  buildId: release.buildId,
  commit: release.commit,
  tree: release.tree,
  domain: devnet.value.domain,
  expectedDevinsonOwner,
  releaseJsonSha256: sha256(releaseBytes),
  car: {path: car.relative, ...carEvidence},
  identicalContentCid: devnet.value.dotns.rootContentCid,
  targets: {
    devnet: {
      assetHubGenesis: devnet.value.endpoint.corroboratingAssetHubGenesis,
      owner: devnet.value.dotns.owner,
      rootCid: devnet.value.dotns.rootContentCid,
      appCid: devnet.value.dotns.appContentCid,
      readback: {path: devnet.path, sha256: devnet.sha256},
      transactions: devnet.value.transactions,
      gateways: devnet.value.gateways,
    },
    'paseo-next-v2': {
      assetHubGenesis: paseo.value.endpoint.corroboratingAssetHubGenesis,
      owner: paseo.value.dotns.owner,
      rootCid: paseo.value.dotns.rootContentCid,
      appCid: paseo.value.dotns.appContentCid,
      readback: {path: paseo.path, sha256: paseo.sha256},
      transactions: paseo.value.transactions,
      gateways: paseo.value.gateways,
    },
  },
  recordedAt: new Date().toISOString(),
  evidenceLaw: 'All CIDs, owners, transactions, block inclusion, DotNS records, and gateway bytes came from fresh independently executed readbacks; no CID/owner/transaction value is accepted as a shape-only command argument.',
};
const directory = path.join(root, 'deployment/releases');
await mkdir(directory, {recursive: true});
const evidencePath = path.join(directory, `${release.buildId}.promotion.json`);
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, {flag: 'wx'});
console.log(JSON.stringify({
  status: 'pass',
  evidencePath: path.relative(root, evidencePath),
  buildId: evidence.buildId,
  domain: evidence.domain,
  carSha256: evidence.car.sha256,
  carRootCid: evidence.car.rootCid,
  contentCid: evidence.identicalContentCid,
  independentlyVerifiedTargets: 2,
}, null, 2));
