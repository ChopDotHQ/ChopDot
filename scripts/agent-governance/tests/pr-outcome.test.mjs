import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { exemptionIneligiblePaths, generatePrOutcome } from '../generate-pr-outcome.mjs';
import { digestContract, loadLoopProfile } from '../../agent-system/contract.mjs';
import { validateOutcomePacket } from '../../agent-system/outcome.mjs';
import { validateAgentContract, validateContractProfileAlignment } from '../../agent-system/validate.mjs';
import { validateGovernanceInstance } from '../../agent-system/schema.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const reportNames = [
  'agent-contract-exact-head.json', 'agent-runner-exact-head.json',
  'knowledge-adapters-exact-head.json', 'repo-governance-exact-head.json',
  'application-exact-head.json', 'application-browser-exact-head.json',
  'secrets-scan-exact-head.json',
];
const requiredJobs = [
  'agent-contract', 'agent-runner', 'knowledge-adapters', 'repo-governance',
  'application-fast-assurance', 'application-browser-assurance', 'secrets-scan',
];
const successfulJobs = Object.fromEntries(requiredJobs.map((job) => [job, 'success']));
function unsignedFixtureToken() {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'RS256', kid: 'fixture' })}.${encode({
    iss: 'https://token.actions.githubusercontent.com', aud: 'chopdot-agent-evaluation',
    repository: 'ChopDotHQ/ChopDot', run_id: '12345', run_attempt: '1', check_run_id: '67890',
    ref: 'refs/pull/1/merge', sha: 'a'.repeat(40), environment: 'pr-outcome', sub: 'repo:ChopDotHQ/ChopDot:pull_request',
    event_name: 'pull_request', workflow_ref: 'ChopDotHQ/ChopDot/.github/workflows/agent-governance.yml@refs/pull/1/merge',
    actor: 'fixture-submitter', iat: 1787832000, exp: 1787832600,
  })}.Zml4dHVyZS1zaWduYXR1cmU`;
}
const identities = {
  prSubmitterIdentity: 'fixture-submitter',
  prSubmitterSource: 'pull_request.user.login',
  evaluatorIdentity: 'github-actions:pr-outcome:12345:1',
  evaluatorSource: 'github-actions-run-and-job',
  loopProfile: 'implementation',
  executionToken: unsignedFixtureToken(),
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

function fixture({ candidatePaths = ['candidate.txt'] } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chopdot-pr-outcome-root-'));
  execFileSync('git', ['init', '-q', '-b', 'codex/test'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'fixture@example.invalid'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Fixture'], { cwd: root });
  fs.mkdirSync(path.join(root, 'scripts', 'agent-system'), { recursive: true });
  fs.mkdirSync(path.join(root, 'governance', 'agent-system', 'loops'), { recursive: true });
  fs.copyFileSync(
    path.join(repositoryRoot, 'governance/agent-system/loops/implementation.v1.json'),
    path.join(root, 'governance/agent-system/loops/implementation.v1.json'),
  );
  fs.writeFileSync(path.join(root, 'scripts', 'agent-system', 'cli.mjs'), 'process.exit(0);\n');
  fs.writeFileSync(path.join(root, 'PRODUCT_TRUTH.md'), '# Fixture product truth\n');
  fs.writeFileSync(path.join(root, '.gitignore'), 'output/\n');
  execFileSync('git', ['add', 'scripts/agent-system/cli.mjs', 'governance/agent-system/loops/implementation.v1.json', 'PRODUCT_TRUTH.md', '.gitignore'], { cwd: root });
  execFileSync('git', ['commit', '-qm', 'runner fixture'], { cwd: root });
  commit(root, 'base.txt', 'base\n', 'base');
  const baseSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  for (const relative of candidatePaths) {
    fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    commit(root, relative, `candidate ${relative}\n`, `candidate ${relative}`);
  }
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const tree = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: root, encoding: 'utf8' }).trim();
  const evidenceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'chopdot-pr-outcome-input-'));
  for (const name of reportNames) {
    const directory = path.join(evidenceRoot, name.replace('.json', ''));
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, name), JSON.stringify({ ok: true, actual_sha: head, actual_tree: tree }));
  }
  return { root, head, tree, baseSha, evidenceRoot, outputDirectory: path.join(fs.realpathSync(root), 'output', 'ci-pr-outcome') };
}

test('same-run exact-head reports generate a valid external OutcomePacketV1', async () => {
  const value = fixture();
  const result = await generatePrOutcome({ ...value, ...identities, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: value.head, workflowRunId: '12345', jobResults: successfulJobs });
  assert.equal(result.ok, true);
  assert.equal(result.exact_counts.total, 7);
  assert.equal(result.exact_counts.passed, 7);
  assert.equal(validateOutcomePacket(result.packet).valid, true);
  assert.equal(result.packet.ending_head, value.head);
  assert.equal(result.packet.ending_tree, value.tree);
  assert.equal(result.packet.starting_head, value.head);
  assert.equal(result.packet.starting_tree, value.tree);
  assert.equal(fs.realpathSync(result.packet.root), fs.realpathSync(value.root));
  assert.equal(result.packet.branch, 'codex/test');
  assert.equal(result.packet.evaluation_summary.independent_review_satisfied, true);
  for (const artifact of result.packet.artifacts) {
    assert.equal(path.isAbsolute(artifact.path), false);
    assert.equal(fs.existsSync(path.join(value.root, artifact.path)), true, artifact.path);
  }
  const contract = JSON.parse(fs.readFileSync(result.contract_path));
  assert.equal(validateAgentContract(contract, { expectedRoot: fs.realpathSync(value.root) }).valid, true);
  assert.equal(digestContract(contract), result.packet.contract_digest);
  assert.equal(contract.loop_profile.id, 'implementation');
  assert.equal(validateContractProfileAlignment(contract, loadLoopProfile('implementation')).valid, true);
  assert.deepEqual(result.packet.requirements.map((entry) => entry.requirement_id), [
    'IMPL-REQUIREMENTS', 'IMPL-FOCUSED', 'IMPL-PRODUCTION', 'IMPL-SCOPE', 'IMPL-CRITICAL',
  ]);
  const evidence = JSON.parse(fs.readFileSync(path.join(value.outputDirectory, 'pr-outcome-evidence.json')));
  assert.deepEqual(evidence.job_results, successfulJobs);
  assert.deepEqual(evidence.measurements.production_entrypoint_status.source_jobs, ['application-browser-assurance']);
  assert.equal(evidence.independence.candidate_provenance.base_sha, value.baseSha);
  assert.equal(evidence.independence.candidate_provenance.head_sha, value.head);
  assert.equal(evidence.independence.candidate_provenance.commit_count, 1);
  assert.deepEqual(evidence.pull_request_range, { base_sha: value.baseSha, head_sha: value.head, changed_paths: ['candidate.txt'] });
  assert.match(evidence.acceptance_contract.purpose, /not original task-creation proof/);
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
  const evaluation = JSON.parse(fs.readFileSync(path.resolve(value.root, result.packet.evaluation_index[0].path)));
  assert.equal(validateGovernanceInstance(evaluation, 'evaluation.v1.schema.json').valid, true);
  assert.equal(evaluation.evaluator.id, identities.evaluatorIdentity);
  assert.equal(evaluation.independence, 'different_actor');
  const executionAttestation = JSON.parse(fs.readFileSync(result.execution_attestation_path));
  assert.equal(evaluation.started_at, executionAttestation.evaluated_at);
  assert.equal(evaluation.finished_at, executionAttestation.evaluated_at);
  assert.equal(result.packet.evaluation_index.length, 1);
  assert.equal(fs.existsSync(result.runner_provenance_path), true);
  assert.equal(fs.existsSync(path.join(result.run_directory, 'events.jsonl')), true);
  const runnerProvenance = JSON.parse(fs.readFileSync(result.runner_provenance_path));
  assert.equal(result.packet.runner_provenance.provenance_digest, runnerProvenance.provenance_digest);
  const events = fs.readFileSync(path.join(result.run_directory, 'events.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(events.slice(0, 3).map((event) => event.event_type), ['declared', 'preflight_passed', 'work_started']);
  assert.equal(events.some((event) => event.event_type === 'evaluation_started'), true);
  assert.equal(events.some((event) => event.event_type === 'evaluation_finished'), true);
  assert.equal(events.at(-1).payload.terminal_state, 'succeeded');
  assert.equal(evaluation.evaluation_id.startsWith('evaluation_ci_'), false);
  assert.equal(executionAttestation.provider, 'github-actions-oidc');
  assert.match(result.packet.limitations[0], /does not prove human or CODEOWNER review/);
});

test('PR CI does not fabricate a specialized loop contract from generic checks', async () => {
  const value = fixture();
  await assert.rejects(() => generatePrOutcome({
    ...value, ...identities, loopProfile: 'security-authority',
    runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: value.head,
    workflowRunId: '12345', jobResults: successfulJobs,
  }), /supports only the implementation profile/);
});

test('missing submitter or evaluator identities and relevant aliases fail closed', async () => {
  const missing = fixture();
  await assert.rejects(() => generatePrOutcome({
    ...missing, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: missing.head,
    workflowRunId: '12345', jobResults: successfulJobs, evaluatorIdentity: identities.evaluatorIdentity, loopProfile: identities.loopProfile,
  }), /PR submitter identity/);

  const same = fixture();
  await assert.rejects(() => generatePrOutcome({
    ...same, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: same.head,
    workflowRunId: '12345', jobResults: successfulJobs, prSubmitterIdentity: 'Same-Actor',
    evaluatorIdentity: 'same-actor', evaluatorSource: 'test', loopProfile: identities.loopProfile,
  }), /aliases relevant candidate identity/);

  const authorAlias = fixture();
  await assert.rejects(() => generatePrOutcome({
    ...authorAlias, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: authorAlias.head,
    workflowRunId: '12345', jobResults: successfulJobs, prSubmitterIdentity: 'other-submitter',
    evaluatorIdentity: 'FIXTURE-AUTHOR@EXAMPLE.INVALID', evaluatorSource: 'test', loopProfile: identities.loopProfile,
  }), /aliases relevant candidate identity/);

  const missingEvaluator = fixture();
  await assert.rejects(() => generatePrOutcome({
    ...missingEvaluator, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: missingEvaluator.head,
    workflowRunId: '12345', jobResults: successfulJobs, prSubmitterIdentity: identities.prSubmitterIdentity, loopProfile: identities.loopProfile,
  }), /deterministic evaluator identity/);
});

test('base-to-head provenance includes every unique author and committer identity', async () => {
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
  const result = await generatePrOutcome({ ...value, ...identities, expectedSha: value.head, runId: 'run_governance_fixture_001', branch: 'codex/test', workflowRunId: '12345', jobResults: successfulJobs });
  const evidence = JSON.parse(fs.readFileSync(path.join(value.outputDirectory, 'pr-outcome-evidence.json')));
  assert.equal(evidence.independence.candidate_provenance.commit_count, 3);
  assert.deepEqual(evidence.independence.candidate_provenance.identities.map((entry) => entry.email), [
    'alice@example.invalid', 'bob@example.invalid', 'fixture-author@example.invalid',
    'fixture-committer@example.invalid', 'builder@example.invalid',
  ]);
  assert.equal(result.packet.evaluation_summary.independent_review_satisfied, true);
});

test('missing, invalid, non-ancestor, empty-range, or wrong-head provenance fails closed', async () => {
  const missing = fixture();
  await assert.rejects(() => generatePrOutcome({ ...missing, ...identities, baseSha: undefined, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: missing.head, workflowRunId: '12345', jobResults: successfulJobs }), /full base SHA/);

  const invalid = fixture();
  await assert.rejects(() => generatePrOutcome({ ...invalid, ...identities, baseSha: 'f'.repeat(40), runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: invalid.head, workflowRunId: '12345', jobResults: successfulJobs }), /not an available commit/);

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
  await assert.rejects(() => generatePrOutcome({ ...nonAncestor, ...identities, baseSha: unrelated, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: nonAncestor.head, workflowRunId: '12345', jobResults: successfulJobs }), /not an ancestor/);

  const empty = fixture();
  await assert.rejects(() => generatePrOutcome({ ...empty, ...identities, baseSha: empty.head, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: empty.head, workflowRunId: '12345', jobResults: successfulJobs }), /provenance is empty/);

  const wrongHead = fixture();
  await assert.rejects(() => generatePrOutcome({ ...wrongHead, ...identities, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: 'e'.repeat(40), workflowRunId: '12345', jobResults: successfulJobs }), /requires exact head/);
});

test('missing, duplicate, stale, or dirty same-run inputs fail closed', async () => {
  const missing = fixture();
  fs.rmSync(path.dirname(path.join(missing.evidenceRoot, 'agent-runner-exact-head', 'agent-runner-exact-head.json')), { recursive: true });
  await assert.rejects(() => generatePrOutcome({ ...missing, ...identities, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: missing.head, workflowRunId: '1', jobResults: successfulJobs }), /exactly one same-run/);

  const duplicate = fixture();
  fs.mkdirSync(path.join(duplicate.evidenceRoot, 'duplicate'), { recursive: true });
  fs.copyFileSync(path.join(duplicate.evidenceRoot, 'agent-contract-exact-head', 'agent-contract-exact-head.json'), path.join(duplicate.evidenceRoot, 'duplicate', 'agent-contract-exact-head.json'));
  await assert.rejects(() => generatePrOutcome({ ...duplicate, ...identities, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: duplicate.head, workflowRunId: '2', jobResults: successfulJobs }), /found 2/);

  const stale = fixture();
  const stalePath = path.join(stale.evidenceRoot, 'application-exact-head', 'application-exact-head.json');
  fs.writeFileSync(stalePath, JSON.stringify({ ok: true, actual_sha: 'f'.repeat(40), actual_tree: stale.tree }));
  await assert.rejects(() => generatePrOutcome({ ...stale, ...identities, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: stale.head, workflowRunId: '3', jobResults: successfulJobs }), /does not prove exact candidate/);

  const dirty = fixture();
  fs.writeFileSync(path.join(dirty.root, 'untracked.txt'), 'dirty\n');
  await assert.rejects(() => generatePrOutcome({ ...dirty, ...identities, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: dirty.head, workflowRunId: '4', jobResults: successfulJobs }), /candidate is dirty/);
});

test('missing, skipped, or failed browser and secrets job results cannot generate an outcome', async () => {
  for (const job of ['application-browser-assurance', 'secrets-scan']) {
    for (const result of [undefined, 'skipped', 'failure']) {
      const value = fixture();
      const jobResults = { ...successfulJobs };
      if (result === undefined) delete jobResults[job]; else jobResults[job] = result;
      await assert.rejects(
        () => generatePrOutcome({ ...value, ...identities, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: value.head, workflowRunId: '5', jobResults }),
        new RegExp(`${job}=success`),
      );
    }
  }
});

test('missing or stale browser and secrets exact-head reports fail closed', async () => {
  for (const reportName of ['application-browser-exact-head.json', 'secrets-scan-exact-head.json']) {
    const missing = fixture();
    fs.rmSync(path.dirname(path.join(missing.evidenceRoot, reportName.replace('.json', ''), reportName)), { recursive: true });
    await assert.rejects(
      () => generatePrOutcome({ ...missing, ...identities, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: missing.head, workflowRunId: '6', jobResults: successfulJobs }),
      /exactly one same-run/,
    );

    const stale = fixture();
    const stalePath = path.join(stale.evidenceRoot, reportName.replace('.json', ''), reportName);
    fs.writeFileSync(stalePath, JSON.stringify({ ok: true, actual_sha: 'f'.repeat(40), actual_tree: stale.tree }));
    await assert.rejects(
      () => generatePrOutcome({ ...stale, ...identities, runId: 'run_governance_fixture_001', branch: 'codex/test', expectedSha: stale.head, workflowRunId: '7', jobResults: successfulJobs }),
      /does not prove exact candidate/,
    );
  }
});

// --- deterministic exemption -------------------------------------------------
// A deterministic-exemption PR declares that no agent loop ran. It therefore has
// no run_id and no OutcomePacketV1, which the implementation path requires.

function exemptionBody(overrides = {}) {
  const values = {
    base: 'a'.repeat(40),
    head: 'CURRENT_PR_HEAD',
    profile: 'deterministic exemption',
    runId: 'None — deterministic exemption; no agent loop run',
    decision: 'READY FOR INDEPENDENT VERIFY',
    ...overrides,
  };
  return `## Summary

