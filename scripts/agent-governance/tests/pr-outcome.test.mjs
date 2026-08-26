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
const identities = {
  prSubmitterIdentity: 'fixture-submitter',
  prSubmitterSource: 'pull_request.user.login',
  evaluatorIdentity: 'github-actions:pr-outcome:12345:1',
  evaluatorSource: 'github-actions-run-and-job',
};

function commit(root, file, contents, message, identity = {}) {
  fs.writeFileSync(path.join(root, file), contents);
  execFileSync('git', ['add', file], { cwd: root });
  execFileSync('git', ['commit', '-qm', message], {
    cwd: root,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: identity.authorName ?? 'Fixture Author',
      GIT_AUTHOR_EMAIL: identity.authorEmail ?? 'fixture-author@example.invalid',
      GIT_COMMITTER_NAME: identity.committerName ?? 'Fixture Committer',
      GIT_COMMITTER_EMAIL: identity.committerEmail ?? 'fixture-committer@example.invalid',
    },
  });
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chopdot-pr-outcome-root-'));
  execFileSync('git', ['init', '-q', '-b', 'codex/test'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'fixture@example.invalid'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Fixture'], { cwd: root });
  commit(root, 'base.txt', 'base\n', 'base');
  const baseSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  commit(root, 'candidate.txt', 'candidate\n', 'candidate');
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const tree = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: root, encoding: 'utf8' }).trim();
  const evidenceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'chopdot-pr-outcome-input-'));
  for (const name of reportNames) {
    const directory = path.join(evidenceRoot, name.replace('.json', ''));
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, name), JSON.stringify({ ok: true, actual_sha: head, actual_tree: tree }));
  }
  return { root, head, tree, baseSha, evidenceRoot, outputDirectory: fs.mkdtempSync(path.join(os.tmpdir(), 'chopdot-pr-outcome-output-')) };
}

test('same-run exact-head reports generate a valid external OutcomePacketV1', () => {
  const value = fixture();
  const result = generatePrOutcome({ ...value, ...identities, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: value.head, workflowRunId: '12345', jobResults: successfulJobs });
  assert.equal(result.ok, true);
  assert.equal(result.exact_counts.total, 5);
  assert.equal(result.exact_counts.passed, 5);
  assert.equal(validateOutcomePacket(result.packet).valid, true);
  assert.equal(result.packet.ending_head, value.head);
  assert.equal(result.packet.ending_tree, value.tree);
  assert.equal(fs.realpathSync(result.packet.root), fs.realpathSync(value.root));
  assert.equal(result.packet.branch, 'codex/test');
  assert.equal(result.packet.evaluation_summary.independent_review_satisfied, true);
  const evidence = JSON.parse(fs.readFileSync(path.join(value.outputDirectory, 'pr-outcome-evidence.json')));
  assert.equal(evidence.independence.candidate_provenance.base_sha, value.baseSha);
  assert.equal(evidence.independence.candidate_provenance.head_sha, value.head);
  assert.equal(evidence.independence.candidate_provenance.commit_count, 1);
  assert.deepEqual(evidence.independence.candidate_provenance.identities.map(({name, email, roles}) => ({name, email, roles})), [
    {name: 'Fixture Author', email: 'fixture-author@example.invalid', roles: ['author']},
    {name: 'Fixture Committer', email: 'fixture-committer@example.invalid', roles: ['committer']},
  ]);
  assert.deepEqual(evidence.independence.pr_submitter, { id: 'fixture-submitter', kind: 'human_or_service_actor', source: 'pull_request.user.login' });
  assert.deepEqual(evidence.independence.evaluator, {
    id: 'github-actions:pr-outcome:12345:1', kind: 'deterministic_runner', source: 'github-actions-run-and-job',
    workflow_run_id: '12345', workflow_run_attempt: '1', human_review: false, codeowner_review: false,
  });
  assert.equal(evidence.independence.basis, 'deterministic_evaluator_identity_does_not_alias_pr_submitter_or_any_base_to_head_commit_author_or_committer');
  assert.equal(evidence.independence.satisfied, true);
  assert.match(result.packet.limitations[0], /does not prove human or CODEOWNER review/);
});

test('missing submitter or evaluator identities and relevant aliases fail closed', () => {
  const missing = fixture();
  assert.throws(() => generatePrOutcome({
    ...missing, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: missing.head,
    workflowRunId: '12345', jobResults: successfulJobs, evaluatorIdentity: identities.evaluatorIdentity,
  }), /PR submitter identity/);

  const same = fixture();
  assert.throws(() => generatePrOutcome({
    ...same, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: same.head,
    workflowRunId: '12345', jobResults: successfulJobs, prSubmitterIdentity: 'Same-Actor',
    evaluatorIdentity: 'same-actor', evaluatorSource: 'test',
  }), /aliases relevant candidate identity/);

  const authorAlias = fixture();
  assert.throws(() => generatePrOutcome({
    ...authorAlias, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: authorAlias.head,
    workflowRunId: '12345', jobResults: successfulJobs, prSubmitterIdentity: 'other-submitter',
    evaluatorIdentity: 'FIXTURE-AUTHOR@EXAMPLE.INVALID', evaluatorSource: 'test',
  }), /aliases relevant candidate identity/);

  const missingEvaluator = fixture();
  assert.throws(() => generatePrOutcome({
    ...missingEvaluator, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: missingEvaluator.head,
    workflowRunId: '12345', jobResults: successfulJobs, prSubmitterIdentity: identities.prSubmitterIdentity,
  }), /deterministic evaluator identity/);
});

