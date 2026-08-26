import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fixtureContract, fixturePreflightIdentity, fixtureRoot, passingMeasurements, recordPassingMeasurementEvidence } from './helpers.mjs';
import { startRun } from '../runner.mjs';
import { appendEvent, rebuildSnapshot, terminate } from '../ledger.mjs';
import { evaluateContractAssertions, evaluateRubric, gradeTrajectory, recordEvaluation, recordRepairDirective } from '../evaluator.mjs';
import { hashArtifact, recordArtifact, scanArtifact } from '../artifacts.mjs';
import { assertRedacted, redactValue, scanForSensitiveContent } from '../redact.mjs';
import { buildContinuationPacket, buildOutcomePacket, promoteOutcome, validateOutcomePacket } from '../outcome.mjs';
import { aggregateRunMetrics } from '../metrics.mjs';

async function started(overrides = {}) {
  const root = await fixtureRoot();
  const contract = fixtureContract(root, overrides);
  const { run_directory } = await startRun(contract, { runsRoot: path.join(root, 'runs'), observedIdentity: fixturePreflightIdentity(contract) });
  return { root, contract, runDirectory: run_directory };
}

test('raw scalar measurements cannot green deterministic evaluation', async () => {
  const { contract } = await started();
  const result = await evaluateContractAssertions(contract, { evaluatorIdentity: 'reviewer-agent', measurements: passingMeasurements(contract) });
  assert.deepEqual(result.counts, { total: 5, passed: 0, failed: 0, blocked: 5 });
  assert.equal(result.accepted, false);
  assert.equal(result.command_results[0].exit_code, 0);
});

test('recorded typed measurement evidence produces exact pass counts', async () => {
  const { root, contract, runDirectory } = await started();
  const evidence = await recordPassingMeasurementEvidence(root, runDirectory, contract);
  const result = await recordEvaluation(runDirectory, contract, { evaluatorIdentity: 'reviewer-agent', measurements: evidence.measurements });
  assert.deepEqual(result.counts, { total: 5, passed: 5, failed: 0, blocked: 0 });
  assert.equal(result.accepted, true);
  assert.ok(result.assertions.every((entry) => entry.evidence_artifact_ids.includes(evidence.artifact.artifact_id)));
});

test('measurement binding rejects nonexistent evidence IDs, wrong candidates, and insufficient levels', async () => {
  const missing = await started();
  const missingEvidence = await recordPassingMeasurementEvidence(missing.root, missing.runDirectory, missing.contract);
  for (const binding of Object.values(missingEvidence.measurements)) binding.evidence_artifact_ids = ['artifact_does_not_exist'];
  const missingResult = await recordEvaluation(missing.runDirectory, missing.contract, { evaluatorIdentity: 'reviewer-agent', measurements: missingEvidence.measurements });
  assert.equal(missingResult.accepted, false);
  assert.equal(missingResult.counts.blocked, 5);

  const wrong = await started();
  const current = (await import('../candidate.mjs')).observeCandidateIdentity(wrong.root);
  const wrongEvidence = await recordPassingMeasurementEvidence(wrong.root, wrong.runDirectory, wrong.contract, { candidateIdentity: { root: '/tmp/another-worktree', branch: current.branch, commit: current.commit, tree: current.tree, git_status: [] } });
  const wrongResult = await recordEvaluation(wrong.runDirectory, wrong.contract, { evaluatorIdentity: 'reviewer-agent', measurements: wrongEvidence.measurements });
  assert.equal(wrongResult.accepted, false);
  assert.equal(wrongResult.counts.blocked, 5);

  const low = await started();
  const lowEvidence = await recordPassingMeasurementEvidence(low.root, low.runDirectory, low.contract, { levelOverrides: { unattributed_out_of_scope_path_count: 'source-only' } });
  const lowResult = await recordEvaluation(low.runDirectory, low.contract, { evaluatorIdentity: 'reviewer-agent', measurements: lowEvidence.measurements });
  assert.equal(lowResult.accepted, false);
  assert.equal(lowResult.assertions.find((entry) => entry.assertion_id === 'IMPL-SCOPE').result, 'blocked');
});

test('same critical actor is rejected as non-independent', async () => {
  const { contract } = await started({ loop_profile: { id: 'security-authority', version: '1.0.0', path: 'governance/agent-system/loops/security-authority.v1.json' } });
  const result = await evaluateContractAssertions(contract, { evaluatorIdentity: 'creator-agent', critical: true });
  assert.equal(result.accepted, false);
  assert.equal(result.independence, 'same_actor_rejected');
});

