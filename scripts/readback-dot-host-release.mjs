import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  generateReadbackEvidence,
  parseArgument,
  requireArgument,
  safeRepoPath,
  verifyReadbackEvidence,
} from './lib/release-evidence.mjs';

const root = process.cwd();
const verifyEvidence = parseArgument('verify-evidence');
if (verifyEvidence) {
  const verified = await verifyReadbackEvidence(root, verifyEvidence);
  console.log(JSON.stringify({
    status: 'pass',
    mode: 'fresh-live-verification',
    evidencePath: verified.path,
    evidenceSha256: verified.sha256,
    environment: verified.value.environment,
    domain: verified.value.domain,
    buildId: verified.value.release.buildId,
    contentCid: verified.value.dotns.rootContentCid,
  }, null, 2));
  process.exit(0);
}

const environment = requireArgument('environment');
const domain = requireArgument('domain');
const car = requireArgument('car');
const deployLog = requireArgument('deploy-log');
const expectedOwner = requireArgument('expected-devinson-owner');
const output = safeRepoPath(root, requireArgument('output'), 'Readback evidence output');
if (!output.relative.startsWith(`deployment${path.sep}readbacks${path.sep}`)) {
  throw new Error('Readback evidence must be written below deployment/readbacks/.');
}
const evidence = await generateReadbackEvidence({root, environment, domain, car, deployLog, expectedOwner});
await mkdir(path.dirname(output.absolute), {recursive: true});
await writeFile(output.absolute, `${JSON.stringify(evidence, null, 2)}\n`, {flag: 'wx'});
console.log(JSON.stringify({
  status: 'pass',
  mode: 'independent-live-readback',
  evidencePath: output.relative,
  environment,
  domain,
  buildId: evidence.release.buildId,
  owner: evidence.dotns.owner,
  expectedDevinsonOwner: evidence.expectedDevinsonOwner,
  contentCid: evidence.dotns.rootContentCid,
  carRootCid: evidence.car.rootCid,
  transactionCount: evidence.transactions.length,
  gatewayCount: Object.keys(evidence.gateways).length,
}, null, 2));
