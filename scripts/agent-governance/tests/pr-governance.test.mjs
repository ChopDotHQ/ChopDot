import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { validatePullRequestBody } from '../validate-pr.mjs';
import { digestObject, sha256File } from '../lib.mjs';
import { sha256 } from '../../agent-system/core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'scripts/agent-governance/catalog/invariants.v1.json')));
const evidencePolicy = JSON.parse(fs.readFileSync(path.join(root, 'governance/agent-system/policies/evidence-levels.json')));
const base = 'a'.repeat(40);
const head = 'b'.repeat(40);

function outcomeFixture(mutator = () => {}) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'chopdot-pr-governance-'));
  fs.mkdirSync(path.join(fixtureRoot, 'evidence'), { recursive: true });
  fs.writeFileSync(path.join(fixtureRoot, 'evidence/proof.json'), '{"proof":true}\n');
  const proofDigest = sha256(`evidence/proof.json\0${sha256File(path.join(fixtureRoot, 'evidence/proof.json'))}`);
  const evaluationPath = path.join(fixtureRoot, 'evidence/evaluation.json');
  fs.writeFileSync(evaluationPath, `${JSON.stringify({ evaluation: true })}\n`);
  const evaluationDigest = sha256(`evidence/evaluation.json\0${sha256File(evaluationPath)}`);
  const packet = {
    outcome_version: '1.0.0', outcome_id: 'outcome_governance_fixture', run_id: 'run_governance_fixture_001',
    contract_digest: 'a'.repeat(64), root: '/exact/source/worktree', branch: 'codex/chopdot-v1-launch',
    starting_head: head, starting_tree: 'd'.repeat(40), ending_head: head, ending_tree: 'd'.repeat(40), git_status: [],
    requirements: [{ requirement_id: 'PAOS-W7', status: 'accepted', evaluation_ids: ['evaluation_governance_fixture'] }],
    artifacts: [
      { artifact_id: 'artifact_governance_fixture', path: 'evidence/proof.json', sha256: proofDigest },
      { artifact_id: 'artifact_governance_evaluation', path: 'evidence/evaluation.json', sha256: evaluationDigest },
    ],
    evaluation_summary: { evaluation_ids: ['evaluation_governance_fixture'], total_assertions: 1, passed: 1, failed: 0, blocked: 0, hard_failures: [], score: 1, threshold: 0.9, independent_review_satisfied: true },
    runner_provenance: { provenance_id: 'runner_provenance_governance_fixture', provenance_digest: '1'.repeat(64), ledger_head_digest: '2'.repeat(64), event_count: 1, evaluation_digest: '3'.repeat(64) },
    evaluation_index: [{ artifact_id: 'artifact_governance_evaluation', path: 'evidence/evaluation.json', sha256: evaluationDigest }],
    effects: [], approvals: [], evidence_index: [
      { artifact_id: 'artifact_governance_fixture', path: 'evidence/proof.json', sha256: proofDigest },
      { artifact_id: 'artifact_governance_evaluation', path: 'evidence/evaluation.json', sha256: evaluationDigest },
    ],
    limitations: [], terminal_state: 'succeeded', knowledge_receipts: [], created_at: '2026-08-26T12:00:00Z',
  };
  mutator(packet, fixtureRoot);
  packet.packet_digest = digestObject(packet);
  fs.mkdirSync(path.join(fixtureRoot, 'artifacts/agentops/outcomes/run_governance_fixture_001'), { recursive: true });
  const outcomePath = path.join(fixtureRoot, 'artifacts/agentops/outcomes/run_governance_fixture_001/outcome.json');
  fs.writeFileSync(outcomePath, `${JSON.stringify(packet)}\n`);
  return { root: fixtureRoot, packet, fileDigest: sha256File(outcomePath) };
}