This bounded documentation change removes plan files that no longer have any consumer in the repository tree.

## Outcome traceability

- **Exact base SHA:** \`${values.base}\`
- **Exact head SHA:** \`${values.head}\`
- **Change class:** documentation
- **Agent loop profile:** ${values.profile}
- **Run ID:** ${values.runId}
- **OutcomePacketV1 path and digest:** \`CI_GENERATED\`
- **Terminal state:** succeeded
- **Requirement / assertion IDs:** NONE
- **Affected product card IDs:** NONE
- **Affected invariant IDs:** NONE
- **ADRs added or updated:** NONE
- **Investigations added or updated:** NONE

## Expected outcome and artifact

- **Artifact contract:** none; no artifact is produced or promoted by this change
- **Objective expected outcome:** the named files are removed and no reference resolves to them
- **Pass/fail assertions:** a repository-wide reference scan over every deleted path returns zero hits
- **Required real-environment observations:** none; the change has no runtime surface
- **Known limitations:** a textual scan cannot prove that no external system referenced these paths

## Authority and effect analysis

This change deletes documentation only. It does not create or alter participant, product-law, money, membership, recovery, or release authority, and it dispatches no external effect. All permissions and participant authorities remain unchanged.

## Failure and recovery analysis

The only failure mode is a missed consumer, which surfaces as a broken reference and is fully recovered by reverting the single commit. Cancellation, retry, and duplicate submission have no effect beyond the push itself.

## Claim-to-evidence table

| Requirement or assertion | Claimed outcome | Evidence level | Exact command, artifact, or readback | Literal candidate / artifact identity | Result or gap |
|---|---|---|---|---|---|
| No reference resolves to a deleted path | zero dangling references | exact-candidate | git grep over every deleted path | CURRENT_PR_HEAD | pass |

## Independent evaluation

- **Evaluator / reviewer identity:** deterministic fixture evaluator
- **Independence from author:** deterministic-only
- **Evaluation packet / artifact:** this exact test output
- **Pass / fail / skip counts:** 1 / 0 / 0
- **Hard failures:** none
- **Repair iterations and changed hypotheses:** none

## Side investigations

\`None — no trigger applies\`

## Provider independence and privacy

- [x]
- [x]
- [x]
- [x]
- [x]

## Verification

${Array.from({ length: 10 }, () => '- [x]').join('\n')}

## Product and release state

- **Product card status:** unchanged
- **implemented:** true
- **tested:** true
- **committed:** true
- **pushed:** true
- **candidate_built:** false
- **staged:** false
- **promoted:** false
- **reachable:** false
- **user_owned:** false
- **user_proven:** false
- **knowledge_verified:** false
- **ci_enforced:** false
- **branch_protected:** false

Requested decision: ${values.decision}

Why the evidence permits that decision: the deletion set is bounded and every removed path is proven to have no consumer.

## Remaining risk and next bounded proof

A textual reference scan cannot detect a dynamically constructed path. Next bounded proof: one hosted CI run on this exact head.
`;
}

