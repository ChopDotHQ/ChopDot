import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { createContract, loadLoopProfile } from '../contract.mjs';
import { digestObject } from '../core.mjs';
import { evaluateContractAssertions, evaluateRubric } from '../evaluator.mjs';
import { recordEvaluation } from '../evaluator.mjs';
import { promoteContinuation, promoteOutcome, validateOutcomePacket } from '../outcome.mjs';
import { executeRunPreflight } from '../preflight.mjs';
import { loadGovernanceJson } from '../schema.mjs';
import { validateAgentContract, validateJsonSchemaDefinition, validateLoopProfile, validatePolicyCatalog, validateRuntimePacket } from '../validate.mjs';
import { createMockKgv3Adapter } from '../adapters/mock-kgv3.mjs';
import { runKnowledgeAdapterConformance } from '../adapters/port.mjs';
import { startRun, terminateRun } from '../runner.mjs';
import { appendEvent, rebuildSnapshot, terminate } from '../ledger.mjs';
import { recordArtifact } from '../artifacts.mjs';
import { fixtureContract, fixturePreflightIdentity, fixtureRoot, passingMeasurements, recordPassingMeasurementEvidence } from './helpers.mjs';

const PROFILES = ['research', 'product-definition', 'implementation', 'ux-creation', 'security-authority', 'incident-repair', 'release-outcome'];

test('Draft 2020 instance validation rejects unknown hostile contract fields', async () => {
  const root = await fixtureRoot();
  const contract = fixtureContract(root);
  contract.privilege_escalation = true;
  const result = validateAgentContract(contract);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((entry) => entry.code === 'additionalProperties' && entry.path.includes('privilege_escalation')));
});

test('profile digest is verified semantically, not only as 64 hex', () => {
  const profile = structuredClone(loadLoopProfile('implementation'));
  profile.description += ' tampered';
  const result = validateLoopProfile(profile);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((entry) => entry.code === 'digest_mismatch'));
});

test('empty authority and retry policies fail closed', () => {
  assert.equal(validatePolicyCatalog({}, 'authority-boundaries').valid, false);
  assert.equal(validatePolicyCatalog({}, 'retry-budgets').valid, false);
});

test('schema catalog rejects unsupported keywords instead of silently ignoring them', () => {
  const schema = { $schema: 'https://json-schema.org/draft/2020-12/schema', $id: 'https://example.test/hostile', type: 'object', required: ['id'], properties: { id: { type: 'string' } }, additionalProperties: false, magicAllowEverything: true };
  const result = validateJsonSchemaDefinition(schema);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((entry) => entry.code === 'unsupported_keyword'));
});

test('digest-consistent but schema-incomplete outcome is rejected by validator and adapter', async () => {
  const incomplete = { outcome_version: '1.0.0', outcome_id: 'outcome_hostile01', run_id: 'run_hostile_00000001' };
  incomplete.packet_digest = digestObject(incomplete);
  const validation = validateOutcomePacket(incomplete);
  assert.equal(validation.valid, false);
  assert.ok(validation.issues.some((entry) => entry.includes('Required property is missing')));
  const receipt = await createMockKgv3Adapter().record_outcome(incomplete);
  assert.equal(receipt.accepted, false);
  assert.ok(receipt.rejected_reasons.some((entry) => entry.startsWith('invalid_outcome:')));
});

test('all seven contract factories load their profile artifacts, assertions, evaluator, budgets, and failure packet', () => {
  let assertionCount = 0;
  for (const profileId of PROFILES) {
    const profile = loadLoopProfile(profileId);
    const contract = createContract({ root: process.cwd(), loopProfile: profileId, branch: 'codex/test', startingHead: 'a'.repeat(40), startingTree: 'b'.repeat(40), deterministicCommands: [] });
    assert.equal(validateAgentContract(contract).valid, true, profileId);
    assert.deepEqual(contract.artifact_contract.artifact_types, profile.artifact_contract.artifact_types, profileId);
    assert.deepEqual(contract.evaluator.hard_fail_assertion_ids, profile.evaluator.hard_failures, profileId);
    assert.equal(contract.budgets.max_iterations, profile.budgets.max_iterations, profileId);
    assert.equal(contract.budgets.max_retries, profile.budgets.max_retries, profileId);
    assert.deepEqual(contract.failure_outcome.required_fields, profile.failure_packet.required_fields, profileId);
    assertionCount += contract.expected_outcome.assertions.length;
  }
  assert.equal(assertionCount, 34);
});