test('unsafe shell metacharacters fail instead of invoking a shell', async () => {
  const context = await started();
  const contract = structuredClone(context.contract);
  contract.evaluator.deterministic_commands = [{ id: 'CHECK-UNSAFE', command: 'node --version; touch nope', cwd: context.root, expected_exit_code: 0, timeout_seconds: 1 }];
  const result = await evaluateContractAssertions(contract, { evaluatorIdentity: 'reviewer-agent' });
  assert.equal(result.accepted, false);
  assert.match(result.command_results[0].reason, /metacharacters/);
});

test('missing measurement blocks the assertion', async () => {
  const { contract: base } = await started();
  const contract = structuredClone(base);
  contract.expected_outcome = { statement: 'A real environment value must be observed.', assertions: [{ id: 'ASSERT-MISSING', description: 'Environment reports expected value.', subject: 'missing_value', operator: 'equals', expected: 1, minimum_evidence_level: 'exact-candidate', hard_fail: true }] };
  contract.evaluator.hard_fail_assertion_ids = ['ASSERT-MISSING'];
  const result = await evaluateContractAssertions(contract, { evaluatorIdentity: 'reviewer-agent' });
  assert.equal(result.counts.blocked, 1);
  assert.equal(result.accepted, false);
});

test('rubric rejects missing dimension evidence', () => {
  const result = evaluateRubric({ rubric_id: 'rubric', pass_threshold: 100, hard_fail_rules: ['ONE-CHECK'], dimensions: [{ id: 'ONE-CHECK', weight: 100 }] }, {}, { evaluatorIdentity: 'reviewer' });
  assert.equal(result.accepted, false);
});

test('recorded evaluation is replayed into snapshot', async () => {
  const { root, contract, runDirectory } = await started();
  const evidence = await recordPassingMeasurementEvidence(root, runDirectory, contract);
  await recordEvaluation(runDirectory, contract, { evaluatorIdentity: 'reviewer-agent', measurements: evidence.measurements });
  const snapshot = await rebuildSnapshot(runDirectory, contract.run_id);
  assert.equal(snapshot.evaluations.length, 1);
  assert.equal(snapshot.evaluations[0].verdict, 'accepted');
});

test('trajectory requires declared environment observation', async () => {
  const { root, contract, runDirectory } = await started();
  const evidence = await recordPassingMeasurementEvidence(root, runDirectory, contract);
  await recordEvaluation(runDirectory, contract, { evaluatorIdentity: 'reviewer-agent', measurements: evidence.measurements });
  const snapshot = await rebuildSnapshot(runDirectory, contract.run_id);
  assert.equal(gradeTrajectory(snapshot, contract).dimensions.environment_observed, false);
});

test('repair rejects repeated unchanged hypothesis', async () => {
  const { contract, runDirectory } = await started({ budgets: { max_wall_seconds: 60 } });
  const recorded = await recordArtifact(runDirectory, contract, 'scripts/agent-system');
  const directive = { failed_assertion: 'ASSERT-PASS', falsifying_evidence: [recorded.artifact.artifact_id], prior_hypothesis: 'The command path is correct.', changed_hypothesis: 'The command path resolves in the wrong root.', implementation_target: 'command root', required_regression_scope: ['command-root'] };
  const snapshot = await rebuildSnapshot(runDirectory, contract.run_id);
  const repair = await recordRepairDirective(runDirectory, contract, directive, 'evaluator', { now: Date.parse(snapshot.started_at) + 30_000 });
  assert.ok(repair.remaining_budget.wall_seconds <= 30 && repair.remaining_budget.wall_seconds >= 29);
  await assert.rejects(() => recordRepairDirective(runDirectory, contract, directive), /change the hypothesis/);
});

test('repair rejects labels and nonexistent artifact IDs at the write boundary', async () => {
  const { contract, runDirectory } = await started();
  const base = { failed_assertion: 'ASSERT-PASS', prior_hypothesis: 'The command path is correct.', changed_hypothesis: 'The evidence reference is not durable.', implementation_target: 'evidence reference', required_regression_scope: ['repair-evidence'] };
  await assert.rejects(() => recordRepairDirective(runDirectory, contract, { ...base, falsifying_evidence: ['independent-review-P1-hostile-validation'] }), /must reference recorded artifact IDs/);
  await assert.rejects(() => recordRepairDirective(runDirectory, contract, { ...base, falsifying_evidence: ['artifact_not_recorded'] }), /must reference recorded artifact IDs/);
  assert.equal((await rebuildSnapshot(runDirectory, contract.run_id)).repairs.length, 0);
});