const catalog = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'scripts/agent-governance/catalog/invariants.v1.json')));
const evidencePolicy = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'governance/agent-system/policies/evidence-levels.json')));

function exemptionInputs(value, overrides = {}) {
  return {
    ...value,
    runId: null,
    branch: 'codex/test',
    headBranch: 'codex/test',
    expectedSha: value.head,
    workflowRunId: '12345',
    jobResults: successfulJobs,
    loopProfile: 'deterministic exemption',
    evaluatorIdentity: 'github-actions:pr-outcome:12345:1',
    evaluatorSource: 'github-actions-run-and-job',
    prSubmitterIdentity: 'fixture-submitter',
    catalog,
    evidencePolicy,
    prBody: exemptionBody({ base: value.baseSha }),
    ...overrides,
  };
}

const batchAShapedPaths = [
  'plans/2026-07-14-dot-host-browser-polish.md',
  'docs/superpowers/plans/2026-08-27-product-prioritization-repair.md',
];

test('a deterministic exemption concludes successfully without a run ID or an outcome packet', async () => {
  const value = fixture({ candidatePaths: batchAShapedPaths });
  const result = await generatePrOutcome(exemptionInputs(value));
  assert.equal(result.ok, true);
  assert.equal(result.deterministic_exemption, true);
  assert.equal(result.loop_profile, 'deterministic exemption');
  assert.equal(result.result, 'deterministic exemption / no agent outcome required');
  assert.deepEqual(result.job_results, successfulJobs);
  assert.equal(result.pr_description_validation.ok, true);
  // No fabricated agent run: no run_id, and none of the packet machinery on disk.
  const record = JSON.parse(fs.readFileSync(result.output_path));
  assert.equal(record.run_id, null);
  assert.equal(record.candidate.commit, value.head);
  assert.equal(fs.existsSync(path.join(value.outputDirectory, 'outcome.json')), false);
  assert.equal(fs.existsSync(path.join(value.outputDirectory, 'acceptance-contract.json')), false);
  assert.equal(fs.existsSync(path.join(value.outputDirectory, 'validation.md')), true);
  assert.match(record.limitations[0], /is not an OutcomePacketV1 and proves no agent run/);
  // Scope is derived from the range and recorded, not taken from the description.
  assert.deepEqual([...record.pull_request_range.changed_paths].sort(), [...batchAShapedPaths].sort());
  assert.equal(record.scope.changed_path_count, batchAShapedPaths.length);
  assert.deepEqual(record.scope.ineligible_paths, []);
  assert.equal(record.pull_request_range.base_sha, value.baseSha);
});

