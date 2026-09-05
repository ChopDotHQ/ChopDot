import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fixtureRoot } from './helpers.mjs';
import { createExactSourceAdapter } from '../adapters/exact-source.mjs';
import { createRepoGraphAdapter } from '../adapters/repo-graph.mjs';
import { createKgv2Adapter } from '../adapters/kgv2.mjs';
import { createMockKgv3Adapter } from '../adapters/mock-kgv3.mjs';
import { runKnowledgeAdapterConformance } from '../adapters/port.mjs';

const COMMIT = 'c'.repeat(40);
const hash = (value) => createHash('sha256').update(value).digest('hex');

test('knowledge job: exact-source passes read, durable record, and exact recall', async () => {
  const root = await fixtureRoot();
  const adapter = createExactSourceAdapter({ root, branch: 'fixture', commit: COMMIT, recordsRoot: path.join(root, 'exact-records') });
  const result = await runKnowledgeAdapterConformance(adapter, { root, branch: 'fixture', commit: COMMIT });
  assert.deepEqual(result.counts, { total: 4, passed: 4, failed: 0 });
});

test('knowledge job: Repo Graph exact fixture passes all four port operations', async () => {
  const root = await fixtureRoot();
  const packetPath = path.join(root, 'repo-graph.json');
  await writeFile(packetPath, JSON.stringify({ packet_version: '1', root, branch: 'fixture', commit: COMMIT, facts: ['Fixture graph fact'], stale_reasons: [] }));
  const adapter = createRepoGraphAdapter({ root, packetPath, recordsRoot: path.join(root, 'graph-records') });
  assert.equal((await runKnowledgeAdapterConformance(adapter, { root, branch: 'fixture', commit: COMMIT })).accepted, true);
});

test('knowledge job: Repo Graph packet from another checkout cannot green', async () => {
  const root = await fixtureRoot();
  const packetPath = path.join(root, 'repo-graph.json');
  await writeFile(packetPath, JSON.stringify({ root: '/tmp/another-checkout', branch: 'fixture', commit: COMMIT, facts: ['Wrong root'] }));
  const result = await runKnowledgeAdapterConformance(createRepoGraphAdapter({ root, packetPath, recordsRoot: path.join(root, 'graph-records') }), { root, branch: 'fixture', commit: COMMIT });
  assert.equal(result.accepted, false);
  assert.equal(result.cases.find((entry) => entry.id === 'read_context').passed, false);
});

test('knowledge job: Repo Graph packet file outside the exact root cannot green', async () => {
  const root = await fixtureRoot();
  const outside = await fixtureRoot();
  const packetPath = path.join(outside, 'repo-graph.json');
  await writeFile(packetPath, JSON.stringify({ root, branch: 'fixture', commit: COMMIT, facts: ['Cross-root packet'] }));
  const context = await createRepoGraphAdapter({ root, packetPath }).read_context({ root, branch: 'fixture', commit: COMMIT }, 'What is accepted?');
  assert.equal(context.freshness.status, 'stale');
  assert.ok(context.stale_reasons.includes('packet_cross_root'));
});

test('knowledge job: Repo Graph verifies declared sources and binds fact citations to exact candidate', async () => {
  const root = await fixtureRoot();
  const sourcePath = path.join(root, 'evidence.md');
  const contents = 'Exact accepted evidence\n';
  await writeFile(sourcePath, contents);
  const packetPath = path.join(root, 'repo-graph.json');
  await writeFile(packetPath, JSON.stringify({
    root, branch: 'fixture', commit: COMMIT,
    sources: [{ path: 'evidence.md', sha256: hash(contents) }],
    facts: [{ statement: 'Exact cited fact', source_path: 'evidence.md' }],
  }));
  const context = await createRepoGraphAdapter({ root, packetPath }).read_context({ root, branch: 'fixture', commit: COMMIT }, 'What is accepted?');
  assert.equal(context.freshness.status, 'fresh');
  assert.equal(context.stale_reasons.length, 0);
  assert.equal(context.facts[0].citation_ids[0], 'citation_repo_graph_2');
  assert.equal(context.citations[1].path, sourcePath);
  assert.deepEqual(context.source_identities[1], {
    source_identity_id: 'source_repo_graph_2', root, branch: 'fixture', commit: COMMIT,
    path: sourcePath, sha256: hash(contents),
  });
});