test('artifact hashing creates ordered manifest aggregate', async () => {
  const { root } = await started();
  const result = await hashArtifact(root, 'scripts/agent-system');
  assert.equal(result.manifest.length, 1);
  assert.match(result.aggregate_sha256, /^[0-9a-f]{64}$/);
});

test('artifact path traversal is rejected', async () => {
  const { root } = await started();
  await assert.rejects(() => hashArtifact(root, '../outside'), /escapes root/);
});

test('artifact scanner detects API token material', async () => {
  const { root } = await started();
  const secretKey = ['to', 'ken'].join('');
  const secretValue = ['sk', 'abcdefghijklmnopqrstuvwxyz123456'].join('_');
  await writeFile(path.join(root, 'scripts', 'agent-system', 'secret.txt'), `${secretKey}=${secretValue}`);
  const result = await scanArtifact(root, 'scripts/agent-system');
  assert.equal(result.redaction_passed, false);
});

test('record artifact rejects sensitive content by default', async () => {
  const { root, contract, runDirectory } = await started();
  await writeFile(path.join(root, 'scripts', 'agent-system', 'secret.txt'), `${['pass', 'word'].join('')}: "hunter2"`);
  await assert.rejects(() => recordArtifact(runDirectory, contract, 'scripts/agent-system'), /redaction failed/);
});

test('recursive redaction removes secret keys and token values', () => {
  const passwordKey = ['pass', 'word'].join('');
  const redacted = redactValue({ [passwordKey]: 'abc', nested: { note: ['Bear', 'er abc.def.ghi'].join('') } });
  assert.equal(redacted[passwordKey], '[REDACTED]');
  assert.equal(scanForSensitiveContent(redacted).length, 0);
  assert.equal(assertRedacted(redacted), true);
});

async function successfulRun() {
  const context = await started();
  const { root, contract, runDirectory } = context;
  await appendEvent(runDirectory, { run_id: contract.run_id, event_type: 'observation_recorded', payload: { surface: contract.scope.root, readback: { root: contract.scope.root } } });
  await recordArtifact(runDirectory, contract, 'scripts/agent-system');
  const evidence = await recordPassingMeasurementEvidence(root, runDirectory, contract);
  await recordEvaluation(runDirectory, contract, { evaluatorIdentity: 'reviewer-agent', measurements: evidence.measurements });
  await terminate(runDirectory, contract.run_id, 'succeeded');
  return context;
}

test('successful run builds valid schema-shaped outcome packet', async () => {
  const { contract, runDirectory } = await successfulRun();
  const packet = buildOutcomePacket(contract, await rebuildSnapshot(runDirectory, contract.run_id));
  assert.equal(validateOutcomePacket(packet).valid, true);
  assert.equal(packet.requirements[0].status, 'accepted');
});

test('tampered outcome digest is rejected', async () => {
  const { contract, runDirectory } = await successfulRun();
  const packet = buildOutcomePacket(contract, await rebuildSnapshot(runDirectory, contract.run_id));
  packet.branch = 'tampered';
  assert.ok(validateOutcomePacket(packet).issues.includes('outcome digest mismatch'));
});

test('outcome promotion writes only accepted packet', async () => {
  const { root, contract, runDirectory } = await successfulRun();
  const output = path.join(root, 'promoted', 'outcome.json');
  const packet = await promoteOutcome(runDirectory, contract, output);
  assert.deepEqual(JSON.parse(await readFile(output, 'utf8')), packet);
  assert.equal(validateOutcomePacket(packet).valid, true);
  assert.ok(Array.isArray(packet.evidence_index));
});

test('unfinished run produces bounded continuation packet', async () => {
  const { contract, runDirectory } = await started();
  const packet = buildContinuationPacket(contract, await rebuildSnapshot(runDirectory, contract.run_id), { nextBoundedTask: 'Add the missing environment observation.' });
  assert.deepEqual(packet.open_requirement_ids, ['REQ-FIXTURE']);
  assert.equal(packet.terminal_state, 'blocked');
});

test('metrics report sample count, pass@1, and unresolved effects', async () => {
  const one = await successfulRun();
  const snapshot = await rebuildSnapshot(one.runDirectory, one.contract.run_id);
  const result = aggregateRunMetrics([snapshot], { suiteId: 'fixture', candidateSha: 'a'.repeat(40) });
  assert.equal(result.sample_count, 1);
  assert.equal(result.final_pass_rate, 1);
});
