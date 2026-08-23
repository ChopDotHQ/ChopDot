#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = fs.realpathSync(process.cwd());
const expectedRoot = '/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch';
const expectedBranch = 'codex/chopdot-v1-launch';
const expectedAggregate = 'c434a9f5f405f942db0f6d96cc67013094e48514cdba15d6096ef21f9d34e345';
const autobots = '/Users/devinsonpena/.codex/worktrees/24f9/AutoBots';
const policyPath = path.join(autobots, 'agentops/registry/repo_graph_integration_policies.json');
const preflightPath = path.join(autobots, 'agentops/runners/repo_graph_integration_preflight.py');
const releaseEvidencePath = path.join(root, 'artifacts/release/wave-0-provenance.json');

const contactPaths = [
  'src/contacts/verifiedContact.ts',
  'src/contacts/verifiedContact.test.ts',
  'src/contacts/verifiedContactLink.ts',
  'src/contacts/verifiedContactLink.test.ts',
  'src/contacts/verifiedContactRepository.ts',
  'src/contacts/verifiedContactRepository.test.ts',
  'src/contacts/verifiedContactCeremonyService.ts',
  'src/contacts/verifiedContactCeremonyService.test.ts',
  'tests/fixtures/verifiedContactFixture.ts',
];
const contactTestPaths = contactPaths.filter((item) => item.endsWith('.test.ts'));
const policyIds = [
  'chopdot-verified-contact-is-not-membership-authority',
  'chopdot-contact-proof-is-not-organizer-proof',
];

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const readJson = (relativeOrAbsolute) => JSON.parse(fs.readFileSync(path.isAbsolute(relativeOrAbsolute) ? relativeOrAbsolute : path.join(root, relativeOrAbsolute), 'utf8'));
const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8' });
  return {
    command: [command, ...args].join(' '),
    exit_code: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
};
const git = (...args) => {
  const result = run('git', args);
  if (result.exit_code !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout.trim();
};

if (root !== expectedRoot) throw new Error(`Run from ${expectedRoot}; got ${root}`);

const startedAt = new Date().toISOString();
const branch = git('branch', '--show-current');
const head = git('rev-parse', 'HEAD');
const completeGitStatus = git('status', '--porcelain=v1', '-uall').split('\n').filter(Boolean);

const contactManifest = contactPaths.map((sourcePath) => ({
  path: sourcePath,
  exists: fs.existsSync(path.join(root, sourcePath)),
  tracked: run('git', ['ls-files', '--error-unmatch', '--', sourcePath]).exit_code === 0,
  sha256: fs.existsSync(path.join(root, sourcePath)) ? sha256(fs.readFileSync(path.join(root, sourcePath))) : null,
}));
const orderedManifest = contactManifest.map((item) => `${item.path} ${item.sha256}`).join('\n') + '\n';
const contactAggregate = sha256(orderedManifest);

const contactSuite = run(process.execPath, ['--experimental-transform-types', '--test', ...contactTestPaths]);
const tap = `${contactSuite.stdout}\n${contactSuite.stderr}`;
const tapCount = (label) => Number(tap.match(new RegExp(`(?:^|\\n)\\u2139 ${label} (\\d+)`))?.[1] ?? 0);
const contactSuiteArtifact = {
  schema_version: 1,
  kind: 'corrected_four_file_contact_suite',
  executed_at: new Date().toISOString(),
  cwd: root,
  command: contactSuite.command,
  node_version: process.version,
  test_files: contactTestPaths.length,
  tests: tapCount('tests'),
  passed: tapCount('pass'),
  failed: tapCount('fail'),
  cancelled: tapCount('cancelled'),
  skipped: tapCount('skipped'),
  todo: tapCount('todo'),
  exit_code: contactSuite.exit_code,
  status: contactSuite.exit_code === 0 && tapCount('pass') === 8 && tapCount('fail') === 0 ? 'pass' : 'fail',
  runner_correction: "The four files use node:test. Node's --experimental-transform-types mode handles their TypeScript parameter properties without resolving tsx from another checkout.",
};
fs.writeFileSync(path.join(root, 'artifacts/agentops/catalog-contact-suite.json'), `${JSON.stringify(contactSuiteArtifact, null, 2)}\n`);

const preflightArgs = [
  preflightPath,
  '--repo-id', 'chopdot',
  '--source-root', root,
  '--target-root', root,
  ...contactPaths.flatMap((sourcePath) => ['--include', sourcePath]),
];
const preflightRun = run('python3', preflightArgs);
const preflight = JSON.parse(preflightRun.stdout);
const preflightArtifact = {
  schema_version: 1,
  kind: 'bounded_agentops_integration_preflight',
  executed_at: new Date().toISOString(),
  command: preflightRun.command,
  exit_code: preflightRun.exit_code,
  ...preflight,
};
fs.writeFileSync(path.join(root, 'artifacts/agentops/catalog-integration-preflight.json'), `${JSON.stringify(preflightArtifact, null, 2)}\n`);

const policies = readJson(policyPath);
const selectedPolicies = policies.rules.filter((item) => policyIds.includes(item.rule_id));
const planValidator = run(process.execPath, ['scripts/research/verify-chopdot-full-product-deployment-plan.mjs']);
const planEvidence = readJson('artifacts/agentops/full-product-deployment-plan-verification.json');
const catalogValidator = run(process.execPath, ['scripts/research/verify-products-devnet-catalog.mjs']);
const catalogEvidence = readJson('artifacts/agentops/catalog-machine-verification.json');

const graphPacketPaths = [
  'artifacts/agentops/catalog-repo-graph-packet.json',
  'artifacts/agentops/feature-inheritance-repo-graph-packet.json',
];
const graphPackets = graphPacketPaths.map((packetPath) => {
  const packet = readJson(packetPath);
  return {
    path: packetPath,
    generated_at: packet.generated_at,
    root: packet.identity?.root,
    branch: packet.identity?.branch,
    commit: packet.identity?.commit,
    dirty_status_digest: packet.identity?.dirty_status_digest,
    graph_digest: packet.graph_digest,
    packet_digest: packet.packet_digest,
    exact_root: packet.identity?.root === root,
    exact_branch: packet.identity?.branch === branch,
    current_commit: packet.identity?.commit === head,
  };
});
const kgArtifacts = [
  'artifacts/agentops/catalog-kgv2-recall.json',
  'artifacts/agentops/full-product-plan-agentops-verification.json',
].map((artifactPath) => {
  const artifact = readJson(artifactPath);
  const repoGraph = artifact.repo_graph ?? null;
  const readPath = artifact.read_path ?? null;
  return {
    path: artifactPath,
    generated_at: artifact.generated_at ?? artifactEvidenceTimestamp(artifact),
    requested_path: readPath?.requested_mode ?? null,
    active_path: readPath?.active_path ?? null,
    fallback_used: readPath?.fallback_used ?? null,
    repo_graph_commit: repoGraph?.commit ?? null,
    repo_graph_current_commit: repoGraph?.commit ? repoGraph.commit === head : null,
  };
});

function artifactEvidenceTimestamp(artifact) {
  return artifact.context_graph_v2?.packet?.generated_at ?? null;
}

const blockingChecks = {
  exact_root: root === expectedRoot,
  exact_branch: branch === expectedBranch,
  contact_files_exist: contactManifest.every((item) => item.exists),
  contact_aggregate_matches: contactAggregate === expectedAggregate,
  verified_contact_resolvers_absent: !fs.existsSync(path.join(root, 'src/contacts/verifiedContactResolvers.ts')),
  semantic_policies_present: selectedPolicies.length === policyIds.length,
  integration_preflight_passed: preflightRun.exit_code === 0 && preflight.status === 'pass',
  corrected_contact_suite_passed: contactSuiteArtifact.status === 'pass',
  full_product_plan_validator_passed: planValidator.exit_code === 0 && planEvidence.status === 'pass',
  repo_graph_packets_current: graphPackets.every((item) => item.current_commit),
};
const failedChecks = Object.entries(blockingChecks).filter(([, passed]) => !passed).map(([name]) => name);
const result = {
  schema_version: 1,
  kind: 'chopdot_wave_0_provenance_verification',
  started_at: startedAt,
  completed_at: new Date().toISOString(),
  status: failedChecks.length === 0 ? 'pass' : 'blocked',
  root,
  branch,
  head,
  git_status: {
    path_count: completeGitStatus.length,
    porcelain_v1_sha256: sha256(`${completeGitStatus.join('\n')}\n`),
  },
  checks: blockingChecks,
  blockers: failedChecks,
  complete_git_status: completeGitStatus,
  commands: {
    contact_suite: { command: contactSuite.command, exit_code: contactSuite.exit_code },
    integration_preflight: { command: preflightRun.command, exit_code: preflightRun.exit_code },
    plan_validator: { command: planValidator.command, exit_code: planValidator.exit_code },
    catalog_validator: { command: catalogValidator.command, exit_code: catalogValidator.exit_code, failures: catalogEvidence.failures },
  },
  verified_contact: {
    manifest: contactManifest,
    ordered_manifest_sha256: contactAggregate,
    expected_ordered_manifest_sha256: expectedAggregate,
    resolvers_absent: !fs.existsSync(path.join(root, 'src/contacts/verifiedContactResolvers.ts')),
  },
  contact_suite: contactSuiteArtifact,
  integration_preflight: preflightArtifact,
  semantic_policies: {
    registry_path: policyPath,
    registry_sha256: sha256(fs.readFileSync(policyPath)),
    required_ids: policyIds,
    found: selectedPolicies,
  },
  full_product_plan_validator: {
    status: planEvidence.status,
    counts: planEvidence.counts,
    hashes: planEvidence.hashes,
  },
  catalog_validator: {
    status: catalogEvidence.status,
    failures: catalogEvidence.failures,
    note: 'The established catalog validator pins the original review HEAD; a false exact_head result is expected after accepted implementation commits and is recorded as staleness, not rewritten.',
  },
  repo_graph_packets: graphPackets,
  kg_artifacts: kgArtifacts,
  stale_reasons: [
    ...graphPackets.filter((item) => !item.current_commit).map((item) => `${item.path} records ${item.commit}, not current HEAD ${head}`),
    ...kgArtifacts.filter((item) => item.repo_graph_current_commit === false).map((item) => `${item.path} is backed by Repo Graph commit ${item.repo_graph_commit}, not current HEAD ${head}`),
    'catalog-kgv2-recall.json has exact-root cited recall but no citation-level commit field; it cannot prove knowledge of the current committed outcome until Repo Graph and KGv2 are refreshed.',
  ],
};

fs.mkdirSync(path.dirname(releaseEvidencePath), { recursive: true });
fs.writeFileSync(releaseEvidencePath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ status: result.status, blockers: result.blockers, contact_suite: result.contact_suite.status, plan_validator: result.full_product_plan_validator, aggregate: contactAggregate, output: path.relative(root, releaseEvidencePath) }, null, 2));
process.exitCode = failedChecks.length === 0 ? 0 : 2;