for (const hostile of [
  { name: 'missing', declared: { path: 'missing.md', sha256: 'a'.repeat(64) }, reason: 'source_missing:' },
  { name: 'hash mismatch', declared: { path: 'evidence.md', sha256: 'a'.repeat(64) }, reason: 'source_hash_mismatch:' },
  { name: 'cross-root', declared: { path: '/tmp/cross-root.md', sha256: 'a'.repeat(64) }, reason: 'source_cross_root:' },
]) test(`knowledge job: Repo Graph ${hostile.name} source fails stale`, async () => {
  const root = await fixtureRoot();
  await writeFile(path.join(root, 'evidence.md'), 'actual\n');
  const packetPath = path.join(root, 'repo-graph.json');
  await writeFile(packetPath, JSON.stringify({ root, branch: 'fixture', commit: COMMIT, sources: [hostile.declared], facts: [{ statement: 'Claim', source_path: hostile.declared.path }] }));
  const context = await createRepoGraphAdapter({ root, packetPath }).read_context({ root, branch: 'fixture', commit: COMMIT }, 'What is accepted?');
  assert.equal(context.freshness.status, 'stale');
  assert.ok(context.stale_reasons.some((entry) => entry.startsWith(hostile.reason)));
});

test('knowledge-read CLI accepts repeated and comma required sources and fails when a citation is absent', async () => {
  const root = await fixtureRoot();
  const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const first = 'first evidence\n';
  const second = 'second evidence\n';
  await writeFile(path.join(root, 'first.md'), first);
  await writeFile(path.join(root, 'second.md'), second);
  const packetPath = path.join(root, 'repo-graph.json');
  await writeFile(packetPath, JSON.stringify({
    root, branch, commit,
    sources: [{ path: 'first.md', sha256: hash(first) }, { path: 'second.md', sha256: hash(second) }],
    facts: [{ statement: 'Both sources prove this fact', source_paths: ['first.md', 'second.md'] }],
  }));
  const cli = path.resolve('scripts/agent-system/cli.mjs');
  const accepted = spawnSync(process.execPath, [cli, 'knowledge-read', '--root', root, '--adapter', 'repo-graph', '--packet', packetPath, '--question', 'What exact evidence is current?', '--required-sources', 'first.md,second.md', '--required-sources', 'first.md', '--json'], { encoding: 'utf8' });
  assert.equal(accepted.status, 0, accepted.stdout || accepted.stderr);
  assert.equal(JSON.parse(accepted.stdout).accepted, true);
  const rejected = spawnSync(process.execPath, [cli, 'knowledge-read', '--root', root, '--adapter', 'repo-graph', '--packet', packetPath, '--question', 'What exact evidence is current?', '--required-sources', 'uncited.md', '--json'], { encoding: 'utf8' });
  assert.equal(rejected.status, 1);
  assert.ok(JSON.parse(rejected.stdout).validation_errors.includes('required_source_not_cited:uncited.md'));
});

test('knowledge job: KGv2 runtime-unavailable preflight is explicit failure', async () => {
  const receipt = await createKgv2Adapter(null).health();
  assert.equal(receipt.accepted, false);
  assert.equal(receipt.fallback_status, 'unavailable');
  assert.deepEqual(receipt.rejected_reasons, ['client_unconfigured']);
});

test('knowledge job: KGv2 fixture passes only when its client satisfies the common port', async () => {
  const root = await fixtureRoot();
  const result = await runKnowledgeAdapterConformance(createKgv2Adapter(createMockKgv3Adapter()), { root, branch: 'fixture', commit: COMMIT });
  assert.equal(result.accepted, true);
  assert.deepEqual(result.counts, { total: 4, passed: 4, failed: 0 });
});

test('knowledge job: mock KGv3 proves backend-version portability with semantic checks', async () => {
  const root = await fixtureRoot();
  const result = await runKnowledgeAdapterConformance(createMockKgv3Adapter(), { root, branch: 'fixture', commit: COMMIT });
  assert.equal(result.accepted, true);
  assert.equal(result.cases.find((entry) => entry.id === 'record_outcome').result.accepted, true);
  assert.equal(result.cases.find((entry) => entry.id === 'verify_recall').result.mismatches.length, 0);
});
