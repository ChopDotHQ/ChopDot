import assert from 'node:assert/strict';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fixtureRoot} from '../agent-system/tests/helpers.mjs';
import {digestObject, sha256} from '../agent-system/core.mjs';
import {GATE9_REQUIRED_SOURCE_PATHS, verifyGate9PortableKnowledge} from './verify-gate9-portable-knowledge.mjs';

async function fixture() {
  const root = await fixtureRoot();
  await writeFile(path.join(root, '.gitignore'), 'runs/\noutput/\n');
  for (const sourcePath of GATE9_REQUIRED_SOURCE_PATHS) {
    await mkdir(path.dirname(path.join(root, sourcePath)), {recursive: true});
    await writeFile(path.join(root, sourcePath), `${sourcePath}\n`);
  }
  execFileSync('git', ['add', '.'], {cwd: root});
  execFileSync('git', ['commit', '-m', 'gate9 fixture'], {cwd: root, stdio: 'ignore'});
  const branch = execFileSync('git', ['branch', '--show-current'], {cwd: root, encoding: 'utf8'}).trim();
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
  const tree = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], {cwd: root, encoding: 'utf8'}).trim();
  const artifactHash = sha256(await readFile(path.join(root, GATE9_REQUIRED_SOURCE_PATHS[0])));
  const outcomePath = path.join(root, 'output', 'outcome.json');
  const packetPath = path.join(root, 'output', 'packet.json');
  const evaluationPath = path.join(root, 'output', 'evaluation.json');
  await mkdir(path.dirname(outcomePath), {recursive: true});
  const evaluation = {
    evaluation_version: '1.0.0', evaluation_id: 'evaluation_gate9fixture', run_id: 'run_gate9_fixture_0001',
    candidate_digest: digestObject({root, branch, commit, tree, git_status: []}),
    candidate_identity: {root, branch, commit, tree, git_status: []},
    started_at: '2026-08-27T00:00:00.000Z', finished_at: '2026-08-27T00:00:00.000Z',
    evaluator: {id: 'gate9-reviewer', kind: 'agent', version: 'fixture-v1'}, independence: 'different_actor',
    assertions: [{assertion_id: 'GATE9-KNOWLEDGE', result: 'pass', evidence_level: 'exact-candidate', observed: true, expected: true, evidence_artifact_ids: ['artifact_gate9fixture']}],
    counts: {total: 1, passed: 1, failed: 0, blocked: 0}, score: 1, threshold: 1,
    hard_failures: [], verdict: 'accepted', evidence_artifact_ids: ['artifact_gate9fixture'],
  };
  await writeFile(evaluationPath, JSON.stringify(evaluation));
  const evaluationHash = sha256(await readFile(evaluationPath));
  const outcome = {
    outcome_version: '1.0.0', outcome_id: 'outcome_gate9fixture', run_id: 'run_gate9_fixture_0001',
    contract_digest: 'c'.repeat(64), root, branch, starting_head: commit, starting_tree: tree,
    ending_head: commit, ending_tree: tree, git_status: [],
    requirements: [{requirement_id: 'GATE9-KNOWLEDGE', status: 'accepted', evaluation_ids: ['evaluation_gate9fixture']}],
    artifacts: [
      {artifact_id: 'artifact_gate9fixture', path: GATE9_REQUIRED_SOURCE_PATHS[0], sha256: artifactHash},
      {artifact_id: 'artifact_gate9evaluation', path: 'output/evaluation.json', sha256: evaluationHash},
    ],
    evaluation_summary: {evaluation_ids: ['evaluation_gate9fixture'], total_assertions: 1, passed: 1, failed: 0, blocked: 0, hard_failures: [], score: 1, threshold: 1, independent_review_satisfied: true},
    evaluation_index: [{artifact_id: 'artifact_gate9evaluation', path: 'output/evaluation.json', sha256: evaluationHash}],
    effects: [], approvals: [], evidence_index: [
      {artifact_id: 'artifact_gate9fixture', path: GATE9_REQUIRED_SOURCE_PATHS[0], sha256: artifactHash},
      {artifact_id: 'artifact_gate9evaluation', path: 'output/evaluation.json', sha256: evaluationHash},
    ],
    limitations: [], terminal_state: 'succeeded', knowledge_receipts: ['knowledge_receipt_gate9fixture'], created_at: '2026-08-27T00:00:00.000Z',
  };
  outcome.packet_digest = digestObject(outcome);
  const citations = await Promise.all(GATE9_REQUIRED_SOURCE_PATHS.map(async sourcePath => ({path: sourcePath, sha256: sha256(await readFile(path.join(root, sourcePath)))})));
  const packet = {packet_version: '1.0.0', root, branch, commit, tree, dirty: false, dirty_paths: [], fallback_status: 'none', stale_reasons: [], generated_at: new Date().toISOString(), facts: [{statement: 'Gate9 is cited by exact implementation, tests, and evidence.', confidence: 1}], citations};
  packet.packet_digest = digestObject(packet);
  await writeFile(outcomePath, JSON.stringify(outcome));
  await writeFile(packetPath, JSON.stringify(packet));
  return {root, outcome, packet, outcomePath, packetPath, outputPath: path.join(root, 'output', 'gate9-knowledge.json')};
}

test('records and recalls one exact Gate9 outcome with cited sources', async () => {
  const value = await fixture();
  const result = await verifyGate9PortableKnowledge(value);
  assert.equal(result.accepted, true);
  assert.equal(result.outcome_packet_digest, value.outcome.packet_digest);
  assert.equal(result.recall_receipt.accepted, true);
});

for (const [name, mutate, pattern] of [
  ['wrong root', packet => { packet.root = '/tmp/wrong-root'; }, /wrong root/u],
  ['wrong commit', packet => { packet.commit = 'f'.repeat(40); }, /wrong commit/u],
  ['bad packet digest', packet => { packet.packet_digest = '0'.repeat(64); }, /digest mismatch/u],
  ['wrong citation hash', packet => { packet.citations[0].sha256 = '0'.repeat(64); packet.packet_digest = digestObject(Object.fromEntries(Object.entries(packet).filter(([key]) => key !== 'packet_digest'))); }, /citation hash mismatch/u],
  ['missing required source', packet => { packet.citations.pop(); packet.packet_digest = digestObject(Object.fromEntries(Object.entries(packet).filter(([key]) => key !== 'packet_digest'))); }, /lacks Gate9 citation/u],
]) test(`fails hostile ${name}`, async () => {
  const value = await fixture();
  mutate(value.packet);
  await writeFile(value.packetPath, JSON.stringify(value.packet));
  await assert.rejects(verifyGate9PortableKnowledge(value), pattern);
});

test('fails wrong outcome digest without creating a replacement outcome', async () => {
  const value = await fixture();
  value.outcome.packet_digest = '0'.repeat(64);
  await writeFile(value.outcomePath, JSON.stringify(value.outcome));
  await assert.rejects(verifyGate9PortableKnowledge(value), /outcome digest mismatch/u);
});
