import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import { loadBenchmarkBaseline, validateBenchmarkPacket } from '../benchmark-semantics.mjs';
import {
  adversarialProductDefinitionPackets,
  adversarialUxJourneyPackets,
  validProductDefinitionPacket,
  validUxJourneyPacket,
} from './benchmark-semantics.fixtures.mjs';

const root = process.cwd();
const benchmarkPath = path.join(root, 'product', 'benchmark-baseline.md');
const validatorPath = path.join(root, 'scripts', 'agent-system', 'benchmark-semantics.mjs');

async function benchmarkDigest() {
  return createHash('sha256').update(await readFile(benchmarkPath)).digest('hex');
}

test('benchmark source exposes the complete deterministic requirement registry', async () => {
  const baseline = await loadBenchmarkBaseline(benchmarkPath);
  assert.equal(baseline.valid, true, baseline.issues.map((issue) => issue.message).join('; '));
  assert.equal(baseline.requirements.size, 17);
  assert.equal(baseline.requirements.get('BASE-GROUP-01').treatment, 'must-exceed');
  assert.ok(baseline.requirements.get('MODE-SAVINGS-01').evidence_grades.has('E0-discovery'));
  assert.ok(baseline.requirements.get('MODE-SAVINGS-01').evidence_grades.has('E1-public-source'));
});

test('valid ProductDefinitionPacketV1 and UxJourneyPacketV1 fixtures pass', async (t) => {
  const digest = await benchmarkDigest();
  const fixtures = [
    ['product-definition', validProductDefinitionPacket(digest)],
    ['ux-journey', validUxJourneyPacket()],
  ];
  for (const [name, packet] of fixtures) await t.test(name, async () => {
    const result = await validateBenchmarkPacket(packet, { root, benchmarkPath });
    assert.equal(result.valid, true, result.issues.map((issue) => `${issue.code}: ${issue.message}`).join('; '));
    assert.equal(result.counts.requirement_count, 1);
    assert.equal(result.counts.issue_count, 0);
    const unresolvedSubject = name === 'product-definition' ? 'unresolved_required_baseline_count' : 'unresolved_applicable_baseline_count';
    const layerSubject = name === 'product-definition' ? 'product_layer_violation_count' : 'ux_layer_violation_count';
    assert.deepEqual(result.measurements[unresolvedSubject], { value: 0, evidence_level: 'unit' });
    assert.deepEqual(result.measurements[layerSubject], { value: 0, evidence_level: 'unit' });
  });
});

test('adversarial ProductDefinitionPacketV1 fixtures fail closed', async (t) => {
  const digest = await benchmarkDigest();
  const fixtures = adversarialProductDefinitionPackets(digest);
  assert.equal(fixtures.length, 14);
  for (const fixture of fixtures) await t.test(fixture.id, async () => {
    const result = await validateBenchmarkPacket(fixture.packet, { root, benchmarkPath });
    assert.equal(result.valid, false, `${fixture.id} unexpectedly passed`);
    assert.ok(result.issues.some((issue) => issue.code === fixture.expected_code), `${fixture.id}: ${JSON.stringify(result.issues)}`);
  });
});

test('adversarial UxJourneyPacketV1 fixtures fail closed', async (t) => {
  const fixtures = adversarialUxJourneyPackets();
  assert.equal(fixtures.length, 11);
  for (const fixture of fixtures) await t.test(fixture.id, async () => {
    const result = await validateBenchmarkPacket(fixture.packet, { root, benchmarkPath });
    assert.equal(result.valid, false, `${fixture.id} unexpectedly passed`);
    assert.ok(result.issues.some((issue) => issue.code === fixture.expected_code), `${fixture.id}: ${JSON.stringify(result.issues)}`);
  });
});

test('CLI returns deterministic JSON and exit codes for valid and invalid packets', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'chopdot-benchmark-semantics-'));
  const digest = await benchmarkDigest();
  const validPath = path.join(temp, 'valid.json');
  const invalidPath = path.join(temp, 'invalid.json');
  const invalid = validProductDefinitionPacket(digest);
  invalid.action_scope.universal = true;
  await writeFile(validPath, `${JSON.stringify(validProductDefinitionPacket(digest), null, 2)}\n`);
  await writeFile(invalidPath, `${JSON.stringify(invalid, null, 2)}\n`);

  const accepted = spawnSync(process.execPath, [validatorPath, '--packet', validPath], { cwd: root, encoding: 'utf8' });
  assert.equal(accepted.status, 0, accepted.stderr || accepted.stdout);
  const acceptedResult = JSON.parse(accepted.stdout);
  assert.equal(acceptedResult.valid, true);
  assert.equal(acceptedResult.counts.issue_count, 0);

  const rejected = spawnSync(process.execPath, [validatorPath, '--packet', invalidPath], { cwd: root, encoding: 'utf8' });
  assert.equal(rejected.status, 1, rejected.stderr || rejected.stdout);
  const rejectedResult = JSON.parse(rejected.stdout);
  assert.equal(rejectedResult.valid, false);
  assert.ok(rejectedResult.issues.some((issue) => issue.code === 'action_scope_universal'));
});
