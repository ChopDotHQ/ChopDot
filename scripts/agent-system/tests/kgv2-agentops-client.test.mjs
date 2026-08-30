import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createAgentOpsKgv2Client } from '../adapters/kgv2-agentops-client.mjs';
import { digestObject, sha256 } from '../core.mjs';
import { digestContract } from '../contract.mjs';
import { hashArtifact } from '../artifacts.mjs';
import { runKnowledgeAdapterConformance, validateKnowledgeContext, validateKnowledgeReceipt, validateKnowledgeRecall } from '../adapters/port.mjs';
import { fixtureContract, fixtureRoot } from './helpers.mjs';

function identity(root) {
  const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  return { root, branch: git(['branch', '--show-current']), commit: git(['rev-parse', 'HEAD']) };
}

async function outcomeFixture(root) {
  const scope = identity(root);
  const evidencePath = path.join(root, 'outcome-evidence.json');
  await writeFile(evidencePath, '{"accepted":true}\n');
  const evidenceHash = sha256(await readFile(evidencePath));
  const artifactHash = (await hashArtifact(root, evidencePath)).aggregate_sha256;
  const artifact = { artifact_id: 'artifact_outcome_evidence', path: 'outcome-evidence.json', sha256: artifactHash };
  const packet = {
    outcome_version: '1.0.0', outcome_id: 'outcome_kgv2_fixture', run_id: 'run_kgv2_fixture_0001',
    contract_digest: 'a'.repeat(64), root, branch: scope.branch,
    starting_head: scope.commit, starting_tree: 'b'.repeat(40), ending_head: scope.commit, ending_tree: 'b'.repeat(40), git_status: [],
    requirements: [{ requirement_id: 'KG-CLIENT', status: 'accepted', evaluation_ids: ['evaluation_kgv2_fixture'] }],
    artifacts: [artifact],
    evaluation_summary: { evaluation_ids: ['evaluation_kgv2_fixture'], total_assertions: 1, passed: 1, failed: 0, blocked: 0, hard_failures: [], score: 1, threshold: 1, independent_review_satisfied: true },
    evaluation_index: [artifact],
    runner_provenance: { provenance_id: 'runner_provenance_kgv2_fixture', provenance_digest: 'c'.repeat(64), ledger_head_digest: 'd'.repeat(64), event_count: 1, evaluation_digest: 'e'.repeat(64) },
    effects: [], approvals: [], evidence_index: [artifact], limitations: [], terminal_state: 'succeeded', knowledge_receipts: [],
    created_at: '2026-08-30T10:00:00.000Z', packet_digest: null,
  };
  packet.packet_digest = digestObject(Object.fromEntries(Object.entries(packet).filter(([key]) => key !== 'packet_digest')));
  return { packet, scope, evidencePath, evidenceHash, artifactHash };
}

function exactRecord(scope, sourcePath, sourceHash, objectValue, suffix = 'fixture') {
  return {
    fact_version_id: `fact:portable:${suffix}`, predicate: 'accepted_outcome', object_value: objectValue,
    confidence: 1, source_ref: sourcePath, source_hash: sourceHash,
    event_commit: scope.commit, event_id: `knowledge-outcome-${suffix}`,
  };
}

function fakeRuntime(scope, sourcePath, sourceHash) {
  const records = new Map();
  return async (operation, payload) => {
    if (operation === 'health') return { accepted: true };
    if (operation === 'read_context') return {
      accepted: true, observed_at: '2026-08-30T10:00:00.000Z', degradation: [],
      facts: [exactRecord(scope, sourcePath, sourceHash, { statement: 'Exact source remains authority.' }, 'read')],
    };
    if (operation === 'record_outcome') {
      const object = {
        outcome_digest: payload.outcome_packet.packet_digest, root: scope.root, branch: scope.branch, commit: scope.commit,
        artifact_digests: payload.artifact_digests, terminal_state: 'succeeded',
      };
      const record = exactRecord(scope, sourcePath, sourceHash, object, payload.outcome_packet.packet_digest);
      records.set(payload.outcome_packet.packet_digest, record);
      return { accepted: true, record, rejected_reasons: [] };
    }
    if (operation === 'verify_recall') {
      const record = records.get(payload.expected_digest);
      return { accepted: Boolean(record), facts: record ? [record] : [] };
    }
    throw new Error(`unexpected operation: ${operation}`);
  };
}

