import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateReleaseCandidate } from '../enforce-release.mjs';
import { digestObject, sha256File } from '../lib.mjs';

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chopdot-release-'));
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'fixture@example.invalid'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Fixture'], { cwd: root });
  fs.writeFileSync(path.join(root, 'seed.txt'), 'candidate\n');
  fs.writeFileSync(path.join(root, '.gitignore'), 'outcome.json\napproval.json\nevidence/\n');
  execFileSync('git', ['add', 'seed.txt', '.gitignore'], { cwd: root });
  execFileSync('git', ['commit', '-qm', 'fixture'], { cwd: root });
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const tree = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: root, encoding: 'utf8' }).trim();
  const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
  const candidateRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8' }).trim();
  fs.mkdirSync(path.join(root, 'evidence'), { recursive: true });
  const runId = 'run_release_fixture_001';
  const effectId = 'effect_release_fixture';
  const approvalId = 'approval_release_fixture';
  const contractDigest = 'a'.repeat(64);
  const artifactDigest = 'd'.repeat(64);
  const liveReadback = {
    reachable: true, content_identity: 'bafy-fixture', observed_at: '2026-08-26T12:06:00.000Z',
    run_id: runId, contract_digest: contractDigest, effect_id: effectId,
    candidate_commit: head, candidate_tree: tree, artifact_digest: artifactDigest,
  };
  const releaseEvidence = {
    evidence_version: '1.0.0',
    evidence_level: 'release',
    candidate: { root: candidateRoot, branch, commit: head, tree },
    run_id: runId, contract_digest: contractDigest, effect_id: effectId, approval_id: approvalId,
    artifact_digest: artifactDigest,
    live_readback: liveReadback,
  };
  fs.writeFileSync(path.join(root, 'evidence/release.json'), `${JSON.stringify(releaseEvidence)}\n`);
  const evidenceDigest = sha256File(path.join(root, 'evidence/release.json'));
  const packet = {
    outcome_version: '1.0.0', outcome_id: 'outcome_release_fixture', run_id: runId,
    contract_digest: contractDigest, root: candidateRoot, branch,
    starting_head: head, starting_tree: tree, ending_head: head, ending_tree: tree, git_status: [],
    requirements: [{ requirement_id: 'RELEASE-W9', status: 'accepted', evaluation_ids: ['evaluation_release_fixture'] }],
    artifacts: [{ artifact_id: 'artifact_release_fixture', path: 'evidence/release.json', sha256: evidenceDigest }],
    evaluation_summary: { evaluation_ids: ['evaluation_release_fixture'], total_assertions: 1, passed: 1, failed: 0, blocked: 0, hard_failures: [], score: 1, threshold: 1, independent_review_satisfied: true },
    effects: [{ effect_id: effectId, state: 'verified', readback_digest: digestObject(liveReadback) }],
    approvals: [approvalId],
    evidence_index: [{ artifact_id: 'artifact_release_fixture', path: 'evidence/release.json', sha256: evidenceDigest }],
    limitations: [], terminal_state: 'succeeded', knowledge_receipts: ['knowledge_receipt_release_fixture'], created_at: '2026-08-26T12:00:00.000Z',
  };
  packet.packet_digest = digestObject(packet);
  fs.writeFileSync(path.join(root, 'outcome.json'), `${JSON.stringify(packet)}\n`);
  const condition = `release-enforcement:${head}:${packet.packet_digest}`;
  const approval = {
    approval_version: '1.0.0', approval_id: approvalId, run_id: packet.run_id,
    effect_id: effectId, requested_at: '2026-08-26T12:00:00.000Z', requested_by: 'release-agent',
    scope_digest: packet.packet_digest, target: 'github-release-enforcement', risk: 'critical', decision: 'approved',
    decided_by: 'operator', decided_at: '2026-08-26T12:05:00.000Z', expires_at: '2027-08-26T12:05:00.000Z',
    single_use: true, consumed_at: '2026-08-26T12:06:00.000Z', conditions: [condition],
  };
  fs.writeFileSync(path.join(root, 'approval.json'), `${JSON.stringify(approval)}\n`);
  return { root, head, packet, approval };
}

test('exact candidate, accepted outcome, scoped approval, and release readback pass', () => {
  const value = fixture();
  const result = validateReleaseCandidate({ root: value.root, outcomePath: 'outcome.json', approvalPath: 'approval.json', expectedSha: value.head, now: new Date('2026-08-27T00:00:00Z') });
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.equal(result.summary.release_evidence_count, 1);
});