test('the implementation profile still requires a schema-compatible run ID', async () => {
  const value = fixture();
  await assert.rejects(
    generatePrOutcome({ ...value, ...identities, runId: null, branch: 'codex/test', expectedSha: value.head, workflowRunId: '12345', jobResults: successfulJobs }),
    /PR outcome requires a schema-compatible run_id/,
  );
  await assert.rejects(
    generatePrOutcome({ ...value, ...identities, runId: 'None — deterministic exemption', branch: 'codex/test', expectedSha: value.head, workflowRunId: '12345', jobResults: successfulJobs }),
    /PR outcome requires a schema-compatible run_id/,
  );
});

test('an invalid deterministic exemption does not get a free pass', async () => {
  const failingJobs = { ...successfulJobs, 'application-browser-assurance': 'failure' };
  await assert.rejects(
    generatePrOutcome(exemptionInputs(fixture({ candidatePaths: batchAShapedPaths }), { jobResults: failingJobs })),
    /PR outcome requires same-run application-browser-assurance=success/,
  );
  const value = fixture({ candidatePaths: batchAShapedPaths });
  await assert.rejects(
    generatePrOutcome(exemptionInputs(value, { prBody: exemptionBody({ base: value.baseSha, runId: 'run_not_an_exemption_001' }) })),
    /Deterministic exemption requires a valid PR description/,
  );
  const other = fixture({ candidatePaths: batchAShapedPaths });
  await assert.rejects(
    generatePrOutcome(exemptionInputs(other, { prBody: 'not a governed pull request description' })),
    /Deterministic exemption requires a valid PR description/,
  );
});