test('all 34 profile assertions block on raw measurements and pass with recorded typed evidence', async () => {
  let blocked = 0;
  let passed = 0;
  for (const profileId of PROFILES) {
    const root = await fixtureRoot();
    const contract = fixtureContract(root, { loop_profile: { id: profileId, version: '1.0.0', path: `governance/agent-system/loops/${profileId}.v1.json` } });
    const { run_directory: runDirectory } = await startRun(contract, { runsRoot: path.join(root, 'runs'), observedIdentity: fixturePreflightIdentity(contract) });
    const missing = await evaluateContractAssertions(contract, { evaluatorIdentity: 'independent-reviewer', measurements: passingMeasurements(contract) });
    blocked += missing.counts.blocked;
    assert.equal(missing.accepted, false, profileId);
    const evidence = await recordPassingMeasurementEvidence(root, runDirectory, contract);
    const supplied = await recordEvaluation(runDirectory, contract, { evaluatorIdentity: 'independent-reviewer', measurements: evidence.measurements });
    passed += supplied.counts.passed;
    assert.equal(supplied.accepted, true, profileId);
  }
  assert.equal(blocked, 34);
  assert.equal(passed, 34);
});

test('all seven persisted rubrics execute their dimensions and fail on absent observations', () => {
  for (const profileId of PROFILES) {
    const rubric = loadGovernanceJson('evals', 'rubrics', `${profileId}.v1.json`);
    const observations = Object.fromEntries(rubric.dimensions.map((dimension) => [dimension.id, { score: dimension.weight, evidence: ['artifact_fixture'] }]));
    assert.equal(evaluateRubric(rubric, observations, { evaluatorIdentity: 'independent-reviewer' }).accepted, true, profileId);
    assert.equal(evaluateRubric(rubric, {}, { evaluatorIdentity: 'independent-reviewer' }).accepted, false, profileId);
  }
});

test('required knowledge preflight cannot start without a configured adapter', async () => {
  const root = await fixtureRoot();
  const contract = fixtureContract(root, { knowledge_policy: { preflight_required: true } });
  const result = await executeRunPreflight(contract, { observedIdentity: fixturePreflightIdentity(contract) });
  assert.equal(result.accepted, false);
  assert.ok(result.issues.some((entry) => entry.code === 'knowledge_adapter_missing'));
});

test('knowledge preflight and exact identity pass together but wrong branch fails', async () => {
  const root = await fixtureRoot();
  const contract = fixtureContract(root, { knowledge_policy: { preflight_required: true } });
  const adapter = createMockKgv3Adapter();
  const accepted = await executeRunPreflight(contract, { observedIdentity: fixturePreflightIdentity(contract), knowledgeAdapter: adapter });
  assert.equal(accepted.accepted, true, accepted.issues.map((entry) => entry.message).join('; '));
  const rejected = await executeRunPreflight(contract, { observedIdentity: { ...fixturePreflightIdentity(contract), branch: 'wrong' }, knowledgeAdapter: adapter });
  assert.equal(rejected.accepted, false);
  assert.ok(rejected.issues.some((entry) => entry.code === 'wrong_branch'));
});

test('knowledge preflight rejects fresh cited context bound to another root branch and commit', async () => {
  const root = await fixtureRoot();
  const contract = fixtureContract(root, { knowledge_policy: { preflight_required: true } });
  const base = createMockKgv3Adapter();
  const hostile = {
    ...base,
    async read_context(...args) {
      const context = await base.read_context(...args);
      context.scope = { root: '/tmp/another-worktree', branch: 'wrong', commit: 'f'.repeat(40) };
      context.source_identities = context.source_identities.map((source) => ({ ...source, root: '/tmp/another-worktree', branch: 'wrong', commit: 'f'.repeat(40) }));
      return context;
    },
  };
  const result = await executeRunPreflight(contract, { observedIdentity: fixturePreflightIdentity(contract), knowledgeAdapter: hostile });
  assert.equal(result.accepted, false);
  assert.ok(result.issues.some((entry) => entry.code === 'knowledge_preflight_failed' && entry.message.includes('scope does not match')));
});

test('knowledge conformance rejects a recall receipt for a different digest', async () => {
  const base = createMockKgv3Adapter();
  const hostile = {
    ...base,
    async verify_recall(...args) {
      const receipt = await base.verify_recall(...args);
      return { ...receipt, current_outcome_digest: 'f'.repeat(64) };
    },
  };
  const result = await runKnowledgeAdapterConformance(hostile, { root: process.cwd(), branch: 'codex/test', commit: 'a'.repeat(40) });
  assert.equal(result.accepted, false);
  assert.equal(result.cases.find((entry) => entry.id === 'verify_recall').passed, false);
});

