import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { generatePrOutcome } from '../generate-pr-outcome.mjs';
import { validateOutcomePacket } from '../../agent-system/outcome.mjs';

const reportNames = [
  'agent-contract-exact-head.json', 'agent-runner-exact-head.json',
  'knowledge-adapters-exact-head.json', 'repo-governance-exact-head.json',
  'application-exact-head.json',
];
const successfulJobs = Object.fromEntries(['agent-contract', 'agent-runner', 'knowledge-adapters', 'repo-governance', 'application-fast-assurance'].map((job) => [job, 'success']));

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chopdot-pr-outcome-root-'));
  execFileSync('git', ['init', '-q', '-b', 'codex/test'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'fixture@example.invalid'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Fixture'], { cwd: root });
  fs.writeFileSync(path.join(root, 'candidate.txt'), 'candidate\n');
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['commit', '-qm', 'candidate'], { cwd: root });
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const tree = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: root, encoding: 'utf8' }).trim();
  const evidenceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'chopdot-pr-outcome-input-'));
  for (const name of reportNames) {
    const directory = path.join(evidenceRoot, name.replace('.json', ''));
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, name), JSON.stringify({ ok: true, actual_sha: head, actual_tree: tree }));
  }
  return { root, head, tree, evidenceRoot, outputDirectory: fs.mkdtempSync(path.join(os.tmpdir(), 'chopdot-pr-outcome-output-')) };
}

test('same-run exact-head reports generate a valid external OutcomePacketV1', () => {
  const value = fixture();
  const result = generatePrOutcome({ ...value, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: value.head, workflowRunId: '12345', jobResults: successfulJobs });
  assert.equal(result.ok, true);
  assert.equal(result.exact_counts.total, 5);
  assert.equal(result.exact_counts.passed, 5);
  assert.equal(validateOutcomePacket(result.packet).valid, true);
  assert.equal(result.packet.ending_head, value.head);
  assert.equal(result.packet.ending_tree, value.tree);
  assert.equal(fs.realpathSync(result.packet.root), fs.realpathSync(value.root));
  assert.equal(result.packet.branch, 'codex/test');
});

test('missing, duplicate, stale, or dirty same-run inputs fail closed', () => {
  const missing = fixture();
  fs.rmSync(path.dirname(path.join(missing.evidenceRoot, 'agent-runner-exact-head', 'agent-runner-exact-head.json')), { recursive: true });
  assert.throws(() => generatePrOutcome({ ...missing, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: missing.head, workflowRunId: '1', jobResults: successfulJobs }), /exactly one same-run/);

  const duplicate = fixture();
  fs.mkdirSync(path.join(duplicate.evidenceRoot, 'duplicate'), { recursive: true });
  fs.copyFileSync(path.join(duplicate.evidenceRoot, 'agent-contract-exact-head', 'agent-contract-exact-head.json'), path.join(duplicate.evidenceRoot, 'duplicate', 'agent-contract-exact-head.json'));
  assert.throws(() => generatePrOutcome({ ...duplicate, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: duplicate.head, workflowRunId: '2', jobResults: successfulJobs }), /found 2/);

  const stale = fixture();
  const stalePath = path.join(stale.evidenceRoot, 'application-exact-head', 'application-exact-head.json');
  fs.writeFileSync(stalePath, JSON.stringify({ ok: true, actual_sha: 'f'.repeat(40), actual_tree: stale.tree }));
  assert.throws(() => generatePrOutcome({ ...stale, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: stale.head, workflowRunId: '3', jobResults: successfulJobs }), /does not prove exact candidate/);

  const dirty = fixture();
  fs.writeFileSync(path.join(dirty.root, 'untracked.txt'), 'dirty\n');
  assert.throws(() => generatePrOutcome({ ...dirty, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: dirty.head, workflowRunId: '4', jobResults: successfulJobs }), /candidate is dirty/);
});

test('missing, skipped, or failed required job results cannot generate an outcome', () => {
  for (const result of [undefined, 'skipped', 'failure']) {
    const value = fixture();
    const jobResults = { ...successfulJobs };
    if (result === undefined) delete jobResults['agent-runner']; else jobResults['agent-runner'] = result;
    assert.throws(() => generatePrOutcome({ ...value, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: value.head, workflowRunId: '5', jobResults }), /agent-runner=success/);
  }
});