function ciOutcomeFixture(mutator = () => {}, provenanceMutator = () => {}) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'chopdot-pr-ci-root-'));
  execFileSync('git', ['init', '-q', '-b', 'codex/test'], { cwd: fixtureRoot });
  execFileSync('git', ['config', 'user.email', 'fixture@example.invalid'], { cwd: fixtureRoot });
  execFileSync('git', ['config', 'user.name', 'Fixture'], { cwd: fixtureRoot });
  fs.writeFileSync(path.join(fixtureRoot, 'base.txt'), 'base\n');
  execFileSync('git', ['add', '.'], { cwd: fixtureRoot });
  execFileSync('git', ['commit', '-qm', 'base'], { cwd: fixtureRoot });
  const fixtureBase = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: fixtureRoot, encoding: 'utf8' }).trim();
  fs.writeFileSync(path.join(fixtureRoot, 'candidate.txt'), 'candidate\n');
  execFileSync('git', ['add', '.'], { cwd: fixtureRoot });
  execFileSync('git', ['commit', '-qm', 'candidate'], { cwd: fixtureRoot });
  const fixtureHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: fixtureRoot, encoding: 'utf8' }).trim();
  const fixtureTree = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: fixtureRoot, encoding: 'utf8' }).trim();
  const outputRoot = path.join(fixtureRoot, 'output', 'ci-pr-outcome');
  fs.mkdirSync(outputRoot, { recursive: true });
  const provenance = {
    pr_outcome_evidence_version: '1.0.0',
    candidate: { root: fixtureRoot, branch: 'codex/test', commit: fixtureHead, tree: fixtureTree, git_status: [] },
    pull_request_range: { base_sha: fixtureBase, head_sha: fixtureHead, changed_paths: ['candidate.txt'] },
    acceptance_contract: { purpose: 'post-hoc exact-candidate acceptance verifier; not original task-creation proof' },
  };
  provenanceMutator(provenance);
  fs.writeFileSync(path.join(outputRoot, 'pr-outcome-evidence.json'), `${JSON.stringify(provenance)}\n`);
  const evidenceDigest = sha256(`output/ci-pr-outcome/pr-outcome-evidence.json\0${sha256File(path.join(outputRoot, 'pr-outcome-evidence.json'))}`);
  fs.writeFileSync(path.join(outputRoot, 'pr-outcome-evaluation.json'), '{"evaluation":true}\n');
  const evaluationDigest = sha256(`output/ci-pr-outcome/pr-outcome-evaluation.json\0${sha256File(path.join(outputRoot, 'pr-outcome-evaluation.json'))}`);
  const packet = {
    outcome_version: '1.0.0', outcome_id: 'outcome_ci_fixture', run_id: 'run_governance_fixture_001',
    contract_digest: 'a'.repeat(64), root: fixtureRoot, branch: 'codex/test',
    starting_head: fixtureHead, starting_tree: fixtureTree, ending_head: fixtureHead, ending_tree: fixtureTree, git_status: [],
    requirements: [{ requirement_id: 'PAOS-W7', status: 'accepted', evaluation_ids: ['evaluation_ci_fixture'] }],
    artifacts: [
      { artifact_id: 'artifact_ci_fixture', path: 'output/ci-pr-outcome/pr-outcome-evidence.json', sha256: evidenceDigest },
      { artifact_id: 'artifact_ci_evaluation', path: 'output/ci-pr-outcome/pr-outcome-evaluation.json', sha256: evaluationDigest },
    ],
    evaluation_summary: { evaluation_ids: ['evaluation_ci_fixture'], total_assertions: 1, passed: 1, failed: 0, blocked: 0, hard_failures: [], score: 1, threshold: 1, independent_review_satisfied: true },
    runner_provenance: { provenance_id: 'runner_provenance_ci_fixture', provenance_digest: '4'.repeat(64), ledger_head_digest: '5'.repeat(64), event_count: 1, evaluation_digest: '6'.repeat(64) },
    evaluation_index: [{ artifact_id: 'artifact_ci_evaluation', path: 'output/ci-pr-outcome/pr-outcome-evaluation.json', sha256: evaluationDigest }],
    effects: [], approvals: [], evidence_index: [
      { artifact_id: 'artifact_ci_fixture', path: 'output/ci-pr-outcome/pr-outcome-evidence.json', sha256: evidenceDigest },
      { artifact_id: 'artifact_ci_evaluation', path: 'output/ci-pr-outcome/pr-outcome-evaluation.json', sha256: evaluationDigest },
    ],
    limitations: [], terminal_state: 'succeeded', knowledge_receipts: [], created_at: '2026-08-26T12:00:00Z',
  };
  mutator(packet);
  packet.packet_digest = digestObject(packet);
  const outcomePath = path.join(outputRoot, 'outcome.json');
  fs.writeFileSync(outcomePath, `${JSON.stringify(packet)}\n`);
  return { root: fixtureRoot, packet, outcomePath, base: fixtureBase, head: fixtureHead, tree: fixtureTree };
}

const acceptedOutcome = outcomeFixture();