test('runtime event schema rejects event vocabulary drift before persistence', () => {
  const event = {
    event_version: '1.0.0', run_id: 'run_hostile_00000001', sequence: 0,
    event_id: 'event_hostile_00000001', event_type: 'source-only', timestamp: '2026-08-26T12:00:00Z',
    actor: { id: 'test', kind: 'deterministic_runner' }, previous_digest: null, payload: {},
    payload_digest: 'a'.repeat(64), event_digest: 'b'.repeat(64),
  };
  const result = validateRuntimePacket(event, 'agent-run-event.v1.schema.json');
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((entry) => entry.code === 'enum'));
});

test('start-at-A finish-at-B records B and rejects dirty, stale, and wrong-root promotion', async () => {
  const root = await fixtureRoot();
  const contract = fixtureContract(root);
  const { run_directory: runDirectory } = await startRun(contract, { runsRoot: path.join(root, 'runs'), observedIdentity: fixturePreflightIdentity(contract) });
  await writeFile(path.join(root, 'scripts', 'agent-system', 'fixture.mjs'), 'export const fixture = "candidate-b";\n');
  execFileSync('git', ['add', 'scripts/agent-system/fixture.mjs'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'candidate B'], { cwd: root, stdio: 'ignore' });
  const headB = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const treeB = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: root, encoding: 'utf8' }).trim();
  assert.notEqual(headB, contract.scope.starting_head);
  await appendEvent(runDirectory, { run_id: contract.run_id, event_type: 'observation_recorded', payload: { surface: root, readback: { head: headB, tree: treeB }, evidence_level: 'exact-candidate' } });
  const artifact = await recordArtifact(runDirectory, contract, 'scripts/agent-system');
  const measurementEvidence = await recordPassingMeasurementEvidence(root, runDirectory, contract);
  const evaluation = await recordEvaluation(runDirectory, contract, { evaluatorIdentity: 'independent-reviewer', measurements: measurementEvidence.measurements });
  assert.equal(artifact.artifact.candidate_identity.commit, headB);
  assert.equal(evaluation.candidate_identity.commit, headB);
  const hostileArtifact = structuredClone(artifact.artifact);
  delete hostileArtifact.candidate_identity.branch;
  const hostileArtifactResult = validateRuntimePacket(hostileArtifact, 'artifact.v1.schema.json');
  assert.equal(hostileArtifactResult.valid, false);
  assert.ok(hostileArtifactResult.issues.some((entry) => entry.code === 'required' && entry.path.includes('/candidate_identity/branch')));
  const hostileEvaluation = structuredClone(evaluation);
  delete hostileEvaluation.candidate_identity.git_status;
  const hostileEvaluationResult = validateRuntimePacket(hostileEvaluation, 'evaluation.v1.schema.json');
  assert.equal(hostileEvaluationResult.valid, false);
  assert.ok(hostileEvaluationResult.issues.some((entry) => entry.code === 'required' && entry.path.includes('/candidate_identity/git_status')));
  await terminate(runDirectory, contract.run_id, 'succeeded');
  const promoted = await promoteOutcome(runDirectory, contract, path.join(root, 'runs', 'outcome-b.json'));
  assert.equal(promoted.ending_head, headB);
  assert.equal(promoted.ending_tree, treeB);
  assert.deepEqual(promoted.git_status, []);

  await writeFile(path.join(root, 'scripts', 'agent-system', 'fixture.mjs'), 'export const fixture = "dirty-candidate";\n');
  await assert.rejects(() => promoteOutcome(runDirectory, contract, path.join(root, 'runs', 'dirty.json')), /worktree is dirty/);
  execFileSync('git', ['add', 'scripts/agent-system/fixture.mjs'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'candidate C'], { cwd: root, stdio: 'ignore' });
  await assert.rejects(() => promoteOutcome(runDirectory, contract, path.join(root, 'runs', 'stale.json')), /does not prove the clean current candidate/);
  const current = { root: '/tmp/another-worktree', branch: contract.scope.branch, commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), tree: execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: root, encoding: 'utf8' }).trim(), git_status: [] };
  await assert.rejects(() => promoteOutcome(runDirectory, contract, path.join(root, 'runs', 'wrong-root.json'), { candidateIdentity: current }), /Explicit candidate identity rejected/);
});