function fixtureClient(scope, invoke, candidateInspector = (value) => value) {
  return createAgentOpsKgv2Client({
    repoId: 'fixture', invoke, candidateInspector,
    outcomeProofVerifier: async () => ({ accepted: true }),
    autobotsSource: '/fixture/AutoBots', autobotsCommit: 'f'.repeat(40), python: '/fixture/python',
    now: () => '2026-08-30T10:00:00.000Z',
  });
}

test('pinned AgentOps client satisfies all four provider-neutral port operations', async () => {
  const root = await fixtureRoot();
  const { packet, scope, evidencePath, evidenceHash, artifactHash } = await outcomeFixture(root);
  assert.notEqual(artifactHash, evidenceHash, 'fixture must exercise aggregate artifact hash rather than raw file hash');
  let recordedAnchor;
  const runtime = fakeRuntime(scope, evidencePath, evidenceHash);
  const client = fixtureClient(scope, async (operation, payload) => {
    if (operation === 'record_outcome') recordedAnchor = payload.anchor;
    return runtime(operation, payload);
  });
  const result = await runKnowledgeAdapterConformance(client, { scope, outcome_packet: packet });
  assert.equal(result.accepted, true, JSON.stringify(result.cases, null, 2));
  assert.deepEqual(result.counts, { total: 4, passed: 4, failed: 0 });
  const recall = result.cases.find((entry) => entry.id === 'verify_recall').result;
  assert.equal(validateKnowledgeRecall(recall, scope, packet.packet_digest), true);
  assert.equal(recall.backend, 'kgv2');
  assert.equal(recall.fallback_status, 'none');
  assert.equal(recordedAnchor.sha256, evidenceHash, 'citation uses the verified file hash');
  assert.equal(recordedAnchor.artifact_sha256, artifactHash, 'anchor retains the canonical aggregate artifact hash');
});

test('read_context removes a cross-root citation and reports stale context without fallback', async () => {
  const root = await fixtureRoot();
  const { scope, evidenceHash } = await outcomeFixture(root);
  const invoke = async (operation) => operation === 'read_context'
    ? { accepted: true, facts: [exactRecord(scope, '/tmp/other-root/evidence.json', evidenceHash, { statement: 'Hostile' })], degradation: [] }
    : { accepted: true };
  const context = await fixtureClient(scope, invoke).read_context(scope, 'What is exact?');
  assert.equal(validateKnowledgeContext(context), true);
  assert.equal(context.freshness.status, 'stale');
  assert.equal(context.fallback_status, 'none');
  assert.deepEqual(context.facts, []);
  assert.ok(context.stale_reasons.includes('kgv2_no_exact_scope_cited_facts'));
});

test('read_context rejects a citation whose accepted event commit differs', async () => {
  const root = await fixtureRoot();
  const { scope, evidencePath, evidenceHash } = await outcomeFixture(root);
  const hostile = { ...exactRecord(scope, evidencePath, evidenceHash, { statement: 'Wrong commit' }), event_commit: 'f'.repeat(40) };
  const context = await fixtureClient(scope, async () => ({ accepted: true, facts: [hostile], degradation: [] })).read_context(scope, 'What is exact?');
  assert.equal(context.freshness.status, 'stale');
  assert.deepEqual(context.citations, []);
});

test('record_outcome rejects a digest-invalid packet before invoking KGv2', async () => {
  const root = await fixtureRoot();
  const { packet, scope } = await outcomeFixture(root);
  packet.packet_digest = 'f'.repeat(64);
  let invoked = false;
  const receipt = await fixtureClient(scope, async () => { invoked = true; }).record_outcome(packet);
  assert.equal(validateKnowledgeReceipt(receipt, 'record_outcome'), true);
  assert.equal(receipt.accepted, false);
  assert.equal(invoked, false);
  assert.match(receipt.rejected_reasons[0], /^invalid_outcome:/u);
});

test('record_outcome rejects an evidence hash mismatch before invoking KGv2', async () => {
  const root = await fixtureRoot();
  const { packet, scope } = await outcomeFixture(root);
  packet.artifacts[0].sha256 = 'f'.repeat(64);
  packet.evaluation_index[0].sha256 = 'f'.repeat(64);
  packet.evidence_index[0].sha256 = 'f'.repeat(64);
  packet.packet_digest = digestObject(Object.fromEntries(Object.entries(packet).filter(([key]) => key !== 'packet_digest')));
  let invoked = false;
  const receipt = await fixtureClient(scope, async () => { invoked = true; }).record_outcome(packet);
  assert.equal(receipt.accepted, false);
  assert.deepEqual(receipt.rejected_reasons, ['no_exact_root_hash_verified_outcome_anchor']);
  assert.equal(invoked, false);
});