test('missing release-level evidence cannot report green', () => {
  const value = fixture();
  const evidencePath = path.join(value.root, 'evidence/release.json');
  const evidence = JSON.parse(fs.readFileSync(evidencePath));
  evidence.evidence_level = 'exact-candidate';
  fs.writeFileSync(evidencePath, JSON.stringify(evidence));
  const result = validateReleaseCandidate({ root: value.root, outcomePath: 'outcome.json', approvalPath: 'approval.json', expectedSha: value.head });
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('No release-level evidence')));
});

test('stale candidate and expired approval both fail', () => {
  const value = fixture();
  value.approval.expires_at = '2026-08-26T12:06:00.000Z';
  fs.writeFileSync(path.join(value.root, 'approval.json'), JSON.stringify(value.approval));
  const result = validateReleaseCandidate({ root: value.root, outcomePath: 'outcome.json', approvalPath: 'approval.json', expectedSha: '0'.repeat(40), now: new Date('2026-08-27T00:00:00Z') });
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('does not match expected')));
  assert(result.errors.some((error) => error.includes('expired')));
});

test('outcome digest tampering fails', () => {
  const value = fixture();
  value.packet.limitations.push('changed after evaluation');
  fs.writeFileSync(path.join(value.root, 'outcome.json'), JSON.stringify(value.packet));
  const result = validateReleaseCandidate({ root: value.root, outcomePath: 'outcome.json', approvalPath: 'approval.json', expectedSha: value.head });
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('outcome digest mismatch')));
});

test('tracked working-tree mutation cannot reuse clean outcome evidence', () => {
  const value = fixture();
  fs.writeFileSync(path.join(value.root, 'seed.txt'), 'mutated after candidate evidence\n');
  const result = validateReleaseCandidate({ root: value.root, outcomePath: 'outcome.json', approvalPath: 'approval.json', expectedSha: value.head });
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('Candidate worktree is dirty')));
});

test('untracked working-tree mutation cannot reuse clean outcome evidence', () => {
  const value = fixture();
  fs.writeFileSync(path.join(value.root, 'untracked.txt'), 'not part of candidate\n');
  const result = validateReleaseCandidate({ root: value.root, outcomePath: 'outcome.json', approvalPath: 'approval.json', expectedSha: value.head });
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('?? untracked.txt')));
});

test('outcome root and branch must identify the actual worktree', () => {
  const value = fixture();
  value.packet.root = '/tmp/other-checkout';
  value.packet.branch = 'wrong-branch';
  value.packet.packet_digest = digestObject(Object.fromEntries(Object.entries(value.packet).filter(([key]) => key !== 'packet_digest')));
  fs.writeFileSync(path.join(value.root, 'outcome.json'), JSON.stringify(value.packet));
  const result = validateReleaseCandidate({ root: value.root, outcomePath: 'outcome.json', approvalPath: 'approval.json', expectedSha: value.head });
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('does not match worktree')));
});

test('approval must be schema-valid, consumed, and bound to run, effect, and outcome digest', () => {
  const value = fixture();
  value.approval.run_id = 'run_unrelated_fixture_001';
  value.approval.effect_id = 'effect_unrelated_fixture';
  value.approval.scope_digest = '0'.repeat(64);
  value.approval.consumed_at = null;
  fs.writeFileSync(path.join(value.root, 'approval.json'), JSON.stringify(value.approval));
  const result = validateReleaseCandidate({ root: value.root, outcomePath: 'outcome.json', approvalPath: 'approval.json', expectedSha: value.head });
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('consumption cannot be proven')));
  assert(result.errors.some((error) => error.includes('run_id does not match')));
  assert(result.errors.some((error) => error.includes('scope_digest does not match')));
  assert(result.errors.some((error) => error.includes('not a verified outcome effect')));
});

test('empty or identity-unbound live readback cannot prove release', () => {
  const value = fixture();
  const evidencePath = path.join(value.root, 'evidence/release.json');
  const evidence = JSON.parse(fs.readFileSync(evidencePath));
  evidence.live_readback = {};
  fs.writeFileSync(evidencePath, JSON.stringify(evidence));
  const result = validateReleaseCandidate({ root: value.root, outcomePath: 'outcome.json', approvalPath: 'approval.json', expectedSha: value.head });
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('nonempty live_readback')));
  assert(result.errors.some((error) => error.includes('live_readback digest')));
});

test('CI_GENERATED is not a release-evidence transport exception', () => {
  const value = fixture();
  const result = validateReleaseCandidate({
    root: value.root, outcomePath: 'CI_GENERATED', approvalPath: 'approval.json', expectedSha: value.head,
  });
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('Outcome packet does not exist: CI_GENERATED')));
});