// The exemption skips the packet-dependent acceptance steps, so eligibility is bound to
// the authenticated range. A PR cannot talk its way into it with its description.
test('a deterministic exemption is bound to the real candidate scope and fails closed off it', async () => {
  const ineligible = {
    'application code': ['src/payments/settle.ts'],
    'server code': ['server/payment-intents/index.ts'],
    'contract code': ['contracts/recovery-head-index/src/Index.sol'],
    'workflow': ['.github/workflows/agent-governance.yml'],
    'governance runtime': ['scripts/agent-governance/validate-pr.mjs'],
    'governance policy': ['governance/agent-system/policies/evidence-levels.json'],
    'governance test (the enforcement layer)': ['scripts/agent-governance/tests/steering-surfaces.test.mjs'],
    'governance test alongside eligible documentation': [...batchAShapedPaths, 'scripts/agent-governance/tests/pr-outcome.test.mjs'],
    'runtime manifest': ['package.json'],
    'product law': ['PRODUCT_TRUTH.md'],
    'authority record': ['product/context-authority.json'],
    'eligible paths plus one ineligible path': [...batchAShapedPaths, 'src/state/store.ts'],
  };
  for (const [label, candidatePaths] of Object.entries(ineligible)) {
    const value = fixture({ candidatePaths });
    await assert.rejects(
      generatePrOutcome(exemptionInputs(value)),
      /Deterministic exemption is limited to plan documents/,
      label,
    );
  }
});

