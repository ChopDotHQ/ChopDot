import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fixtureRoot } from './helpers.mjs';
import { createExactSourceAdapter } from '../adapters/exact-source.mjs';
import { createRepoGraphAdapter } from '../adapters/repo-graph.mjs';
import { createKgv2Adapter } from '../adapters/kgv2.mjs';
import { createMockKgv3Adapter } from '../adapters/mock-kgv3.mjs';
import { runKnowledgeAdapterConformance } from '../adapters/port.mjs';

const COMMIT = 'c'.repeat(40);

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