test('record_outcome rejects a dirty exact candidate', async () => {
  const root = await fixtureRoot();
  const { packet, scope } = await outcomeFixture(root);
  const client = fixtureClient(scope, async () => ({ accepted: true }), (_value, options) => {
    if (options.requireClean) throw new Error('scope_worktree_dirty');
    return scope;
  });
  const receipt = await client.record_outcome(packet);
  assert.equal(receipt.accepted, false);
  assert.deepEqual(receipt.rejected_reasons, ['scope_worktree_dirty']);
});

test('record_outcome rejects hand-authored runner provenance before invoking KGv2', async () => {
  const root = await fixtureRoot();
  const { packet, scope } = await outcomeFixture(root);
  const contract = fixtureContract(root);
  packet.run_id = contract.run_id;
  packet.contract_digest = digestContract(contract);
  packet.packet_digest = digestObject(Object.fromEntries(Object.entries(packet).filter(([key]) => key !== 'packet_digest')));
  const proofRoot = path.join(root, 'proof');
  const runDirectory = path.join(proofRoot, 'run');
  const contractPath = path.join(proofRoot, 'contract.json');
  const provenancePath = path.join(proofRoot, 'runner-provenance.json');
  await mkdir(runDirectory, { recursive: true });
  await writeFile(contractPath, `${JSON.stringify(contract)}\n`);
  await writeFile(provenancePath, `${JSON.stringify({
    runner_provenance_version: '1.0.0', provenance_id: packet.runner_provenance.provenance_id,
    provenance_digest: packet.runner_provenance.provenance_digest,
  })}\n`);
  let invoked = false;
  const client = createAgentOpsKgv2Client({
    repoId: 'fixture', candidateInspector: () => scope,
    invoke: async () => { invoked = true; return { accepted: true }; },
  });
  const receipt = await client.record_outcome(packet, {
    contract_path: contractPath, runner_provenance_path: provenancePath, run_directory: runDirectory,
  });
  assert.equal(receipt.accepted, false);
  assert.equal(invoked, false);
  assert.match(receipt.rejected_reasons[0], /runner_provenance/iu);
});

test('record_outcome rejects a symlink evidence anchor before invoking KGv2', async () => {
  const root = await fixtureRoot();
  const { packet, scope } = await outcomeFixture(root);
  const outside = await mkdtemp(path.join(os.tmpdir(), 'chopdot-kgv2-outside-'));
  const outsideFile = path.join(outside, 'evidence.json');
  const linkedFile = path.join(root, 'linked-evidence.json');
  await writeFile(outsideFile, '{"accepted":true}\n');
  await symlink(outsideFile, linkedFile);
  const hash = sha256(await readFile(outsideFile));
  const artifact = { artifact_id: 'artifact_symlink', path: 'linked-evidence.json', sha256: hash };
  packet.artifacts = [artifact];
  packet.evaluation_index = [artifact];
  packet.evidence_index = [artifact];
  packet.packet_digest = digestObject(Object.fromEntries(Object.entries(packet).filter(([key]) => key !== 'packet_digest')));
  let invoked = false;
  const client = createAgentOpsKgv2Client({
    repoId: 'fixture', candidateInspector: () => scope,
    outcomeProofVerifier: async () => ({ accepted: true }),
    invoke: async () => { invoked = true; return { accepted: true }; },
  });
  const receipt = await client.record_outcome(packet, {});
  assert.equal(receipt.accepted, false);
  assert.equal(invoked, false);
  assert.deepEqual(receipt.rejected_reasons, ['no_exact_root_hash_verified_outcome_anchor']);
});

