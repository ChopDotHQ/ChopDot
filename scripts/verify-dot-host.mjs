import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {CID} from 'multiformats/cid';
import {
  inspectCar,
  sha256,
  withIsolatedDeploymentRuntime,
  verifyReadbackEvidence,
} from './lib/release-evidence.mjs';
import {createSupplyChainEvidence} from './lib/supply-chain-evidence.mjs';
import {createRuntimeSecurityEvidence} from './lib/runtime-security-evidence.mjs';

const root = process.cwd();
const output = path.join(root, 'dist-dot-host');
const strict = process.env.DOT_RELEASE_STRICT === '1';
const live = process.env.DOT_RELEASE_LIVE === '1';
const failures = [];
let checks = 0;
const check = (condition, message) => {
  checks += 1;
  if (!condition) failures.push(message);
};
function git(...args) {
  return execFileSync('git', args, {cwd: root, encoding: 'utf8'}).trim();
}
async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(target));
    else if (entry.name !== 'release.json') files.push(target);
  }
  return files.sort();
}
async function json(file) {
  const bytes = await readFile(file);
  return {bytes, value: JSON.parse(bytes)};
}
function command(commandName, args) {
  return execFileSync(commandName, args, {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});
}

const releaseRecord = await json(path.join(output, 'release.json'));
const release = releaseRecord.value;
const targets = (await json(path.join(root, 'deployment/recovery-head-index-targets.json'))).value;
const environmentRecord = await json(path.join(root, 'deployment/pad-environments-2026-08-23.json'));
const environmentProvenance = (await json(path.join(root, 'deployment/pad-environments-2026-08-23.provenance.json'))).value;
const codeAnchorRecord = await json(path.join(root, 'deployment/dotns-code-anchors-2026-08-23.json'));
const pvmRecord = await json(path.join(root, 'contracts/recovery-head-index/artifacts/pvm-manifest.json'));
const pvm = pvmRecord.value;
const packageLockBytes = await readFile(path.join(root, 'package-lock.json'));
const iconBase64 = (await readFile(path.join(root, 'deployment/assets/chopdot-icon.png.base64'), 'utf8')).trim();
const canonicalIcon = Buffer.from(iconBase64, 'base64');
const supplyChain = await createSupplyChainEvidence(root);
const runtimeSecurity = await createRuntimeSecurityEvidence(root);
const runtimeSecurityBytes = Buffer.from(`${JSON.stringify(runtimeSecurity, null, 2)}\n`);
const actual = [];
for (const file of await walk(output)) {
  const bytes = await readFile(file);
  actual.push({path: path.relative(output, file), bytes: bytes.byteLength, sha256: sha256(bytes)});
}
const aggregate = sha256(actual.map((entry) => `${entry.path}\0${entry.sha256}\n`).join(''));
const currentCommit = git('rev-parse', 'HEAD');
const currentTree = git('rev-parse', 'HEAD^{tree}');
const currentStatus = git('status', '--porcelain=v1', '--untracked-files=all');
const officialEnvironment = {
  sha256: '18adfc1cf58e12ac51cf146ef0e7fe6998a188de4854e7eb8d563cecc49973ff',
  sourceCommit: 'd1cc36998c7f25ea4a194176d98883655995c855',
  sourceUrl: 'https://raw.githubusercontent.com/paritytech/polkadot-app-deploy/d1cc36998c7f25ea4a194176d98883655995c855/assets/environments.json',
};

