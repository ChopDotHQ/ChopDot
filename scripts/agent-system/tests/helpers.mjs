import { cp, mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createContract } from '../contract.mjs';
import { observeCandidateIdentity, persistedCandidateIdentity } from '../candidate.mjs';
import { recordArtifact } from '../artifacts.mjs';
import { loadGovernanceJson } from '../schema.mjs';

let sequence = 0;

export async function fixtureRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'chopdot-agent-system-'));
  await mkdir(path.join(root, 'scripts', 'agent-system'), { recursive: true });
  await mkdir(path.join(root, '.knowns'), { recursive: true });
  await writeFile(path.join(root, 'PRODUCT_TRUTH.md'), '# Product truth\n', 'utf8');
  await writeFile(path.join(root, 'scripts', 'agent-system', 'fixture.mjs'), 'export const fixture = true;\n', 'utf8');
  await writeFile(path.join(root, '.knowns', 'tasks'), 'generated tasks\n', 'utf8');
  await writeFile(path.join(root, '.gitignore'), 'runs/\n', 'utf8');
  const governanceSource = path.resolve('governance', 'agent-system');
  const governanceTarget = path.join(root, 'governance', 'agent-system');
  await mkdir(governanceTarget, { recursive: true });
  await cp(path.join(governanceSource, 'loops'), path.join(governanceTarget, 'loops'), { recursive: true });
  await cp(path.join(governanceSource, 'policies'), path.join(governanceTarget, 'policies'), { recursive: true });
  execFileSync('git', ['init', '-b', 'codex/test'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'agent-system@example.invalid'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Agent System Fixture'], { cwd: root });
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'fixture baseline'], { cwd: root, stdio: 'ignore' });
  return root;
}

export function fixtureContract(root, overrides = {}) {
  sequence += 1;
  const profileId = overrides.loop_profile?.id ?? 'implementation';
  const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  const base = createContract({
    root,
    runId: `run_fixture_${String(sequence).padStart(8, '0')}`,
    branch: git(['branch', '--show-current']),
    startingHead: git(['rev-parse', 'HEAD']),
    startingTree: git(['rev-parse', 'HEAD^{tree}']),
    createdBy: 'creator-agent',
    createdByKind: 'agent',
    loopProfile: profileId,
    inPaths: ['scripts/agent-system'],
    allowedWrites: ['scripts/agent-system'],
    requirementIds: ['REQ-FIXTURE'],
    deterministicCommands: [{ id: 'CHECK-FIXTURE', command: `${process.execPath} --check scripts/agent-system/fixture.mjs`, cwd: root, expected_exit_code: 0, timeout_seconds: 10 }],
  });
  base.budgets.max_tool_calls = 100;
  base.knowledge_policy.preflight_required = false;
  return deepMerge(base, overrides);
}

export function fixturePreflightIdentity(contract) {
  return { root: contract.scope.root, branch: contract.scope.branch, head: contract.scope.starting_head, tree: contract.scope.starting_tree };
}

export function passingMeasurements(contract) {
  const values = {};
  for (const assertion of contract.expected_outcome.assertions) {
    if (assertion.operator === 'one_of') values[assertion.subject] = assertion.expected[0];
    else if (assertion.operator === 'truthy') values[assertion.subject] = true;
    else if (assertion.operator === 'falsy') values[assertion.subject] = false;
    else if (assertion.operator === 'all') values[assertion.subject] = [true];
    else if (assertion.operator === 'none') values[assertion.subject] = [];
    else if (assertion.operator === 'sha256_equals' && typeof assertion.expected === 'string' && !/^[0-9a-f]{64}$/.test(assertion.expected)) {
      values[assertion.expected] = 'c'.repeat(64);
      values[assertion.subject] = 'c'.repeat(64);
    } else values[assertion.subject] = assertion.expected;
  }
  return values;
}

function evidenceFields(level, current, root) {
  const common = {
    source_path: 'scripts/agent-system/fixture.mjs', source_sha256: 'a'.repeat(64), root, branch: current.branch,
    commit: current.commit, tree: current.tree, observed_at: new Date().toISOString(), command: 'node --test', cwd: root,
    candidate_digest: current.candidate_digest, exit_code: 0, exact_counts: { passed: 1, failed: 0 }, output_digest: 'b'.repeat(64),
    integration_surface: 'fixture', dependency_identities: [], host_simulator: 'fixture-host', host_simulator_version: '1.0.0',
    journey_result: 'passed', readback_digest: 'c'.repeat(64), clean: current.git_status.length === 0, lockfile_digests: [], commands: ['node --test'],
    host: 'fixture-host', network_or_chain: 'fixture-chain', genesis_or_environment_id: 'd'.repeat(64), finality: 'finalized',
    participant_count: 3, consent_record: 'artifact_consent_fixture', journey_ids: ['fixture-journey'], redacted_evidence: true, verdict: 'passed',
    build_id: 'fixture-build', artifact_digest: 'e'.repeat(64), content_identity: 'fixture-content', deployment_record: 'fixture-deploy', live_readback: 'fixture-readback',
  };
  const definition = loadGovernanceJson('policies', 'evidence-levels.json').ordered_levels.find((entry) => entry.id === level);
  return Object.fromEntries(definition.required_fields.map((field) => [field, common[field]]));
}

export async function recordPassingMeasurementEvidence(root, runDirectory, contract, options = {}) {
  const current = observeCandidateIdentity(root);
  const values = passingMeasurements(contract);
  const measurements = {};
  const levels = new Map(contract.expected_outcome.assertions.map((assertion) => [assertion.subject, assertion.minimum_evidence_level]));
  for (const assertion of contract.expected_outcome.assertions) if (assertion.operator === 'sha256_equals' && typeof assertion.expected === 'string') levels.set(assertion.expected, assertion.minimum_evidence_level);
  for (const [subject, level] of levels) measurements[subject] = { value: values[subject], evidence_level: options.levelOverrides?.[subject] ?? level, evidence_fields: evidenceFields(options.levelOverrides?.[subject] ?? level, current, root) };
  const document = {
    measurement_evidence_version: '1.0.0',
    candidate_digest: options.candidateDigest ?? current.candidate_digest,
    candidate_identity: options.candidateIdentity ?? persistedCandidateIdentity(current),
    measurements,
  };
  const evidencePath = path.join(runDirectory, options.fileName ?? 'measurement-evidence.json');
  await writeFile(evidencePath, `${JSON.stringify(document, null, 2)}\n`);
  const recorded = await recordArtifact(runDirectory, contract, path.relative(root, evidencePath), { artifactType: 'MeasurementEvidenceV1' });
  return {
    artifact: recorded.artifact,
    measurements: Object.fromEntries(Object.entries(measurements).map(([subject, entry]) => [subject, { value: entry.value, evidence_level: entry.evidence_level, evidence_artifact_ids: [recorded.artifact.artifact_id] }])),
    document,
    path: evidencePath,
  };
}

function deepMerge(base, changes) {
  const output = structuredClone(base);
  for (const [key, value] of Object.entries(changes)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && output[key] && typeof output[key] === 'object' && !Array.isArray(output[key])) output[key] = deepMerge(output[key], value);
    else output[key] = value;
  }
  return output;
}