test('record_outcome rejects a cross-root evidence anchor before invoking KGv2', async () => {
  const root = await fixtureRoot();
  const { packet, scope } = await outcomeFixture(root);
  const outside = await mkdtemp(path.join(os.tmpdir(), 'chopdot-kgv2-cross-root-'));
  const outsideFile = path.join(outside, 'evidence.json');
  await writeFile(outsideFile, '{"accepted":true}\n');
  const artifact = { artifact_id: 'artifact_cross_root', path: outsideFile, sha256: 'a'.repeat(64) };
  packet.artifacts = [artifact];
  packet.evaluation_index = [artifact];
  packet.evidence_index = [artifact];
  packet.packet_digest = digestObject(Object.fromEntries(Object.entries(packet).filter(([key]) => key !== 'packet_digest')));
  let invoked = false;
  const client = createAgentOpsKgv2Client({
    repoId: 'fixture', candidateInspector: () => scope,
    outcomeProofVerifier: async () => ({ accepted: true }),
    invoke: async () => { invoked = true; return { accepted: true }; },
  });
  const receipt = await client.record_outcome(packet, {});
  assert.equal(receipt.accepted, false);
  assert.equal(invoked, false);
  assert.deepEqual(receipt.rejected_reasons, ['no_exact_root_hash_verified_outcome_anchor']);
});

test('verify_recall rejects correct digest cited for another candidate identity', async () => {
  const root = await fixtureRoot();
  const { packet, scope, evidencePath, evidenceHash } = await outcomeFixture(root);
  const object = { outcome_digest: packet.packet_digest, root: scope.root, branch: 'wrong', commit: scope.commit, artifact_digests: [evidenceHash], terminal_state: 'succeeded' };
  const client = fixtureClient(scope, async () => ({ accepted: true, facts: [exactRecord(scope, evidencePath, evidenceHash, object)] }));
  const receipt = await client.verify_recall(scope, packet.packet_digest);
  assert.equal(validateKnowledgeReceipt(receipt, 'verify_recall'), true);
  assert.equal(receipt.accepted, false);
  assert.deepEqual(receipt.mismatches, ['outcome_or_candidate_identity_mismatch']);
  assert.equal(receipt.current_outcome_digest, null);
});

test('invalid expected recall digest is rejected without invoking KGv2', async () => {
  const root = await fixtureRoot();
  const scope = identity(root);
  let invoked = false;
  const receipt = await fixtureClient(scope, async () => { invoked = true; }).verify_recall(scope, 'not-a-digest');
  assert.equal(receipt.accepted, false);
  assert.equal(invoked, false);
  assert.deepEqual(receipt.mismatches, ['expected_digest_invalid']);
});

test('runtime failures produce explicit rejected health and stale read receipts', async () => {
  const root = await fixtureRoot();
  const scope = identity(root);
  const client = fixtureClient(scope, async () => { throw new Error('authority unavailable\nsecret detail omitted'); });
  const health = await client.health();
  assert.equal(validateKnowledgeReceipt(health, 'health'), true);
  assert.equal(health.accepted, false);
  assert.equal(health.fallback_status, 'unavailable');
  const context = await client.read_context(scope, 'What is exact?');
  assert.equal(validateKnowledgeContext(context), true);
  assert.equal(context.freshness.status, 'stale');
  assert.deepEqual(context.facts, []);
  assert.match(context.stale_reasons[0], /^authority unavailable secret detail omitted$/u);
});

test('runtime failures redact credential-bearing DSNs before producing receipts', async () => {
  const root = await fixtureRoot();
  const scope = identity(root);
  const client = fixtureClient(scope, async () => { throw new Error('connect postgresql://alice:supersecret@localhost/db token=abcd'); });
  const receipt = await client.health();
  assert.equal(receipt.accepted, false);
  assert.equal(receipt.rejected_reasons[0].includes('supersecret'), false);
  assert.equal(receipt.rejected_reasons[0].includes('abcd'), false);
  assert.match(receipt.rejected_reasons[0], /postgresql:\/\/\[redacted\]@localhost\/db token=\[redacted\]/u);
});

test('the bounded live path fails closed before Python when its pinned source is absent', async () => {
  const client = createAgentOpsKgv2Client({ autobotsSource: '/definitely/missing/autobots', python: '/definitely/missing/python', timeoutMs: 100 });
  const receipt = await client.health();
  assert.equal(validateKnowledgeReceipt(receipt, 'health'), true);
  assert.equal(receipt.accepted, false);
  assert.equal(receipt.fallback_status, 'unavailable');
  assert.match(receipt.rejected_reasons[0], /^git_spawn_failed:/u);
  assert.equal(receipt.rejected_reasons[0].includes('Cannot read properties of undefined'), false);
});

test('client module exposes exactly the required operational methods without import-time mutation', () => {
  const client = createAgentOpsKgv2Client({ invoke: async () => ({ accepted: false }) });
  for (const method of ['health', 'read_context', 'record_outcome', 'verify_recall']) assert.equal(typeof client[method], 'function');
});
