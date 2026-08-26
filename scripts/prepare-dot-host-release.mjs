import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile, readdir, unlink, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  assertAllowedReleaseFiles,
  assertNoAgentRuntimeContent,
  assertNoAgentRuntimeFiles,
  assertViteAssetProvenance,
  createReleaseOutcomeReceipt,
  verifyGithubOutcomeAttestation,
  withIsolatedDeploymentRuntime,
} from './lib/release-evidence.mjs';
import {validateOutcomePacket} from './agent-system/outcome.mjs';
import {createSupplyChainEvidence} from './lib/supply-chain-evidence.mjs';
import {createRuntimeSecurityEvidence} from './lib/runtime-security-evidence.mjs';

const root = process.cwd();
const output = path.resolve(root, process.env.DOT_HOST_OUTPUT_DIR ?? 'dist-dot-host');
const iconSourcePath = path.join(root, 'deployment/assets/chopdot-icon.png.base64');
const environmentPath = path.join(root, 'deployment/pad-environments-2026-08-23.json');
const environmentProvenancePath = path.join(root, 'deployment/pad-environments-2026-08-23.provenance.json');
const targetPath = path.join(root, 'deployment/recovery-head-index-targets.json');
const codeAnchorPath = path.join(root, 'deployment/dotns-code-anchors-2026-08-23.json');
const deploymentConfigPath = path.join(root, 'polkadot-app-deploy.config.ts');
const pvmManifestPath = path.join(root, 'contracts/recovery-head-index/artifacts/pvm-manifest.json');
const viteManifestPath = path.join(output, 'vite-manifest.json');
const officialEnvironment = {
  sha256: '18adfc1cf58e12ac51cf146ef0e7fe6998a188de4854e7eb8d563cecc49973ff',
  sourceCommit: 'd1cc36998c7f25ea4a194176d98883655995c855',
  sourceUrl: 'https://raw.githubusercontent.com/paritytech/polkadot-app-deploy/d1cc36998c7f25ea4a194176d98883655995c855/assets/environments.json',
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

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function readJson(file) {
  const bytes = await readFile(file);
  return {bytes, value: JSON.parse(bytes)};
}

async function readJsonIfPresent(file) {
  try {
    return await readJson(file);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

const iconBase64 = (await readFile(iconSourcePath, 'utf8')).trim();
const {bytes: viteManifestBytes, value: viteManifest} = await readJson(viteManifestPath);
await unlink(viteManifestPath);
const icon = Buffer.from(iconBase64, 'base64');
if (icon.toString('base64') !== iconBase64 || icon.subarray(1, 4).toString('ascii') !== 'PNG') {
  throw new Error('Release icon source is not canonical PNG base64.');
}
await writeFile(path.join(output, 'chopdot-icon.png'), icon);
const supplyChain = await createSupplyChainEvidence(root);
const runtimeSecurity = await createRuntimeSecurityEvidence(root);
const runtimeSecurityBytes = Buffer.from(`${JSON.stringify(runtimeSecurity, null, 2)}\n`);
await Promise.all([
  writeFile(path.join(output, supplyChain.sbom.path), supplyChain.sbom.bytes),
  writeFile(path.join(output, supplyChain.licenses.path), supplyChain.licenses.bytes),
  writeFile(path.join(output, 'runtime-security.json'), runtimeSecurityBytes),
]);

const [{bytes: environmentBytes, value: environments}, {value: environmentProvenance}, {value: targets}, {bytes: codeAnchorBytes}, {bytes: pvmManifestBytes, value: pvmManifest}, deploymentConfigBytes, deploymentCli] = await Promise.all([
  readJson(environmentPath),
  readJson(environmentProvenancePath),
  readJson(targetPath),
  readJson(codeAnchorPath),
  readJson(pvmManifestPath),
  readFile(deploymentConfigPath),
  withIsolatedDeploymentRuntime(root),
]);
if (
  sha256(environmentBytes) !== officialEnvironment.sha256
  || environmentProvenance.sha256 !== officialEnvironment.sha256
  || environmentProvenance.sourceCommit !== officialEnvironment.sourceCommit
  || environmentProvenance.sourceUrl !== officialEnvironment.sourceUrl
) {
  throw new Error('Polkadot app-deploy environment override no longer matches the reviewed official source.');
}
if (pvmManifest.compiler?.packageVersion !== '1.4.0' || pvmManifest.compiler?.solcPackageVersion !== '0.8.28') {
  throw new Error('RecoveryHeadIndex compiler manifest is not pinned to resolc 1.4.0 / solc 0.8.28.');
}
const pvmBytecode = await readFile(path.join(root, pvmManifest.bytecode.path));
const pvmAbi = await readFile(path.join(root, pvmManifest.abi.path));
const pvmSource = await readFile(path.join(root, pvmManifest.source.path));
if (sha256(pvmBytecode) !== pvmManifest.bytecode.sha256) {
  throw new Error('RecoveryHeadIndex PVM bytecode does not match its compiler manifest.');
}
if (sha256(pvmAbi) !== pvmManifest.abi.sha256 || sha256(pvmSource) !== pvmManifest.source.sha256) {
  throw new Error('RecoveryHeadIndex ABI/source does not match its compiler manifest.');
}
const expectedArtifactSet = sha256(
  `${pvmManifest.bytecode.path}\0${pvmManifest.bytecode.sha256}\n${pvmManifest.abi.path}\0${pvmManifest.abi.sha256}\n`,
);
const expectedBuildInputs = sha256(JSON.stringify({
  source: pvmManifest.source,
  contract: pvmManifest.contract,
  compiler: pvmManifest.compiler,
  optimizer: pvmManifest.optimizer,
}));
if (pvmManifest.artifactSetSha256 !== expectedArtifactSet || pvmManifest.buildInputsSha256 !== expectedBuildInputs) {
  throw new Error('RecoveryHeadIndex artifact-set/build-input identity is invalid.');
}

const deployments = {};
for (const environment of ['devnet', 'paseo-next-v2']) {
  const record = await readJsonIfPresent(path.join(root, 'deployment/recovery-head-index', `${environment}.json`));
  if (!record) continue;
  const behaviorRecord = await readJsonIfPresent(path.join(root, 'deployment/recovery-head-index', `${environment}.behavior.json`));
  if (!behaviorRecord) throw new Error(`RecoveryHeadIndex ${environment} lacks live PVM behavior evidence.`);
  const evidence = record.value;
  const behavior = behaviorRecord.value;
  const expected = targets.environments[environment];
  if (
    evidence.schema !== 'chopdot.recovery-head-index-deployment.v1'
    || evidence.environment !== environment
    || evidence.assetHubGenesis?.toLowerCase() !== expected.assetHubGenesis.toLowerCase()
    || evidence.chainId !== expected.chainId
    || evidence.pvmBytecodeSha256 !== pvmManifest.bytecode.sha256
    || evidence.readbackBytecodeSha256 !== pvmManifest.bytecode.sha256
    || evidence.sourceSha256 !== pvmManifest.source.sha256
    || evidence.abiSha256 !== pvmManifest.abi.sha256
    || evidence.buildInputsSha256 !== pvmManifest.buildInputsSha256
    || evidence.artifactSetSha256 !== pvmManifest.artifactSetSha256
    || evidence.endpointCodeAnchorSha256 !== sha256(codeAnchorBytes)
    || !/^0x[0-9a-f]{40}$/i.test(evidence.address ?? '')
  ) {
    throw new Error(`RecoveryHeadIndex ${environment} deployment evidence failed release validation.`);
  }
  if (
    behavior.schema !== 'chopdot.recovery-head-index-live-behavior.v1'
    || behavior.environment !== environment
    || behavior.assetHubGenesis?.toLowerCase() !== expected.assetHubGenesis.toLowerCase()
    || behavior.address?.toLowerCase() !== evidence.address.toLowerCase()
    || behavior.pvmBytecodeSha256 !== pvmManifest.bytecode.sha256
    || behavior.endpointCodeAnchorSha256 !== sha256(codeAnchorBytes)
    || behavior.transaction?.status !== 1
    || behavior.transaction?.finalizedHeadNumber < behavior.transaction?.blockNumber
    || !Object.values(behavior.assertions ?? {}).every(value => value === true)
  ) throw new Error(`RecoveryHeadIndex ${environment} live PVM behavior evidence failed release validation.`);
  deployments[environment] = {
    ...evidence,
    evidenceSha256: sha256(record.bytes),
    liveBehavior: {
      path: path.relative(root, path.join(root, 'deployment/recovery-head-index', `${environment}.behavior.json`)),
      sha256: sha256(behaviorRecord.bytes),
      transactionHash: behavior.transaction.hash,
      assertions: behavior.assertions,
    },
  };
}

const sourceOverrideKeys = ['RELEASE_SOURCE_COMMIT', 'RELEASE_SOURCE_TREE', 'RELEASE_SOURCE_BRANCH', 'RELEASE_SOURCE_CLEAN'];
const suppliedSourceOverrides = sourceOverrideKeys.filter((key) => process.env[key] !== undefined);
if (suppliedSourceOverrides.length && suppliedSourceOverrides.length !== sourceOverrideKeys.length) {
  throw new Error(`Release archive identity overrides must be supplied as one complete set: ${sourceOverrideKeys.join(', ')}.`);
}
if (suppliedSourceOverrides.length && process.env.RELEASE_ARCHIVE_MODE !== '1') {
  throw new Error('Release source identity overrides are accepted only in explicit RELEASE_ARCHIVE_MODE=1.');
}
const commit = suppliedSourceOverrides.length ? process.env.RELEASE_SOURCE_COMMIT : git('rev-parse', 'HEAD');
const tree = suppliedSourceOverrides.length ? process.env.RELEASE_SOURCE_TREE : git('rev-parse', 'HEAD^{tree}');
const branch = suppliedSourceOverrides.length ? process.env.RELEASE_SOURCE_BRANCH : git('branch', '--show-current');
const canonicalSourceRoot = suppliedSourceOverrides.length ? process.env.RELEASE_CANONICAL_ROOT : root;
const status = suppliedSourceOverrides.length ? '' : git('status', '--porcelain=v1', '--untracked-files=all');
if (suppliedSourceOverrides.length && process.env.RELEASE_SOURCE_CLEAN !== '1') {
  throw new Error('Release archive identity overrides require RELEASE_SOURCE_CLEAN=1 and later byte-for-byte rebuild comparison.');
}
if (!canonicalSourceRoot || !path.isAbsolute(canonicalSourceRoot)) {
  throw new Error('Release archive mode requires an absolute RELEASE_CANONICAL_ROOT for provenance validation.');
}
if (!/^[0-9a-f]{40}$/u.test(commit) || !/^[0-9a-f]{40}$/u.test(tree)) {
  throw new Error('Release source commit/tree identity is invalid.');
}
const packageLockSha256 = sha256(await readFile(path.join(root, 'package-lock.json')));
let agentOutcomeReceipt = null;
const outcomeInputs = ['RELEASE_AGENT_OUTCOME', 'RELEASE_AGENT_OUTCOME_ATTESTATION'];
const suppliedOutcomeInputs = outcomeInputs.filter((key) => process.env[key]);
if (suppliedOutcomeInputs.length && suppliedOutcomeInputs.length !== outcomeInputs.length) {
  throw new Error(`Release outcome trust inputs must be supplied together: ${outcomeInputs.join(', ')}.`);
}
if (suppliedOutcomeInputs.length) {
  const outcomePath = path.resolve(root, process.env.RELEASE_AGENT_OUTCOME);
  const attestationPath = path.resolve(root, process.env.RELEASE_AGENT_OUTCOME_ATTESTATION);
  const outcomeBytes = await readFile(outcomePath);
  const attestationBytes = await readFile(attestationPath);
  const outcome = JSON.parse(outcomeBytes);
  const outcomeValidation = validateOutcomePacket(outcome);
  if (!outcomeValidation.valid) throw new Error(`Release agent outcome is not accepted: ${outcomeValidation.issues.join('; ')}`);
  if (outcome.root !== canonicalSourceRoot || outcome.branch !== branch || outcome.ending_head !== commit || outcome.ending_tree !== tree || (outcome.git_status ?? []).length) {
    throw new Error('Release agent outcome does not describe the exact clean candidate root, branch, commit, and tree.');
  }
  if (outcome.terminal_state !== 'succeeded' || outcome.evaluation_summary?.independent_review_satisfied !== true || outcome.effects?.some((effect) => effect.state !== 'verified')) {
    throw new Error('Release agent outcome is not independently accepted or has unreconciled effects.');
  }
  const attestation = verifyGithubOutcomeAttestation({
    outcomePath,
    bundlePath: attestationPath,
    sourceCommit: commit,
  });
  const receipt = createReleaseOutcomeReceipt({
    outcome,
    outcomeBytes,
    bundleBytes: attestationBytes,
    commit,
    tree,
    branch,
    verificationCount: attestation.verificationCount,
  });
  const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`);
  const embeddedPath = path.join(output, 'agent-outcome-receipt.json');
  await writeFile(embeddedPath, receiptBytes);
  agentOutcomeReceipt = {
    path: path.relative(output, embeddedPath),
    sha256: sha256(receiptBytes),
    packetDigest: outcome.packet_digest,
    packetFileSha256: sha256(outcomeBytes),
    attestationBundleSha256: sha256(attestationBytes),
    runId: outcome.run_id,
    verificationCount: attestation.verificationCount,
    redactionPolicy: receipt.redaction.policy,
  };
} else if (await readFile(path.join(output, 'agent-outcome-receipt.json')).then(() => true).catch((error) => {
  if (error?.code === 'ENOENT') return false;
  throw error;
})) {
  throw new Error('Release output contains agent-outcome-receipt.json without trusted outcome and attestation inputs.');
}
const files = await walk(output);
const manifest = [];
const contentEntries = [];
for (const file of files) {
  const bytes = await readFile(file);
  manifest.push({path: path.relative(output, file), bytes: bytes.byteLength, sha256: sha256(bytes)});
  contentEntries.push({path: path.relative(output, file), bytes});
}
assertNoAgentRuntimeFiles(manifest);
assertAllowedReleaseFiles(manifest);
assertNoAgentRuntimeContent(contentEntries);
const viteAssets = assertViteAssetProvenance(viteManifest, manifest);
const orderedManifest = manifest.map((entry) => `${entry.path}\0${entry.sha256}\n`).join('');
const contentSha256 = sha256(orderedManifest);
const release = {
  schema: 'chopdot.release.v3',
  product: 'ChopDot',
  authority: 'participant-held signed ChopEventV1 log',
  commit,
  tree,
  branch,
  dirty: Boolean(status),
  dirtyStatusSha256: status ? sha256(status) : null,
  buildId: `chopdot-${commit.slice(0, 12)}-${contentSha256.slice(0, 12)}`,
  contentSha256,
  packageLockSha256,
  agentOutcomeReceipt,
  viteBuild: {
    tool: 'vite',
    manifestSha256: sha256(viteManifestBytes),
    assets: viteAssets.map((assetPath) => manifest.find((entry) => entry.path === assetPath)),
  },
  supplyChain: {
    packageCount: supplyChain.packageCount,
    unknownLicenseCount: supplyChain.unknownLicenseCount,
    sbom: {path: supplyChain.sbom.path, bytes: supplyChain.sbom.bytes.byteLength, sha256: supplyChain.sbom.sha256},
    licenses: {path: supplyChain.licenses.path, bytes: supplyChain.licenses.bytes.byteLength, sha256: supplyChain.licenses.sha256},
  },
  runtimeSecurity: {
    path: 'runtime-security.json',
    bytes: runtimeSecurityBytes.byteLength,
    sha256: sha256(runtimeSecurityBytes),
    advisory: runtimeSecurity.advisory.ghsa,
    disposition: runtimeSecurity.disposition.status,
    suspectBrowserInputs: runtimeSecurity.runtimeReachability.suspectInputCount,
  },
  files: manifest,
  icon: {
    path: 'chopdot-icon.png',
    bytes: icon.byteLength,
    sha256: sha256(icon),
    sourceSha256: sha256(iconBase64),
  },
  polkadotAppDeploy: {
    environmentFile: path.relative(root, environmentPath),
    environmentFileSha256: sha256(environmentBytes),
    sourceCommit: environmentProvenance.sourceCommit,
    sourceUrl: environmentProvenance.sourceUrl,
    environments: environments.environments.map((entry) => entry.id),
    lockedCli: deploymentCli,
    codeAnchorFile: path.relative(root, codeAnchorPath),
    codeAnchorFileSha256: sha256(codeAnchorBytes),
    configFile: path.relative(root, deploymentConfigPath),
    configFileSha256: sha256(deploymentConfigBytes),
    launcher: {
      shellFile: 'scripts/deploy-locked.sh',
      shellFileSha256: sha256(await readFile(path.join(root, 'scripts/deploy-locked.sh'))),
      bootstrapFile: 'scripts/run-locked-polkadot-app-deploy.mjs',
      bootstrapFileSha256: sha256(await readFile(path.join(root, 'scripts/run-locked-polkadot-app-deploy.mjs'))),
      driverFile: 'scripts/lib/locked-deploy-driver.mjs',
      driverFileSha256: sha256(await readFile(path.join(root, 'scripts/lib/locked-deploy-driver.mjs'))),
      evidenceLibraryFile: 'scripts/lib/release-evidence.mjs',
      evidenceLibraryFileSha256: sha256(await readFile(path.join(root, 'scripts/lib/release-evidence.mjs'))),
      directOwnerRuntimeFile: 'scripts/lib/direct-owner-runtime.mjs',
      directOwnerRuntimeFileSha256: sha256(await readFile(path.join(root, 'scripts/lib/direct-owner-runtime.mjs'))),
    },
  },
  recoveryHeadIndex: {
    contract: pvmManifest.contract,
    source: pvmManifest.source,
    abi: pvmManifest.abi,
    buildInputsSha256: pvmManifest.buildInputsSha256,
    artifactSetSha256: pvmManifest.artifactSetSha256,
    compilerManifestSha256: sha256(pvmManifestBytes),
    compiler: pvmManifest.compiler,
    optimizer: pvmManifest.optimizer,
    pvmBytecode: pvmManifest.bytecode,
    verificationInputs: {
      compileScriptSha256: sha256(await readFile(path.join(root, 'scripts/compile-recovery-head-pvm.mjs'))),
      hardhatParityScriptSha256: sha256(await readFile(path.join(root, 'scripts/verify-hardhat-pvm.mjs'))),
      deploymentScriptSha256: sha256(await readFile(path.join(root, 'scripts/recovery-head-deployment.mjs'))),
      verificationLibrarySha256: sha256(await readFile(path.join(root, 'scripts/lib/recovery-head-verification.mjs'))),
      releaseToolingTestSha256: sha256(await readFile(path.join(root, 'scripts/release-evidence.test.mjs'))),
      rebuildVerifierSha256: sha256(await readFile(path.join(root, 'scripts/verify-dot-host-rebuild.mjs'))),
      archiveSnapshotLibrarySha256: sha256(await readFile(path.join(root, 'scripts/lib/git-archive-snapshot.mjs'))),
      behaviorConfigSha256: sha256(await readFile(path.join(root, 'contracts/recovery-head-index/hardhat.behavior.config.cjs'))),
      behaviorTestSha256: sha256(await readFile(path.join(root, 'contracts/recovery-head-index/test/RecoveryHeadIndex.behavior.cjs'))),
      strictCommands: [
        'npm run contract:verify:pvm',
        'npm run contract:hardhat:pvm',
        'npm run test:recovery-contract:behavior',
        'npm run test:release-tooling'
      ],
    },
    targetGeneses: Object.fromEntries(
      Object.entries(targets.environments).map(([environment, target]) => [environment, target.assetHubGenesis]),
    ),
    deployments,
  },
  promotion: {
    evidenceRequired: true,
    schema: 'chopdot.dot-host-promotion.v3',
    note: 'CAR SHA-256 and live DotNS/gateway evidence are recorded outside the CAR to avoid a self-referential release manifest.',
  },
};
await writeFile(path.join(output, 'release.json'), `${JSON.stringify(release, null, 2)}\n`);
console.log(`Prepared ${release.buildId} (${manifest.length} files, dirty=${release.dirty}, deployments=${Object.keys(deployments).length}/2).`);