check(release.schema === 'chopdot.release.v3', 'release.json is not chopdot.release.v3');
check(release.commit === currentCommit && release.tree === currentTree, 'release source commit/tree is stale');
check(release.packageLockSha256 === sha256(packageLockBytes), 'release package-lock hash is stale');
check(release.supplyChain?.packageCount === supplyChain.packageCount, 'release SBOM package count is stale');
check(release.supplyChain?.unknownLicenseCount === supplyChain.unknownLicenseCount, 'release license inventory count is stale');
check(release.supplyChain?.unknownLicenseCount === 0, 'release license inventory contains unresolved package licenses');
check(release.supplyChain?.sbom?.sha256 === supplyChain.sbom.sha256 && release.supplyChain?.sbom?.bytes === supplyChain.sbom.bytes.byteLength, 'release SBOM evidence is stale');
check(release.supplyChain?.licenses?.sha256 === supplyChain.licenses.sha256 && release.supplyChain?.licenses?.bytes === supplyChain.licenses.bytes.byteLength, 'release license evidence is stale');
check(release.runtimeSecurity?.advisory === 'GHSA-ggr8-5vv4-36mx' && release.runtimeSecurity?.disposition === 'accepted-for-public-testnet-only', 'release runtime vulnerability disposition is missing');
check(release.runtimeSecurity?.suspectBrowserInputs === 0, 'release browser graph contains a developer-only vulnerable package');
check(release.runtimeSecurity?.sha256 === sha256(runtimeSecurityBytes) && release.runtimeSecurity?.bytes === runtimeSecurityBytes.byteLength, 'release runtime security evidence is stale');
check(JSON.stringify(actual) === JSON.stringify(release.files), 'file manifest does not match release.json');
check(aggregate === release.contentSha256, 'content aggregate does not match release.json');
check(!actual.some((entry) => entry.path.endsWith('.map')), 'source maps remain in dot-host output');
const index = await readFile(path.join(output, 'index.html'), 'utf8');
check(index.includes('<title>ChopDot</title>'), 'index title is not ChopDot');
const icon = actual.find((entry) => entry.path === 'chopdot-icon.png');
check(Boolean(icon) && icon.sha256 === release.icon?.sha256, 'release icon is missing or mismatched');
check(
  canonicalIcon.toString('base64') === iconBase64
    && canonicalIcon.subarray(1, 4).toString('ascii') === 'PNG'
    && sha256(canonicalIcon) === icon?.sha256
    && sha256(iconBase64) === release.icon?.sourceSha256,
  'release icon differs from its canonical committed source',
);
check(
  sha256(environmentRecord.bytes) === officialEnvironment.sha256
    && environmentProvenance.sha256 === officialEnvironment.sha256
    && environmentProvenance.sourceCommit === officialEnvironment.sourceCommit
    && environmentProvenance.sourceUrl === officialEnvironment.sourceUrl,
  'environment override no longer matches the reviewed official source',
);
check(
  release.polkadotAppDeploy?.environmentFileSha256 === officialEnvironment.sha256
    && release.polkadotAppDeploy?.sourceCommit === officialEnvironment.sourceCommit
    && release.polkadotAppDeploy?.sourceUrl === officialEnvironment.sourceUrl,
  'release.json environment override identity is stale',
);
check(
  release.polkadotAppDeploy?.codeAnchorFileSha256 === sha256(codeAnchorRecord.bytes),
  'release.json endpoint code-anchor identity is stale',
);
check(
  release.polkadotAppDeploy?.configFile === 'polkadot-app-deploy.config.ts'
    && release.polkadotAppDeploy?.configFileSha256 === sha256(await readFile(path.join(root, 'polkadot-app-deploy.config.ts'))),
  'release.json deployment config identity is stale',
);
for (const [pathField, hashField, expectedPath] of [
  ['shellFile', 'shellFileSha256', 'scripts/deploy-locked.sh'],
  ['bootstrapFile', 'bootstrapFileSha256', 'scripts/run-locked-polkadot-app-deploy.mjs'],
  ['driverFile', 'driverFileSha256', 'scripts/lib/locked-deploy-driver.mjs'],
  ['evidenceLibraryFile', 'evidenceLibraryFileSha256', 'scripts/lib/release-evidence.mjs'],
]) {
  check(
    release.polkadotAppDeploy?.launcher?.[pathField] === expectedPath
      && release.polkadotAppDeploy?.launcher?.[hashField] === sha256(await readFile(path.join(root, expectedPath))),
    `release.json deployment launcher identity is stale for ${expectedPath}`,
  );
}
try {
  const lockedCli = await withIsolatedDeploymentRuntime(root);
  check(JSON.stringify(lockedCli) === JSON.stringify(release.polkadotAppDeploy?.lockedCli), 'release locked deployment CLI attestation is stale');
} catch (error) {
  failures.push(error.message);
}