test('base-to-head provenance includes every unique author and committer identity', () => {
  const value = fixture();
  commit(value.root, 'alice.txt', 'alice\n', 'alice', {
    authorName: 'Alice', authorEmail: 'alice@example.invalid',
    committerName: 'Release Builder', committerEmail: 'builder@example.invalid',
  });
  commit(value.root, 'bob.txt', 'bob\n', 'bob', {
    authorName: 'Bob', authorEmail: 'bob@example.invalid',
    committerName: 'Release Builder', committerEmail: 'builder@example.invalid',
  });
  value.head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: value.root, encoding: 'utf8' }).trim();
  value.tree = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: value.root, encoding: 'utf8' }).trim();
  for (const name of reportNames) {
    const report = path.join(value.evidenceRoot, name.replace('.json', ''), name);
    fs.writeFileSync(report, JSON.stringify({ok: true, actual_sha: value.head, actual_tree: value.tree}));
  }
  const result = generatePrOutcome({ ...value, ...identities, expectedSha: value.head, runId: 'run_governance_fixture_001', branch: 'codex/test', workflowRunId: '12345', jobResults: successfulJobs });
  const evidence = JSON.parse(fs.readFileSync(path.join(value.outputDirectory, 'pr-outcome-evidence.json')));
  assert.equal(evidence.independence.candidate_provenance.commit_count, 3);
  assert.deepEqual(evidence.independence.candidate_provenance.identities.map((entry) => entry.email), [
    'alice@example.invalid', 'bob@example.invalid', 'fixture-author@example.invalid',
    'fixture-committer@example.invalid', 'builder@example.invalid',
  ]);
  assert.equal(result.packet.evaluation_summary.independent_review_satisfied, true);
});

test('missing, invalid, non-ancestor, empty-range, or wrong-head provenance fails closed', () => {
  const missing = fixture();
  assert.throws(() => generatePrOutcome({ ...missing, ...identities, baseSha: undefined, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: missing.head, workflowRunId: '12345', jobResults: successfulJobs }), /full base SHA/);

  const invalid = fixture();
  assert.throws(() => generatePrOutcome({ ...invalid, ...identities, baseSha: 'f'.repeat(40), runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: invalid.head, workflowRunId: '12345', jobResults: successfulJobs }), /not an available commit/);

  const nonAncestor = fixture();
  const unrelated = execFileSync('git', ['commit-tree', `${nonAncestor.head}^{tree}`, '-m', 'unrelated'], {
    cwd: nonAncestor.root,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Unrelated', GIT_AUTHOR_EMAIL: 'unrelated@example.invalid',
      GIT_COMMITTER_NAME: 'Unrelated', GIT_COMMITTER_EMAIL: 'unrelated@example.invalid',
    },
  }).trim();
  assert.throws(() => generatePrOutcome({ ...nonAncestor, ...identities, baseSha: unrelated, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: nonAncestor.head, workflowRunId: '12345', jobResults: successfulJobs }), /not an ancestor/);

  const empty = fixture();
  assert.throws(() => generatePrOutcome({ ...empty, ...identities, baseSha: empty.head, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: empty.head, workflowRunId: '12345', jobResults: successfulJobs }), /provenance is empty/);

  const wrongHead = fixture();
  assert.throws(() => generatePrOutcome({ ...wrongHead, ...identities, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: 'e'.repeat(40), workflowRunId: '12345', jobResults: successfulJobs }), /requires exact head/);
});

test('missing, duplicate, stale, or dirty same-run inputs fail closed', () => {
  const missing = fixture();
  fs.rmSync(path.dirname(path.join(missing.evidenceRoot, 'agent-runner-exact-head', 'agent-runner-exact-head.json')), { recursive: true });
  assert.throws(() => generatePrOutcome({ ...missing, ...identities, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: missing.head, workflowRunId: '1', jobResults: successfulJobs }), /exactly one same-run/);

  const duplicate = fixture();
  fs.mkdirSync(path.join(duplicate.evidenceRoot, 'duplicate'), { recursive: true });
  fs.copyFileSync(path.join(duplicate.evidenceRoot, 'agent-contract-exact-head', 'agent-contract-exact-head.json'), path.join(duplicate.evidenceRoot, 'duplicate', 'agent-contract-exact-head.json'));
  assert.throws(() => generatePrOutcome({ ...duplicate, ...identities, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: duplicate.head, workflowRunId: '2', jobResults: successfulJobs }), /found 2/);

  const stale = fixture();
  const stalePath = path.join(stale.evidenceRoot, 'application-exact-head', 'application-exact-head.json');
  fs.writeFileSync(stalePath, JSON.stringify({ ok: true, actual_sha: 'f'.repeat(40), actual_tree: stale.tree }));
  assert.throws(() => generatePrOutcome({ ...stale, ...identities, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: stale.head, workflowRunId: '3', jobResults: successfulJobs }), /does not prove exact candidate/);

  const dirty = fixture();
  fs.writeFileSync(path.join(dirty.root, 'untracked.txt'), 'dirty\n');
  assert.throws(() => generatePrOutcome({ ...dirty, ...identities, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: dirty.head, workflowRunId: '4', jobResults: successfulJobs }), /candidate is dirty/);
});

test('missing, skipped, or failed required job results cannot generate an outcome', () => {
  for (const result of [undefined, 'skipped', 'failure']) {
    const value = fixture();
    const jobResults = { ...successfulJobs };
    if (result === undefined) delete jobResults['agent-runner']; else jobResults['agent-runner'] = result;
    assert.throws(() => generatePrOutcome({ ...value, ...identities, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: value.head, workflowRunId: '5', jobResults }), /agent-runner=success/);
  }
});
