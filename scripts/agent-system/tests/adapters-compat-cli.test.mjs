import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fixtureRoot } from './helpers.mjs';
import { createExactSourceAdapter } from '../adapters/exact-source.mjs';
import { createRepoGraphAdapter } from '../adapters/repo-graph.mjs';
import { createKgv2Adapter } from '../adapters/kgv2.mjs';
import { createMockKgv3Adapter } from '../adapters/mock-kgv3.mjs';
import { runKnowledgeAdapterConformance, validateKnowledgeReceipt } from '../adapters/port.mjs';
import { probeKnownsCompatibility, validateInstructionSurfaces } from '../compatibility.mjs';
import { incidentToRegressionCase, runEvaluationSuite } from '../eval-runner.mjs';

const COMMIT = 'a'.repeat(40);

test('exact-source adapter passes semantic conformance', async () => {
  const root = await fixtureRoot();
  const adapter = createExactSourceAdapter({ root, branch: 'fixture', commit: COMMIT, recordsRoot: path.join(root, 'records') });
  const result = await runKnowledgeAdapterConformance(adapter, { root, branch: 'fixture', commit: COMMIT });
  assert.deepEqual(result.counts, { total: 4, passed: 4, failed: 0 });
});

test('exact-source context fails conformance for wrong root', async () => {
  const root = await fixtureRoot();
  const adapter = createExactSourceAdapter({ root, branch: 'fixture', commit: COMMIT, recordsRoot: path.join(root, 'records') });
  const result = await runKnowledgeAdapterConformance(adapter, { root: '/tmp/wrong-root', branch: 'fixture', commit: COMMIT });
  assert.equal(result.accepted, false);
  assert.equal(result.cases.find((entry) => entry.id === 'read_context').passed, false);
});

test('Repo Graph adapter reads exact packet and durably records outcome', async () => {
  const root = await fixtureRoot();
  const packetPath = path.join(root, 'repo-graph.json');
  await writeFile(packetPath, JSON.stringify({ packet_version: '1', root, branch: 'fixture', commit: COMMIT, facts: ['Exact graph packet fact'], stale_reasons: [] }));
  const adapter = createRepoGraphAdapter({ root, packetPath, recordsRoot: path.join(root, 'records') });
  const result = await runKnowledgeAdapterConformance(adapter, { root, branch: 'fixture', commit: COMMIT });
  assert.equal(result.accepted, true);
});

test('Repo Graph wrong-commit packet fails read conformance', async () => {
  const root = await fixtureRoot();
  const packetPath = path.join(root, 'repo-graph.json');
  await writeFile(packetPath, JSON.stringify({ root, branch: 'fixture', commit: 'b'.repeat(40), facts: ['Stale'] }));
  const result = await runKnowledgeAdapterConformance(createRepoGraphAdapter({ root, packetPath, recordsRoot: path.join(root, 'records') }), { root, branch: 'fixture', commit: COMMIT });
  assert.equal(result.accepted, false);
});

test('mock KGv3 proves provider name is not a core branch', async () => {
  const root = await fixtureRoot();
  const result = await runKnowledgeAdapterConformance(createMockKgv3Adapter(), { root, branch: 'fixture', commit: COMMIT });
  assert.equal(result.accepted, true);
});

test('unconfigured KGv2 health is an explicit failure', async () => {
  const receipt = await createKgv2Adapter(null).health();
  assert.equal(receipt.accepted, false);
  assert.equal(receipt.fallback_status, 'unavailable');
  assert.equal(validateKnowledgeReceipt(receipt, 'health'), true);
});

test('unconfigured KGv2 cannot green conformance', async () => {
  const root = await fixtureRoot();
  const result = await runKnowledgeAdapterConformance(createKgv2Adapter(null), { root, branch: 'fixture', commit: COMMIT });
  assert.equal(result.accepted, false);
  assert.ok(result.counts.failed >= 1);
});