function body(overrides = {}) {
  const values = {
    base,
    head: 'CURRENT_PR_HEAD',
    invariant: 'EVIDENCE-INV-001',
    evidence: 'unit',
    candidate: 'CURRENT_PR_HEAD',
    providerChecks: '- [x]\n- [x]\n- [x]\n- [x]\n- [x]',
    verificationChecks: Array.from({ length: 10 }, () => '- [x]').join('\n'),
    outcomeDigest: acceptedOutcome.fileDigest,
    outcomeReference: null,
    terminalState: 'succeeded',
    decision: 'ACCEPT WITH CONDITIONS',
    ...overrides,
  };
  return `## Summary

This bounded governance patch makes exact-head and evidence claims mechanically verifiable.

## Outcome traceability

- **Exact base SHA:** \`${values.base}\`
- **Exact head SHA:** \`${values.head}\`
- **Change class:** governance
- **Agent loop profile:** implementation
- **Run ID:** run_governance_fixture_001
- **OutcomePacketV1 path and digest:** ${values.outcomeReference ?? `artifacts/agentops/outcomes/run_governance_fixture_001/outcome.json @ sha256:${values.outcomeDigest}`}
- **Terminal state:** ${values.terminalState}
- **Requirement / assertion IDs:** PAOS-W7
- **Affected product card IDs:** NONE
- **Affected invariant IDs:** ${values.invariant}
- **ADRs added or updated:** NONE
- **Investigations added or updated:** reconciliation

## Expected outcome and artifact

- **Artifact contract:** exact-head workflow and validator source
- **Objective expected outcome:** malformed or stale evidence exits non-zero
- **Pass/fail assertions:** all focused negative fixtures fail and golden fixtures pass
- **Required real-environment observations:** GitHub exact-head run remains pending
- **Known limitations:** repository ruleset readback is still pending

## Authority and effect analysis

This patch changes repository evaluation only. It does not create participant, product-law, money, membership, recovery, or release authority. No external effect is dispatched by the patch; repository setting changes remain approval-gated and require readback.

## Failure and recovery analysis

Wrong roots, stale heads, missing evidence, malformed packets, and unavailable approval records exit non-zero. An interrupted future repository effect must be reconciled before retry.

## Claim-to-evidence table

| Requirement or assertion | Claimed outcome | Evidence level | Exact command, artifact, or readback | Literal candidate / artifact identity | Result or gap |
|---|---|---|---|---|---|
| PAOS-W7 | validator rejects stale evidence | ${values.evidence} | node --test scripts/agent-governance/tests/pr-governance.test.mjs | ${values.candidate} | pass |

## Independent evaluation

- **Evaluator / reviewer identity:** deterministic fixture evaluator
- **Independence from author:** deterministic-only
- **Evaluation packet / artifact:** this exact test output
- **Pass / fail / skip counts:** 1 / 0 / 0
- **Hard failures:** none
- **Repair iterations and changed hypotheses:** none

## Side investigations

The dated PR 14 reconciliation was reviewed; no additional trigger applies to this fixture.

## Provider independence and privacy

${values.providerChecks}

## Verification

${values.verificationChecks}

## Product and release state

- **Product card status:** unchanged
- **implemented:** false
- **tested:** true
- **committed:** false
- **pushed:** false
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

Why the evidence permits that decision: the deterministic validator behavior is proven locally, while GitHub enforcement remains false.

## Remaining risk and next bounded proof

GitHub has not run or enforced these checks. The next bounded proof is a green exact-head pull-request run followed by ruleset API readback.
`;
}

function validate(text, fixture = acceptedOutcome) {
  return validatePullRequestBody({ body: text, catalog, evidencePolicy, root: fixture.root, baseSha: base, headSha: head });
}

test('complete moving PR prose resolves CURRENT_PR_HEAD against the event', () => {
  const result = validate(body());
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.equal(result.summary.claim_rows, 1);
  assert.deepEqual(result.summary.affected_invariants, ['EVIDENCE-INV-001']);
});

test('stale declared and row SHAs fail', () => {
  const result = validate(body({ head: 'd'.repeat(40), candidate: 'e'.repeat(40) }));
  assert.equal(result.ok, false);
  assert.equal(result.errors.filter((error) => error.includes('stale')).length, 2);
});

test('wrong base and unknown invariant fail', () => {
  const result = validate(body({ base: 'f'.repeat(40), invariant: 'UNKNOWN-INV-999' }));
  assert(result.errors.some((error) => error.includes('does not match PR base')));
  assert(result.errors.some((error) => error.includes('Unknown affected invariant')));
});