const pvmBytecode = await readFile(path.join(root, pvm.bytecode.path));
const pvmAbi = await readFile(path.join(root, pvm.abi.path));
const pvmSource = await readFile(path.join(root, pvm.source.path));
const artifactSet = sha256(`${pvm.bytecode.path}\0${pvm.bytecode.sha256}\n${pvm.abi.path}\0${pvm.abi.sha256}\n`);
const buildInputs = sha256(JSON.stringify({source: pvm.source, contract: pvm.contract, compiler: pvm.compiler, optimizer: pvm.optimizer}));
check(sha256(pvmBytecode) === pvm.bytecode.sha256 && pvmBytecode.byteLength === pvm.bytecode.bytes, 'compile-once PVM bytecode is stale');
check(sha256(pvmAbi) === pvm.abi.sha256 && pvmAbi.byteLength === pvm.abi.bytes, 'compile-once ABI is stale');
check(sha256(pvmSource) === pvm.source.sha256, 'current Solidity source differs from the compiler manifest');
check(pvm.artifactSetSha256 === artifactSet, 'PVM artifact-set digest is invalid');
check(pvm.buildInputsSha256 === buildInputs, 'PVM build-input digest is invalid');
check(pvm.compiler?.packageVersion === '1.4.0' && pvm.compiler?.solcPackageVersion === '0.8.28', 'PVM compiler pair is not pinned');
check(release.recoveryHeadIndex?.compilerManifestSha256 === sha256(pvmRecord.bytes), 'release PVM compiler manifest hash is stale');
check(release.recoveryHeadIndex?.source?.sha256 === pvm.source.sha256, 'release Solidity source hash is stale');
check(release.recoveryHeadIndex?.abi?.sha256 === pvm.abi.sha256, 'release ABI hash is stale');
check(release.recoveryHeadIndex?.pvmBytecode?.sha256 === pvm.bytecode.sha256, 'release PVM bytecode hash is stale');
check(release.recoveryHeadIndex?.buildInputsSha256 === pvm.buildInputsSha256, 'release build-input digest is stale');
check(release.recoveryHeadIndex?.artifactSetSha256 === pvm.artifactSetSha256, 'release artifact-set digest is stale');
const verificationInputs = release.recoveryHeadIndex?.verificationInputs;
check(verificationInputs?.compileScriptSha256 === sha256(await readFile(path.join(root, 'scripts/compile-recovery-head-pvm.mjs'))), 'release compile verifier hash is stale');
check(verificationInputs?.hardhatParityScriptSha256 === sha256(await readFile(path.join(root, 'scripts/verify-hardhat-pvm.mjs'))), 'release Hardhat parity verifier hash is stale');
check(verificationInputs?.behaviorConfigSha256 === sha256(await readFile(path.join(root, 'contracts/recovery-head-index/hardhat.behavior.config.cjs'))), 'release Solidity behavior config hash is stale');
check(verificationInputs?.behaviorTestSha256 === sha256(await readFile(path.join(root, 'contracts/recovery-head-index/test/RecoveryHeadIndex.behavior.cjs'))), 'release Solidity behavior test hash is stale');

if (!strict) {
  check(release.dirty === Boolean(currentStatus), 'release dirty flag is stale');
  check(release.dirtyStatusSha256 === (currentStatus ? sha256(currentStatus) : null), 'release dirty-path fingerprint is stale');
}