test('a deterministic exemption cannot derive scope without an authenticated base', async () => {
  const value = fixture({ candidatePaths: batchAShapedPaths });
  await assert.rejects(
    generatePrOutcome(exemptionInputs(value, { baseSha: null })),
    /Deterministic exemption requires an exact base SHA/,
  );
  await assert.rejects(
    generatePrOutcome(exemptionInputs(value, { baseSha: 'not-a-sha' })),
    /Deterministic exemption requires an exact base SHA/,
  );
});

test('the exemption path allowlist rejects anything it does not name', () => {
  assert.deepEqual(exemptionIneligiblePaths(batchAShapedPaths), []);
  assert.deepEqual(
    exemptionIneligiblePaths(['plans/nested/deep.md', 'docs/other/plans/x.md', 'scripts/agent-governance/validate-workflow.mjs']),
    ['plans/nested/deep.md', 'docs/other/plans/x.md', 'scripts/agent-governance/validate-workflow.mjs'],
  );
  // The enforcement layer is never inside the exemption: no path under the governance
  // test directory is eligible, on its own or beside eligible documentation.
  for (const candidate of [
    'scripts/agent-governance/tests/steering-surfaces.test.mjs',
    'scripts/agent-governance/tests/pr-outcome.test.mjs',
    'scripts/agent-governance/tests/helper.mjs',
    'scripts/agent-system/tests/core-contract.test.mjs',
  ]) {
    assert.deepEqual(exemptionIneligiblePaths([candidate]), [candidate], candidate);
    assert.deepEqual(exemptionIneligiblePaths([...batchAShapedPaths, candidate]), [candidate], candidate);
  }
});