test('unknown evidence, malformed candidate identity, and unchecked attestations fail', () => {
  const result = validate(body({ evidence: 'independently-verified', candidate: 'latest', providerChecks: '- [x]\n- [ ]\n- [x]\n- [x]\n- [x]' }));
  assert(result.errors.some((error) => error.includes('unknown evidence level')));
  assert(result.errors.some((error) => error.includes('candidate identity must be')));
  assert(result.errors.some((error) => error.includes('All five provider-independence')));
});

test('untouched template body is rejected', () => {
  const template = fs.readFileSync(path.join(root, '.github/pull_request_template.md'), 'utf8');
  const result = validate(template);
  assert.equal(result.ok, false);
  assert(result.errors.length >= 5);
});

test('declared outcome file hash must match the opened packet', () => {
  const result = validate(body({ outcomeDigest: '0'.repeat(64) }));
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('file digest')));
});

test('schema-valid digest recomputation cannot hide failed semantic counts', () => {
  const fixture = outcomeFixture((packet) => { packet.evaluation_summary.passed = 0; });
  const result = validate(body({ outcomeDigest: fixture.fileDigest }), fixture);
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('counts do not sum')));
});

test('outcome run, head, and cited evidence are bound to the PR claim', () => {
  const fixture = outcomeFixture((packet, fixtureRoot) => {
    packet.run_id = 'run_unrelated_fixture_001';
    packet.ending_head = 'f'.repeat(40);
    packet.evidence_index[0].sha256 = '0'.repeat(64);
  });
  const result = validate(body({ outcomeDigest: fixture.fileDigest }), fixture);
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('does not match PR run')));
  assert(result.errors.some((error) => error.includes('does not match PR head')));
  assert(result.errors.some((error) => error.includes('does not match cited artifact aggregate SHA-256')));
});

test('moving succeeded PRs require explicit deferred CI_GENERATED evidence', () => {
  const staticResult = validatePullRequestBody({ body: body(), catalog, evidencePolicy, root: acceptedOutcome.root, baseSha: base, headSha: head, allowCiGenerated: true, requireCiGeneratedOutcome: true });
  assert.equal(staticResult.ok, false);
  assert(staticResult.errors.some((error) => error.includes('must use CI_GENERATED')));
  const deferred = validatePullRequestBody({ body: body({ outcomeReference: 'CI_GENERATED' }), catalog, evidencePolicy, root: acceptedOutcome.root, baseSha: base, headSha: head, allowCiGenerated: true, requireCiGeneratedOutcome: true });
  assert.equal(deferred.ok, true, JSON.stringify(deferred.errors));
});

test('CI_GENERATED is rejected outside moving pull-request validation', () => {
  const result = validate(body({ outcomeReference: 'CI_GENERATED' }));
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('allowed only for moving pull-request')));
});