test('schema-compatible KG client passes through the portable port', async () => {
  const root = await fixtureRoot();
  const portable = createMockKgv3Adapter();
  const result = await runKnowledgeAdapterConformance(createKgv2Adapter(portable), { root, branch: 'fixture', commit: COMMIT });
  assert.equal(result.accepted, true);
});

test('knowns generated file is compatible with file consumer', async () => {
  const root = await fixtureRoot();
  const result = await probeKnownsCompatibility(root, { toolExpects: 'file' });
  assert.equal(result.compatible, true);
  assert.equal(result.runner_dependency, false);
});

test('knowns directory consumer reports ENOTDIR and must exit non-zero', async () => {
  const root = await fixtureRoot();
  const result = await probeKnownsCompatibility(root, { toolExpects: 'directory' });
  assert.equal(result.compatible, false);
  assert.equal(result.code, 'ENOTDIR');
});

test('instruction validation accepts one authority entrypoint and all commands', async () => {
  const root = await fixtureRoot();
  const references = ['PRODUCT_TRUTH.md', 'docs/CHOPDOT_OPERATING_LOOPS.md', 'docs/CHOPDOT_LOOP_RUNNER.md', 'product/cards.md', 'product/decisions.md', 'product/decision-contracts.md', 'product/roadmap.md', 'governance/agent-system/instructions/chopdot-product-judgment.md', 'governance/agent-system/instructions/chopdot-frontend-design.md'];
  await writeFile(path.join(root, 'AGENTS.md'), references.join('\n'));
  await writeFile(path.join(root, 'CLAUDE.md'), 'Follow AGENTS.md.');
  const commands = ['agent:validate', 'agent:contract:new', 'agent:run:start', 'agent:run:resume', 'agent:run:status', 'agent:run:cancel', 'agent:run:terminate', 'agent:evaluate', 'agent:outcome:promote', 'agent:continuation:promote', 'agent:knowledge:preflight', 'agent:knowledge:record', 'agent:knowledge:verify', 'agent:eval', 'agent:ci'];
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ scripts: Object.fromEntries(commands.map((name) => [name, 'true'])) }));
  assert.equal((await validateInstructionSurfaces(root)).valid, true);
});

test('instruction validation fails closed when the tracked frontend method is not routed', async () => {
  const root = await fixtureRoot();
  const references = ['PRODUCT_TRUTH.md', 'docs/CHOPDOT_OPERATING_LOOPS.md', 'docs/CHOPDOT_LOOP_RUNNER.md', 'product/cards.md', 'product/decisions.md', 'product/decision-contracts.md', 'product/roadmap.md', 'governance/agent-system/instructions/chopdot-product-judgment.md'];
  await writeFile(path.join(root, 'AGENTS.md'), references.join('\n'));
  await writeFile(path.join(root, 'CLAUDE.md'), 'Follow AGENTS.md.');
  const commands = ['agent:validate', 'agent:contract:new', 'agent:run:start', 'agent:run:resume', 'agent:run:status', 'agent:run:cancel', 'agent:run:terminate', 'agent:evaluate', 'agent:outcome:promote', 'agent:continuation:promote', 'agent:knowledge:preflight', 'agent:knowledge:record', 'agent:knowledge:verify', 'agent:eval', 'agent:ci'];
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ scripts: Object.fromEntries(commands.map((name) => [name, 'true'])) }));
  const result = await validateInstructionSurfaces(root);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((entry) => entry.code === 'MISSING_REFERENCE' && entry.message.endsWith('chopdot-frontend-design.md')));
});

test('CLAUDE independent stale stack claim is rejected', async () => {
  const root = await fixtureRoot();
  await writeFile(path.join(root, 'AGENTS.md'), 'PRODUCT_TRUTH.md');
  await writeFile(path.join(root, 'CLAUDE.md'), 'Follow AGENTS.md and use Prisma.');
  await writeFile(path.join(root, 'package.json'), '{}');
  const result = await validateInstructionSurfaces(root);
  assert.ok(result.issues.some((entry) => entry.code === 'INDEPENDENT_STACK_CLAIM'));
});