test('bounded non-success termination promotes a schema-valid continuation while direct success is forbidden', async () => {
  const root = await fixtureRoot();
  const contract = fixtureContract(root);
  const { run_directory: runDirectory } = await startRun(contract, { runsRoot: path.join(root, 'runs'), observedIdentity: fixturePreflightIdentity(contract) });
  await assert.rejects(() => terminateRun(runDirectory, 'succeeded'), /non-success terminal states only/);
  const snapshot = await terminateRun(runDirectory, 'blocked', { details: { blocker: 'bounded test blocker' }, actor: 'operator' });
  assert.equal(snapshot.terminal_state, 'blocked');
  const output = path.join(root, 'runs', 'continuation.json');
  const packet = await promoteContinuation(runDirectory, contract, output, { nextBoundedTask: 'Resolve the bounded test blocker.' });
  assert.equal(validateRuntimePacket(packet, 'continuation-packet.v1.schema.json').valid, true);
  assert.deepEqual(JSON.parse(await readFile(output, 'utf8')), packet);
});

test('wall-time expiry blocks mutation and success while continuation reports zero remaining time', async () => {
  const root = await fixtureRoot();
  const contract = fixtureContract(root, { budgets: { max_wall_seconds: 60 } });
  const { run_directory: runDirectory, snapshot: startedSnapshot } = await startRun(contract, { runsRoot: path.join(root, 'runs'), observedIdentity: fixturePreflightIdentity(contract) });
  const expiredNow = Date.parse(startedSnapshot.started_at) + 60_001;
  await assert.rejects(() => recordArtifact(runDirectory, contract, 'scripts/agent-system', { now: expiredNow }), /Run budget exhausted: wall_time_ms/);
  await assert.rejects(() => recordEvaluation(runDirectory, contract, { evaluatorIdentity: 'independent-reviewer', measurements: {}, now: expiredNow }), /Run budget exhausted: wall_time_ms/);
  await assert.rejects(() => appendEvent(runDirectory, { run_id: contract.run_id, event_type: 'observation_recorded', now: expiredNow, payload: { surface: root, readback: {}, evidence_level: 'source-only' } }), /Run budget exhausted: wall_time_ms/);
  await assert.rejects(() => terminate(runDirectory, contract.run_id, 'succeeded', {}, 'runner', { now: expiredNow }), /Run budget exhausted: wall_time_ms/);
  const terminal = await terminateRun(runDirectory, 'budget_exhausted', { now: expiredNow, details: { reason: 'wall_time_elapsed' } });
  assert.equal(terminal.terminal_state, 'budget_exhausted');
  const packet = await promoteContinuation(runDirectory, contract, path.join(root, 'runs', 'expired-continuation.json'), { now: expiredNow, nextBoundedTask: 'Start a fresh bounded run.' });
  assert.equal(packet.remaining_budget.wall_seconds, 0);
});

test('budget-exhausted continuation preserves legacy non-artifact repair evidence as unresolved conflicts', async () => {
  const root = await fixtureRoot();
  const contract = fixtureContract(root, { budgets: { max_wall_seconds: 60 } });
  const { run_directory: runDirectory, snapshot: startedSnapshot } = await startRun(contract, { runsRoot: path.join(root, 'runs'), observedIdentity: fixturePreflightIdentity(contract) });
  await appendEvent(runDirectory, {
    run_id: contract.run_id,
    event_type: 'repair_directed',
    payload: {
      changed_hypothesis: 'Hostile validation must fail closed with exact suite evidence.',
      falsifying_evidence: ['independent-review-P1-hostile-validation', 'runner-suite-85-of-93'],
    },
  });
  const expiredNow = Date.parse(startedSnapshot.started_at) + 60_001;
  await terminateRun(runDirectory, 'budget_exhausted', { now: expiredNow, details: { reason: 'wall_time_elapsed' } });
  const output = path.join(root, 'runs', 'legacy-evidence-continuation.json');
  const packet = await promoteContinuation(runDirectory, contract, output, { now: expiredNow, nextBoundedTask: 'Record durable artifact evidence in the next run.' });
  assert.deepEqual(packet.failed_hypotheses, []);
  assert.ok(packet.unresolved_conflicts.some((entry) => entry.includes('independent-review-P1-hostile-validation')));
  assert.ok(packet.unresolved_conflicts.some((entry) => entry.includes('runner-suite-85-of-93')));
  assert.equal(validateRuntimePacket(packet, 'continuation-packet.v1.schema.json').valid, true);
  assert.deepEqual(JSON.parse(await readFile(output, 'utf8')), packet);
});