test('final CI_GENERATED validation binds external packet root branch head and evidence', () => {
  const fixture = ciOutcomeFixture();
  const result = validatePullRequestBody({
    body: body({ outcomeReference: 'CI_GENERATED', base: fixture.base }), catalog, evidencePolicy, root: fixture.root,
    baseSha: fixture.base, headSha: fixture.head, headBranch: 'codex/test', allowCiGenerated: true,
    requireCiGeneratedOutcome: true, ciOutcomePath: fixture.outcomePath,
  });
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.match(result.summary.outcome_file_sha256, /^[0-9a-f]{64}$/);

  const wrong = ciOutcomeFixture((packet) => { packet.branch = 'wrong-branch'; });
  const rejected = validatePullRequestBody({
    body: body({ outcomeReference: 'CI_GENERATED', base: wrong.base }), catalog, evidencePolicy, root: wrong.root,
    baseSha: wrong.base, headSha: wrong.head, headBranch: 'codex/test', allowCiGenerated: true,
    requireCiGeneratedOutcome: true, ciOutcomePath: wrong.outcomePath,
  });
  assert.equal(rejected.ok, false);
  assert(rejected.errors.some((error) => error.includes('does not match PR branch')));

  const wrongTree = ciOutcomeFixture((packet) => { packet.ending_tree = 'f'.repeat(40); });
  const treeRejected = validatePullRequestBody({
    body: body({ outcomeReference: 'CI_GENERATED', base: wrongTree.base }), catalog, evidencePolicy, root: wrongTree.root,
    baseSha: wrongTree.base, headSha: wrongTree.head, headBranch: 'codex/test', allowCiGenerated: true,
    requireCiGeneratedOutcome: true, ciOutcomePath: wrongTree.outcomePath,
  });
  assert.equal(treeRejected.ok, false);
  assert(treeRejected.errors.some((error) => error.includes('ending tree to exact candidate')));

  const dirtyPacket = ciOutcomeFixture((packet) => { packet.git_status = [' M candidate.txt']; });
  const dirtyRejected = validatePullRequestBody({
    body: body({ outcomeReference: 'CI_GENERATED', base: dirtyPacket.base }), catalog, evidencePolicy, root: dirtyPacket.root,
    baseSha: dirtyPacket.base, headSha: dirtyPacket.head, headBranch: 'codex/test', allowCiGenerated: true,
    requireCiGeneratedOutcome: true, ciOutcomePath: dirtyPacket.outcomePath,
  });
  assert.equal(dirtyRejected.ok, false);
  assert(dirtyRejected.errors.some((error) => error.includes('declare a clean candidate')));

  const staleStart = ciOutcomeFixture((packet) => { packet.starting_head = packet.ending_head.replace(/^./u, packet.ending_head[0] === 'f' ? 'e' : 'f'); });
  const staleStartRejected = validatePullRequestBody({
    body: body({ outcomeReference: 'CI_GENERATED', base: staleStart.base }), catalog, evidencePolicy, root: staleStart.root,
    baseSha: staleStart.base, headSha: staleStart.head, headBranch: 'codex/test', allowCiGenerated: true,
    requireCiGeneratedOutcome: true, ciOutcomePath: staleStart.outcomePath,
  });
  assert(staleStartRejected.errors.some((error) => error.includes('post-hoc OutcomePacketV1 must bind starting head')));

  for (const [label, mutate, fragment] of [
    ['base', (provenance) => { provenance.pull_request_range.base_sha = 'f'.repeat(40); }, 'base SHA'],
    ['head', (provenance) => { provenance.pull_request_range.head_sha = 'f'.repeat(40); }, 'head SHA'],
    ['paths', (provenance) => { provenance.pull_request_range.changed_paths = []; }, 'changed paths'],
    ['purpose', (provenance) => { provenance.acceptance_contract.purpose = 'ordinary implementation'; }, 'post-hoc exact-candidate'],
  ]) {
    const hostile = ciOutcomeFixture(() => {}, mutate);
    const hostileResult = validatePullRequestBody({
      body: body({ outcomeReference: 'CI_GENERATED', base: hostile.base }), catalog, evidencePolicy, root: hostile.root,
      baseSha: hostile.base, headSha: hostile.head, headBranch: 'codex/test', allowCiGenerated: true,
      requireCiGeneratedOutcome: true, ciOutcomePath: hostile.outcomePath,
    });
    assert.equal(hostileResult.ok, false, label);
    assert(hostileResult.errors.some((error) => error.includes(fragment)), `${label}: ${hostileResult.errors.join('; ')}`);
  }
});

test('non-succeeded terminal states are HOLD-only and cannot green the merge gate', () => {
  for (const terminalState of ['failed_verification', 'blocked', 'approval_required', 'budget_exhausted', 'cancelled']) {
    for (const decision of ['ACCEPT', 'ACCEPT WITH CONDITIONS', 'READY FOR INDEPENDENT VERIFY', 'REJECT / REDESIGN']) {
      const bypass = validatePullRequestBody({
        body: body({ outcomeReference: 'CI_GENERATED', terminalState, decision }),
        catalog, evidencePolicy, root: acceptedOutcome.root, baseSha: base, headSha: head,
        allowCiGenerated: true, requireCiGeneratedOutcome: true,
      });
      assert.equal(bypass.ok, false);
      assert(bypass.errors.some((error) => error.includes('must request HOLD')));
      assert(bypass.errors.some((error) => error.includes('nonmergeable')));
    }

    const honestHold = validatePullRequestBody({
      body: body({ outcomeReference: 'CI_GENERATED', terminalState, decision: 'HOLD' }),
      catalog, evidencePolicy, root: acceptedOutcome.root, baseSha: base, headSha: head,
      allowCiGenerated: true, requireCiGeneratedOutcome: true,
    });
    assert.equal(honestHold.ok, false);
    assert(!honestHold.errors.some((error) => error.includes('must request HOLD')));
    assert(honestHold.errors.some((error) => error.includes('nonmergeable')));
  }
});