if (strict) {
  check(live, 'strict release verification requires DOT_RELEASE_LIVE=1; use npm run verify:dot-host:strict');
  check(!release.dirty, 'strict release was built from a dirty worktree');
  if (!failures.length) {
    for (const args of [
      ['run', 'contract:verify:pvm'],
      ['run', 'contract:hardhat:pvm'],
      ['run', 'test:recovery-contract:behavior'],
      ['run', 'security:runtime-boundary'],
      ['run', 'verify:dot-host:rebuild'],
    ]) {
      try {
        command('npm', args);
        checks += 1;
      } catch (error) {
        failures.push(`${args.join(' ')} failed: ${error.stderr?.toString() ?? error.message}`);
      }
    }
  }
  for (const environment of ['devnet', 'paseo-next-v2']) {
    const expected = targets.environments[environment];
    const deployment = release.recoveryHeadIndex?.deployments?.[environment];
    if (!deployment) {
      failures.push(`strict release lacks ${environment} recovery contract evidence`);
      continue;
    }
    let record;
    try {
      record = await json(path.join(root, 'deployment/recovery-head-index', `${environment}.json`));
    } catch {
      failures.push(`strict release cannot read ${environment} recovery contract evidence`);
      continue;
    }
    check(deployment.evidenceSha256 === sha256(record.bytes), `${environment} deployment evidence hash mismatch`);
    check(deployment.assetHubGenesis?.toLowerCase() === expected.assetHubGenesis.toLowerCase(), `${environment} deployment genesis mismatch`);
    check(deployment.endpointCodeAnchorSha256 === sha256(codeAnchorRecord.bytes), `${environment} endpoint code-anchor mismatch`);
    check(deployment.pvmBytecodeSha256 === pvm.bytecode.sha256 && deployment.readbackBytecodeSha256 === pvm.bytecode.sha256, `${environment} deployed PVM hash mismatch`);
    check(deployment.sourceSha256 === pvm.source.sha256 && deployment.abiSha256 === pvm.abi.sha256, `${environment} source/ABI deployment identity mismatch`);
    check(deployment.buildInputsSha256 === pvm.buildInputsSha256 && deployment.artifactSetSha256 === pvm.artifactSetSha256, `${environment} build/artifact identity mismatch`);
    check(/^0x[0-9a-f]{40}$/i.test(deployment.address ?? ''), `${environment} contract address is invalid`);
    check(/^0x[0-9a-f]{64}$/i.test(deployment.transactionHash ?? '') && /^0x[0-9a-f]{64}$/i.test(deployment.blockHash ?? '') && Number.isInteger(deployment.blockNumber), `${environment} deployment transaction/block evidence is invalid`);
    try {
      const behavior = await json(path.join(root, deployment.liveBehavior?.path ?? ''));
      check(deployment.liveBehavior?.sha256 === sha256(behavior.bytes), `${environment} live PVM behavior evidence hash mismatch`);
      check(behavior.value.address?.toLowerCase() === deployment.address.toLowerCase(), `${environment} live PVM behavior contract mismatch`);
      check(behavior.value.transaction?.status === 1 && behavior.value.transaction?.finalizedHeadNumber >= behavior.value.transaction?.blockNumber, `${environment} live PVM behavior transaction/finality proof is invalid`);
      check(Object.values(behavior.value.assertions ?? {}).every(value => value === true), `${environment} live PVM behavior assertions are incomplete`);
    } catch (error) {
      failures.push(`${environment} live PVM behavior evidence is unavailable: ${error.message}`);
    }
    if (live && /^0x[0-9a-f]{40}$/i.test(deployment.address ?? '')) {
      try {
        command(process.execPath, [
          'scripts/recovery-head-deployment.mjs',
          `--environment=${environment}`,
          '--readback',
          `--address=${deployment.address}`,
          `--transaction-hash=${deployment.transactionHash}`,
          `--block-number=${deployment.blockNumber}`,
          `--block-hash=${deployment.blockHash}`,
        ]);
        checks += 1;
      } catch (error) {
        failures.push(`${environment} live recovery code readback failed: ${error.stderr?.toString() ?? error.message}`);
      }
      try {
        command(process.execPath, [
          'scripts/recovery-head-deployment.mjs',
          `--environment=${environment}`,
          '--verify-behavior',
          `--address=${deployment.address}`,
        ]);
        checks += 1;
      } catch (error) {
        failures.push(`${environment} live recovery behavior readback failed: ${error.stderr?.toString() ?? error.message}`);
      }
    }
  }

  const promotionPath = path.resolve(root, process.env.DOT_PROMOTION_EVIDENCE ?? `deployment/releases/${release.buildId}.promotion.json`);
  let promotion;
  try {
    promotion = (await json(promotionPath)).value;
  } catch {
    failures.push(`strict release lacks promotion evidence at ${path.relative(root, promotionPath)}`);
  }
  const allowedPostBuildEvidence = new Set([path.relative(root, promotionPath)]);
  if (promotion) {
    check(promotion.schema === 'chopdot.dot-host-promotion.v3', 'promotion evidence schema mismatch');
    check(/^0x[0-9a-f]{40}$/i.test(process.env.DOT_EXPECTED_DEVINSON_OWNER ?? ''), 'strict proof requires DOT_EXPECTED_DEVINSON_OWNER');
    check(promotion.expectedDevinsonOwner?.toLowerCase() === process.env.DOT_EXPECTED_DEVINSON_OWNER?.toLowerCase(), 'promotion owner is not the explicitly approved Devinson address');
    check(promotion.buildId === release.buildId && promotion.commit === release.commit && promotion.tree === release.tree, 'promotion release identity mismatch');
    check(promotion.releaseJsonSha256 === sha256(releaseRecord.bytes), 'promotion release.json hash mismatch');
    let car;
    try {
      car = await inspectCar(path.join(root, promotion.car.path), releaseRecord.bytes, release);
      check(car.sha256 === promotion.car.sha256 && car.rootCid === promotion.car.rootCid, 'promotion CAR identity mismatch');
      CID.parse(promotion.identicalContentCid);
      allowedPostBuildEvidence.add(promotion.car.path);
    } catch (error) {
      failures.push(`promotion CAR/CID verification failed: ${error.message}`);
    }
    const records = [];
    for (const environment of ['devnet', 'paseo-next-v2']) {
      const target = promotion.targets?.[environment];
      if (!target?.readback?.path) {
        failures.push(`promotion lacks ${environment} independent readback`);
        continue;
      }
      allowedPostBuildEvidence.add(target.readback.path);
      try {
        const verified = live
          ? await verifyReadbackEvidence(root, target.readback.path)
          : await json(path.join(root, target.readback.path)).then((record) => ({path: target.readback.path, sha256: sha256(record.bytes), value: record.value}));
        check(verified.sha256 === target.readback.sha256, `${environment} promotion readback hash mismatch`);
        check(verified.value.release.sha256 === sha256(releaseRecord.bytes), `${environment} readback release hash mismatch`);
        check(verified.value.domain === promotion.domain, `${environment} promotion domain mismatch`);
        check(verified.value.expectedDevinsonOwner?.toLowerCase() === process.env.DOT_EXPECTED_DEVINSON_OWNER?.toLowerCase(), `${environment} expected Devinson owner mismatch`);
        check(verified.value.dotns.owner === target.owner, `${environment} promotion owner mismatch`);
        check(target.owner?.toLowerCase() === process.env.DOT_EXPECTED_DEVINSON_OWNER?.toLowerCase(), `${environment} DotNS owner is not Devinson`);
        check(verified.value.dotns.rootContentCid === target.rootCid && verified.value.dotns.appContentCid === target.appCid, `${environment} promotion DotNS CID mismatch`);
        check(target.rootCid === promotion.identicalContentCid && target.appCid === promotion.identicalContentCid, `${environment} content differs from promotion CID`);
        check(verified.value.transactions.length >= 2 && JSON.stringify(verified.value.transactions) === JSON.stringify(target.transactions), `${environment} transaction/block evidence mismatch`);
        for (const gateway of Object.values(verified.value.gateways)) {
          check(gateway.fileCount === release.files.length + 1, `${environment} gateway file-count proof mismatch`);
          check(gateway.htmlJsCssCount >= 3, `${environment} gateway lacks HTML/JS/CSS byte proof`);
          check(Array.isArray(gateway.files) && gateway.files.every((entry) => /^https:\/\//.test(entry.url)), `${environment} gateway URLs are incomplete`);
          const expectedGatewayFiles = [...release.files, {path: 'release.json', bytes: releaseRecord.bytes.byteLength, sha256: sha256(releaseRecord.bytes)}].sort((a, b) => a.path.localeCompare(b.path));
          check(JSON.stringify(gateway.files?.map(({path: filePath, bytes, sha256: fileSha}) => ({path: filePath, bytes, sha256: fileSha}))) === JSON.stringify(expectedGatewayFiles), `${environment} gateway does not prove every exact manifested file`);
        }
        allowedPostBuildEvidence.add(verified.value.deployLog.path);
        records.push(verified.value);
      } catch (error) {
        failures.push(`${environment} independent live readback failed: ${error.message}`);
      }
    }
    if (records.length === 2) check(records[0].car.sha256 === records[1].car.sha256, 'environment readbacks used different CAR bytes');
  }
  const dirtyPaths = currentStatus ? currentStatus.split('\n').map((line) => line.slice(3)).filter(Boolean) : [];
  const nonEvidenceDirtyPaths = dirtyPaths.filter((dirtyPath) => !allowedPostBuildEvidence.has(dirtyPath));
  check(nonEvidenceDirtyPaths.length === 0, `strict release worktree has non-evidence dirty paths (${nonEvidenceDirtyPaths.length})`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(JSON.stringify({
  status: 'pass',
  mode: strict ? 'strict-live-release-proof' : 'candidate-only-non-release',
  releaseApproved: strict,
  buildId: release.buildId,
  files: actual.length,
  checks,
  dirty: release.dirty,
}, null, 2));