test('evaluation suite returns exact pass and fail counts', async () => {
  const result = await runEvaluationSuite({ id: 'fixture-suite', cases: [{ id: 'bad-profile', kind: 'profile_validation', input: {}, expected_valid: false }] });
  assert.deepEqual(result.counts, { total: 1, passed: 1, failed: 0 });
});

test('unknown evaluation case kind is a failing case', async () => {
  const result = await runEvaluationSuite({ id: 'fixture-suite', cases: [{ id: 'unknown', kind: 'magic', expected_valid: false }] });
  assert.equal(result.accepted, false);
});

test('incident conversion remains proposed until reviewed', () => {
  const result = incidentToRegressionCase({ run_id: 'run_fixture_12345678', terminal_state: 'failed_verification' }, { assertion: 'Failure remains rejected.', input: {}, expectedValid: false });
  assert.equal(result.status, 'proposed_requires_review');
  assert.equal(result.approved_by, null);
});

test('CLI help is available without imports or mutation failure', () => {
  const cli = path.resolve('scripts/agent-system/cli.mjs');
  const result = spawnSync(process.execPath, [cli, 'help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Portable Agent Outcome System CLI/);
});

test('CLI unknown command exits non-zero with JSON error', () => {
  const cli = path.resolve('scripts/agent-system/cli.mjs');
  const result = spawnSync(process.execPath, [cli, 'unknown', '--json'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).ok, false);
});

test('CLI knowns probe reports ENOTDIR with non-zero exit', async () => {
  const root = await fixtureRoot();
  const cli = path.resolve('scripts/agent-system/cli.mjs');
  const result = spawnSync(process.execPath, [cli, 'knowns-probe', '--root', root, '--tool-expects', 'directory', '--json'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).code, 'ENOTDIR');
});

test('CLI help exposes the complete lifecycle surface', () => {
  const cli = path.resolve('scripts/agent-system/cli.mjs');
  const result = spawnSync(process.execPath, [cli, 'help'], { encoding: 'utf8' });
  for (const command of ['run-checkpoint', 'run-observe', 'run-artifact', 'run-budget', 'run-repair', 'run-terminate', 'effect-plan', 'approval-record', 'effect-readback', 'continuation-promote']) assert.match(result.stdout, new RegExp(command));
});

test('CLI contract-new preserves explicit agent creator identity', async () => {
  const root = await fixtureRoot();
  const cli = path.resolve('scripts/agent-system/cli.mjs');
  const output = path.join(root, 'agent-contract.json');
  const result = spawnSync(process.execPath, [
    cli, 'contract-new', '--output', output, '--root', root,
    '--run-id', 'run_cli_creator_identity', '--branch', 'fixture',
    '--starting-head', 'a'.repeat(40), '--starting-tree', 'b'.repeat(40),
    '--created-by', 'pilot-agent', '--created-by-kind', 'agent', '--json',
  ], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(JSON.parse(result.stdout).contract.created_by, { id: 'pilot-agent', kind: 'agent' });
});

test('CLI contract-new rejects ambiguous creator identity', async () => {
  const root = await fixtureRoot();
  const cli = path.resolve('scripts/agent-system/cli.mjs');
  const result = spawnSync(process.execPath, [
    cli, 'contract-new', '--output', path.join(root, 'bad-contract.json'), '--root', root,
    '--run-id', 'run_cli_creator_missing_kind', '--branch', 'fixture',
    '--starting-head', 'a'.repeat(40), '--starting-tree', 'b'.repeat(40),
    '--created-by', 'pilot-agent', '--json',
  ], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(JSON.parse(result.stdout).error.message, /must be provided together/);
});
